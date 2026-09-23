import { beforeEach, describe, expect, it, vi } from 'vitest';

const signOutMock = vi.fn();
const removeSessionMock = vi.fn();

vi.mock('../client/createClient', () => ({
  getSupabaseClient: () => ({
    auth: {
      signOut: signOutMock,
      _removeSession: removeSessionMock,
    },
  }),
}));

import { signOut } from './index';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('signOut', () => {
  it('signs out globally without touching local state on success', async () => {
    signOutMock.mockResolvedValue({ data: null, error: null });
    await expect(signOut()).resolves.toBeUndefined();
    expect(signOutMock).toHaveBeenCalledOnce();
    expect(removeSessionMock).not.toHaveBeenCalled();
  });

  it('clears the local session when server logout returns an error', async () => {
    signOutMock.mockResolvedValue({
      data: null,
      error: { name: 'AuthApiError', message: 'Could not load bundle', status: 400 },
    });
    removeSessionMock.mockResolvedValue(undefined);
    await expect(signOut()).resolves.toBeUndefined();
    expect(removeSessionMock).toHaveBeenCalledOnce();
  });

  it('clears the local session when server logout throws', async () => {
    signOutMock.mockRejectedValue(new TypeError('Network request failed'));
    removeSessionMock.mockResolvedValue(undefined);
    await expect(signOut()).resolves.toBeUndefined();
    expect(removeSessionMock).toHaveBeenCalledOnce();
  });

  it('treats an already-missing session as signed out', async () => {
    signOutMock.mockResolvedValue({
      data: null,
      error: { name: 'AuthSessionMissingError', message: 'Auth session missing!' },
    });
    await expect(signOut()).resolves.toBeUndefined();
    expect(removeSessionMock).not.toHaveBeenCalled();
  });
});
