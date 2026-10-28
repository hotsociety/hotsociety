-- Painel → Mentoria → Links de pagamento.
-- O mentor digita o valor (e escolhe o lead), o site cria um Payment Link na Stripe e guarda aqui.
-- Quando o lead paga, o webhook da Stripe marca como pago, faz o repasse (Connect) e lança em Vendas.

create table if not exists public.mentoria_links (
  id             uuid primary key default gen_random_uuid(),
  criado_em      timestamptz not null default now(),
  criado_por     uuid references auth.users (id) on delete set null,
  aplicacao_id   uuid references public.mentoria_aplicacoes (id) on delete set null,
  lead_nome      text check (char_length(lead_nome) <= 80),
  descricao      text not null check (char_length(descricao) between 2 and 120),
  valor_centavos integer not null check (valor_centavos between 100 and 100000000),
  status         text not null default 'criando' check (status in ('criando', 'aberto', 'pago', 'falhou', 'desativado', 'reembolsado')),
  url            text,
  stripe_link_id text,
  pi_id          text,
  pagador_nome   text,
  pagador_email  text,
  metodo         text,
  pago_em        timestamptz,
  split_centavos integer not null default 0
);
create index if not exists mentoria_links_data_idx on public.mentoria_links (criado_em desc);
alter table public.mentoria_links enable row level security;
revoke all on public.mentoria_links from anon, authenticated;

-- Cria o registro (confere que é mentor). A rota /api/mentoria/link chama com o login de quem está no painel
-- e depois completa url/stripe_link_id com a chave de serviço.
create or replace function public.mentoria_link_criar(p_aplicacao uuid, p_descricao text, p_valor_centavos integer)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare novo uuid; nome text;
begin
  perform public.hs_exigir_mentor();
  if p_aplicacao is not null then
    select a.nome into nome from public.mentoria_aplicacoes a where a.id = p_aplicacao;
    if not found then raise exception 'aplicação não encontrada'; end if;
  end if;
  insert into public.mentoria_links (criado_por, aplicacao_id, lead_nome, descricao, valor_centavos)
  values (auth.uid(), p_aplicacao, nome, left(trim(p_descricao), 120), p_valor_centavos)
  returning id into novo;
  perform public.hs_registrar('mentoria_link_criado', novo::text, jsonb_build_object('valor', p_valor_centavos / 100.0, 'lead', nome));
  return novo;
end $$;

create or replace function public.painel_mentoria_links()
returns setof public.mentoria_links
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.hs_exigir_mentor();
  return query select * from public.mentoria_links where status <> 'criando' order by criado_em desc limit 200;
end $$;

-- Confere permissão para desativar (a rota desliga o link na Stripe e marca com a chave de serviço).
create or replace function public.mentoria_link_pode_desativar(p_id uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare l public.mentoria_links;
begin
  perform public.hs_exigir_mentor();
  select * into l from public.mentoria_links where id = p_id;
  if not found then raise exception 'link não encontrado'; end if;
  if l.status <> 'aberto' then raise exception 'esse link não está aberto'; end if;
  perform public.hs_registrar('mentoria_link_desativado', p_id::text, jsonb_build_object('valor', l.valor_centavos / 100.0, 'lead', l.lead_nome));
  return l.stripe_link_id;
end $$;

revoke all on function public.mentoria_link_criar(uuid, text, integer), public.painel_mentoria_links(),
  public.mentoria_link_pode_desativar(uuid) from public, anon;
grant execute on function public.mentoria_link_criar(uuid, text, integer), public.painel_mentoria_links(),
  public.mentoria_link_pode_desativar(uuid) to authenticated;
