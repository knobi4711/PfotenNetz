/**
 * Erzeugt die Scherenschnitt-Landschaft für den Seitenfuß:
 * `apps/web/public/footer-scenery.svg`
 *
 * Aufruf: node scripts/generate-footer-scenery.mjs
 *
 * Das Skript ist reiner Generator – die SVG-Datei ist das Ergebnis und wird von
 * `apps/web/src/components/FooterScenery.tsx` als Hintergrundbild eingebunden.
 * Neue Figuren/Waldlinien werden hier ergänzt und danach neu erzeugt.
 */
import fs from 'node:fs';

const rnd = (seed) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
};
const n = (v) => Math.round(v * 100) / 100;

function ridgePath(points, r = 7) {
  let d = `M${n(points[0][0])},${n(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const [px, py] = points[i - 1];
    const [nx, ny] = points[i + 1];
    const d1 = Math.hypot(x - px, y - py) || 1;
    const d2 = Math.hypot(nx - x, ny - y) || 1;
    const k1 = Math.min(r, d1 * 0.4) / d1;
    const k2 = Math.min(r, d2 * 0.4) / d2;
    d += ` L${n(x - (x - px) * k1)},${n(y - (y - py) * k1)}`;
    d += ` Q${n(x)},${n(y)} ${n(x + (nx - x) * k2)},${n(y + (ny - y) * k2)}`;
  }
  const last = points[points.length - 1];
  return `${d} L${n(last[0])},${n(last[1])}`;
}
const layer = (pts, r, bottom = 340) => `${ridgePath(pts, r)} L1600,${bottom} L0,${bottom} Z`;

const groundY = (x, base, amp = 1) =>
  base + amp * (2.4 * Math.sin(x / 230 + 0.4) + 1.2 * Math.sin(x / 88 + 2.1));
function groundPath(base, bottom = 340, amp = 1) {
  let d = `M0,${n(groundY(0, base, amp))}`;
  for (let x = 25; x <= 1600; x += 25) d += ` L${x},${n(groundY(x, base, amp))}`;
  return `${d} L1600,${bottom} L0,${bottom} Z`;
}

/** Offene Linie entlang der Wiesenkante (Grundlinie fuer die Figuren). */
function crestPath(base, amp = 1) {
  let d = `M0,${n(groundY(0, base, amp))}`;
  for (let x = 25; x <= 1600; x += 25) d += ` L${x},${n(groundY(x, base, amp))}`;
  return d;
}

function pine(x, baseY, h, color, seed = 0, widthK = 1) {
  const r = rnd(seed + 7);
  const tiers = 4;
  const crownH = h * 0.86;
  const top = baseY - h;
  const lean = (r() - 0.5) * h * 0.06;
  const trunkW = Math.max(1.6, h * 0.034);
  let s = `<rect x="${n(x - trunkW / 2)}" y="${n(baseY - h * 0.14)}" width="${n(trunkW)}" height="${n(h * 0.16)}" fill="${color}"/>`;
  for (let t = 0; t < tiers; t++) {
    const tierTop = top + t * crownH * 0.235 + (r() - 0.5) * h * 0.012;
    const tierBase = tierTop + crownH * 0.44;
    const half = h * (0.1 + 0.05 * t) * (0.94 + r() * 0.12) * widthK;
    const cx = x + lean * (1 - t / tiers);
    s += `<path d="M${n(cx)},${n(tierTop)} L${n(cx + half)},${n(tierBase)} L${n(cx - half)},${n(tierBase)} Z" fill="${color}"/>`;
  }
  return s;
}

function roundTree(x, baseY, h, color) {
  const tw = Math.max(2, h * 0.05);
  const cy = baseY - h * 0.68;
  const r = h * 0.32;
  return (
    `<rect x="${n(x - tw / 2)}" y="${n(baseY - h * 0.4)}" width="${n(tw)}" height="${n(h * 0.42)}" rx="${n(tw / 2)}" fill="${color}"/>` +
    `<circle cx="${n(x)}" cy="${n(cy)}" r="${n(r)}" fill="${color}"/>` +
    `<circle cx="${n(x - r * 0.7)}" cy="${n(cy + r * 0.5)}" r="${n(r * 0.7)}" fill="${color}"/>` +
    `<circle cx="${n(x + r * 0.74)}" cy="${n(cy + r * 0.44)}" r="${n(r * 0.64)}" fill="${color}"/>`
  );
}

function bush(x, y, w, color) {
  const r = w / 2;
  return (
    `<circle cx="${n(x - r * 0.55)}" cy="${n(y - r * 0.3)}" r="${n(r * 0.55)}" fill="${color}"/>` +
    `<circle cx="${n(x + r * 0.45)}" cy="${n(y - r * 0.38)}" r="${n(r * 0.62)}" fill="${color}"/>` +
    `<circle cx="${n(x)}" cy="${n(y - r * 0.62)}" r="${n(r * 0.5)}" fill="${color}"/>` +
    `<rect x="${n(x - r * 0.95)}" y="${n(y - r * 0.3)}" width="${n(r * 1.9)}" height="${n(r * 0.3)}" fill="${color}"/>`
  );
}

// ---------------------------------------------------------------------------
// characters – line art wie im Video: duenne Strokes, betonte Koepfe,
// Gesichter als Tuschepunkte. Alle Masse in Einheiten des 1600x340-Canvas.
// ---------------------------------------------------------------------------
const C = {
  ink: 'var(--scenery-ink)',
  face: 'var(--scenery-face)',
  accent: 'var(--scenery-accent)',
};
const PEN = 5.2; // Hauptstrich
const cap = (d, w = PEN, color = C.ink) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const dot = (cx, cy, r, color = C.ink) =>
  `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${color}"/>`;
const ring = (cx, cy, r, w = PEN, color = C.ink) =>
  `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="none" stroke="${color}" stroke-width="${n(w)}"/>`;

/** Lachendes Gesicht im Kopf. */
function face(cx, cy, r, eye = 2.6, smile = true) {
  const ex = r * 0.34;
  const ey = cy - r * 0.18;
  return (
    dot(cx - ex, ey, eye) +
    dot(cx + ex, ey, eye) +
    (smile
      ? cap(
          `M${n(cx - r * 0.36)},${n(cy + r * 0.16)} Q${n(cx)},${n(cy + r * 0.62)} ${n(cx + r * 0.36)},${n(cy + r * 0.16)}`,
          Math.max(2.4, r * 0.26)
        )
      : '')
  );
}

/** Gehende Person mit Tasche in der Hand. Hoehe ≈ 131. */
const walker = (x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})">
    ${cap('M0,-74 L-13,-38 L-20,-2')}
    ${cap('M0,-74 L12,-40 L17,-2')}
    ${cap('M-20,-2 L-28,-1')}
    ${cap('M17,-2 L24,-1')}
    ${cap('M0,-102 L0,-74')}
    ${cap('M2,-100 L14,-77')}
    <rect x="10" y="-79" width="21" height="20" rx="5.5" fill="none" stroke="${C.ink}" stroke-width="${PEN}"/>
    ${ring(0, -116, 14.5)}
    ${face(0, -116, 14.5)}
  </g>`;

/** Hund mit Stoeckchen-Koerper, Kopf und Schwanz; Leine wird aussen gezeichnet. */
const dog = (
  x,
  y,
  scale = 1,
  hearts = false,
  flip = false
) => `<g transform="translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})">
    ${cap('M-36,-38 Q-45,-42 -47,-53')}
    ${cap('M-36,-38 L8,-40')}
    ${cap('M-26,-39 L-34,-2')}
    ${cap('M-26,-39 L-17,-2')}
    ${cap('M-1,-40 L-4,-2')}
    ${cap('M-1,-40 L5,-2')}
    ${cap('M13,-52 L17,-59 L21,-53', 4.4)}
    ${ring(17, -45, 9.6)}
    ${cap('M26,-45 L31,-44', 5.6)}
    ${dot(33, -44, 2.4)}
    ${dot(19.5, -48, 2)}
    ${dot(9, -42, 2.1, C.accent)}
  </g>${hearts ? heartsMark(x + (flip ? -18 : 18), y - 62, 1) : ''}`;

function heartsMark(x, y, s = 1) {
  const h = (cx, cy, k, o) =>
    `<path transform="translate(${n(cx)} ${n(cy)}) scale(${n(k)})" d="M0,3.6 C-3.4,0.9 -5.4,-0.7 -5.4,-3 C-5.4,-5 -3.8,-6.4 -2,-6.4 C-1,-6.4 -0.3,-5.9 0,-5.2 C0.3,-5.9 1,-6.4 2,-6.4 C3.8,-6.4 5.4,-5 5.4,-3 C5.4,-0.7 3.4,0.9 0,3.6 Z" fill="${C.accent}" opacity="${o}"/>`;
  return (
    h(x - 12 * s, y - 4 * s, 0.7 * s, 0.75) +
    h(x - 1 * s, y, 0.95 * s, 1) +
    h(x + 9 * s, y + 10 * s, 0.58 * s, 0.6)
  );
}

/** Sitzende/stehende Katze mit hochgezogenem Schwanz. */
const cat = (
  x,
  y,
  scale = 1,
  flip = false
) => `<g transform="translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})">
    ${cap('M-31,-34 C-40,-38 -44,-50 -37,-60')}
    ${cap('M-30,-34 L14,-36')}
    ${cap('M-21,-35 L-23,-2')}
    ${cap('M-12,-35 L-7,-2')}
    ${cap('M3,-36 L0,-2')}
    ${cap('M10,-36 L15,-2')}
    ${cap('M12,-48 L8,-61 L18,-54', 4.4)}
    ${cap('M23,-53 L31,-62 L31,-49', 4.4)}
    ${ring(21, -42, 11)}
    ${dot(17.5, -44, 2.3)}
    ${dot(25, -44, 2.3)}
    ${cap('M18,-38 Q21.5,-35 25,-38', 2.6)}
  </g>`;

/** Katze am Napf: Kopf tief ueber der Schuessel. */
const catDrinking = (x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})">
    ${cap('M-2,-40 C-10,-45 -12,-56 -6,-65')}
    ${cap('M-1,-40 L34,-41')}
    ${cap('M4,-41 L2,-2')}
    ${cap('M12,-41 L15,-2')}
    ${cap('M24,-41 L22,-2')}
    ${cap('M31,-41 L34,-2')}
    ${cap('M41,-36 L37,-50 L47,-43', 4.6)}
    ${cap('M51,-40 L59,-48 L59,-35', 4.6)}
    ${ring(47, -30, 10.8)}
    ${dot(51, -32, 2.3)}
    ${cap('M56,-24 L62,-19', 4.6)}
  </g>`;

/** Schildkroete, Kopf nach rechts. */
const turtle = (x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})">
    ${cap('M-34,-4 L-41,-2', 4.6)}
    ${cap('M-27,-4 L-29,0', 4.6)}
    ${cap('M-14,-4 L-14,0', 4.6)}
    ${cap('M2,-4 L2,0', 4.6)}
    ${cap('M14,-4 L14,0', 4.6)}
    ${cap('M-34,-4 C-34,-20 -20,-30 -2,-30 C16,-30 29,-20 29,-4')}
    ${cap('M-34,-4 L29,-4')}
    ${cap('M-2,-30 L-2,-17', 4)}
    ${cap('M-21,-9 C-17,-21 -9,-24 -1,-22', 3.4)}
    ${cap('M27,-14 L31,-16', 5)}
    ${ring(37, -18, 7.4)}
    ${dot(39, -20, 1.9)}
  </g>`;

/** Vogel auf der Sitzstange. */
const birdStand = (x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})">
    ${cap('M0,-1 L0,-57', 4.2)}
    ${cap('M-12,-1 L12,-1', 4.2)}
    ${cap('M-15,-57 L15,-57', 4.2)}
    ${cap('M-3,-57 L-3,-63', 3)}
    ${cap('M4,-57 L4,-63', 3)}
    ${cap('M-8,-68 L-19,-62', 4.2)}
    ${cap('M-6,-72 L-17,-67', 4.2)}
    ${ring(0, -74, 11)}
    <path d="M-6.5,-78 Q0,-72.5 6.5,-78 Q0,-82 -6.5,-78 Z" fill="none" stroke="${C.ink}" stroke-width="3.4" stroke-linejoin="round"/>
    ${cap('M15,-87 L21,-85', 3.2)}
    ${cap('M15,-84 L20,-79', 3.2)}
    ${ring(9, -86, 7)}
    ${dot(11, -88, 1.9)}
  </g>`;

/** Person, die Futter in den Napf streut; daneben trinkt eine Katze. */
const feedingPair = (x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})">
    ${catDrinking(-110, 0, 0.95)}
    ${cap('M-58,-2 L-52,-11 L-32,-11 L-26,-2')}
    ${cap('M-58,-2 L-26,-2', 3.2)}
    ${cap('M-8,-40 L-14,-2')}
    ${cap('M6,-40 L10,-2')}
    ${cap('M-14,-2 L-21,-1')}
    ${cap('M10,-2 L17,-1')}
    ${cap('M0,-102 L0,-74 L-1,-40', 4.6)}
    ${cap('M1,-100 L-17,-84 L-25,-60')}
    <rect x="-33" y="-62" width="12" height="13" rx="3.5" fill="none" stroke="${C.ink}" stroke-width="4"/>
    ${dot(-30, -42, 1.6, C.accent)}
    ${dot(-35, -32, 1.3, C.accent)}
    ${dot(-40, -22, 1.5, C.accent)}
    ${ring(0, -116, 14.5)}
    ${face(0, -116, 14.5)}
  </g>`;

// ---------------------------------------------------------------------------
// scene
// ---------------------------------------------------------------------------
const backRange = [
  [0, 238],
  [55, 232],
  [95, 205],
  [130, 168],
  [152, 132],
  [172, 152],
  [205, 198],
  [232, 222],
  [262, 205],
  [292, 170],
  [312, 142],
  [334, 168],
  [366, 212],
  [394, 232],
  [424, 220],
  [452, 186],
  [478, 152],
  [498, 128],
  [520, 158],
  [548, 200],
  [578, 228],
  [606, 236],
  [634, 214],
  [660, 178],
  [684, 150],
  [706, 132],
  [730, 162],
  [758, 204],
  [786, 230],
  [812, 236],
  [840, 212],
  [866, 176],
  [892, 152],
  [916, 166],
  [942, 204],
  [970, 230],
  [996, 236],
  [1024, 210],
  [1050, 174],
  [1076, 156],
  [1100, 176],
  [1128, 212],
  [1156, 234],
  [1184, 224],
  [1212, 192],
  [1240, 162],
  [1264, 146],
  [1288, 172],
  [1316, 210],
  [1344, 234],
  [1372, 226],
  [1400, 196],
  [1428, 168],
  [1452, 152],
  [1476, 178],
  [1504, 214],
  [1532, 236],
  [1560, 240],
  [1600, 232],
];
const midRange = [
  [0, 250],
  [70, 244],
  [110, 224],
  [150, 196],
  [172, 176],
  [194, 200],
  [228, 232],
  [258, 244],
  [290, 234],
  [320, 208],
  [344, 186],
  [368, 206],
  [400, 236],
  [430, 248],
  [458, 240],
  [488, 216],
  [514, 192],
  [538, 180],
  [562, 202],
  [594, 236],
  [624, 250],
  [652, 246],
  [682, 224],
  [710, 198],
  [734, 184],
  [758, 206],
  [788, 240],
  [818, 250],
  [846, 244],
  [874, 220],
  [902, 196],
  [926, 186],
  [950, 208],
  [980, 242],
  [1010, 250],
  [1038, 242],
  [1066, 218],
  [1094, 196],
  [1118, 190],
  [1142, 212],
  [1172, 244],
  [1202, 250],
  [1230, 240],
  [1258, 214],
  [1286, 192],
  [1310, 186],
  [1334, 210],
  [1364, 244],
  [1394, 250],
  [1422, 238],
  [1450, 212],
  [1478, 192],
  [1502, 188],
  [1526, 214],
  [1556, 244],
  [1586, 250],
  [1600, 246],
];
const frontRange = [
  [0, 258],
  [60, 254],
  [100, 240],
  [140, 222],
  [164, 210],
  [188, 226],
  [220, 246],
  [250, 256],
  [284, 250],
  [316, 232],
  [342, 216],
  [368, 230],
  [400, 250],
  [430, 258],
  [462, 250],
  [492, 232],
  [518, 218],
  [544, 230],
  [576, 250],
  [606, 258],
  [636, 250],
  [666, 230],
  [692, 216],
  [718, 228],
  [748, 250],
  [780, 258],
  [810, 250],
  [840, 232],
  [866, 220],
  [892, 232],
  [922, 252],
  [952, 258],
  [982, 248],
  [1010, 230],
  [1036, 218],
  [1062, 230],
  [1092, 252],
  [1122, 258],
  [1152, 248],
  [1180, 228],
  [1206, 216],
  [1232, 228],
  [1262, 250],
  [1292, 258],
  [1322, 248],
  [1350, 228],
  [1376, 216],
  [1402, 228],
  [1432, 250],
  [1462, 258],
  [1492, 248],
  [1520, 230],
  [1546, 220],
  [1572, 234],
  [1600, 252],
];

const HILL = 266;
const BASE = 296;

function scene() {
  const r = rnd(90210);

  let rowFar = '';
  let rowMid = '';
  let rowNear = '';

  for (let x = -20; x < 1620; x += 15 + r() * 16) {
    rowFar += pine(
      x,
      BASE - 4 + r() * 4,
      46 + r() * 26,
      'var(--scenery-forest-back)',
      Math.floor(x),
      0.9 + r() * 0.25
    );
  }
  for (let x = -20; x < 1620; x += 74 + r() * 52) {
    const count = 2 + Math.floor(r() * 3);
    for (let i = 0; i < count; i++) {
      const tx = x + i * (11 + r() * 20);
      const h = 76 + r() * 34;
      rowMid +=
        r() > 0.84
          ? roundTree(tx, BASE + 4, h * 0.82, 'var(--scenery-forest-mid)')
          : pine(
              tx,
              BASE + 4 + r() * 4,
              h,
              'var(--scenery-forest-mid)',
              Math.floor(tx) + 400,
              0.9 + r() * 0.3
            );
    }
  }
  for (const [tx, h] of [
    [62, 168],
    [290, 146],
    [612, 160],
    [890, 150],
    [1110, 164],
    [1500, 152],
  ]) {
    rowNear += pine(tx, n(groundY(tx, HILL) + 26), h, 'var(--scenery-forest-front)', tx, 1.02);
  }

  let grass = '';
  let flowers = '';
  for (let x = 4; x < 1600; x += 5 + r() * 7) {
    const y = groundY(x, HILL) + 1.4;
    const k = 1.8 + r() * 1.7;
    const col = 'var(--scenery-grass)';
    grass += cap(
      `M${n(x)},${n(y)} q${n(-k * 0.5)},${n(-k * 1.2)} ${n(-k * 0.3)},${n(-k * 2.6)}`,
      1.9,
      col
    );
    if (r() > 0.45)
      grass += cap(
        `M${n(x + 1.5)},${n(y)} q${n(k * 0.55)},${n(-k * 1.1)} ${n(k * 0.9)},${n(-k * 2.4)}`,
        1.9,
        col
      );
    if (r() > 0.94) {
      flowers += `<circle cx="${n(x + 4)}" cy="${n(y - 6)}" r="2.2" fill="${C.accent}" opacity="0.85"/>`;
      flowers += `<circle cx="${n(x + 10)}" cy="${n(y - 4)}" r="1.7" fill="${C.accent}" opacity="0.6"/>`;
    }
  }

  // meadow details
  let meadow = '';
  for (let x = 10; x < 1600; x += 26 + r() * 60) {
    const y = groundY(x, HILL + 26, 1.5) + 6 + r() * 26;
    const k = 1.5 + r() * 1.4;
    meadow += cap(
      `M${n(x)},${n(y)} q${n(-k * 0.4)},${n(-k)} ${n(-k * 0.2)},${n(-k * 2.2)}`,
      1.7,
      'var(--scenery-grass)'
    );
    meadow += cap(
      `M${n(x + 1.5)},${n(y)} q${n(k * 0.5)},${n(-k * 0.9)} ${n(k * 0.8)},${n(-k * 2)}`,
      1.7,
      'var(--scenery-grass)'
    );
    if (r() > 0.72) {
      meadow += `<ellipse cx="${n(x + 14)}" cy="${n(y + 2)}" rx="${n(3 + r() * 2.5)}" ry="${n(2 + r() * 1.4)}" fill="var(--scenery-ground-soft)"/>`;
    }
  }

  const g = (x) => n(groundY(x, HILL) + 2.2);

  return `<svg viewBox="0 0 1600 340" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="pnScenerySunGlow">
      <stop offset="0" stop-color="var(--scenery-sun)" stop-opacity="0.3"/>
      <stop offset="0.5" stop-color="var(--scenery-sun)" stop-opacity="0.12"/>
      <stop offset="1" stop-color="var(--scenery-sun)" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="1148" cy="168" r="150" fill="url(#pnScenerySunGlow)"/>
  <circle cx="1148" cy="168" r="46" fill="var(--scenery-sun)"/>
  <g fill="var(--scenery-cloud)">
    <g transform="translate(112 126)"><circle cx="24" cy="14" r="16"/><circle cx="48" cy="6" r="22"/><circle cx="76" cy="16" r="14"/><rect x="6" y="16" width="84" height="14" rx="7"/></g>
    <g transform="translate(500 116) scale(0.66)"><circle cx="24" cy="14" r="16"/><circle cx="48" cy="6" r="22"/><circle cx="76" cy="16" r="14"/><rect x="6" y="16" width="84" height="14" rx="7"/></g>
    <g transform="translate(946 132) scale(0.5)"><circle cx="24" cy="14" r="16"/><circle cx="48" cy="6" r="22"/><circle cx="76" cy="16" r="14"/><rect x="6" y="16" width="84" height="14" rx="7"/></g>
    <g transform="translate(1396 120) scale(0.58)"><circle cx="24" cy="14" r="16"/><circle cx="48" cy="6" r="22"/><circle cx="76" cy="16" r="14"/><rect x="6" y="16" width="84" height="14" rx="7"/></g>
  </g>
  <g fill="none" stroke="var(--scenery-bird)" stroke-width="2.3" stroke-linecap="round" opacity="0.75">
    <path d="M262,138 q7,-6 14,0 q7,-6 14,0"/>
    <path d="M322,120 q5,-4.5 10,0 q5,-4.5 10,0"/>
    <path d="M700,96 q6,-5 12,0 q6,-5 12,0"/>
    <path d="M1342,108 q5,-4.5 10,0 q5,-4.5 10,0"/>
  </g>
  <path d="${layer(backRange, 7)}" fill="var(--scenery-mountain-back)"/>
  <path d="${layer(midRange, 6)}" fill="var(--scenery-mountain-mid)"/>
  <path d="${layer(frontRange, 5)}" fill="var(--scenery-mountain-front)"/>
  <g>${rowFar}</g>
  <g>${rowMid}</g>
  <g>${rowNear}</g>
  <path d="${groundPath(HILL)}" fill="var(--scenery-ground)"/>
  <path d="${crestPath(HILL)}" fill="none" stroke="var(--scenery-ground-line)" stroke-width="2"/>
  <g>${grass}${flowers}</g>
  ${bush(84, n(groundY(84, HILL, 1.6) + 12), 64, 'var(--scenery-ground-front)')}
  ${bush(1520, n(groundY(1520, HILL, 1.6) + 13), 58, 'var(--scenery-ground-front)')}
  ${birdStand(214, g(214), 1)}
  ${turtle(352, g(352), 1.15)}
  ${cat(492, g(492), 1)}
  ${cap(`M${n(690 + 30)},${n(g(690) - 68)} Q${n(752)},${n(g(752) - 52)} ${n(798 + 15)},${n(g(798) - 45)}`, 2.2, 'var(--scenery-leash)')}
  ${walker(690, g(690), 1.02)}
  ${dog(798, g(798), 1.02)}
  ${feedingPair(1046, g(1046), 0.96)}
  ${cat(1176, g(1176), 1)}
  ${dog(1300, g(1300), 1, true, true)}
  ${walker(1412, g(1412), 1.02)}
  <path d="${groundPath(HILL + 30, 340, 2.6)}" fill="var(--scenery-ground-front)"/>
  <g>${meadow}</g>
</svg>`;
}

const PALETTE = {
  'scenery-sun': '#f2ab7e',
  'scenery-cloud': '#fbece3',
  'scenery-mountain-back': '#f7e7dc',
  'scenery-mountain-mid': '#f0d7c9',
  'scenery-mountain-front': '#e6c6b4',
  'scenery-forest-back': '#cdd9c2',
  'scenery-forest-mid': '#abc2a2',
  'scenery-forest-front': '#7e9f84',
  'scenery-ground': '#4e6e56',
  'scenery-ground-soft': '#587a65',
  'scenery-ground-front': '#44644f',
  'scenery-ground-line': 'rgba(255,246,240,0.42)',
  'scenery-grass': '#41604a',
  'scenery-ink': '#201d1a',
  'scenery-face': '#fff8f5',
  'scenery-accent': '#dd815c',
  'scenery-leash': '#d97a52',
  'scenery-bird': '#b08a72',
};

const styleAttr = Object.entries(PALETTE)
  .map(([k, v]) => `--${k}:${v}`)
  .join(';');

let svg = scene();
svg = svg.replace(
  '<svg viewBox="0 0 1600 340" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">',
  `<svg width="1600" height="340" viewBox="0 0 1600 340" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" role="presentation" style="${styleAttr}">`
);

const target = new URL('../apps/web/public/footer-scenery.svg', import.meta.url);
fs.writeFileSync(target, `<?xml version="1.0" encoding="UTF-8"?>\n${svg}\n`);
console.log(`footer-scenery.svg geschrieben (${svg.length} Zeichen)`);
