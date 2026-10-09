'use client';

import { signOut, useOwnProfile, useTimebankAccount } from '@pfotennetz/supabase';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { NotificationBell } from './NotificationBell';

export function WebHeader({
  backHref,
  backLabel,
  rightContent,
}: {
  backHref?: string;
  backLabel?: string;
  rightContent?: ReactNode;
}) {
  const profile = useOwnProfile();
  const account = useTimebankAccount();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigation = [
    ['Dashboard', '/'],
    ['Nachbarschaftskarte', '/explore'],
    ['Gefahrenradar', '/hazard/radar'],
    ['Betreuung & Tracking', '/tracking'],
    ['Community', '/community'],
    ['Mein Profil', '/profile'],
  ] as const;
  return (
    <header className="sticky top-0 z-10 border-b border-outline-variant/30 bg-surface/95 backdrop-blur">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="flex min-h-20 items-center justify-between gap-6 py-4">
          <Link href="/" className="flex items-center gap-3" aria-label="PfotenNetz Startseite">
            <Image
              src="/pfotennetz-logo.png"
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 rounded-xl object-cover"
              priority
            />
            <span className="text-xl font-extrabold text-on-surface">PfotenNetz</span>
          </Link>
          {backHref ? (
            <Link
              href={backHref}
              className="ml-6 hidden shrink-0 whitespace-nowrap text-sm font-bold text-primary sm:block lg:hidden"
            >
              ← {backLabel ?? 'Zurück'}
            </Link>
          ) : null}
          <nav className="hidden items-center gap-2 lg:flex" aria-label="Hauptnavigation">
            {navigation.map(([label, href]) => {
              const active =
                label === 'Community'
                  ? pathname.startsWith('/community') || pathname.startsWith('/marketplace')
                  : label === 'Mein Profil'
                    ? pathname.startsWith('/profile') || pathname.startsWith('/pets')
                    : href === '/'
                      ? pathname === '/'
                      : pathname.startsWith(href);
              if (label === 'Community') {
                return (
                  <div key={href} className="relative">
                    <button
                      type="button"
                      aria-expanded={communityOpen}
                      aria-haspopup="menu"
                      onClick={() => setCommunityOpen((open) => !open)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${active ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'text-on-surface-variant hover:bg-surface-container'}`}
                    >
                      Community <span aria-hidden="true">⌄</span>
                    </button>
                    {communityOpen ? (
                      <div
                        role="menu"
                        className="absolute left-0 top-full z-20 mt-2 min-w-56 rounded-2xl border border-outline-variant/40 bg-surface p-2 shadow-[var(--shadow-level-2)]"
                      >
                        <Link
                          href="/community"
                          role="menuitem"
                          onClick={() => setCommunityOpen(false)}
                          className="block rounded-xl px-4 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container"
                        >
                          Community &amp; Treffen
                        </Link>
                        <Link
                          href="/marketplace"
                          role="menuitem"
                          onClick={() => setCommunityOpen(false)}
                          className="block rounded-xl px-4 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container"
                        >
                          Tauschbörse für Tierbedarf
                        </Link>
                      </div>
                    ) : null}
                  </div>
                );
              }
              if (label === 'Mein Profil') {
                return (
                  <div key={href} className="relative">
                    <button
                      type="button"
                      aria-expanded={profileOpen}
                      aria-haspopup="menu"
                      onClick={() => setProfileOpen((open) => !open)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${active ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'text-on-surface-variant hover:bg-surface-container'}`}
                    >
                      Mein Profil <span aria-hidden="true">⌄</span>
                    </button>
                    {profileOpen ? (
                      <div
                        role="menu"
                        className="absolute right-0 top-full z-20 mt-2 min-w-56 rounded-2xl border border-outline-variant/40 bg-surface p-2 shadow-[var(--shadow-level-2)]"
                      >
                        <Link
                          href="/profile"
                          role="menuitem"
                          onClick={() => setProfileOpen(false)}
                          className="block rounded-xl px-4 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container"
                        >
                          Profileinstellungen
                        </Link>
                        <Link
                          href="/pets"
                          role="menuitem"
                          onClick={() => setProfileOpen(false)}
                          className="block rounded-xl px-4 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container"
                        >
                          Meine Tiere
                        </Link>
                      </div>
                    ) : null}
                  </div>
                );
              }
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${active ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'text-on-surface-variant hover:bg-surface-container'}`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-4">
            {profile.data?.role === 'admin' ? (
              <div className="flex items-center gap-3">
                <Link href="/admin/verifications" className="text-sm font-bold text-primary">
                  Administration
                </Link>
                <Link href="/admin/reports" className="text-sm font-bold text-error">
                  Meldungen
                </Link>
              </div>
            ) : null}
            <span className="hidden rounded-full bg-secondary-container px-4 py-2 text-sm font-bold text-on-secondary-container md:inline-flex">
              {Number(account.data?.balance_hours ?? 0).toLocaleString('de-DE')} Std. Zeitbank
            </span>
            <NotificationBell />
            <button
              type="button"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true);
                void signOut().finally(() => setSigningOut(false));
              }}
              className="rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container disabled:opacity-50"
            >
              Abmelden
            </button>
            {rightContent}
          </div>
        </div>
      </div>
    </header>
  );
}
