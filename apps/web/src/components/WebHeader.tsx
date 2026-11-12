'use client';

import { signOut, useOwnProfile, useTimebankAccount } from '@pfotennetz/supabase';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { NotificationBell } from './NotificationBell';

/**
 * H-05: Die bisherigen `role="menu"`-Container versprachen eine
 * Pfeiltasten-Navigation, die nie implementiert war. Für Navigationslinks ist
 * das Disclosure-Muster ohnehin passender: Tab erreicht alle Einträge, Escape
 * schließt und gibt den Fokus an den Auslöser zurück.
 */
function NavDropdown({
  label,
  active,
  open,
  onToggle,
  onClose,
  align = 'left',
  children,
}: {
  label: string;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  align?: 'left' | 'right';
  children: ReactNode;
}) {
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      closeRef.current();
      buttonRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && containerRef.current?.contains(event.target) === true) {
        return;
      }
      closeRef.current();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className={`rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap ${active ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'text-on-surface-variant hover:bg-surface-container'}`}
      >
        {label}
      </button>
      {open ? (
        <div
          id={panelId}
          className={`absolute top-full z-20 mt-2 min-w-56 rounded-2xl border border-outline-variant/40 bg-surface p-2 shadow-[var(--shadow-level-2)] ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

const dropdownLinkClass = (isCurrent: boolean) =>
  `block rounded-xl px-4 py-3 text-sm text-on-surface hover:bg-surface-container ${
    isCurrent ? 'font-extrabold underline underline-offset-4' : 'font-semibold'
  }`;

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
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigation = [
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
          <Link
            href="/"
            className="flex shrink-0 items-center gap-3 whitespace-nowrap"
            aria-label="PfotenNetz Startseite"
          >
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
          <nav
            className="hidden items-center gap-1 whitespace-nowrap lg:flex"
            aria-label="Hauptnavigation"
          >
            {navigation.map(([label, href]) => {
              const active =
                label === 'Community'
                  ? pathname.startsWith('/community') || pathname.startsWith('/marketplace')
                  : label === 'Mein Profil'
                    ? pathname.startsWith('/profile') || pathname.startsWith('/pets')
                    : pathname.startsWith(href);
              if (label === 'Community') {
                return (
                  <NavDropdown
                    key={href}
                    label="Community"
                    active={active}
                    open={communityOpen}
                    onToggle={() => {
                      setCommunityOpen((open) => !open);
                      setProfileOpen(false);
                    }}
                    onClose={() => setCommunityOpen(false)}
                  >
                    <Link
                      href="/community"
                      aria-current={pathname.startsWith('/community') ? 'page' : undefined}
                      onClick={() => setCommunityOpen(false)}
                      className={dropdownLinkClass(pathname.startsWith('/community'))}
                    >
                      Community &amp; Treffen
                    </Link>
                    <Link
                      href="/marketplace"
                      aria-current={pathname.startsWith('/marketplace') ? 'page' : undefined}
                      onClick={() => setCommunityOpen(false)}
                      className={dropdownLinkClass(pathname.startsWith('/marketplace'))}
                    >
                      Tauschbörse für Tierbedarf
                    </Link>
                  </NavDropdown>
                );
              }
              if (label === 'Mein Profil') {
                return (
                  <NavDropdown
                    key={href}
                    label="Mein Profil"
                    active={active}
                    open={profileOpen}
                    onToggle={() => {
                      setProfileOpen((open) => !open);
                      setCommunityOpen(false);
                    }}
                    onClose={() => setProfileOpen(false)}
                    align="right"
                  >
                    <Link
                      href="/profile"
                      aria-current={pathname.startsWith('/profile') ? 'page' : undefined}
                      onClick={() => setProfileOpen(false)}
                      className={dropdownLinkClass(pathname.startsWith('/profile'))}
                    >
                      Profileinstellungen
                    </Link>
                    <Link
                      href="/pets"
                      aria-current={pathname.startsWith('/pets') ? 'page' : undefined}
                      onClick={() => setProfileOpen(false)}
                      className={dropdownLinkClass(pathname.startsWith('/pets'))}
                    >
                      Meine Tiere
                    </Link>
                  </NavDropdown>
                );
              }
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap ${active ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'text-on-surface-variant hover:bg-surface-container'}`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3 whitespace-nowrap">
            {profile.data?.role === 'admin' ? (
              <div className="flex items-center gap-2">
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
                void signOut()
                  .catch(() => undefined)
                  .finally(() => {
                    setSigningOut(false);
                    router.replace('/');
                  });
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
