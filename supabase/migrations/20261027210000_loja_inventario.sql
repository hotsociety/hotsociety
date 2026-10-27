-- HOT SOCIETY · Hot Store paga + Inventário do aluno
-- 1) Pedidos e vendas aceitam itens da loja (plano = 'loja' + item), separados das assinaturas.
-- 2) Venda da loja NUNCA mexe no acesso à área de membros (nem libera, nem bloqueia no reembolso).
-- 3) Todos os resgates com coins ficam travados ("Em breve").
-- 4) meu_inventario(): tudo o que o aluno comprou ou resgatou na loja.
-- Pode rodar mais de uma vez. Não apaga dados.

-- ============ 1) Pedidos: plano 'loja' + qual item ============
alter table public.pedidos add column if not exists item text;

do $$
declare c record;
begin
  -- remove o check antigo do plano (só mensal/anual), seja qual for o nome dele
  for c in
    select conname from pg_constraint
    where conrelid = 'public.pedidos'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%plano%'
  loop
    execute format('alter table public.pedidos drop constraint %I', c.conname);
  end loop;
  alter table public.pedidos add constraint pedidos_plano_ok check (
    (plano in ('mensal', 'anual') and item is null)
    or (plano = 'loja' and item is not null and item ~ '^[a-z]{2,10}$')
  );
end $$;

-- ============ 2) Vendas: aceita 'loja' ============
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.vendas'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%plano%'
  loop
    execute format('alter table public.vendas drop constraint %I', c.conname);
  end loop;
  alter table public.vendas add constraint vendas_plano_ok check (plano in ('mensal', 'anual', 'avulso', 'loja'));
end $$;

-- Mesma função de antes, com uma trava no começo: venda da loja não mexe no acesso.
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
      select id into uid from auth.users where lower(email) = lower(v.cliente_email) limit 1;
      if uid is not null then update public.vendas set user_id = uid where id = v.id; end if;
    end if;
    return;
  end if;

  if uid is null then
    select id into uid from auth.users where lower(email) = lower(v.cliente_email) limit 1;
    if uid is null then return; end if; -- aluno ainda não criou conta: libera quando criar
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
revoke all on function public.hs_aplicar_venda(public.vendas) from public, anon, authenticated;

-- ============ 3) Resgates com coins: tudo "Em breve" ============
-- Para liberar um item depois: update public.loja_itens set ativo = true where id = 'hp';
update public.loja_itens set ativo = false where id in ('mo', 'bn', 'hp');

-- ============ 4) Inventário ============
create or replace function public.meu_inventario()
returns json
language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(x order by x.data desc), '[]'::json) from (
    select
      'compra'::text                           as origem,
      p.id::text                               as id,
      upper(left(replace(p.id::text, '-', ''), 8)) as protocolo,
      p.item                                   as item,
      null::text                               as titulo,
      p.valor_centavos / 100.0                 as valor,
      null::int                                as coins,
      p.metodo                                 as metodo,
      p.status                                 as status,
      null::text                               as rastreio,
      coalesce(p.pago_em, p.criado_em)         as data
    from public.pedidos p
    where p.user_id = auth.uid() and p.plano = 'loja' and p.status in ('pago', 'reembolsado', 'chargeback')
    union all
    select
      'resgate', r.id::text, r.protocolo, r.item_id, i.titulo, null, r.coins, null, r.status, r.rastreio, r.criado_em
    from public.resgates r join public.loja_itens i on i.id = r.item_id
    where r.user_id = auth.uid()
  ) x
$$;
revoke all on function public.meu_inventario() from public, anon;
grant execute on function public.meu_inventario() to authenticated;
