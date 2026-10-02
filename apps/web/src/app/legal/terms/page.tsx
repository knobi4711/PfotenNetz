import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-on-surface">
      <Link href="/" className="font-bold text-primary">
        ← PfotenNetz
      </Link>
      <h1 className="mt-8 text-4xl font-extrabold">Nutzungsbedingungen</h1>
      <p className="mt-4 rounded-xl bg-warning-container p-4 text-sm">
        Technischer Entwurf – vor dem produktiven Einsatz rechtlich prüfen und mit Betreiberangaben
        ergänzen.
      </p>
      <section className="mt-8 space-y-6 leading-7">
        <h2 className="text-2xl font-extrabold">1. Vermittlungsplattform</h2>
        <p>
          PfotenNetz vermittelt Kontakte zwischen Tierhalter:innen und Helfer:innen in Bad
          Gandersheim und den Ortsteilen. PfotenNetz übernimmt weder die Betreuung noch die
          Beaufsichtigung von Tieren und ist nicht Vertragspartei der privaten Vereinbarung.
        </p>
        <h2 className="text-2xl font-extrabold">2. Eigenverantwortung und Kennenlernen</h2>
        <p>
          Vor jeder ersten Betreuung müssen sich die Beteiligten persönlich kennenlernen und ein
          Probetreffen vereinbaren. Angaben, Verfügbarkeit, Preise und Eignung sind eigenständig zu
          prüfen.
        </p>
        <h2 className="text-2xl font-extrabold">3. Haftung und Versicherung</h2>
        <p>
          Die Plattform kann die Richtigkeit von Profilen, die Eignung einer Betreuungsperson oder
          den Betreuungserfolg nicht garantieren. Nutzer:innen müssen ihren eigenen Haftpflicht- und
          Tierhalterhaftpflichtschutz einschließlich Fremdhütung prüfen. Eine Haftungsbegrenzung ist
          erst nach rechtlicher Prüfung verbindlich.
        </p>
        <h2 className="text-2xl font-extrabold">4. Vergütung</h2>
        <p>
          Vorrangig ist unentgeltliche Gegenseitigkeit über die Nachbarschafts-Stunden vorgesehen.
          Geldzahlungen dürfen nur im Rahmen der geltenden steuer-, sozial- und gewerberechtlichen
          Vorschriften vereinbart werden. Nutzer:innen sind selbst für Meldungen und Abgaben
          verantwortlich.
        </p>
        <h2 className="text-2xl font-extrabold">5. Meldungen und Moderation</h2>
        <p>
          Gefahren, Missbrauch und falsche Angaben können gemeldet werden. PfotenNetz darf Inhalte
          bei Verstößen sperren oder entfernen; eine dauerhafte Verfügbarkeit wird nicht
          zugesichert.
        </p>
      </section>
    </main>
  );
}
