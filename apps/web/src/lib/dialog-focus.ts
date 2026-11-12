'use client';

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Fokus-Management für modale Dialoge (WCAG 2.2, 2.4.3 / 2.1.2).
 *
 * - merkt sich das zuvor fokussierte Element,
 * - setzt den Fokus auf `[data-autofocus]` oder das erste fokussierbare Element,
 * - hält Tab/Shift+Tab innerhalb des Panels,
 * - schließt per Escape,
 * - gibt den Fokus beim Schließen zurück,
 * - nimmt alle übrigen Body-Kinder per `inert` aus der Tab-Reihenfolge.
 *
 * Der Dialog sollte dafür per `<Portal>` direkt unter `document.body` hängen.
 */
export function useDialogFocus(
  open: boolean,
  onClose: () => void
): RefObject<HTMLDivElement | null> {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef(onClose);
  const restoreRef = useRef<HTMLElement | null>(null);

  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (panel === null) return;

    restoreRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusables = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => element.offsetParent !== null || element === document.activeElement
      );

    const initial =
      panel.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0] ?? panel;
    initial.focus({ preventScroll: true });

    // Alles außerhalb des Dialogs aus der Tab-Reihenfolge nehmen.
    const inerted: HTMLElement[] = [];
    for (const child of Array.from(document.body.children)) {
      if (!(child instanceof HTMLElement)) continue;
      if (child === panel || child.contains(panel)) continue;
      inerted.push(child);
      child.setAttribute('inert', '');
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      if (first === undefined || last === undefined) {
        event.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      for (const child of inerted) child.removeAttribute('inert');
      if (restoreRef.current?.isConnected === true) {
        restoreRef.current.focus({ preventScroll: true });
      }
    };
  }, [open]);

  return panelRef;
}
