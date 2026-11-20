// Akzentfarbe: Poloch-Orange oder Musikbox-Türkis. Gilt pro Gerät (localStorage).
const KEY = 'polochair:accent';

export const ACCENTS = [
  { id: 'orange', name: 'Poloch-Orange', color: '#ff7a3d' },
  { id: 'tuerkis', name: 'Musikbox-Türkis', color: '#1ccfc9' },
];

export function getAccent() {
  try {
    return localStorage.getItem(KEY) === 'tuerkis' ? 'tuerkis' : 'orange';
  } catch {
    return 'orange';
  }
}

export function applyAccent(id = getAccent()) {
  const root = document.documentElement;
  if (id === 'tuerkis') root.dataset.accent = 'tuerkis';
  else delete root.dataset.accent;
}

export function setAccent(id) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* egal */
  }
  applyAccent(id);
}
