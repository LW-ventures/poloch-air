import { Fragment } from 'react';
import FlapText from './FlapText.jsx';
import { go } from '../lib/router.js';
import { flightNumber, flightStatus, departureAt, activeBookings, isoDate, fmtDate } from '../lib/domain.js';
import { nameOf } from './ui.jsx';

export default function DepartureBoard({ state, user, now, limit = 8 }) {
  const today = isoDate(now);
  const tomorrow = isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const flights = state.flights
    .filter((f) => f.date >= today)
    .filter((f) => f.status !== 'cancelled' || departureAt(f) > now)
    .sort((a, b) => departureAt(a) - departureAt(b))
    .slice(0, limit);

  const dayLabel = (d) =>
    d === today ? 'Heute' : d === tomorrow ? 'Morgen' : fmtDate(d, { weekday: 'long', day: '2-digit', month: '2-digit' });

  let lastDay = null;
  return (
    <div className="board">
      <div className="board-head">
        <span className="board-title">Abflug · Departures</span>
        <span className="board-clock">
          {now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className="board-row board-labels" aria-hidden="true">
        <span>Zeit</span>
        <span>Flug</span>
        <span>Nach</span>
        <span>Status</span>
      </div>
      {flights.length === 0 && <div className="board-empty">Keine Abflüge geplant. Der Poloch schläft.</div>}
      {flights.map((f, i) => {
        const st = flightStatus(state, f, now);
        const mine = activeBookings(state, f.id).some((b) => b.userId === user.id);
        const pilot = f.driverId === user.id;
        const showDay = f.date !== lastDay;
        lastDay = f.date;
        const d = i * 70;
        return (
          <Fragment key={f.id}>
            {showDay && <div className="board-day">{dayLabel(f.date)}</div>}
            <button
              className={`board-row board-flight ${mine ? 'is-mine' : ''} ${pilot ? 'is-pilot' : ''}`}
              onClick={() => go(`/flight/${f.id}`)}
              aria-label={`${flightNumber(f)} um ${f.time} nach ${f.toName}, ${st.code}${mine ? ', gebucht' : ''}`}
            >
              <FlapText text={f.time} len={5} delay={d} />
              <FlapText text={flightNumber(f).replace(' ', '')} len={6} delay={d + 40} />
              <span className="board-dest">
                <FlapText text={f.toCode} len={3} delay={d + 80} />
              </span>
              <span className={`board-status tone-${st.tone} ${st.blink ? 'blink' : ''}`}>
                <FlapText text={st.code} len={9} delay={d + 120} />
              </span>
              <span className="board-sub">
                {f.toName} · {pilot ? 'Du bist Pilot' : `Pilot ${nameOf(state, f.driverId)}`}
                {mine && <b className="board-mine"> · Dein Ticket</b>}
              </span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
