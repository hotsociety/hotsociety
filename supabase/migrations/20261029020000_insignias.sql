-- Insígnias da gamificação (pixel art) liberadas por métricas e mostradas ao lado do nome.
-- Regras iguais a app/_lib/insignias.ts:
--   rota (bandeiras) = perfis.stop_atual · missões (dinheiro/cartões) = missões concluídas · capital (veículos) = perfis.faturado.
-- As listas que mostram nomes ganham a coluna "insignias" (só a maior de cada categoria). Nenhuma passa o id do usuário.

create or replace function public.hs_missoes_concluidas(p_uid uuid)
returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.missoes_progresso mp where mp.user_id = p_uid and mp.concluida_em is not null
$$;

create or replace function public.hs_insignias(p_uid uuid)
returns text[]
language sql stable security definer set search_path = '' as $$
  select array_remove(array[
    case p.stop_atual when 0 then 'br' when 1 then 'cl' when 2 then 'pt' when 3 then 'ae' when 4 then 'us' else 'mc' end,
    case when m.n >= 300 then 'm300' when m.n >= 100 then 'm100' when m.n >= 50 then 'm50' when m.n >= 10 then 'm10' when m.n >= 1 then 'm1' end,
    case when p.faturado >= 500000 then 'c500k' when p.faturado >= 100000 then 'c100k' when p.faturado >= 50000 then 'c50k'
         when p.faturado >= 10000 then 'c10k' when p.faturado >= 1000 then 'c1k' end
  ], null)
  from public.perfis p
  cross join lateral (select public.hs_missoes_concluidas(p.id) as n) m
  where p.id = p_uid and p.cargo is null
$$;
revoke all on function public.hs_missoes_concluidas(uuid), public.hs_insignias(uuid) from public, anon, authenticated;

-- Métricas do próprio aluno (vitrine em Conquistas).
create or replace function public.minhas_insignias()
returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object('stop', p.stop_atual, 'faturado', p.faturado, 'missoes', public.hs_missoes_concluidas(p.id))
  from public.perfis p where p.id = auth.uid()
$$;
revoke all on function public.minhas_insignias() from public, anon;
grant execute on function public.minhas_insignias() to authenticated;

-- ============ Listas com nome: + insignias ============
drop function if exists public.ranking_temporada();
create function public.ranking_temporada()
returns table (pos int, nome text, escala smallint, xp int, eu boolean, insignias text[])
language sql stable security definer set search_path = '' as $$
  with base as (
    select p.id, p.xp, p.stop_atual, p.created_at,
           case when p.nome is null or p.nome ~ '@' or trim(p.nome) = '' then 'Passageiro' else trim(p.nome) end as n
    from public.perfis p
    where p.cargo is null
  ), r as (
    select b.*, row_number() over (order by b.xp desc, b.created_at) as pos from base b
  )
  select r.pos::int,
         split_part(r.n, ' ', 1) || coalesce(' ' || left(nullif(split_part(r.n, ' ', 2), ''), 1) || '.', ''),
         r.stop_atual, r.xp, r.id = auth.uid(), public.hs_insignias(r.id)
  from r
  where r.pos <= 5 or r.id = auth.uid()
  order by r.pos
$$;

drop function if exists public.feed_posts(timestamptz, int);
create function public.feed_posts(p_antes timestamptz default null, p_limite int default 20)
returns table (id uuid, autor text, eu boolean, equipe boolean, tipo text, texto text, imagem text, criado_em timestamptz,
               curtidas bigint, curti boolean, comentarios bigint, insignias text[])
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso();
begin
  return query
    select p.id, public.hs_nome_publico(p.user_id), p.user_id = uid, pf.cargo is not null, p.tipo, p.texto, p.imagem, p.criado_em,
           (select count(*) from public.post_curtidas c where c.post_id = p.id),
           exists (select 1 from public.post_curtidas c where c.post_id = p.id and c.user_id = uid),
           (select count(*) from public.post_comentarios k where k.post_id = p.id and not k.oculto),
           public.hs_insignias(p.user_id)
    from public.posts p left join public.perfis pf on pf.id = p.user_id
    where not p.oculto and (p_antes is null or p.criado_em < p_antes)
    order by p.criado_em desc
    limit least(greatest(p_limite, 1), 50);
end $$;

drop function if exists public.comentarios_post(uuid);
create function public.comentarios_post(p_post uuid)
returns table (id bigint, autor text, eu boolean, equipe boolean, texto text, criado_em timestamptz, insignias text[])
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso();
begin
  return query
    select k.id, public.hs_nome_publico(k.user_id), k.user_id = uid, pf.cargo is not null, k.texto, k.criado_em,
           public.hs_insignias(k.user_id)
    from public.post_comentarios k left join public.perfis pf on pf.id = k.user_id
    where k.post_id = p_post and not k.oculto
    order by k.criado_em
    limit 200;
end $$;

drop function if exists public.aula_comentarios_lista(text);
create function public.aula_comentarios_lista(p_aula text)
returns table (id bigint, pai bigint, autor text, avatar text, eu boolean, equipe boolean, texto text, criado_em timestamptz, votos int, votei boolean, insignias text[])
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso();
begin
  return query
    select k.id, k.pai, public.hs_nome_publico(k.user_id), pf.avatar_url, k.user_id = uid,
           pf.cargo is not null, k.texto, k.criado_em,
           (select count(*)::int from public.aula_comentario_votos v where v.comentario_id = k.id),
           exists (select 1 from public.aula_comentario_votos v where v.comentario_id = k.id and v.user_id = uid),
           public.hs_insignias(k.user_id)
    from public.aula_comentarios k left join public.perfis pf on pf.id = k.user_id
    where k.aula_id = p_aula and not k.oculto
      and (k.pai is null or exists (select 1 from public.aula_comentarios p where p.id = k.pai and not p.oculto))
    order by k.criado_em desc
    limit 300;
end $$;

drop function if exists public.canal_mensagens(text, bigint);
create function public.canal_mensagens(p_canal text, p_depois bigint default 0)
returns table (id bigint, autor text, eu boolean, equipe boolean, texto text, criado_em timestamptz, insignias text[])
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso();
begin
  return query
    select * from (
      select m.id, public.hs_nome_publico(m.user_id), m.user_id = uid, pf.cargo is not null, m.texto, m.criado_em,
             public.hs_insignias(m.user_id)
      from public.canal_msgs m left join public.perfis pf on pf.id = m.user_id
      where m.canal = p_canal and not m.oculto and m.id > coalesce(p_depois, 0)
      order by m.id desc
      limit 100
    ) x order by x.id;
end $$;

revoke all on function public.ranking_temporada(), public.feed_posts(timestamptz, int), public.comentarios_post(uuid),
  public.aula_comentarios_lista(text), public.canal_mensagens(text, bigint) from public, anon;
grant execute on function public.ranking_temporada(), public.feed_posts(timestamptz, int), public.comentarios_post(uuid),
  public.aula_comentarios_lista(text), public.canal_mensagens(text, bigint) to authenticated;
