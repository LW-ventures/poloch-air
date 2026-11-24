// App-Icon-Stil (klassisch / Polo) pro Gerät. Zusammen mit der Akzentfarbe bestimmt er,
// welches Icon das Handy beim "Zum Home-Bildschirm" übernimmt. Ein schon hinzugefügtes Icon
// ändert sich dadurch nicht – dafür muss man die App einmal entfernen und neu hinzufügen.
import { useEffect, useState } from 'react';
import { getAccent } from './accent.js';

const KEY = 'polochair:icon';
const EVENT = 'polochair:icon-change';

export const ICON_STYLES = [
  { id: 'classic', name: 'Standard' },
  { id: 'polo', name: 'Polo' },
];

export function getIconStyle() {
  try {
    return localStorage.getItem(KEY) === 'polo' ? 'polo' : 'classic';
  } catch {
    return 'classic';
  }
}

function setLink(rel, href, extra = {}) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  Object.entries(extra).forEach(([k, v]) => el.setAttribute(k, v));
  el.href = href;
}

// Setzt Homescreen-Icon, Favicon und Manifest passend zu Stil + Farbe
export function applyAppIcon(style = getIconStyle(), color = getAccent()) {
  if (style === 'classic' && color === 'orange') {
    // Standard aus index.html
    setLink('apple-touch-icon', './icon-192.png');
    setLink('icon', './icon.svg', { type: 'image/svg+xml' });
    setLink('manifest', './manifest.webmanifest');
    return;
  }
  const name = `app-${style}-${color}`;
  setLink('apple-touch-icon', `./icons/${name}-192.png`);
  setLink('icon', `./icons/${name}.svg`, { type: 'image/svg+xml' });
  setLink('manifest', `./manifests/${style}-${color}.webmanifest`);
}

export function setIconStyle(style) {
  try {
    localStorage.setItem(KEY, style);
  } catch {
    /* egal */
  }
  applyAppIcon(style);
  window.dispatchEvent(new Event(EVENT));
}

// Für Komponenten, die das App-Icon in der App zeigen
export function useIconStyle() {
  const [style, setStyle] = useState(getIconStyle);
  useEffect(() => {
    const on = () => setStyle(getIconStyle());
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return style;
}
