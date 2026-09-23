/**
 * Pure, side-effect-free helpers for the push worker (send-push-notifications.mjs).
 * Kept dependency-free so they run under plain node AND vitest.
 */

export const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
export const MAX_BATCH = 100;

export function isExpoPushToken(token) {
  return (
    typeof token === 'string' &&
    (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')) &&
    token.endsWith(']')
  );
}

/** Groups active device tokens per user into expo-sendable vs native/other. */
export function partitionTokens(devices) {
  const expo = new Map();
  const native = new Map();
  for (const d of devices ?? []) {
    if (!d || typeof d.push_token !== 'string' || d.push_token.length === 0) continue;
    const target = isExpoPushToken(d.push_token) ? expo : native;
    if (!target.has(d.user_id)) target.set(d.user_id, []);
    target.get(d.user_id).push(d.push_token);
  }
  return { expo, native };
}

/** Only plain JSON values travel inside an Expo push payload. */
export function sanitizeData(data) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return {};
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    }
  }
  return out;
}

export function buildExpoMessage(notification, token) {
  const message = {
    to: token,
    title: notification.title,
    body: notification.body,
    data: sanitizeData(notification.data),
  };
  if (notification.data && typeof notification.data.url === 'string') {
    message.channelId = 'default';
  }
  return message;
}

/** Splits an array into chunks of at most MAX_BATCH (Expo limit). */
export function chunk(messages, size = MAX_BATCH) {
  const out = [];
  for (let i = 0; i < messages.length; i += size) out.push(messages.slice(i, i + size));
  return out;
}

/**
 * Maps Expo ticket responses back to per-message outcomes.
 * Returns { sent, failed, deadTokens } where deadTokens are tokens Expo
 * reports as DeviceNotRegistered (safe to deactivate).
 */
export function mapTickets(messages, tickets) {
  const sent = [];
  const failed = [];
  const deadTokens = [];
  tickets.forEach((ticket, index) => {
    const message = messages[index];
    if (!message) return;
    if (ticket && ticket.status === 'ok') {
      sent.push({ notificationId: message._notificationId, token: message.to });
    } else {
      const code = ticket?.details?.error ?? ticket?.message ?? 'unknown';
      failed.push({ notificationId: message._notificationId, token: message.to, error: code });
      if (code === 'DeviceNotRegistered') deadTokens.push(message.to);
    }
  });
  return { sent, failed, deadTokens };
}
