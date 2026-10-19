-- HOT SOCIETY · Entrega 1: chamados de suporte, pedidos de placa e conteúdo das aulas
-- Pode rodar mais de uma vez. Não apaga dados.
--
-- 1) Suporte: o aluno abre chamado e recebe protocolo na hora (Decreto 7.962/2013, art. 4º).
--    A equipe responde pelo painel. Tudo fica gravado.
-- 2) Placas: o pedido grava endereço e só é aceito se o faturamento verificado bater a meta.
-- 3) Aulas: link do vídeo, duração e material de cada aula ficam no banco
--    e só quem tem acesso ativo (ou a equipe) consegue ler.

create sequence if not exists public.protocolo_seq start 1001;

-- Protocolo legível: HS-SUP-261020-1001, HS-PLQ-261020-1002 ...
create or replace function public.hs_protocolo(p_tipo text)
returns text
language sql volatile security definer set search_path = '' as $$
  select 'HS-' || p_tipo || '-' || to_char(now() at time zone 'America/Sao_Paulo', 'YYMMDD') || '-' || nextval('public.protocolo_seq')
$$;

create or replace function public.hs_e_equipe()
returns boolean
language sql stable security definer set search_path = '' as $$
  select public.tem_cargo('admin', 'financeiro', 'suporte')
$$;

-- ============ 1) Suporte ============

create table if not exists public.chamados (
  id            uuid primary key default gen_random_uuid(),
  protocolo     text not null unique,
  user_id       uuid not null references auth.users (id) on delete cascade,
  email         text not null,
  tema          text not null check (char_length(tema) between 1 and 60),
  assunto       text not null check (char_length(assunto) between 3 and 120),
  status        text not null default 'aberto' check (status in ('aberto', 'respondido', 'resolvido')),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists chamados_user_idx on public.chamados (user_id, criado_em desc);
create index if not exists chamados_status_idx on public.chamados (status, atualizado_em desc);

create table if not exists public.chamado_msgs (
  id         bigint generated always as identity primary key,
  chamado_id uuid not null references public.chamados (id) on delete cascade,
  autor      uuid references auth.users (id) on delete set null,
  equipe     boolean not null default false,
  texto      text not null check (char_length(texto) between 1 and 4000),
  em         timestamptz not null default now()
);
create index if not exists chamado_msgs_chamado_idx on public.chamado_msgs (chamado_id, em);
create index if not exists chamado_msgs_autor_idx on public.chamado_msgs (autor);

alter table public.chamados enable row level security;
alter table public.chamado_msgs enable row level security;
-- Sem acesso direto: tudo passa pelas funções abaixo.
revoke all on public.chamados, public.chamado_msgs from anon, authenticated;

create or replace function public.abrir_chamado(p_tema text, p_assunto text, p_texto text)
returns json
language plpgsql security definer set search_path = '' as $$
declare
  uid   uuid := auth.uid();
  mail  text;
  prot  text;
  novo  uuid;
begin
  if uid is null then raise exception 'sem login' using errcode = '42501'; end if;
  p_tema := left(trim(coalesce(p_tema, '')), 60);
  p_assunto := left(trim(coalesce(p_assunto, '')), 120);
  p_texto := left(trim(coalesce(p_texto, '')), 4000);
  if p_tema = '' then p_tema := 'Outro'; end if;
  if char_length(p_assunto) < 3 then raise exception 'escreva o assunto'; end if;
  if char_length(p_texto) < 5 then raise exception 'conte o que aconteceu'; end if;
  -- trava contra abuso: até 5 chamados por dia
  if (select count(*) from public.chamados where user_id = uid and criado_em > now() - interval '1 day') >= 5 then
    raise exception 'limite de chamados por dia atingido';
  end if;

  select email::text into mail from auth.users where id = uid;
  prot := public.hs_protocolo('SUP');
  insert into public.chamados (protocolo, user_id, email, tema, assunto)
  values (prot, uid, mail, p_tema, p_assunto) returning id into novo;
  insert into public.chamado_msgs (chamado_id, autor, equipe, texto) values (novo, uid, false, p_texto);
  return json_build_object('id', novo, 'protocolo', prot, 'email', mail, 'assunto', p_assunto, 'tema', p_tema);
end $$;

create or replace function public.meus_chamados()
returns table (id uuid, protocolo text, tema text, assunto text, status text, criado_em timestamptz, atualizado_em timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, c.protocolo, c.tema, c.assunto, c.status, c.criado_em, c.atualizado_em
  from public.chamados c
  where c.user_id = auth.uid()
  order by c.atualizado_em desc
  limit 50
$$;

-- Conversa de um chamado: o dono ou qualquer pessoa da equipe.
create or replace function public.ver_chamado(p_id uuid)
returns json
language plpgsql stable security definer set search_path = '' as $$
declare
  c public.chamados;
  eq boolean := public.hs_e_equipe();
begin
  select * into c from public.chamados where id = p_id;
  if not found or (c.user_id is distinct from auth.uid() and not eq) then
    raise exception 'chamado não encontrado';
  end if;
  return json_build_object(
    'id', c.id, 'protocolo', c.protocolo, 'tema', c.tema, 'assunto', c.assunto, 'status', c.status,
    'criado_em', c.criado_em, 'email', case when eq then c.email end,
    'msgs', coalesce((
      select json_agg(json_build_object(
        'id', m.id, 'equipe', m.equipe, 'texto', m.texto, 'em', m.em,
        'quem', case when m.equipe then coalesce(nullif(split_part(p.nome, ' ', 1), ''), 'Equipe')
                     when c.user_id = auth.uid() then 'Você' else coalesce(nullif(split_part(p.nome, ' ', 1), ''), 'Aluno') end
      ) order by m.em)
      from public.chamado_msgs m left join public.perfis p on p.id = m.autor
      where m.chamado_id = c.id), '[]'::json)
  );
end $$;

-- Resposta: do aluno (reabre o chamado) ou da equipe (marca como respondido).
create or replace function public.responder_chamado(p_id uuid, p_texto text)
returns json
language plpgsql security definer set search_path = '' as $$
declare
  c   public.chamados;
  uid uuid := auth.uid();
  eq  boolean := public.hs_e_equipe();
  dono boolean;
begin
  if uid is null then raise exception 'sem login' using errcode = '42501'; end if;
  p_texto := left(trim(coalesce(p_texto, '')), 4000);
  if char_length(p_texto) < 2 then raise exception 'escreva a mensagem'; end if;
  select * into c from public.chamados where id = p_id for update;
  if not found then raise exception 'chamado não encontrado'; end if;
  dono := c.user_id = uid;
  if not dono and not eq then raise exception 'chamado não encontrado'; end if;
  if dono and (select count(*) from public.chamado_msgs where autor = uid and em > now() - interval '1 day') >= 40 then
    raise exception 'limite de mensagens por dia atingido';
  end if;

  insert into public.chamado_msgs (chamado_id, autor, equipe, texto) values (c.id, uid, eq and not dono, p_texto);
  update public.chamados
     set status = case when eq and not dono then 'respondido' else 'aberto' end, atualizado_em = now()
   where id = c.id;
  if eq and not dono then
    perform public.hs_registrar('chamado_resposta', c.protocolo, jsonb_build_object('email', c.email));
  end if;
  return json_build_object('protocolo', c.protocolo, 'email', c.email, 'assunto', c.assunto, 'equipe', eq and not dono);
end $$;

create or replace function public.mudar_status_chamado(p_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = '' as $$
declare c public.chamados;
begin
  if not public.hs_e_equipe() then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_status not in ('aberto', 'respondido', 'resolvido') then raise exception 'status inválido'; end if;
  update public.chamados set status = p_status, atualizado_em = now() where id = p_id returning * into c;
  if not found then raise exception 'chamado não encontrado'; end if;
  perform public.hs_registrar('chamado_status', c.protocolo, jsonb_build_object('para', p_status));
end $$;

-- O aluno também pode marcar como resolvido.
create or replace function public.encerrar_meu_chamado(p_id uuid)
returns void
language sql security definer set search_path = '' as $$
  update public.chamados set status = 'resolvido', atualizado_em = now() where id = p_id and user_id = auth.uid()
$$;

create or replace function public.painel_chamados(p_status text default null, p_busca text default null, p_limite int default 100)
returns table (id uuid, protocolo text, email text, nome text, tema text, assunto text, status text,
               criado_em timestamptz, atualizado_em timestamptz, msgs bigint, ultima_do_aluno boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.hs_e_equipe() then raise exception 'sem permissão' using errcode = '42501'; end if;
  return query
    select c.id, c.protocolo, c.email, p.nome, c.tema, c.assunto, c.status, c.criado_em, c.atualizado_em,
           (select count(*) from public.chamado_msgs m where m.chamado_id = c.id),
           coalesce((select not m.equipe from public.chamado_msgs m where m.chamado_id = c.id order by m.em desc limit 1), true)
    from public.chamados c left join public.perfis p on p.id = c.user_id
    where (p_status is null or c.status = p_status)
      and (p_busca is null or c.email ilike '%' || p_busca || '%' or c.protocolo ilike '%' || p_busca || '%' or c.assunto ilike '%' || p_busca || '%')
    order by (c.status = 'aberto') desc, c.atualizado_em desc
    limit least(greatest(p_limite, 1), 300);
end $$;

-- ============ 2) Placas ============

create table if not exists public.pedidos_placa (
  id            uuid primary key default gen_random_uuid(),
  protocolo     text not null unique,
  user_id       uuid not null references auth.users (id) on delete cascade,
  placa         text not null check (placa in ('10K', '50K', '100K', '500K')),
  nome_placa    text not null check (char_length(nome_placa) between 1 and 24),
  email         text not null,
  whatsapp      text not null check (whatsapp ~ '^[0-9]{10,13}$'),
  cep           text not null check (cep ~ '^[0-9]{8}$'),
  endereco      text not null check (char_length(endereco) between 5 and 160),
  cidade_uf     text not null check (char_length(cidade_uf) between 3 and 80),
  faturado      numeric(14,2) not null,
  status        text not null default 'recebido' check (status in ('recebido', 'producao', 'enviado', 'entregue', 'recusado')),
  rastreio      text check (char_length(rastreio) <= 80),
  obs           text check (char_length(obs) <= 300),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (user_id, placa)
);
create index if not exists pedidos_placa_status_idx on public.pedidos_placa (status, criado_em desc);

alter table public.pedidos_placa enable row level security;
revoke all on public.pedidos_placa from anon, authenticated;

create or replace function public.hs_meta_placa(p_placa text)
returns numeric
language sql immutable set search_path = '' as $$
  select case p_placa when '10K' then 10000 when '50K' then 50000 when '100K' then 100000 when '500K' then 500000 end::numeric
$$;

create or replace function public.pedir_placa(p jsonb)
returns json
language plpgsql security definer set search_path = '' as $$
declare
  uid  uuid := auth.uid();
  fat  numeric;
  meta numeric := public.hs_meta_placa(p ->> 'placa');
  ex   public.pedidos_placa;
  prot text;
  mail text;
begin
  if uid is null then raise exception 'sem login' using errcode = '42501'; end if;
  if meta is null then raise exception 'placa inválida'; end if;
  if not public.hs_tem_acesso() then raise exception 'assinatura inativa' using errcode = '42501'; end if;

  select * into ex from public.pedidos_placa where user_id = uid and placa = p ->> 'placa';
  if found then return json_build_object('protocolo', ex.protocolo, 'ja_pedido', true, 'status', ex.status); end if;

  select faturado into fat from public.perfis where id = uid;
  if coalesce(fat, 0) < meta then raise exception 'faturamento verificado ainda não chegou na meta desta placa'; end if;

  select email::text into mail from auth.users where id = uid;
  prot := public.hs_protocolo('PLQ');
  insert into public.pedidos_placa (protocolo, user_id, placa, nome_placa, email, whatsapp, cep, endereco, cidade_uf, faturado)
  values (prot, uid, p ->> 'placa', left(trim(p ->> 'nome_placa'), 24), mail,
          regexp_replace(coalesce(p ->> 'whatsapp', ''), '\D', '', 'g'),
          regexp_replace(coalesce(p ->> 'cep', ''), '\D', '', 'g'),
          left(trim(p ->> 'endereco'), 160), left(trim(p ->> 'cidade_uf'), 80), fat);
  return json_build_object('protocolo', prot, 'ja_pedido', false, 'status', 'recebido');
end $$;

create or replace function public.minhas_placas()
returns table (id uuid, protocolo text, placa text, status text, rastreio text, obs text, criado_em timestamptz, atualizado_em timestamptz)
language sql stable security definer set search_path = '' as $$
  select id, protocolo, placa, status, rastreio, obs, criado_em, atualizado_em
  from public.pedidos_placa where user_id = auth.uid() order by criado_em desc
$$;

create or replace function public.painel_placas(p_status text default null)
returns setof public.pedidos_placa
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.tem_cargo('admin', 'suporte') then raise exception 'sem permissão' using errcode = '42501'; end if;
  return query select * from public.pedidos_placa
    where p_status is null or status = p_status
    order by (status in ('recebido', 'producao')) desc, criado_em desc limit 300;
end $$;

create or replace function public.atualizar_placa(p_id uuid, p_status text, p_rastreio text default null, p_obs text default null)
returns public.pedidos_placa
language plpgsql security definer set search_path = '' as $$
declare r public.pedidos_placa;
begin
  if not public.tem_cargo('admin', 'suporte') then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_status not in ('recebido', 'producao', 'enviado', 'entregue', 'recusado') then raise exception 'status inválido'; end if;
  update public.pedidos_placa
     set status = p_status, rastreio = left(nullif(trim(p_rastreio), ''), 80), obs = left(nullif(trim(p_obs), ''), 300), atualizado_em = now()
   where id = p_id returning * into r;
  if not found then raise exception 'pedido não encontrado'; end if;
  perform public.hs_registrar('placa_status', r.protocolo, jsonb_build_object('para', p_status, 'placa', r.placa, 'email', r.email));
  return r;
end $$;

-- ============ 3) Conteúdo das aulas ============

create table if not exists public.aulas_conteudo (
  aula_id        text primary key check (aula_id ~ '^m[0-9]{1,2}-[0-9]{1,2}$'),
  video_url      text check (video_url ~ '^https://(player\.vimeo\.com|vimeo\.com|www\.youtube-nocookie\.com|www\.youtube\.com|youtube\.com|youtu\.be|[a-z0-9-]+\.tv\.pandavideo\.com\.br|player\.pandavideo\.com\.br)/'),
  duracao        text check (duracao ~ '^[0-9]{1,3}:[0-5][0-9]$'),
  material       text check (char_length(material) <= 8000),
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid references auth.users (id) on delete set null
);
create index if not exists aulas_conteudo_por_idx on public.aulas_conteudo (atualizado_por);

alter table public.aulas_conteudo enable row level security;
revoke all on public.aulas_conteudo from anon, authenticated;

-- Só quem tem acesso ativo (a equipe conta como ativa).
create or replace function public.aulas_info()
returns table (aula_id text, video_url text, duracao text, material text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.hs_tem_acesso() then raise exception 'assinatura inativa' using errcode = '42501'; end if;
  return query select a.aula_id, a.video_url, a.duracao, a.material from public.aulas_conteudo a;
end $$;

create or replace function public.salvar_aula(p_aula text, p_video text, p_duracao text, p_material text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.tem_cargo('admin') then raise exception 'sem permissão' using errcode = '42501'; end if;
  insert into public.aulas_conteudo (aula_id, video_url, duracao, material, atualizado_por)
  values (p_aula, nullif(trim(p_video), ''), nullif(trim(p_duracao), ''), nullif(trim(p_material), ''), auth.uid())
  on conflict (aula_id) do update
    set video_url = excluded.video_url, duracao = excluded.duracao, material = excluded.material,
        atualizado_em = now(), atualizado_por = excluded.atualizado_por;
  perform public.hs_registrar('aula_editada', p_aula, jsonb_build_object('tem_video', nullif(trim(p_video), '') is not null));
end $$;

-- ============ Permissões ============

do $$
declare f text;
begin
  foreach f in array array[
    'public.hs_protocolo(text)', 'public.hs_e_equipe()', 'public.hs_meta_placa(text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'public.abrir_chamado(text, text, text)', 'public.meus_chamados()', 'public.ver_chamado(uuid)',
    'public.responder_chamado(uuid, text)', 'public.mudar_status_chamado(uuid, text)', 'public.encerrar_meu_chamado(uuid)',
    'public.painel_chamados(text, text, int)',
    'public.pedir_placa(jsonb)', 'public.minhas_placas()', 'public.painel_placas(text)',
    'public.atualizar_placa(uuid, text, text, text)',
    'public.aulas_info()', 'public.salvar_aula(text, text, text, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
