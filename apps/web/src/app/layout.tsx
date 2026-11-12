import type { Metadata } from 'next';
import { DocumentTitle } from '../components/DocumentTitle';
import { OnboardingWizardHost } from '../components/OnboardingWizard';
import { Providers } from '../providers/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'PfotenNetz',
  description: 'Nachbarschafts-Plattform für Haustierbetreuung',
  icons: {
    icon: '/pfotennetz-logo.png',
    shortcut: '/pfotennetz-logo.png',
    apple: '/pfotennetz-logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-surface text-on-surface antialiased">
        <a href="#main-content" className="skip-link">
          Zum Inhalt springen
        </a>
        <Providers>
          <DocumentTitle />
          {children}
          <OnboardingWizardHost />
        </Providers>
      </body>
    </html>
  );
}
