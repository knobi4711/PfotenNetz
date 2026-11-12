'use client';

import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Rendert Kinder direkt unter `document.body`, damit modale Dialoge nicht in
 * ihrem Seiten-Container gefangen sind und der Hintergrund per `inert`
 * ausgeblendet werden kann.
 *
 * Der Host wird synchron ermittelt: So sind die Dialog-Refs bereits beim ersten
 * Commit gesetzt, und der Fokus-Hook findet das Panel zuverlässig.
 */
export function Portal({ children }: { children: ReactNode }) {
  const [host] = useState<HTMLElement | null>(() =>
    typeof document === 'undefined' ? null : document.body
  );

  if (host === null) return null;
  return createPortal(children, host);
}
