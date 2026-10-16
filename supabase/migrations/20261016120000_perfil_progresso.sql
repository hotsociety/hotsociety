-- HOT SOCIETY · Perfil e progresso do aluno
-- Cria: perfis, aulas_feitas, missoes (catálogo), missoes_progresso
-- e as funções que o site chama (garantir_perfil, concluir_aula, avancar_missao).
--
-- Segurança: o aluno só LÊ as próprias linhas. XP, moedas, rota e faturamento
-- só mudam pelas funções abaixo (ou pelo time no painel do Supabase),
-- então ninguém consegue se dar XP pelo navegador.

-- ============ Tabelas ============

create sequence if not exists public.passaporte_seq start 30001;

create table if not exists public.perfis (
  id            uuid primary key references auth.users(id) on delete cascade,
  passaporte    text not null unique,
  xp            integer not null default 0 check (xp >= 0),
  coins         integer not null default 0 check (coins >= 0),
  streak        integer not null default 0 check (streak >= 0),
  ultimo_acesso date,
  stop_atual    smallint not null default 0 check (stop_atual between 0 and 5), -- 0 GRU · 1 SCL · 2 LIS · 3 JFK · 4 MCM · 5 DXB
  faturado      numeric(14,2) not null default 0 check (faturado >= 0),        -- verificado pelo time
  criado_em     timestamptz not null default now()
);
comment on table public.perfis is 'Perfil de jogo do aluno (XP, moedas, sequência, escala da rota, faturamento verificado).';

create table if not exists public.aulas_feitas (
  user_id  uuid not null references auth.users(id) on delete cascade,
  aula_id  text not null check (aula_id ~ '^m[0-9]+-[0-9]+$'),
  feita_em timestamptz not null default now(),
  primary key (user_id, aula_id)
);

create table if not exists public.missoes (
  id     text primary key,
  tipo   text not null check (tipo in ('d', 's', 'm')), -- diária, semanal, desafio do mês
  titulo text not null,
  total  integer not null default 1 check (total > 0),
  xp     integer not null default 0 check (xp >= 0),
  coins  integer not null default 0 check (coins >= 0),
  ativa  boolean not null default true
);

create table if not exists public.missoes_progresso (
  user_id      uuid not null references auth.users(id) on delete cascade,
  missao_id    text not null references public.missoes(id) on delete cascade,
  periodo      text not null, -- 2026-10-16 (dia) · 2026-W42 (semana) · 2026-10 (mês)
  feito        integer not null default 0,
  concluida_em timestamptz,
  primary key (user_id, missao_id, periodo)
);

-- Catálogo inicial (mesmo conteúdo que estava fixo no site)
insert into public.missoes (id, tipo, titulo, total, xp, coins) values
  ('01', 'd', 'Responder 10 conversas com o script novo', 1, 80, 40),
  ('02', 'd', 'Publicar 3 prévias no funil', 3, 120, 60),
  ('03', 'd', 'Assistir à próxima aula', 1, 40, 20),
  ('04', 'd', 'Responder uma dúvida no # dúvidas', 1, 30, 15),
  ('S1', 's', 'Postar 5 Reels de 7 segundos', 5, 400, 200),
  ('S2', 's', 'Fazer 50 abordagens no total', 50, 500, 250),
  ('S3', 's', 'Concluir o Módulo 04 até a aula 04', 4, 300, 150),
  ('M',  'm', 'Desafio do mês: primeira venda em 30 dias', 1, 1000, 500)
on conflict (id) do nothing;

-- ============ Segurança (RLS) ============

alter table public.perfis            enable row level security;
alter table public.aulas_feitas      enable row level security;
alter table public.missoes           enable row level security;
alter table public.missoes_progresso enable row level security;

drop policy if exists "perfil: ler o meu" on public.perfis;
create policy "perfil: ler o meu" on public.perfis
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists "aulas: ler as minhas" on public.aulas_feitas;
create policy "aulas: ler as minhas" on public.aulas_feitas
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "missoes: catálogo para alunos" on public.missoes;
create policy "missoes: catálogo para alunos" on public.missoes
  for select to authenticated using (ativa);

drop policy if exists "missoes: ler meu progresso" on public.missoes_progresso;
create policy "missoes: ler meu progresso" on public.missoes_progresso
  for select to authenticated using (user_id = (select auth.uid()));

-- ============ Funções ============

-- Dia de hoje no fuso de Brasília (as diárias viram à meia-noite daqui).
create or replace function public.hs_hoje() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

-- Cria o perfil no primeiro acesso e atualiza a sequência de dias.
create or replace function public.garantir_perfil()
returns public.perfis
language plpgsql security definer set search_path = '' as $$
declare
  uid  uuid := auth.uid();
  hoje date := public.hs_hoje();
  p    public.perfis;
begin
  if uid is null then raise exception 'sem login'; end if;

  insert into public.perfis (id, passaporte)
  values (uid, 'HS-' || to_char(hoje, 'YY') || '-' || lpad(nextval('public.passaporte_seq')::text, 5, '0'))
  on conflict (id) do nothing;

  update public.perfis set
    streak = case
      when ultimo_acesso = hoje then streak
      when ultimo_acesso = hoje - 1 then streak + 1
      else 1 end,
    ultimo_acesso = hoje
  where id = uid
  returning * into p;

  return p;
end $$;

-- Marca uma aula como assistida. Dá 40 XP e 20 moedas só na primeira vez.
create or replace function public.concluir_aula(p_aula text)
returns public.perfis
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  n   integer;
  p   public.perfis;
begin
  if uid is null then raise exception 'sem login'; end if;

  insert into public.aulas_feitas (user_id, aula_id) values (uid, p_aula)
  on conflict do nothing;
  get diagnostics n = row_count;

  update public.perfis set
    xp    = xp    + case when n > 0 then 40 else 0 end,
    coins = coins + case when n > 0 then 20 else 0 end
  where id = uid
  returning * into p;

  return p;
end $$;

-- Registra +1 de avanço numa missão do período atual.
-- Ao completar, soma o XP e as moedas da missão (uma vez por período).
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

-- Progresso das missões no período atual (diária de hoje, semana e mês correntes).
create or replace function public.minhas_missoes()
returns table (missao_id text, feito integer)
language sql stable security definer set search_path = '' as $$
  select mp.missao_id, mp.feito
  from public.missoes_progresso mp
  join public.missoes mi on mi.id = mp.missao_id
  where mp.user_id = auth.uid()
    and mp.periodo = case mi.tipo
      when 'd' then to_char(public.hs_hoje(), 'YYYY-MM-DD')
      when 's' then to_char(public.hs_hoje(), 'IYYY-"W"IW')
      else to_char(public.hs_hoje(), 'YYYY-MM') end
$$;

revoke all on function public.garantir_perfil()       from public, anon;
revoke all on function public.concluir_aula(text)     from public, anon;
revoke all on function public.avancar_missao(text)    from public, anon;
revoke all on function public.minhas_missoes()        from public, anon;
grant execute on function public.garantir_perfil()    to authenticated;
grant execute on function public.concluir_aula(text)  to authenticated;
grant execute on function public.avancar_missao(text) to authenticated;
grant execute on function public.minhas_missoes()     to authenticated;
