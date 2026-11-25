import { useState } from 'react';
import { api, MODE } from '../data/store.js';
import { go } from '../lib/router.js';
import { soundOn, setSound, playChime } from '../lib/fx.js';
import { ACCENTS, getAccent, setAccent } from '../lib/accent.js';
import { ICON_STYLES, applyAppIcon, setIconStyle, useIconStyle } from '../lib/appIcon.js';
import { AppIcon } from '../components/Polo.jsx';
import { pushPrefs } from '../lib/prefs.js';
import { fmtEuro } from '../lib/domain.js';
import { Section, attempt, Empty, toastError } from '../components/ui.jsx';

const num = (v) => Number(String(v).replace(',', '.'));
const de = (n) => (n == null || n === '' ? '' : String(n).replace('.', ','));

export default function Profile({ state, user }) {
  const car = state.cars.find((c) => c.ownerId === user.id);
  // Werte bei jedem Rendern frisch lesen, damit Übernahmen aus dem Backend sofort sichtbar sind
  const [, rerender] = useState(0);
  const sound = soundOn();
  const accent = getAccent();
  const setSoundState = () => rerender((n) => n + 1);
  const setAccentState = () => rerender((n) => n + 1);
  const iconStyle = useIconStyle();

  return (
    <div className="page">
      <h1 className="page-title">Profil</h1>

      <Section title={car ? 'Dein Flugzeug' : 'Auto hinterlegen'}>
        {!car && <p className="page-lead">Nur nötig, wenn du selbst mal fährst. Dann kannst du Flüge ankündigen.</p>}
        <CarForm car={car} key={car?.updatedAt || 'new'} />
      </Section>

      {car && (
        <Section title="Strecken">
          <Routes state={state} />
        </Section>
      )}

      <Section title="Einstellungen">
        <div className="accent-pick" role="radiogroup" aria-label="Akzentfarbe">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              role="radio"
              aria-checked={accent === a.id}
              className={`accent-opt ${accent === a.id ? 'is-on' : ''}`}
              onClick={() => {
                setAccent(a.id);
                setAccentState(a.id);
                applyAppIcon(iconStyle, a.id);
                pushPrefs();
              }}
            >
              <i style={{ background: a.color }} />
              {a.name}
            </button>
          ))}
        </div>

        <div className="icon-pick-block">
          <span className="icon-pick-label">App-Icon</span>
          <div className="icon-pick" role="radiogroup" aria-label="App-Icon">
            {ICON_STYLES.map((s) => (
              <button
                key={s.id}
                role="radio"
                aria-checked={iconStyle === s.id}
                className={`icon-opt ${iconStyle === s.id ? 'is-on' : ''}`}
                onClick={() => {
                  setIconStyle(s.id);
                  pushPrefs();
                }}
              >
                <AppIcon size={56} variant={s.id} />
                <span>{s.name}</span>
              </button>
            ))}
          </div>
          <p className="hint">
            Das Icon auf dem Homescreen ändert sich nicht von selbst. Für ein anderes Icon oder die andere Farbe dort:
            Polochrechner vom Homescreen entfernen, in Safari bzw. Chrome einloggen und neu hinzufügen. Deine Auswahl ist
            dort automatisch schon gesetzt.
          </p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={sound}
            onChange={(e) => {
              setSound(e.target.checked);
              setSoundState(e.target.checked);
              pushPrefs();
              if (e.target.checked) playChime();
            }}
          />
          <span>Sounds (Ticketdrucker, Durchsage)</span>
        </label>
        <button className="btn btn-ghost btn-block" onClick={() => window.dispatchEvent(new Event('polochair:briefing'))}>
          Sicherheitseinweisung nochmal ansehen
        </button>
        <p className="hint">
          Tipp: Im Browser-Menü „Zum Startbildschirm hinzufügen“ – dann startet Poloch Air wie eine echte App.
        </p>
      </Section>

      {MODE === 'live' && (
        <Section title="Passwort ändern">
          <PasswordForm />
        </Section>
      )}

      <div className="row-actions">
        {user.isAdmin && (
          <button className="btn" onClick={() => go('/admin')}>Admin-Bereich</button>
        )}
        <button className="btn btn-ghost" onClick={() => api.logout()}>
          {MODE === 'test' ? 'Person wechseln' : 'Abmelden'}
        </button>
      </div>
    </div>
  );
}

function PasswordForm() {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (pw !== pw2) {
      toastError(new Error('Die beiden Passwörter sind nicht gleich.'));
      return;
    }
    if (await attempt(() => api.changePassword(pw), 'Neues Passwort gespeichert.')) {
      setPw('');
      setPw2('');
    }
  };
  return (
    <form className="form card" onSubmit={submit}>
      <label className="field">
        <span>Neues Passwort</span>
        <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} required />
      </label>
      <label className="field">
        <span>Nochmal</span>
        <input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={6} required />
      </label>
      <button className="btn btn-block" type="submit">Passwort ändern</button>
    </form>
  );
}

function CarForm({ car }) {
  const [f, setF] = useState({
    name: car?.name || '',
    nickname: car?.nickname || '',
    consumption: de(car?.consumption ?? ''),
    seats: car?.seats || 3,
    fuelPrice: de(car?.fuelPrice ?? ''),
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = (e) => {
    e.preventDefault();
    attempt(
      () => api.saveCar({ ...f, consumption: num(f.consumption), fuelPrice: num(f.fuelPrice), seats: Number(f.seats) }),
      'Gespeichert. Gilt ab dem nächsten angekündigten Flug.',
    );
  };

  return (
    <form className="form card" onSubmit={save}>
      {car && (
        <div className="fuel-quick">
          <span className="pf-label">Grad getankt?</span>
          <div className="fuel-row">
            <label className="field field-grow">
              <span>Spritpreis €/l (1,00–3,50)</span>
              <input inputMode="decimal" value={f.fuelPrice} onChange={set('fuelPrice')} placeholder="1,79" maxLength={5} />
            </label>
            <button className="btn btn-primary" type="submit">Preis speichern</button>
          </div>
          <small className="hint">Aktuell {fmtEuro(car.fuelPrice * 100)}/l · zuletzt geändert {new Date(car.updatedAt).toLocaleDateString('de-DE')}</small>
        </div>
      )}
      <div className="form-row">
        <label className="field">
          <span>Auto</span>
          <input value={f.name} onChange={set('name')} placeholder="VW Polo" maxLength={30} required />
        </label>
        <label className="field">
          <span>Spitzname</span>
          <input value={f.nickname} onChange={set('nickname')} placeholder="Poloch" maxLength={30} />
        </label>
      </div>
      <div className="form-row">
        <label className="field">
          <span>Verbrauch (2–20 l/100km)</span>
          <input inputMode="decimal" value={f.consumption} onChange={set('consumption')} placeholder="6,2" maxLength={5} required />
        </label>
        <label className="field">
          <span>Freie Plätze</span>
          <select value={f.seats} onChange={set('seats')}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      {!car && (
        <label className="field">
          <span>Spritpreis €/l (1,00–3,50)</span>
          <input inputMode="decimal" value={f.fuelPrice} onChange={set('fuelPrice')} placeholder="1,79" maxLength={5} required />
        </label>
      )}
      <button className="btn btn-block" type="submit">{car ? 'Auto speichern' : 'Auto anlegen'}</button>
    </form>
  );
}

function Routes({ state }) {
  const [edit, setEdit] = useState(null);
  const blank = { fromCode: '', fromName: '', toCode: '', toName: '', km: '' };

  const save = async (e) => {
    e.preventDefault();
    const ok = await attempt(() => api.saveRoute({ ...edit, km: num(edit.km) }), 'Strecke gespeichert.');
    if (ok) setEdit(null);
  };

  return (
    <>
      {state.routes.length === 0 && <Empty>Noch keine Strecke. Leg z. B. Zuhause → Arbeit an.</Empty>}
      <ul className="routes">
        {state.routes.map((r) => (
          <li key={r.id}>
            <span className="route-codes">{r.fromCode} → {r.toCode}</span>
            <span className="route-names">
              {r.fromName} → {r.toName}
              <small>{de(r.km)} km</small>
            </span>
            <button className="chip" onClick={() => setEdit({ ...r, km: de(r.km) })}>bearbeiten</button>
          </li>
        ))}
      </ul>
      {edit ? (
        <form className="form card" onSubmit={save}>
          <div className="custom-route">
            <label className="field field-code">
              <span>Von</span>
              <input maxLength={3} value={edit.fromCode} onChange={(e) => setEdit({ ...edit, fromCode: e.target.value.toUpperCase() })} placeholder="HOM" required />
            </label>
            <label className="field">
              <span>Ort</span>
              <input value={edit.fromName} onChange={(e) => setEdit({ ...edit, fromName: e.target.value })} placeholder="Zuhause" maxLength={30} required />
            </label>
            <label className="field field-code">
              <span>Nach</span>
              <input maxLength={3} value={edit.toCode} onChange={(e) => setEdit({ ...edit, toCode: e.target.value.toUpperCase() })} placeholder="WRK" required />
            </label>
            <label className="field">
              <span>Ort</span>
              <input value={edit.toName} onChange={(e) => setEdit({ ...edit, toName: e.target.value })} placeholder="Arbeit" maxLength={30} required />
            </label>
            <label className="field field-km">
              <span>km</span>
              <input inputMode="decimal" value={edit.km} onChange={(e) => setEdit({ ...edit, km: e.target.value })} placeholder="1–500" maxLength={5} required />
            </label>
          </div>
          <div className="row-actions">
            <button className="btn btn-primary" type="submit">Speichern</button>
            {!edit.id && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEdit({ ...edit, fromCode: edit.toCode, fromName: edit.toName, toCode: edit.fromCode, toName: edit.fromName })}
              >
                ⇄ umdrehen
              </button>
            )}
            {edit.id && (
              <button
                type="button"
                className="btn btn-ghost btn-danger"
                onClick={async () => {
                  if (!window.confirm('Strecke löschen? Alte Flüge bleiben erhalten.')) return;
                  if (await attempt(() => api.deleteRoute(edit.id), 'Gelöscht.')) setEdit(null);
                }}
              >
                Löschen
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>Abbrechen</button>
          </div>
        </form>
      ) : (
        <button className="btn btn-ghost btn-block" onClick={() => setEdit(blank)}>+ Strecke hinzufügen</button>
      )}
    </>
  );
}
