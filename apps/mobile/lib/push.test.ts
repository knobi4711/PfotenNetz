import { describe, expect, it } from 'vitest';
import { notificationActionUrl } from './push-actions';

describe('notificationActionUrl', () => {
  it('opens the default notification URL', () => {
    expect(
      notificationActionUrl(
        { url: '/booking/bk-1' },
        'expo.modules.notifications.actions.DEFAULT',
        'expo.modules.notifications.actions.DEFAULT'
      )
    ).toBe('/booking/bk-1');
  });

  it('resolves a rich action URL from the push payload', () => {
    expect(
      notificationActionUrl(
        { actionUrls: { OPEN_CHAT: '/chat/bk-1' } },
        'OPEN_CHAT',
        'expo.modules.notifications.actions.DEFAULT'
      )
    ).toBe('/chat/bk-1');
  });

  it('rejects external or malformed URLs', () => {
    expect(notificationActionUrl({ url: 'https://example.com' }, 'DEFAULT', 'DEFAULT')).toBeNull();
    expect(
      notificationActionUrl({ actionUrls: { OPEN_CHAT: 'chat/bk-1' } }, 'OPEN_CHAT', 'DEFAULT')
    ).toBeNull();
  });
});
