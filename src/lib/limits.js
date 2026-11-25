// Erlaubte Bereiche für Eingaben. Dieselben Werte prüft die Datenbank (supabase/migrations/006_limits.sql, 007_limits_adjust.sql).
export const LIMITS = {
  consumption: { min: 2, max: 25 }, // l/100 km
  fuelPrice: { min: 1, max: 3.5 }, // €/l
  km: { min: 1, max: 5000 }, // auch Urlaubsfahrten
  paymentEuro: { min: 0.01, max: 200 },
  delayMin: { min: 0, max: 120 },
  text: 30, // Orte, Auto, Spitzname
  note: 80, // Gate-Info
  payNote: 60,
  name: 20,
};

export const CODE_RE = /^[A-ZÄÖÜ0-9]{3}$/;

export const inRange = (v, { min, max }) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

// Zahl aus deutscher Eingabe ("6,2" -> 6.2)
export const parseNum = (v) => Number(String(v ?? '').trim().replace(',', '.'));
