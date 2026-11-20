import { useRef, useState, useEffect } from 'react';
import {
  seatInfo, departureAt, boardingOpensAt, endOfFlightDay, canTear, flightNumber, fmtDate, fmtTime,
  fmtEuro, estimateShareCents, shareCents, isFlown, milesFor,
} from '../lib/domain.js';
import { playRip, buzz, playPrint } from '../lib/fx.js';
import { nameOf, TierBadge, PlaneGlyph } from './ui.jsx';

// Pseudo-Barcode aus der Ticket-ID
function Barcode({ seed, height = 34 }) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const bars = [];
  let x = 0;
  for (let i = 0; i < 46; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const w = 1 + (Math.abs(h) % 3);
    if (i % 2 === 0) bars.push(<rect key={i} x={x} y="0" width={w} height={height} />);
    x += w + 0.6;
  }
  return (
    <svg className="barcode" viewBox={`0 0 ${x} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      {bars}
    </svg>
  );
}

function Field({ label, children, big }) {
  return (
    <div className={`pf ${big ? 'pf-big' : ''}`}>
      <span className="pf-label">{label}</span>
      <span className="pf-value">{children}</span>
    </div>
  );
}

export default function BoardingPass({ state, flight, booking, now, printing = false, onPrinted, onTear }) {
  const seat = seatInfo(booking.seat);
  const dep = departureAt(flight);
  const boarding = new Date(dep.getTime() - 5 * 60000);
  const miles = milesFor(state, booking.userId);
  const cancelled = flight.status === 'cancelled';
  const flown = isFlown(booking);
  const noshow = booking.verdict === 'noshow';
  const tearable = !flown && !noshow && !cancelled && canTear(flight, now);
  const expired = !flown && !noshow && !cancelled && now > endOfFlightDay(flight);
  const price = flown ? shareCents(state, flight) : estimateShareCents(state, flight);

  // ---- Druck-Animation ----
  useEffect(() => {
    if (!printing) return;
    playPrint(1.7);
    buzz([10, 40, 10, 40, 10, 40, 10]);
    const t = setTimeout(() => onPrinted?.(), 1900);
    return () => clearTimeout(t);
  }, [printing]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Abreißen ----
  const [progress, setProgress] = useState(0);
  const [falling, setFalling] = useState(false);
  const drag = useRef(null);
  const lastStep = useRef(0);

  const onDown = (e) => {
    if (!tearable || falling) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, w: e.currentTarget.getBoundingClientRect().width };
    lastStep.current = 0;
  };
  const onMove = (e) => {
    if (!drag.current) return;
    const p = Math.max(0, Math.min(1, (e.clientX - drag.current.x) / (drag.current.w * 0.7)));
    setProgress(p);
    const step = Math.floor(p * 6);
    if (step > lastStep.current) {
      buzz(6);
      lastStep.current = step;
    }
  };
  const onUp = () => {
    if (!drag.current) return;
    drag.current = null;
    if (progress > 0.62) finish();
    else setProgress(0);
  };
  const finish = async () => {
    setProgress(1);
    setFalling(true);
    playRip();
    buzz([25, 50, 35]);
    await new Promise((r) => setTimeout(r, 700));
    const ok = await onTear?.();
    if (!ok) {
      setFalling(false);
      setProgress(0);
    }
  };

  const stamp = cancelled
    ? { text: 'Cancelled', cls: 'stamp-red' }
    : noshow
      ? { text: 'No Show', cls: 'stamp-red' }
      : flown
        ? { text: `Boarded${booking.boardedAt ? ' ' + fmtTime(new Date(booking.boardedAt)) : ''}`, cls: 'stamp-green' }
        : null;

  const showStub = !flown && !noshow;

  return (
    <div className={`pass-wrap ${printing ? 'is-printing' : ''}`}>
      {printing && (
        <div className="printer" aria-hidden="true">
          <div className="printer-slot" />
          <span className="printer-led" />
        </div>
      )}
      <div className="pass-clip">
        <div className="pass-paper">
        <article className={`pass ${showStub ? '' : 'pass-torn'} ${cancelled ? 'pass-cancelled' : ''}`} aria-label={`Boarding Pass ${flightNumber(flight)}`}>
          <header className="pass-head">
            <span className="pass-brand">
              <PlaneGlyph size={16} /> Poloch Air
            </span>
            <span className="pass-kind">
              <TierBadge count={miles.total} small /> Boarding Pass
            </span>
          </header>

          <div className="pass-route">
            <div className="pass-ap">
              <b>{flight.fromCode}</b>
              <span>{flight.fromName}</span>
            </div>
            <div className="pass-arc" aria-hidden="true">
              <span className="pass-arc-line" />
              <PlaneGlyph size={20} className="pass-arc-plane" />
            </div>
            <div className="pass-ap pass-ap-to">
              <b>{flight.toCode}</b>
              <span>{flight.toName}</span>
            </div>
          </div>

          <div className="pass-grid pass-grid-3">
            <Field label="Passagier">{nameOf(state, booking.userId)}</Field>
            <Field label="Flug">{flightNumber(flight)}</Field>
            <Field label="Datum">{fmtDate(flight.date)}</Field>
          </div>
          <div className="pass-grid pass-grid-4">
            <Field label="Boarding">{fmtTime(boarding)}</Field>
            <Field label="Abflug">
              {fmtTime(dep)}
              {flight.delayMin > 0 && <em className="pass-delay">+{flight.delayMin}</em>}
            </Field>
            <Field label="Sitz" big>{seat.id}</Field>
            <Field label="Klasse">{seat.short}</Field>
          </div>

          <div className="pass-meta">
            <span>
              Captain {nameOf(state, flight.driverId)} · {flight.carName}
              {flight.carNick ? ` „${flight.carNick}“` : ''}
            </span>
            {flight.note && <span className="pass-gate">Gate: {flight.note}</span>}
          </div>

          <div className="pass-foot">
            <div className="pass-price">
              <span className="pf-label">{flown ? 'Dein Anteil' : 'Anteil ca.'}</span>
              <b>{cancelled || noshow ? fmtEuro(0) : fmtEuro(price)}</b>
            </div>
            <Barcode seed={booking.id} />
          </div>

          {stamp && <div className={`stamp ${stamp.cls}`}>{stamp.text}</div>}
        </article>

        {showStub && (
          <div
            className={`stub ${tearable ? 'stub-live' : ''} ${falling ? 'stub-falling' : ''}`}
            style={{ '--p': progress }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <div className="perf" aria-hidden="true">
              <span className="perf-rip" />
            </div>
            <div className="stub-body">
              <div className="stub-info">
                <b>{flightNumber(flight)}</b>
                <span>
                  {flight.fromCode} → {flight.toCode}
                </span>
                <span>Sitz {seat.id}</span>
              </div>
              <div className="stub-hint">
                {cancelled ? (
                  'Flug gestrichen'
                ) : tearable ? (
                  <>
                    <span className="stub-arrow" aria-hidden="true">
                      ⟶
                    </span>{' '}
                    Zum Einsteigen abreißen
                  </>
                ) : expired ? (
                  'Nicht entwertet – Captain klärt das'
                ) : (
                  `Entwerten ab ${fmtTime(boardingOpensAt(flight))}`
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
      {tearable && !falling && !printing && (
        <button className="link-btn tear-fallback" onClick={finish}>
          Wischen klappt nicht? Hier tippen zum Abreißen
        </button>
      )}
    </div>
  );
}
