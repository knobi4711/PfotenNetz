export type NotificationActionData = {
  url?: unknown;
  actionUrls?: unknown;
};

export function notificationActionUrl(
  data: NotificationActionData,
  actionIdentifier: string,
  defaultActionIdentifier: string
): string | null {
  if (actionIdentifier === defaultActionIdentifier && typeof data.url === 'string') {
    return data.url.startsWith('/') ? data.url : null;
  }
  if (
    typeof data.actionUrls !== 'object' ||
    data.actionUrls === null ||
    Array.isArray(data.actionUrls)
  ) {
    return null;
  }
  const actionUrl = (data.actionUrls as Record<string, unknown>)[actionIdentifier];
  return typeof actionUrl === 'string' && actionUrl.startsWith('/') ? actionUrl : null;
}
