-- Insígnias concedidas à mão (somam às liberadas por métrica). Vale também para contas da equipe.
alter table public.perfis add column if not exists insignias_extra text[];

create or replace function public.hs_insignias(p_uid uuid)
returns text[]
language sql stable security definer set search_path = '' as $$
  with t as (
    select coalesce(p.insignias_extra, '{}'::text[]) || array[
      case p.stop_atual when 0 then 'br' when 1 then 'cl' when 2 then 'pt' when 3 then 'ae' when 4 then 'us' else 'mc' end,
      case when m.n >= 300 then 'm300' when m.n >= 100 then 'm100' when m.n >= 50 then 'm50' when m.n >= 10 then 'm10' when m.n >= 1 then 'm1' end,
      case when p.faturado >= 1000000 then 'c1m' when p.faturado >= 500000 then 'c500k' when p.faturado >= 100000 then 'c100k'
           when p.faturado >= 50000 then 'c50k' when p.faturado >= 10000 then 'c10k' when p.faturado >= 1000 then 'c1k' end
    ] as tem
    from public.perfis p
    cross join lateral (select public.hs_missoes_concluidas(p.id) as n) m
    where p.id = p_uid and (p.cargo is null or p.insignias_extra is not null)
  )
  select array_remove(array[
    (select o.x from t, unnest(array['mc','us','ae','pt','cl','br']) with ordinality o(x, i) where o.x = any(t.tem) order by o.i limit 1),
    (select o.x from t, unnest(array['m300','m100','m50','m10','m1']) with ordinality o(x, i) where o.x = any(t.tem) order by o.i limit 1),
    (select o.x from t, unnest(array['c1m','c500k','c100k','c50k','c10k','c1k']) with ordinality o(x, i) where o.x = any(t.tem) order by o.i limit 1)
  ], null)
  from t
$$;
revoke all on function public.hs_insignias(uuid) from public, anon, authenticated;

create or replace function public.minhas_insignias()
returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object('stop', p.stop_atual, 'faturado', p.faturado, 'missoes', public.hs_missoes_concluidas(p.id),
                           'extra', coalesce(p.insignias_extra, '{}'::text[]))
  from public.perfis p where p.id = auth.uid()
$$;
revoke all on function public.minhas_insignias() from public, anon;
grant execute on function public.minhas_insignias() to authenticated;
