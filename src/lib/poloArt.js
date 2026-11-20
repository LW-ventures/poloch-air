// Vektorgrafik des Poloch: generischer schwarzer Kleinwagen (kurzes Heck, steile Heckklappe) von der Seite,
// Front rechts, optional mit Flügeln.
// Reine Strings, damit dieselben Pfade in React UND im Icon-Generator (scripts/make-icon.mjs) landen.
// viewBox: 0 0 300 130 (Auto), mit Flügeln: -20 -80 330 210

export const BODY =
  'M18 92 L16 66 Q16 58 22 54 L36 28 Q40 20 52 19 L158 15 Q168 15 176 22 L214 54 L264 60 Q288 64 290 76 L290 92 ' +
  'L258 92 A23 23 0 0 0 212 92 L93 92 A23 23 0 0 0 47 92 Z';
// dicke C-Säule + kleines hinteres Seitenfenster = Kleinwagen statt Kombi
export const WINDOW_REAR = 'M70 26 L97 25 L97 52 L58 52 Z';
export const WINDOW_FRONT = 'M103 24 L160 23 Q167 23 172 29 L199 52 L103 52 Z';
export const GLARE = 'M108 27 L122 27 L110 50 L103 50 Z M74 29 L84 28 L72 50 L64 50 Z';
export const SHEEN = 'M54 22 L158 18 Q166 18 172 23';
export const HEADLIGHT = 'M272 64 L287 68 L287 74 L276 72 Z';
export const TAILLIGHT = 'M17 58 L26 54 L25 70 L16 71 Z';
export const MIRROR = 'M193 48 L203 45 L205 52 L196 53 Z';
export const DOOR = 'M150 55 L150 88 M100 55 L100 88';
export const HANDLE = [126, 58];
export const SKIRT = 'M96 86 L208 86';
export const WHEELS = [70, 235];
export const WHEEL_Y = 92;

// Riss in der vorderen Seitenscheibe
export const CRACK_POINT = [150, 40];
export const CRACK =
  'M150 40 L136 31 M150 40 L166 30 M150 40 L170 46 M150 40 L131 45 M150 40 L146 50 M150 40 L157 28 M150 40 L161 50 ' +
  'M143 36 L156 34 L162 42 L152 47 L140 43 Z';

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
