import { useState } from 'react';
import { api } from '../data/store.js';
import { go } from '../lib/router.js';
import {
  flightNumber, flightStatus, fmtDate, fmtTime, departureAt, canBook, activeBookings, freeSeats,
  estimateShareCents, flightCostCents, shareCents, fmtEuro, isFlown, seatInfo,
} from '../lib/domain.js';
import { whatsappText, openWhatsApp } from '../lib/share.js';
import BoardingPass from '../components/BoardingPass.jsx';
import SeatMap from '../components/SeatMap.jsx';
import FlapText from '../components/FlapText.jsx';
import { Section, attempt, nameOf, Empty, toast } from '../components/ui.jsx';

export default function FlightPage({ state, user, now, flightId }) {
  const flight = state.flights.find((f) => f.id === flightId);
  const [printing, setPrinting] = useState(null);
  const [seat, setSeat] = useState(null);
  const [changing, setChanging] = useState(false);

  if (!flight) {
    return (
      <div className="page">
        <Empty>Diesen Flug gibt es nicht (mehr).</Empty>
        <button className="btn" onClick={() => go('/')}>Zur Abflugtafel</button>
      </div>
    );
  }

  const st = flightStatus(state, flight, now);
  const isPilot = flight.driverId === user.id;
  const myBooking = activeBookings(state, flight.id).find((b) => b.userId === user.id);
  const bookable = canBook(flight, now);
  const free = freeSeats(state, flight);
  const dep = departureAt(flight);

  const doBook = async () => {
    const b = await attempt(() => api.book(flight.id, seat));
    if (b) {
      setPrinting(b.id);
      setSeat(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const doChange = async () => {
    const ok = await attempt(() => api.changeSeat(myBooking.id, seat), `Umgesetzt auf ${seat}.`);
    if (ok) {
      setChanging(false);
      setSeat(null);
    }
  };
  const doCancel = async () => {
    if (!window.confirm('Ticket wirklich stornieren?')) return;
    await attempt(() => api.cancelBooking(myBooking.id), 'Storniert. Der Platz ist wieder frei.');
  };

  return (
    <div className="page">
      <button className="back" onClick={() => go('/')}>‹ Abflugtafel</button>

      <header className="flight-head">
        <div className="flight-codes">
          <span>{flight.fromCode}</span>
          <i aria-hidden="true">→</i>
          <span>{flight.toCode}</span>
        </div>
        <p className="flight-sub">
          <b>{flightNumber(flight)}</b> · {fmtDate(flight.date, { weekday: 'long', day: '2-digit', month: '2-digit' })} · {fmtTime(dep)}
          {flight.delayMin > 0 && <span className="pass-delay"> (+{flight.delayMin})</span>}
        </p>
        <p className="flight-sub2">
          {flight.fromName} → {flight.toName} · {flight.km} km · Captain {isPilot ? 'du' : nameOf(state, flight.driverId)}
        </p>
        <div className={`flight-status tone-${st.tone} ${st.blink ? 'blink' : ''}`}>
          <FlapText text={st.code} len={10} />
        </div>
        {flight.note && <p className="flight-note">Gate: {flight.note}</p>}
      </header>

      {isPilot ? (
        <PilotPanel state={state} user={user} now={now} flight={flight} />
      ) : myBooking ? (
        <Section title="Dein Boarding Pass">
          <BoardingPass
            state={state}
            flight={flight}
            booking={myBooking}
            now={now}
            printing={printing === myBooking.id}
            onPrinted={() => setPrinting(null)}
            onTear={() => attempt(() => api.tear(myBooking.id), 'Willkommen an Bord! Bitte anschnallen.')}
          />
          {bookable && !myBooking.boardedAt && printing !== myBooking.id && (
            <div className="row-actions">
              <button className="btn btn-ghost" onClick={() => { setChanging((c) => !c); setSeat(null); }}>
                {changing ? 'Doch nicht' : 'Sitz wechseln'}
              </button>
              <button className="btn btn-ghost btn-danger" onClick={doCancel}>Stornieren</button>
            </div>
          )}
          {changing && (
            <div className="card">
              <SeatMap state={state} flight={flight} selected={seat} onSelect={setSeat} myBookingId={myBooking.id} />
              <button className="btn btn-primary btn-block" disabled={!seat} onClick={doChange}>
                {seat ? `Auf ${seat} umsetzen` : 'Freien Sitz wählen'}
              </button>
            </div>
          )}
        </Section>
      ) : bookable ? (
        <Section title="Sitzplatz wählen">
          <div className="card">
            <SeatMap state={state} flight={flight} selected={seat} onSelect={setSeat} />
            {free.length === 0 ? (
              <Empty>Ausgebucht. Vielleicht storniert noch jemand.</Empty>
            ) : (
              <>
                <p className="estimate">
                  Dein Anteil ca. <b>{fmtEuro(estimateShareCents(state, flight, true))}</b>
                  <small> – hängt davon ab, wie viele wirklich mitfliegen</small>
                </p>
                <button className="btn btn-primary btn-block btn-big" disabled={!seat} onClick={doBook}>
                  {seat ? `Ticket buchen · Sitz ${seat}` : 'Erst einen Sitz antippen'}
                </button>
              </>
            )}
          </div>
        </Section>
      ) : (
        <Empty>
          {flight.status === 'cancelled' ? 'Dieser Flug wurde gestrichen.' : 'Boarding geschlossen. Dieser Flug ist weg.'}
        </Empty>
      )}

      {!isPilot && <Manifest state={state} flight={flight} />}

      {!isPilot && user.isAdmin && (
        <details className="tower">
          <summary>Tower: Pilot-Funktionen (Admin)</summary>
          <PilotPanel state={state} user={user} now={now} flight={flight} />
        </details>
      )}
    </div>
  );
}

function Manifest({ state, flight }) {
  const list = activeBookings(state, flight.id).sort((a, b) => a.seat.localeCompare(b.seat));
  if (!list.length) return null;
  return (
    <Section title="Passagiere">
      <ul className="manifest">
        {list.map((b) => (
          <li key={b.id}>
            <span className="manifest-seat">{b.seat}</span>
            <span className="manifest-name">{nameOf(state, b.userId)}</span>
            <span className="manifest-state">{isFlown(b) ? 'an Bord' : 'gebucht'}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function PilotPanel({ state, user, now, flight }) {
  const list = activeBookings(state, flight.id).sort((a, b) => a.seat.localeCompare(b.seat));
  const departed = now >= departureAt(flight);
  const cancelled = flight.status === 'cancelled';
  const cost = flightCostCents(flight);
  const share = shareCents(state, flight);

  const share2wa = () => {
    openWhatsApp(whatsappText([flight], nameOf(state, user.id)));
  };
  const delay = (min) => attempt(() => api.setDelay(flight.id, min), min ? `Neue Abflugzeit: +${min} min` : 'Wieder pünktlich.');
  const cancel = async () => {
    if (!window.confirm('Flug wirklich streichen? Alle Gebuchten sehen dann CANCELLED.')) return;
    await attempt(() => api.cancelFlight(flight.id), 'Flug gestrichen.');
  };
  const verdict = (b, v) => attempt(() => api.setVerdict(b.id, v));

  return (
    <>
      <Section title="Cockpit">
        <div className="card cockpit">
          <div className="cockpit-stats">
            <div>
              <span className="pf-label">Spritkosten</span>
              <b>{fmtEuro(cost)}</b>
              <small>{flight.km} km · {String(flight.consumption).replace('.', ',')} l · {fmtEuro(flight.fuelPrice * 100)}/l</small>
            </div>
            <div>
              <span className="pf-label">Pro Kopf</span>
              <b>{share ? fmtEuro(share) : '–'}</b>
              <small>geteilt durch alle an Bord inkl. dir</small>
            </div>
          </div>
          {!cancelled && !departed && (
            <>
              <div className="delay-row">
                <span>Verspätung</span>
                {[0, 5, 10, 15, 30].map((m) => (
                  <button key={m} className={`chip ${flight.delayMin === m ? 'chip-on' : ''}`} onClick={() => delay(m)}>
                    {m === 0 ? 'pünktlich' : `+${m}`}
                  </button>
                ))}
              </div>
              <div className="row-actions">
                <button className="btn btn-wa" onClick={share2wa}>In WhatsApp teilen</button>
                <button className="btn btn-ghost btn-danger" onClick={cancel}>Flug streichen</button>
              </div>
            </>
          )}
        </div>
      </Section>

      <Section title={`Passagierliste · ${list.length}/${flight.seats}`}>
        {list.length === 0 ? (
          <Empty>Noch niemand eingecheckt. Teil den Flug in WhatsApp.</Empty>
        ) : (
          <ul className="manifest manifest-pilot">
            {list.map((b) => {
              const flown = isFlown(b);
              const label = b.verdict === 'noshow'
                ? 'nicht mitgeflogen'
                : b.boardedAt
                  ? `abgerissen ${fmtTime(new Date(b.boardedAt))}`
                  : b.verdict === 'flown'
                    ? 'von dir bestätigt'
                    : departed
                      ? 'nicht entwertet'
                      : 'gebucht';
              return (
                <li key={b.id} className={!flown && departed && !b.verdict ? 'needs-verdict' : ''}>
                  <span className="manifest-seat">{b.seat}</span>
                  <span className="manifest-name">
                    {nameOf(state, b.userId)}
                    <small>{seatInfo(b.seat).cls} · {label}</small>
                  </span>
                  {departed && !b.boardedAt && (
                    <span className="verdict">
                      {b.verdict ? (
                        <button className="chip" onClick={() => verdict(b, null)}>zurücksetzen</button>
                      ) : (
                        <>
                          <button className="chip chip-yes" onClick={() => verdict(b, 'flown')}>war dabei</button>
                          <button className="chip chip-no" onClick={() => verdict(b, 'noshow')}>nicht</button>
                        </>
                      )}
                    </span>
                  )}
                  {b.boardedAt && b.verdict !== 'noshow' && (
                    <button className="chip" onClick={() => { verdict(b, 'noshow'); toast('Als nicht mitgeflogen markiert.'); }}>
                      doch nicht
                    </button>
                  )}
                  {b.boardedAt && b.verdict === 'noshow' && (
                    <button className="chip" onClick={() => verdict(b, null)}>zurücksetzen</button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
