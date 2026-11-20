import { useEffect, useState } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Fallblatt-Anzeige: jedes Zeichen klackert durch, bis es stehen bleibt.
export default function FlapText({ text, len, delay = 0, className = '' }) {
  const target = String(text ?? '')
    .toUpperCase()
    .padEnd(len || 0, ' ')
    .slice(0, len || undefined);
  const [shown, setShown] = useState(() => (reduced() ? target : target.replace(/./g, ' ')));

  useEffect(() => {
    if (reduced()) {
      setShown(target);
      return;
    }
    let frame = -Math.round(delay / 45);
    const settleAt = (i) => 3 + i * 1.6 + ((i * 7) % 5);
    // spätestes Zeichen bestimmt das Ende (settleAt ist nicht monoton)
    const last = Math.max(0, ...target.split('').map((_, i) => settleAt(i)));
    const id = setInterval(() => {
      frame++;
      if (frame < 0) return;
      setShown(
        target
          .split('')
          .map((ch, i) => {
            if (ch === ' ' || frame >= settleAt(i)) return ch;
            return CHARS[(Math.random() * CHARS.length) | 0];
          })
          .join(''),
      );
      if (frame > last) clearInterval(id);
    }, 45);
    return () => clearInterval(id);
  }, [target, delay]);

  return (
    <span className={`flap ${className}`} aria-label={target.trim()}>
      {shown.split('').map((ch, i) => (
        <span key={i} className="flap-cell" aria-hidden="true">
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  );
}
