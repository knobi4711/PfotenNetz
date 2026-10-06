'use client';

import {
  USER_REPORT_REASON_LABELS,
  useOwnProfile,
  useUpdateUserReportStatus,
  useUserReportModeration,
} from '@pfotennetz/supabase';
import { WebHeader } from '../../../components/WebHeader';

const STATUS_LABELS = {
  pending: 'Offen',
  reviewed: 'Geprüft',
  dismissed: 'Verworfen',
  actioned: 'Maßnahme ergriffen',
} as const;

export default function UserReportsAdminPage() {
  const profile = useOwnProfile();
  const reports = useUserReportModeration();
  const update = useUpdateUserReportStatus();

  if (profile.isPending)
    return <main className="min-h-screen bg-surface p-10">Berechtigung wird geprüft …</main>;
  if (profile.data?.role !== 'admin') {
    return (
      <main className="min-h-screen bg-surface">
        <WebHeader backHref="/" backLabel="Dashboard" />
        <p className="mx-auto mt-12 max-w-2xl rounded-xl bg-error-container p-5 text-on-error-container">
          Diese Ansicht ist nur für Administrator:innen verfügbar.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface">
      <WebHeader backHref="/" backLabel="Dashboard" />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-error">Administration</p>
        <h1 className="mt-2 text-4xl font-extrabold">Nutzer:innen-Meldungen</h1>
        <p className="mt-3 text-on-surface-variant">
          Prüfe gemeldete Fake-, Spam- und sonstige Nutzerprofile.
        </p>
        {reports.isPending ? <p className="mt-8">Meldungen werden geladen …</p> : null}
        {reports.isError ? (
          <p
            role="alert"
            className="mt-8 rounded-xl bg-error-container p-4 text-on-error-container"
          >
            Meldungen konnten nicht geladen werden: {reports.error.message}
          </p>
        ) : null}
        {!reports.isPending && !reports.isError && !reports.data?.length ? (
          <section className="card mt-8 p-8 text-center text-on-surface-variant">
            Keine Meldungen vorhanden.
          </section>
        ) : null}
        <div className="mt-8 space-y-5">
          {reports.data?.map((report) => (
            <article key={report.id} className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold">{report.reported_user_name}</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Gemeldet von {report.reporter_name}
                  </p>
                </div>
                <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold">
                  {STATUS_LABELS[report.status]}
                </span>
              </div>
              <p className="mt-4 font-bold">{USER_REPORT_REASON_LABELS[report.reason]}</p>
              {report.details ? (
                <p className="mt-2 whitespace-pre-wrap text-on-surface-variant">{report.details}</p>
              ) : null}
              <p className="mt-3 text-xs text-on-surface-variant">
                {new Date(report.created_at).toLocaleString('de-DE')}
              </p>
              {report.status === 'pending' ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ reportId: report.id, status: 'dismissed' })}
                  >
                    Verwerfen
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ reportId: report.id, status: 'reviewed' })}
                  >
                    Als geprüft markieren
                  </button>
                  <button
                    type="button"
                    className="btn-emergency"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ reportId: report.id, status: 'actioned' })}
                  >
                    Maßnahme ergriffen
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
