-- Links da mentoria também pelo Mercado Pago (cartão em até 12x).
-- stripe_link_id guarda o id do link no gateway (Payment Link da Stripe ou preferência do Mercado Pago).
alter table public.mentoria_links add column if not exists gateway text not null default 'stripe';
do $$ begin
  alter table public.mentoria_links add constraint mentoria_links_gateway_ok check (gateway in ('stripe', 'mercadopago'));
exception when duplicate_object then null; end $$;
