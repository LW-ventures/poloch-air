// Demo-Daten für den Testmodus – relativ zu "jetzt", damit immer etwas los ist.
import { isoDate, hhmm } from '../lib/domain.js';

let n = 0;
const id = (p) => `${p}-${++n}`;

// deterministischer Zufall, damit die Demo stabil aussieht
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

export function makeSeed(now = new Date()) {
  n = 0;
  const rand = rng(42);
  const users = [
    { id: 'u-anna', name: 'Anna', isAdmin: false },
    { id: 'u-ben', name: 'Ben', isAdmin: false },
    { id: 'u-chris', name: 'Chris', isAdmin: false },
    { id: 'u-dana', name: 'Dana', isAdmin: true },
  ];
  const polo = {
    id: 'car-poloch',
    ownerId: 'u-ben',
    name: 'VW Polo',
    nickname: 'Poloch',
    consumption: 6.2,
    seats: 4,
    fuelPrice: 1.79,
    updatedAt: now.toISOString(),
  };
  const out = { fromCode: 'HOM', fromName: 'Zuhause', toCode: 'WRK', toName: 'Arbeit', km: 23 };
  const back = { fromCode: 'WRK', fromName: 'Arbeit', toCode: 'HOM', toName: 'Zuhause', km: 23 };
  const routes = [
    { id: 'r-out', createdBy: 'u-ben', ...out },
    { id: 'r-back', createdBy: 'u-ben', ...back },
  ];

  const flights = [];
  const bookings = [];
  const passengers = ['u-anna', 'u-chris', 'u-dana'];
  const seatOrder = ['1B', '2A', '2C', '2B'];

  const mkFlight = (date, time, leg, extra = {}) => {
    const f = {
      id: id('f'),
      driverId: 'u-ben',
      carId: polo.id,
      date,
      time,
      ...leg,
      seats: 4,
      note: '',
      status: 'scheduled',
      delayMin: 0,
      consumption: 6.2,
      fuelPrice: 1.79,
      carName: 'VW Polo',
      carNick: 'Poloch',
      createdAt: now.toISOString(),
      ...extra,
    };
    flights.push(f);
    return f;
  };
  const mkBooking = (f, userId, seat, extra = {}) => {
    const b = {
      id: id('b'),
      flightId: f.id,
      userId,
      seat,
      status: 'booked',
      boardedAt: null,
      verdict: null,
      createdAt: now.toISOString(),
      ...extra,
    };
    bookings.push(b);
    return b;
  };

  // Vergangenheit: 5 Wochen Werktage, Hin & Zurück
  for (let d = 35; d >= 1; d--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
    const wd = day.getDay();
    if (wd === 0 || wd === 6) continue;
    const date = isoDate(day);
    const fuel = 1.69 + Math.round(rand() * 20) / 100;
    for (const [time, leg] of [['07:15', out], ['16:30', back]]) {
      const f = mkFlight(date, time, leg, { fuelPrice: fuel });
      let seatIdx = 0;
      for (const p of passengers) {
        if (rand() < 0.68) {
          const boarded = new Date(`${date}T${time}:00`);
          boarded.setMinutes(boarded.getMinutes() - 3);
          mkBooking(f, p, seatOrder[seatIdx++], { boardedAt: boarded.toISOString() });
        }
      }
    }
  }

  // Gestern: Anna hat vergessen abzureißen -> Aufgabe für Ben
  const yesterday = flights.filter((f) => f.date === isoDate(new Date(now.getTime() - 86400000)));
  // (falls gestern Wochenende war: letzter vergangener Flug)
  const yf = yesterday[0] || flights[flights.length - 1];
  if (yf) {
    const existing = bookings.find((b) => b.flightId === yf.id && b.userId === 'u-anna');
    if (existing) existing.boardedAt = null;
    else {
      const used = new Set(bookings.filter((b) => b.flightId === yf.id).map((b) => b.seat));
      mkBooking(yf, 'u-anna', seatOrder.find((s) => !used.has(s)));
    }
  }

  // Gleich: Boarding läuft (Abflug in ~20 min)
  const soon = new Date(now.getTime() + 20 * 60000);
  soon.setMinutes(Math.ceil(soon.getMinutes() / 5) * 5, 0, 0);
  const fSoon = mkFlight(isoDate(soon), hhmm(soon), out, { note: 'Treffpunkt: vor der Bäckerei' });
  mkBooking(fSoon, 'u-dana', '1B');
  mkBooking(fSoon, 'u-anna', '2A');

  // Morgen: Hin & Zurück
  const t1 = isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  mkBooking(mkFlight(t1, '07:15', out), 'u-anna', '1B');
  mkBooking(mkFlight(t1, '16:30', back), 'u-anna', '1B');

  // Übermorgen früh
  const t2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  const fNext = mkFlight(isoDate(t2), '07:15', out, { delayMin: 10 });
  mkBooking(fNext, 'u-chris', '2C');
  const fNextBack = mkFlight(isoDate(t2), '16:45', back, { status: 'cancelled' });
  mkBooking(fNextBack, 'u-chris', '1B');

  const ago = (days) => new Date(now.getTime() - days * 86400000).toISOString();
  const payments = [
    { id: id('p'), fromId: 'u-anna', toId: 'u-ben', cents: 1000, note: 'Bar', status: 'confirmed', createdBy: 'u-ben', createdAt: ago(20), resolvedAt: ago(20) },
    { id: id('p'), fromId: 'u-dana', toId: 'u-ben', cents: 1500, note: 'PayPal', status: 'confirmed', createdBy: 'u-dana', createdAt: ago(12), resolvedAt: ago(11) },
    { id: id('p'), fromId: 'u-chris', toId: 'u-ben', cents: 800, note: 'Döner ausgegeben', status: 'confirmed', createdBy: 'u-ben', createdAt: ago(9), resolvedAt: ago(9) },
    { id: id('p'), fromId: 'u-chris', toId: 'u-ben', cents: 500, note: 'Überwiesen', status: 'pending', createdBy: 'u-chris', createdAt: ago(1), resolvedAt: null },
  ];

  return { version: 1, users, cars: [polo], routes, flights, bookings, payments };
}

export function emptyState() {
  return {
    version: 1,
    users: [
      { id: 'u-anna', name: 'Anna', isAdmin: false },
      { id: 'u-ben', name: 'Ben', isAdmin: false },
      { id: 'u-chris', name: 'Chris', isAdmin: false },
      { id: 'u-dana', name: 'Dana', isAdmin: true },
    ],
    cars: [],
    routes: [],
    flights: [],
    bookings: [],
    payments: [],
  };
}
