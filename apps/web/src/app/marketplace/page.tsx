'use client';

import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_KIND_LABELS,
  useCreateMarketplaceInquiry,
  useCreateMarketplaceListing,
  useCurrentUser,
  useMarketplaceListings,
  useSetMarketplaceListingStatus,
  type MarketplaceListingKind,
  type MarketplaceListingWithOwner,
} from '@pfotennetz/supabase';
import { useState } from 'react';
import { WebHeader } from '../../components/WebHeader';

const KINDS = Object.entries(MARKETPLACE_KIND_LABELS) as [MarketplaceListingKind, string][];

function CreateListingForm({ onCreated }: { onCreated: () => void }) {
  const create = useCreateMarketplaceListing();
  const [kind, setKind] = useState<MarketplaceListingKind>('giveaway');
  const [category, setCategory] = useState<string>(MARKETPLACE_CATEGORIES[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('');
  const [price, setPrice] = useState('');
  const [exchangeFor, setExchangeFor] = useState('');
  const [locationArea, setLocationArea] = useState('');

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    create.mutate(
      {
        kind,
        category,
        title,
        description,
        condition,
        priceEur: price ? Number(price.replace(',', '.')) : null,
        exchangeFor,
        locationArea,
      },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          setCondition('');
          setPrice('');
          setExchangeFor('');
          onCreated();
        },
      }
    );
  };

  return (
    <form onSubmit={submit} className="card mt-6 grid gap-4 p-6 md:grid-cols-2">
      <div className="md:col-span-2">
        <h2 className="text-xl font-extrabold">Neues Angebot oder Gesuch</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Teile nur einen Stadtteil oder eine PLZ – keine genaue Wohnadresse.
        </p>
      </div>
      <label className="text-sm font-bold">
        Ich möchte …
        <select
          className="input mt-2"
          value={kind}
          onChange={(event) => setKind(event.target.value as MarketplaceListingKind)}
        >
          {KINDS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-bold">
        Kategorie
        <select
          className="input mt-2"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          {MARKETPLACE_CATEGORIES.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-bold md:col-span-2">
        Titel
        <input
          required
          maxLength={100}
          className="input mt-2"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="z. B. Hundebox für Kleinwagen"
        />
      </label>
      <label className="text-sm font-bold">
        Zustand (optional)
        <input
          className="input mt-2"
          value={condition}
          onChange={(event) => setCondition(event.target.value)}
          placeholder="neu, gut erhalten …"
        />
      </label>
      <label className="text-sm font-bold">
        Stadtteil oder PLZ (optional)
        <input
          className="input mt-2"
          value={locationArea}
          onChange={(event) => setLocationArea(event.target.value)}
          placeholder="z. B. 10435"
        />
      </label>
      {kind === 'sell' ? (
        <label className="text-sm font-bold">
          Preis in €
          <input
            required
            min="0.01"
            step="0.01"
            type="number"
            className="input mt-2"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </label>
      ) : null}
      {kind === 'swap' ? (
        <label className="text-sm font-bold">
          Ich suche dafür
          <input
            className="input mt-2"
            value={exchangeFor}
            onChange={(event) => setExchangeFor(event.target.value)}
            placeholder="z. B. Nassfutter Katze"
          />
        </label>
      ) : null}
      <label className="text-sm font-bold md:col-span-2">
        Beschreibung
        <textarea
          required
          maxLength={2000}
          className="input mt-2 min-h-24"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Menge, Maße, Abholung/Übergabe …"
        />
      </label>
      <div className="md:col-span-2 flex items-center gap-4">
        <button className="btn-primary" type="submit" disabled={create.isPending}>
          {create.isPending ? 'Wird veröffentlicht …' : 'Veröffentlichen'}
        </button>
        {create.isError ? (
          <p role="alert" className="text-sm text-error">
            {create.error.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function ListingCard({
  listing,
  currentUserId,
}: {
  listing: MarketplaceListingWithOwner;
  currentUserId: string | undefined;
}) {
  const inquiry = useCreateMarketplaceInquiry();
  const status = useSetMarketplaceListingStatus();
  const [message, setMessage] = useState('Hallo, ist der Artikel noch verfügbar?');
  const [contactOpen, setContactOpen] = useState(false);
  const isOwn = listing.owner_id === currentUserId;
  return (
    <article className="card p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container">
          {MARKETPLACE_KIND_LABELS[listing.kind]}
        </span>
        <span className="text-xs font-bold text-on-surface-variant">{listing.category}</span>
      </div>
      <h2 className="mt-4 text-xl font-extrabold">{listing.title}</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-on-surface-variant">
        {listing.description}
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-on-surface-variant">
        {listing.condition ? (
          <span className="rounded-lg bg-surface-container px-3 py-2">
            Zustand: {listing.condition}
          </span>
        ) : null}
        {listing.location_area ? (
          <span className="rounded-lg bg-surface-container px-3 py-2">
            📍 {listing.location_area}
          </span>
        ) : null}
        {listing.price_eur_cents !== null ? (
          <span className="rounded-lg bg-primary-fixed px-3 py-2 text-on-primary-fixed-variant">
            {(listing.price_eur_cents / 100).toLocaleString('de-DE', {
              style: 'currency',
              currency: 'EUR',
            })}
          </span>
        ) : null}
      </div>
      {listing.exchange_for ? (
        <p className="mt-3 text-sm font-bold text-secondary">
          Gesucht zum Tausch: {listing.exchange_for}
        </p>
      ) : null}
      <p className="mt-5 text-xs text-on-surface-variant">
        Angeboten von {listing.owner?.display_name ?? 'Mitglied'} ·{' '}
        {new Date(listing.created_at).toLocaleDateString('de-DE')}
      </p>
      {isOwn ? (
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={status.isPending}
            onClick={() => status.mutate({ listingId: listing.id, status: 'completed' })}
          >
            Erledigt
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={status.isPending}
            onClick={() => status.mutate({ listingId: listing.id, status: 'withdrawn' })}
          >
            Zurückziehen
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            className="btn-primary mt-5 w-full"
            onClick={() => setContactOpen((open) => !open)}
          >
            Interesse senden
          </button>
          {contactOpen ? (
            <div className="mt-3">
              <textarea
                className="input min-h-20"
                maxLength={1000}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                aria-label="Nachricht an Anbieter:in"
              />
              <button
                type="button"
                className="btn-secondary mt-2 w-full"
                disabled={inquiry.isPending}
                onClick={() => inquiry.mutate({ listingId: listing.id, message })}
              >
                {inquiry.isPending ? 'Wird gesendet …' : 'Nachricht geschützt senden'}
              </button>
              {inquiry.isSuccess ? (
                <p className="mt-2 text-sm font-bold text-secondary">Nachricht gesendet.</p>
              ) : null}
              {inquiry.isError ? (
                <p role="alert" className="mt-2 text-sm text-error">
                  {inquiry.error.message}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </article>
  );
}

export default function MarketplacePage() {
  const user = useCurrentUser();
  const [kind, setKind] = useState<MarketplaceListingKind | undefined>();
  const [category, setCategory] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const listings = useMarketplaceListings({
    ...(kind ? { kind } : {}),
    ...(category ? { category } : {}),
    ...(search ? { search } : {}),
  });
  return (
    <main className="min-h-screen bg-surface">
      <WebHeader backHref="/" backLabel="Dashboard" />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-secondary">
          Nachbarschaft
        </p>
        <h1 className="mt-2 text-4xl font-extrabold">Tauschbörse für Tierbedarf</h1>
        <p className="mt-3 max-w-2xl text-lg text-on-surface-variant">
          Futter, Zubehör und Utensilien verschenken, tauschen, verkaufen oder in der Nachbarschaft
          suchen.
        </p>
        <button
          type="button"
          className="btn-primary mt-6"
          onClick={() => setShowCreate((open) => !open)}
        >
          {showCreate ? 'Formular schließen' : 'Angebot oder Gesuch einstellen'}
        </button>
        {showCreate ? <CreateListingForm onCreated={() => setShowCreate(false)} /> : null}
        <div className="mt-8 grid gap-3 rounded-2xl bg-surface-container-low p-4 md:grid-cols-[1fr_auto_auto]">
          <input
            className="input"
            placeholder="Tiere, Futter, Transportbox …"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="input"
            value={kind ?? ''}
            onChange={(event) =>
              setKind((event.target.value || undefined) as MarketplaceListingKind | undefined)
            }
          >
            <option value="">Alle Angebote</option>
            {KINDS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={category ?? ''}
            onChange={(event) => setCategory(event.target.value || undefined)}
          >
            <option value="">Alle Kategorien</option>
            {MARKETPLACE_CATEGORIES.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
        {listings.isPending ? (
          <p className="py-12 text-center text-on-surface-variant">Angebote werden geladen …</p>
        ) : listings.isError ? (
          <p
            role="alert"
            className="mt-6 rounded-xl bg-error-container p-4 text-on-error-container"
          >
            Börse konnte nicht geladen werden: {listings.error.message}
          </p>
        ) : listings.data?.length ? (
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {listings.data.map((listing) => (
              <ListingCard key={listing.id} listing={listing} currentUserId={user.data?.id} />
            ))}
          </div>
        ) : (
          <section className="card mt-6 p-12 text-center">
            <p className="text-5xl">🐾</p>
            <h2 className="mt-4 text-2xl font-extrabold">Noch keine passenden Einträge</h2>
            <p className="mt-2 text-on-surface-variant">
              Sei die erste Person und stelle etwas für die Nachbarschaft ein.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
