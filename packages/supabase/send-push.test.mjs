import { describe, expect, it } from 'vitest';
import {
  buildExpoMessage,
  buildExpoMessages,
  chunk,
  isNotificationEnabled,
  isExpoPushToken,
  mapTickets,
  partitionTokens,
  sanitizeData,
  summarizeDeliveries,
} from './send-push-lib.mjs';

describe('notification preferences', () => {
  it('suppresses disabled categories and keeps unspecified preferences enabled', () => {
    expect(isNotificationEnabled({ type: 'hazard_alert' }, { hazards: false })).toBe(false);
    expect(isNotificationEnabled({ type: 'community_event' }, { community: false })).toBe(false);
    expect(isNotificationEnabled({ type: 'booking_request' }, { hazards: false })).toBe(true);
    expect(
      isNotificationEnabled(
        { type: 'system' },
        { hazards: false, bookings: false, community: false }
      )
    ).toBe(true);
  });
});

describe('expo token detection', () => {
  it('accepts only well-formed Expo tokens', () => {
    expect(isExpoPushToken('ExponentPushToken[abc123]')).toBe(true);
    expect(isExpoPushToken('ExpoPushToken[abc123]')).toBe(true);
    expect(isExpoPushToken('ExponentPushToken[abc123')).toBe(false);
    expect(isExpoPushToken('fcm-native-token')).toBe(false);
    expect(isExpoPushToken('')).toBe(false);
    expect(isExpoPushToken(null)).toBe(false);
  });
});

describe('token partitioning', () => {
  it('groups per user into expo vs native', () => {
    const { expo, native } = partitionTokens([
      { user_id: 'u1', push_token: 'ExponentPushToken[a]' },
      { user_id: 'u1', push_token: 'fcm:xyz' },
      { user_id: 'u2', push_token: '' },
      null,
    ]);
    expect(expo.get('u1')).toEqual(['ExponentPushToken[a]']);
    expect(native.get('u1')).toEqual(['fcm:xyz']);
    expect(expo.has('u2')).toBe(false);
  });
});

describe('message building', () => {
  it('keeps title/body/url and strips non-plain data', () => {
    const msg = buildExpoMessage(
      {
        title: 'Anfrage bestätigt',
        body: 'BK-1 wurde bestätigt.',
        data: { booking_id: 'b-1', url: '/booking/b-1', nested: { x: 1 }, list: [1] },
      },
      'ExponentPushToken[a]'
    );
    expect(msg).toMatchObject({
      to: 'ExponentPushToken[a]',
      title: 'Anfrage bestätigt',
      channelId: 'default',
    });
    expect(msg.data).toEqual({ booking_id: 'b-1', url: '/booking/b-1' });
  });

  it('forwards rich-push categories and only internal action URLs', () => {
    const msg = buildExpoMessage(
      {
        title: 'Neue Buchung',
        body: 'Bitte prüfen',
        data: {
          categoryIdentifier: 'booking',
          actionUrls: {
            OPEN_BOOKING: '/booking/b-1',
            OPEN_CHAT: '/chat/b-1',
            BAD: 'https://example.com',
          },
        },
      },
      'ExponentPushToken[a]'
    );
    expect(msg.categoryIdentifier).toBe('booking');
    expect(msg.data.actionUrls).toEqual({ OPEN_BOOKING: '/booking/b-1', OPEN_CHAT: '/chat/b-1' });
  });

  it('classifies booking notifications and creates booking/chat actions', () => {
    const msg = buildExpoMessage(
      {
        type: 'booking_request',
        title: 'Neue Anfrage',
        body: 'Bitte prüfen',
        data: { booking_id: 'b-2', url: '/booking/b-2' },
      },
      'ExponentPushToken[a]'
    );
    expect(msg.data.categoryIdentifier).toBe('booking');
    expect(msg.data.actionUrls).toEqual({ OPEN_BOOKING: '/booking/b-2', OPEN_CHAT: '/chat/b-2' });
  });

  it('creates one message per unique Expo device token', () => {
    const messages = buildExpoMessages(
      { type: 'system', title: 'Hinweis', body: 'Text', data: {} },
      ['ExponentPushToken[a]', 'ExponentPushToken[b]', 'ExponentPushToken[a]']
    );

    expect(messages.map((message) => message.to)).toEqual([
      'ExponentPushToken[a]',
      'ExponentPushToken[b]',
    ]);
  });
});

describe('multi-device delivery results', () => {
  it('treats a notification as delivered when at least one device succeeds', () => {
    const [result] = summarizeDeliveries(
      [{ notificationId: 'n-1', token: 'ExponentPushToken[current]' }],
      [
        {
          notificationId: 'n-1',
          token: 'ExponentPushToken[old]',
          error: 'DeviceNotRegistered',
        },
      ]
    );

    expect(result.sentTokens).toEqual(['ExponentPushToken[current]']);
    expect(result.failures).toEqual([
      { token: 'ExponentPushToken[old]', error: 'DeviceNotRegistered' },
    ]);
  });
});

describe('sanitizeData', () => {
  it('drops non-plain values and non-objects', () => {
    expect(sanitizeData({ a: 'x', b: 1, c: true, d: null, e: {}, f: [1] })).toEqual({
      a: 'x',
      b: 1,
      c: true,
    });
    expect(sanitizeData([1])).toEqual({});
    expect(sanitizeData(null)).toEqual({});
  });
});

describe('chunk + ticket mapping', () => {
  it('chunks at the Expo limit', () => {
    expect(chunk([1, 2, 3], 2)).toEqual([[1, 2], [3]]);
  });

  it('maps ok/error tickets and flags dead tokens', () => {
    const messages = [
      { to: 'ExponentPushToken[a]', _notificationId: 'n-1' },
      { to: 'ExponentPushToken[b]', _notificationId: 'n-2' },
      { to: 'ExponentPushToken[c]', _notificationId: 'n-3' },
    ];
    const { sent, failed, deadTokens } = mapTickets(messages, [
      { status: 'ok', id: 't-1' },
      { status: 'error', message: 'x', details: { error: 'DeviceNotRegistered' } },
      { status: 'error', message: 'bad', details: { error: 'MessageTooBig' } },
    ]);
    expect(sent).toEqual([{ notificationId: 'n-1', token: 'ExponentPushToken[a]' }]);
    expect(failed).toHaveLength(2);
    expect(deadTokens).toEqual(['ExponentPushToken[b]']);
  });
});
