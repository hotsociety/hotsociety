-- Guarda os UTMs do anúncio em cada pedido, para enviar à UTMify.
alter table public.pedidos add column if not exists utm jsonb;
