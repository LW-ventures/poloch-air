// Erkennt, ob eine neuere Version der App online ist.
// Geprüft wird beim Start, beim Zurückwechseln in die App und alle 15 Minuten.
import { useEffect, useState } from 'react';

const CURRENT = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev'; // eslint-disable-line no-undef

async function latestBuild() {
  const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()).build || null;
}

export function useUpdateAvailable() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) return undefined; // im Dev-Server gibt es keine version.json
    let stopped = false;
    const check = async () => {
      try {
        const latest = await latestBuild();
        if (!stopped && latest && latest !== CURRENT) setAvailable(true);
      } catch {
        /* offline o. ä. – nächstes Mal */
      }
    };
    check();
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(check, 15 * 60 * 1000);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, []);

  return available;
}

export function applyUpdate() {
  window.location.reload();
}
