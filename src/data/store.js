// Datenschicht: wählt das Backend (live = Supabase, test = nur im Browser) und stellt Hooks bereit.
import { useEffect, useState, useSyncExternalStore } from 'react';
import { MODE } from '../config.js';
import { createTestBackend } from './testBackend.js';
import { createLiveBackend } from './liveBackend.js';

export { MODE };

const backend = MODE === 'test' ? createTestBackend() : createLiveBackend();

export const api = backend.api;

export function useStore() {
  const snap = useSyncExternalStore(backend.subscribe, backend.getSnapshot);
  const now = useNow();
  const user = snap.data.users.find((u) => u.id === snap.userId) || null;
  return { state: snap.data, user, now, ready: snap.ready, notMember: !!snap.notMember };
}

// tickt alle 20 s, damit Status (BOARDING etc.) live umspringt
export function useNow(intervalMs = 20000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
