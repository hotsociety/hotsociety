-- Ajustes gerais do site (chave → valor). Primeiro uso: valor-base do Caixa da comunidade,
-- comprovado na outra aplicação (R$ 236.579,99), somado ao faturamento verificado dos membros daqui.
create table if not exists public.ajustes (
  chave         text primary key,
  valor         jsonb not null,
  atualizado_em timestamptz not null default now()
);
alter table public.ajustes enable row level security;
revoke all on public.ajustes from anon, authenticated;

insert into public.ajustes (chave, valor) values ('caixa_base', '236579.99')
on conflict (chave) do update set valor = excluded.valor, atualizado_em = now();

create or replace function public.comunidade_caixa()
returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'faturado', coalesce((select (a.valor #>> '{}')::numeric from public.ajustes a where a.chave = 'caixa_base'), 0)
                + coalesce((select sum(p.faturado) from public.perfis p), 0),
    'membros', (select count(*) from public.perfis p where p.faturado > 0)
  )
  where auth.uid() is not null
$$;
revoke all on function public.comunidade_caixa() from public, anon;
grant execute on function public.comunidade_caixa() to authenticated;

select public.comunidade_caixa() is null as precisa_login, (select valor from public.ajustes where chave = 'caixa_base') as base;
