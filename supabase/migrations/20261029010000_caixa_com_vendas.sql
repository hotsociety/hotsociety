-- Caixa da comunidade: valor base comprovado + faturamento verificado dos membros + vendas pagas da plataforma
-- (assinaturas, Hot Store, links de mentoria, adicionais e vendas lançadas pela equipe). Reembolso/contestação saem sozinhos.
create or replace function public.comunidade_caixa()
returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'faturado', coalesce((select (a.valor #>> '{}')::numeric from public.ajustes a where a.chave = 'caixa_base'), 0)
                + coalesce((select sum(p.faturado) from public.perfis p), 0)
                + coalesce((select sum(v.valor) from public.vendas v where v.status = 'pago'), 0),
    'membros', (select count(*) from public.perfis p where p.faturado > 0),
    'vendas', coalesce((select sum(v.valor) from public.vendas v where v.status = 'pago'), 0)
  )
  where auth.uid() is not null
$$;
revoke all on function public.comunidade_caixa() from public, anon;
grant execute on function public.comunidade_caixa() to authenticated;
