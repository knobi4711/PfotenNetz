import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { registerWithEmail } from './registration';

function clientWithSignUp(result: unknown) {
  const calls: unknown[] = [];
  const client = {
    auth: {
      signUp: (input: unknown) => {
        calls.push(input);
        return Promise.resolve(result);
      },
    },
  } as unknown as SupabaseClient<Database>;
  return { client, calls };
}

describe('registerWithEmail', () => {
  it('passes the display name as trusted signup metadata for the profile trigger', async () => {
    const user = { id: 'user-1' };
    const { client, calls } = clientWithSignUp({ data: { user, session: null }, error: null });

    const result = await registerWithEmail(client, {
      displayName: 'Anna Beispiel',
      email: 'anna@example.com',
      password: 'sicheres-passwort',
    });

    expect(calls).toEqual([
      {
        email: 'anna@example.com',
        password: 'sicheres-passwort',
        options: { data: { display_name: 'Anna Beispiel' } },
      },
    ]);
    expect(result).toEqual({ user, session: null, emailConfirmationRequired: true });
  });

  it('reports an immediately available session', async () => {
    const user = { id: 'user-1' };
    const session = { access_token: 'test' };
    const { client } = clientWithSignUp({ data: { user, session }, error: null });

    await expect(
      registerWithEmail(client, {
        displayName: 'Ben Beispiel',
        email: 'ben@example.com',
        password: 'sicheres-passwort',
      })
    ).resolves.toEqual({ user, session, emailConfirmationRequired: false });
  });

  it('forwards signup errors', async () => {
    const error = new Error('User already registered');
    const { client } = clientWithSignUp({ data: { user: null, session: null }, error });

    await expect(
      registerWithEmail(client, {
        displayName: 'Anna Beispiel',
        email: 'anna@example.com',
        password: 'sicheres-passwort',
      })
    ).rejects.toBe(error);
  });
});
