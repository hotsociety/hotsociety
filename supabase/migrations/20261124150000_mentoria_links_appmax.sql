-- Links da mentoria também pela Appmax (Pix e cartão em até 12x, na página /pagar/<id> do próprio site).
alter table public.mentoria_links drop constraint if exists mentoria_links_gateway_ok;
alter table public.mentoria_links add constraint mentoria_links_gateway_ok check (gateway in ('stripe', 'mercadopago', 'appmax'));
