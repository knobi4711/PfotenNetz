'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  deletePasskey,
  listPasskeys,
  registerPasskey,
  signInWithEmail,
  signInWithPasskey,
  signOut,
  useAuth,
} from '@pfotennetz/supabase';

interface PasskeyItem {
  id: string;
  friendly_name?: string | undefined;
  created_at: string;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Unbekannter Fehler';
}

export function PasskeyPanel() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);

  const refreshPasskeys = useCallback(async () => {
    setPasskeys(await listPasskeys());
  }, []);

  useEffect(() => {
    if (auth.status !== 'authenticated') {
      setPasskeys([]);
      return;
    }
    void refreshPasskeys().catch((loadError: unknown) => {
      setError(messageOf(loadError));
    });
  }, [auth.status, refreshPasskeys]);

  const run = (action: () => Promise<unknown>, after?: () => Promise<void>) => {
    setPending(true);
    setError(null);
    void action()
      .then(() => after?.())
      .catch((actionError: unknown) => {
        setError(messageOf(actionError));
      })
      .finally(() => {
        setPending(false);
      });
  };

  if (auth.status === 'loading') {
    return (
      <div className="rounded-xl border border-outline-variant/30 bg-white p-8">
        Sitzung wird geprüft …
      </div>
    );
  }

  if (auth.status === 'authenticated') {
    return (
      <section className="rounded-xl border border-outline-variant/30 bg-white p-8">
        <h2 className="mb-2 text-xl font-bold text-on-surface">Passkeys</h2>
        <p className="mb-6 text-sm text-on-surface-variant">
          Registriere Windows Hello, Touch ID, Face ID oder einen Sicherheitsschlüssel.
        </p>
        <div className="space-y-3">
          {passkeys.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Noch kein Passkey registriert.</p>
          ) : (
            passkeys.map((passkey) => (
              <div
                key={passkey.id}
                className="flex items-center justify-between gap-4 rounded-lg border p-3"
              >
                <div>
                  <p className="font-semibold">{passkey.friendly_name ?? 'Passkey'}</p>
                  <p className="text-xs text-on-surface-variant">
                    {new Date(passkey.created_at).toLocaleDateString('de-DE')}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  className="text-sm font-semibold text-red-700 disabled:opacity-50"
                  onClick={() => {
                    run(() => deletePasskey(passkey.id), refreshPasskeys);
                  }}
                >
                  Entfernen
                </button>
              </div>
            ))
          )}
        </div>
        {error !== null ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        <button
          type="button"
          disabled={pending}
          className="mt-6 w-full rounded-xl bg-orange-600 px-4 py-3 font-bold text-white disabled:opacity-50"
          onClick={() => {
            run(registerPasskey, refreshPasskeys);
          }}
        >
          Passkey hinzufügen
        </button>
        <button
          type="button"
          disabled={pending}
          className="mt-3 w-full rounded-xl border px-4 py-3 font-semibold disabled:opacity-50"
          onClick={() => {
            run(signOut);
          }}
        >
          Abmelden
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-outline-variant/30 bg-white p-8">
      <h2 className="mb-4 text-xl font-bold text-on-surface">Anmelden</h2>
      <label className="mb-1 block text-sm font-semibold" htmlFor="email">
        E-Mail
      </label>
      <input
        id="email"
        type="email"
        autoComplete="username webauthn"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
        }}
        className="mb-4 w-full rounded-lg border px-3 py-2"
      />
      <label className="mb-1 block text-sm font-semibold" htmlFor="password">
        Passwort
      </label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
        }}
        className="mb-4 w-full rounded-lg border px-3 py-2"
      />
      {error !== null ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
      <button
        type="button"
        disabled={pending}
        className="w-full rounded-xl bg-orange-600 px-4 py-3 font-bold text-white disabled:opacity-50"
        onClick={() => {
          run(() => signInWithEmail(email.trim(), password));
        }}
      >
        Mit Passwort anmelden
      </button>
      <div className="my-4 text-center text-sm text-on-surface-variant">oder</div>
      <button
        type="button"
        disabled={pending}
        className="w-full rounded-xl border px-4 py-3 font-bold disabled:opacity-50"
        onClick={() => {
          run(signInWithPasskey);
        }}
      >
        Mit Passkey / Windows Hello anmelden
      </button>
    </section>
  );
}
