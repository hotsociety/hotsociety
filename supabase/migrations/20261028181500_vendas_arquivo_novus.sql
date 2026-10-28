-- Troca de gateway (Novus → Stripe): tira do painel as vendas da Novus, guardando cópia em vendas_arquivo.
-- O pedido continua em public.pedidos e o acesso do aluno não muda.
create table if not exists public.vendas_arquivo (like public.vendas including defaults);
alter table public.vendas_arquivo add column if not exists arquivado_em timestamptz not null default now();
alter table public.vendas_arquivo add column if not exists motivo text;
alter table public.vendas_arquivo enable row level security;
revoke all on public.vendas_arquivo from anon, authenticated;

with movidas as (
  delete from public.vendas where plataforma = 'novus' returning *
)
insert into public.vendas_arquivo
select m.*, now(), 'troca de gateway: Novus → Stripe' from movidas m;

select count(*) as arquivadas from public.vendas_arquivo;
