// Vektorgrafik des Poloch: schwarzer Kleinwagen im Seitenprofil eines VW Polo (6R), nach Foto
// abgezeichnet und gespiegelt (Front rechts), ohne Logo. Optional mit Flügeln.
// Reine Strings, damit dieselben Pfade in React UND im Icon-Generator (scripts/make-icon.mjs) landen.
// viewBox: 0 0 300 130 (Auto), mit Flügeln: -20 -80 330 210

// Karosserie: kurzes, rundes Heck mit Dachspoiler, flache Haube, Radläufe mit Abstand zum Reifen
export const BODY =
  'M16 94.8 L12 82 L12.6 62.5 Q13 48 17.6 42.8 Q21 30 27.5 24.5 L43.5 12.4 Q47 9.5 52.8 9 L97.8 7.6 L137.2 9.5 ' +
  'Q160 11 168.2 14.1 L218.8 39.4 Q236 43 252.6 47 L279.3 55.4 Q288 58 289.2 62.5 Q292 67 292 73.7 L291.4 94.8 ' +
  'L268 94.8 L266.6 92 A26.7 26.7 0 0 0 213.2 92 L211.8 96 L81 96 L79.5 92 A26.7 26.7 0 0 0 26.1 92 L24.7 94.8 Z';
// Hintertür-Fenster + kleines Dreiecksfenster in der C-Säule (typisch Polo 5-Türer)
export const WINDOW_REAR =
  'M122.6 13.8 L76 14.6 L68.5 40 L122.6 40.8 Z M70.4 16.2 L55.5 22.8 Q52.5 28 53.2 33.8 L64.8 34.3 Z';
export const WINDOW_FRONT = 'M190 41.3 L167.6 16.9 Q150 14 130.2 13.8 L130.2 41.3 Z';
export const GLARE = 'M136 16 L148 15.5 L137 39 L131 39 Z M110 15 L119 15 L110 39 L104 39 Z';
export const SHEEN = 'M53 11.5 L137 12 Q158 13 166 16.5';
export const HEADLIGHT = 'M268 57.5 L285 61.5 Q289 63.5 288.5 67.5 L271 66.5 Z';
export const TAILLIGHT = 'M18 41.5 L30.5 39.5 L32.5 50 L19.5 57.5 Z';
export const MIRROR = 'M199 37.5 L210 35.5 L212.5 43.5 L202 45.5 Z';
export const DOOR = 'M130.6 42.5 L130.6 93 M210 43 Q207 70 209 88 M69 41 Q73 66 80 86';
export const HANDLES = [[134, 52.5], [69.5, 49.5]];
export const SKIRT = 'M81 91 L211 91';
export const WHEELS = [52.8, 239.9];
export const WHEEL_Y = 92;
export const WHEEL_R = 23;
export const RIM_R = 15.5;

// Riss in der vorderen Seitenscheibe
export const CRACK_POINT = [158, 28];
export const CRACK =
  'M158 28 L144 19 M158 28 L168 19.5 M158 28 L180 34 M158 28 L139 33 M158 28 L154 38 M158 28 L162 16.5 M158 28 L169 38 ' +
  'M151 24 L164 22 L170 30 L160 35 L148 31 Z';

// Flügel, am Dach (121,17) angesetzt, nach hinten-oben geschwungen
export const WING =
  'M122 18 C104 -16 66 -50 18 -68 C34 -54 40 -46 44 -38 C30 -42 18 -42 6 -40 C26 -30 36 -24 44 -18 ' +
  'C32 -18 22 -14 12 -8 C30 -4 44 -2 58 0 C48 4 40 8 34 14 C64 16 94 18 122 18 Z';
export const WING_FEATHERS = 'M44 -38 C66 -26 92 -8 116 12 M44 -18 C70 -8 96 4 118 15 M58 0 C80 6 100 12 120 17';
export const WING_PIVOT = [121, 17];

// ---------- Stilisiertes Symbol (einfarbig, wie das Flugzeug-Symbol) ----------
// viewBox 0 -34 200 184, Front rechts. Fenster = ausgesparte Flächen (evenodd), Räder separat.
export const GLYPH_VIEWBOX = '0 -34 200 184';
export const GLYPH_RATIO = 184 / 200;
export const GLYPH_BODY =
  // Karosserie mit Radläufen
  'M18 112 L18 92 Q18 80 30 76 L58 48 Q63 43 71 43 L126 43 Q134 43 140 49 L162 73 L180 77 Q192 80 192 93 L192 112 ' +
  'L178 112 A19 19 0 0 0 140 112 L74 112 A19 19 0 0 0 36 112 Z ' +
  // Fenster (ausgespart)
  'M68 53 L96 53 L96 72 L50 72 Z M103 53 L126 53 Q131 53 135 57 L150 72 L103 72 Z';
export const GLYPH_WHEELS = [[55, 113], [159, 113]];
export const GLYPH_WHEEL_R = 14;
// Flügel: großer Schwung nach hinten-oben, vier abgestufte Federspitzen
export const GLYPH_WING =
  'M124 44 C112 12 82 -18 22 -28 Q14 -29 18 -23 L38 -10 Q16 -12 10 -8 Q6 -4 12 -2 L38 6 Q20 8 14 12 Q10 16 16 18 ' +
  'L44 22 Q32 26 28 30 Q26 34 32 34 C60 40 92 44 124 44 Z';

export const COLORS = {
  body: '#12161e',
  bodyEdge: 'rgba(210,225,245,0.38)',
  glass: '#2a3d58',
  glassGlare: 'rgba(255,255,255,0.18)',
  wing: '#f8f1e2',
  wingFar: '#cfc4ab',
  feather: 'rgba(24,34,58,0.28)',
  head: '#ffe6a3',
  tail: '#ff4d4d',
  tire: '#0b0d11',
  rim: '#a9b2bd',
};

// ---------- Symbol "Polo" (zweite Icon-Variante): Stil wie oben, Form der detaillierten Zeichnung ----------
// Koordinaten wie BODY (viewBox 0 0 300 130), Flügel auf die Dachlinie gesetzt.
export const GLYPH2_VIEWBOX = '-20 -90 316 206';
export const GLYPH2_RATIO = 206 / 316;
// Nur Vorder- und Hintertür-Fenster (Dreiecksfenster bleibt schwarz), oben etwas tiefer -> kräftige Dachlinie
export const GLYPH2_WINDOWS =
  'M190 41.3 L169.5 20.5 Q150 18 130.2 17.8 L130.2 41.3 Z M122.6 17.8 L77.2 18.4 L68.5 40 L122.6 40.8 Z';
export const GLYPH2_BODY = `${BODY} ${GLYPH2_WINDOWS}`;
export const GLYPH2_WHEELS = WHEELS.map((x) => [x, WHEEL_Y]);
export const GLYPH2_WHEEL_R = 20;
export const GLYPH2_WING = GLYPH_WING;
export const GLYPH2_WING_TRANSFORM = 'translate(-10.2 -48.2) scale(1.3)';
// Lage in der 512er-Icon-Kachel
export const GLYPH2_ICON_TRANSFORM = 'translate(258 266) rotate(-10) scale(1.2) translate(-138 -13.5)';
// Lage des klassischen Symbols in der 512er-Kachel
export const GLYPH_ICON_TRANSFORM = 'translate(258 262) rotate(-10) scale(1.78) translate(-104 -46)';
