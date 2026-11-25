// Zustandsänderungen als reine Funktionen: (state, ...args) -> neuer state. Werfen bei Regelverstoß.
// Der lokale Testmodus wendet sie direkt an; das Supabase-Backend spiegelt dieselben Regeln.
import { canBook, canTear, freeSeats, activeBookings, isoDate } from '../lib/domain.js';
import { LIMITS, CODE_RE, inRange } from '../lib/limits.js';

const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
const nowIso = () => new Date().toISOString();

export class RuleError extends Error {}
const fail = (msg) => {
  throw new RuleError(msg);
};

const byId = (list, id) => list.find((x) => x.id === id);
const replace = (list, id, patch) => list.map((x) => (x.id === id ? { ...x, ...patch } : x));

// ---------- Flüge ----------

// legs: [{ date, time, km, fromCode, fromName, toCode, toName }]
export function createFlights(state, { driverId, carId, legs, seats, note }) {
  const car = byId(state.cars, carId);
  if (!car) fail('Kein Auto hinterlegt.');
  if (!legs?.length) fail('Mindestens ein Flug nötig.');
  if (legs.length > 2) fail('Höchstens Hin- und Rückflug auf einmal.');
  if ((note || '').length > LIMITS.note) fail(`Gate-Info bitte kürzer als ${LIMITS.note} Zeichen.`);
  const today = new Date();
  const minDate = isoDate(today);
  const maxDate = isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + LIMITS.daysAhead));
  const flights = legs.map((leg) => {
    if (!leg.date || !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(leg.time || '')) fail('Datum und Uhrzeit fehlen oder stimmen nicht.');
    if (leg.date < minDate || leg.date > maxDate) fail(`Flüge gehen von heute bis ${LIMITS.daysAhead} Tage im Voraus.`);
    if (!inRange(Number(leg.km), LIMITS.km)) fail(`Strecke bitte zwischen ${LIMITS.km.min} und ${LIMITS.km.max} km.`);
    if (!CODE_RE.test(String(leg.fromCode || '').toUpperCase()) || !CODE_RE.test(String(leg.toCode || '').toUpperCase())) fail('Flughafencodes brauchen 3 Buchstaben oder Ziffern.');
    if ((leg.fromName || '').length > LIMITS.text || (leg.toName || '').length > LIMITS.text) fail(`Ortsnamen bitte kürzer als ${LIMITS.text} Zeichen.`);
    return {
      id: uid(),
      driverId,
      carId,
      date: leg.date,
      time: leg.time,
      km: Number(leg.km),
      fromCode: leg.fromCode,
      fromName: leg.fromName,
      toCode: leg.toCode,
      toName: leg.toName,
      seats: Math.max(1, Math.min(Number(seats) || car.seats, 4)),
      note: note || '',
      status: 'scheduled',
      delayMin: 0,
      // Snapshot: spätere Änderungen am Auto ändern alte Flüge nicht
      consumption: car.consumption,
      fuelPrice: car.fuelPrice,
      carName: car.name,
      carNick: car.nickname,
      createdAt: nowIso(),
    };
  });
  return [{ ...state, flights: [...state.flights, ...flights] }, flights];
}

export function cancelFlight(state, { flightId, userId }) {
  const f = byId(state.flights, flightId);
  if (!f) fail('Flug nicht gefunden.');
  if (f.driverId !== userId && !isAdmin(state, userId)) fail('Nur der Pilot kann absagen.');
  return { ...state, flights: replace(state.flights, flightId, { status: 'cancelled' }) };
}

export function setDelay(state, { flightId, userId, delayMin }) {
  const f = byId(state.flights, flightId);
  if (!f) fail('Flug nicht gefunden.');
  if (f.driverId !== userId && !isAdmin(state, userId)) fail('Nur der Pilot kann verschieben.');
  if (!inRange(Number(delayMin), LIMITS.delayMin)) fail(`Verspätung bitte zwischen 0 und ${LIMITS.delayMin.max} Minuten.`);
  return { ...state, flights: replace(state.flights, flightId, { delayMin: Number(delayMin) }) };
}

// ---------- Buchungen ----------

export function book(state, { flightId, userId, seat }) {
  const f = byId(state.flights, flightId);
  if (!f) fail('Flug nicht gefunden.');
  if (f.driverId === userId) fail('Der Pilot fliegt sowieso mit.');
  if (!canBook(f)) fail('Dieser Flug ist nicht mehr buchbar.');
  if (activeBookings(state, flightId).some((b) => b.userId === userId)) fail('Du hast schon ein Ticket.');
  if (!freeSeats(state, f).some((s) => s.id === seat)) fail(`Sitz ${seat} ist leider weg.`);
  const booking = {
    id: uid(),
    flightId,
    userId,
    seat,
    status: 'booked',
    boardedAt: null,
    verdict: null,
    createdAt: nowIso(),
  };
  return [{ ...state, bookings: [...state.bookings, booking] }, booking];
}

export function changeSeat(state, { bookingId, userId, seat }) {
  const b = byId(state.bookings, bookingId);
  if (!b || b.userId !== userId) fail('Ticket nicht gefunden.');
  const f = byId(state.flights, b.flightId);
  if (!canBook(f)) fail('Sitzwechsel nur bis zum Abflug.');
  if (!freeSeats(state, f).some((s) => s.id === seat)) fail(`Sitz ${seat} ist belegt.`);
  return { ...state, bookings: replace(state.bookings, bookingId, { seat }) };
}

export function cancelBooking(state, { bookingId, userId }) {
  const b = byId(state.bookings, bookingId);
  if (!b || b.userId !== userId) fail('Ticket nicht gefunden.');
  const f = byId(state.flights, b.flightId);
  if (!canBook(f)) fail('Stornieren geht nur bis zum Abflug.');
  if (b.boardedAt) fail('Schon abgerissen – zu spät.');
  return { ...state, bookings: replace(state.bookings, bookingId, { status: 'cancelled' }) };
}

export function tear(state, { bookingId, userId }) {
  const b = byId(state.bookings, bookingId);
  if (!b || b.userId !== userId) fail('Ticket nicht gefunden.');
  const f = byId(state.flights, b.flightId);
  if (!canTear(f)) fail('Abreißen geht ab 30 min vor Abflug bis Tagesende.');
  if (b.boardedAt) return state;
  return { ...state, bookings: replace(state.bookings, bookingId, { boardedAt: nowIso() }) };
}

// Pilot klärt nachträglich: 'flown' | 'noshow' | null (zurücksetzen)
export function setVerdict(state, { bookingId, userId, verdict }) {
  const b = byId(state.bookings, bookingId);
  if (!b) fail('Ticket nicht gefunden.');
  const f = byId(state.flights, b.flightId);
  if (f.driverId !== userId && !isAdmin(state, userId)) fail('Nur der Pilot kann das klären.');
  return { ...state, bookings: replace(state.bookings, bookingId, { verdict }) };
}

// ---------- Zahlungen ----------

// Mitfahrer meldet -> pending; Pilot trägt direkt ein -> confirmed
export function addPayment(state, { fromId, toId, cents, byUserId, note }) {
  cents = Math.round(cents);
  if (!(cents > 0)) fail('Betrag muss größer als 0 sein.');
  if (cents > LIMITS.paymentEuro.max * 100) fail(`Höchstens ${LIMITS.paymentEuro.max} € pro Zahlung.`);
  if ((note || '').length > LIMITS.payNote) fail(`Notiz bitte kürzer als ${LIMITS.payNote} Zeichen.`);
  if (fromId === toId) fail('An sich selbst zahlen gilt nicht.');
  if (byUserId !== fromId && byUserId !== toId && !isAdmin(state, byUserId)) fail('Nicht erlaubt.');
  const direct = byUserId === toId || isAdmin(state, byUserId);
  const p = {
    id: uid(),
    fromId,
    toId,
    cents,
    note: note || '',
    status: direct ? 'confirmed' : 'pending',
    createdBy: byUserId,
    createdAt: nowIso(),
    resolvedAt: direct ? nowIso() : null,
  };
  return [{ ...state, payments: [...state.payments, p] }, p];
}

export function resolvePayment(state, { paymentId, userId, accept }) {
  const p = byId(state.payments, paymentId);
  if (!p) fail('Zahlung nicht gefunden.');
  if (p.toId !== userId && !isAdmin(state, userId)) fail('Nur der Empfänger kann bestätigen.');
  return {
    ...state,
    payments: replace(state.payments, paymentId, {
      status: accept ? 'confirmed' : 'rejected',
      resolvedAt: nowIso(),
    }),
  };
}

// ---------- Autos & Strecken ----------

export function saveCar(state, { userId, car }) {
  const clean = {
    name: (car.name || '').trim() || 'Auto',
    nickname: (car.nickname || '').trim(),
    consumption: Number(car.consumption),
    seats: Math.max(1, Math.min(4, Number(car.seats) || 1)),
    fuelPrice: Number(car.fuelPrice),
  };
  if (!inRange(clean.consumption, LIMITS.consumption)) fail(`Verbrauch bitte zwischen ${LIMITS.consumption.min} und ${LIMITS.consumption.max} l/100 km.`);
  if (!inRange(clean.fuelPrice, LIMITS.fuelPrice)) fail('Spritpreis bitte zwischen 1,00 und 3,50 €/l.');
  if (clean.name.length > LIMITS.text || clean.nickname.length > LIMITS.text) fail(`Auto und Spitzname bitte kürzer als ${LIMITS.text} Zeichen.`);
  const existing = state.cars.find((c) => c.ownerId === userId);
  if (existing) {
    return { ...state, cars: replace(state.cars, existing.id, { ...clean, updatedAt: nowIso() }) };
  }
  return { ...state, cars: [...state.cars, { id: uid(), ownerId: userId, ...clean, updatedAt: nowIso() }] };
}

export function saveRoute(state, { userId, route }) {
  const clean = {
    fromCode: (route.fromCode || '').trim().toUpperCase(),
    fromName: (route.fromName || '').trim(),
    toCode: (route.toCode || '').trim().toUpperCase(),
    toName: (route.toName || '').trim(),
    km: Number(route.km),
  };
  if (!CODE_RE.test(clean.fromCode) || !CODE_RE.test(clean.toCode)) fail('Flughafencodes brauchen 3 Buchstaben oder Ziffern.');
  if (!inRange(clean.km, LIMITS.km)) fail(`Strecke bitte zwischen ${LIMITS.km.min} und ${LIMITS.km.max} km.`);
  if (!clean.fromName || !clean.toName) fail('Ortsnamen fehlen.');
  if (clean.fromName.length > LIMITS.text || clean.toName.length > LIMITS.text) fail(`Ortsnamen bitte kürzer als ${LIMITS.text} Zeichen.`);
  if (route.id) return { ...state, routes: replace(state.routes, route.id, clean) };
  return { ...state, routes: [...state.routes, { id: uid(), createdBy: userId, ...clean }] };
}

export function deleteRoute(state, { routeId }) {
  return { ...state, routes: state.routes.filter((r) => r.id !== routeId) };
}

// ---------- Einstellungen für alle (Admin) ----------

export const DEFAULT_SETTINGS = { splash: 'scheibe' };

export function setSettings(state, { userId, patch }) {
  if (!isAdmin(state, userId)) fail('Nur für Admins.');
  return { ...state, settings: { ...DEFAULT_SETTINGS, ...state.settings, ...patch } };
}

// ---------- Personen (Admin) ----------

export function isAdmin(state, userId) {
  return !!byId(state.users, userId)?.isAdmin;
}

export function addUser(state, { userId, name }) {
  if (!isAdmin(state, userId)) fail('Nur für Admins.');
  name = (name || '').trim();
  if (!name) fail('Name fehlt.');
  if (name.length > LIMITS.name) fail(`Name bitte kürzer als ${LIMITS.name} Zeichen.`);
  if (state.users.some((u) => u.name.toLowerCase() === name.toLowerCase())) fail('Name gibt es schon.');
  return { ...state, users: [...state.users, { id: uid(), name, isAdmin: false }] };
}

export function renameUser(state, { userId, targetId, name }) {
  if (!isAdmin(state, userId) && userId !== targetId) fail('Nicht erlaubt.');
  name = (name || '').trim();
  if (!name) fail('Name fehlt.');
  if (name.length > LIMITS.name) fail(`Name bitte kürzer als ${LIMITS.name} Zeichen.`);
  return { ...state, users: replace(state.users, targetId, { name }) };
}
