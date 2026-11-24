// Testmodus: alle Daten nur im localStorage dieses Browsers, Personenwechsel ohne Passwort.
import * as A from './actions.js';
import { makeSeed } from './seed.js';

const KEY = 'polochair:data:v1';
const SESSION_KEY = 'polochair:session';

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key, val) {
  try {
    if (val === null) localStorage.removeItem(key);
    else localStorage.setItem(key, val);
  } catch {
    /* privat-Modus o. ä. – dann eben nur im Speicher */
  }
}

function load() {
  const raw = safeGet(KEY);
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      /* kaputt -> neu */
    }
  }
  data ||= makeSeed();
  return { ...data, settings: { ...A.DEFAULT_SETTINGS, ...data.settings } };
}

export function createTestBackend() {
  let snapshot = { data: load(), userId: safeGet(SESSION_KEY), ready: true };
  const listeners = new Set();

  const commit = (nextData, nextUserId = snapshot.userId) => {
    snapshot = { data: nextData, userId: nextUserId, ready: true };
    safeSet(KEY, JSON.stringify(nextData));
    safeSet(SESSION_KEY, nextUserId);
    listeners.forEach((l) => l());
  };

  // Andere Tabs desselben Browsers synchron halten
  window.addEventListener('storage', (e) => {
    if (e.key === KEY || e.key === SESSION_KEY) {
      snapshot = { data: load(), userId: safeGet(SESSION_KEY), ready: true };
      listeners.forEach((l) => l());
    }
  });

  // Aktionen geben entweder state oder [state, result] zurück
  const run = (fn, args) => {
    const res = fn(snapshot.data, { userId: snapshot.userId, ...args });
    if (Array.isArray(res)) {
      commit(res[0]);
      return Promise.resolve(res[1]);
    }
    commit(res);
    return Promise.resolve();
  };
  const me = () => snapshot.userId;

  return {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getSnapshot: () => snapshot,
    api: {
      login: (userId) => {
        commit(snapshot.data, userId);
        return Promise.resolve();
      },
      logout: () => {
        commit(snapshot.data, null);
        return Promise.resolve();
      },
      resetDemo: () => {
        commit({ ...makeSeed(), settings: snapshot.data.settings });
        return Promise.resolve();
      },
      changePassword: () => Promise.reject(new Error('Im Testmodus gibt es keine Passwörter.')),
      setSettings: (patch) => run(A.setSettings, { patch }),
      createFlights: (args) => run(A.createFlights, { driverId: me(), ...args }),
      cancelFlight: (flightId) => run(A.cancelFlight, { flightId }),
      setDelay: (flightId, delayMin) => run(A.setDelay, { flightId, delayMin }),
      book: (flightId, seat) => run(A.book, { flightId, seat }),
      changeSeat: (bookingId, seat) => run(A.changeSeat, { bookingId, seat }),
      cancelBooking: (bookingId) => run(A.cancelBooking, { bookingId }),
      tear: (bookingId) => run(A.tear, { bookingId }),
      setVerdict: (bookingId, verdict) => run(A.setVerdict, { bookingId, verdict }),
      addPayment: ({ fromId, toId, cents, note }) => run(A.addPayment, { fromId, toId, cents, note, byUserId: me() }),
      resolvePayment: (paymentId, accept) => run(A.resolvePayment, { paymentId, accept }),
      saveCar: (car) => run(A.saveCar, { car }),
      saveRoute: (route) => run(A.saveRoute, { route }),
      deleteRoute: (routeId) => run(A.deleteRoute, { routeId }),
      addUser: (name) => run(A.addUser, { name }),
      renameUser: (targetId, name) => run(A.renameUser, { targetId, name }),
      savePrefs: () => Promise.resolve(), // im Testmodus nur lokal
      crewStatus: () => Promise.resolve(null), // im Testmodus gibt es keine echten Logins
    },
  };
}
