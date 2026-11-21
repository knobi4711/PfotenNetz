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
// characters
// ---------------------------------------------------------------------------
const C = {
  ink: 'var(--scenery-ink)',
  face: 'var(--scenery-face)',
  accent: 'var(--scenery-accent)',
};
const cap = (d, w, color = C.ink) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

function face(cx, cy, r, eye = 1.9, mouth = true) {
  const ey = cy - r * 0.2;
  const ex = r * 0.34;
  let s =
    `<circle cx="${n(cx - ex)}" cy="${n(ey)}" r="${n(eye)}" fill="${C.face}"/>` +
    `<circle cx="${n(cx + ex)}" cy="${n(ey)}" r="${n(eye)}" fill="${C.face}"/>`;
  if (mouth) {
    const my = cy + r * 0.26;
    s += `<path d="M${n(cx - r * 0.3)},${n(my)} q${n(r * 0.3)},${n(r * 0.3)} ${n(r * 0.6)},0" fill="none" stroke="${C.face}" stroke-width="${n(Math.max(1.6, r * 0.16))}" stroke-linecap="round"/>`;
  }
  return s;
}

/** Person walking, bag in hand. Height ≈ 132. */
const walker = (x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})">
    ${cap('M-1,-78 L-10,-42 L-17,-4', 9)}
    ${cap('M1,-78 L10,-44 L14,-4', 9)}
    ${cap('M-17,-4 L-26,-2', 7)}
    ${cap('M14,-4 L23,-2', 7)}
    <path d="M-9,-109 C-10,-98 -9,-88 -7,-76 L8,-76 C10,-88 11,-98 9,-109 Z" fill="${C.ink}"/>
    ${cap('M2,-104 L10,-88 L13,-77', 6.5)}
    <rect x="11" y="-80" width="18" height="17" rx="5" fill="${C.ink}"/>
    ${cap('M2,-107 L12,-79', 2.4)}
    <circle cx="0" cy="-122" r="12.5" fill="${C.ink}"/>
    ${face(0, -122, 12.5)}
  </g>`;

/** Long-bodied dog, head raised. */
const dog = (
  x,
  y,
  scale = 1,
  hearts = false,
  flip = false
) => `<g transform="translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})">
    ${cap('M-30,-30 Q-41,-35 -43,-48', 6.5)}
    ${cap('M-21,-18 L-22,-2', 6.5)}
    ${cap('M-11,-18 L-11,-2', 6.5)}
    ${cap('M3,-18 L3,-2', 6.5)}
    ${cap('M13,-18 L13,-2', 6.5)}
    <rect x="-31" y="-39" width="44" height="23" rx="11.5" fill="${C.ink}"/>
    ${cap('M8,-34 L18,-46', 11)}
    <path d="M17,-51 L26,-53 L21,-62 Z" fill="${C.ink}"/>
    <circle cx="23" cy="-49" r="8.8" fill="${C.ink}"/>
    ${cap('M30,-50 L37,-50', 5.5)}
    <circle cx="39" cy="-50" r="2.3" fill="${C.ink}"/>
    <circle cx="25" cy="-51.5" r="1.9" fill="${C.face}"/>
    <circle cx="14" cy="-32" r="2.2" fill="${C.accent}"/>
  </g>${hearts ? heartsMark(x + (flip ? -24 : 24), y - 78, 1) : ''}`;

function heartsMark(x, y, s = 1) {
  const h = (cx, cy, k, o) =>
    `<path transform="translate(${n(cx)} ${n(cy)}) scale(${n(k)})" d="M0,3.6 C-3.4,0.9 -5.4,-0.7 -5.4,-3 C-5.4,-5 -3.8,-6.4 -2,-6.4 C-1,-6.4 -0.3,-5.9 0,-5.2 C0.3,-5.9 1,-6.4 2,-6.4 C3.8,-6.4 5.4,-5 5.4,-3 C5.4,-0.7 3.4,0.9 0,3.6 Z" fill="${C.accent}" opacity="${o}"/>`;
  return (
    h(x - 12 * s, y - 4 * s, 0.7 * s, 0.75) +
    h(x - 1 * s, y, 0.95 * s, 1) +
    h(x + 9 * s, y + 10 * s, 0.58 * s, 0.6)
  );
}

const cat = (
  x,
  y,
  scale = 1,
  flip = false
) => `<g transform="translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})">
    ${cap('M-11,-4 C-23,-7 -26,-29 -18,-45', 5.5)}
    <path d="M-15,0 C-20,-12 -18,-29 -6,-37 C2,-42 11,-40 15,-33 C20,-24 19,-10 13,-3 Z" fill="${C.ink}"/>
    ${cap('M8,-15 L9,-2', 6)}
    ${cap('M1,-15 L1,-2', 6)}
    <circle cx="3" cy="-51" r="12" fill="${C.ink}"/>
    <path d="M-7,-55 L-9,-68 L2,-61 Z" fill="${C.ink}"/>
    <path d="M9,-61 L17,-69 L18,-56 Z" fill="${C.ink}"/>
    ${face(3, -51, 12, 1.8)}
  </g>`;

/** Standing cat, facing right; head lowered to drink. */
const catSide = (x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})">
    ${cap('M-19,-25 C-29,-27 -32,-40 -27,-50', 5)}
    ${cap('M-12,-17 L-13,-1', 5.5)}
    ${cap('M-2,-17 L-2,-1', 5.5)}
    ${cap('M6,-17 L7,-1', 5.5)}
    ${cap('M14,-17 L15,-1', 5.5)}
    <rect x="-20" y="-33" width="36" height="17" rx="8.5" fill="${C.ink}"/>
    <circle cx="16" cy="-26" r="8.6" fill="${C.ink}"/>
    <path d="M9,-29 L7,-40 L16,-35 Z" fill="${C.ink}"/>
    <path d="M19,-31 L26,-36 L26,-27 Z" fill="${C.ink}"/>
    ${cap('M22,-22 L28,-17', 6.5)}
    <circle cx="18" cy="-28" r="1.5" fill="${C.face}"/>
  </g>`;

const turtle = (x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})">
    <path d="M-34,-3 L-41,-1" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/>
    ${cap('M-26,-5 L-27,0', 5.5)}
    ${cap('M-13,-5 L-13,0', 5.5)}
    ${cap('M2,-5 L2,0', 5.5)}
    ${cap('M14,-5 L14,0', 5.5)}
    <path d="M-35,-3 C-37,-17 -24,-28 -7,-28 C11,-28 20,-17 20,-4 L-35,-4 Z" fill="${C.ink}"/>
    ${cap('M19,-13 C23,-15 25,-17 27,-20', 10)}
    <circle cx="30" cy="-21" r="7" fill="${C.ink}"/>
    <path d="M-27,-11 C-22,-21 -14,-24 -5,-24" fill="none" stroke="${C.face}" stroke-width="1.5" stroke-linecap="round" opacity="0.55"/>
    <circle cx="32" cy="-23" r="1.7" fill="${C.face}"/>
  </g>`;

const birdStand = (x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})">
    ${cap('M0,-1 L0,-58', 4)}
    ${cap('M-11,-1 L11,-1', 4)}
    ${cap('M-14,-58 L14,-58', 4)}
    ${cap('M-4,-58 L-4,-63', 2.6)}
    ${cap('M3,-58 L3,-63', 2.6)}
    ${cap('M-7,-70 L-19,-63', 6)}
    <circle cx="0" cy="-74" r="11" fill="${C.ink}"/>
    <circle cx="9" cy="-85" r="6.5" fill="${C.ink}"/>
    <path d="M14,-85 L22,-83 L14,-79 Z" fill="${C.ink}"/>
    <path d="M-6,-78 q7,-4.5 13,0 q-7,3.5 -13,0 Z" fill="${C.face}" opacity="0.65"/>
    <circle cx="11" cy="-87" r="1.5" fill="${C.face}"/>
  </g>`;

/** Person standing next to a bowl; a cat drinks from it. */
const feedingPair = (x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})">
    ${catSide(-90, 0, 0.95)}
    <path d="M-70,-1 L-62,-10 L-45,-10 L-37,-1 Z" fill="${C.ink}"/>
    <circle cx="-58" cy="-15" r="1.4" fill="${C.accent}"/>
    <circle cx="-53" cy="-20" r="1.1" fill="${C.accent}"/>
    ${cap('M-4,-78 L-10,-46 L-9,-4', 9)}
    ${cap('M4,-78 L10,-48 L12,-4', 9)}
    ${cap('M-9,-4 L-17,-2', 7)}
    ${cap('M12,-4 L20,-2', 7)}
    <path d="M-9,-107 C-10,-97 -9,-87 -7,-76 L7,-76 C9,-87 10,-97 9,-107 Z" fill="${C.ink}"/>
    ${cap('M1,-102 L-19,-82 L-32,-48', 6.5)}
    <ellipse cx="-33" cy="-45" rx="9" ry="6.5" fill="${C.ink}" transform="rotate(-18 -33 -45)"/>
    <circle cx="-39" cy="-32" r="1.5" fill="${C.accent}"/>
    <circle cx="-44" cy="-24" r="1.2" fill="${C.accent}"/>
    <circle cx="-49" cy="-17" r="1.4" fill="${C.accent}"/>
    <circle cx="0" cy="-120" r="12.5" fill="${C.ink}"/>
    ${face(0, -120, 12.5)}
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
    [52, 168],
    [292, 146],
    [612, 160],
    [948, 150],
    [1048, 156],
    [1382, 152],
    [1568, 184],
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
  <g>${grass}${flowers}</g>
  ${bush(84, n(groundY(84, HILL, 1.6) + 12), 64, 'var(--scenery-ground-front)')}
  ${bush(1520, n(groundY(1520, HILL, 1.6) + 13), 58, 'var(--scenery-ground-front)')}
  ${birdStand(214, g(214), 1)}
  ${turtle(352, g(352), 1.15)}
  ${cat(492, g(492), 1)}
  ${cap(`M${n(690 + 28)},${n(g(690) - 68)} Q${n(760)},${n(g(760) - 46)} ${n(798 + 12)},${n(g(798) - 34)}`, 2.3, 'var(--scenery-leash)')}
  ${walker(690, g(690), 1.02)}
  ${dog(798, g(798), 1.02)}
  ${feedingPair(1046, g(1046), 0.96)}
  ${cat(1216, g(1216), 1)}
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
