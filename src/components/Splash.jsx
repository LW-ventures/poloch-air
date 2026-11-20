import { useEffect, useMemo, useState } from 'react';
import Polo, { PoloGlyph } from './Polo.jsx';
import FlapText from './FlapText.jsx';
import './splash.css';

export const SPLASHES = [
  { id: 'scheibe', name: 'Scheibe', desc: 'Der Poloch steht da, die Scheibe fliegt, du fliegst durch.' },
  { id: 'airline', name: 'Airline', desc: 'Schriftzug als Fallblatt, das Flügel-Auto fliegt im Bogen dazu.' },
  { id: 'none', name: 'Aus', desc: 'Direkt in die App.' },
];

const DURATION = { scheibe: 2900, airline: 3100 };

// deterministischer Zufall für Glaszacken
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function useGlass() {
  return useMemo(() => {
    const r = rng(7);
    const cx = 100;
    const cy = 100;
    const pt = (a, d) => [cx + Math.cos(a) * d, cy + Math.sin(a) * d];
    // Loch: Zackenkranz
    const n = 18;
    const hole = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.15;
      const d = i % 2 ? 11 + r() * 6 : 20 + r() * 10;
      hole.push(pt(a, d));
    }
    const holeD = 'M' + hole.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L') + ' Z';
    // Risse: radial mit Knicken
    const cracks = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + r() * 0.3;
      let d = 22;
      let p = pt(a, d);
      let dd = `M${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
      let ang = a;
      while (d < 190) {
        d += 18 + r() * 30;
        ang += (r() - 0.5) * 0.35;
        p = pt(ang, d);
        dd += ` L${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
      }
      cracks.push(dd);
    }
    // Ringrisse
    const rings = [44, 78, 120].map((rad) => {
      const m = 22;
      let dd = '';
      for (let i = 0; i <= m; i++) {
        const a = (i / m) * Math.PI * 2;
        const p = pt(a, rad + (r() - 0.5) * rad * 0.22);
        dd += `${i ? ' L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
      }
      return dd;
    });
    // Splitter
    const shards = Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2 + r() * 0.4;
      const dist = 40 + r() * 50;
      return {
        dx: Math.cos(a) * dist,
        dy: Math.sin(a) * dist,
        rot: (r() - 0.5) * 540,
        s: 6 + r() * 14,
        shape: `polygon(${(r() * 30).toFixed(0)}% 0%, 100% ${(30 + r() * 40).toFixed(0)}%, ${(r() * 50).toFixed(0)}% 100%)`,
        delay: r() * 0.08,
      };
    });
    return { holeD, cracks, rings, shards };
  }, []);
}

function Scheibe() {
  const g = useGlass();
  return (
    <>
      <div className="sx-scene">
        <div className="sx-stage">
          <div className="sx-zoom">
            <div className="sx-shake">
              <span className="sx-shadow" />
              <Polo crack className="sx-car" />
            </div>
          </div>
        </div>
      </div>
      <div className="sx-flash" />
      <svg className="sx-glass" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path fillRule="evenodd" d={`M-600 -600 H800 V800 H-600 Z ${g.holeD}`} fill="rgba(9,18,36,0.86)" />
        <path fillRule="evenodd" d={`M-600 -600 H800 V800 H-600 Z ${g.holeD}`} fill="url(#sx-frost)" />
        <defs>
          <radialGradient id="sx-frost" cx="50%" cy="50%" r="60%">
            <stop offset="0" stopColor="rgba(200,230,255,0.35)" />
            <stop offset="0.35" stopColor="rgba(200,230,255,0.08)" />
            <stop offset="1" stopColor="rgba(200,230,255,0)" />
          </radialGradient>
        </defs>
        <g fill="none" stroke="rgba(235,246,255,0.75)" strokeWidth="0.7" strokeLinejoin="round">
          {g.cracks.map((d, i) => (
            <path key={i} d={d} />
          ))}
          {g.rings.map((d, i) => (
            <path key={`r${i}`} d={d} strokeWidth="0.45" opacity="0.7" />
          ))}
          <path d={g.holeD} stroke="rgba(255,255,255,0.95)" strokeWidth="1.1" />
        </g>
      </svg>
      <div className="sx-shards" aria-hidden="true">
        {g.shards.map((s, i) => (
          <span
            key={i}
            style={{
              '--dx': `${s.dx}vmin`,
              '--dy': `${s.dy}vmin`,
              '--rot': `${s.rot}deg`,
              width: s.s,
              height: s.s,
              clipPath: s.shape,
              animationDelay: `${1.9 + s.delay}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}

// Schriftzug baut sich wie eine Fallblattanzeige auf, dann fliegt das Flügel-Auto im Bogen hinter das R.
function Airline() {
  return (
    <>
      <div className="sx-air-bg" />
      <div className="sx-lockup" aria-label="Poloch Air">
        <span className="sx-air-word">
          <FlapText text="POLOCH" len={6} delay={150} />
        </span>
        <span className="sx-air-word sx-air-air">
          <FlapText text="AIR" len={3} delay={420} />
        </span>
        <span className="sx-air-slot">
          {/* X und Y getrennt animiert, mit unterschiedlicher Kurve -> eine durchgehend fließende Bahn */}
          <span className="sx-fly sx-fly-x">
            <span className="sx-fly sx-fly-y">
              <span className="sx-fly sx-fly-r">
                <PoloGlyph size={64} className="sx-glyph" />
              </span>
            </span>
          </span>
        </span>
      </div>
    </>
  );
}

export default function Splash({ mode, onDone }) {
  const [leaving, setLeaving] = useState(false);
  const reduced =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!DURATION[mode] || reduced) {
      onDone();
      return;
    }
    const t = setTimeout(onDone, DURATION[mode]);
    return () => clearTimeout(t);
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!DURATION[mode] || reduced) return null;

  const skip = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(onDone, 220);
  };

  return (
    <div className={`sx sx-${mode} ${leaving ? 'sx-leaving' : ''}`} onClick={skip} role="presentation">
      {mode === 'scheibe' ? <Scheibe /> : <Airline />}
      <span className="sx-skip">Tippen zum Überspringen</span>
    </div>
  );
}
