/**
 * Dekorative Scherenschnitt-Landschaft am unteren Rand der Seite: Sonne,
 * Berge, Wald und die Figuren aus dem PfotenNetz-Video (Gassi-Runde,
 * Fütterung, Katze, Hund, Vogel, Schildkröte).
 *
 * Die Illustration liegt als statisches SVG unter `/footer-scenery.svg` und
 * wird als Hintergrundbild eingebunden. Dadurch entstehen keine zusätzlichen
 * DOM-Knoten, das Bild wird vom Browser gecacht und bleibt bei jeder
 * Bildschirmbreite scharf. Der Himmel ist transparent, damit die Szene mit
 * jeder `surface`-Farbe verschmilzt.
 *
 * Die Szene selbst entsteht in `scripts/generate-footer-scenery.mjs`
 * (node scripts/generate-footer-scenery.mjs) – dort werden Figuren, Wald und
 * Bergsilhouetten gepflegt.
 */
export function FooterScenery({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none h-[clamp(180px,21vw,460px)] w-full bg-bottom bg-no-repeat bg-cover ${className}`}
      style={{ backgroundImage: "url('/footer-scenery.svg')" }}
    />
  );
}
