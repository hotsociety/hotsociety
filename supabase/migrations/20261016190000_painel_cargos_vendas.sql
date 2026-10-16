-- HOT SOCIETY · Painel da equipe: cargos, vendas, acessos e histórico
-- Pode rodar mais de uma vez. Não apaga dados.
--
-- Cargos (coluna perfis.cargo):
--   admin       → tudo, inclusive dar e tirar cargos e ver o histórico
--   financeiro  → vendas, valores, repasses e lançar venda manual
--   suporte     → alunos: liberar/bloquear acesso e ver pedidos SEM valores
-- Toda regra fica no banco. O site só esconde botões; quem não tem cargo
-- recebe "sem permissão" do banco mesmo que tente pelo navegador.

-- ============ Cargo no perfil ============

alter table public.perfis add column if not exists cargo text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'perfis_cargo_ok') then
    alter table public.perfis add constraint perfis_cargo_ok check (cargo in ('admin', 'financeiro', 'suporte'));
  end if;
end $$;
-- (o aluno continua podendo editar só nome, telefone e foto — cargo fica de fora)

-- Quem está logado tem um destes cargos?
create or replace function public.tem_cargo(variadic cargos text[])
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and cargo = any (cargos)
  )
$$;

-- ============ Tabelas ============

create table if not exists public.vendas (
  id                  uuid primary key default gen_random_uuid(),
  pedido              text not null,
  plataforma          text not null default 'manual',
  produto             text not null,
  plano               text check (plano in ('mensal', 'anual', 'avulso')),
  cliente_nome        text,
  cliente_email       text not null,
  user_id             uuid references auth.users(id) on delete set null,
  metodo              text check (metodo in ('pix', 'cartao', 'boleto', 'outro')),
  valor               numeric(12,2) not null default 0 check (valor >= 0),
  liquido             numeric(12,2) not null default 0 check (liquido >= 0), -- "sua parte"
  status              text not null check (status in ('pago', 'pendente', 'recusado', 'reembolsado', 'chargeback', 'cancelado')),
  liberacao_prevista  timestamptz,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),
  bruto               jsonb,
  unique (plataforma, pedido)
);
create index if not exists vendas_criado_em_idx on public.vendas (criado_em desc);
create index if not exists vendas_email_idx on public.vendas (lower(cliente_email));
create index if not exists vendas_user_idx on public.vendas (user_id);

create table if not exists public.acessos (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  status         text not null check (status in ('ativo', 'bloqueado')),
  origem         text not null check (origem in ('venda', 'manual')),
  plano          text,
  valido_ate     timestamptz, -- vazio = sem prazo
  motivo         text,
  atualizado_por uuid references auth.users(id) on delete set null,
  atualizado_em  timestamptz not null default now()
);

create table if not exists public.auditoria (
  id       bigint generated always as identity primary key,
  quem     uuid references auth.users(id) on delete set null,
  acao     text not null,
  alvo     text,
  detalhes jsonb,
  em       timestamptz not null default now()
);
create index if not exists auditoria_em_idx on public.auditoria (em desc);

-- ============ Segurança (RLS) ============

alter table public.vendas    enable row level security;
alter table public.acessos   enable row level security;
alter table public.auditoria enable row level security;

revoke all on public.vendas, public.acessos, public.auditoria from anon, authenticated;
grant select on public.vendas, public.acessos, public.auditoria to authenticated;

drop policy if exists "vendas: admin e financeiro" on public.vendas;
create policy "vendas: admin e financeiro" on public.vendas
  for select to authenticated using ((select public.tem_cargo('admin', 'financeiro')));

drop policy if exists "acessos: o meu" on public.acessos;
create policy "acessos: o meu" on public.acessos
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "acessos: equipe" on public.acessos;
create policy "acessos: equipe" on public.acessos
  for select to authenticated using ((select public.tem_cargo('admin', 'financeiro', 'suporte')));

drop policy if exists "auditoria: admin" on public.auditoria;
create policy "auditoria: admin" on public.auditoria
  for select to authenticated using ((select public.tem_cargo('admin')));

-- ============ Funções internas ============

create or replace function public.hs_registrar(p_acao text, p_alvo text, p_detalhes jsonb)
returns void
language sql security definer set search_path = '' as $$
  insert into public.auditoria (quem, acao, alvo, detalhes) values (auth.uid(), p_acao, p_alvo, p_detalhes)
$$;

-- Aplica no acesso o efeito de uma venda.
create or replace function public.hs_aplicar_venda(v public.vendas)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := v.user_id;
  ate timestamptz;
begin
  if uid is null then
    select id into uid from auth.users where lower(email) = lower(v.cliente_email) limit 1;
    if uid is null then return; end if; -- aluno ainda não criou conta: libera quando criar
    update public.vendas set user_id = uid where id = v.id;
  end if;

  if v.status = 'pago' then
    ate := case v.plano
      when 'mensal' then greatest(now(), v.criado_em) + interval '32 days'
      when 'anual'  then greatest(now(), v.criado_em) + interval '367 days'
      else null end;
    insert into public.acessos (user_id, status, origem, plano, valido_ate, motivo, atualizado_em)
    values (uid, 'ativo', 'venda', v.plano, ate, 'Venda ' || v.pedido, now())
    on conflict (user_id) do update set
      status = 'ativo', origem = 'venda', plano = excluded.plano,
      valido_ate = case
        when public.acessos.valido_ate is null and public.acessos.status = 'ativo' then null
        else greatest(coalesce(public.acessos.valido_ate, now()), excluded.valido_ate) end,
      motivo = excluded.motivo, atualizado_em = now();
  elsif v.status in ('reembolsado', 'chargeback') then
    insert into public.acessos (user_id, status, origem, plano, motivo, atualizado_em)
    values (uid, 'bloqueado', 'venda', v.plano, initcap(v.status) || ' · ' || v.pedido, now())
    on conflict (user_id) do update set
      status = 'bloqueado', motivo = excluded.motivo, atualizado_em = now();
  end if;
end $$;

-- Grava (ou atualiza) uma venda. Chamado pela entrada automática (chave secreta do servidor)
-- e pela venda manual do painel.
create or replace function public.hs_gravar_venda(p jsonb, p_origem text)
returns public.vendas
language plpgsql security definer set search_path = '' as $$
declare
  v public.vendas;
begin
  if coalesce(p ->> 'pedido', '') = '' or coalesce(p ->> 'cliente_email', '') = '' or coalesce(p ->> 'status', '') = '' then
    raise exception 'venda incompleta: pedido, cliente_email e status são obrigatórios';
  end if;

  insert into public.vendas as t (pedido, plataforma, produto, plano, cliente_nome, cliente_email, metodo,
                                  valor, liquido, status, liberacao_prevista, criado_em, bruto)
  values (
    left(p ->> 'pedido', 80),
    left(coalesce(p ->> 'plataforma', p_origem), 40),
    left(coalesce(p ->> 'produto', 'HOT SOCIETY'), 120),
    p ->> 'plano',
    left(p ->> 'cliente_nome', 120),
    lower(left(p ->> 'cliente_email', 200)),
    p ->> 'metodo',
    coalesce((p ->> 'valor')::numeric, 0),
    coalesce((p ->> 'liquido')::numeric, (p ->> 'valor')::numeric, 0),
    p ->> 'status',
    (p ->> 'liberacao_prevista')::timestamptz,
    coalesce((p ->> 'criado_em')::timestamptz, now()),
    p -> 'bruto'
  )
  on conflict (plataforma, pedido) do update set
    status = excluded.status,
    liquido = excluded.liquido,
    liberacao_prevista = coalesce(excluded.liberacao_prevista, t.liberacao_prevista),
    bruto = coalesce(excluded.bruto, t.bruto),
    atualizado_em = now()
  returning * into v;

  perform public.hs_aplicar_venda(v);
  select * into v from public.vendas where id = v.id;
  return v;
end $$;

-- Só o servidor (service_role) chama esta.
create or replace function public.receber_venda(p jsonb)
returns public.vendas
language sql security definer set search_path = '' as $$
  select public.hs_gravar_venda(p, 'webhook')
$$;

-- ============ Funções do painel (cada uma confere o cargo) ============

-- O que o próprio usuário pode fazer (usado para montar o menu e liberar a área).
create or replace function public.meu_acesso()
returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'cargo', p.cargo,
    'ativo', p.cargo is not null or coalesce(a.status = 'ativo' and (a.valido_ate is null or a.valido_ate > now()), false),
    'status', a.status,
    'valido_ate', a.valido_ate
  )
  from (select auth.uid() as uid) u
  left join public.perfis p on p.id = u.uid
  left join public.acessos a on a.user_id = u.uid
$$;

-- Lançar venda manual (admin, financeiro).
create or replace function public.lancar_venda(p jsonb)
returns public.vendas
language plpgsql security definer set search_path = '' as $$
declare v public.vendas;
begin
  if not public.tem_cargo('admin', 'financeiro') then raise exception 'sem permissão' using errcode = '42501'; end if;
  v := public.hs_gravar_venda(p || jsonb_build_object('plataforma', coalesce(p ->> 'plataforma', 'manual')), 'manual');
  perform public.hs_registrar('venda_manual', v.pedido, jsonb_build_object('email', v.cliente_email, 'valor', v.valor, 'status', v.status));
  return v;
end $$;

-- Mudar status de uma venda (admin, financeiro). Ex.: marcar reembolso.
create or replace function public.mudar_status_venda(p_id uuid, p_status text)
returns public.vendas
language plpgsql security definer set search_path = '' as $$
declare v public.vendas; antes text;
begin
  if not public.tem_cargo('admin', 'financeiro') then raise exception 'sem permissão' using errcode = '42501'; end if;
  select status into antes from public.vendas where id = p_id;
  update public.vendas set status = p_status, atualizado_em = now() where id = p_id returning * into v;
  if not found then raise exception 'venda não encontrada'; end if;
  perform public.hs_aplicar_venda(v);
  perform public.hs_registrar('status_venda', v.pedido, jsonb_build_object('de', antes, 'para', p_status));
  return v;
end $$;

-- Pedidos para o suporte: sem valores (admin, financeiro, suporte).
create or replace function public.pedidos_suporte(p_busca text default null, p_limite int default 50)
returns table (id uuid, pedido text, plataforma text, produto text, plano text, cliente_nome text,
               cliente_email text, metodo text, status text, criado_em timestamptz, user_id uuid)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.tem_cargo('admin', 'financeiro', 'suporte') then raise exception 'sem permissão' using errcode = '42501'; end if;
  return query
    select v.id, v.pedido, v.plataforma, v.produto, v.plano, v.cliente_nome, v.cliente_email, v.metodo, v.status, v.criado_em, v.user_id
    from public.vendas v
    where p_busca is null or p_busca = ''
       or v.cliente_email ilike '%' || p_busca || '%'
       or v.cliente_nome ilike '%' || p_busca || '%'
       or v.pedido ilike '%' || p_busca || '%'
    order by v.criado_em desc
    limit least(greatest(p_limite, 1), 200);
end $$;

-- Lista de alunos com e-mail, acesso e cargo (admin, financeiro, suporte).
create or replace function public.painel_alunos(p_busca text default null, p_limite int default 50)
returns table (id uuid, email text, nome text, criado_em timestamptz, ultimo_login timestamptz,
               email_confirmado boolean, cargo text, xp int, acesso text, origem text,
               valido_ate timestamptz, motivo text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.tem_cargo('admin', 'financeiro', 'suporte') then raise exception 'sem permissão' using errcode = '42501'; end if;
  return query
    select u.id, u.email::text, p.nome, u.created_at, u.last_sign_in_at, u.email_confirmed_at is not null,
           p.cargo, coalesce(p.xp, 0),
           case
             when p.cargo is not null then 'equipe'
             when a.status = 'ativo' and (a.valido_ate is null or a.valido_ate > now()) then 'ativo'
             when a.status = 'ativo' then 'vencido'
             when a.status = 'bloqueado' then 'bloqueado'
             else 'sem acesso' end,
           a.origem, a.valido_ate, a.motivo
    from auth.users u
    left join public.perfis p on p.id = u.id
    left join public.acessos a on a.user_id = u.id
    where p_busca is null or p_busca = ''
       or u.email ilike '%' || p_busca || '%'
       or p.nome ilike '%' || p_busca || '%'
    order by u.created_at desc
    limit least(greatest(p_limite, 1), 200);
end $$;

-- Liberar ou bloquear um aluno na mão (admin, suporte).
create or replace function public.definir_acesso(p_user uuid, p_status text, p_dias int default null, p_motivo text default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.tem_cargo('admin', 'suporte') then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_status not in ('ativo', 'bloqueado') then raise exception 'status inválido'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'escreva o motivo'; end if;
  if not exists (select 1 from auth.users where id = p_user) then raise exception 'aluno não encontrado'; end if;

  insert into public.acessos (user_id, status, origem, valido_ate, motivo, atualizado_por, atualizado_em)
  values (p_user, p_status, 'manual',
          case when p_status = 'ativo' and p_dias is not null then now() + make_interval(days => p_dias) end,
          left(p_motivo, 300), auth.uid(), now())
  on conflict (user_id) do update set
    status = excluded.status, origem = 'manual', valido_ate = excluded.valido_ate,
    motivo = excluded.motivo, atualizado_por = excluded.atualizado_por, atualizado_em = now();

  perform public.hs_registrar(case when p_status = 'ativo' then 'liberar_acesso' else 'bloquear_acesso' end,
    (select email from auth.users where id = p_user), jsonb_build_object('dias', p_dias, 'motivo', p_motivo));
end $$;

-- Dar ou tirar cargo (só admin). Ninguém tira o próprio admin, e sempre sobra pelo menos 1 admin.
create or replace function public.definir_cargo(p_email text, p_cargo text)
returns void
language plpgsql security definer set search_path = '' as $$
declare alvo uuid; antes text;
begin
  if not public.tem_cargo('admin') then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_cargo is not null and p_cargo not in ('admin', 'financeiro', 'suporte') then raise exception 'cargo inválido'; end if;

  select id into alvo from auth.users where lower(email) = lower(trim(p_email)) and email_confirmed_at is not null;
  if alvo is null then raise exception 'e-mail não encontrado ou ainda não confirmado'; end if;
  if alvo = auth.uid() and p_cargo is distinct from 'admin' then raise exception 'você não pode tirar o próprio cargo de admin'; end if;

  insert into public.perfis (id) values (alvo) on conflict (id) do nothing;
  select cargo into antes from public.perfis where id = alvo;
  update public.perfis set cargo = p_cargo where id = alvo;

  perform public.hs_registrar('cargo', lower(trim(p_email)), jsonb_build_object('de', antes, 'para', p_cargo));
end $$;

-- Números do painel (admin, financeiro). Datas no fuso de Brasília.
create or replace function public.painel_resumo(p_de date, p_ate date)
returns json
language plpgsql stable security definer set search_path = '' as $$
declare r json;
begin
  if not public.tem_cargo('admin', 'financeiro') then raise exception 'sem permissão' using errcode = '42501'; end if;
  with v as (
    select *, (criado_em at time zone 'America/Sao_Paulo')::date as dia
    from public.vendas
    where (criado_em at time zone 'America/Sao_Paulo')::date between p_de and p_ate
  )
  select json_build_object(
    'bruto',        coalesce(sum(valor)   filter (where status = 'pago'), 0),
    'liquido',      coalesce(sum(liquido) filter (where status = 'pago'), 0),
    'pagos',        count(*) filter (where status = 'pago'),
    'pedidos',      count(*),
    'nao_pagos',    count(*) filter (where status in ('pendente', 'recusado', 'cancelado')),
    'reembolsos',   count(*) filter (where status in ('reembolsado', 'chargeback')),
    'a_receber',    coalesce(sum(liquido) filter (where status = 'pago' and liberacao_prevista > now()), 0),
    'alunos_ativos', (select count(*) from public.acessos a where a.status = 'ativo' and (a.valido_ate is null or a.valido_ate > now())),
    'por_dia', coalesce((
      select json_agg(json_build_object('dia', d.dia, 'valor', d.valor, 'pedidos', d.n) order by d.dia)
      from (select dia, sum(valor) filter (where status = 'pago') as valor, count(*) filter (where status = 'pago') as n
            from v group by dia) d), '[]'::json),
    'por_metodo', coalesce((
      select json_object_agg(coalesce(metodo, 'outro'), n)
      from (select metodo, count(*) n from v where status = 'pago' group by metodo) m), '{}'::json)
  ) into r
  from v;
  return r;
end $$;

-- Quem tem cargo (só admin).
create or replace function public.painel_equipe()
returns table (id uuid, email text, nome text, cargo text, ultimo_login timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.tem_cargo('admin') then raise exception 'sem permissão' using errcode = '42501'; end if;
  return query
    select u.id, u.email::text, p.nome, p.cargo, u.last_sign_in_at
    from public.perfis p join auth.users u on u.id = p.id
    where p.cargo is not null
    order by case p.cargo when 'admin' then 0 when 'financeiro' then 1 else 2 end, u.email;
end $$;

-- Histórico de ações da equipe (só admin).
create or replace function public.painel_historico(p_limite int default 200)
returns table (em timestamptz, quem text, acao text, alvo text, detalhes jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.tem_cargo('admin') then raise exception 'sem permissão' using errcode = '42501'; end if;
  return query
    select a.em, coalesce(u.email::text, 'sistema'), a.acao, a.alvo, a.detalhes
    from public.auditoria a left join auth.users u on u.id = a.quem
    order by a.em desc
    limit least(greatest(p_limite, 1), 500);
end $$;

-- ============ Regras de acesso nas funções do aluno ============

create or replace function public.hs_tem_acesso()
returns boolean
language sql stable security definer set search_path = '' as $$
  select (public.meu_acesso() ->> 'ativo')::boolean
$$;

create or replace function public.concluir_aula(p_aula text)
returns public.perfis
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  n   integer;
  p   public.perfis;
begin
  if uid is null then raise exception 'sem login'; end if;
  if not public.hs_tem_acesso() then raise exception 'assinatura inativa' using errcode = '42501'; end if;

  insert into public.aulas_feitas (user_id, aula_id) values (uid, p_aula) on conflict do nothing;
  get diagnostics n = row_count;

  update public.perfis set
    xp    = xp    + case when n > 0 then 40 else 0 end,
    coins = coins + case when n > 0 then 20 else 0 end
  where id = uid
  returning * into p;
  return p;
end $$;

create or replace function public.avancar_missao(p_missao text)
returns json
language plpgsql security definer set search_path = '' as $$
declare
  uid  uuid := auth.uid();
  hoje date := public.hs_hoje();
  mi   public.missoes;
  per  text;
  mp   public.missoes_progresso;
  ganhou boolean := false;
  p    public.perfis;
begin
  if uid is null then raise exception 'sem login'; end if;
  if not public.hs_tem_acesso() then raise exception 'assinatura inativa' using errcode = '42501'; end if;

  select * into mi from public.missoes where id = p_missao and ativa;
  if not found then raise exception 'missão não existe'; end if;

  per := case mi.tipo
    when 'd' then to_char(hoje, 'YYYY-MM-DD')
    when 's' then to_char(hoje, 'IYYY-"W"IW')
    else to_char(hoje, 'YYYY-MM') end;

  insert into public.missoes_progresso (user_id, missao_id, periodo, feito)
  values (uid, mi.id, per, 1)
  on conflict (user_id, missao_id, periodo)
  do update set feito = least(mi.total, public.missoes_progresso.feito + 1)
  returning * into mp;

  if mp.feito >= mi.total and mp.concluida_em is null then
    update public.missoes_progresso set concluida_em = now()
    where user_id = uid and missao_id = mi.id and periodo = per;
    ganhou := true;
  end if;

  update public.perfis set
    xp    = xp    + case when ganhou then mi.xp else 0 end,
    coins = coins + case when ganhou then mi.coins else 0 end
  where id = uid
  returning * into p;

  return json_build_object('feito', mp.feito, 'total', mi.total, 'concluiu', ganhou, 'perfil', row_to_json(p));
end $$;

-- Quem compra antes de criar a conta: ao criar, a venda é ligada e o acesso liberado.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare v public.vendas;
begin
  insert into public.perfis (id, nome)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)), 80))
  on conflict (id) do nothing;

  for v in select * from public.vendas where user_id is null and lower(cliente_email) = lower(new.email) order by criado_em loop
    perform public.hs_aplicar_venda(v);
  end loop;
  return new;
end $$;

-- ============ Permissões das funções ============

do $$
declare f text;
begin
  -- internas: ninguém chama pela API
  foreach f in array array[
    'public.hs_registrar(text, text, jsonb)', 'public.hs_aplicar_venda(public.vendas)',
    'public.hs_gravar_venda(jsonb, text)', 'public.hs_tem_acesso()', 'public.handle_new_user()',
    'public.receber_venda(jsonb)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
  -- do painel e do aluno: só quem está logado (cada uma confere o cargo por dentro)
  foreach f in array array[
    'public.tem_cargo(text[])', 'public.meu_acesso()', 'public.lancar_venda(jsonb)',
    'public.mudar_status_venda(uuid, text)', 'public.pedidos_suporte(text, int)',
    'public.painel_alunos(text, int)', 'public.definir_acesso(uuid, text, int, text)',
    'public.definir_cargo(text, text)', 'public.painel_resumo(date, date)', 'public.painel_historico(int)', 'public.painel_equipe()',
    'public.concluir_aula(text)', 'public.avancar_missao(text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

grant execute on function public.receber_venda(jsonb) to service_role;
