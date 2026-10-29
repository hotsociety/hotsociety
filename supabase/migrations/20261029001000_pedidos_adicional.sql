-- Adicional no checkout dos planos (Arsenal do Cappu + Networking): fica gravado no pedido.
alter table public.pedidos add column if not exists adicional text;
alter table public.pedidos add column if not exists adicional_centavos integer not null default 0;
do $$ begin
  alter table public.pedidos add constraint pedidos_adicional_ok check (adicional is null or adicional in ('arsenal'));
exception when duplicate_object then null; end $$;
