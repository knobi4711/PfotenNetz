import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-on-surface">
      <Link href="/" className="font-bold text-primary">
        ← PfotenNetz
      </Link>
      <h1 className="mt-8 text-4xl font-extrabold">Datenschutzhinweise</h1>
      <p className="mt-4 rounded-xl bg-warning-container p-4 text-sm">
        Technischer Entwurf – Verantwortliche Stelle, Rechtsgrundlagen, Aufbewahrungsfristen und
        Betroffenenrechte müssen vor Veröffentlichung ergänzt und rechtlich geprüft werden.
      </p>
      <section className="mt-8 space-y-6 leading-7">
        <h2 className="text-2xl font-extrabold">Verarbeitete Daten</h2>
        <p>
          Wir verarbeiten Kontodaten, Tierprofile, Betreuungsanfragen, Nachrichten,
          Verifizierungsstatus und – nur mit Freigabe – gerundete Standortdaten. Exakte Wohnadressen
          werden nicht öffentlich angezeigt.
        </p>
        <h2 className="text-2xl font-extrabold">Geschützter Erstkontakt</h2>
        <p>
          Der Erstkontakt soll über den integrierten Chat erfolgen. Telefonnummern und private
          Adressen werden nicht automatisch im öffentlichen Profil veröffentlicht.
        </p>
        <h2 className="text-2xl font-extrabold">Löschung</h2>
        <p>
          Daten werden nach dem dokumentierten Aufbewahrungskonzept gelöscht oder anonymisiert. Die
          produktiven Löschjobs und die abschließende rechtliche Prüfung sind vor dem Livebetrieb
          einzurichten.
        </p>
        <h2 className="text-2xl font-extrabold">Kontakt</h2>
        <p>
          Die Kontaktdaten der verantwortlichen Stelle werden vor Veröffentlichung im Impressum
          ergänzt.
        </p>
      </section>
    </main>
  );
}
