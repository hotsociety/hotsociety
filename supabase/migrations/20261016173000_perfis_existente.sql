-- Ajuste para quando a tabela "perfis" já existia (nome, telefone, avatar_url, created_at).
-- Adiciona as colunas de progresso sem apagar nada e protege XP/moedas/rota/faturamento.

create sequence if not exists public.passaporte_seq start 30001;

create or replace function public.hs_novo_passaporte() returns text
language sql volatile set search_path = '' as $$
  select 'HS-' || to_char(public.hs_hoje(), 'YY') || '-' || lpad(nextval('public.passaporte_seq')::text, 5, '0')
$$;

alter table public.perfis
  add column if not exists passaporte    text,
  add column if not exists xp            integer not null default 0,
  add column if not exists coins         integer not null default 0,
  add column if not exists streak        integer not null default 0,
  add column if not exists ultimo_acesso date,
  add column if not exists stop_atual    smallint not null default 0,
  add column if not exists faturado      numeric(14,2) not null default 0;

update public.perfis set passaporte = public.hs_novo_passaporte() where passaporte is null;

alter table public.perfis
  alter column passaporte set default public.hs_novo_passaporte(),
  alter column passaporte set not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'perfis_passaporte_key') then
    alter table public.perfis add constraint perfis_passaporte_key unique (passaporte);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'perfis_progresso_ok') then
    alter table public.perfis add constraint perfis_progresso_ok
      check (xp >= 0 and coins >= 0 and streak >= 0 and faturado >= 0 and stop_atual between 0 and 5);
  end if;
end $$;

-- O aluno pode editar só nome, telefone e foto. O resto muda pelas funções ou pelo time.
revoke insert, update, delete, truncate on public.perfis from anon, authenticated;
grant update (nome, telefone, avatar_url) on public.perfis to authenticated;

-- Política duplicada (já existia "Usuários podem ver o próprio perfil").
drop policy if exists "perfil: ler o meu" on public.perfis;

-- Cria o perfil (o passaporte sai do padrão da coluna) e atualiza a sequência de dias.
create or replace function public.garantir_perfil()
returns public.perfis
language plpgsql security definer set search_path = '' as $$
declare
  uid  uuid := auth.uid();
  hoje date := public.hs_hoje();
  p    public.perfis;
begin
  if uid is null then raise exception 'sem login'; end if;

  insert into public.perfis (id) values (uid) on conflict (id) do nothing;

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

revoke all on function public.garantir_perfil() from public, anon;
grant execute on function public.garantir_perfil() to authenticated;
