import { useUpdateAvailable, applyUpdate } from '../lib/update.js';

export default function UpdateBanner() {
  const available = useUpdateAvailable();
  if (!available) return null;
  return (
    <button className="update-banner" onClick={applyUpdate}>
      <span aria-hidden="true">✈️</span>
      <span>
        <b>Neue Version gelandet</b>
        <small>Tippen zum Aktualisieren</small>
      </span>
    </button>
  );
}
