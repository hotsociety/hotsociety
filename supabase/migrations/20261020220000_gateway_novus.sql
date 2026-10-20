-- HOT SOCIETY · Gateway Novus: Pix e cartão (página segura da Novus)
-- Pode rodar mais de uma vez. Não apaga dados.

alter table public.pedidos add column if not exists metodo text not null default 'pix';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'pedidos_metodo_ok') then
    alter table public.pedidos add constraint pedidos_metodo_ok check (metodo in ('pix', 'cartao'));
  end if;
end $$;
alter table public.pedidos add column if not exists checkout_url text;
