-- Alunos vindos da Astron (versão 1): controle da importação e do e-mail de boas-vindas.
-- Os dados importados são só nome, e-mail e telefone (CPF, gênero e nascimento ficam de fora).
create table if not exists public.importacao_astron (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  email          text not null,
  nome           text,
  importado_em   timestamptz not null default now(),
  boas_vindas_em timestamptz
);
alter table public.importacao_astron enable row level security;
revoke all on public.importacao_astron from anon, authenticated;

-- Próximos e-mails de boas-vindas (o envio diário respeita o limite do Resend).
create or replace function public.hs_boas_vindas_pendentes(p_limite int default 60)
returns table (user_id uuid, email text, nome text, valido_ate timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.user_id, i.email, coalesce(nullif(trim(p.nome), ''), i.nome), a.valido_ate
  from public.importacao_astron i
  left join public.perfis p on p.id = i.user_id
  left join public.acessos a on a.user_id = i.user_id
  where i.boas_vindas_em is null
  order by i.importado_em, i.email
  limit least(greatest(p_limite, 1), 100)
$$;
revoke all on function public.hs_boas_vindas_pendentes(int) from public, anon, authenticated;

-- Lembrete de vencimento também para a cortesia dos alunos da Astron.
create or replace function public.hs_lembretes_pendentes()
returns table (user_id uuid, email text, nome text, tipo text, ref text, plano text, valido_ate timestamptz)
language sql stable security definer set search_path = '' as $$
  with ac as (
    select a.user_id, u.email::text as email, coalesce(p.nome, u.raw_user_meta_data ->> 'full_name') as nome, a.plano, a.valido_ate,
           case
             when a.valido_ate between now() + interval '6 days' and now() + interval '7 days' then 'vence_7d'
             when a.valido_ate between now() and now() + interval '1 day' then 'vence_1d'
             when a.valido_ate between now() - interval '1 day' and now() then 'venceu'
           end as tipo
    from public.acessos a
    join auth.users u on u.id = a.user_id
    left join public.perfis p on p.id = a.user_id
    where a.status = 'ativo' and a.valido_ate is not null and p.cargo is null
      and (a.origem = 'venda' or exists (select 1 from public.importacao_astron i where i.user_id = a.user_id))
  ),
  px as (
    select distinct on (x.user_id) x.user_id, x.email, x.nome, 'pix_expirado'::text as tipo, x.id::text as ref, x.plano
    from public.pedidos x
    where x.status in ('pendente', 'expirado') and x.expira_em < now() and x.criado_em > now() - interval '48 hours'
      and not exists (select 1 from public.pedidos y where y.user_id = x.user_id and y.status = 'pago' and y.criado_em >= x.criado_em)
      and not exists (select 1 from public.acessos a where a.user_id = x.user_id and a.status = 'ativo' and (a.valido_ate is null or a.valido_ate > now()))
    order by x.user_id, x.criado_em desc
  )
  select ac.user_id, ac.email, ac.nome, ac.tipo, to_char(ac.valido_ate, 'YYYY-MM-DD'), ac.plano, ac.valido_ate
  from ac
  where ac.tipo is not null
    and not exists (select 1 from public.lembretes_enviados l where l.user_id = ac.user_id and l.tipo = ac.tipo and l.ref = to_char(ac.valido_ate, 'YYYY-MM-DD'))
  union all
  select px.user_id, px.email, px.nome, px.tipo, px.ref, px.plano, null
  from px
  where not exists (select 1 from public.lembretes_enviados l where l.user_id = px.user_id and l.tipo = 'pix_expirado' and l.ref = px.ref)
  limit 500
$$;
revoke all on function public.hs_lembretes_pendentes() from public, anon, authenticated;
