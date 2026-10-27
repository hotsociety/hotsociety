-- 1) Aplicações para a Mentoria High Ticket (site do Cappu e plataforma) no Painel → Mentoria.
-- 2) Aulas novas criadas pelo Painel → Aulas (somam às aulas fixas de cada módulo).

-- ============ Aplicações da mentoria ============

create table if not exists public.mentoria_aplicacoes (
  id         uuid primary key default gen_random_uuid(),
  criado_em  timestamptz not null default now(),
  origem     text not null check (origem in ('insta_cappu', 'plataforma')),
  comentario text not null,                          -- "lead insta cappu" / "lead plataforma"
  nome       text not null check (char_length(nome) between 2 and 80),
  instagram  text not null check (char_length(instagram) between 2 and 60),
  whatsapp   text not null check (whatsapp ~ '^[0-9]{10,13}$'),
  trabalho   text not null check (char_length(trabalho) between 2 and 200),
  momento    text check (char_length(momento) <= 80),
  operacao   text check (char_length(operacao) <= 80),
  trava      text not null check (char_length(trava) between 2 and 1500),
  invest     text check (char_length(invest) <= 80),
  pc         text check (char_length(pc) <= 80),
  tempo      text check (char_length(tempo) <= 80),
  maior18    boolean not null default false,
  user_id    uuid references auth.users (id) on delete set null,
  email      text,
  status     text not null default 'novo' check (status in ('novo', 'contato', 'aprovado', 'recusado')),
  notas      text check (char_length(notas) <= 2000),
  ip_hash    text
);
create index if not exists mentoria_aplicacoes_data_idx on public.mentoria_aplicacoes (criado_em desc);
create index if not exists mentoria_aplicacoes_user_idx on public.mentoria_aplicacoes (user_id);
alter table public.mentoria_aplicacoes enable row level security;
revoke all on public.mentoria_aplicacoes from anon, authenticated;

-- Grava uma aplicação. Só a rota /api/mentoria/aplicacao chama (chave de serviço), que já confere a origem.
create or replace function public.mentoria_registrar_aplicacao(
  p_origem text, p_nome text, p_instagram text, p_whatsapp text, p_trabalho text,
  p_momento text, p_operacao text, p_trava text, p_invest text, p_pc text, p_tempo text,
  p_maior18 boolean, p_user uuid, p_ip text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  wpp text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
  ig  text := left(regexp_replace(trim(coalesce(p_instagram, '')), '^@*', '@'), 60);
  em  text;
  novo uuid;
begin
  if p_origem not in ('insta_cappu', 'plataforma') then raise exception 'origem inválida'; end if;
  if not coalesce(p_maior18, false) then raise exception 'confirme que tem 18 anos ou mais'; end if;
  if char_length(trim(coalesce(p_nome, ''))) < 2 or char_length(ig) < 2 or char_length(trim(coalesce(p_trabalho, ''))) < 2 or char_length(trim(coalesce(p_trava, ''))) < 2 then
    raise exception 'preencha todos os campos';
  end if;
  if wpp !~ '^[0-9]{10,13}$' then raise exception 'whatsapp inválido'; end if;
  -- Freio contra envio repetido: 3 por WhatsApp e 10 por IP a cada hora.
  if (select count(*) from public.mentoria_aplicacoes where whatsapp = wpp and criado_em > now() - interval '1 hour') >= 3
     or (p_ip is not null and (select count(*) from public.mentoria_aplicacoes where ip_hash = p_ip and criado_em > now() - interval '1 hour') >= 10) then
    raise exception 'limite de envios';
  end if;
  if p_user is not null then select u.email into em from auth.users u where u.id = p_user; end if;
  insert into public.mentoria_aplicacoes (origem, comentario, nome, instagram, whatsapp, trabalho, momento, operacao, trava, invest, pc, tempo, maior18, user_id, email, ip_hash)
  values (
    p_origem,
    case p_origem when 'insta_cappu' then 'lead insta cappu' else 'lead plataforma' end,
    left(trim(p_nome), 80), ig, wpp, left(trim(p_trabalho), 200),
    nullif(left(trim(coalesce(p_momento, '')), 80), ''), nullif(left(trim(coalesce(p_operacao, '')), 80), ''),
    left(trim(p_trava), 1500),
    nullif(left(trim(coalesce(p_invest, '')), 80), ''), nullif(left(trim(coalesce(p_pc, '')), 80), ''), nullif(left(trim(coalesce(p_tempo, '')), 80), ''),
    true, p_user, em, p_ip
  ) returning id into novo;
  return novo;
end $$;

-- Lista para o painel (mentor).
create or replace function public.painel_aplicacoes()
returns setof public.mentoria_aplicacoes
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.hs_exigir_mentor();
  return query select * from public.mentoria_aplicacoes order by criado_em desc limit 500;
end $$;

create or replace function public.mentoria_aplicacao_atualizar(p_id uuid, p_status text, p_notas text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.hs_exigir_mentor();
  update public.mentoria_aplicacoes
     set status = p_status, notas = nullif(left(trim(coalesce(p_notas, '')), 2000), '')
   where id = p_id;
  if not found then raise exception 'aplicação não encontrada'; end if;
end $$;

-- ============ Aulas criadas pelo painel ============

alter table public.aulas_conteudo add column if not exists modulo text;
alter table public.aulas_conteudo add column if not exists titulo text check (char_length(titulo) <= 140);

-- Quantidade de aulas fixas por módulo (manter igual a app/_lib/demo.ts → MODULOS).
create or replace function public.hs_modulo_base(p_slug text)
returns table (prefixo text, aulas int, titulo text)
language sql immutable set search_path = '' as $$
  select v.prefixo, v.aulas, v.titulo from (values
    ('introducao', 'm10', 4, 'Introdução · Quem é o Cappu'),
    ('prospectando-white', 'm11', 9, 'Prospectando modelos white'),
    ('arte-do-x1', 'm12', 9, 'A doce arte do X1'),
    ('modelos-ia', 'm13', 18, 'Modelos de IA'),
    ('operacional', 'm14', 14, 'Operacional do zero'),
    ('modelo-white', 'm15', 13, 'Modelo white'),
    ('trafego-pago', 'm16', 3, 'Tráfego pago'),
    ('agencia-ofm', 'm17', 4, 'Abrindo uma agência OFM'),
    ('hot-na-gringa', 'm18', 11, 'Hot na gringa')
  ) v(slug, prefixo, aulas, titulo) where v.slug = p_slug
$$;

-- Total do módulo = fixas + criadas pelo painel (o certificado passa a pedir todas).
create or replace function public.hs_modulo(p_slug text)
returns table (prefixo text, aulas int, titulo text)
language sql stable set search_path = '' as $$
  select b.prefixo, b.aulas + (select count(*)::int from public.aulas_conteudo a where a.modulo = p_slug and a.titulo is not null), b.titulo
  from public.hs_modulo_base(p_slug) b
$$;

-- Aulas criadas pelo painel (o site junta com as fixas). Quem tem acesso vê.
create or replace function public.aulas_extras()
returns table (aula_id text, modulo text, titulo text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not (public.hs_tem_acesso() or public.tem_cargo('admin')) then
    raise exception 'assinatura inativa' using errcode = '42501';
  end if;
  return query
    select a.aula_id, a.modulo, a.titulo from public.aulas_conteudo a
     where a.modulo is not null and a.titulo is not null
     order by a.modulo, split_part(a.aula_id, '-', 2)::int;
end $$;

-- Cria uma aula nova no fim do módulo. Admin.
create or replace function public.criar_aula(p_modulo text, p_titulo text, p_video text, p_duracao text, p_material text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  b record;
  n int;
  novo text;
begin
  if not public.tem_cargo('admin') then raise exception 'sem permissão' using errcode = '42501'; end if;
  select * into b from public.hs_modulo_base(p_modulo);
  if not found then raise exception 'módulo inválido'; end if;
  if char_length(trim(coalesce(p_titulo, ''))) < 2 then raise exception 'dê um título para a aula'; end if;
  perform pg_advisory_xact_lock(hashtext('criar_aula:' || p_modulo));
  select coalesce(max(split_part(a.aula_id, '-', 2)::int), b.aulas) into n
    from public.aulas_conteudo a where a.modulo = p_modulo and a.titulo is not null;
  n := greatest(n, b.aulas) + 1;
  if n > 99 then raise exception 'limite de aulas no módulo'; end if;
  novo := b.prefixo || '-' || n;
  insert into public.aulas_conteudo (aula_id, modulo, titulo, video_url, duracao, material, atualizado_por)
  values (novo, p_modulo, left(trim(p_titulo), 140), nullif(trim(coalesce(p_video, '')), ''), nullif(trim(coalesce(p_duracao, '')), ''), nullif(trim(coalesce(p_material, '')), ''), auth.uid());
  perform public.hs_registrar('aula_criada', novo, jsonb_build_object('modulo', p_modulo, 'titulo', left(trim(p_titulo), 140)));
  return novo;
end $$;

-- Renomeia uma aula criada pelo painel. Admin.
create or replace function public.renomear_aula(p_aula text, p_titulo text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.tem_cargo('admin') then raise exception 'sem permissão' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_titulo, ''))) < 2 then raise exception 'dê um título para a aula'; end if;
  update public.aulas_conteudo set titulo = left(trim(p_titulo), 140), atualizado_em = now(), atualizado_por = auth.uid()
   where aula_id = p_aula and modulo is not null;
  if not found then raise exception 'aula não encontrada'; end if;
end $$;

-- ============ Permissões ============

revoke all on function public.mentoria_registrar_aplicacao(text, text, text, text, text, text, text, text, text, text, text, boolean, uuid, text) from public, anon, authenticated;
grant execute on function public.mentoria_registrar_aplicacao(text, text, text, text, text, text, text, text, text, text, text, boolean, uuid, text) to service_role;
revoke all on function public.hs_modulo_base(text) from public, anon, authenticated;
revoke all on function public.hs_modulo(text) from public, anon, authenticated;
revoke all on function public.painel_aplicacoes(), public.mentoria_aplicacao_atualizar(uuid, text, text),
  public.aulas_extras(), public.criar_aula(text, text, text, text, text), public.renomear_aula(text, text) from public, anon;
grant execute on function public.painel_aplicacoes(), public.mentoria_aplicacao_atualizar(uuid, text, text),
  public.aulas_extras(), public.criar_aula(text, text, text, text, text), public.renomear_aula(text, text) to authenticated;
