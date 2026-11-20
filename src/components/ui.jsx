import { useEffect, useState } from 'react';
import { tierFor } from '../lib/domain.js';

// ---------- Toasts ----------
const toastListeners = new Set();
export function toast(msg, tone = 'ok') {
  const t = { id: Math.random(), msg, tone };
  toastListeners.forEach((l) => l(t));
}
export function toastError(e) {
  toast(e?.message || String(e), 'err');
}

export function Toasts() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const on = (t) => {
      setItems((xs) => [...xs, t]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), 3200);
    };
    toastListeners.add(on);
    return () => toastListeners.delete(on);
  }, []);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// Führt eine async-Aktion aus und zeigt Fehler als Toast
export async function attempt(fn, okMsg) {
  try {
    const r = await fn();
    if (okMsg) toast(okMsg);
    return r ?? true;
  } catch (e) {
    toastError(e);
    return false;
  }
}

// ---------- Kleinteile ----------

export function TierBadge({ count, small }) {
  const t = tierFor(count);
  if (!t) return null;
  return <span className={`tier tier-${t.id} ${small ? 'tier-sm' : ''}`}>{t.name}</span>;
}

export function Section({ title, action, children }) {
  return (
    <section className="section">
      {(title || action) && (
        <div className="section-head">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const on = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        {title && <h3 className="sheet-title">{title}</h3>}
        {children}
      </div>
    </div>
  );
}

export function PlaneGlyph({ size = 18, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="-180 -140 360 280" aria-hidden="true">
      <path
        transform="scale(-1 1)"
        d="M-150 0 C-150 -14 -138 -22 -120 -22 L-30 -22 L40 -128 L78 -128 L40 -22 L120 -22 L150 -62 L176 -62 L160 0 L176 62 L150 62 L120 22 L40 22 L78 128 L40 128 L-30 22 L-120 22 C-138 22 -150 14 -150 0 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function nameOf(state, id) {
  return state.users.find((u) => u.id === id)?.name || '?';
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}
