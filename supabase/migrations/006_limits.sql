-- Sinnvolle Grenzen für alle Eingaben, damit niemand (versehentlich oder absichtlich) Ergebnisse verfälscht.
-- Gleiche Werte wie src/lib/limits.js. Geprüft wird doppelt: in den Funktionen (verständliche Meldung)
-- und als Tabellen-Regel (greift immer, egal wie geschrieben wird).
--   Verbrauch 2–20 l/100 km · Spritpreis 1,00–3,50 €/l · Strecke 1–500 km · Zahlung 0,01–200 €
--   Verspätung 0–120 min · Flugdatum heute bis +60 Tage · Codes 3 Zeichen (A–Z, Ä/Ö/Ü, 0–9)
--   Texte: Orte/Autos 30, Gate-Info 80, Zahlungsnotiz 60, Namen 20 Zeichen

alter table public.cars
  add constraint cars_consumption_range check (consumption between 2 and 20),
  add constraint cars_fuel_price_range check (fuel_price between 1 and 3.5),
  add constraint cars_text_len check (char_length(name) <= 30 and char_length(nickname) <= 30);

alter table public.routes
  add constraint routes_km_range check (km between 1 and 500),
  add constraint routes_code_format check (from_code ~ '^[A-ZÄÖÜ0-9]{3}$' and to_code ~ '^[A-ZÄÖÜ0-9]{3}$'),
  add constraint routes_text_len check (char_length(from_name) <= 30 and char_length(to_name) <= 30);

alter table public.flights
  add constraint flights_km_range check (km between 1 and 500),
  add constraint flights_delay_range check (delay_min between 0 and 120),
  add constraint flights_time_format check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  add constraint flights_text_len check (char_length(note) <= 80 and char_length(from_name) <= 30 and char_length(to_name) <= 30),
  add constraint flights_code_format check (from_code ~ '^[A-ZÄÖÜ0-9]{3}$' and to_code ~ '^[A-ZÄÖÜ0-9]{3}$');

alter table public.payments
  add constraint payments_cents_range check (cents between 1 and 20000),
  add constraint payments_note_len check (char_length(note) <= 60);

alter table public.members
  add constraint members_name_len check (char_length(name) between 1 and 20);

-- ---------- Funktionen mit verständlichen Meldungen ----------

create or replace function public.create_flights(p_legs jsonb, p_seats int, p_note text)
returns setof public.flights
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := _me();
  v_car cars;
  v_leg jsonb;
  v_f flights;
  v_date date;
  v_km float8;
  v_today date := (now() at time zone 'Europe/Berlin')::date;
begin
  select * into v_car from cars where owner_id = v_me;
  if not found then raise exception 'Kein Auto hinterlegt.'; end if;
  if p_legs is null or jsonb_array_length(p_legs) = 0 then raise exception 'Mindestens ein Flug nötig.'; end if;
  if jsonb_array_length(p_legs) > 2 then raise exception 'Höchstens Hin- und Rückflug auf einmal.'; end if;
  if char_length(coalesce(p_note, '')) > 80 then raise exception 'Gate-Info bitte kürzer als 80 Zeichen.'; end if;
  for v_leg in select * from jsonb_array_elements(p_legs) loop
    if coalesce(v_leg->>'date', '') = '' or coalesce(v_leg->>'time', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      raise exception 'Datum und Uhrzeit fehlen oder stimmen nicht.';
    end if;
    v_date := (v_leg->>'date')::date;
    if v_date < v_today or v_date > v_today + 60 then raise exception 'Flüge gehen von heute bis 60 Tage im Voraus.'; end if;
    v_km := coalesce((v_leg->>'km')::float8, 0);
    if v_km < 1 or v_km > 500 then raise exception 'Strecke bitte zwischen 1 und 500 km.'; end if;
    if upper(coalesce(v_leg->>'fromCode', '')) !~ '^[A-ZÄÖÜ0-9]{3}$' or upper(coalesce(v_leg->>'toCode', '')) !~ '^[A-ZÄÖÜ0-9]{3}$' then
      raise exception 'Flughafencodes brauchen 3 Buchstaben oder Ziffern.';
    end if;
    if char_length(coalesce(v_leg->>'fromName', '')) > 30 or char_length(coalesce(v_leg->>'toName', '')) > 30 then
      raise exception 'Ortsnamen bitte kürzer als 30 Zeichen.';
    end if;
    insert into flights (driver_id, car_id, date, time, km, from_code, from_name, to_code, to_name,
                         seats, note, consumption, fuel_price, car_name, car_nick)
    values (v_me, v_car.id, v_date, v_leg->>'time', v_km,
            upper(v_leg->>'fromCode'), v_leg->>'fromName', upper(v_leg->>'toCode'), v_leg->>'toName',
            greatest(1, least(coalesce(p_seats, v_car.seats), 4)), coalesce(p_note, ''),
            v_car.consumption, v_car.fuel_price, v_car.name, v_car.nickname)
    returning * into v_f;
    return next v_f;
  end loop;
end $$;

create or replace function public.set_delay(p_flight uuid, p_delay int) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := _me(); v_f flights;
begin
  select * into v_f from flights where id = p_flight;
  if not found then raise exception 'Flug nicht gefunden.'; end if;
  if v_f.driver_id <> v_me and not is_admin() then raise exception 'Nur der Pilot kann verschieben.'; end if;
  if coalesce(p_delay, 0) < 0 or p_delay > 120 then raise exception 'Verspätung bitte zwischen 0 und 120 Minuten.'; end if;
  update flights set delay_min = coalesce(p_delay, 0) where id = p_flight;
end $$;

create or replace function public.add_payment(p_from uuid, p_to uuid, p_cents int, p_note text) returns public.payments
language plpgsql security definer set search_path = public as $$
declare v_me uuid := _me(); v_direct boolean; v_p payments;
begin
  if coalesce(p_cents, 0) <= 0 then raise exception 'Betrag muss größer als 0 sein.'; end if;
  if p_cents > 20000 then raise exception 'Höchstens 200 € pro Zahlung.'; end if;
  if char_length(coalesce(p_note, '')) > 60 then raise exception 'Notiz bitte kürzer als 60 Zeichen.'; end if;
  if p_from = p_to then raise exception 'An sich selbst zahlen gilt nicht.'; end if;
  if v_me <> p_from and v_me <> p_to and not is_admin() then raise exception 'Nicht erlaubt.'; end if;
  v_direct := (v_me = p_to) or is_admin();
  insert into payments (from_id, to_id, cents, note, status, created_by, resolved_at)
  values (p_from, p_to, p_cents, coalesce(p_note, ''),
          case when v_direct then 'confirmed' else 'pending' end, v_me,
          case when v_direct then now() end)
  returning * into v_p;
  return v_p;
end $$;

create or replace function public.save_car(p_name text, p_nickname text, p_consumption float8, p_seats int, p_fuel_price float8)
returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := _me();
begin
  if p_consumption is null or p_consumption < 2 or p_consumption > 20 then
    raise exception 'Verbrauch bitte zwischen 2 und 20 l/100 km.';
  end if;
  if p_fuel_price is null or p_fuel_price < 1 or p_fuel_price > 3.5 then
    raise exception 'Spritpreis bitte zwischen 1,00 und 3,50 €/l.';
  end if;
  if char_length(coalesce(p_name, '')) > 30 or char_length(coalesce(p_nickname, '')) > 30 then
    raise exception 'Auto und Spitzname bitte kürzer als 30 Zeichen.';
  end if;
  insert into cars (owner_id, name, nickname, consumption, seats, fuel_price, updated_at)
  values (v_me, coalesce(nullif(trim(p_name), ''), 'Auto'), coalesce(trim(p_nickname), ''), p_consumption,
          greatest(1, least(4, coalesce(p_seats, 1))), p_fuel_price, now())
  on conflict (owner_id) do update set
    name = excluded.name, nickname = excluded.nickname, consumption = excluded.consumption,
    seats = excluded.seats, fuel_price = excluded.fuel_price, updated_at = now();
end $$;

create or replace function public.save_route(p_id uuid, p_from_code text, p_from_name text, p_to_code text, p_to_name text, p_km float8)
returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := _me(); v_fc text := upper(trim(coalesce(p_from_code, ''))); v_tc text := upper(trim(coalesce(p_to_code, '')));
begin
  if v_fc !~ '^[A-ZÄÖÜ0-9]{3}$' or v_tc !~ '^[A-ZÄÖÜ0-9]{3}$' then raise exception 'Flughafencodes brauchen 3 Buchstaben oder Ziffern.'; end if;
  if p_km is null or p_km < 1 or p_km > 500 then raise exception 'Strecke bitte zwischen 1 und 500 km.'; end if;
  if coalesce(trim(p_from_name), '') = '' or coalesce(trim(p_to_name), '') = '' then raise exception 'Ortsnamen fehlen.'; end if;
  if char_length(trim(p_from_name)) > 30 or char_length(trim(p_to_name)) > 30 then raise exception 'Ortsnamen bitte kürzer als 30 Zeichen.'; end if;
  if p_id is null then
    insert into routes (created_by, from_code, from_name, to_code, to_name, km)
    values (v_me, v_fc, trim(p_from_name), v_tc, trim(p_to_name), p_km);
  else
    update routes set from_code = v_fc, from_name = trim(p_from_name), to_code = v_tc, to_name = trim(p_to_name), km = p_km
    where id = p_id;
  end if;
end $$;

create or replace function public.rename_member(p_target uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := _me();
begin
  if v_me <> p_target and not is_admin() then raise exception 'Nicht erlaubt.'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Name fehlt.'; end if;
  if char_length(trim(p_name)) > 20 then raise exception 'Name bitte kürzer als 20 Zeichen.'; end if;
  update members set name = trim(p_name) where id = p_target;
end $$;
