-- Interne Hilfsfunktionen nicht über die API aufrufbar machen (Supabase vergibt EXECUTE standardmäßig an authenticated).
revoke execute on function public._me(), public._departure(public.flights), public._end_of_day(public.flights), public._seats(int) from authenticated, anon, public;
