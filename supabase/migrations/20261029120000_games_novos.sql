-- Games: três jogos novos (persona, chat, conta) e resumo do dia para a tela.
alter table public.jogos_partidas drop constraint if exists jogos_partidas_jogo_check;
alter table public.jogos_partidas add constraint jogos_partidas_jogo_check
  check (jogo in ('quiz', 'hook', 'funil', 'persona', 'chat', 'conta'));

-- Mesmas regras: XP só sobre o melhor resultado do dia em cada jogo (10 XP por ponto), até 20 partidas por dia.
create or replace function public.registrar_partida(p_jogo text, p_pontos int)
returns json
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.hs_exigir_acesso();
  maxp int := case p_jogo when 'quiz' then 6 when 'hook' then 6 when 'funil' then 5
                          when 'persona' then 6 when 'chat' then 6 when 'conta' then 6 end;
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

-- Resumo do dia do próprio aluno: partidas jogadas, melhor de cada jogo hoje e recorde geral.
create or replace function public.meus_games()
returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'partidas', (select count(*) from public.jogos_partidas where user_id = auth.uid() and dia = public.hs_hoje()),
    'limite', 20,
    'hoje', coalesce((select json_object_agg(jogo, p) from (select jogo, max(pontos) p from public.jogos_partidas
                       where user_id = auth.uid() and dia = public.hs_hoje() group by jogo) h), '{}'::json),
    'recorde', coalesce((select json_object_agg(jogo, p) from (select jogo, max(pontos) p from public.jogos_partidas
                         where user_id = auth.uid() group by jogo) r), '{}'::json)
  )
  where auth.uid() is not null
$$;
revoke all on function public.meus_games() from public, anon;
grant execute on function public.meus_games() to authenticated;

-- Ranking dos games com foto e quantos jogos diferentes a pessoa jogou na semana.
drop function if exists public.ranking_games();
create function public.ranking_games()
returns table (pos int, nome text, avatar text, pontos int, jogos int, eu boolean)
language sql stable security definer set search_path = '' as $$
  with melhor as (
    select user_id, dia, jogo, max(pontos) as p from public.jogos_partidas
    where dia > public.hs_hoje() - 7 group by user_id, dia, jogo
  ), soma as (
    select user_id, sum(p)::int * 10 as pts, count(distinct jogo)::int as jogos from melhor group by user_id
  ), r as (
    select s.*, row_number() over (order by s.pts desc, s.user_id) as pos from soma s
    where not exists (select 1 from public.perfis p where p.id = s.user_id and p.cargo is not null)
  )
  select r.pos::int, public.hs_nome_publico(r.user_id), p.avatar_url, r.pts, r.jogos, r.user_id = auth.uid()
  from r left join public.perfis p on p.id = r.user_id
  where r.pos <= 10 or r.user_id = auth.uid() order by r.pos
$$;
revoke all on function public.ranking_games() from public, anon;
grant execute on function public.ranking_games() to authenticated;
