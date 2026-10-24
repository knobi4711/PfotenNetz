import Link from 'next/link';

export default function ChildSafetyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-on-surface">
      <Link href="/" className="font-bold text-primary">
        ← PfotenNetz
      </Link>
      <h1 className="mt-8 text-4xl font-extrabold">Kinderschutzstandards</h1>
      <p className="mt-4 rounded-xl bg-error-container p-4 text-sm text-on-error-container">
        Dieser Abschnitt beschreibt die verpflichtenden Standards von PfotenNetz zum Schutz von
        Kindern und Jugendlichen vor sexuellem Missbrauch und sexueller Ausbeutung. Die Inhalte sind
        ein technischer Entwurf und müssen vor Veröffentlichung rechtlich geprüft und durch die
        verantwortliche Stelle freigegeben werden.
      </p>
      <section className="mt-8 space-y-6 leading-7">
        <h2 className="text-2xl font-extrabold">Null-Toleranz-Politik</h2>
        <p>
          PfotenNetz duldet keinerlei Inhalte, die den sexuellen Missbrauch oder die sexuelle
          Ausbeutung von Kindern darstellen, beschreiben, fördern oder verharmlosen. Dies umfasst
          insbesondere Kindesmissbrauchsmaterial (CSAM), grooming und die sexuelleisierung von
          Minderjährigen.
        </p>
        <p>
          Verstöße führen zur sofortigen, dauerhaften Sperrung des betreffenden Kontos und zur
          Meldung an die zuständigen Behörden sowie an die einschlägigen Meldestellen.
        </p>

        <h2 className="text-2xl font-extrabold">Melde- und Meldepflicht</h2>
        <p>
          Jede:r Nutzer:in kann Inhalte und Profile über die integrierte Meldefunktion melden.
          Meldungen mit dem Verdacht auf Kindesmissbrauch oder sexuelle Ausbeutung werden mit
          höchster Priorität bearbeitet und unverzüglich an die zuständigen Stellen weitergeleitet.
        </p>

        <h2 className="text-2xl font-extrabold">Prävention und Moderation</h2>
        <p>
          Öffentliche Inhalte, Profiltexte, Chat-Nachrichten und hochgeladene Medien werden
          moderiert. Inhalte, die gegen die Kinderschutzstandards verstoßen, werden entfernt und
          die betreffenden Konten gesperrt.
        </p>

        <h2 className="text-2xl font-extrabold">Alter und Verifizierung</h2>
        <p>
          Die Nutzung von PfotenNetz ist nur Personen ab 18 Jahren gestattet. Bei der Registrierung
          ist das Mindestalter zu bestätigen. Bei begründetem Verdacht auf ein Alter unter 18
          Jahren wird das Konto gesperrt, bis eine Altersverifikation erfolgt ist.
        </p>

        <h2 className="text-2xl font-extrabold">Zusammenarbeit mit Behörden</h2>
        <p>
          PfotenNetz kooperiert mit Strafverfolgungsbehörden, Kinderschutzorganisationen und
          Meldestellen. Bei strafrechtlich relevanten Inhalten werden erforderliche Daten und
          Nachweise bereitgestellt, soweit dies gesetzlich zulässig und erforderlich ist.
        </p>

        <h2 className="text-2xl font-extrabold">Kontakt</h2>
        <p>
          Verdachtsfälle und Hinweise können über die Meldefunktion in der App oder per E-Mail an
          die verantwortliche Stelle gemeldet werden. Die Kontaktdaten werden im Impressum
          veröffentlicht.
        </p>
      </section>
    </main>
  );
}
