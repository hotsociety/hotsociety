-- Cupons podem chegar a 100% (cupom de teste/cortesia do plano). Com 100%, o checkout só passa se houver o adicional
-- no pedido (a Stripe não cobra R$ 0) — ver app/api/pagamentos/pix/route.ts.
alter table public.cupons drop constraint if exists cupons_desconto_check;
alter table public.cupons add constraint cupons_desconto_check check (desconto between 1 and 100);
