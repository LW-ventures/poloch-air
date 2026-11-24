// Persönliche Einstellungen (Farbe, App-Icon, Sound) zwischen Gerät und Backend abgleichen.
// Lokal wirken sie sofort; im Backend liegen sie pro Person, damit Safari, ein neues Handy oder
// eine neu hinzugefügte Homescreen-App nach dem Login automatisch dieselben Einstellungen haben.
import { api } from '../data/store.js';
import { getAccent, setAccent } from './accent.js';
import { getIconStyle, setIconStyle } from './appIcon.js';
import { soundOn, setSound } from './fx.js';

export function currentPrefs() {
  return { accent: getAccent(), iconStyle: getIconStyle(), sound: soundOn() };
}

// Im Backend speichern (still – klappt es nicht, bleibt es eben lokal)
export function pushPrefs() {
  api.savePrefs?.(currentPrefs()).catch(() => {});
}

// Nach dem Login: Einstellungen aus dem Backend übernehmen. Gibt es dort noch keine, die lokalen hochladen.
export function syncPrefsFromUser(user) {
  if (!user) return;
  const hasRemote = user.accent != null || user.iconStyle != null || user.sound != null;
  if (!hasRemote) {
    pushPrefs();
    return;
  }
  const local = currentPrefs();
  if (user.accent && user.accent !== local.accent) setAccent(user.accent);
  if (user.iconStyle && user.iconStyle !== local.iconStyle) setIconStyle(user.iconStyle);
  else if (user.accent && user.accent !== local.accent) setIconStyle(getIconStyle()); // Icon-Farbe nachziehen
  if (user.sound != null && user.sound !== local.sound) setSound(user.sound);
}
