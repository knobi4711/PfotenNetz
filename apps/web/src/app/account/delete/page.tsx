'use client';

import { signOut, useDeleteOwnAccount, useOwnProfile } from '@pfotennetz/supabase';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function DeleteAccountPage() {
  const profile = useOwnProfile();
  const deleteAccount = useDeleteOwnAccount();
  const [confirmation, setConfirmation] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const canDelete = confirmation.trim().toUpperCase() === 'LÖSCHEN' && understood;

  const handleDelete = () => {
    if (!canDelete || deleteAccount.isPending) return;
    deleteAccount.mutate(undefined, {
      onSuccess: () => {
        setDeleted(true);
        void signOut();
      },
    });
  };

  if (deleted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-10">
        <section className="card w-full max-w-xl p-8 text-center">
          <h1 className="text-3xl font-extrabold">Account gelöscht</h1>
          <p className="mt-4 text-on-surface-variant">Dein PfotenNetz-Account und die zugehörigen Daten wurden dauerhaft gelöscht.</p>
          <Link href="/" className="btn-primary mt-6 inline-flex">Zur Startseite</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface px-6 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 flex items-center gap-3">
          <Image src="/pfotennetz-logo.png" alt="" width={48} height={48} className="rounded-xl" />
          <span className="text-xl font-extrabold">PfotenNetz</span>
        </div>
        <section className="card p-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-error">Kontoverwaltung</p>
          <h1 className="mt-2 text-3xl font-extrabold">Account löschen</h1>
          {profile.isPending ? <p className="mt-5 text-on-surface-variant">Anmeldung wird geprüft …</p> : null}
          {!profile.isPending && !profile.data ? (
            <>
              <p className="mt-5 text-on-surface-variant">Bitte melde dich an, um deinen Account zu löschen.</p>
              <Link href="/" className="btn-primary mt-6 inline-flex">Zur Anmeldung</Link>
            </>
          ) : null}
          {profile.data ? (
            <>
              <p className="mt-5 text-on-surface-variant">
                Du bist als <strong>{profile.data.display_name}</strong> angemeldet. Diese Aktion löscht deinen Account dauerhaft einschließlich Profil, Tieren, Nachrichten und Buchungsdaten. Sie kann nicht rückgängig gemacht werden.
              </p>
              <label className="mt-6 flex items-start gap-3 text-sm font-semibold">
                <input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} className="mt-1 h-5 w-5 accent-error" />
                <span>Ich verstehe, dass mein Account und meine Daten dauerhaft gelöscht werden.</span>
              </label>
              <label htmlFor="delete-confirmation" className="mt-5 block text-sm font-bold">Zur Bestätigung „LÖSCHEN“ eingeben</label>
              <input id="delete-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="input mt-2" autoComplete="off" />
              {deleteAccount.isError ? <p role="alert" className="mt-3 text-sm font-semibold text-error">Account konnte nicht gelöscht werden: {deleteAccount.error.message}</p> : null}
              <button type="button" className="btn-emergency mt-6 w-full" disabled={!canDelete || deleteAccount.isPending} onClick={handleDelete}>
                {deleteAccount.isPending ? 'Account wird gelöscht …' : 'Account dauerhaft löschen'}
              </button>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
