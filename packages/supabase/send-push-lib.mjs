/**
 * Pure, side-effect-free helpers for the push worker (send-push-notifications.mjs).
 * Kept dependency-free so they run under plain node AND vitest.
 */

export const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
export const MAX_BATCH = 100;

export function isNotificationEnabled(notification, preferences) {
  const prefs = preferences && typeof preferences === 'object' ? preferences : {};
  if (
    ['hazard_alert', 'hazard_resolved', 'missing_pet_alert', 'missing_pet_found'].includes(
      notification.type
    )
  )
    return prefs.hazards !== false;
  if (
    [
      'booking_request',
      'booking_confirmed',
      'booking_cancelled',
      'tracking_started',
      'tracking_milestone',
      'tracking_ended',
      'timebank_update',
      'chat_message',
    ].includes(notification.type)
  )
    return prefs.bookings !== false;
  if (notification.type === 'community_event') return prefs.community !== false;
  return true;
}

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
    } else if (
      key === 'actionUrls' &&
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {
      const actionUrls = {};
      for (const [action, url] of Object.entries(value)) {
        if (typeof url === 'string' && url.startsWith('/')) actionUrls[action] = url;
      }
      if (Object.keys(actionUrls).length > 0) out.actionUrls = actionUrls;
    }
  }
  return out;
}

export function buildExpoMessage(notification, token) {
  const data = { ...sanitizeData(notification.data) };
  const bookingId = typeof data.booking_id === 'string' ? data.booking_id : null;
  if (
    [
      'booking_request',
      'booking_confirmed',
      'booking_cancelled',
      'tracking_started',
      'tracking_milestone',
      'tracking_ended',
      'timebank_update',
    ].includes(notification.type)
  ) {
    data.categoryIdentifier = 'booking';
    if (bookingId) {
      data.actionUrls = {
        OPEN_BOOKING: `/booking/${bookingId}`,
        OPEN_CHAT: `/chat/${bookingId}`,
      };
    }
  } else if (notification.type === 'chat_message') {
    data.categoryIdentifier = 'booking';
    if (bookingId)
      data.actionUrls = { OPEN_CHAT: `/chat/${bookingId}`, OPEN_BOOKING: `/booking/${bookingId}` };
  } else if (
    ['hazard_alert', 'hazard_resolved', 'missing_pet_alert', 'missing_pet_found'].includes(
      notification.type
    )
  ) {
    data.categoryIdentifier = 'safety';
  } else if (notification.type === 'community_event') {
    data.categoryIdentifier = 'community';
  }
  const message = {
    to: token,
    title: notification.title,
    body: notification.body,
    data: sanitizeData(data),
  };
  if (notification.data && typeof notification.data.url === 'string') {
    message.channelId = 'default';
  }
  if (notification.data && typeof notification.data.categoryIdentifier === 'string') {
    message.categoryIdentifier = notification.data.categoryIdentifier;
  }
  return message;
}

export function buildExpoMessages(notification, tokens) {
  return [...new Set(tokens ?? [])].map((token) => buildExpoMessage(notification, token));
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

export function summarizeDeliveries(sent, failed) {
  const byNotification = new Map();
  const entry = (notificationId) => {
    if (!byNotification.has(notificationId)) {
      byNotification.set(notificationId, { notificationId, sentTokens: [], failures: [] });
    }
    return byNotification.get(notificationId);
  };
  for (const delivery of sent ?? []) {
    entry(delivery.notificationId).sentTokens.push(delivery.token);
  }
  for (const delivery of failed ?? []) {
    entry(delivery.notificationId).failures.push({
      token: delivery.token,
      error: delivery.error,
    });
  }
  return [...byNotification.values()];
}
