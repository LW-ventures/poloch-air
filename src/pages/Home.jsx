import { api } from '../data/store.js';
import { go } from '../lib/router.js';
import {
  departureAt, endOfFlightDay, driverTasks, myBalances, roundEuro, flightNumber, fmtDate, seatInfo, isoDate,
} from '../lib/domain.js';
import BoardingPass from '../components/BoardingPass.jsx';
import DepartureBoard from '../components/DepartureBoard.jsx';
import { Section, attempt, nameOf, Empty } from '../components/ui.jsx';

export function myUpcoming(state, user, now) {
  const flights = new Map(state.flights.map((f) => [f.id, f]));
  return state.bookings
    .filter((b) => b.userId === user.id && b.status === 'booked')
    .map((b) => ({ booking: b, flight: flights.get(b.flightId) }))
    .filter(({ flight }) => flight && now <= endOfFlightDay(flight))
    .sort((a, b) => departureAt(a.flight) - departureAt(b.flight));
}

function greeting(now) {
  const h = now.getHours();
  if (h < 5) return 'Nachtflug';
  if (h < 11) return 'Moin';
  if (h < 17) return 'Servus';
  return 'Guten Abend';
}

export default function Home({ state, user, now }) {
  const passes = myUpcoming(state, user, now);
  const [first, ...rest] = passes;
  const tasks = driverTasks(state, user.id, now);
  const balances = myBalances(state, user.id).filter((b) => Math.abs(b.cents) >= 1);
  const hasCar = state.cars.some((c) => c.ownerId === user.id);

  return (
    <div className="page">
      <div className="hello">
        <h1>
          {greeting(now)}, {user.name}.
        </h1>
        <p>{fmtDate(isoDate(now), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {tasks.count > 0 && (
        <button className="task-banner" onClick={() => go(tasks.unclear.length ? '/aufgaben' : '/konto')}>
          <span className="task-dot">{tasks.count}</span>
          <span>
            <b>Captain, es gibt was zu klären.</b>
            <small>
              {[
                tasks.payments.length && `${tasks.payments.length} Zahlung${tasks.payments.length > 1 ? 'en' : ''} bestätigen`,
                tasks.unclear.length && `${tasks.unclear.length} Ticket${tasks.unclear.length > 1 ? 's' : ''} nicht entwertet`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </small>
          </span>
          <span aria-hidden="true">›</span>
        </button>
      )}

      <Section title="Deine Boarding Passes">
        {!first && (
          <Empty>
            Kein Ticket gebucht. Schau auf die Abflugtafel. Vielleicht hebt das Poloch bald ab.
          </Empty>
        )}
        {first && (
          <>
            <BoardingPass
              state={state}
              flight={first.flight}
              booking={first.booking}
              now={now}
              onTear={() => attempt(() => api.tear(first.booking.id), 'Willkommen an Bord! Bitte anschnallen.')}
            />
            <button className="link-btn pass-more" onClick={() => go(`/flight/${first.flight.id}`)}>
              {first.booking.boardedAt ? 'Flugdetails ›' : 'Sitz wechseln oder stornieren ›'}
            </button>
          </>
        )}
        {rest.length > 0 && (
          <ul className="mini-passes">
            {rest.map(({ booking, flight }) => (
              <li key={booking.id}>
                <button className={`mini-pass ${flight.status === 'cancelled' ? 'is-cancelled' : ''}`} onClick={() => go(`/flight/${flight.id}`)}>
                  <span className="mini-codes">
                    {flight.fromCode}
                    <i>→</i>
                    {flight.toCode}
                  </span>
                  <span className="mini-info">
                    <b>{flightNumber(flight)}</b> · {fmtDate(flight.date)} · {flight.time}
                    <small>
                      Sitz {booking.seat} · {seatInfo(booking.seat).cls}
                      {flight.status === 'cancelled' ? ' · GESTRICHEN' : flight.delayMin ? ` · +${flight.delayMin} min` : ''}
                    </small>
                  </span>
                  <span className="mini-tear" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <button className={`announce-btn ${hasCar ? '' : 'announce-btn-ghost'}`} onClick={() => go(hasCar ? '/neu' : '/profil')}>
        <span className="announce-plus" aria-hidden="true">+</span>
        <span>
          <b>Neuen Flug ankündigen</b>
          <small>{hasCar ? 'Du fliegst? Sag den anderen Bescheid.' : 'Dafür erst im Profil ein Auto hinterlegen.'}</small>
        </span>
      </button>

      <Section>
        <DepartureBoard state={state} user={user} now={now} />
      </Section>

      <Section title="Kontostand" action={<button className="link-btn" onClick={() => go('/konto')}>Polochrechner ›</button>}>
        {balances.length === 0 ? (
          <Empty>Alles ausgeglichen. Niemand schuldet hier irgendwem was.</Empty>
        ) : (
          <ul className="balance-list">
            {balances.slice(0, 3).map(({ otherId, cents }) => (
              <BalanceLine key={otherId} name={nameOf(state, otherId)} cents={cents} />
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

export function BalanceLine({ name, cents, children }) {
  const euro = roundEuro(Math.abs(cents));
  const iOwe = cents > 0;
  return (
    <li className={`balance ${iOwe ? 'balance-owe' : 'balance-credit'}`}>
      <span className="balance-text">
        <span>
          {euro === 0 ? (
            <>Mit <b>{name}</b> quasi quitt</>
          ) : iOwe ? (
            <>Du schuldest <b>{name}</b></>
          ) : (
            <><b>{name}</b> schuldet dir</>
          )}
        </span>
        <small>genau {(Math.abs(cents) / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</small>
      </span>
      <span className="balance-amount">~{euro} €</span>
      {children}
    </li>
  );
}
