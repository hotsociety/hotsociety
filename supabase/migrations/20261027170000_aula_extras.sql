-- Tela da aula: discussão (comentários com respostas e votos), notas pessoais e aulas salvas.
-- Tudo passa por funções; o aluno precisa de acesso ativo (hs_exigir_acesso).

create table if not exists public.aula_comentarios (
  id         bigint generated always as identity primary key,
  aula_id    text not null check (aula_id ~ '^m[0-9]{1,2}-[0-9]{1,2}$'),
  user_id    uuid not null references auth.users (id) on delete cascade,
  pai        bigint references public.aula_comentarios (id) on delete cascade,
  texto      text not null check (char_length(texto) between 1 and 2000),
  oculto     boolean not null default false,
  criado_em  timestamptz not null default now()
);
create index if not exists aula_comentarios_aula_idx on public.aula_comentarios (aula_id, criado_em);
create index if not exists aula_comentarios_user_idx on public.aula_comentarios (user_id, criado_em);
create index if not exists aula_comentarios_pai_idx on public.aula_comentarios (pai);

create table if not exists public.aula_comentario_votos (
  comentario_id bigint not null references public.aula_comentarios (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  primary key (comentario_id, user_id)
);
create index if not exists aula_comentario_votos_user_idx on public.aula_comentario_votos (user_id);

create table if not exists public.aula_notas (
  user_id       uuid not null references auth.users (id) on delete cascade,
  aula_id       text not null check (aula_id ~ '^m[0-9]{1,2}-[0-9]{1,2}$'),
  texto         text not null check (char_length(texto) between 1 and 5000),
  atualizado_em timestamptz not null default now(),
  primary key (user_id, aula_id)
);

create table if not exists public.aulas_salvas (
  user_id   uuid not null references auth.users (id) on delete cascade,
  aula_id   text not null check (aula_id ~ '^m[0-9]{1,2}-[0-9]{1,2}$'),
  criado_em timestamptz not null default now(),
  primary key (user_id, aula_id)
);

alter table public.aula_comentarios enable row level security;
alter table public.aula_comentario_votos enable row level security;
alter table public.aula_notas enable row level security;
alter table public.aulas_salvas enable row level security;
revoke all on public.aula_comentarios, public.aula_comentario_votos, public.aula_notas, public.aulas_salvas from anon, authenticated;

-- ============ Discussão ============

create or replace function public.aula_comentarios_lista(p_aula text)
returns table (id bigint, pai bigint, autor text, avatar text, eu boolean, equipe boolean, texto text, criado_em timestamptz, votos int, votei boolean)
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso();
begin
  return query
    select k.id, k.pai, public.hs_nome_publico(k.user_id), pf.avatar_url, k.user_id = uid,
           pf.cargo is not null, k.texto, k.criado_em,
           (select count(*)::int from public.aula_comentario_votos v where v.comentario_id = k.id),
           exists (select 1 from public.aula_comentario_votos v where v.comentario_id = k.id and v.user_id = uid)
    from public.aula_comentarios k left join public.perfis pf on pf.id = k.user_id
    where k.aula_id = p_aula and not k.oculto
      and (k.pai is null or exists (select 1 from public.aula_comentarios p where p.id = k.pai and not p.oculto))
    order by k.criado_em desc
    limit 300;
end $$;

create or replace function public.aula_comentar(p_aula text, p_texto text, p_pai bigint default null)
returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso(); novo bigint;
begin
  if p_aula !~ '^m[0-9]{1,2}-[0-9]{1,2}$' then raise exception 'aula inválida'; end if;
  p_texto := left(trim(coalesce(p_texto, '')), 2000);
  if p_texto = '' then raise exception 'escreva algo'; end if;
  if p_pai is not null and not exists (
    select 1 from public.aula_comentarios where id = p_pai and aula_id = p_aula and pai is null and not oculto
  ) then raise exception 'comentário não encontrado'; end if;
  if (select count(*) from public.aula_comentarios where user_id = uid and criado_em > now() - interval '1 minute') >= 5 then
    raise exception 'devagar: muitos comentários seguidos';
  end if;
  if (select count(*) from public.aula_comentarios where user_id = uid and criado_em > now() - interval '1 hour') >= 40 then
    raise exception 'limite de comentários atingido';
  end if;
  insert into public.aula_comentarios (aula_id, user_id, pai, texto) values (p_aula, uid, p_pai, p_texto) returning id into novo;
  return novo;
end $$;

-- Liga/desliga o voto. Devolve o total novo.
create or replace function public.aula_votar(p_id bigint)
returns int
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso();
begin
  if not exists (select 1 from public.aula_comentarios where id = p_id and not oculto) then raise exception 'comentário não encontrado'; end if;
  delete from public.aula_comentario_votos where comentario_id = p_id and user_id = uid;
  if not found then
    insert into public.aula_comentario_votos (comentario_id, user_id) values (p_id, uid);
  end if;
  return (select count(*)::int from public.aula_comentario_votos where comentario_id = p_id);
end $$;

-- O autor ou a equipe escondem o comentário (fica guardado, some da tela).
create or replace function public.aula_apagar_comentario(p_id bigint)
returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso();
begin
  update public.aula_comentarios set oculto = true
  where id = p_id and (user_id = uid or public.hs_e_equipe());
  if found and public.hs_e_equipe() then
    perform public.hs_registrar('aula_comentario_oculto', p_id::text, null);
  end if;
end $$;

-- ============ Notas e aulas salvas (só do próprio aluno) ============

create or replace function public.minhas_notas()
returns table (aula_id text, texto text, atualizado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso();
begin
  return query select n.aula_id, n.texto, n.atualizado_em from public.aula_notas n where n.user_id = uid order by n.atualizado_em desc;
end $$;

-- Texto vazio tira a nota da aula.
create or replace function public.salvar_nota(p_aula text, p_texto text)
returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso();
begin
  if p_aula !~ '^m[0-9]{1,2}-[0-9]{1,2}$' then raise exception 'aula inválida'; end if;
  p_texto := left(trim(coalesce(p_texto, '')), 5000);
  if p_texto = '' then
    delete from public.aula_notas where user_id = uid and aula_id = p_aula;
  else
    insert into public.aula_notas (user_id, aula_id, texto) values (uid, p_aula, p_texto)
    on conflict (user_id, aula_id) do update set texto = excluded.texto, atualizado_em = now();
  end if;
end $$;

create or replace function public.minhas_salvas()
returns setof text
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso();
begin
  return query select s.aula_id from public.aulas_salvas s where s.user_id = uid order by s.criado_em desc;
end $$;

-- Liga/desliga. Devolve true se ficou salva.
create or replace function public.alternar_salva(p_aula text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso();
begin
  if p_aula !~ '^m[0-9]{1,2}-[0-9]{1,2}$' then raise exception 'aula inválida'; end if;
  delete from public.aulas_salvas where user_id = uid and aula_id = p_aula;
  if found then return false; end if;
  insert into public.aulas_salvas (user_id, aula_id) values (uid, p_aula);
  return true;
end $$;

-- Permissões
revoke all on function public.aula_comentarios_lista(text), public.aula_comentar(text, text, bigint), public.aula_votar(bigint),
  public.aula_apagar_comentario(bigint), public.minhas_notas(), public.salvar_nota(text, text), public.minhas_salvas(),
  public.alternar_salva(text) from public, anon;
grant execute on function public.aula_comentarios_lista(text), public.aula_comentar(text, text, bigint), public.aula_votar(bigint),
  public.aula_apagar_comentario(bigint), public.minhas_notas(), public.salvar_nota(text, text), public.minhas_salvas(),
  public.alternar_salva(text) to authenticated;
