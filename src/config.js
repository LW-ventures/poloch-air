// Öffentliche Verbindungsdaten. Der "publishable key" ist absichtlich öffentlich –
// geschützt wird über die Zugriffsregeln (RLS) und Funktionen in supabase/migrations.
export const SUPABASE_URL = 'https://cgjjnzwvtofvmxbpenep.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_z0-S4p1mFFa44S1dXGY1Tg_Ld2Dc71Z';

// Login per Name: "Anna" -> anna@polochair.local (es wird nie eine Mail verschickt)
export const LOGIN_DOMAIN = 'polochair.local';

// 'live' = Supabase, 'test' = alles nur im Browser (npm run dev:test)
export const MODE = import.meta.env.VITE_BACKEND === 'test' ? 'test' : 'live';
