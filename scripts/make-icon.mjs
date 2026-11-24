// Erzeugt die App-Icon-Varianten aus denselben Grafiken wie die App.
//   node scripts/make-icon.mjs [variante]   (Standard: 2)
// Schreibt public/icons/icon-<n>-*.svg und kopiert die gewählte Variante nach public/icon.svg.
// PNGs (icon-192.png, icon-512.png) danach im Browser aus public/icon.svg rendern, siehe README.
import fs from 'node:fs';
import * as P from '../src/lib/poloArt.js';

const C = P.COLORS;
const ORANGE = '#ff7a3d';
const NAVY = '#0b1830';
const BLACK = '#12161e';
const PLANE =
  'M-150 0 C-150 -14 -138 -22 -120 -22 L-30 -22 L40 -128 L78 -128 L40 -22 L120 -22 L150 -62 L176 -62 L160 0 L176 62 L150 62 L120 22 L40 22 L78 128 L40 128 L-30 22 L-120 22 C-138 22 -150 14 -150 0 Z';

const navyBg = `
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="#1d3866"/>
      <stop offset="1" stop-color="${NAVY}"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>`;

// --- Variante 1: detaillierter Flügel-Polo vor Sonne (bisheriges Icon) ---
function detailed() {
  const wheels = P.WHEELS.map(
    (x) =>
      `<circle cx="${x}" cy="${P.WHEEL_Y}" r="${P.WHEEL_R}" fill="${C.tire}" stroke="#2b3038" stroke-width="2"/>` +
      `<circle cx="${x}" cy="${P.WHEEL_Y}" r="${P.RIM_R}" fill="${C.rim}"/>` +
      `<circle cx="${x}" cy="${P.WHEEL_Y}" r="3" fill="#3a4049"/>`,
  ).join('');
  const polo = `
    <path d="${P.WING}" fill="${C.wingFar}" transform="translate(14 -4) rotate(12 ${P.WING_PIVOT[0]} ${P.WING_PIVOT[1]})"/>
    <path d="${P.BODY}" fill="${C.body}" stroke="${C.bodyEdge}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="${P.WINDOW_REAR}" fill="${C.glass}"/>
    <path d="${P.WINDOW_FRONT}" fill="${C.glass}"/>
    <path d="${P.GLARE}" fill="${C.glassGlare}"/>
    <path d="${P.SHEEN}" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2.4" stroke-linecap="round"/>
    <path d="${P.MIRROR}" fill="${C.body}" stroke="${C.bodyEdge}" stroke-width="1"/>
    <path d="${P.HEADLIGHT}" fill="${C.head}"/>
    <path d="${P.TAILLIGHT}" fill="${C.tail}"/>
    ${wheels}
    <g transform="rotate(20 ${P.WING_PIVOT[0]} ${P.WING_PIVOT[1]})">
      <path d="${P.WING}" fill="${C.wing}" stroke="rgba(24,34,58,0.35)" stroke-width="1.2"/>
      <path d="${P.WING_FEATHERS}" fill="none" stroke="${C.feather}" stroke-width="1.4" stroke-linecap="round"/>
    </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${navyBg}
  <circle cx="300" cy="214" r="122" fill="${ORANGE}"/>
  <g stroke="rgba(255,255,255,0.35)" stroke-width="7" stroke-linecap="round">
    <path d="M58 300 H150"/><path d="M84 336 H170"/><path d="M40 264 H118"/>
  </g>
  <g transform="translate(250 268) rotate(-9) scale(1.18) translate(-152 -40)">${polo}
  </g>
</svg>
`;
}

// --- stilisiertes Flügel-Auto (einfarbig) ---
function glyph(color) {
  const wheels = P.GLYPH_WHEELS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${P.GLYPH_WHEEL_R}"/>`).join('');
  return `<g fill="${color}" transform="translate(258 262) rotate(-10) scale(1.78) translate(-104 -46)">
    <path d="${P.GLYPH_WING}"/>
    <path d="${P.GLYPH_BODY}" fill-rule="evenodd"/>
    ${wheels}
  </g>`;
}

// --- Variante 2: orange, schwarzes Flügel-Auto ---
const orangeCar = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${ORANGE}"/>
  ${glyph(BLACK)}
</svg>
`;

// --- Variante 3: Navy mit oranger Sonne, schwarzes Flügel-Auto ---
const sunCar = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${navyBg}
  <circle cx="262" cy="246" r="178" fill="${ORANGE}"/>
  ${glyph(BLACK)}
</svg>
`;

// --- Variante 4: orange mit Flugzeug (das erste Logo) ---
const orangePlane = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${ORANGE}"/>
  <g transform="translate(256 256) rotate(-32) scale(-1.05 1.05)"><path d="${PLANE}" fill="${NAVY}"/></g>
</svg>
`;

export const VARIANTS = {
  1: ['icon-1-detail.svg', detailed],
  2: ['icon-2-orange-auto.svg', orangeCar],
  3: ['icon-3-sonne-auto.svg', sunCar],
  4: ['icon-4-orange-flugzeug.svg', orangePlane],
};

const dir = new URL('../public/icons/', import.meta.url);
fs.mkdirSync(dir, { recursive: true });
for (const [, [file, make]] of Object.entries(VARIANTS)) fs.writeFileSync(new URL(file, dir), make());

const chosen = process.argv[2] || '2';
const [file, make] = VARIANTS[chosen];
fs.writeFileSync(new URL('../public/icon.svg', import.meta.url), make());
console.log(`4 Varianten in public/icons/, aktiv: ${chosen} (${file})`);
