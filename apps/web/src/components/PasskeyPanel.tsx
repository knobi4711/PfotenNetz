'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  deletePasskey,
  getSupabaseClient,
  listPasskeys,
  registerWithEmail,
  registerPasskey,
  resetPassword,
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
  const [displayName, setDisplayName] = useState('');
  const [registering, setRegistering] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
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

  const submitRegistration = () => {
    if (displayName.trim().length < 2) {
      setError('Bitte gib einen Namen mit mindestens zwei Zeichen ein.');
      return;
    }
    setPending(true);
    setError(null);
    void registerWithEmail(getSupabaseClient(), {
      displayName: displayName.trim(),
      email: email.trim(),
      password,
      emailRedirectTo: window.location.origin,
    })
      .then((result) => {
        setRegistering(false);
        setPassword('');
        if (result.emailConfirmationRequired) {
          setError('Registrierung erfolgreich. Prüfe bitte dein E-Mail-Postfach.');
        }
      })
      .catch((registrationError: unknown) => {
        setError(messageOf(registrationError));
      })
      .finally(() => {
        setPending(false);
      });
  };

  const submitPasswordReset = () => {
    if (!email.trim().includes('@')) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }
    run(() =>
      resetPassword(email.trim(), `${window.location.origin}/reset-password`).then(() => {
        setResetSent(true);
      })
    );
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
      <h2 className="mb-4 text-xl font-bold text-on-surface">
        {resetting ? 'Passwort zurücksetzen' : registering ? 'Konto erstellen' : 'Anmelden'}
      </h2>
      {resetting ? (
        <p className="mb-5 text-sm text-on-surface-variant">
          Wir senden dir einen Link an deine E-Mail-Adresse. Der Link öffnet die sichere
          Passwortvergabe.
        </p>
      ) : null}
      {!resetting && registering ? (
        <>
          <label className="mb-1 block text-sm font-semibold" htmlFor="display-name">
            Anzeigename
          </label>
          <input
            id="display-name"
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="mb-4 w-full rounded-lg border px-3 py-2"
          />
        </>
      ) : null}
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
      {!resetting ? (
        <>
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
        </>
      ) : null}
      {resetSent ? (
        <p className="mb-4 text-sm text-green-700" role="status">
          Falls ein Konto zu dieser Adresse existiert, wurde eine E-Mail versendet.
        </p>
      ) : null}
      {error !== null ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
      <button
        type="button"
        disabled={pending}
        className="w-full rounded-xl bg-orange-600 px-4 py-3 font-bold text-white disabled:opacity-50"
        onClick={() => {
          if (resetting) submitPasswordReset();
          else if (registering) submitRegistration();
          else run(() => signInWithEmail(email.trim(), password));
        }}
      >
        {resetting
          ? 'Reset-E-Mail senden'
          : registering
            ? 'Konto erstellen'
            : 'Mit Passwort anmelden'}
      </button>
      {resetting ? (
        <button
          type="button"
          disabled={pending}
          className="mt-3 w-full rounded-xl border px-4 py-3 font-semibold disabled:opacity-50"
          onClick={() => {
            setResetting(false);
            setResetSent(false);
            setError(null);
          }}
        >
          Zur Anmeldung
        </button>
      ) : null}
      <button
        type="button"
        disabled={pending}
        className="mt-3 w-full rounded-xl border px-4 py-3 font-semibold disabled:opacity-50"
        onClick={() => {
          setRegistering((current) => !current);
          setResetting(false);
          setError(null);
        }}
      >
        {registering ? 'Bereits registriert? Anmelden' : 'Noch kein Konto? Registrieren'}
      </button>
      {!registering ? (
        <>
          {!resetting ? (
            <button
              type="button"
              disabled={pending}
              className="mt-3 w-full text-sm font-semibold text-orange-700 disabled:opacity-50"
              onClick={() => {
                setResetting(true);
                setResetSent(false);
                setError(null);
              }}
            >
              Passwort vergessen?
            </button>
          ) : null}
          {!resetting ? (
            <div className="my-4 text-center text-sm text-on-surface-variant">oder</div>
          ) : null}
          {!resetting ? (
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
          ) : null}
        </>
      ) : null}
    </section>
  );
}
