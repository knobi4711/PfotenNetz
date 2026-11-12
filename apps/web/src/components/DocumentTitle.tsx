'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { formatDocumentTitle } from '../lib/page-titles';

/**
 * R-01: Setzt für jede Route einen eindeutigen Browser-/Screenreader-Titel.
 * Muss einmal im Root-Layout gerendert werden.
 */
export function DocumentTitle() {
  const pathname = usePathname();

  useEffect(() => {
    document.title = formatDocumentTitle(pathname);
  }, [pathname]);

  return null;
}
