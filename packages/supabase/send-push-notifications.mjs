#!/usr/bin/env node
/**
 * Push-Worker: arbeitet notifications mit push_sent=false ab.
 *
 * - Expo-Tokens (ExponentPushToken[...]) -> Versand über Expo Push API
 * - Native FCM/APNs-Tokens -> kein Versand (braucht FCM/APNs-Creds);
 *   werden als push_skipped markiert statt in einer Retry-Schleife zu hängen
 * - DeviceNotRegistered -> device wird deaktiviert
 * - Netzwerkfehler -> Zeile bleibt unversendet (Retry beim nächsten Lauf)
 *
 * Env (.env in packages/supabase): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * optional EXPO_ACCESS_TOKEN. DRY_RUN=1: nur lesen + loggen, keine Writes/Sends.
 * Usage: node send-push-notifications.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import {
  EXPO_PUSH_ENDPOINT,
  buildExpoMessages,
  chunk,
  isNotificationEnabled,
  mapTickets,
  partitionTokens,
  summarizeDeliveries,
} from './send-push-lib.mjs';

config({ path: resolve(process.cwd(), '.env') });

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EXPO_ACCESS_TOKEN } = process.env;
const DRY_RUN = process.env.DRY_RUN === '1';
const BATCH_LIMIT = 100;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function postExpoBatch(messages) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (EXPO_ACCESS_TOKEN) headers['expo-access-token'] = EXPO_ACCESS_TOKEN;
  const payload = messages.map((message) => {
    const copy = { ...message };
    delete copy._notificationId;
    return copy;
  });
  const res = await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Expo Push API: HTTP ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

async function main() {
  console.log(`📬 Push-Worker ${DRY_RUN ? '(DRY RUN)' : ''}\n`);

  const { data: pending, error: pendErr } = await admin
    .from('notifications')
    .select('id,user_id,type,title,body,data')
    .eq('push_sent', false)
    .order('created_at', { ascending: true })
    .limit(BATCH_LIMIT);
  if (pendErr) throw new Error(`pending lesen: ${pendErr.message}`);
  console.log(`Offen: ${(pending ?? []).length}`);
  if ((pending ?? []).length === 0) return;

  const userIds = [...new Set(pending.map((n) => n.user_id))];
  const { data: profiles, error: profileErr } = await admin
    .from('profiles')
    .select('id,notification_prefs')
    .in('id', userIds);
  if (profileErr) throw new Error(`Profile lesen: ${profileErr.message}`);
  const preferences = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.notification_prefs])
  );
  const disabled = pending.filter(
    (notification) => !isNotificationEnabled(notification, preferences.get(notification.user_id))
  );
  for (const notification of disabled) {
    if (DRY_RUN) {
      console.log(`  would skip ${notification.id} (preference-disabled)`);
    } else {
      await admin
        .from('notifications')
        .update({
          push_sent: true,
          data: { ...(notification.data ?? {}), push_skipped: 'preference-disabled' },
        })
        .eq('id', notification.id);
    }
  }
  const eligible = pending.filter((notification) =>
    isNotificationEnabled(notification, preferences.get(notification.user_id))
  );
  const eligibleUserIds = [...new Set(eligible.map((n) => n.user_id))];
  const { data: devices, error: devErr } = await admin
    .from('devices')
    .select('user_id,push_token')
    .in('user_id', eligibleUserIds)
    .eq('is_active', true)
    .not('push_token', 'is', null);
  if (devErr) throw new Error(`devices lesen: ${devErr.message}`);
  const { expo, native } = partitionTokens(devices ?? []);

  const messages = [];
  const skipped = [];
  for (const n of eligible) {
    const tokens = expo.get(n.user_id) ?? [];
    if (tokens.length === 0) {
      skipped.push(n);
      continue;
    }
    messages.push(
      ...buildExpoMessages(n, tokens).map((message) => ({
        ...message,
        _notificationId: n.id,
      }))
    );
  }
  console.log(`Versandbar (Expo-Token): ${messages.length}, ohne Expo-Token: ${skipped.length}`);

  if (DRY_RUN) {
    for (const m of messages) console.log(`  would send → ${m.to} | ${m.title}`);
    for (const n of skipped) {
      const hasNative = (native.get(n.user_id) ?? []).length > 0;
      console.log(`  would skip ${n.id} (${hasNative ? 'nur natives Token' : 'kein Gerät'})`);
    }
    return;
  }

  let sent = 0;
  const successfulDeliveries = [];
  const failedDeliveries = [];
  for (const batch of chunk(messages)) {
    let tickets;
    try {
      tickets = await postExpoBatch(batch);
    } catch (err) {
      console.error(`  Batch-Fehler (Retry beim nächsten Lauf): ${err.message}`);
      continue;
    }
    const { sent: ok, failed, deadTokens } = mapTickets(batch, tickets);
    successfulDeliveries.push(...ok);
    failedDeliveries.push(...failed);
    for (const token of deadTokens) {
      await admin.from('devices').update({ is_active: false }).eq('push_token', token);
      console.log(`  Gerät deaktiviert (DeviceNotRegistered): ${token.slice(0, 24)}…`);
    }
  }

  for (const result of summarizeDeliveries(successfulDeliveries, failedDeliveries)) {
    const original = pending.find((notification) => notification.id === result.notificationId);
    if (result.sentTokens.length > 0) {
      const { error } = await admin
        .from('notifications')
        .update({
          push_sent: true,
          push_token: result.sentTokens[0],
          data: original?.data ?? {},
        })
        .eq('id', result.notificationId);
      if (!error) sent += 1;
      for (const failure of result.failures) {
        console.warn(`  Teilfehler ${result.notificationId}: ${failure.error}`);
      }
    } else if (result.failures.length > 0) {
      const firstFailure = result.failures[0];
      console.error(`  Ticket-Fehler ${result.notificationId}: ${firstFailure.error}`);
      await admin
        .from('notifications')
        .update({
          push_sent: true,
          data: {
            ...(original?.data ?? {}),
            push_error: firstFailure.error,
          },
        })
        .eq('id', result.notificationId);
    }
  }

  for (const n of skipped) {
    const reason = (native.get(n.user_id) ?? []).length > 0 ? 'no-expo-token' : 'no-device';
    await admin
      .from('notifications')
      .update({ push_sent: true, data: { ...(n.data ?? {}), push_skipped: reason } })
      .eq('id', n.id);
  }

  console.log(`\n✅ Versendet: ${sent}, übersprungen: ${skipped.length}`);
}

main().catch((err) => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
