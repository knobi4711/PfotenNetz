import { PasskeyPanel } from '../components/PasskeyPanel';
import { Providers } from '../providers/Providers';

export default function HomePage() {
  return (
    <Providers>
      <main className="min-h-screen bg-surface flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="text-center">
            <h1 className="text-headline-xl-mobile font-headline-xl-mobile text-on-surface mb-4">
              PfotenNetz
            </h1>
            <p className="text-body-lg text-on-surface-variant mb-8">
              Nachbarschafts-Plattform für Haustierbetreuung
            </p>
          </div>
          <PasskeyPanel />
        </div>
      </main>
    </Providers>
  );
}
