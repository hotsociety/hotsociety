-- Medalhas concedidas à mão (siglas da página Ranking: 1M, 3M, 6M, 1A, 1ª, 10K, 50K, 100K).
alter table public.perfis add column if not exists medalhas_extra text[];

create or replace function public.minhas_insignias()
returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object('stop', p.stop_atual, 'faturado', p.faturado, 'missoes', public.hs_missoes_concluidas(p.id),
                           'extra', coalesce(p.insignias_extra, '{}'::text[]),
                           'medalhas', coalesce(p.medalhas_extra, '{}'::text[]))
  from public.perfis p where p.id = auth.uid()
$$;
revoke all on function public.minhas_insignias() from public, anon;
grant execute on function public.minhas_insignias() to authenticated;
