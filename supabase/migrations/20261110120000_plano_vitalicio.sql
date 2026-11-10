-- Plano único: "vitalicio" (R$ 297, pagamento único, acesso sem prazo).
-- "mensal" e "anual" continuam válidos só para o histórico (pedidos e vendas antigos).
-- hs_aplicar_venda já dá acesso sem prazo para plano sem duração definida (é o caso do vitalício).

alter table public.pedidos drop constraint if exists pedidos_plano_ok;
alter table public.pedidos add constraint pedidos_plano_ok check (
  (plano = any (array['vitalicio', 'mensal', 'anual']) and item is null)
  or (plano = 'loja' and item is not null and item ~ '^[a-z]{2,10}$')
);

alter table public.vendas drop constraint if exists vendas_plano_ok;
alter table public.vendas add constraint vendas_plano_ok check (plano = any (array['vitalicio', 'mensal', 'anual', 'avulso', 'loja']));

create or replace function public.salvar_cupom(p_codigo text, p_desconto integer, p_planos text[], p_validade timestamptz, p_max_usos integer, p_ativo boolean)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.tem_cargo('admin', 'financeiro') then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_planos is null or cardinality(p_planos) = 0 or not (p_planos <@ array['vitalicio', 'mensal', 'anual']) then raise exception 'planos inválidos'; end if;
  insert into public.cupons (codigo, desconto, planos, validade, max_usos, ativo, criado_por)
  values (upper(trim(p_codigo)), p_desconto, p_planos, p_validade, p_max_usos, coalesce(p_ativo, true), auth.uid())
  on conflict (codigo) do update set desconto = excluded.desconto, planos = excluded.planos, validade = excluded.validade,
    max_usos = excluded.max_usos, ativo = excluded.ativo;
  perform public.hs_registrar('cupom', upper(trim(p_codigo)), jsonb_build_object('desconto', p_desconto, 'ativo', p_ativo));
end $$;

-- Cupons que já existiam passam a valer também no plano único.
update public.cupons set planos = array_append(planos, 'vitalicio') where not ('vitalicio' = any (planos));
