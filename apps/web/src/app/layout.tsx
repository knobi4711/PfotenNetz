import type { Metadata } from 'next';
import { Providers } from '../providers/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'PfotenNetz',
  description: 'Nachbarschafts-Plattform für Haustierbetreuung',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-surface text-on-surface antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
