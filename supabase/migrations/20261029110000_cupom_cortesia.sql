-- Cupom de cortesia: 100% no plano e, se marcado, também no adicional. O pedido fica com gateway "cortesia" e valor 0,
-- é confirmado na hora (sem gateway) e segue a mesma entrega de um pedido pago.
alter table public.cupons add column if not exists cobre_adicional boolean not null default false;

alter table public.pedidos drop constraint if exists pedidos_valor_centavos_check;
alter table public.pedidos drop constraint if exists pedidos_valor_ok;
alter table public.pedidos add constraint pedidos_valor_ok check (valor_centavos >= 100 or (gateway = 'cortesia' and valor_centavos = 0));

create or replace function public.conferir_cupom(p_codigo text, p_plano text)
returns json
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select json_build_object('ok', true, 'codigo', c.codigo, 'desconto', c.desconto, 'adicional', c.cobre_adicional)
    from public.cupons c
    where c.codigo = upper(trim(p_codigo)) and c.ativo and p_plano = any (c.planos)
      and (c.validade is null or c.validade > now()) and (c.max_usos is null or c.usos < c.max_usos)
  ), json_build_object('ok', false))
$$;
