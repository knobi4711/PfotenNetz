'use client';

import { updatePassword } from '@pfotennetz/supabase';
import Link from 'next/link';
import { useState } from 'react';
import { WebHeader } from '../../components/WebHeader';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (password.length < 8) {
      setError('Das Passwort muss mindestens acht Zeichen lang sein.');
      return;
    }
    if (password !== confirmation) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }
    setPending(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Passwort konnte nicht geändert werden.');
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface">
      <WebHeader backHref="/" backLabel="Anmeldung" />
      <div className="mx-auto max-w-lg px-6 py-10">
        <section className="card p-8">
          <h1 className="text-3xl font-extrabold">Neues Passwort</h1>
          {done ? (
            <>
              <p className="mt-4 text-on-surface-variant" role="status">
                Dein Passwort wurde geändert. Du kannst dich jetzt anmelden.
              </p>
              <Link href="/" className="btn-primary mt-6 inline-flex">
                Zur Anmeldung
              </Link>
            </>
          ) : (
            <>
              <label className="mt-6 block text-sm font-bold">
                Neues Passwort
                <input
                  type="password"
                  className="input mt-1"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <label className="mt-4 block text-sm font-bold">
                Passwort wiederholen
                <input
                  type="password"
                  className="input mt-1"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </label>
              {error ? (
                <p role="alert" className="mt-4 text-sm text-error">
                  {error}
                </p>
              ) : null}
              <button
                type="button"
                className="btn-primary mt-6"
                disabled={pending}
                onClick={() => void submit()}
              >
                {pending ? 'Wird gespeichert …' : 'Passwort speichern'}
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
