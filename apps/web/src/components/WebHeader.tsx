'use client';

import { useOwnProfile } from '@pfotennetz/supabase';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function WebHeader({
  backHref,
  backLabel = 'Dashboard',
  rightContent,
}: {
  backHref?: string;
  backLabel?: string;
  rightContent?: ReactNode;
}) {
  const profile = useOwnProfile();
  return (
    <header className="border-b border-outline-variant/30 bg-surface-container-lowest">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label="PfotenNetz Startseite">
            <Image
              src="/pfotennetz-logo.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl object-cover"
              priority
            />
            <span className="text-xl font-extrabold text-on-surface">PfotenNetz</span>
          </Link>
          <div className="flex items-center gap-4">
            {profile.data?.role === 'admin' ? (
              <Link href="/hazard/moderation" className="text-sm font-bold text-primary">
                Administration
              </Link>
            ) : null}
            {rightContent}
          </div>
        </div>
        {backHref ? (
          <div className="pb-3">
            <Link
              href={backHref}
              className="inline-flex min-h-10 items-center text-sm font-bold text-primary"
            >
              ← {backLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}
