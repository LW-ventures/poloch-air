// Live-Modus: Daten in Supabase. Lesen per Tabellen (RLS), Schreiben nur über die Funktionen
// aus supabase/migrations/001_schema.sql. Änderungen anderer kommen per Realtime rein.
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY, LOGIN_DOMAIN } from '../config.js';
import { DEFAULT_SETTINGS } from './actions.js';

const SPLASH_CACHE = 'polochair:splash';

// snake_case -> camelCase (from_code -> fromCode)
const camel = (row) =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), v]));

export function loginEmail(name) {
  const slug = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');
  return `${slug}@${LOGIN_DOMAIN}`;
}

function cachedSettings() {
  try {
    return { ...DEFAULT_SETTINGS, splash: localStorage.getItem(SPLASH_CACHE) || DEFAULT_SETTINGS.splash };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

const empty = () => ({
  users: [],
  cars: [],
  routes: [],
  flights: [],
  bookings: [],
  payments: [],
  settings: cachedSettings(),
});

export function createLiveBackend() {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'polochair-auth' },
  });

  let snapshot = { data: empty(), userId: null, ready: false, notMember: false };
  const listeners = new Set();
  const emit = (patch) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((l) => l());
  };

  let channel = null;
  let reloadTimer = null;
  let loading = null;

  async function loadAll() {
    const q = (t) => sb.from(t).select('*');
    const results = await Promise.all(
      ['members', 'cars', 'routes', 'flights', 'bookings', 'payments', 'settings'].map(q),
    );
    const err = results.find((r) => r.error)?.error;
    if (err) throw new Error(err.message);
    const [m, c, r, f, b, p, s] = results.map((x) => x.data.map(camel));
    const settings = { ...DEFAULT_SETTINGS, ...(s[0] || {}) };
    try {
      localStorage.setItem(SPLASH_CACHE, settings.splash);
    } catch {
      /* egal */
    }
    const userId = snapshot.userId;
    emit({
      data: { users: m, cars: c, routes: r, flights: f, bookings: b, payments: p, settings },
      ready: true,
      notMember: !!userId && !m.some((u) => u.id === userId),
    });
  }

  const reload = () => {
    loading ||= loadAll()
      .catch((e) => console.error('Laden fehlgeschlagen:', e))
      .finally(() => (loading = null));
    return loading;
  };
  const scheduleReload = () => {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(reload, 150);
  };

  function startRealtime() {
    if (channel) return;
    channel = sb
      .channel('poloch-db')
      .on('postgres_changes', { event: '*', schema: 'public' }, scheduleReload)
      .subscribe();
  }
  function stopRealtime() {
    if (channel) sb.removeChannel(channel);
    channel = null;
  }

  async function onSession(session) {
    const userId = session?.user?.id || null;
    if (!userId) {
      stopRealtime();
      emit({ data: empty(), userId: null, ready: true, notMember: false });
      return;
    }
    if (userId === snapshot.userId && snapshot.data.users.length) return;
    snapshot = { ...snapshot, userId };
    await reload();
    startRealtime();
  }

  sb.auth.getSession().then(({ data }) => onSession(data.session));
  sb.auth.onAuthStateChange((_event, session) => {
    // Supabase empfiehlt, im Callback nicht direkt weitere Supabase-Aufrufe zu machen
    setTimeout(() => onSession(session), 0);
  });

  // Nach dem Aufwecken des Handys frisch laden (Realtime kann im Hintergrund abreißen)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && snapshot.userId) reload();
  });

  async function rpc(fn, args) {
    const { data, error } = await sb.rpc(fn, args);
    if (error) throw new Error(error.message);
    await reload();
    return data;
  }

  return {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getSnapshot: () => snapshot,
    api: {
      login: async (name, password) => {
        const { error } = await sb.auth.signInWithPassword({ email: loginEmail(name), password });
        if (error) throw new Error('Name oder Passwort stimmt nicht.');
      },
      logout: async () => {
        await sb.auth.signOut();
      },
      changePassword: async (password) => {
        if (!password || password.length < 6) throw new Error('Mindestens 6 Zeichen.');
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw new Error(error.message);
      },
      resetDemo: () => Promise.reject(new Error('Gibt es nur im Testmodus.')),
      setSettings: (patch) => rpc('set_settings', { p_splash: patch.splash }),
      createFlights: async ({ legs, seats, note }) => {
        const rows = await rpc('create_flights', { p_legs: legs, p_seats: seats, p_note: note || '' });
        return (rows || []).map(camel);
      },
      cancelFlight: (flightId) => rpc('cancel_flight', { p_flight: flightId }),
      setDelay: (flightId, delayMin) => rpc('set_delay', { p_flight: flightId, p_delay: delayMin }),
      book: async (flightId, seat) => camel(await rpc('book', { p_flight: flightId, p_seat: seat })),
      changeSeat: (bookingId, seat) => rpc('change_seat', { p_booking: bookingId, p_seat: seat }),
      cancelBooking: (bookingId) => rpc('cancel_booking', { p_booking: bookingId }),
      tear: (bookingId) => rpc('tear', { p_booking: bookingId }),
      setVerdict: (bookingId, verdict) => rpc('set_verdict', { p_booking: bookingId, p_verdict: verdict }),
      addPayment: async ({ fromId, toId, cents, note }) =>
        camel(await rpc('add_payment', { p_from: fromId, p_to: toId, p_cents: Math.round(cents), p_note: note || '' })),
      resolvePayment: (paymentId, accept) => rpc('resolve_payment', { p_payment: paymentId, p_accept: accept }),
      saveCar: (car) =>
        rpc('save_car', {
          p_name: car.name,
          p_nickname: car.nickname || '',
          p_consumption: Number(car.consumption),
          p_seats: Number(car.seats),
          p_fuel_price: Number(car.fuelPrice),
        }),
      saveRoute: (route) =>
        rpc('save_route', {
          p_id: route.id || null,
          p_from_code: route.fromCode,
          p_from_name: route.fromName,
          p_to_code: route.toCode,
          p_to_name: route.toName,
          p_km: Number(route.km),
        }),
      deleteRoute: (routeId) => rpc('delete_route', { p_id: routeId }),
      addUser: () =>
        Promise.reject(new Error('Neue Personen legt der Admin im Supabase-Dashboard an (Authentication → Add user).')),
      renameUser: (targetId, name) => rpc('rename_member', { p_target: targetId, p_name: name }),
      // persönliche Einstellungen (Farbe, Icon, Sound) im Backend ablegen
      savePrefs: async ({ accent, iconStyle, sound }) => {
        const { error } = await sb.rpc("save_prefs", { p_accent: accent, p_icon_style: iconStyle, p_sound: sound });
        if (error) throw new Error(error.message);
      },
      // nur für Admins: { [userId]: lastSignInAt | null }
      crewStatus: async () => {
        const { data, error } = await sb.rpc('crew_status');
        if (error) throw new Error(error.message);
        return Object.fromEntries((data || []).map((r) => [r.id, r.last_sign_in_at]));
      },
    },
  };
}
