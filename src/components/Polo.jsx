import * as P from '../lib/poloArt.js';

// App-Icon direkt in der App (Variante 2): Kachel in Akzentfarbe, schwarzes Flügel-Auto.
// Inline statt <img>, damit es beim Wechsel Orange/Türkis automatisch mitfärbt.
export function AppIcon({ size = 36, className = '' }) {
  return (
    <svg className={`app-icon ${className}`} width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <rect width="512" height="512" rx="112" fill="var(--accent)" />
      <g fill="#12161e" transform="translate(258 262) rotate(-10) scale(1.78) translate(-104 -46)">
        <path d={P.GLYPH_WING} />
        <path d={P.GLYPH_BODY} fillRule="evenodd" />
        {P.GLYPH_WHEELS.map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r={P.GLYPH_WHEEL_R} />
        ))}
      </g>
    </svg>
  );
}

// Stilisiertes Flügel-Auto, einfarbig (currentColor) – das Logo-Symbol
export function PoloGlyph({ size = 24, className = '', title }) {
  return (
    <svg
      className={`polo-glyph ${className}`}
      width={size}
      height={size * P.GLYPH_RATIO}
      viewBox={P.GLYPH_VIEWBOX}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <g fill="currentColor">
        <path className="polo-glyph-wing" d={P.GLYPH_WING} />
        <path d={P.GLYPH_BODY} fillRule="evenodd" />
        {P.GLYPH_WHEELS.map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r={P.GLYPH_WHEEL_R} />
        ))}
      </g>
    </svg>
  );
}

// Der Poloch. wings: Flügel dran; flap: Flügel schlagen; spin: Räder drehen; crack: Riss in der Scheibe
// art: alternative Zeichnung (nur für Vergleiche), Standard ist poloArt.js
export default function Polo({ wings = false, flap = false, spin = false, crack = false, className = "", title, art = P }) {
  const C = P.COLORS;
  const vb = wings ? "-20 -80 330 210" : "0 0 300 130";
  const [px, py] = art.WING_PIVOT;
  const handles = art.HANDLES || [art.HANDLE];
  const tireR = art.WHEEL_R || 19;
  const rimR = art.RIM_R || 10;
  const wy = art.WHEEL_Y;
  return (
    <svg className={`polo ${className}`} viewBox={vb} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {wings && (
        <g className={`polo-wing ${flap ? "is-flapping" : ""}`} style={{ transformOrigin: `${px + 14}px ${py - 4}px` }}>
          <path d={art.WING} fill={C.wingFar} transform="translate(14 -4)" />
        </g>
      )}
      <path d={art.BODY} fill={C.body} stroke={C.bodyEdge} strokeWidth="1.4" strokeLinejoin="round" />
      <path d={art.WINDOW_REAR} fill={C.glass} />
      <path d={art.WINDOW_FRONT} fill={C.glass} />
      <path d={art.GLARE} fill={C.glassGlare} />
      <path d={art.SHEEN} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2" strokeLinecap="round" />
      <path d={art.DOOR} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.2" />
      <path d={art.SKIRT} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
      {handles.map(([hx, hy]) => (
        <rect key={hx} x={hx} y={hy} width="12" height="3" rx="1.5" fill="rgba(255,255,255,0.25)" />
      ))}
      <path d={art.MIRROR} fill={C.body} stroke={C.bodyEdge} strokeWidth="1" />
      <path d={art.HEADLIGHT} fill={C.head} />
      <path d={art.TAILLIGHT} fill={C.tail} />
      {crack && <path className="polo-crack" pathLength="1" d={art.CRACK} fill="none" stroke="#e8f4ff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />}
      {art.WHEELS.map((x) => (
        <g key={x} className={spin ? "polo-wheel is-spinning" : "polo-wheel"} style={{ transformOrigin: `${x}px ${wy}px` }}>
          <circle cx={x} cy={wy} r={tireR} fill={C.tire} stroke="#2b3038" strokeWidth="2" />
          <circle cx={x} cy={wy} r={rimR} fill={C.rim} />
          {/* Alufelge mit 5 Speichen */}
          {[0, 72, 144, 216, 288].map((a) => {
            const r = (a - 90) * Math.PI / 180;
            return <line key={a} x1={x} y1={wy} x2={x + Math.cos(r) * (rimR - 1)} y2={wy + Math.sin(r) * (rimR - 1)} stroke="#5f6873" strokeWidth={rimR / 4.5} strokeLinecap="round" />;
          })}
          <circle cx={x} cy={wy} r={rimR / 4} fill="#3a4049" />
        </g>
      ))}
      {wings && (
        <g className={`polo-wing ${flap ? "is-flapping" : ""}`} style={{ transformOrigin: `${px}px ${py}px` }}>
          <path d={art.WING} fill={C.wing} stroke="rgba(24,34,58,0.35)" strokeWidth="1" />
          <path d={art.WING_FEATHERS} fill="none" stroke={C.feather} strokeWidth="1.2" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
