-- HOT SOCIETY · Divisão automática (split) do Pix: quanto de cada pedido foi para o sócio.
alter table public.pedidos add column if not exists split_centavos integer not null default 0;
