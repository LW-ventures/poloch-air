import { useEffect, useState } from 'react';
import { api, MODE } from '../data/store.js';
import { go } from '../lib/router.js';
import { Section, attempt } from '../components/ui.jsx';
import { SPLASHES } from '../components/Splash.jsx';

// "heute 19:24", "gestern 07:10", "18.11. 16:31", "noch nie"
function lastSeen(iso, now = new Date()) {
  if (!iso) return 'noch nie eingeloggt';
  const d = new Date(iso);
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  const when = diff === 0 ? 'heute' : diff === 1 ? 'gestern' : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  return `zuletzt eingeloggt ${when} ${time}`;
}

export default function Admin({ state }) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const [seen, setSeen] = useState(null); // { userId: lastSignInAt } – nur live

  useEffect(() => {
    api.crewStatus().then(setSeen).catch(() => setSeen(null));
  }, []);

  const add = async (e) => {
    e.preventDefault();
    if (await attempt(() => api.addUser(name), `${name} ist jetzt an Bord.`)) setName('');
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `poloch-air-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="page">
      <button className="back" onClick={() => go('/profil')}>‹ Profil</button>
      <h1 className="page-title">Tower</h1>
      <p className="page-lead">Admin-Bereich. Hier legst du Personen an und kannst im Notfall alles korrigieren. Als Admin darfst du auf jeder Flugseite auch die Pilot-Funktionen nutzen.</p>

      <Section title="Crew">
        <ul className="routes">
          {state.users.map((u) => (
            <li key={u.id}>
              {editing?.id === u.id ? (
                <form
                  className="inline-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (await attempt(() => api.renameUser(u.id, editing.name), 'Umbenannt.')) setEditing(null);
                  }}
                >
                  <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
                  <button className="chip chip-yes" type="submit">ok</button>
                </form>
              ) : (
                <>
                  <span className="route-names">
                    {u.name}
                    <small>
                      {u.isAdmin ? 'Admin' : state.cars.some((c) => c.ownerId === u.id) ? 'Captain' : 'Passagier'}
                      {seen && ` · ${lastSeen(seen[u.id])}`}
                    </small>
                  </span>
                  <button className="chip" onClick={() => setEditing({ id: u.id, name: u.name })}>umbenennen</button>
                </>
              )}
            </li>
          ))}
        </ul>
        {MODE === 'test' ? (
          <form className="inline-form" onSubmit={add}>
            <input placeholder="Neue Person" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn btn-primary" type="submit" disabled={!name.trim()}>Hinzufügen</button>
          </form>
        ) : (
          <p className="hint">
            Neue Person: im Supabase-Dashboard unter Authentication → Add user mit <code>vorname@polochair.local</code>{' '}
            anlegen („Auto Confirm User“ an). Die Person wird automatisch freigeschaltet, der Name kommt aus der Adresse.
          </p>
        )}
      </Section>

      <Section title="Startanimation für alle">
        <div className="splash-picks">
          {SPLASHES.map((s) => {
            const on = (state.settings?.splash || 'scheibe') === s.id;
            return (
              <div key={s.id} className={`splash-pick ${on ? 'is-on' : ''}`}>
                <button
                  className="splash-pick-main"
                  onClick={() => attempt(() => api.setSettings({ splash: s.id }), `Startanimation: ${s.name}`)}
                  aria-pressed={on}
                >
                  <b>{s.name}</b>
                  <small>{s.desc}</small>
                </button>
                {s.id !== 'none' && (
                  <button
                    className="chip"
                    onClick={() => window.dispatchEvent(new CustomEvent('polochair:splash', { detail: s.id }))}
                  >
                    ▶ Vorschau
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="hint">Gilt beim nächsten Öffnen der App für alle. Wer tippt, überspringt sie.</p>
      </Section>

      <Section title="Daten">
        <div className="row-actions">
          <button className="btn" onClick={exportJson}>Backup herunterladen</button>
          {MODE === 'test' && (
            <button
              className="btn btn-ghost btn-danger"
              onClick={() => {
                if (window.confirm('Alle Testdaten verwerfen und Demo neu erzeugen?')) {
                  api.resetDemo();
                  go('/');
                }
              }}
            >
              Demo zurücksetzen
            </button>
          )}
        </div>
      </Section>
    </div>
  );
}
