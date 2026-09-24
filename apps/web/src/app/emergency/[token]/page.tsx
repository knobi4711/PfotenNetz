'use client';

import {
  fetchPublicEmergencyCard,
  getSupabaseClient,
  type PublicEmergencyCard,
} from '@pfotennetz/supabase';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const cachePrefix = 'pfotennetz.public-emergency.';

function isValidCard(card: PublicEmergencyCard | null): card is PublicEmergencyCard {
  return card !== null && Date.parse(card.expires_at) > Date.now();
}

function readCachedCard(token: string): PublicEmergencyCard | null {
  try {
    const value = window.localStorage.getItem(`${cachePrefix}${token}`);
    if (!value) return null;
    const card = JSON.parse(value) as PublicEmergencyCard;
    return isValidCard(card) ? card : null;
  } catch {
    return null;
  }
}

function cacheCard(token: string, card: PublicEmergencyCard): void {
  try {
    window.localStorage.setItem(`${cachePrefix}${token}`, JSON.stringify(card));
  } catch {
    // Private browsing or a full storage quota must not block the public card.
  }
}

function removeCachedCard(token: string): void {
  try {
    window.localStorage.removeItem(`${cachePrefix}${token}`);
  } catch {
    // Ignore unavailable browser storage.
  }
}

function list(value: unknown) {
  return Array.isArray(value) && value.length ? value.join(', ') : 'Keine Angaben';
}

export default function PublicEmergencyCardPage() {
  const params = useParams<{ token: string }>();
  const [card, setCard] = useState<PublicEmergencyCard | null>(null);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!params.token) return;
    const cached = readCachedCard(params.token);
    if (!navigator.onLine) {
      if (cached) {
        setCard(cached);
        setOffline(true);
        setState('ready');
      } else {
        setState('error');
      }
      return;
    }

    void fetchPublicEmergencyCard(getSupabaseClient(), params.token)
      .then((value) => {
        if (!isValidCard(value)) {
          // An online null response means the token was revoked or expired. Do not
          // show a stale cached card in that case.
          removeCachedCard(params.token);
          setCard(null);
          setState('error');
          return;
        }
        cacheCard(params.token, value);
        setCard(value);
        setOffline(false);
        setState('ready');
      })
      .catch(() => {
        if (cached) {
          setCard(cached);
          setOffline(true);
          setState('ready');
        } else {
          setState('error');
        }
      });
  }, [params.token]);

  return (
    <main className="min-h-screen bg-surface px-5 py-10 text-on-surface">
      <div className="mx-auto max-w-xl">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">PfotenNetz</p>
        <h1 className="mt-2 text-3xl font-extrabold">Digitale Notfallkarte</h1>
        {offline ? (
          <p className="mt-4 rounded-xl bg-secondary-container p-3 text-sm font-semibold text-on-secondary-container">
            Offline-Modus: zuletzt synchronisierte Karte. Gültig bis{' '}
            {card ? new Date(card.expires_at).toLocaleDateString('de-DE') : 'unbekannt'}.
          </p>
        ) : null}
        {state === 'loading' ? <p className="mt-8">Notfallkarte wird geladen …</p> : null}
        {state === 'error' ? (
          <section className="card mt-8 p-6" role="alert">
            <h2 className="text-xl font-extrabold">Link nicht verfügbar</h2>
            <p className="mt-2 text-on-surface-variant">
              Der Link ist abgelaufen oder wurde vom Halter widerrufen.
            </p>
          </section>
        ) : null}
        {state === 'ready' && card ? (
          <section className="card mt-8 p-6">
            <div className="rounded-2xl bg-primary-fixed p-6 text-center">
              <div className="text-5xl">
                {card.species === 'cat' ? '🐱' : card.species === 'dog' ? '🐶' : '🐾'}
              </div>
              <h2 className="mt-2 text-3xl font-extrabold">{card.name}</h2>
              <p>{card.breed ?? card.species}</p>
            </div>
            <dl className="mt-6 space-y-4">
              <Row label="Farbe" value={card.color} />
              <Row label="Chipnummer" value={card.microchip_number} />
              <Row label="Medikamente" value={list(card.medications)} />
              <Row label="Allergien" value={list(card.allergies)} />
              <Row label="Besondere Hinweise" value={card.special_needs} />
              <Row label="Tierarztpraxis" value={card.vet_clinic} />
              <div className="border-b border-outline-variant/30 pb-3">
                <dt className="text-sm font-bold text-on-surface-variant">Tierarzt-Telefon</dt>
                {card.vet_phone && /^[+0-9][0-9 ()/.-]{5,}$/.test(card.vet_phone.trim()) ? (
                  <a
                    href={`tel:${card.vet_phone.trim().replace(/[ ()/-]/g, '')}`}
                    className="mt-1 inline-block font-bold text-primary underline"
                  >
                    {card.vet_phone}
                  </a>
                ) : (
                  <dd className="mt-1">Nicht angegeben</dd>
                )}
              </div>
            </dl>
            <p className="mt-8 text-xs text-on-surface-variant">
              Diese Notfallkarte ist zeitlich begrenzt und enthält nur vom Halter freigegebene
              Daten.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="border-b border-outline-variant/30 pb-3">
      <dt className="text-sm font-bold text-on-surface-variant">{label}</dt>
      <dd className="mt-1">{value || 'Nicht angegeben'}</dd>
    </div>
  );
}
