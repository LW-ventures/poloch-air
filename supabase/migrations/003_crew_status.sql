-- Für den Admin-Bereich: wann sich wer zuletzt eingeloggt hat. Nur Admins dürfen das abfragen.
create function public.crew_status()
returns table (id uuid, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Nur für Admins.'; end if;
  return query
    select m.id, u.last_sign_in_at from members m join auth.users u on u.id = m.id;
end $$;

revoke execute on function public.crew_status() from public, anon;
grant execute on function public.crew_status() to authenticated;
