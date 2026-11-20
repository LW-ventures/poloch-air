import { seatsForCount, seatInfo, activeBookings } from '../lib/domain.js';
import { nameOf } from './ui.jsx';

// Draufsicht auf den Poloch, Fahrtrichtung oben. Linkslenker: Pilot sitzt vorne links (1A).
const LAYOUT = [
  ['1A', null, '1B'],
  ['2A', '2B', '2C'],
];

export default function SeatMap({ state, flight, selected, onSelect, myBookingId, disabled }) {
  const offered = new Set(seatsForCount(flight.seats).map((s) => s.id));
  const taken = new Map(activeBookings(state, flight.id).map((b) => [b.seat, b]));

  const cell = (id) => {
    if (!id) return <div className="seat seat-gap" key="gap" />;
    if (id === '1A') {
      return (
        <div key={id} className="seat seat-pilot" title="Captain">
          <span className="seat-id">1A</span>
          <span className="seat-who">{nameOf(state, flight.driverId)}</span>
          <span className="seat-wheel" aria-hidden="true" />
        </div>
      );
    }
    const b = taken.get(id);
    const isMine = b && b.id === myBookingId;
    const unavailable = !offered.has(id);
    const isFree = !b && !unavailable;
    const info = seatInfo(id);
    return (
      <button
        key={id}
        type="button"
        className={[
          'seat',
          `seat-${info.cls.replace(/\s/g, '-').toLowerCase()}`,
          isFree ? 'seat-free' : '',
          b ? 'seat-taken' : '',
          isMine ? 'seat-mine' : '',
          unavailable ? 'seat-off' : '',
          selected === id ? 'seat-selected' : '',
        ].join(' ')}
        disabled={disabled || !isFree}
        onClick={() => onSelect?.(id)}
        aria-pressed={selected === id}
        aria-label={`Sitz ${id}, ${info.cls}${b ? `, belegt von ${nameOf(state, b.userId)}` : unavailable ? ', nicht verfügbar' : ', frei'}`}
      >
        <span className="seat-id">{id}</span>
        <span className="seat-who">{b ? (isMine ? 'Du' : nameOf(state, b.userId)) : unavailable ? '—' : 'frei'}</span>
      </button>
    );
  };

  const sel = selected ? seatInfo(selected) : null;

  return (
    <div className="seatmap">
      <div className="car" aria-label="Sitzplan">
        <div className="car-hood" aria-hidden="true">
          <span>{flight.carNick || flight.carName}</span>
        </div>
        <div className="car-cabin">
          {LAYOUT.map((row, r) => (
            <div className="car-row" key={r}>
              {row.map(cell)}
            </div>
          ))}
        </div>
        <div className="car-trunk" aria-hidden="true">Kofferraum · Handgepäck</div>
      </div>
      <div className="seat-legend">
        <span><i className="lg lg-business" /> Business</span>
        <span><i className="lg lg-premium" /> Premium Eco</span>
        <span><i className="lg lg-economy" /> Economy</span>
      </div>
      {sel && (
        <p className={`seat-note ${sel.cls === 'Economy' ? 'seat-note-warn' : ''}`}>
          <b>{sel.id} · {sel.cls}.</b> {sel.note}
        </p>
      )}
    </div>
  );
}
