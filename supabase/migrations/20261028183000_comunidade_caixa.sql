-- Início: "Caixa da comunidade" = soma do faturamento verificado de todos os membros (prova social).
create or replace function public.comunidade_caixa()
returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'faturado', coalesce(sum(p.faturado), 0),
    'membros', count(*) filter (where p.faturado > 0)
  )
  from public.perfis p
  where auth.uid() is not null
$$;
revoke all on function public.comunidade_caixa() from public, anon;
grant execute on function public.comunidade_caixa() to authenticated;
