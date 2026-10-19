-- HOT SOCIETY · Entrega 3: feed e canais reais, lives, Hot Store (resgates com coins),
-- ranking de games, cofre do HOTPHONE, cupons de desconto e certificados.
-- Pode rodar mais de uma vez. Não apaga dados.

-- Nome que aparece para os outros alunos: "Ana S." (nunca o e-mail).
create or replace function public.hs_nome_publico(p_user uuid)
returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select split_part(n, ' ', 1) || coalesce(' ' || left(nullif(split_part(n, ' ', 2), ''), 1) || '.', '')
    from (select case when p.nome is null or p.nome ~ '@' or trim(p.nome) = '' then null else trim(p.nome) end as n
          from public.perfis p where p.id = p_user) x
    where n is not null), 'Passageiro')
$$;

-- ============ 1) Comunidade: posts, comentários, curtidas, canais e denúncias ============

create table if not exists public.posts (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users (id) on delete cascade,
  tipo      text not null default 'texto' check (tipo in ('texto', 'resultado', 'duvida')),
  texto     text not null check (char_length(texto) between 1 and 2000),
  imagem    text check (char_length(imagem) <= 200),
  oculto    boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists posts_criado_idx on public.posts (criado_em desc) where not oculto;
create index if not exists posts_user_idx on public.posts (user_id);

create table if not exists public.post_curtidas (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  em      timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists post_curtidas_user_idx on public.post_curtidas (user_id);

create table if not exists public.post_comentarios (
  id        bigint generated always as identity primary key,
  post_id   uuid not null references public.posts (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  texto     text not null check (char_length(texto) between 1 and 1000),
  oculto    boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists post_comentarios_post_idx on public.post_comentarios (post_id, criado_em);
create index if not exists post_comentarios_user_idx on public.post_comentarios (user_id);

create table if not exists public.canal_msgs (
  id        bigint generated always as identity primary key,
  canal     text not null check (canal ~ '^[a-z-]{2,20}$'),
  user_id   uuid not null references auth.users (id) on delete cascade,
  texto     text not null check (char_length(texto) between 1 and 1000),
  oculto    boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists canal_msgs_canal_idx on public.canal_msgs (canal, id desc);
create index if not exists canal_msgs_user_idx on public.canal_msgs (user_id);

create table if not exists public.denuncias (
  id        bigint generated always as identity primary key,
  tipo      text not null check (tipo in ('post', 'comentario', 'mensagem')),
  ref       text not null,
  user_id   uuid references auth.users (id) on delete set null,
  motivo    text check (char_length(motivo) <= 300),
  resolvida boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (tipo, ref, user_id)
);
create index if not exists denuncias_abertas_idx on public.denuncias (resolvida, criado_em desc);
create index if not exists denuncias_user_idx on public.denuncias (user_id);

alter table public.posts enable row level security;
alter table public.post_curtidas enable row level security;
alter table public.post_comentarios enable row level security;
alter table public.canal_msgs enable row level security;
alter table public.denuncias enable row level security;
revoke all on public.posts, public.post_curtidas, public.post_comentarios, public.canal_msgs, public.denuncias from anon, authenticated;

-- Fotos do feed: pasta privada, só quem tem acesso vê; cada um envia na própria pasta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feed', 'feed', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "feed: enviar na minha pasta" on storage.objects;
create policy "feed: enviar na minha pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'feed' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.hs_tem_acesso()));

drop policy if exists "feed: ver com acesso" on storage.objects;
create policy "feed: ver com acesso" on storage.objects
  for select to authenticated
  using (bucket_id = 'feed' and (select public.hs_tem_acesso()));

create or replace function public.hs_exigir_acesso()
returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.hs_tem_acesso() then raise exception 'assinatura inativa' using errcode = '42501'; end if;
  return auth.uid();
end $$;

create or replace function public.feed_posts(p_antes timestamptz default null, p_limite int default 20)
returns table (id uuid, autor text, eu boolean, equipe boolean, tipo text, texto text, imagem text, criado_em timestamptz,
               curtidas bigint, curti boolean, comentarios bigint)
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso();
begin
  return query
    select p.id, public.hs_nome_publico(p.user_id), p.user_id = uid, pf.cargo is not null, p.tipo, p.texto, p.imagem, p.criado_em,
           (select count(*) from public.post_curtidas c where c.post_id = p.id),
           exists (select 1 from public.post_curtidas c where c.post_id = p.id and c.user_id = uid),
           (select count(*) from public.post_comentarios k where k.post_id = p.id and not k.oculto)
    from public.posts p left join public.perfis pf on pf.id = p.user_id
    where not p.oculto and (p_antes is null or p.criado_em < p_antes)
    order by p.criado_em desc
    limit least(greatest(p_limite, 1), 50);
end $$;

create or replace function public.publicar_post(p_tipo text, p_texto text, p_imagem text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso(); novo uuid;
begin
  p_texto := left(trim(coalesce(p_texto, '')), 2000);
  if p_texto = '' then raise exception 'escreva algo'; end if;
  if p_tipo not in ('texto', 'resultado', 'duvida') then p_tipo := 'texto'; end if;
  if p_imagem is not null and (split_part(p_imagem, '/', 1) <> uid::text or p_imagem like '%..%') then raise exception 'imagem inválida'; end if;
  if (select count(*) from public.posts where user_id = uid and criado_em > now() - interval '1 day') >= 10 then
    raise exception 'limite de publicações por dia atingido';
  end if;
  insert into public.posts (user_id, tipo, texto, imagem) values (uid, p_tipo, p_texto, p_imagem) returning id into novo;
  return novo;
end $$;

create or replace function public.curtir_post(p_post uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso();
begin
  if exists (select 1 from public.post_curtidas where post_id = p_post and user_id = uid) then
    delete from public.post_curtidas where post_id = p_post and user_id = uid;
    return false;
  end if;
  insert into public.post_curtidas (post_id, user_id)
  select p_post, uid where exists (select 1 from public.posts where id = p_post and not oculto);
  return true;
end $$;

create or replace function public.comentarios_post(p_post uuid)
returns table (id bigint, autor text, eu boolean, equipe boolean, texto text, criado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso();
begin
  return query
    select k.id, public.hs_nome_publico(k.user_id), k.user_id = uid, pf.cargo is not null, k.texto, k.criado_em
    from public.post_comentarios k left join public.perfis pf on pf.id = k.user_id
    where k.post_id = p_post and not k.oculto
    order by k.criado_em
    limit 200;
end $$;

create or replace function public.comentar_post(p_post uuid, p_texto text)
returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso();
begin
  p_texto := left(trim(coalesce(p_texto, '')), 1000);
  if p_texto = '' then raise exception 'escreva algo'; end if;
  if not exists (select 1 from public.posts where id = p_post and not oculto) then raise exception 'post não encontrado'; end if;
  if (select count(*) from public.post_comentarios where user_id = uid and criado_em > now() - interval '1 hour') >= 30 then
    raise exception 'limite de comentários atingido';
  end if;
  insert into public.post_comentarios (post_id, user_id, texto) values (p_post, uid, p_texto);
end $$;

create or replace function public.canal_mensagens(p_canal text, p_depois bigint default 0)
returns table (id bigint, autor text, eu boolean, equipe boolean, texto text, criado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso();
begin
  return query
    select * from (
      select m.id, public.hs_nome_publico(m.user_id), m.user_id = uid, pf.cargo is not null, m.texto, m.criado_em
      from public.canal_msgs m left join public.perfis pf on pf.id = m.user_id
      where m.canal = p_canal and not m.oculto and m.id > coalesce(p_depois, 0)
      order by m.id desc
      limit 100
    ) x order by x.id;
end $$;

create or replace function public.enviar_mensagem(p_canal text, p_texto text)
returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso(); novo bigint;
begin
  p_texto := left(trim(coalesce(p_texto, '')), 1000);
  if p_texto = '' then raise exception 'escreva algo'; end if;
  if (select count(*) from public.canal_msgs where user_id = uid and criado_em > now() - interval '1 minute') >= 8 then
    raise exception 'devagar: muitas mensagens seguidas';
  end if;
  insert into public.canal_msgs (canal, user_id, texto) values (p_canal, uid, p_texto) returning id into novo;
  return novo;
end $$;

-- Apagar: o próprio autor ou a equipe. A equipe fica registrada no histórico.
create or replace function public.apagar_conteudo(p_tipo text, p_ref text)
returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); eq boolean := public.hs_e_equipe(); dono uuid;
begin
  if uid is null then raise exception 'sem login' using errcode = '42501'; end if;
  if p_tipo = 'post' then select user_id into dono from public.posts where id = p_ref::uuid;
  elsif p_tipo = 'comentario' then select user_id into dono from public.post_comentarios where id = p_ref::bigint;
  elsif p_tipo = 'mensagem' then select user_id into dono from public.canal_msgs where id = p_ref::bigint;
  else raise exception 'tipo inválido'; end if;
  if dono is null then raise exception 'não encontrado'; end if;
  if dono <> uid and not eq then raise exception 'sem permissão' using errcode = '42501'; end if;

  if p_tipo = 'post' then update public.posts set oculto = true where id = p_ref::uuid;
  elsif p_tipo = 'comentario' then update public.post_comentarios set oculto = true where id = p_ref::bigint;
  else update public.canal_msgs set oculto = true where id = p_ref::bigint; end if;
  update public.denuncias set resolvida = true where tipo = p_tipo and ref = p_ref;
  if dono <> uid then
    perform public.hs_registrar('moderacao', p_tipo || ' ' || p_ref, jsonb_build_object('autor', (select email::text from auth.users where id = dono)));
  end if;
end $$;

create or replace function public.denunciar(p_tipo text, p_ref text, p_motivo text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso();
begin
  if p_tipo not in ('post', 'comentario', 'mensagem') then raise exception 'tipo inválido'; end if;
  insert into public.denuncias (tipo, ref, user_id, motivo) values (p_tipo, left(p_ref, 60), uid, left(nullif(trim(p_motivo), ''), 300))
  on conflict (tipo, ref, user_id) do nothing;
end $$;

create or replace function public.painel_denuncias()
returns table (tipo text, ref text, denuncias bigint, motivos text, texto text, autor_email text, ultima timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.hs_e_equipe() then raise exception 'sem permissão' using errcode = '42501'; end if;
  return query
    select d.tipo, d.ref, count(*), string_agg(distinct d.motivo, ' · '),
           case d.tipo
             when 'post' then (select p.texto from public.posts p where p.id::text = d.ref)
             when 'comentario' then (select k.texto from public.post_comentarios k where k.id::text = d.ref)
             else (select m.texto from public.canal_msgs m where m.id::text = d.ref) end,
           case d.tipo
             when 'post' then (select u.email::text from public.posts p join auth.users u on u.id = p.user_id where p.id::text = d.ref)
             when 'comentario' then (select u.email::text from public.post_comentarios k join auth.users u on u.id = k.user_id where k.id::text = d.ref)
             else (select u.email::text from public.canal_msgs m join auth.users u on u.id = m.user_id where m.id::text = d.ref) end,
           max(d.criado_em)
    from public.denuncias d
    where not d.resolvida
    group by d.tipo, d.ref
    order by count(*) desc, max(d.criado_em) desc
    limit 200;
end $$;

create or replace function public.ignorar_denuncia(p_tipo text, p_ref text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.hs_e_equipe() then raise exception 'sem permissão' using errcode = '42501'; end if;
  update public.denuncias set resolvida = true where tipo = p_tipo and ref = p_ref;
  perform public.hs_registrar('denuncia_ignorada', p_tipo || ' ' || p_ref, null);
end $$;

-- ============ 2) Lives ============

create table if not exists public.lives (
  id        uuid primary key default gen_random_uuid(),
  titulo    text not null check (char_length(titulo) between 3 and 120),
  descricao text check (char_length(descricao) <= 400),
  inicio    timestamptz not null,
  link      text check (link ~ '^https://'),
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now()
);
create index if not exists lives_inicio_idx on public.lives (inicio);
create index if not exists lives_criado_por_idx on public.lives (criado_por);
alter table public.lives enable row level security;
revoke all on public.lives from anon, authenticated;

-- Próximas lives (e a que começou há menos de 3 h). O link só vai para quem tem acesso.
create or replace function public.proximas_lives()
returns table (id uuid, titulo text, descricao text, inicio timestamptz, link text)
language plpgsql stable security definer set search_path = '' as $$
declare ok boolean := auth.uid() is not null and public.hs_tem_acesso();
begin
  return query
    select l.id, l.titulo, l.descricao, l.inicio, case when ok then l.link end
    from public.lives l
    where l.inicio > now() - interval '3 hours' or (public.hs_e_equipe() and l.inicio > now() - interval '30 days')
    order by (l.inicio < now() - interval '3 hours'), l.inicio limit 30;
end $$;

create or replace function public.salvar_live(p_id uuid, p_titulo text, p_descricao text, p_inicio timestamptz, p_link text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare r uuid;
begin
  if not public.tem_cargo('admin', 'suporte') then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_id is null then
    insert into public.lives (titulo, descricao, inicio, link, criado_por)
    values (trim(p_titulo), nullif(trim(p_descricao), ''), p_inicio, nullif(trim(p_link), ''), auth.uid()) returning id into r;
  else
    update public.lives set titulo = trim(p_titulo), descricao = nullif(trim(p_descricao), ''), inicio = p_inicio, link = nullif(trim(p_link), '')
    where id = p_id returning id into r;
  end if;
  perform public.hs_registrar('live', trim(p_titulo), jsonb_build_object('inicio', p_inicio));
  return r;
end $$;

create or replace function public.apagar_live(p_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.tem_cargo('admin', 'suporte') then raise exception 'sem permissão' using errcode = '42501'; end if;
  delete from public.lives where id = p_id;
end $$;

-- ============ 3) Hot Store: resgates com Cappu Coins ============

create table if not exists public.loja_itens (
  id     text primary key,
  titulo text not null,
  coins  integer not null check (coins > 0),
  fisico boolean not null default false,
  ativo  boolean not null default true
);
insert into public.loja_itens (id, titulo, coins, fisico) values
  ('mo', 'Moletom HOT SOCIETY', 6000, true),
  ('bn', 'Boné HOT SOCIETY', 3000, true),
  ('hp', 'HOTPHONE Edição Dubai', 2500, false)
on conflict (id) do nothing;
alter table public.loja_itens enable row level security;
revoke all on public.loja_itens from anon, authenticated;

create table if not exists public.resgates (
  id         uuid primary key default gen_random_uuid(),
  protocolo  text not null unique,
  user_id    uuid not null references auth.users (id) on delete cascade,
  item_id    text not null references public.loja_itens (id),
  coins      integer not null,
  tamanho    text check (char_length(tamanho) <= 10),
  endereco   jsonb,
  status     text not null default 'recebido' check (status in ('recebido', 'enviado', 'entregue', 'cancelado')),
  rastreio   text check (char_length(rastreio) <= 80),
  criado_em  timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists resgates_user_idx on public.resgates (user_id);
create index if not exists resgates_item_idx on public.resgates (item_id);
create index if not exists resgates_status_idx on public.resgates (status, criado_em);
alter table public.resgates enable row level security;
revoke all on public.resgates from anon, authenticated;

create or replace function public.resgatar_item(p_item text, p_tamanho text default null, p_endereco jsonb default null)
returns json
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.hs_exigir_acesso();
  it public.loja_itens;
  saldo int;
  prot text;
begin
  select * into it from public.loja_itens where id = p_item and ativo;
  if not found then raise exception 'item indisponível'; end if;
  if not it.fisico and exists (select 1 from public.resgates where user_id = uid and item_id = it.id and status <> 'cancelado') then
    raise exception 'você já tem este item';
  end if;
  if it.fisico and (p_endereco is null or coalesce(p_endereco ->> 'cep', '') !~ '^[0-9]{8}$' or char_length(coalesce(p_endereco ->> 'endereco', '')) < 5) then
    raise exception 'endereço incompleto';
  end if;
  -- debita de forma atômica: só passa se tiver saldo
  update public.perfis set coins = coins - it.coins where id = uid and coins >= it.coins returning coins into saldo;
  if not found then raise exception 'coins insuficientes'; end if;
  prot := public.hs_protocolo('LOJ');
  insert into public.resgates (protocolo, user_id, item_id, coins, tamanho, endereco, status)
  values (prot, uid, it.id, it.coins, left(p_tamanho, 10), case when it.fisico then p_endereco end, case when it.fisico then 'recebido' else 'entregue' end);
  return json_build_object('protocolo', prot, 'saldo', saldo, 'fisico', it.fisico);
end $$;

create or replace function public.meus_resgates()
returns table (id uuid, protocolo text, item_id text, titulo text, coins int, status text, rastreio text, criado_em timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.protocolo, r.item_id, i.titulo, r.coins, r.status, r.rastreio, r.criado_em
  from public.resgates r join public.loja_itens i on i.id = r.item_id
  where r.user_id = auth.uid() order by r.criado_em desc
$$;

create or replace function public.painel_resgates(p_status text default null)
returns table (id uuid, protocolo text, email text, titulo text, coins int, tamanho text, endereco jsonb, status text, rastreio text, criado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.tem_cargo('admin', 'suporte') then raise exception 'sem permissão' using errcode = '42501'; end if;
  return query
    select r.id, r.protocolo, u.email::text, i.titulo, r.coins, r.tamanho, r.endereco, r.status, r.rastreio, r.criado_em
    from public.resgates r join public.loja_itens i on i.id = r.item_id join auth.users u on u.id = r.user_id
    where (p_status is null or r.status = p_status) and i.fisico
    order by (r.status = 'recebido') desc, r.criado_em desc limit 300;
end $$;

-- Cancelar devolve as coins.
create or replace function public.atualizar_resgate(p_id uuid, p_status text, p_rastreio text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare r public.resgates;
begin
  if not public.tem_cargo('admin', 'suporte') then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_status not in ('recebido', 'enviado', 'entregue', 'cancelado') then raise exception 'status inválido'; end if;
  select * into r from public.resgates where id = p_id for update;
  if not found then raise exception 'resgate não encontrado'; end if;
  if r.status = 'cancelado' then raise exception 'resgate já cancelado'; end if;
  update public.resgates set status = p_status, rastreio = left(nullif(trim(p_rastreio), ''), 80), atualizado_em = now() where id = p_id;
  if p_status = 'cancelado' then update public.perfis set coins = coins + r.coins where id = r.user_id; end if;
  perform public.hs_registrar('resgate_status', r.protocolo, jsonb_build_object('para', p_status));
end $$;

-- ============ 4) Games ============

create table if not exists public.jogos_partidas (
  id      bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  jogo    text not null check (jogo in ('quiz', 'hook', 'funil')),
  pontos  smallint not null check (pontos >= 0),
  dia     date not null default public.hs_hoje(),
  em      timestamptz not null default now()
);
create index if not exists jogos_partidas_dia_idx on public.jogos_partidas (dia, user_id);
create index if not exists jogos_partidas_user_idx on public.jogos_partidas (user_id, jogo, dia);
alter table public.jogos_partidas enable row level security;
revoke all on public.jogos_partidas from anon, authenticated;

-- Grava a partida. XP só sobre o melhor resultado do dia em cada jogo (10 XP por ponto),
-- e no máximo 20 partidas por dia: não dá para "farmar".
create or replace function public.registrar_partida(p_jogo text, p_pontos int)
returns json
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.hs_exigir_acesso();
  maxp int := case p_jogo when 'quiz' then 6 when 'hook' then 6 when 'funil' then 5 end;
  antes int;
  ganho int;
begin
  if maxp is null then raise exception 'jogo inválido'; end if;
  p_pontos := least(greatest(coalesce(p_pontos, 0), 0), maxp);
  if (select count(*) from public.jogos_partidas where user_id = uid and dia = public.hs_hoje()) >= 20 then
    return json_build_object('xp', 0, 'limite', true);
  end if;
  select coalesce(max(pontos), 0) into antes from public.jogos_partidas where user_id = uid and jogo = p_jogo and dia = public.hs_hoje();
  insert into public.jogos_partidas (user_id, jogo, pontos) values (uid, p_jogo, p_pontos);
  ganho := greatest(p_pontos - antes, 0) * 10;
  if ganho > 0 then update public.perfis set xp = xp + ganho where id = uid; end if;
  return json_build_object('xp', ganho, 'limite', false);
end $$;

-- Ranking dos últimos 7 dias: soma do melhor resultado de cada jogo por dia.
create or replace function public.ranking_games()
returns table (pos int, nome text, pontos int, eu boolean)
language sql stable security definer set search_path = '' as $$
  with melhor as (
    select user_id, dia, jogo, max(pontos) as p from public.jogos_partidas
    where dia > public.hs_hoje() - 7 group by user_id, dia, jogo
  ), soma as (
    select user_id, sum(p)::int * 10 as pts from melhor group by user_id
  ), r as (
    select s.*, row_number() over (order by s.pts desc, s.user_id) as pos from soma s
    where not exists (select 1 from public.perfis p where p.id = s.user_id and p.cargo is not null)
  )
  select r.pos::int, public.hs_nome_publico(r.user_id), r.pts, r.user_id = auth.uid()
  from r where r.pos <= 10 or r.user_id = auth.uid() order by r.pos
$$;

-- ============ 5) Cofre do HOTPHONE ============

create table if not exists public.cofre (
  user_id uuid primary key references auth.users (id) on delete cascade,
  notas   jsonb not null default '[]' check (jsonb_typeof(notas) = 'array' and pg_column_size(notas) < 300000),
  atualizado_em timestamptz not null default now()
);
alter table public.cofre enable row level security;
revoke all on public.cofre from anon, authenticated;

create or replace function public.meu_cofre()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select notas from public.cofre where user_id = auth.uid()
$$;

create or replace function public.salvar_cofre(p_notas jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sem login' using errcode = '42501'; end if;
  if jsonb_typeof(p_notas) <> 'array' or jsonb_array_length(p_notas) > 300 then raise exception 'cofre inválido'; end if;
  insert into public.cofre (user_id, notas) values (auth.uid(), p_notas)
  on conflict (user_id) do update set notas = excluded.notas, atualizado_em = now();
end $$;

-- ============ 6) Cupons de desconto ============

create table if not exists public.cupons (
  codigo     text primary key check (codigo ~ '^[A-Z0-9]{3,20}$'),
  desconto   smallint not null check (desconto between 1 and 90), -- em %
  planos     text[] not null default array['mensal', 'anual'],
  validade   timestamptz,
  max_usos   integer check (max_usos > 0),
  usos       integer not null default 0,
  ativo      boolean not null default true,
  criado_por uuid references auth.users (id) on delete set null,
  criado_em  timestamptz not null default now()
);
create index if not exists cupons_criado_por_idx on public.cupons (criado_por);
alter table public.cupons enable row level security;
revoke all on public.cupons from anon, authenticated;
grant select, update on public.cupons to service_role;

alter table public.pedidos add column if not exists cupom text;
alter table public.pedidos add column if not exists desconto_centavos integer not null default 0;

-- Confere um cupom (o aluno vê o desconto antes de gerar o Pix).
create or replace function public.conferir_cupom(p_codigo text, p_plano text)
returns json
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select json_build_object('ok', true, 'codigo', c.codigo, 'desconto', c.desconto)
    from public.cupons c
    where c.codigo = upper(trim(p_codigo)) and c.ativo and p_plano = any (c.planos)
      and (c.validade is null or c.validade > now()) and (c.max_usos is null or c.usos < c.max_usos)
  ), json_build_object('ok', false))
$$;

-- Conta o uso quando o pagamento é confirmado (chamada pelo servidor).
create or replace function public.hs_usar_cupom(p_codigo text)
returns void
language sql security definer set search_path = '' as $$
  update public.cupons set usos = usos + 1 where codigo = p_codigo
$$;

create or replace function public.painel_cupons()
returns setof public.cupons
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.tem_cargo('admin', 'financeiro') then raise exception 'sem permissão' using errcode = '42501'; end if;
  return query select * from public.cupons order by criado_em desc;
end $$;

create or replace function public.salvar_cupom(p_codigo text, p_desconto int, p_planos text[], p_validade timestamptz, p_max_usos int, p_ativo boolean)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.tem_cargo('admin', 'financeiro') then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_planos is null or cardinality(p_planos) = 0 or not (p_planos <@ array['mensal', 'anual']) then raise exception 'planos inválidos'; end if;
  insert into public.cupons (codigo, desconto, planos, validade, max_usos, ativo, criado_por)
  values (upper(trim(p_codigo)), p_desconto, p_planos, p_validade, p_max_usos, coalesce(p_ativo, true), auth.uid())
  on conflict (codigo) do update set desconto = excluded.desconto, planos = excluded.planos, validade = excluded.validade,
    max_usos = excluded.max_usos, ativo = excluded.ativo;
  perform public.hs_registrar('cupom', upper(trim(p_codigo)), jsonb_build_object('desconto', p_desconto, 'ativo', p_ativo));
end $$;

-- ============ 7) Certificados ============

create table if not exists public.certificados (
  codigo    text primary key,
  user_id   uuid references auth.users (id) on delete cascade,
  nome      text not null,
  modulo    text not null,
  titulo    text not null,
  emitido_em timestamptz not null default now(),
  unique (user_id, modulo)
);
create index if not exists certificados_user_idx on public.certificados (user_id);
alter table public.certificados enable row level security;
revoke all on public.certificados from anon, authenticated;

-- Módulos e quantidade de aulas (manter igual a app/_lib/demo.ts → MODULOS).
create or replace function public.hs_modulo(p_slug text)
returns table (prefixo text, aulas int, titulo text)
language sql immutable set search_path = '' as $$
  select v.prefixo, v.aulas, v.titulo from (values
    ('comece-aqui', 'm1', 4, 'Comece aqui'),
    ('modelo-ia', 'm2', 8, 'Criando sua modelo IA'),
    ('modelo-real', 'm3', 7, 'Operação com modelo real'),
    ('trafego-funil', 'm4', 9, 'Tráfego e funil'),
    ('escala', 'm5', 6, 'Escala')
  ) v(slug, prefixo, aulas, titulo) where v.slug = p_slug
$$;

create or replace function public.emitir_certificado(p_modulo text, p_nome text)
returns json
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.hs_exigir_acesso();
  m record;
  feitas int;
  c public.certificados;
begin
  select * into m from public.hs_modulo(p_modulo);
  if not found then raise exception 'módulo inválido'; end if;
  select * into c from public.certificados where user_id = uid and modulo = p_modulo;
  if found then return row_to_json(c); end if;
  select count(*) into feitas from public.aulas_feitas
   where user_id = uid and aula_id like m.prefixo || '-%' and split_part(aula_id, '-', 2)::int between 1 and m.aulas;
  if feitas < m.aulas then raise exception 'conclua todas as aulas do módulo'; end if;
  p_nome := left(trim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g')), 80);
  if char_length(p_nome) < 3 then raise exception 'digite seu nome completo'; end if;
  insert into public.certificados (codigo, user_id, nome, modulo, titulo)
  values (upper(substr(md5(gen_random_uuid()::text), 1, 10)), uid, p_nome, p_modulo, m.titulo)
  returning * into c;
  return row_to_json(c);
end $$;

create or replace function public.meus_certificados()
returns setof public.certificados
language sql stable security definer set search_path = '' as $$
  select * from public.certificados where user_id = auth.uid()
$$;

-- Verificação pública pelo código impresso no certificado.
create or replace function public.verificar_certificado(p_codigo text)
returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object('nome', nome, 'titulo', titulo, 'emitido_em', emitido_em)
  from public.certificados where codigo = upper(trim(p_codigo))
$$;

-- ============ Permissões ============

do $$
declare f text;
begin
  foreach f in array array[
    'public.hs_nome_publico(uuid)', 'public.hs_exigir_acesso()', 'public.hs_usar_cupom(text)', 'public.hs_modulo(text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'public.feed_posts(timestamptz, int)', 'public.publicar_post(text, text, text)', 'public.curtir_post(uuid)',
    'public.comentarios_post(uuid)', 'public.comentar_post(uuid, text)', 'public.canal_mensagens(text, bigint)',
    'public.enviar_mensagem(text, text)', 'public.apagar_conteudo(text, text)', 'public.denunciar(text, text, text)',
    'public.painel_denuncias()', 'public.ignorar_denuncia(text, text)',
    'public.proximas_lives()', 'public.salvar_live(uuid, text, text, timestamptz, text)', 'public.apagar_live(uuid)',
    'public.resgatar_item(text, text, jsonb)', 'public.meus_resgates()', 'public.painel_resgates(text)', 'public.atualizar_resgate(uuid, text, text)',
    'public.registrar_partida(text, int)', 'public.ranking_games()', 'public.meu_cofre()', 'public.salvar_cofre(jsonb)',
    'public.conferir_cupom(text, text)', 'public.painel_cupons()', 'public.salvar_cupom(text, int, text[], timestamptz, int, boolean)',
    'public.emitir_certificado(text, text)', 'public.meus_certificados()'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

grant execute on function public.verificar_certificado(text) to anon, authenticated;
grant execute on function public.hs_usar_cupom(text) to service_role;
