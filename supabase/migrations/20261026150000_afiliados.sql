-- Programa de afiliados de verdade: cada aluno tem o próprio link, cliques, vendas, comissão e saque.
-- Comissão por nível (pela quantidade de vendas pagas antes de cada venda):
--   Tripulante 0+ : 30% na 1ª venda / 15% na renovação
--   Comissário 5+ : 35% / 15%
--   Piloto     20+: 40% / 20%
--   Comandante 50+: 45% / 20%
-- Liberada 7 dias depois do pagamento (garantia). Reembolso ou contestação cancelam. Autoindicação não conta.

create table if not exists public.afiliados (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  codigo    text not null unique check (codigo ~ '^[a-z0-9-]{3,24}$'),
  criado_em timestamptz not null default now()
);

create table if not exists public.afiliado_cliques (
  id        bigint generated always as identity primary key,
  codigo    text not null,
  origem    text not null default 'link' check (origem in ('link', 'ig', 'wa', 'tt', 'yt')),
  criado_em timestamptz not null default now()
);
create index if not exists afiliado_cliques_codigo_idx on public.afiliado_cliques (codigo, criado_em);

create table if not exists public.afiliado_saques (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  valor      numeric(10, 2) not null check (valor >= 50),
  chave_pix  text not null check (char_length(chave_pix) between 5 and 120),
  status     text not null default 'solicitado' check (status in ('solicitado', 'pago', 'recusado')),
  obs        text,
  criado_em  timestamptz not null default now(),
  pago_em    timestamptz
);
create index if not exists afiliado_saques_user_idx on public.afiliado_saques (user_id);

alter table public.pedidos add column if not exists afiliado text;
create index if not exists pedidos_afiliado_idx on public.pedidos (afiliado) where afiliado is not null;

alter table public.afiliados enable row level security;
alter table public.afiliado_cliques enable row level security;
alter table public.afiliado_saques enable row level security;
revoke all on public.afiliados, public.afiliado_cliques, public.afiliado_saques from anon, authenticated;

-- Vendas atribuídas a cada afiliado, com tipo, nível na hora da venda, status e comissão.
create or replace function public.hs_vendas_afiliado(p_user uuid)
returns table (id uuid, cliente text, plano text, tipo text, status text, valor numeric, pct int, comissao numeric, pago_em timestamptz)
language sql stable security definer set search_path = '' as $$
  with a as (select codigo from public.afiliados where user_id = p_user),
  v as (
    select p.*,
      exists (select 1 from public.pedidos q where q.user_id = p.user_id and q.status in ('pago', 'reembolsado', 'chargeback') and q.pago_em < p.pago_em) as renovacao,
      count(*) filter (where p.status = 'pago') over (order by p.pago_em rows between unbounded preceding and 1 preceding) as antes
    from public.pedidos p, a
    where p.afiliado = a.codigo and p.user_id <> p_user and p.pago_em is not null
      and p.status in ('pago', 'reembolsado', 'chargeback')
  )
  select v.id,
    public.hs_nome_publico(v.user_id),
    v.plano,
    case when v.renovacao then 'Renovação' else '1ª venda' end,
    case when v.status <> 'pago' then 'reemb' when v.pago_em > now() - interval '7 days' then 'garantia' else 'pago' end,
    v.valor_centavos / 100.0,
    x.pct,
    case when v.status = 'pago' then round(v.valor_centavos * x.pct / 10000.0, 2) else 0 end,
    v.pago_em
  from v
  cross join lateral (
    select case
      when coalesce(v.antes, 0) >= 50 then case when v.renovacao then 20 else 45 end
      when coalesce(v.antes, 0) >= 20 then case when v.renovacao then 20 else 40 end
      when coalesce(v.antes, 0) >= 5  then case when v.renovacao then 15 else 35 end
      else case when v.renovacao then 15 else 30 end
    end as pct
  ) x
  order by v.pago_em desc
$$;

-- Código inicial a partir do nome (ou do e-mail), sem repetir.
create or replace function public.hs_codigo_afiliado(p_user uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare base text; cand text; n int := 0;
begin
  select lower(regexp_replace(translate(coalesce(nullif(split_part(trim(p.nome), ' ', 1), ''), split_part(u.email, '@', 1)),
           'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'), '[^a-zA-Z0-9]', '', 'g'))
  into base
  from auth.users u left join public.perfis p on p.id = u.id where u.id = p_user;
  base := left(coalesce(nullif(base, ''), 'society'), 16);
  if char_length(base) < 3 then base := base || 'hs'; end if;
  cand := base;
  while exists (select 1 from public.afiliados where codigo = cand) loop
    n := n + 1;
    cand := base || n::text;
  end loop;
  return cand;
end $$;

-- Painel do afiliado (cria o link na primeira visita).
create or replace function public.meu_afiliado()
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); cod text; vendas_pagas int; nivel int; disponivel numeric; garantia numeric; sacado numeric;
begin
  if uid is null then raise exception 'sem login' using errcode = '42501'; end if;
  select codigo into cod from public.afiliados where user_id = uid;
  if cod is null then
    cod := public.hs_codigo_afiliado(uid);
    insert into public.afiliados (user_id, codigo) values (uid, cod) on conflict (user_id) do nothing;
    select codigo into cod from public.afiliados where user_id = uid;
  end if;

  select count(*) filter (where v.status in ('pago', 'garantia')),
         coalesce(sum(v.comissao) filter (where v.status = 'pago'), 0),
         coalesce(sum(v.comissao) filter (where v.status = 'garantia'), 0)
    into vendas_pagas, disponivel, garantia
  from public.hs_vendas_afiliado(uid) v;
  select coalesce(sum(valor), 0) into sacado from public.afiliado_saques where user_id = uid and status in ('solicitado', 'pago');
  nivel := case when vendas_pagas >= 50 then 3 when vendas_pagas >= 20 then 2 when vendas_pagas >= 5 then 1 else 0 end;

  return jsonb_build_object(
    'codigo', cod,
    'nivel', nivel,
    'cliques', (select count(*) from public.afiliado_cliques where codigo = cod),
    'cliques_mes', (select count(*) from public.afiliado_cliques where codigo = cod and criado_em > date_trunc('month', now())),
    'origens', coalesce((select jsonb_object_agg(origem, n) from (select origem, count(*) n from public.afiliado_cliques where codigo = cod group by origem) o), '{}'::jsonb),
    'cadastros', (select count(distinct p.user_id) from public.pedidos p where p.afiliado = cod and p.user_id <> uid),
    'vendas', vendas_pagas,
    'ativos', (select count(distinct v.user_id) from public.pedidos v join public.acessos a on a.user_id = v.user_id
               where v.afiliado = cod and v.user_id <> uid and v.status = 'pago' and a.status = 'ativo' and (a.valido_ate is null or a.valido_ate > now())),
    'disponivel', greatest(disponivel - sacado, 0),
    'garantia', garantia,
    'comissao_mes', coalesce((
      select jsonb_agg(coalesce(s.total, 0) order by m.mes)
      from generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') m(mes)
      left join (select date_trunc('month', pago_em) mes, sum(comissao) total from public.hs_vendas_afiliado(uid) group by 1) s on s.mes = m.mes
    ), '[]'::jsonb),
    'lista', coalesce((select jsonb_agg(jsonb_build_object('data', to_char(v.pago_em at time zone 'America/Sao_Paulo', 'DD/MM'), 'cliente', v.cliente,
               'plano', case when v.plano = 'anual' then 'Anual' else 'Mensal' end, 'tipo', v.tipo, 'status', v.status, 'pct', v.pct,
               'comissao', v.comissao, 'valor', v.valor) order by v.pago_em desc)
             from (select * from public.hs_vendas_afiliado(uid) limit 100) v), '[]'::jsonb),
    'saques', coalesce((select jsonb_agg(jsonb_build_object('valor', s.valor, 'status', s.status, 'data', s.criado_em) order by s.criado_em desc)
             from (select * from public.afiliado_saques where user_id = uid order by criado_em desc limit 20) s), '[]'::jsonb)
  );
end $$;

-- Trocar o próprio link (letras minúsculas, números e hífen).
create or replace function public.mudar_codigo_afiliado(p_codigo text)
returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); novo text := lower(trim(coalesce(p_codigo, '')));
begin
  if uid is null then raise exception 'sem login' using errcode = '42501'; end if;
  if novo !~ '^[a-z0-9-]{3,24}$' then raise exception 'use de 3 a 24 letras minúsculas, números ou hífen'; end if;
  if novo in ('admin', 'hotsociety', 'hot-society', 'cappu', 'suporte', 'oficial') then raise exception 'esse link é reservado'; end if;
  if exists (select 1 from public.afiliados where codigo = novo and user_id <> uid) then raise exception 'esse link já está em uso'; end if;
  insert into public.afiliados (user_id, codigo) values (uid, novo)
  on conflict (user_id) do update set codigo = excluded.codigo;
  return novo;
end $$;

-- Pedido de saque via Pix (a equipe paga e marca no painel).
create or replace function public.solicitar_saque_afiliado(p_chave text)
returns numeric
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); disp numeric;
begin
  if uid is null then raise exception 'sem login' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_chave, ''))) < 5 then raise exception 'informe uma chave Pix válida'; end if;
  if exists (select 1 from public.afiliado_saques where user_id = uid and status = 'solicitado') then
    raise exception 'você já tem um saque em andamento';
  end if;
  disp := (public.meu_afiliado() ->> 'disponivel')::numeric;
  if disp < 50 then raise exception 'saque mínimo de R$ 50'; end if;
  insert into public.afiliado_saques (user_id, valor, chave_pix) values (uid, disp, left(trim(p_chave), 120));
  perform public.hs_registrar('saque_afiliado', (select email from auth.users where id = uid), jsonb_build_object('valor', disp));
  return disp;
end $$;

-- Painel da equipe: saques e ranking de afiliados (Admin e Financeiro).
create or replace function public.painel_afiliados()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.tem_cargo('admin', 'financeiro') then raise exception 'sem permissão' using errcode = '42501'; end if;
  return jsonb_build_object(
    'saques', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'email', u.email, 'codigo', a.codigo, 'valor', s.valor,
               'chave_pix', s.chave_pix, 'status', s.status, 'criado_em', s.criado_em, 'pago_em', s.pago_em) order by (s.status = 'solicitado') desc, s.criado_em desc)
             from public.afiliado_saques s join auth.users u on u.id = s.user_id left join public.afiliados a on a.user_id = s.user_id), '[]'::jsonb),
    'ranking', coalesce((select jsonb_agg(r order by (r ->> 'vendas')::int desc, (r ->> 'cliques')::int desc)
             from (select jsonb_build_object('codigo', a.codigo, 'email', u.email,
                     'cliques', (select count(*) from public.afiliado_cliques c where c.codigo = a.codigo),
                     'vendas', (select count(*) from public.pedidos p where p.afiliado = a.codigo and p.status = 'pago' and p.user_id <> a.user_id)) r
                   from public.afiliados a join auth.users u on u.id = a.user_id) z
             where (r ->> 'cliques')::int > 0 or (r ->> 'vendas')::int > 0), '[]'::jsonb)
  );
end $$;

create or replace function public.marcar_saque_afiliado(p_id uuid, p_status text, p_obs text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.tem_cargo('admin', 'financeiro') then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_status not in ('pago', 'recusado') then raise exception 'status inválido'; end if;
  update public.afiliado_saques set status = p_status, obs = nullif(trim(coalesce(p_obs, '')), ''),
    pago_em = case when p_status = 'pago' then now() end
  where id = p_id and status = 'solicitado';
  if not found then raise exception 'saque não encontrado ou já resolvido'; end if;
  perform public.hs_registrar('saque_afiliado_' || p_status, p_id::text, null);
end $$;

-- Internas: só o servidor chama.
revoke all on function public.hs_vendas_afiliado(uuid), public.hs_codigo_afiliado(uuid) from public, anon, authenticated;
revoke all on function public.meu_afiliado(), public.mudar_codigo_afiliado(text), public.solicitar_saque_afiliado(text),
  public.painel_afiliados(), public.marcar_saque_afiliado(uuid, text, text) from public, anon;
grant execute on function public.meu_afiliado(), public.mudar_codigo_afiliado(text), public.solicitar_saque_afiliado(text),
  public.painel_afiliados(), public.marcar_saque_afiliado(uuid, text, text) to authenticated;
