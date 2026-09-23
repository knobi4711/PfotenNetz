import { describe, expect, it } from 'vitest';
import {
  buildExpoMessage,
  chunk,
  isExpoPushToken,
  mapTickets,
  partitionTokens,
  sanitizeData,
} from './send-push-lib.mjs';

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
