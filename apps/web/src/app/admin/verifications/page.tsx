'use client';

import {
  useAdminHelperVerifications,
  useOwnProfile,
  useReviewHelperVerification,
} from '@pfotennetz/supabase';
import { useState } from 'react';
import { WebHeader } from '../../../components/WebHeader';

const TYPE_LABELS = {
  id_document: 'Ausweis',
  liability_insurance: 'Haftpflichtversicherung',
} as const;

export default function HelperVerificationAdminPage() {
  const profile = useOwnProfile();
  const query = useAdminHelperVerifications();
  const review = useReviewHelperVerification();
  const [reasons, setReasons] = useState<Record<string, string>>({});

  if (profile.isPending)
    return (
      <main className="min-h-screen bg-surface p-10 text-center">Berechtigung wird geprüft …</main>
    );
  if (profile.data?.role !== 'admin') {
    return (
      <main className="min-h-screen bg-surface">
        <WebHeader backHref="/" backLabel="Dashboard" />
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
      <WebHeader backHref="/" backLabel="Dashboard" />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Administration</p>
        <h1 className="mt-2 text-4xl font-extrabold text-on-surface">Helper-Anfragen</h1>
        <p className="mt-3 text-on-surface-variant">
          Ausweis und Haftpflichtversicherung prüfen. Nach beiden Freigaben wird der Account als
          Helper aktiviert.
        </p>
        {query.isPending ? (
          <p className="py-12 text-center text-on-surface-variant">Anfragen werden geladen …</p>
        ) : null}
        {query.isError ? (
          <p
            role="alert"
            className="mt-8 rounded-xl bg-error-container p-4 text-on-error-container"
          >
            Anfragen konnten nicht geladen werden: {query.error.message}
          </p>
        ) : null}
        {!query.isPending && !query.isError && !query.data?.length ? (
          <div className="card mt-8 p-8 text-center text-on-surface-variant">
            Keine offenen Helper-Anfragen vorhanden.
          </div>
        ) : null}
        <div className="mt-8 space-y-5">
          {query.data?.map((request) => (
            <article key={request.verification_id} className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-on-surface">{request.display_name}</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">{request.email}</p>
                </div>
                <time className="text-sm text-on-surface-variant">
                  {new Date(request.created_at).toLocaleDateString('de-DE')}
                </time>
              </div>
              <p className="mt-4 font-semibold">
                {TYPE_LABELS[request.verification_type as keyof typeof TYPE_LABELS] ??
                  request.verification_type}
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">
                {request.storage_paths.length} Dokument(e) hochgeladen
              </p>
              <label
                className="mt-5 block text-sm font-bold"
                htmlFor={`reason-${request.verification_id}`}
              >
                Ablehnungsgrund (optional)
              </label>
              <textarea
                id={`reason-${request.verification_id}`}
                value={reasons[request.verification_id] ?? ''}
                onChange={(event) =>
                  setReasons((current) => ({
                    ...current,
                    [request.verification_id]: event.target.value,
                  }))
                }
                className="input mt-2 min-h-24 py-3"
              />
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={review.isPending}
                  onClick={() =>
                    review.mutate({ verificationId: request.verification_id, status: 'approved' })
                  }
                >
                  Freigeben
                </button>
                <button
                  type="button"
                  className="btn-emergency"
                  disabled={review.isPending}
                  onClick={() =>
                    review.mutate({
                      verificationId: request.verification_id,
                      status: 'rejected',
                      rejectionReason: reasons[request.verification_id]?.trim() || null,
                    })
                  }
                >
                  Ablehnen
                </button>
              </div>
              {review.isError ? (
                <p role="alert" className="mt-4 text-sm font-semibold text-error">
                  Anfrage konnte nicht verarbeitet werden: {review.error.message}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
