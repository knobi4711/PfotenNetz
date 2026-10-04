import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export interface RegisterWithEmailInput {
  displayName: string;
  email: string;
  password: string;
  /** Optional redirect target for email confirmation (for example a native deep link). */
  emailRedirectTo?: string;
}

export async function registerWithEmail(
  client: SupabaseClient<Database>,
  input: RegisterWithEmailInput
) {
  const { data, error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { display_name: input.displayName },
      ...(input.emailRedirectTo ? { emailRedirectTo: input.emailRedirectTo } : {}),
    },
  });

  if (error) throw error;
  if (data.user === null) throw new Error('Signup succeeded but no user returned');

  return {
    user: data.user,
    session: data.session,
    emailConfirmationRequired: data.session === null,
  };
}
