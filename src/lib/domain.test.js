import { describe, it, expect } from 'vitest';
import * as D from './domain.js';
import * as A from '../data/actions.js';
import { emptyState } from '../data/seed.js';

// Flüge dürfen nur bis 60 Tage im Voraus angelegt werden -> Datum relativ zu heute
const d = new Date(); d.setDate(d.getDate() + 7);
const SOON = D.isoDate(d);

const BEN = 'u-ben';
const CHRIS = 'u-chris';
const ANNA = 'u-anna';

function setup() {
  let s = emptyState();
  s = A.saveCar(s, { userId: BEN, car: { name: 'VW Polo', nickname: 'Poloch', consumption: 6, seats: 4, fuelPrice: 2 } });
  return s;
}
function flightAt(s, date, time) {
  const car = s.cars[0];
  const [s2, [f]] = A.createFlights(s, {
    driverId: BEN,
    carId: car.id,
    legs: [{ date, time, km: 25, fromCode: 'HOM', fromName: 'Zuhause', toCode: 'WRK', toName: 'Arbeit' }],
    seats: 4,
  });
  return [s2, f];
}

describe('Kosten', () => {
  it('25 km × 6 l/100km × 2 €/l = 3 €', () => {
    expect(D.flightCostCents({ km: 25, consumption: 6, fuelPrice: 2 })).toBeCloseTo(300);
  });

  it('teilt durch alle Insassen inkl. Pilot, nur abgerissene zählen', () => {
    let s = setup();
    let f;
    [s, f] = flightAt(s, SOON, '07:15');
    [s] = A.book(s, { flightId: f.id, userId: CHRIS, seat: '1B' });
    [s] = A.book(s, { flightId: f.id, userId: ANNA, seat: '2A' });
    expect(D.shareCents(s, f)).toBe(0); // noch keiner abgerissen
    const chrisB = s.bookings.find((b) => b.userId === CHRIS);
    s = { ...s, bookings: s.bookings.map((b) => (b.id === chrisB.id ? { ...b, boardedAt: 'x' } : b)) };
    expect(D.shareCents(s, f)).toBeCloseTo(150); // 3 € / (1 + Pilot)
    s = { ...s, bookings: s.bookings.map((b) => ({ ...b, boardedAt: 'x' })) };
    expect(D.shareCents(s, f)).toBeCloseTo(100); // 3 € / 3
  });

  it('Pilot kann nachträglich korrigieren', () => {
    let s = setup();
    let f;
    [s, f] = flightAt(s, SOON, '07:15');
    let b;
    [s, b] = A.book(s, { flightId: f.id, userId: CHRIS, seat: '1B' });
    s = A.setVerdict(s, { bookingId: b.id, userId: BEN, verdict: 'flown' });
    expect(D.netBetween(s, CHRIS, BEN)).toBeCloseTo(150);
    s = A.setVerdict(s, { bookingId: b.id, userId: BEN, verdict: 'noshow' });
    expect(D.netBetween(s, CHRIS, BEN)).toBe(0);
  });
});

describe('Kontostand', () => {
  it('Zahlungen zählen erst nach Bestätigung, Guthaben möglich', () => {
    let s = setup();
    let f;
    [s, f] = flightAt(s, SOON, '07:15');
    let b;
    [s, b] = A.book(s, { flightId: f.id, userId: CHRIS, seat: '1B' });
    s = A.setVerdict(s, { bookingId: b.id, userId: BEN, verdict: 'flown' });
    let p;
    [s, p] = A.addPayment(s, { fromId: CHRIS, toId: BEN, cents: 500, byUserId: CHRIS });
    expect(p.status).toBe('pending');
    expect(D.netBetween(s, CHRIS, BEN)).toBeCloseTo(150);
    s = A.resolvePayment(s, { paymentId: p.id, userId: BEN, accept: true });
    expect(D.netBetween(s, CHRIS, BEN)).toBeCloseTo(-350);
    expect(D.myBalances(s, BEN)[0]).toMatchObject({ otherId: CHRIS });
    expect(D.myBalances(s, BEN)[0].cents).toBeCloseTo(350);
  });

  it('Pilot trägt Barzahlung direkt ein', () => {
    let s = setup();
    let p;
    [s, p] = A.addPayment(s, { fromId: ANNA, toId: BEN, cents: 300, byUserId: BEN });
    expect(p.status).toBe('confirmed');
  });

  it('rundet kaufmännisch auf ganze Euro', () => {
    expect(D.roundEuro(267)).toBe(3);
    expect(D.roundEuro(230)).toBe(2);
    expect(D.roundEuro(250)).toBe(3);
    expect(D.roundEuro(-267)).toBe(-3);
    expect(D.roundEuro(49)).toBe(0);
  });
});

describe('Grenzen', () => {
  it('lehnt unsinnige Werte ab', () => {
    let s = setup();
    expect(() => A.saveCar(s, { userId: BEN, car: { name: 'X', consumption: 99, seats: 4, fuelPrice: 1.8 } })).toThrow(/Verbrauch/);
    expect(() => A.saveCar(s, { userId: BEN, car: { name: 'X', consumption: 6, seats: 4, fuelPrice: 10000 } })).toThrow(/Spritpreis/);
    expect(() => A.saveRoute(s, { userId: BEN, route: { fromCode: 'AAA', fromName: 'a', toCode: 'BBB', toName: 'b', km: 5000 } })).toThrow(/500 km/);
    expect(() => A.addPayment(s, { fromId: CHRIS, toId: BEN, cents: 1000000, byUserId: CHRIS })).toThrow(/200/);
    const far = new Date(); far.setDate(far.getDate() + 400);
    expect(() => A.createFlights(s, { driverId: BEN, carId: s.cars[0].id, legs: [{ date: D.isoDate(far), time: '07:15', km: 10, fromCode: 'AAA', toCode: 'BBB' }], seats: 4 })).toThrow(/60 Tage/);
  });
});

describe('Regeln', () => {
  it('Sitz nur einmal vergeben, Pilot bucht nicht', () => {
    let s = setup();
    let f;
    [s, f] = flightAt(s, SOON, '07:15');
    [s] = A.book(s, { flightId: f.id, userId: CHRIS, seat: '1B' });
    expect(() => A.book(s, { flightId: f.id, userId: ANNA, seat: '1B' })).toThrow(/weg/);
    expect(() => A.book(s, { flightId: f.id, userId: BEN, seat: '2A' })).toThrow(/Pilot/);
    expect(() => A.book(s, { flightId: f.id, userId: CHRIS, seat: '2A' })).toThrow(/schon/);
  });

  it('Abreißen nur im Zeitfenster', () => {
    const f = { date: '2030-05-05', time: '07:15', delayMin: 0, status: 'scheduled' };
    expect(D.canTear(f, new Date('2030-05-05T06:40:00'))).toBe(false);
    expect(D.canTear(f, new Date('2030-05-05T06:50:00'))).toBe(true);
    expect(D.canTear(f, new Date('2030-05-05T23:00:00'))).toBe(true);
    expect(D.canTear(f, new Date('2030-05-06T00:01:00'))).toBe(false);
    expect(D.canTear({ ...f, status: 'cancelled' }, new Date('2030-05-05T07:00:00'))).toBe(false);
  });

  it('Startanimation darf nur der Admin für alle umstellen', () => {
    const s = setup();
    expect(() => A.setSettings(s, { userId: BEN, patch: { splash: 'airline' } })).toThrow(/Admin/);
    expect(A.setSettings(s, { userId: 'u-dana', patch: { splash: 'airline' } }).settings.splash).toBe('airline');
  });

  it('Flugnummer aus Uhrzeit', () => {
    expect(D.flightNumber({ time: '07:15' })).toBe('AP 715');
    expect(D.flightNumber({ time: '16:30' })).toBe('AP 1630');
  });
});
