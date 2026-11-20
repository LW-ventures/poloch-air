-- Poloch Air: Schema, Zugriffsregeln (RLS) und Spielregeln als Funktionen.
-- Lesen: nur eingeloggte Mitglieder. Schreiben: ausschließlich über die Funktionen unten,
-- die dieselben Regeln prüfen wie src/data/actions.js.

-- ============ Tabellen ============

create table public.members (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null unique,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.cars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.members(id) on delete cascade,
  name text not null,
  nickname text not null default '',
  consumption double precision not null check (consumption > 0 and consumption < 30),
  seats int not null check (seats between 1 and 4),
  fuel_price double precision not null check (fuel_price > 0.5 and fuel_price < 5),
  updated_at timestamptz not null default now()
);

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.members(id) on delete set null,
  from_code text not null check (char_length(from_code) = 3),
  from_name text not null,
  to_code text not null check (char_length(to_code) = 3),
  to_name text not null,
  km double precision not null check (km > 0 and km < 1000)
);

create table public.flights (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.members(id),
  car_id uuid references public.cars(id) on delete set null,
  date date not null,
  time text not null check (time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  km double precision not null check (km > 0),
  from_code text not null,
  from_name text not null,
  to_code text not null,
  to_name text not null,
  seats int not null check (seats between 1 and 4),
  note text not null default '',
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  delay_min int not null default 0 check (delay_min >= 0),
  -- Snapshot zum Zeitpunkt der Ankündigung
  consumption double precision not null,
  fuel_price double precision not null,
  car_name text not null,
  car_nick text not null default '',
  created_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  flight_id uuid not null references public.flights(id) on delete cascade,
  user_id uuid not null references public.members(id),
  seat text not null check (seat in ('1B', '2A', '2C', '2B')),
  status text not null default 'booked' check (status in ('booked', 'cancelled')),
  boarded_at timestamptz,
  verdict text check (verdict in ('flown', 'noshow')),
  created_at timestamptz not null default now()
);
create unique index bookings_one_seat on public.bookings (flight_id, seat) where status = 'booked';
create unique index bookings_one_per_user on public.bookings (flight_id, user_id) where status = 'booked';

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.members(id),
  to_id uuid not null references public.members(id),
  cents int not null check (cents > 0),
  note text not null default '',
  status text not null check (status in ('pending', 'confirmed', 'rejected')),
  created_by uuid not null references public.members(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (from_id <> to_id)
);

create table public.settings (
  id int primary key default 1 check (id = 1),
  splash text not null default 'scheibe' check (splash in ('scheibe', 'airline', 'none'))
);
insert into public.settings default values;

create index on public.flights (driver_id);
create index on public.flights (car_id);
create index on public.flights (date);
create index on public.bookings (flight_id);
create index on public.bookings (user_id);
create index on public.payments (from_id);
create index on public.payments (to_id);
create index on public.payments (created_by);
create index on public.routes (created_by);

-- ============ Hilfsfunktionen ============

create function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where id = auth.uid());
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where id = auth.uid() and is_admin);
$$;

create function public._me() returns uuid
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_member() then raise exception 'Nicht angemeldet.'; end if;
  return auth.uid();
end $$;

create function public._departure(f public.flights) returns timestamptz
language sql stable set search_path = public as $$
  select ((f.date + f.time::time) at time zone 'Europe/Berlin') + make_interval(mins => f.delay_min);
$$;

create function public._end_of_day(f public.flights) returns timestamptz
language sql stable set search_path = public as $$
  select (f.date + time '23:59:59') at time zone 'Europe/Berlin';
$$;

create function public._seats(n int) returns text[]
language sql immutable set search_path = public as $$
  select (array['1B', '2A', '2C', '2B'])[1:greatest(0, least(4, n))];
$$;

-- ============ Zugriff: lesen nur für Mitglieder, schreiben nur über Funktionen ============

alter table public.members enable row level security;
alter table public.cars enable row level security;
alter table public.routes enable row level security;
alter table public.flights enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.settings enable row level security;

create policy members_read on public.members for select to authenticated using ((select public.is_member()));
create policy cars_read on public.cars for select to authenticated using ((select public.is_member()));
create policy routes_read on public.routes for select to authenticated using ((select public.is_member()));
create policy flights_read on public.flights for select to authenticated using ((select public.is_member()));
create policy bookings_read on public.bookings for select to authenticated using ((select public.is_member()));
create policy payments_read on public.payments for select to authenticated using ((select public.is_member()));
create policy settings_read on public.settings for select to authenticated using ((select public.is_member()));

revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate on all tables in schema public from authenticated;

-- ============ Flüge ============

create function public.create_flights(p_legs jsonb, p_seats int, p_note text)
returns setof public.flights
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := _me();
  v_car cars;
  v_leg jsonb;
  v_f flights;
begin
  select * into v_car from cars where owner_id = v_me;
  if not found then raise exception 'Kein Auto hinterlegt.'; end if;
  if p_legs is null or jsonb_array_length(p_legs) = 0 then raise exception 'Mindestens ein Flug nötig.'; end if;
  for v_leg in select * from jsonb_array_elements(p_legs) loop
    if coalesce(v_leg->>'date', '') = '' or coalesce(v_leg->>'time', '') = '' then
      raise exception 'Datum und Uhrzeit fehlen.';
    end if;
    if coalesce((v_leg->>'km')::float8, 0) <= 0 then raise exception 'Strecke braucht eine Länge in km.'; end if;
    insert into flights (driver_id, car_id, date, time, km, from_code, from_name, to_code, to_name,
                         seats, note, consumption, fuel_price, car_name, car_nick)
    values (v_me, v_car.id, (v_leg->>'date')::date, v_leg->>'time', (v_leg->>'km')::float8,
            upper(v_leg->>'fromCode'), v_leg->>'fromName', upper(v_leg->>'toCode'), v_leg->>'toName',
            least(coalesce(p_seats, v_car.seats), 4), coalesce(p_note, ''),
            v_car.consumption, v_car.fuel_price, v_car.name, v_car.nickname)
    returning * into v_f;
    return next v_f;
  end loop;
end $$;

create function public.cancel_flight(p_flight uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := _me(); v_f flights;
begin
  select * into v_f from flights where id = p_flight;
  if not found then raise exception 'Flug nicht gefunden.'; end if;
  if v_f.driver_id <> v_me and not is_admin() then raise exception 'Nur der Pilot kann absagen.'; end if;
  update flights set status = 'cancelled' where id = p_flight;
end $$;

create function public.set_delay(p_flight uuid, p_delay int) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := _me(); v_f flights;
begin
  select * into v_f from flights where id = p_flight;
  if not found then raise exception 'Flug nicht gefunden.'; end if;
  if v_f.driver_id <> v_me and not is_admin() then raise exception 'Nur der Pilot kann verschieben.'; end if;
  update flights set delay_min = greatest(0, coalesce(p_delay, 0)) where id = p_flight;
end $$;

-- ============ Buchungen ============

create function public.book(p_flight uuid, p_seat text) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare v_me uuid := _me(); v_f flights; v_b bookings;
begin
  select * into v_f from flights where id = p_flight for update;
  if not found then raise exception 'Flug nicht gefunden.'; end if;
  if v_f.driver_id = v_me then raise exception 'Der Pilot fliegt sowieso mit.'; end if;
  if v_f.status = 'cancelled' or now() >= _departure(v_f) then raise exception 'Dieser Flug ist nicht mehr buchbar.'; end if;
  if exists (select 1 from bookings where flight_id = p_flight and user_id = v_me and status = 'booked') then
    raise exception 'Du hast schon ein Ticket.';
  end if;
  if not (p_seat = any (_seats(v_f.seats))) then raise exception 'Sitz % gibt es auf diesem Flug nicht.', p_seat; end if;
  begin
    insert into bookings (flight_id, user_id, seat) values (p_flight, v_me, p_seat) returning * into v_b;
  exception when unique_violation then
    raise exception 'Sitz % ist leider weg.', p_seat;
  end;
  return v_b;
end $$;

create function public.change_seat(p_booking uuid, p_seat text) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := _me(); v_b bookings; v_f flights;
begin
  select * into v_b from bookings where id = p_booking and user_id = v_me and status = 'booked';
  if not found then raise exception 'Ticket nicht gefunden.'; end if;
  select * into v_f from flights where id = v_b.flight_id;
  if v_f.status = 'cancelled' or now() >= _departure(v_f) then raise exception 'Sitzwechsel nur bis zum Abflug.'; end if;
  if not (p_seat = any (_seats(v_f.seats))) then raise exception 'Sitz % gibt es auf diesem Flug nicht.', p_seat; end if;
  begin
    update bookings set seat = p_seat where id = p_booking;
  exception when unique_violation then
    raise exception 'Sitz % ist belegt.', p_seat;
  end;
end $$;

create function public.cancel_booking(p_booking uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := _me(); v_b bookings; v_f flights;
begin
  select * into v_b from bookings where id = p_booking and user_id = v_me and status = 'booked';
  if not found then raise exception 'Ticket nicht gefunden.'; end if;
  select * into v_f from flights where id = v_b.flight_id;
  if v_f.status = 'cancelled' or now() >= _departure(v_f) then raise exception 'Stornieren geht nur bis zum Abflug.'; end if;
  if v_b.boarded_at is not null then raise exception 'Schon abgerissen – zu spät.'; end if;
  update bookings set status = 'cancelled' where id = p_booking;
end $$;

create function public.tear(p_booking uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := _me(); v_b bookings; v_f flights;
begin
  select * into v_b from bookings where id = p_booking and user_id = v_me and status = 'booked';
  if not found then raise exception 'Ticket nicht gefunden.'; end if;
  select * into v_f from flights where id = v_b.flight_id;
  if v_f.status = 'cancelled'
     or now() < _departure(v_f) - interval '30 minutes'
     or now() > _end_of_day(v_f) then
    raise exception 'Abreißen geht ab 30 min vor Abflug bis Tagesende.';
  end if;
  update bookings set boarded_at = now() where id = p_booking and boarded_at is null;
end $$;

create function public.set_verdict(p_booking uuid, p_verdict text) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := _me(); v_b bookings; v_f flights;
begin
  select * into v_b from bookings where id = p_booking;
  if not found then raise exception 'Ticket nicht gefunden.'; end if;
  select * into v_f from flights where id = v_b.flight_id;
  if v_f.driver_id <> v_me and not is_admin() then raise exception 'Nur der Pilot kann das klären.'; end if;
  if p_verdict is not null and p_verdict not in ('flown', 'noshow') then raise exception 'Ungültige Angabe.'; end if;
  update bookings set verdict = p_verdict where id = p_booking;
end $$;

-- ============ Zahlungen ============

create function public.add_payment(p_from uuid, p_to uuid, p_cents int, p_note text) returns public.payments
language plpgsql security definer set search_path = public as $$
declare v_me uuid := _me(); v_direct boolean; v_p payments;
begin
  if coalesce(p_cents, 0) <= 0 then raise exception 'Betrag muss größer als 0 sein.'; end if;
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

create function public.resolve_payment(p_payment uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := _me(); v_p payments;
begin
  select * into v_p from payments where id = p_payment;
  if not found then raise exception 'Zahlung nicht gefunden.'; end if;
  if v_p.to_id <> v_me and not is_admin() then raise exception 'Nur der Empfänger kann bestätigen.'; end if;
  if v_p.status <> 'pending' then raise exception 'Diese Zahlung ist schon erledigt.'; end if;
  update payments set status = case when p_accept then 'confirmed' else 'rejected' end, resolved_at = now()
  where id = p_payment;
end $$;

-- ============ Autos & Strecken ============

create function public.save_car(p_name text, p_nickname text, p_consumption float8, p_seats int, p_fuel_price float8)
returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := _me();
begin
  if not (p_consumption > 0 and p_consumption < 30) then raise exception 'Verbrauch bitte in l/100 km (z. B. 6,2).'; end if;
  if not (p_fuel_price > 0.5 and p_fuel_price < 5) then raise exception 'Spritpreis bitte in €/l (z. B. 1,79).'; end if;
  insert into cars (owner_id, name, nickname, consumption, seats, fuel_price, updated_at)
  values (v_me, coalesce(nullif(trim(p_name), ''), 'Auto'), coalesce(trim(p_nickname), ''), p_consumption,
          greatest(1, least(4, coalesce(p_seats, 1))), p_fuel_price, now())
  on conflict (owner_id) do update set
    name = excluded.name, nickname = excluded.nickname, consumption = excluded.consumption,
    seats = excluded.seats, fuel_price = excluded.fuel_price, updated_at = now();
end $$;

create function public.save_route(p_id uuid, p_from_code text, p_from_name text, p_to_code text, p_to_name text, p_km float8)
returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := _me(); v_fc text := upper(left(trim(p_from_code), 3)); v_tc text := upper(left(trim(p_to_code), 3));
begin
  if char_length(v_fc) <> 3 or char_length(v_tc) <> 3 then raise exception 'Flughafencodes brauchen 3 Buchstaben.'; end if;
  if not (p_km > 0 and p_km < 1000) then raise exception 'Länge in km fehlt.'; end if;
  if p_id is null then
    insert into routes (created_by, from_code, from_name, to_code, to_name, km)
    values (v_me, v_fc, trim(p_from_name), v_tc, trim(p_to_name), p_km);
  else
    update routes set from_code = v_fc, from_name = trim(p_from_name), to_code = v_tc, to_name = trim(p_to_name), km = p_km
    where id = p_id;
  end if;
end $$;

create function public.delete_route(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _me();
  delete from routes where id = p_id;
end $$;

-- ============ Personen & Einstellungen ============

create function public.rename_member(p_target uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := _me();
begin
  if v_me <> p_target and not is_admin() then raise exception 'Nicht erlaubt.'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Name fehlt.'; end if;
  update members set name = trim(p_name) where id = p_target;
end $$;

create function public.set_settings(p_splash text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _me();
  if not is_admin() then raise exception 'Nur für Admins.'; end if;
  update settings set splash = p_splash where id = 1;
end $$;

-- ============ Rechte auf Funktionen ============

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_member(), public.is_admin(),
  public.create_flights(jsonb, int, text), public.cancel_flight(uuid), public.set_delay(uuid, int),
  public.book(uuid, text), public.change_seat(uuid, text), public.cancel_booking(uuid), public.tear(uuid),
  public.set_verdict(uuid, text), public.add_payment(uuid, uuid, int, text), public.resolve_payment(uuid, boolean),
  public.save_car(text, text, float8, int, float8),
  public.save_route(uuid, text, text, text, text, float8), public.delete_route(uuid),
  public.rename_member(uuid, text), public.set_settings(text)
to authenticated;

-- ============ Live-Updates ============

alter publication supabase_realtime add table
  public.members, public.cars, public.routes, public.flights, public.bookings, public.payments, public.settings;
