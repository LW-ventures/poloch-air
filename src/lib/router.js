import { useEffect, useState } from 'react';

// Hash-Routing (#/flight/123) – funktioniert auf GitHub Pages ohne Server-Konfiguration.
function parse() {
  const h = window.location.hash.replace(/^#/, '') || '/';
  const parts = h.split('/').filter(Boolean);
  return { path: h, parts };
}

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function go(path) {
  window.location.hash = path;
}

export function appUrl(path = '/') {
  const base = window.location.href.split('#')[0];
  return `${base}#${path}`;
}
