// Reine Fachlogik: Zeiten, Status, Kosten, Kontostände, Miles.
// Alles ohne React/Backend, damit es testbar und für Supabase wiederverwendbar ist.

export const BOARDING_WINDOW_MIN = 30;

// Sitzreihenfolge = Buchbarkeitsreihenfolge, wenn ein Auto weniger Plätze hat.
export const SEATS = [
  { id: '1B', cls: 'Business', short: 'Business', note: 'Beifahrer. Volle Kontrolle über Klima und Musik.' },
  { id: '2A', cls: 'Premium Economy', short: 'Premium Eco', note: 'Fensterplatz hinten links.' },
  { id: '2C', cls: 'Premium Economy', short: 'Premium Eco', note: 'Fensterplatz hinten rechts.' },
  { id: '2B', cls: 'Economy', short: 'Economy', note: 'Mittelsitz. Knie an der Mittelkonsole. Viel Glück.' },
];

export function seatsForCount(n) {
  return SEATS.slice(0, Math.max(0, Math.min(SEATS.length, n)));
}

export function seatInfo(id) {
  return SEATS.find((s) => s.id === id) || { id, cls: 'Economy', short: 'Economy', note: '' };
}

// ---------- Zeit ----------

export function scheduledAt(flight) {
  return new Date(`${flight.date}T${flight.time}:00`);
}

export function departureAt(flight) {
  return new Date(scheduledAt(flight).getTime() + (flight.delayMin || 0) * 60000);
}

export function endOfFlightDay(flight) {
  return new Date(`${flight.date}T23:59:59`);
}

export function boardingOpensAt(flight) {
  return new Date(departureAt(flight).getTime() - BOARDING_WINDOW_MIN * 60000);
}

export function flightNumber(flight) {
  return 'AP ' + String(Number(flight.time.replace(':', '')));
}

export function canBook(flight, now = new Date()) {
  return flight.status !== 'cancelled' && now < departureAt(flight);
}

export function canTear(flight, now = new Date()) {
  return (
    flight.status !== 'cancelled' &&
    now >= boardingOpensAt(flight) &&
    now <= endOfFlightDay(flight)
  );
}

// ---------- Buchungen ----------

export function activeBookings(state, flightId) {
  return state.bookings.filter((b) => b.flightId === flightId && b.status === 'booked');
}

export function isFlown(booking) {
  if (booking.status !== 'booked') return false;
  if (booking.verdict === 'noshow') return false;
  return booking.verdict === 'flown' || !!booking.boardedAt;
}

export function flownBookings(state, flightId) {
  return activeBookings(state, flightId).filter(isFlown);
}

export function freeSeats(state, flight) {
  const taken = new Set(activeBookings(state, flight.id).map((b) => b.seat));
  return seatsForCount(flight.seats).filter((s) => !taken.has(s.id));
}

export function flightStatus(state, flight, now = new Date()) {
  if (flight.status === 'cancelled') return { code: 'CANCELLED', tone: 'red' };
  const dep = departureAt(flight);
  if (now >= dep) return { code: 'DEPARTED', tone: 'muted' };
  if (now >= boardingOpensAt(flight)) return { code: 'BOARDING', tone: 'green', blink: true };
  if (flight.delayMin > 0) return { code: `DELAY +${flight.delayMin}`, tone: 'orange' };
  if (freeSeats(state, flight).length === 0) return { code: 'FULL', tone: 'orange' };
  return { code: 'ON TIME', tone: 'amber' };
}

// ---------- Kosten (alles in Cent, als Fließkomma – gerundet wird erst bei der Anzeige) ----------

export function flightCostCents(flight) {
  return (flight.km * flight.consumption / 100) * flight.fuelPrice * 100;
}

// Geteilt durch alle Insassen inkl. Pilot. Wer nicht mitfliegt, zahlt nichts.
export function shareCents(state, flight) {
  if (flight.status === 'cancelled') return 0;
  const n = flownBookings(state, flight.id).length;
  if (n === 0) return 0;
  return flightCostCents(flight) / (n + 1);
}

// Schätzung für ein Ticket: aktuelle Buchungen (mind. 1 = ich) + Pilot
export function estimateShareCents(state, flight, includeMe = false) {
  const booked = activeBookings(state, flight.id).length + (includeMe ? 1 : 0);
  return flightCostCents(flight) / (Math.max(booked, 1) + 1);
}

// ---------- Kontostände ----------

// ledger: Liste aller Buchungen (Fahrt-Anteile) und bestätigten Zahlungen zwischen zwei Personen.
// Positiver Betrag = passenger schuldet driver.
export function ledgerEntries(state) {
  const entries = [];
  const flightsById = new Map(state.flights.map((f) => [f.id, f]));
  const shareCache = new Map();
  for (const b of state.bookings) {
    if (!isFlown(b)) continue;
    const f = flightsById.get(b.flightId);
    if (!f || f.status === 'cancelled') continue;
    if (!shareCache.has(f.id)) shareCache.set(f.id, shareCents(state, f));
    entries.push({
      kind: 'flight',
      id: b.id,
      from: b.userId,
      to: f.driverId,
      cents: shareCache.get(f.id),
      at: scheduledAt(f).toISOString(),
      flight: f,
    });
  }
  for (const p of state.payments) {
    if (p.status !== 'confirmed') continue;
    entries.push({
      kind: 'payment',
      id: p.id,
      from: p.fromId,
      to: p.toId,
      cents: -p.cents,
      at: p.createdAt,
      payment: p,
    });
  }
  return entries.sort((a, b) => (a.at < b.at ? 1 : -1));
}

// Netto zwischen zwei Personen: >0 = a schuldet b
export function netBetween(state, a, b, entries = ledgerEntries(state)) {
  let sum = 0;
  for (const e of entries) {
    if (e.from === a && e.to === b) sum += e.cents;
    else if (e.from === b && e.to === a) sum -= e.cents;
  }
  return sum;
}

// Alle Kontostände aus Sicht von userId: cents > 0 = ich schulde other, < 0 = other schuldet mir
export function myBalances(state, userId) {
  const entries = ledgerEntries(state);
  const others = new Set();
  for (const e of entries) {
    if (e.from === userId) others.add(e.to);
    if (e.to === userId) others.add(e.from);
  }
  return [...others]
    .map((otherId) => ({ otherId, cents: netBetween(state, userId, otherId, entries) }))
    .sort((x, y) => Math.abs(y.cents) - Math.abs(x.cents));
}

// Kaufmännisch auf ganze Euro
export function roundEuro(cents) {
  const sign = cents < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(cents) / 100);
}

// ---------- Aufgaben für Piloten ----------

export function driverTasks(state, userId, now = new Date()) {
  const payments = state.payments.filter((p) => p.toId === userId && p.status === 'pending');
  const myFlights = new Map(
    state.flights
      .filter((f) => f.driverId === userId && f.status !== 'cancelled' && now >= departureAt(f))
      .map((f) => [f.id, f]),
  );
  const unclear = state.bookings
    .filter((b) => b.status === 'booked' && myFlights.has(b.flightId) && !b.boardedAt && !b.verdict)
    .map((b) => ({ booking: b, flight: myFlights.get(b.flightId) }));
  return { payments, unclear, count: payments.length + unclear.length };
}

// ---------- Poloch Miles ----------

export const TIERS = [
  { id: 'gold', name: 'Gold', min: 50 },
  { id: 'silver', name: 'Silber', min: 25 },
  { id: 'bronze', name: 'Bronze', min: 10 },
];

export function tierFor(count) {
  return TIERS.find((t) => count >= t.min) || null;
}

export function nextTier(count) {
  const asc = [...TIERS].reverse();
  return asc.find((t) => count < t.min) || null;
}

export function milesFor(state, userId) {
  const flightsById = new Map(state.flights.map((f) => [f.id, f]));
  let flown = 0;
  let km = 0;
  for (const b of state.bookings) {
    if (b.userId !== userId || !isFlown(b)) continue;
    const f = flightsById.get(b.flightId);
    if (!f || f.status === 'cancelled') continue;
    flown += 1;
    km += f.km;
  }
  const piloted = state.flights.filter(
    (f) => f.driverId === userId && f.status !== 'cancelled' && flownBookings(state, f.id).length > 0,
  ).length;
  return { flown, km, piloted, tier: tierFor(flown + piloted), total: flown + piloted };
}

export function monthlyFlights(state, months = 6, now = new Date()) {
  const keys = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const flightsById = new Map(state.flights.map((f) => [f.id, f]));
  const table = new Map(state.users.map((u) => [u.id, Object.fromEntries(keys.map((k) => [k, 0]))]));
  for (const b of state.bookings) {
    if (!isFlown(b)) continue;
    const f = flightsById.get(b.flightId);
    if (!f || f.status === 'cancelled') continue;
    const k = f.date.slice(0, 7);
    const row = table.get(b.userId);
    if (row && k in row) row[k] += 1;
  }
  return { keys, table };
}

// ---------- Formatierung ----------

export function fmtEuro(cents) {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

export function fmtDate(dateStr, opts = { weekday: 'short', day: '2-digit', month: '2-digit' }) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('de-DE', opts);
}

export function fmtTime(date) {
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function hhmm(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
