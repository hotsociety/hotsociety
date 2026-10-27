-- CappuIA de verdade: limite de perguntas por aluno no mês (a equipe não tem limite).
-- Marca d'água: dados do aluno que vão escritos por cima do vídeo (Panda DRM).

-- ============ Marca d'água ============
create or replace function public.marca_dagua_dados()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso(); em text; nm text; pp text;
begin
  select u.email into em from auth.users u where u.id = uid;
  select nullif(trim(p.nome), ''), p.passaporte into nm, pp from public.perfis p where p.id = uid;
  if nm is null or nm ~ '@' then nm := split_part(coalesce(em, ''), '@', 1); end if;
  return jsonb_build_object('nome', left(nm, 60), 'email', left(coalesce(em, ''), 120), 'passaporte', coalesce(pp, ''));
end $$;

-- ============ CappuIA: uso do mês ============
create table if not exists public.cappuia_uso (
  user_id  uuid not null references auth.users (id) on delete cascade,
  mes      date not null,
  usadas   int not null default 0 check (usadas >= 0),
  ultima   timestamptz,
  primary key (user_id, mes)
);
alter table public.cappuia_uso enable row level security;
revoke all on public.cappuia_uso from anon, authenticated;

create or replace function public.hs_mes_atual()
returns date
language sql stable set search_path = '' as $$
  select date_trunc('month', now() at time zone 'America/Sao_Paulo')::date
$$;

create or replace function public.cappuia_saldo()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso();
begin
  return jsonb_build_object(
    'usadas', coalesce((select usadas from public.cappuia_uso where user_id = uid and mes = public.hs_mes_atual()), 0),
    'limite', 100,
    'ilimitado', public.hs_e_equipe()
  );
end $$;

-- Gasta 1 pergunta. Devolve quantas sobram (-1 = sem limite). Erro se acabou ou se está rápido demais.
create or replace function public.cappuia_consumir()
returns int
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso(); r public.cappuia_uso; equipe boolean := public.hs_e_equipe();
begin
  insert into public.cappuia_uso (user_id, mes) values (uid, public.hs_mes_atual())
  on conflict (user_id, mes) do nothing;
  select * into r from public.cappuia_uso where user_id = uid and mes = public.hs_mes_atual() for update;
  if r.ultima is not null and r.ultima > now() - interval '3 seconds' then
    raise exception 'devagar: espere um pouco entre as perguntas';
  end if;
  if not equipe and r.usadas >= 100 then
    raise exception 'limite do mês atingido';
  end if;
  update public.cappuia_uso set usadas = usadas + 1, ultima = now() where user_id = uid and mes = r.mes;
  return case when equipe then -1 else 100 - (r.usadas + 1) end;
end $$;

-- Devolve a pergunta quando a IA falhou (não é culpa do aluno).
create or replace function public.cappuia_devolver()
returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.hs_exigir_acesso();
begin
  update public.cappuia_uso set usadas = greatest(usadas - 1, 0), ultima = null
  where user_id = uid and mes = public.hs_mes_atual();
end $$;

revoke all on function public.hs_mes_atual() from public, anon, authenticated;
revoke all on function public.marca_dagua_dados(), public.cappuia_saldo(), public.cappuia_consumir(), public.cappuia_devolver() from public, anon;
grant execute on function public.marca_dagua_dados(), public.cappuia_saldo(), public.cappuia_consumir(), public.cappuia_devolver() to authenticated;
