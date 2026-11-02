-- Revisão de segurança (02/11/2026).

-- 1) Checkout sem cadastro: o pedido guarda se a conta nasceu nele e um hash do IP (freio contra abuso).
alter table public.pedidos add column if not exists conta_nova boolean not null default false;
alter table public.pedidos add column if not exists ip_hash text;
create index if not exists pedidos_ip_idx on public.pedidos (ip_hash, criado_em) where ip_hash is not null;

-- 2) Cupom: reserva atômica (cortesia e cupom de 100% não passam do limite com pedidos ao mesmo tempo)
--    e conferência com limite de tentativas (antes dava para testar códigos sem parar).
create or replace function public.hs_reservar_cupom(p_codigo text)
returns boolean
language sql security definer set search_path = '' as $$
  with r as (
    update public.cupons set usos = usos + 1
    where codigo = upper(trim(p_codigo)) and ativo and (max_usos is null or usos < max_usos)
      and (validade is null or validade > now())
    returning 1
  ) select exists (select 1 from r)
$$;
revoke all on function public.hs_reservar_cupom(text) from public, anon, authenticated;
grant execute on function public.hs_reservar_cupom(text) to service_role;

create table if not exists public.cupom_tentativas (
  chave text not null,
  em    timestamptz not null default now()
);
create index if not exists cupom_tentativas_idx on public.cupom_tentativas (chave, em);
alter table public.cupom_tentativas enable row level security;
revoke all on public.cupom_tentativas from anon, authenticated;

-- Conta a tentativa (chave = usuário ou hash do IP) e diz se ainda pode tentar: 15 por hora.
create or replace function public.hs_cupom_pode_tentar(p_chave text)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.cupom_tentativas where em < now() - interval '1 day';
  if (select count(*) from public.cupom_tentativas where chave = p_chave and em > now() - interval '1 hour') >= 15 then
    return false;
  end if;
  insert into public.cupom_tentativas (chave) values (p_chave);
  return true;
end $$;
revoke all on function public.hs_cupom_pode_tentar(text) from public, anon, authenticated;
grant execute on function public.hs_cupom_pode_tentar(text) to service_role;

-- O navegador não confere cupom direto no banco: passa pela API, que tem o limite de tentativas.
revoke execute on function public.conferir_cupom(text, text) from public, anon, authenticated;
grant execute on function public.conferir_cupom(text, text) to service_role;

-- 3) Aula concluída só conta para aula que existe (antes, qualquer id dava XP e coins sem fim).
create or replace function public.concluir_aula(p_aula text)
returns public.perfis
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  n   integer;
  p   public.perfis;
begin
  if uid is null then raise exception 'sem login'; end if;
  if not public.hs_tem_acesso() then raise exception 'assinatura inativa' using errcode = '42501'; end if;
  if not exists (select 1 from public.aulas_conteudo where aula_id = p_aula) then raise exception 'aula inválida'; end if;

  insert into public.aulas_feitas (user_id, aula_id) values (uid, p_aula) on conflict do nothing;
  get diagnostics n = row_count;

  update public.perfis set
    xp    = xp    + case when n > 0 then 40 else 0 end,
    coins = coins + case when n > 0 then 20 else 0 end
  where id = uid
  returning * into p;
  return p;
end $$;

-- 4) Venda sem conta só vai para conta com e-mail confirmado (ninguém cadastra o e-mail de outro para pegar o acesso).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare v public.vendas;
begin
  insert into public.perfis (id, nome)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)), 80))
  on conflict (id) do nothing;

  if new.email_confirmed_at is not null then
    for v in select * from public.vendas where user_id is null and lower(cliente_email) = lower(new.email) order by criado_em loop
      perform public.hs_aplicar_venda(v);
    end loop;
  end if;
  return new;
end $$;

-- Quando o e-mail é confirmado depois do cadastro, aí sim liga as vendas que estavam esperando.
create or replace function public.hs_email_confirmado()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare v public.vendas;
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    for v in select * from public.vendas where user_id is null and lower(cliente_email) = lower(new.email) order by criado_em loop
      perform public.hs_aplicar_venda(v);
    end loop;
  end if;
  return new;
end $$;
revoke all on function public.hs_email_confirmado() from public, anon, authenticated;
drop trigger if exists hs_on_email_confirmado on auth.users;
create trigger hs_on_email_confirmado after update of email_confirmed_at on auth.users
  for each row execute function public.hs_email_confirmado();

create or replace function public.hs_aplicar_venda(v public.vendas)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid  uuid := v.user_id;
  dur  interval := case v.plano when 'mensal' then interval '32 days' when 'anual' then interval '367 days' end;
  a    public.acessos;
  ate  timestamptz;
begin
  if v.plano = 'loja' then
    if uid is null then
      select id into uid from auth.users where lower(email) = lower(v.cliente_email) and email_confirmed_at is not null limit 1;
      if uid is not null then update public.vendas set user_id = uid where id = v.id; end if;
    end if;
    return;
  end if;

  if uid is null then
    select id into uid from auth.users where lower(email) = lower(v.cliente_email) and email_confirmed_at is not null limit 1;
    if uid is null then return; end if; -- aluno ainda não criou (ou confirmou) a conta: libera quando confirmar
    update public.vendas set user_id = uid where id = v.id;
  end if;
  select * into a from public.acessos where user_id = uid;

  if v.status = 'pago' then
    if found and a.status = 'ativo' and a.valido_ate is null then
      ate := null; -- já tinha acesso sem prazo
    elsif dur is null then
      ate := null;
    elsif v.acesso_aplicado_em is null then
      ate := greatest(now(), v.criado_em, case when found and a.status = 'ativo' then coalesce(a.valido_ate, now()) else now() end) + dur;
    else
      ate := greatest(coalesce(case when found and a.status = 'ativo' then a.valido_ate end, now()), v.criado_em + dur);
    end if;
    insert into public.acessos (user_id, status, origem, plano, valido_ate, motivo, atualizado_em)
    values (uid, 'ativo', 'venda', v.plano, ate, 'Venda ' || v.pedido, now())
    on conflict (user_id) do update set
      status = 'ativo', origem = 'venda', plano = excluded.plano, valido_ate = excluded.valido_ate,
      motivo = excluded.motivo, atualizado_em = now();
    if v.acesso_aplicado_em is null then
      update public.vendas set acesso_aplicado_em = now() where id = v.id;
    end if;
  elsif v.status in ('reembolsado', 'chargeback') then
    insert into public.acessos (user_id, status, origem, plano, motivo, atualizado_em)
    values (uid, 'bloqueado', 'venda', v.plano, initcap(v.status) || ' · ' || v.pedido, now())
    on conflict (user_id) do update set
      status = 'bloqueado', motivo = excluded.motivo, atualizado_em = now();
  end if;
end $$;

-- 5) Afiliados: indicação só antes da primeira compra (sem desconto feito com conta própria)
--    e um saque por vez mesmo com dois pedidos ao mesmo tempo.
create or replace function public.registrar_indicacao(p_codigo text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); af uuid;
begin
  if uid is null then return false; end if;
  if exists (select 1 from public.pedidos where user_id = uid and status in ('pago', 'reembolsado', 'chargeback')) then return false; end if;
  select user_id into af from public.afiliados where codigo = lower(trim(coalesce(p_codigo, '')));
  if af is null or af = uid then return false; end if;
  insert into public.indicacoes (user_id, afiliado) values (uid, af) on conflict (user_id) do nothing;
  return true;
end $$;

create or replace function public.pedir_saque_afiliado(p_valor numeric, p_chave text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); novo uuid;
begin
  if uid is null then raise exception 'sem login' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtext('saque:' || uid::text));
  if p_valor is null or p_valor < 50 then raise exception 'saque mínimo de R$ 50'; end if;
  if p_valor > public.hs_saldo_afiliado(uid) then raise exception 'saldo insuficiente'; end if;
  if exists (select 1 from public.afiliado_saques where afiliado = uid and status = 'pendente') then raise exception 'já existe um saque em análise'; end if;
  insert into public.afiliado_saques (afiliado, valor, chave_pix) values (uid, round(p_valor, 2), left(trim(p_chave), 120)) returning id into novo;
  return novo;
end $$;

-- Funções antigas de afiliados que ficaram sem uso.
drop function if exists public.solicitar_saque_afiliado(text);
drop function if exists public.marcar_saque_afiliado(uuid, text, text);
drop function if exists public.hs_vendas_afiliado(uuid);

-- 6) Foto de perfil só do nosso armazenamento ou do Google (antes, qualquer site rastreava quem via a foto).
alter table public.perfis drop constraint if exists perfis_avatar_origem;
alter table public.perfis add constraint perfis_avatar_origem check (
  avatar_url is null
  or avatar_url ~ '^https://uadzgmdyoksdxyybgisl\.supabase\.co/'
  or avatar_url ~ '^https://lh[0-9]\.googleusercontent\.com/'
) not valid;
