-- Programa de afiliados real: cada aluno tem o seu código, cliques, indicações, comissões e saques.
-- Começa tudo zerado. Comissão: % do nível na 1ª venda e na renovação, libera 7 dias depois do pagamento,
-- reembolso ou contestação cancela. Saque via Pix a partir de R$ 50, pago pela equipe (Financeiro).

create table if not exists public.afiliados (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  codigo    text not null unique check (codigo ~ '^[a-z0-9-]{3,24}$'),
  criado_em timestamptz not null default now()
);

create table if not exists public.afiliado_cliques (
  id        bigint generated always as identity primary key,
  afiliado  uuid not null references auth.users (id) on delete cascade,
  origem    text not null default 'direto' check (origem in ('direto', 'ig', 'wa', 'tt', 'yt')),
  visitante text not null, -- hash do IP + dia: o mesmo visitante conta 1 clique por dia
  criado_em timestamptz not null default now(),
  unique (afiliado, visitante, origem)
);
create index if not exists afiliado_cliques_af_idx on public.afiliado_cliques (afiliado, criado_em);

-- Quem chegou por qual afiliado (1ª indicação vale para sempre, para as renovações).
create table if not exists public.indicacoes (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  afiliado  uuid not null references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now(),
  check (user_id <> afiliado)
);
create index if not exists indicacoes_af_idx on public.indicacoes (afiliado);

alter table public.pedidos add column if not exists ref_afiliado uuid references auth.users (id) on delete set null;

create table if not exists public.afiliado_comissoes (
  pedido_id  uuid primary key references public.pedidos (id) on delete cascade,
  afiliado   uuid not null references auth.users (id) on delete cascade,
  cliente    uuid references auth.users (id) on delete set null,
  plano      text not null,
  tipo       text not null check (tipo in ('primeira', 'renovacao')),
  valor_venda numeric(12,2) not null,
  percentual numeric(5,2) not null,
  valor      numeric(12,2) not null,
  cancelada  boolean not null default false,
  pago_em    timestamptz not null default now(),
  libera_em  timestamptz not null default (now() + interval '7 days')
);
create index if not exists afiliado_comissoes_af_idx on public.afiliado_comissoes (afiliado, pago_em desc);

create table if not exists public.afiliado_saques (
  id        uuid primary key default gen_random_uuid(),
  afiliado  uuid not null references auth.users (id) on delete cascade,
  valor     numeric(12,2) not null check (valor >= 50),
  chave_pix text not null check (char_length(chave_pix) between 5 and 120),
  status    text not null default 'pendente' check (status in ('pendente', 'pago', 'recusado')),
  obs       text,
  criado_em timestamptz not null default now(),
  pago_em   timestamptz,
  pago_por  uuid references auth.users (id) on delete set null
);
create index if not exists afiliado_saques_af_idx on public.afiliado_saques (afiliado, criado_em desc);

alter table public.afiliados enable row level security;
alter table public.afiliado_cliques enable row level security;
alter table public.indicacoes enable row level security;
alter table public.afiliado_comissoes enable row level security;
alter table public.afiliado_saques enable row level security;
revoke all on public.afiliados, public.afiliado_cliques, public.indicacoes, public.afiliado_comissoes, public.afiliado_saques from anon, authenticated;

-- Níveis (mesma tabela da tela): vendas de 1ª venda válidas -> % da 1ª venda e da renovação.
create or replace function public.hs_nivel_afiliado(p_af uuid)
returns jsonb
language sql stable security definer set search_path = '' as $$
  with v as (select count(*) n from public.afiliado_comissoes where afiliado = p_af and tipo = 'primeira' and not cancelada)
  select case
    when v.n >= 50 then jsonb_build_object('nivel', 3, 'p1', 45, 'pr', 20, 'vendas', v.n)
    when v.n >= 20 then jsonb_build_object('nivel', 2, 'p1', 40, 'pr', 20, 'vendas', v.n)
    when v.n >= 5  then jsonb_build_object('nivel', 1, 'p1', 35, 'pr', 15, 'vendas', v.n)
    else jsonb_build_object('nivel', 0, 'p1', 30, 'pr', 15, 'vendas', v.n) end
  from v
$$;

-- Código do aluno (cria na primeira vez, a partir do nome).
create or replace function public.hs_codigo_afiliado(p_user uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare c text; base text; n int := 0;
begin
  select codigo into c from public.afiliados where user_id = p_user;
  if c is not null then return c; end if;
  base := left(regexp_replace(lower(translate(coalesce((select split_part(trim(nome), ' ', 1) from public.perfis where id = p_user), 'membro'),
    'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn')), '[^a-z0-9]', '', 'g'), 16);
  if char_length(base) < 3 then base := 'membro'; end if;
  loop
    c := base || case when n = 0 then '' else '-' || substr(md5(random()::text), 1, 4) end;
    begin
      insert into public.afiliados (user_id, codigo) values (p_user, c);
      return c;
    exception when unique_violation then
      n := n + 1;
      if n > 8 then raise; end if;
    end;
  end loop;
end $$;

-- Clique no link /r/<codigo>: chamado pelo site (servidor). Devolve se o código existe.
create or replace function public.registrar_clique(p_codigo text, p_origem text, p_visitante text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare af uuid;
begin
  select user_id into af from public.afiliados where codigo = lower(trim(p_codigo));
  if af is null then return false; end if;
  insert into public.afiliado_cliques (afiliado, origem, visitante)
  values (af, case when p_origem in ('ig', 'wa', 'tt', 'yt') then p_origem else 'direto' end, left(p_visitante, 80))
  on conflict do nothing;
  return true;
end $$;

-- O aluno logado chegou por um link: grava a indicação (só a primeira vale; autoindicação não conta).
create or replace function public.registrar_indicacao(p_codigo text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); af uuid;
begin
  if uid is null then return false; end if;
  select user_id into af from public.afiliados where codigo = lower(trim(coalesce(p_codigo, '')));
  if af is null or af = uid then return false; end if;
  insert into public.indicacoes (user_id, afiliado) values (uid, af) on conflict (user_id) do nothing;
  return true;
end $$;

-- Pedido pago: gera a comissão de quem indicou (último clique no pedido; senão, a indicação original).
create or replace function public.hs_registrar_comissao(p_pedido uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare p public.pedidos; af uuid; nv jsonb; tipo text; pct numeric; valor numeric;
begin
  select * into p from public.pedidos where id = p_pedido and status = 'pago';
  if p.id is null then return; end if;
  af := coalesce(p.ref_afiliado, (select afiliado from public.indicacoes where user_id = p.user_id));
  if af is null or af = p.user_id then return; end if;
  -- Primeira compra do cliente ou renovação?
  tipo := case when exists (select 1 from public.pedidos x where x.user_id = p.user_id and x.status = 'pago' and x.id <> p.id and x.criado_em < p.criado_em)
               then 'renovacao' else 'primeira' end;
  nv := public.hs_nivel_afiliado(af);
  pct := case when tipo = 'primeira' then (nv ->> 'p1')::numeric else (nv ->> 'pr')::numeric end;
  valor := round(p.valor_centavos / 100.0 * pct / 100, 2);
  insert into public.afiliado_comissoes (pedido_id, afiliado, cliente, plano, tipo, valor_venda, percentual, valor, pago_em, libera_em)
  values (p.id, af, p.user_id, p.plano, tipo, p.valor_centavos / 100.0, pct, valor, coalesce(p.pago_em, now()), coalesce(p.pago_em, now()) + interval '7 days')
  on conflict (pedido_id) do nothing;
  insert into public.indicacoes (user_id, afiliado) values (p.user_id, af) on conflict (user_id) do nothing;
end $$;

-- Reembolso ou contestação: cancela a comissão.
create or replace function public.hs_cancelar_comissao(p_pedido uuid)
returns void
language sql security definer set search_path = '' as $$
  update public.afiliado_comissoes set cancelada = true where pedido_id = p_pedido
$$;

-- Saldo: comissões liberadas menos saques pedidos/pagos.
create or replace function public.hs_saldo_afiliado(p_af uuid)
returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce((select sum(valor) from public.afiliado_comissoes where afiliado = p_af and not cancelada and libera_em <= now()), 0)
       - coalesce((select sum(valor) from public.afiliado_saques where afiliado = p_af and status in ('pendente', 'pago')), 0)
$$;

-- Tela do afiliado: tudo do aluno logado (começa zerado).
create or replace function public.meu_afiliado()
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); cod text; nv jsonb;
begin
  if uid is null then raise exception 'sem login' using errcode = '42501'; end if;
  cod := public.hs_codigo_afiliado(uid);
  nv := public.hs_nivel_afiliado(uid);
  return jsonb_build_object(
    'codigo', cod,
    'nivel', nv,
    'cliques', (select count(*) from public.afiliado_cliques where afiliado = uid),
    'origens', (select jsonb_build_object(
        'ig', count(*) filter (where origem = 'ig'), 'wa', count(*) filter (where origem = 'wa'),
        'tt', count(*) filter (where origem = 'tt'), 'yt', count(*) filter (where origem = 'yt'),
        'direto', count(*) filter (where origem = 'direto'))
      from public.afiliado_cliques where afiliado = uid),
    'cadastros', (select count(*) from public.indicacoes where afiliado = uid),
    'vendas', (nv ->> 'vendas')::int,
    'ativos', (select count(*) from public.indicacoes i join public.acessos a on a.user_id = i.user_id
               where i.afiliado = uid and a.status = 'ativo' and a.origem = 'venda' and (a.valido_ate is null or a.valido_ate > now())),
    'disponivel', public.hs_saldo_afiliado(uid),
    'em_garantia', coalesce((select sum(valor) from public.afiliado_comissoes where afiliado = uid and not cancelada and libera_em > now()), 0),
    'recorrente', coalesce((select sum(valor) from public.afiliado_comissoes where afiliado = uid and not cancelada and tipo = 'renovacao' and pago_em > now() - interval '30 days'), 0),
    'saque_pendente', exists (select 1 from public.afiliado_saques where afiliado = uid and status = 'pendente'),
    'meses', (select jsonb_agg(coalesce(s.v, 0) order by m.mes)
              from generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') m(mes)
              left join (select date_trunc('month', pago_em) mes, sum(valor) v from public.afiliado_comissoes
                         where afiliado = uid and not cancelada group by 1) s on s.mes = m.mes),
    'vendas_lista', coalesce((select jsonb_agg(x order by x ->> 'data' desc) from (
        select jsonb_build_object('data', c.pago_em, 'cliente', public.hs_nome_publico(c.cliente), 'plano', c.plano, 'tipo', c.tipo,
          'status', case when c.cancelada then 'reemb' when c.libera_em > now() then 'garantia' else 'pago' end, 'valor', c.valor) x
        from public.afiliado_comissoes c where c.afiliado = uid order by c.pago_em desc limit 100) z), '[]'::jsonb)
  );
end $$;

-- Trocar o código do link (o antigo para de funcionar).
create or replace function public.mudar_codigo_afiliado(p_codigo text)
returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c text := lower(trim(coalesce(p_codigo, '')));
begin
  if uid is null then raise exception 'sem login' using errcode = '42501'; end if;
  if c !~ '^[a-z0-9-]{3,24}$' then raise exception 'use de 3 a 24 letras, números ou hífen'; end if;
  if c in ('admin', 'hotsociety', 'suporte', 'cappu', 'equipe', 'oficial') then raise exception 'esse link é reservado'; end if;
  perform public.hs_codigo_afiliado(uid);
  if exists (select 1 from public.afiliados where codigo = c and user_id <> uid) then raise exception 'esse link já está em uso'; end if;
  update public.afiliados set codigo = c where user_id = uid;
  return c;
end $$;

create or replace function public.pedir_saque_afiliado(p_valor numeric, p_chave text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); novo uuid;
begin
  if uid is null then raise exception 'sem login' using errcode = '42501'; end if;
  if p_valor is null or p_valor < 50 then raise exception 'saque mínimo de R$ 50'; end if;
  if p_valor > public.hs_saldo_afiliado(uid) then raise exception 'saldo insuficiente'; end if;
  if exists (select 1 from public.afiliado_saques where afiliado = uid and status = 'pendente') then raise exception 'já existe um saque em análise'; end if;
  insert into public.afiliado_saques (afiliado, valor, chave_pix) values (uid, round(p_valor, 2), left(trim(p_chave), 120)) returning id into novo;
  return novo;
end $$;

-- Painel (Admin e Financeiro): saques e resumo do programa.
create or replace function public.painel_afiliados()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.tem_cargo('admin', 'financeiro') then raise exception 'sem permissão' using errcode = '42501'; end if;
  return jsonb_build_object(
    'saques', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'email', u.email, 'nome', public.hs_nome_publico(s.afiliado),
        'valor', s.valor, 'chave_pix', s.chave_pix, 'status', s.status, 'criado_em', s.criado_em, 'pago_em', s.pago_em) order by s.status <> 'pendente', s.criado_em desc)
      from public.afiliado_saques s join auth.users u on u.id = s.afiliado), '[]'::jsonb),
    'ranking', coalesce((select jsonb_agg(r order by (r ->> 'comissao')::numeric desc) from (
        select jsonb_build_object('email', u.email, 'codigo', a.codigo,
          'cliques', (select count(*) from public.afiliado_cliques k where k.afiliado = a.user_id),
          'vendas', (select count(*) from public.afiliado_comissoes c where c.afiliado = a.user_id and not c.cancelada),
          'comissao', coalesce((select sum(valor) from public.afiliado_comissoes c where c.afiliado = a.user_id and not c.cancelada), 0)) r
        from public.afiliados a join auth.users u on u.id = a.user_id
        where exists (select 1 from public.afiliado_comissoes c where c.afiliado = a.user_id)
           or exists (select 1 from public.afiliado_cliques k where k.afiliado = a.user_id)
        limit 50) z), '[]'::jsonb),
    'a_pagar', coalesce((select sum(valor) from public.afiliado_saques where status = 'pendente'), 0),
    'comissoes_total', coalesce((select sum(valor) from public.afiliado_comissoes where not cancelada), 0)
  );
end $$;

create or replace function public.decidir_saque_afiliado(p_id uuid, p_pago boolean, p_obs text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.tem_cargo('admin', 'financeiro') then raise exception 'sem permissão' using errcode = '42501'; end if;
  update public.afiliado_saques
  set status = case when p_pago then 'pago' else 'recusado' end, obs = left(p_obs, 300), pago_em = now(), pago_por = auth.uid()
  where id = p_id and status = 'pendente';
  perform public.hs_registrar(case when p_pago then 'saque_afiliado_pago' else 'saque_afiliado_recusado' end, p_id::text, null);
end $$;

-- Permissões
revoke all on function public.hs_nivel_afiliado(uuid), public.hs_codigo_afiliado(uuid), public.registrar_clique(text, text, text),
  public.hs_registrar_comissao(uuid), public.hs_cancelar_comissao(uuid), public.hs_saldo_afiliado(uuid) from public, anon, authenticated;
grant execute on function public.registrar_clique(text, text, text), public.hs_registrar_comissao(uuid), public.hs_cancelar_comissao(uuid) to service_role;
revoke all on function public.registrar_indicacao(text), public.meu_afiliado(), public.mudar_codigo_afiliado(text),
  public.pedir_saque_afiliado(numeric, text), public.painel_afiliados(), public.decidir_saque_afiliado(uuid, boolean, text) from public, anon;
grant execute on function public.registrar_indicacao(text), public.meu_afiliado(), public.mudar_codigo_afiliado(text),
  public.pedir_saque_afiliado(numeric, text), public.painel_afiliados(), public.decidir_saque_afiliado(uuid, boolean, text) to authenticated;
