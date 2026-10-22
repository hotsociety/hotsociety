-- Mentoria High Ticket dentro da plataforma:
-- turmas, mentorados (liberados pela equipe), encontros em grupo e individuais (sala de vídeo Daily),
-- chat da turma e chat privado mentorado <-> mentor.
-- Mentor = cargo Admin. Tudo passa por funções; as tabelas ficam fechadas.

create or replace function public.hs_e_mentor()
returns boolean
language sql stable security definer set search_path = '' as $$
  select public.tem_cargo('admin')
$$;

create table if not exists public.mentoria_turmas (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null check (char_length(nome) between 2 and 60),
  inicio    date,
  ativa     boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.mentorados (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  turma_id uuid references public.mentoria_turmas (id) on delete set null,
  ativo    boolean not null default true,
  desde    timestamptz not null default now()
);

create table if not exists public.mentoria_encontros (
  id           uuid primary key default gen_random_uuid(),
  turma_id     uuid references public.mentoria_turmas (id) on delete cascade,
  mentorado_id uuid references auth.users (id) on delete cascade,
  titulo       text not null check (char_length(titulo) between 2 and 120),
  inicio       timestamptz not null,
  duracao_min  int not null default 60 check (duracao_min between 15 and 240),
  gravacao_url text check (gravacao_url is null or gravacao_url ~ '^https://'),
  sala         text not null unique default ('hs-' || replace(gen_random_uuid()::text, '-', '')),
  criado_em    timestamptz not null default now(),
  constraint mentoria_encontro_tipo check ((turma_id is null) <> (mentorado_id is null))
);
create index if not exists mentoria_encontros_inicio_idx on public.mentoria_encontros (inicio);

create table if not exists public.mentoria_msgs (
  id        bigint generated always as identity primary key,
  conversa  text not null check (conversa ~ '^(turma|dm):[0-9a-f-]{36}$'),
  user_id   uuid not null references auth.users (id) on delete cascade,
  texto     text not null check (char_length(texto) between 1 and 2000),
  oculto    boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists mentoria_msgs_conversa_idx on public.mentoria_msgs (conversa, id desc);

alter table public.mentoria_turmas enable row level security;
alter table public.mentorados enable row level security;
alter table public.mentoria_encontros enable row level security;
alter table public.mentoria_msgs enable row level security;
revoke all on public.mentoria_turmas, public.mentorados, public.mentoria_encontros, public.mentoria_msgs from anon, authenticated;

-- Turma do mentorado ativo (null se não for mentorado).
create or replace function public.hs_minha_turma()
returns uuid
language sql stable security definer set search_path = '' as $$
  select turma_id from public.mentorados where user_id = auth.uid() and ativo
$$;

create or replace function public.hs_sou_mentorado()
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.mentorados where user_id = auth.uid() and ativo)
$$;

-- Pode ver/escrever nesta conversa?
create or replace function public.hs_pode_conversa(p_conversa text)
returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); ref uuid;
begin
  if uid is null or p_conversa !~ '^(turma|dm):[0-9a-f-]{36}$' then return false; end if;
  if public.hs_e_mentor() then return true; end if;
  ref := split_part(p_conversa, ':', 2)::uuid;
  if p_conversa like 'dm:%' then return coalesce(ref = uid and public.hs_sou_mentorado(), false); end if;
  return coalesce(ref = public.hs_minha_turma(), false);
end $$;

-- ============ Aluno ============

create or replace function public.minha_mentoria()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); t public.mentoria_turmas; mentor boolean := public.hs_e_mentor(); sou boolean;
begin
  if uid is null then raise exception 'sem login' using errcode = '42501'; end if;
  sou := public.hs_sou_mentorado();
  if not sou then return jsonb_build_object('mentorado', false, 'mentor', mentor); end if;
  select * into t from public.mentoria_turmas where id = public.hs_minha_turma();
  return jsonb_build_object(
    'mentorado', true,
    'mentor', mentor,
    'eu', uid,
    'turma', case when t.id is null then null else jsonb_build_object('id', t.id, 'nome', t.nome) end,
    'encontros', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'titulo', e.titulo, 'inicio', e.inicio, 'duracao_min', e.duracao_min,
        'tipo', case when e.turma_id is null then 'individual' else 'grupo' end,
        'gravacao_url', e.gravacao_url) order by e.inicio)
      from public.mentoria_encontros e
      where (e.turma_id = t.id or e.mentorado_id = uid) and e.inicio > now() - interval '120 days'
    ), '[]'::jsonb)
  );
end $$;

create or replace function public.mentoria_mensagens(p_conversa text, p_depois bigint default 0)
returns table (id bigint, autor text, eu boolean, mentor boolean, texto text, criado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if not public.hs_pode_conversa(p_conversa) then raise exception 'sem acesso' using errcode = '42501'; end if;
  return query
    select * from (
      select m.id, public.hs_nome_publico(m.user_id), m.user_id = uid, coalesce(pf.cargo = 'admin', false), m.texto, m.criado_em
      from public.mentoria_msgs m left join public.perfis pf on pf.id = m.user_id
      where m.conversa = p_conversa and not m.oculto and m.id > coalesce(p_depois, 0)
      order by m.id desc
      limit 150
    ) x order by x.id;
end $$;

create or replace function public.mentoria_enviar(p_conversa text, p_texto text)
returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); novo bigint;
begin
  if not public.hs_pode_conversa(p_conversa) then raise exception 'sem acesso' using errcode = '42501'; end if;
  p_texto := left(trim(coalesce(p_texto, '')), 2000);
  if p_texto = '' then raise exception 'escreva algo'; end if;
  if (select count(*) from public.mentoria_msgs where user_id = uid and criado_em > now() - interval '1 minute') >= 10 then
    raise exception 'devagar: muitas mensagens seguidas';
  end if;
  insert into public.mentoria_msgs (conversa, user_id, texto) values (p_conversa, uid, p_texto) returning id into novo;
  return novo;
end $$;

create or replace function public.mentoria_apagar_msg(p_id bigint)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.mentoria_msgs set oculto = true
  where id = p_id and (user_id = auth.uid() or public.hs_e_mentor());
end $$;

-- Dados para entrar na sala de vídeo (a API do site cria a sala e o passe no Daily).
-- Abre 15 min antes e fecha 1 h depois do fim. O mentor entra a partir de 1 h antes.
create or replace function public.mentoria_sala(p_encontro uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); e public.mentoria_encontros; mentor boolean := public.hs_e_mentor(); fim timestamptz;
begin
  if uid is null then raise exception 'sem login' using errcode = '42501'; end if;
  select * into e from public.mentoria_encontros where id = p_encontro;
  if e.id is null then raise exception 'encontro não encontrado'; end if;
  if not mentor and not coalesce(e.mentorado_id = uid or (e.turma_id is not null and e.turma_id = public.hs_minha_turma()), false) then
    raise exception 'sem acesso' using errcode = '42501';
  end if;
  fim := e.inicio + make_interval(mins => e.duracao_min);
  if now() > fim + interval '1 hour' then raise exception 'encontro encerrado'; end if;
  if now() < e.inicio - (case when mentor then interval '1 hour' else interval '15 minutes' end) then
    raise exception 'sala ainda fechada';
  end if;
  return jsonb_build_object(
    'sala', e.sala, 'titulo', e.titulo, 'inicio', e.inicio, 'fim', fim, 'mentor', mentor,
    'nome', coalesce(nullif(trim((select nome from public.perfis where id = uid)), ''), public.hs_nome_publico(uid))
  );
end $$;

-- ============ Painel (mentor) ============

create or replace function public.hs_exigir_mentor()
returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.hs_e_mentor() then raise exception 'sem permissão' using errcode = '42501'; end if;
end $$;

create or replace function public.painel_mentoria()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.hs_exigir_mentor();
  return jsonb_build_object(
    'turmas', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'nome', t.nome, 'inicio', t.inicio, 'ativa', t.ativa,
        'qtd', (select count(*) from public.mentorados x where x.turma_id = t.id and x.ativo)) order by t.criado_em desc)
      from public.mentoria_turmas t), '[]'::jsonb),
    'mentorados', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', d.user_id, 'email', u.email, 'nome', public.hs_nome_publico(d.user_id),
        'turma_id', d.turma_id, 'ativo', d.ativo, 'desde', d.desde) order by d.ativo desc, u.email)
      from public.mentorados d join auth.users u on u.id = d.user_id), '[]'::jsonb),
    'encontros', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'titulo', e.titulo, 'inicio', e.inicio, 'duracao_min', e.duracao_min,
        'turma_id', e.turma_id, 'turma', t.nome, 'mentorado_id', e.mentorado_id, 'mentorado', u.email,
        'gravacao_url', e.gravacao_url) order by e.inicio)
      from public.mentoria_encontros e
      left join public.mentoria_turmas t on t.id = e.turma_id
      left join auth.users u on u.id = e.mentorado_id
      where e.inicio > now() - interval '60 days'), '[]'::jsonb),
    'conversas', coalesce((
      select jsonb_agg(c order by (c ->> 'ultima_em') desc)
      from (
        select jsonb_build_object('conversa', m.conversa, 'nome', public.hs_nome_publico(split_part(m.conversa, ':', 2)::uuid),
          'email', (select email from auth.users where id = split_part(m.conversa, ':', 2)::uuid),
          'ultima', left(m.texto, 120), 'ultima_em', m.criado_em, 'do_mentor', coalesce(pf.cargo = 'admin', false)) c
        from (
          select distinct on (conversa) * from public.mentoria_msgs
          where conversa like 'dm:%' and not oculto order by conversa, id desc
        ) m left join public.perfis pf on pf.id = m.user_id
      ) z), '[]'::jsonb)
  );
end $$;

create or replace function public.mentoria_salvar_turma(p_id uuid, p_nome text, p_inicio date, p_ativa boolean)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare novo uuid;
begin
  perform public.hs_exigir_mentor();
  if p_id is null then
    insert into public.mentoria_turmas (nome, inicio, ativa) values (trim(p_nome), p_inicio, coalesce(p_ativa, true)) returning id into novo;
  else
    update public.mentoria_turmas set nome = trim(p_nome), inicio = p_inicio, ativa = coalesce(p_ativa, true) where id = p_id returning id into novo;
  end if;
  perform public.hs_registrar('mentoria_turma', trim(p_nome), null);
  return novo;
end $$;

-- Libera (ou tira) alguém da mentoria pelo e-mail da conta.
create or replace function public.mentoria_definir_mentorado(p_email text, p_turma uuid, p_ativo boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare alvo uuid;
begin
  perform public.hs_exigir_mentor();
  select id into alvo from auth.users where lower(email) = lower(trim(p_email));
  if alvo is null then raise exception 'nenhuma conta com esse e-mail'; end if;
  insert into public.mentorados (user_id, turma_id, ativo) values (alvo, p_turma, coalesce(p_ativo, true))
  on conflict (user_id) do update set turma_id = excluded.turma_id, ativo = excluded.ativo;
  perform public.hs_registrar('mentorado', lower(trim(p_email)), jsonb_build_object('turma', p_turma, 'ativo', p_ativo));
end $$;

create or replace function public.mentoria_salvar_encontro(
  p_id uuid, p_titulo text, p_inicio timestamptz, p_duracao int, p_turma uuid, p_mentorado_email text, p_gravacao text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare alvo uuid; novo uuid;
begin
  perform public.hs_exigir_mentor();
  if p_turma is null then
    select id into alvo from auth.users where lower(email) = lower(trim(coalesce(p_mentorado_email, '')));
    if alvo is null then raise exception 'nenhuma conta com esse e-mail'; end if;
  end if;
  p_gravacao := nullif(trim(coalesce(p_gravacao, '')), '');
  if p_id is null then
    insert into public.mentoria_encontros (turma_id, mentorado_id, titulo, inicio, duracao_min, gravacao_url)
    values (p_turma, alvo, trim(p_titulo), p_inicio, coalesce(p_duracao, 60), p_gravacao) returning id into novo;
  else
    update public.mentoria_encontros
    set turma_id = p_turma, mentorado_id = alvo, titulo = trim(p_titulo), inicio = p_inicio,
        duracao_min = coalesce(p_duracao, 60), gravacao_url = p_gravacao
    where id = p_id returning id into novo;
  end if;
  perform public.hs_registrar('mentoria_encontro', trim(p_titulo), jsonb_build_object('inicio', p_inicio));
  return novo;
end $$;

create or replace function public.mentoria_apagar_encontro(p_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.hs_exigir_mentor();
  delete from public.mentoria_encontros where id = p_id;
end $$;

-- Funções internas não ficam expostas na API.
revoke execute on function public.hs_pode_conversa(text), public.hs_exigir_mentor() from anon, authenticated, public;
revoke execute on function public.minha_mentoria(), public.mentoria_mensagens(text, bigint), public.mentoria_enviar(text, text),
  public.mentoria_apagar_msg(bigint), public.mentoria_sala(uuid), public.painel_mentoria(),
  public.mentoria_salvar_turma(uuid, text, date, boolean), public.mentoria_definir_mentorado(text, uuid, boolean),
  public.mentoria_salvar_encontro(uuid, text, timestamptz, int, uuid, text, text), public.mentoria_apagar_encontro(uuid),
  public.hs_e_mentor(), public.hs_minha_turma(), public.hs_sou_mentorado() from anon, public;
grant execute on function public.minha_mentoria(), public.mentoria_mensagens(text, bigint), public.mentoria_enviar(text, text),
  public.mentoria_apagar_msg(bigint), public.mentoria_sala(uuid), public.painel_mentoria(),
  public.mentoria_salvar_turma(uuid, text, date, boolean), public.mentoria_definir_mentorado(text, uuid, boolean),
  public.mentoria_salvar_encontro(uuid, text, timestamptz, int, uuid, text, text), public.mentoria_apagar_encontro(uuid)
  to authenticated;
