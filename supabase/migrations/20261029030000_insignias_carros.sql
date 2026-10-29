-- Capital comprovado: Civic (1 mil), Audi TT (10 mil), GT3 RS (50 mil), iate (100 mil), helicóptero (500 mil), jatinho (1 milhão).
create or replace function public.hs_insignias(p_uid uuid)
returns text[]
language sql stable security definer set search_path = '' as $$
  select array_remove(array[
    case p.stop_atual when 0 then 'br' when 1 then 'cl' when 2 then 'pt' when 3 then 'ae' when 4 then 'us' else 'mc' end,
    case when m.n >= 300 then 'm300' when m.n >= 100 then 'm100' when m.n >= 50 then 'm50' when m.n >= 10 then 'm10' when m.n >= 1 then 'm1' end,
    case when p.faturado >= 1000000 then 'c1m' when p.faturado >= 500000 then 'c500k' when p.faturado >= 100000 then 'c100k'
         when p.faturado >= 50000 then 'c50k' when p.faturado >= 10000 then 'c10k' when p.faturado >= 1000 then 'c1k' end
  ], null)
  from public.perfis p
  cross join lateral (select public.hs_missoes_concluidas(p.id) as n) m
  where p.id = p_uid and p.cargo is null
$$;
revoke all on function public.hs_insignias(uuid) from public, anon, authenticated;
