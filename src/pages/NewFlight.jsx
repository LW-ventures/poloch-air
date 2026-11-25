import { useState } from 'react';
import { api } from '../data/store.js';
import { go } from '../lib/router.js';
import { isoDate, flightNumber, fmtDate, flightCostCents, fmtEuro } from '../lib/domain.js';
import { whatsappText, openWhatsApp } from '../lib/share.js';
import { playChime } from '../lib/fx.js';
import { Section, attempt, nameOf, Empty } from '../components/ui.jsx';

const CUSTOM = '__custom';

function LegEditor({ label, leg, setLeg, routes }) {
  const custom = leg.routeId === CUSTOM;
  return (
    <fieldset className="leg">
      <legend>{label}</legend>
      <div className="form-row">
        <label className="field">
          <span>Strecke</span>
          <select value={leg.routeId} onChange={(e) => setLeg({ ...leg, routeId: e.target.value })}>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.fromCode} → {r.toCode} ({r.km} km)
              </option>
            ))}
            <option value={CUSTOM}>Sonderstrecke …</option>
          </select>
        </label>
        <label className="field field-time">
          <span>Abflug</span>
          <input type="time" value={leg.time} onChange={(e) => setLeg({ ...leg, time: e.target.value })} required />
        </label>
      </div>
      {custom && (
        <div className="custom-route">
          <label className="field field-code">
            <span>Von</span>
            <input maxLength={3} placeholder="HOM" value={leg.fromCode} onChange={(e) => setLeg({ ...leg, fromCode: e.target.value.toUpperCase() })} />
          </label>
          <label className="field">
            <span>Ort</span>
            <input placeholder="Zuhause" maxLength={30} value={leg.fromName} onChange={(e) => setLeg({ ...leg, fromName: e.target.value })} />
          </label>
          <label className="field field-code">
            <span>Nach</span>
            <input maxLength={3} placeholder="IKE" value={leg.toCode} onChange={(e) => setLeg({ ...leg, toCode: e.target.value.toUpperCase() })} />
          </label>
          <label className="field">
            <span>Ort</span>
            <input placeholder="Ikea" maxLength={30} value={leg.toName} onChange={(e) => setLeg({ ...leg, toName: e.target.value })} />
          </label>
          <label className="field field-km">
            <span>km</span>
            <input type="number" inputMode="decimal" min="1" max="500" step="0.1" placeholder="1–500" value={leg.km} onChange={(e) => setLeg({ ...leg, km: e.target.value })} />
          </label>
        </div>
      )}
    </fieldset>
  );
}

function resolveLeg(leg, routes, date) {
  if (leg.routeId === CUSTOM) {
    return {
      date,
      time: leg.time,
      km: Number(String(leg.km).replace(',', '.')),
      fromCode: (leg.fromCode || '').toUpperCase().padEnd(3, 'X').slice(0, 3),
      fromName: leg.fromName || leg.fromCode,
      toCode: (leg.toCode || '').toUpperCase().padEnd(3, 'X').slice(0, 3),
      toName: leg.toName || leg.toCode,
    };
  }
  const r = routes.find((x) => x.id === leg.routeId);
  return { date, time: leg.time, km: r.km, fromCode: r.fromCode, fromName: r.fromName, toCode: r.toCode, toName: r.toName };
}

export default function NewFlight({ state, user, now }) {
  const car = state.cars.find((c) => c.ownerId === user.id);
  const routes = state.routes;
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const r0 = routes[0];
  const rBack = r0 && routes.find((r) => r.fromCode === r0.toCode && r.toCode === r0.fromCode);
  const blankLeg = { routeId: CUSTOM, fromCode: '', fromName: '', toCode: '', toName: '', km: '' };

  const [date, setDate] = useState(isoDate(now.getHours() < 6 ? now : tomorrow));
  const [out, setOut] = useState({ ...blankLeg, routeId: r0?.id || CUSTOM, time: '07:15' });
  const [withBack, setWithBack] = useState(true);
  const [back, setBack] = useState({ ...blankLeg, routeId: rBack?.id || r0?.id || CUSTOM, time: '16:30' });
  const [seats, setSeats] = useState(car?.seats || 3);
  const [note, setNote] = useState('');
  const [created, setCreated] = useState(null);

  if (!car) {
    return (
      <div className="page">
        <Empty>Ohne Flugzeug kein Flug. Leg erst im Profil dein Auto an.</Empty>
        <button className="btn btn-primary" onClick={() => go('/profil')}>Zum Profil</button>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    const legs = [resolveLeg(out, routes, date)];
    if (withBack) legs.push(resolveLeg(back, routes, date));
    const flights = await attempt(() => api.createFlights({ carId: car.id, legs, seats: Number(seats), note }));
    if (flights) {
      playChime();
      setCreated(flights);
    }
  };

  if (created) {
    return (
      <div className="page">
        <div className="announce-done">
          <div className="chime" aria-hidden="true">✦</div>
          <h1>Ding-Dong.</h1>
          <p>
            {created.length === 1 ? 'Dein Flug steht' : 'Deine Flüge stehen'} auf der Abflugtafel:
          </p>
          <ul className="done-list">
            {created.map((f) => (
              <li key={f.id}>
                <b>{flightNumber(f)}</b> · {fmtDate(f.date)} · {f.time} · {f.fromCode} → {f.toCode}
              </li>
            ))}
          </ul>
          <button className="btn btn-wa btn-block btn-big" onClick={() => openWhatsApp(whatsappText(created, nameOf(state, user.id)))}>
            In WhatsApp-Gruppe teilen
          </button>
          <button className="btn btn-ghost btn-block" onClick={() => go('/')}>Zur Abflugtafel</button>
        </div>
      </div>
    );
  }

  let preview = null;
  try {
    const l = resolveLeg(out, routes, date);
    if (l.km > 0) preview = flightCostCents({ km: l.km, consumption: car.consumption, fuelPrice: car.fuelPrice });
  } catch {
    /* unvollständig */
  }

  return (
    <div className="page">
      <button className="back" onClick={() => go('/')}>‹ Abflugtafel</button>
      <h1 className="page-title">Neuen Flug ankündigen</h1>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Datum</span>
          <input type="date" value={date} min={isoDate(now)} max={isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 60))} onChange={(e) => setDate(e.target.value)} required />
        </label>

        <LegEditor label="Hinflug" leg={out} setLeg={setOut} routes={routes} />

        <label className="toggle">
          <input type="checkbox" checked={withBack} onChange={(e) => setWithBack(e.target.checked)} />
          <span>Rückflug am selben Tag</span>
        </label>
        {withBack && <LegEditor label="Rückflug" leg={back} setLeg={setBack} routes={routes} />}

        <label className="field">
          <span>Freie Plätze</span>
          <select value={seats} onChange={(e) => setSeats(e.target.value)}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} {n === 4 ? '(inkl. Mittelsitz)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Gate-Info (optional)</span>
          <input placeholder="z. B. Treffpunkt vor der Bäckerei" value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} />
        </label>

        <p className="hint">
          {car.name}
          {car.nickname ? ` „${car.nickname}“` : ''} · {String(car.consumption).replace('.', ',')} l/100 km · {fmtEuro(car.fuelPrice * 100)}/l
          {preview != null && <> · Spritkosten Hinflug ca. <b>{fmtEuro(preview)}</b></>}
          {' · '}
          <button type="button" className="link-btn" onClick={() => go('/profil')}>Spritpreis ändern</button>
        </p>

        <button className="btn btn-primary btn-block btn-big" type="submit">
          {withBack ? 'Beide Flüge ankündigen' : 'Flug ankündigen'}
        </button>
      </form>
    </div>
  );
}
