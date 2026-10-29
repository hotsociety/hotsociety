-- Página Ranking: top 20 da temporada + a posição do aluno + quem está logo acima dele (para "faltam X XP").
-- Mesmo critério do ranking_temporada (XP, desempate por quem entrou antes). Equipe fica fora. Não expõe ids.
create or replace function public.ranking_completo()
returns table (pos int, nome text, avatar text, escala smallint, xp int, eu boolean, insignias text[], total int)
language sql stable security definer set search_path = '' as $$
  with base as (
    select p.id, p.xp, p.stop_atual, p.created_at, p.avatar_url,
           case when p.nome is null or p.nome ~ '@' or trim(p.nome) = '' then 'Passageiro' else trim(p.nome) end as n
    from public.perfis p
    where p.cargo is null
  ), r as (
    select b.*, row_number() over (order by b.xp desc, b.created_at) as pos, count(*) over () as total from base b
  ), meu as (
    select r.pos from r where r.id = auth.uid()
  )
  select r.pos::int,
         split_part(r.n, ' ', 1) || coalesce(' ' || left(nullif(split_part(r.n, ' ', 2), ''), 1) || '.', ''),
         r.avatar_url, r.stop_atual, r.xp, r.id = auth.uid(), public.hs_insignias(r.id), r.total::int
  from r
  where r.pos <= 20 or r.id = auth.uid() or r.pos = (select meu.pos - 1 from meu)
  order by r.pos
$$;
revoke all on function public.ranking_completo() from public, anon;
grant execute on function public.ranking_completo() to authenticated;
