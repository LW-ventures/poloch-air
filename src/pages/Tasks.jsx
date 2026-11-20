import { api } from '../data/store.js';
import { go } from '../lib/router.js';
import { driverTasks, flightNumber, fmtDate, fmtEuro } from '../lib/domain.js';
import { Section, attempt, nameOf, Empty } from '../components/ui.jsx';

export default function Tasks({ state, user, now }) {
  const { payments, unclear } = driverTasks(state, user.id, now);

  return (
    <div className="page">
      <button className="back" onClick={() => go('/')}>‹ Abflugtafel</button>
      <h1 className="page-title">Captain's Log</h1>
      {payments.length + unclear.length === 0 && <Empty>Alles erledigt. Guten Flug!</Empty>}

      {unclear.length > 0 && (
        <Section title="Nicht entwertete Tickets">
          <p className="page-lead">Gebucht, aber nicht abgerissen. War die Person trotzdem dabei?</p>
          <ul className="pay-list">
            {unclear.map(({ booking, flight }) => (
              <li key={booking.id} className="pay pay-pending">
                <span>
                  <b>{nameOf(state, booking.userId)} · {flightNumber(flight)}</b>
                  <small>{fmtDate(flight.date)} · {flight.time} · {flight.fromCode}→{flight.toCode} · Sitz {booking.seat}</small>
                </span>
                <span className="pay-actions">
                  <button className="chip chip-yes" onClick={() => attempt(() => api.setVerdict(booking.id, 'flown'), 'Als mitgeflogen verbucht.')}>War dabei</button>
                  <button className="chip chip-no" onClick={() => attempt(() => api.setVerdict(booking.id, 'noshow'), 'Kein Anteil berechnet.')}>Nicht</button>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {payments.length > 0 && (
        <Section title="Zahlungen bestätigen">
          <ul className="pay-list">
            {payments.map((p) => (
              <li key={p.id} className="pay pay-pending">
                <span>
                  <b>{nameOf(state, p.fromId)}: {fmtEuro(p.cents)}</b>
                  {p.note && <small>„{p.note}“</small>}
                </span>
                <span className="pay-actions">
                  <button className="chip chip-yes" onClick={() => attempt(() => api.resolvePayment(p.id, true), 'Verbucht.')}>Erhalten</button>
                  <button className="chip chip-no" onClick={() => attempt(() => api.resolvePayment(p.id, false), 'Abgelehnt.')}>Nein</button>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
