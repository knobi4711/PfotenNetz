import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import { getSupabaseClient, getUser } from '../client/createClient';
import { registerWithEmail, type RegisterWithEmailInput } from './registration';
import { isSessionMissingError } from './session';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthState {
  status: AuthStatus;
  /** Auth user id when authenticated, otherwise null. */
  userId: string | null;
  /** Only set for real errors; a missing session is NOT an error. */
  error: Error | null;
}

const INITIAL_AUTH_STATE: AuthState = { status: 'loading', userId: null, error: null };

function toAuthState(userId: string | null): AuthState {
  return userId === null
    ? { status: 'unauthenticated', userId: null, error: null }
    : { status: 'authenticated', userId, error: null };
}

/**
 * Central auth state for the app. Exactly one subscription per mounted hook:
 * - initial session is read once (covers already-persisted SecureStore sessions)
 * - onAuthStateChange keeps it live (sign in/out, refresh, expiry)
 * - a missing session maps to 'unauthenticated', never to 'error'
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(INITIAL_AUTH_STATE);

  useEffect(() => {
    let active = true;
    const client = getSupabaseClient();

    void (async () => {
      try {
        const result = await Promise.race([
          client.auth.getSession(),
          new Promise<never>((_, reject) =>
            globalThis.setTimeout(
              () => reject(new Error('Supabase-Sitzungsprüfung hat zu lange gedauert.')),
              10000
            )
          ),
        ]);
        if (!active) return;
        if (result.error !== null && !isSessionMissingError(result.error)) {
          setState({ status: 'error', userId: null, error: result.error });
          return;
        }
        setState(toAuthState(result.data.session?.user.id ?? null));
      } catch (error: unknown) {
        if (active)
          setState({
            status: 'error',
            userId: null,
            error: error instanceof Error ? error : new Error('Sitzungsprüfung fehlgeschlagen.'),
          });
      }
    })();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setState(toAuthState(session?.user.id ?? null));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}

/**
 * The currently authenticated user (null when signed out).
 * The underlying getUser wrapper maps a missing session to null,
 * so signed-out is data (null), not an error.
 */
export function useCurrentUser(): UseQueryResult<User | null, Error> {
  return useQuery({ queryKey: ['session', 'user'], queryFn: getUser });
}

export interface SignInInput {
  email: string;
  password: string;
}

/** Email/password sign-in. Refreshes the cached current user on success. */
export function useSignIn() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SignInInput) => {
      const { data, error } = await client.auth.signInWithPassword(input);
      if (error) throw error;
      return data.user;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['session', 'user'] });
    },
  });
}

/** Email/password signup. The database trigger creates the matching profile. */
export function useSignUp() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterWithEmailInput) => registerWithEmail(client, input),
    onSuccess: (result) => {
      if (result.session !== null) {
        void queryClient.invalidateQueries({ queryKey: ['session', 'user'] });
      }
    },
  });
}
