-- Débitos do sócio que recebe o repasse (Stripe Connect).
-- Reembolso/contestação: a parte dele sai da conta dele. Quando não dá para puxar na hora
-- (saldo dele zerado) ou é a parte dele da taxa de contestação, o valor fica aqui e é
-- descontado automaticamente dos próximos repasses.

create table if not exists public.repasse_debitos (
  id                uuid primary key default gen_random_uuid(),
  criado_em         timestamptz not null default now(),
  conta             text not null check (conta ~ '^acct_[A-Za-z0-9]+$'),
  valor_centavos    integer not null check (valor_centavos > 0),
  restante_centavos integer not null check (restante_centavos >= 0),
  motivo            text not null,
  referencia        text not null unique, -- id do estorno/contestação (evita lançar duas vezes)
  ultimo_repasse    text,
  quitado_em        timestamptz
);
create index if not exists repasse_debitos_abertos_idx on public.repasse_debitos (conta, criado_em) where restante_centavos > 0;
alter table public.repasse_debitos enable row level security;
revoke all on public.repasse_debitos from anon, authenticated;
