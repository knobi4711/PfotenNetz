#!/usr/bin/env node
/**
 * Remote End-to-End: Suche -> Auswahl -> Anfrage -> Bestätigung.
 *
 * Admin-Pfad (Service Role, entspricht Admin-Freigabe):
 *   - legt Seeker + Helper an (auth.admin)
 *   - verifiziert den Helper (role=helper, trust_level=silver, Standort,
 *     approved Verifizierungen, aktive Verfügbarkeit)
 * Seeker-Pfad (Anon-Key + Login, wie die App):
 *   - find_nearby_helpers -> get_helper_detail -> Booking-Insert mit helper_id
 * Helper-Pfad: helper_accept_booking RPC -> confirmed
 * Danach: Assertions + vollständiges Cleanup (Bookings, Pets, Users).
 *
 * Erwartet: Migrationen bis 025 remote (026 nur für Notification-Soft-Check).
 * Usage: node e2e-helper-booking.mjs  (cwd: packages/supabase, .env dort)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const stamp = Date.now().toString(36);
const SEEKER_EMAIL = `e2e-${stamp}-seeker@pfotennetz.local`;
const HELPER_EMAIL = `e2e-${stamp}-helper@pfotennetz.local`;
const PASSWORD = 'E2eTestPass123!';
const BERLIN_OFFSET = '+02:00'; // MESZ, gültig bis 25.10.2026

const state = { seekerId: null, helperId: null, petId: null, bookingId: null };
let failures = 0;

function step(ok, label, detail = '') {
  console.log(`${ok ? '  ✅' : '  ❌'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
}

function nextMonday10h() {
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); // nächster Montag
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return {
    dayOfWeek: 1,
    startAt: `${y}-${m}-${day}T10:00:00${BERLIN_OFFSET}`,
    endAt: `${y}-${m}-${day}T11:00:00${BERLIN_OFFSET}`,
  };
}

async function authedClient(email) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function cleanup() {
  console.log('\n🧹 Cleanup …');
  try {
    if (state.bookingId) {
      await admin.from('bookings').delete().eq('id', state.bookingId);
      console.log('   booking gelöscht');
    }
    if (state.petId) {
      await admin.from('pets').delete().eq('id', state.petId);
      console.log('   pet gelöscht');
    }
    for (const id of [state.seekerId, state.helperId].filter(Boolean)) {
      const { error } = await admin.auth.admin.deleteUser(id);
      console.log(`   user ${id.slice(0, 8)}… ${error ? `FEHLER: ${error.message}` : 'gelöscht'}`);
    }
  } catch (err) {
    console.error('   Cleanup-Fehler:', err.message);
  }
}

async function main() {
  console.log('🚀 E2E Helper-Booking (remote)\n');
  console.log('--- 1. Admin: Testdatensatz anlegen ---');

  for (const [key, email, displayName] of [
    ['seekerId', SEEKER_EMAIL, 'E2E Seeker'],
    ['helperId', HELPER_EMAIL, 'E2E Helper'],
  ]) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    state[key] = data.user.id;
    // Profil wird vom Auth-Trigger (020) automatisch angelegt -> nur pflegen.
    const { error: pErr } = await admin
      .from('profiles')
      .update({ email, display_name: displayName })
      .eq('id', data.user.id);
    if (pErr) throw new Error(`profile ${email}: ${pErr.message}`);
    step(true, `User angelegt`, email);
  }

  // Helper-Verifizierung über Admin-Weg (service role umgeht protect-Trigger wie ein Admin)
  const { error: roleErr } = await admin
    .from('profiles')
    .update({
      role: 'helper',
      trust_level: 'silver',
      location: 'POINT(13.4050 52.5200)',
      location_updated_at: new Date().toISOString(),
    })
    .eq('id', state.helperId);
  step(!roleErr, 'Helper-Rolle + Vertrauen + Standort gesetzt', roleErr?.message ?? '');

  const { error: verErr } = await admin.from('verifications').insert([
    { user_id: state.helperId, type: 'id_document', status: 'approved' },
    { user_id: state.helperId, type: 'liability_insurance', status: 'approved' },
  ]);
  step(!verErr, 'Verifizierungen als approved hinterlegt', verErr?.message ?? '');

  const slot = nextMonday10h();
  const { error: avErr } = await admin.from('helper_availabilities').insert({
    helper_id: state.helperId,
    day_of_week: slot.dayOfWeek,
    start_time: '09:00',
    end_time: '12:00',
    booking_types: ['walk'],
    max_distance_km: 10,
    is_active: true,
  });
  step(!avErr, 'Aktive Verfügbarkeit Mo 09–12 Uhr angelegt', avErr?.message ?? '');

  const { data: pet, error: petErr } = await admin
    .from('pets')
    .insert({ owner_id: state.seekerId, name: 'E2E-Bello', species: 'dog' })
    .select('id')
    .single();
  if (!petErr) state.petId = pet.id;
  step(!petErr, 'Seeker-Tier angelegt', petErr?.message ?? '');

  console.log('\n--- 2. Seeker: Suche -> Auswahl -> Anfrage ---');
  const seeker = await authedClient(SEEKER_EMAIL);

  const { data: nearby, error: nearErr } = await seeker.rpc('find_nearby_helpers', {
    p_latitude: 52.521,
    p_longitude: 13.406,
    p_radius_km: 3,
    p_limit: 20,
  });
  const found =
    !nearErr && Array.isArray(nearby) && nearby.some((h) => h.helper_id === state.helperId);
  step(
    found,
    'Helper in find_nearby_helpers gefunden',
    nearErr?.message ?? `${(nearby ?? []).length} Treffer`
  );
  if (nearErr && String(nearErr.message).includes('available_days')) {
    console.log('   ⚠️  Hinweis: Migration 024 remote fehlt (altes RPC-Format).');
  }

  const { data: detail, error: detErr } = await seeker
    .rpc('get_helper_detail', { p_helper_id: state.helperId })
    .single();
  if (detErr) {
    step(false, 'get_helper_detail', detErr.message);
    console.log('   ⚠️  Hinweis: falls "function does not exist" → Migration 025 remote fehlt.');
  } else {
    const slots = Array.isArray(detail.slots) ? detail.slots : [];
    step(
      detail.trust_level === 'silver' && slots.length > 0,
      'Helper-Detail mit Slots',
      `${slots.length} Slots`
    );
  }

  const bookingNumber = `BK-E2E-${stamp.slice(-4).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;
  const { data: booking, error: bookErr } = await seeker
    .from('bookings')
    .insert({
      booking_number: bookingNumber,
      type: 'walk',
      seeker_id: state.seekerId,
      helper_id: state.helperId,
      pet_id: state.petId,
      start_at: slot.startAt,
      end_at: slot.endAt,
      meeting_address: 'E2E-Treff, Berlin',
      price_eur_cents: 0,
      price_kiez_hours: 1,
      currency: 'KIEZ_HOURS',
    })
    .select('id,status')
    .single();
  if (!bookErr) state.bookingId = booking.id;
  step(
    !bookErr && booking?.status === 'requested',
    'Buchung als requested mit Helper angelegt',
    bookErr?.message ?? bookingNumber
  );

  console.log('\n--- 3. Helper: Anfrage bestätigen ---');
  const helper = await authedClient(HELPER_EMAIL);
  const { data: confirmed, error: accErr } = await helper
    .rpc('helper_accept_booking', { p_booking_id: state.bookingId })
    .single();
  step(
    !accErr && confirmed?.status === 'confirmed',
    'Helper hat bestätigt (requested → confirmed)',
    accErr?.message ?? ''
  );

  console.log('\n--- 4. Seeker: Bestätigung sichtbar ---');
  const { data: seen, error: seenErr } = await seeker
    .from('bookings')
    .select('id,status,helper_id')
    .eq('id', state.bookingId)
    .single();
  step(!seenErr && seen?.status === 'confirmed', 'Seeker sieht confirmed', seenErr?.message ?? '');

  console.log('\n--- 5. Notifications (Soft-Check, braucht Migration 026) ---');
  const { data: helperNotifs } = await admin
    .from('notifications')
    .select('id,type')
    .eq('user_id', state.helperId)
    .eq('type', 'booking_request');
  const { data: seekerNotifs } = await admin
    .from('notifications')
    .select('id,type')
    .eq('user_id', state.seekerId)
    .eq('type', 'booking_confirmed');
  if ((helperNotifs ?? []).length > 0 && (seekerNotifs ?? []).length > 0) {
    step(true, 'Fanout-Zeilen vorhanden (request + confirmed)');
  } else {
    console.log(
      '  ⚠️  Keine Fanout-Zeilen — Migration 026 vermutlich remote noch nicht applied. Kein Fail.'
    );
  }

  console.log(failures === 0 ? '\n🎉 E2E bestanden.' : `\n❌ E2E mit ${failures} Fehler(n).`);
  return failures;
}

try {
  const code = await main();
  await cleanup();
  process.exit(code === 0 ? 0 : 1);
} catch (err) {
  console.error('\n❌ Fatal:', err.message);
  await cleanup();
  process.exit(1);
}
