-- HOT SOCIETY · Pedidos de pagamento (Pix pela Transfeer)
-- Cada clique em "Gerar Pix" cria um pedido. Quem escreve aqui é só o servidor
-- (chave service_role). O aluno só lê os próprios pedidos para acompanhar o status.
-- Pode rodar mais de uma vez. Não guarda CPF (vai direto para a Transfeer).

create table if not exists public.pedidos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text not null,
  nome        text,
  plano       text not null check (plano in ('mensal', 'anual')),
  valor_centavos integer not null check (valor_centavos >= 100),
  status      text not null default 'pendente'
              check (status in ('pendente', 'pago', 'expirado', 'cancelado', 'falhou', 'reembolsado', 'chargeback')),
  gateway     text not null default 'transfeer',
  charge_id   text unique,
  br_code     text,
  expira_em   timestamptz,
  pago_em     timestamptz,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists pedidos_user_idx on public.pedidos (user_id, criado_em desc);

alter table public.pedidos enable row level security;
revoke all on public.pedidos from anon, authenticated;
grant select on public.pedidos to authenticated;

drop policy if exists "pedidos: os meus" on public.pedidos;
create policy "pedidos: os meus" on public.pedidos
  for select to authenticated using (user_id = (select auth.uid()));

grant all on public.pedidos to service_role;
