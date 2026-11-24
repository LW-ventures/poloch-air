-- Neue Konten (im Dashboard angelegt, Selbst-Registrierung ist aus) automatisch freischalten.
-- Name aus der Adresse: theo@polochair.local -> "Theo", anna-lena@... -> "Anna-Lena".
create function public.auto_member() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if new.email like '%@polochair.local' then
    v_name := initcap(replace(split_part(new.email, '@', 1), '.', ' '));
    begin
      insert into members (id, name) values (new.id, v_name) on conflict do nothing;
    exception when others then
      null; -- Kontoanlage nie blockieren; notfalls von Hand freischalten
    end;
  end if;
  return new;
end $$;

revoke execute on function public.auto_member() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.auto_member();
