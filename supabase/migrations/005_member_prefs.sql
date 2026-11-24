-- Persönliche Einstellungen (Farbe, App-Icon, Sound) pro Person, damit sie auf allen Geräten
-- und nach dem Neu-Hinzufügen zum Homescreen automatisch wieder da sind. NULL = noch nie gespeichert.
alter table public.members
  add column accent text check (accent in ('orange', 'tuerkis')),
  add column icon_style text check (icon_style in ('classic', 'polo')),
  add column sound boolean;

create function public.save_prefs(p_accent text, p_icon_style text, p_sound boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := _me();
begin
  update members set accent = p_accent, icon_style = p_icon_style, sound = p_sound where id = v_me;
end $$;

revoke execute on function public.save_prefs(text, text, boolean) from public, anon;
grant execute on function public.save_prefs(text, text, boolean) to authenticated;
