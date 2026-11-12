import { describe, expect, it } from 'vitest';
import { colors } from './colors';

/**
 * Kontrast-Regressionstest für die zentralen Farbtokens.
 *
 * WCAG 2.2 AA (1.4.3) verlangt 4,5:1 für normalen Text. Die hier geprüften
 * Paare sind die Kombinationen, die in Web und App tatsächlich als Text auf
 * der jeweiligen Fläche vorkommen. Der Test schlägt fehl, sobald ein Token
 * wieder aufgehellt wird (siehe ACCESSIBILITY_AUDIT.md, K-01/H-01/H-02).
 */

function channelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (match === null || match[1] === undefined) {
    throw new Error(`Ungültiger Hex-Farbwert: ${hex}`);
  }
  const value = match[1];
  const [r, g, b] = [0, 2, 4].map((offset) =>
    channelToLinear(Number.parseInt(value.slice(offset, offset + 2), 16))
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

const MIN_TEXT_CONTRAST = 4.5;

const pairs: Array<
  [mode: 'light' | 'dark', label: string, foreground: string, background: string]
> = [
  // Primärflächen mit weißer bzw. kontrastreicher Schrift (K-01).
  ['light', 'primary / onPrimary', colors.light.primary, colors.light.onPrimary],
  ['light', 'primaryHover / onPrimary', colors.light.primaryHover, colors.light.onPrimary],
  ['dark', 'primary / onPrimary', colors.dark.primary, colors.dark.onPrimary],
  ['light', 'secondary / onSecondary', colors.light.secondary, colors.light.onSecondary],
  ['light', 'error / onError', colors.light.error, colors.light.onError],
  ['dark', 'error / onError', colors.dark.error, colors.dark.onError],
  // Hinweis- und Platzhaltertext (H-01/H-02).
  ['light', 'warningText / surface', colors.light.warningText, colors.light.surface],
  [
    'light',
    'warningText / surfaceContainerLow',
    colors.light.warningText,
    colors.light.surfaceContainerLow,
  ],
  ['dark', 'warningText / surface', colors.dark.warningText, colors.dark.surface],
  ['light', 'placeholder / surface', colors.light.placeholder, colors.light.surface],
  [
    'light',
    'placeholder / surfaceContainerLow',
    colors.light.placeholder,
    colors.light.surfaceContainerLow,
  ],
  [
    'light',
    'placeholder / surfaceContainerLowest',
    colors.light.placeholder,
    colors.light.surfaceContainerLowest,
  ],
  ['dark', 'placeholder / surface', colors.dark.placeholder, colors.dark.surface],
  [
    'dark',
    'placeholder / surfaceContainerLow',
    colors.dark.placeholder,
    colors.dark.surfaceContainerLow,
  ],
  // Grundlegender Fließtext.
  ['light', 'onSurface / surface', colors.light.onSurface, colors.light.surface],
  ['light', 'onSurfaceVariant / surface', colors.light.onSurfaceVariant, colors.light.surface],
  ['dark', 'onSurface / surface', colors.dark.onSurface, colors.dark.surface],
  ['dark', 'onSurfaceVariant / surface', colors.dark.onSurfaceVariant, colors.dark.surface],
  // Kontrast auf gefüllten Statusflächen.
  [
    'light',
    'onTertiaryContainer / tertiaryContainer',
    colors.light.onTertiaryContainer,
    colors.light.tertiaryContainer,
  ],
  [
    'dark',
    'onTertiaryContainer / tertiaryContainer',
    colors.dark.onTertiaryContainer,
    colors.dark.tertiaryContainer,
  ],
];

describe('Farbtoken-Kontrast (WCAG AA)', () => {
  it.each(pairs)('%s: %s erreicht 4,5:1', (_mode, label, foreground, background) => {
    const ratio = contrastRatio(foreground, background);
    expect(
      ratio,
      `${label}: ${foreground} auf ${background} = ${ratio.toFixed(2)}:1`
    ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it('primärer Handlungs-Button bleibt in beiden Modi lesbar', () => {
    expect(contrastRatio(colors.light.onPrimary, colors.light.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.dark.onPrimary, colors.dark.primary)).toBeGreaterThanOrEqual(4.5);
  });
});
