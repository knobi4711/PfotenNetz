'use client';

import {
  HAZARD_SEVERITY_LABELS,
  HAZARD_STATUS_LABELS,
  HAZARD_TYPE_LABELS,
  useModerateHazard,
  useModerationHazards,
  useOwnProfile,
} from '@pfotennetz/supabase';
import { useState } from 'react';
import { WebHeader } from '../../../components/WebHeader';

export default function HazardModerationPage() {
  const profile = useOwnProfile();
  const query = useModerationHazards();
  const moderate = useModerateHazard();
  const [notes, setNotes] = useState<Record<string, string>>({});

  if (profile.isPending) {
    return (
      <main className="min-h-screen bg-surface p-10 text-center">Berechtigung wird geprüft …</main>
    );
  }
  if (profile.data?.role !== 'admin') {
    return (
      <main className="min-h-screen bg-surface">
        <WebHeader backHref="/hazard/radar" backLabel="Gefahrenradar" />
        <p
          role="alert"
          className="mx-auto mt-12 max-w-2xl rounded-xl bg-error-container p-5 text-on-error-container"
        >
          Diese Ansicht ist nur für Administrator:innen verfügbar.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface">
      <WebHeader backHref="/hazard/radar" backLabel="Gefahrenradar" />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-error">Moderation</p>
        <h1 className="mt-2 text-4xl font-extrabold text-on-surface">Gefahrenmeldungen prüfen</h1>
        <p className="mt-3 text-on-surface-variant">
          Offene Meldungen freigeben, ablehnen oder aktive Warnungen entwarnen.
        </p>
        {query.isPending ? (
          <p className="py-12 text-center text-on-surface-variant">Meldungen werden geladen …</p>
        ) : query.isError ? (
          <p
            role="alert"
            className="mt-8 rounded-xl bg-error-container p-4 text-on-error-container"
          >
            Meldungen konnten nicht geladen werden: {query.error.message}
          </p>
        ) : query.data?.length ? (
          <div className="mt-8 space-y-5">
            {query.data.map((hazard) => (
              <article key={hazard.id} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-extrabold text-on-surface">
                      {HAZARD_TYPE_LABELS[hazard.type]}
                    </h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {hazard.hazard_number} · {HAZARD_SEVERITY_LABELS[hazard.severity]} ·{' '}
                      {HAZARD_STATUS_LABELS[hazard.status]}
                    </p>
                  </div>
                  <time className="text-sm text-on-surface-variant">
                    {new Date(hazard.created_at).toLocaleString('de-DE')}
                  </time>
                </div>
                {hazard.address ? <p className="mt-4 font-semibold">{hazard.address}</p> : null}
                {hazard.description ? <p className="mt-2">{hazard.description}</p> : null}
                <label className="mt-5 block text-sm font-bold" htmlFor={`notes-${hazard.id}`}>
                  Moderationsnotiz (optional)
                </label>
                <textarea
                  id={`notes-${hazard.id}`}
                  value={notes[hazard.id] ?? ''}
                  onChange={(event) =>
                    setNotes((current) => ({ ...current, [hazard.id]: event.target.value }))
                  }
                  className="input mt-2 min-h-24 py-3"
                />
                <div className="mt-5 flex flex-wrap gap-3">
                  {hazard.status === 'pending_review' ? (
                    <>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={moderate.isPending}
                        onClick={() =>
                          moderate.mutate({
                            hazardId: hazard.id,
                            status: 'active',
                            resolutionNotes: notes[hazard.id]?.trim() || null,
                          })
                        }
                      >
                        Freigeben
                      </button>
                      <button
                        type="button"
                        className="btn-emergency"
                        disabled={moderate.isPending}
                        onClick={() =>
                          moderate.mutate({
                            hazardId: hazard.id,
                            status: 'rejected',
                            resolutionNotes: notes[hazard.id]?.trim() || null,
                          })
                        }
                      >
                        Ablehnen
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={moderate.isPending}
                      onClick={() =>
                        moderate.mutate({
                          hazardId: hazard.id,
                          status: 'resolved',
                          resolutionNotes: notes[hazard.id]?.trim() || null,
                        })
                      }
                    >
                      Als entwarnt markieren
                    </button>
                  )}
                </div>
                {moderate.isError ? (
                  <p role="alert" className="mt-4 text-sm font-semibold text-error">
                    Status konnte nicht geändert werden: {moderate.error.message}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="card mt-8 p-8 text-center text-on-surface-variant">
            Keine offenen oder aktiven Meldungen vorhanden.
          </div>
        )}
      </div>
    </main>
  );
}
