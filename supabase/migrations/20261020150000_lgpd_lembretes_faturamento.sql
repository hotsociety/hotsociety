-- HOT SOCIETY · Entrega 2: LGPD (baixar e excluir dados), lembretes por e-mail e comprovantes de faturamento
-- Pode rodar mais de uma vez. Não apaga dados.

-- ============ 1) LGPD: "Baixar meus dados" (art. 18, II e V) ============

create or replace function public.meus_dados()
returns json
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sem login' using errcode = '42501'; end if;
  return json_build_object(
    'gerado_em', now(),
    'conta', (select json_build_object('id', u.id, 'email', u.email, 'criada_em', u.created_at, 'ultimo_login', u.last_sign_in_at,
                                       'nome', u.raw_user_meta_data ->> 'full_name') from auth.users u where u.id = uid),
    'perfil', (select row_to_json(p) from public.perfis p where p.id = uid),
    'acesso', (select row_to_json(a) from public.acessos a where a.user_id = uid),
    'compras', coalesce((select json_agg(json_build_object('pedido', v.pedido, 'produto', v.produto, 'valor', v.valor, 'metodo', v.metodo,
                                         'status', v.status, 'data', v.criado_em, 'reembolso_protocolo', v.reembolso_protocolo) order by v.criado_em)
                         from public.vendas v where v.user_id = uid), '[]'),
    'tentativas_de_pagamento', coalesce((select json_agg(json_build_object('plano', x.plano, 'valor_centavos', x.valor_centavos, 'status', x.status,
                                         'criado_em', x.criado_em, 'aceite_termos_em', x.aceite_termos_em, 'versao_termos', x.versao_termos) order by x.criado_em)
                         from public.pedidos x where x.user_id = uid), '[]'),
    'aulas_concluidas', coalesce((select json_agg(f.aula_id order by f.aula_id) from public.aulas_feitas f where f.user_id = uid), '[]'),
    'chamados', coalesce((select json_agg(json_build_object('protocolo', c.protocolo, 'assunto', c.assunto, 'status', c.status, 'criado_em', c.criado_em,
                                         'mensagens', (select json_agg(json_build_object('equipe', m.equipe, 'texto', m.texto, 'em', m.em) order by m.em)
                                                       from public.chamado_msgs m where m.chamado_id = c.id)))
                         from public.chamados c where c.user_id = uid), '[]'),
    'pedidos_de_placa', coalesce((select json_agg(row_to_json(pp)) from public.pedidos_placa pp where pp.user_id = uid), '[]'),
    'comprovantes', coalesce((select json_agg(json_build_object('periodo', k.periodo, 'plataforma', k.plataforma, 'valor_declarado', k.valor_declarado,
                                         'status', k.status, 'enviado_em', k.criado_em)) from public.comprovantes k where k.user_id = uid), '[]')
  );
end $$;

-- Antes de excluir a conta (chamada só pelo servidor, com a chave service_role).
-- Vendas ficam guardadas sem o vínculo com a conta: obrigação fiscal (LGPD art. 16, I).
create or replace function public.hs_preparar_exclusao(p_user uuid)
returns json
language plpgsql security definer set search_path = '' as $$
declare
  p public.perfis;
  mail text;
begin
  select * into p from public.perfis where id = p_user;
  if p.cargo is not null then raise exception 'conta da equipe: tire o cargo antes de excluir'; end if;
  select email::text into mail from auth.users where id = p_user;
  if mail is null then raise exception 'conta não encontrada'; end if;
  insert into public.auditoria (quem, acao, alvo, detalhes)
  values (p_user, 'conta_excluida', mail, jsonb_build_object('passaporte', p.passaporte));
  return json_build_object('email', mail);
end $$;

-- ============ 2) Lembretes por e-mail ============

create table if not exists public.lembretes_enviados (
  user_id   uuid not null references auth.users (id) on delete cascade,
  tipo      text not null check (tipo in ('vence_7d', 'vence_1d', 'venceu', 'pix_expirado')),
  ref       text not null,
  enviado_em timestamptz not null default now(),
  primary key (user_id, tipo, ref)
);
alter table public.lembretes_enviados enable row level security;
revoke all on public.lembretes_enviados from anon, authenticated;
grant all on public.lembretes_enviados to service_role;

-- Quem precisa receber lembrete hoje (só o servidor chama).
--   vence_7d / vence_1d / venceu: acesso de venda chegando ao fim (Pix não renova sozinho)
--   pix_expirado: gerou Pix nas últimas 48 h, não pagou e não tem acesso ativo
create or replace function public.hs_lembretes_pendentes()
returns table (user_id uuid, email text, nome text, tipo text, ref text, plano text, valido_ate timestamptz)
language sql stable security definer set search_path = '' as $$
  with ac as (
    select a.user_id, u.email::text as email, coalesce(p.nome, u.raw_user_meta_data ->> 'full_name') as nome, a.plano, a.valido_ate,
           case
             when a.valido_ate between now() + interval '6 days' and now() + interval '7 days' then 'vence_7d'
             when a.valido_ate between now() and now() + interval '1 day' then 'vence_1d'
             when a.valido_ate between now() - interval '1 day' and now() then 'venceu'
           end as tipo
    from public.acessos a
    join auth.users u on u.id = a.user_id
    left join public.perfis p on p.id = a.user_id
    where a.status = 'ativo' and a.origem = 'venda' and a.valido_ate is not null and p.cargo is null
  ),
  px as (
    select distinct on (x.user_id) x.user_id, x.email, x.nome, 'pix_expirado'::text as tipo, x.id::text as ref, x.plano
    from public.pedidos x
    where x.status in ('pendente', 'expirado') and x.expira_em < now() and x.criado_em > now() - interval '48 hours'
      and not exists (select 1 from public.pedidos y where y.user_id = x.user_id and y.status = 'pago' and y.criado_em >= x.criado_em)
      and not exists (select 1 from public.acessos a where a.user_id = x.user_id and a.status = 'ativo' and (a.valido_ate is null or a.valido_ate > now()))
    order by x.user_id, x.criado_em desc
  )
  select ac.user_id, ac.email, ac.nome, ac.tipo, to_char(ac.valido_ate, 'YYYY-MM-DD'), ac.plano, ac.valido_ate
  from ac
  where ac.tipo is not null
    and not exists (select 1 from public.lembretes_enviados l where l.user_id = ac.user_id and l.tipo = ac.tipo and l.ref = to_char(ac.valido_ate, 'YYYY-MM-DD'))
  union all
  select px.user_id, px.email, px.nome, px.tipo, px.ref, px.plano, null
  from px
  where not exists (select 1 from public.lembretes_enviados l where l.user_id = px.user_id and l.tipo = 'pix_expirado' and l.ref = px.ref)
  limit 500
$$;

-- ============ 2b) Renovar antes do fim soma o tempo que sobrou ============
-- Antes: pagar um novo plano 5 dias antes do fim "perdia" esses 5 dias.
-- Agora cada venda paga soma os dias uma única vez (acesso_aplicado_em evita somar 2x
-- quando o aviso de pagamento chega repetido).

alter table public.vendas add column if not exists acesso_aplicado_em timestamptz;
update public.vendas set acesso_aplicado_em = coalesce(atualizado_em, criado_em)
 where status = 'pago' and user_id is not null and acesso_aplicado_em is null;

create or replace function public.hs_aplicar_venda(v public.vendas)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid  uuid := v.user_id;
  dur  interval := case v.plano when 'mensal' then interval '32 days' when 'anual' then interval '367 days' end;
  a    public.acessos;
  ate  timestamptz;
begin
  if uid is null then
    select id into uid from auth.users where lower(email) = lower(v.cliente_email) limit 1;
    if uid is null then return; end if; -- aluno ainda não criou conta: libera quando criar
    update public.vendas set user_id = uid where id = v.id;
  end if;
  select * into a from public.acessos where user_id = uid;

  if v.status = 'pago' then
    if found and a.status = 'ativo' and a.valido_ate is null then
      ate := null; -- já tinha acesso sem prazo
    elsif dur is null then
      ate := null;
    elsif v.acesso_aplicado_em is null then
      ate := greatest(now(), v.criado_em, case when found and a.status = 'ativo' then coalesce(a.valido_ate, now()) else now() end) + dur;
    else
      ate := greatest(coalesce(case when found and a.status = 'ativo' then a.valido_ate end, now()), v.criado_em + dur);
    end if;
    insert into public.acessos (user_id, status, origem, plano, valido_ate, motivo, atualizado_em)
    values (uid, 'ativo', 'venda', v.plano, ate, 'Venda ' || v.pedido, now())
    on conflict (user_id) do update set
      status = 'ativo', origem = 'venda', plano = excluded.plano, valido_ate = excluded.valido_ate,
      motivo = excluded.motivo, atualizado_em = now();
    if v.acesso_aplicado_em is null then
      update public.vendas set acesso_aplicado_em = now() where id = v.id;
    end if;
  elsif v.status in ('reembolsado', 'chargeback') then
    insert into public.acessos (user_id, status, origem, plano, motivo, atualizado_em)
    values (uid, 'bloqueado', 'venda', v.plano, initcap(v.status) || ' · ' || v.pedido, now())
    on conflict (user_id) do update set
      status = 'bloqueado', motivo = excluded.motivo, atualizado_em = now();
  end if;
end $$;
revoke all on function public.hs_aplicar_venda(public.vendas) from public, anon, authenticated;

-- ============ 3) Comprovantes de faturamento ============

create table if not exists public.comprovantes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  plataforma      text not null check (char_length(plataforma) between 2 and 60),
  periodo         text not null check (char_length(periodo) between 3 and 60),
  valor_declarado numeric(14,2) not null check (valor_declarado > 0 and valor_declarado < 100000000),
  arquivos        text[] not null check (cardinality(arquivos) between 1 and 5),
  obs_aluno       text check (char_length(obs_aluno) <= 500),
  status          text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
  valor_aprovado  numeric(14,2),
  resposta        text check (char_length(resposta) <= 500),
  analisado_por   uuid references auth.users (id) on delete set null,
  analisado_em    timestamptz,
  criado_em       timestamptz not null default now()
);
create index if not exists comprovantes_user_idx on public.comprovantes (user_id, criado_em desc);
create index if not exists comprovantes_status_idx on public.comprovantes (status, criado_em);
create index if not exists comprovantes_analisado_idx on public.comprovantes (analisado_por);

alter table public.comprovantes enable row level security;
revoke all on public.comprovantes from anon, authenticated;

-- Pasta privada no Storage: cada aluno só envia e lê na própria pasta; Admin e Financeiro leem tudo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovantes', 'comprovantes', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "comprovantes: enviar na minha pasta" on storage.objects;
create policy "comprovantes: enviar na minha pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "comprovantes: ler" on storage.objects;
create policy "comprovantes: ler" on storage.objects
  for select to authenticated
  using (bucket_id = 'comprovantes' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.tem_cargo('admin', 'financeiro'))));

create or replace function public.enviar_comprovante(p jsonb)
returns json
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  arqs text[];
  novo uuid;
begin
  if uid is null then raise exception 'sem login' using errcode = '42501'; end if;
  if not public.hs_tem_acesso() then raise exception 'assinatura inativa' using errcode = '42501'; end if;
  if (select count(*) from public.comprovantes where user_id = uid and status = 'pendente') >= 3 then
    raise exception 'limite de comprovantes em análise';
  end if;
  select array_agg(a) into arqs from jsonb_array_elements_text(p -> 'arquivos') a;
  -- só aceita arquivos da própria pasta
  if arqs is null or exists (select 1 from unnest(arqs) a where split_part(a, '/', 1) <> uid::text or a like '%..%') then
    raise exception 'arquivo inválido';
  end if;
  insert into public.comprovantes (user_id, plataforma, periodo, valor_declarado, arquivos, obs_aluno)
  values (uid, left(trim(p ->> 'plataforma'), 60), left(trim(p ->> 'periodo'), 60), (p ->> 'valor')::numeric, arqs,
          left(nullif(trim(p ->> 'obs'), ''), 500))
  returning id into novo;
  return json_build_object('id', novo);
end $$;

create or replace function public.meus_comprovantes()
returns table (id uuid, plataforma text, periodo text, valor_declarado numeric, status text, valor_aprovado numeric, resposta text, criado_em timestamptz)
language sql stable security definer set search_path = '' as $$
  select id, plataforma, periodo, valor_declarado, status, valor_aprovado, resposta, criado_em
  from public.comprovantes where user_id = auth.uid() order by criado_em desc limit 30
$$;

create or replace function public.painel_comprovantes(p_status text default 'pendente')
returns table (id uuid, user_id uuid, email text, nome text, faturado_atual numeric, plataforma text, periodo text, valor_declarado numeric,
               arquivos text[], obs_aluno text, status text, valor_aprovado numeric, resposta text, criado_em timestamptz, analisado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.tem_cargo('admin', 'financeiro') then raise exception 'sem permissão' using errcode = '42501'; end if;
  return query
    select k.id, k.user_id, u.email::text, p.nome, p.faturado, k.plataforma, k.periodo, k.valor_declarado, k.arquivos, k.obs_aluno,
           k.status, k.valor_aprovado, k.resposta, k.criado_em, k.analisado_em
    from public.comprovantes k
    join auth.users u on u.id = k.user_id
    left join public.perfis p on p.id = k.user_id
    where p_status is null or k.status = p_status
    order by k.criado_em
    limit 300;
end $$;

-- Escala da rota a partir do faturamento: GRU 0 · SCL 10k · LIS 50k · DXB 100k · JFK 500k · MCM 1M
create or replace function public.hs_escala(p_fat numeric)
returns integer
language sql immutable set search_path = '' as $$
  select case when p_fat >= 1000000 then 5 when p_fat >= 500000 then 4 when p_fat >= 100000 then 3
              when p_fat >= 50000 then 2 when p_fat >= 10000 then 1 else 0 end
$$;

-- Aprova somando ao faturamento verificado (ou recusa com motivo).
create or replace function public.analisar_comprovante(p_id uuid, p_aprovar boolean, p_valor numeric default null, p_resposta text default null)
returns json
language plpgsql security definer set search_path = '' as $$
declare
  k public.comprovantes;
  novo_fat numeric;
begin
  if not public.tem_cargo('admin', 'financeiro') then raise exception 'sem permissão' using errcode = '42501'; end if;
  select * into k from public.comprovantes where id = p_id for update;
  if not found then raise exception 'comprovante não encontrado'; end if;
  if k.status <> 'pendente' then raise exception 'este comprovante já foi analisado'; end if;
  if k.user_id = auth.uid() then raise exception 'você não pode aprovar o próprio comprovante'; end if;

  if p_aprovar then
    if p_valor is null or p_valor <= 0 or p_valor > k.valor_declarado then raise exception 'valor aprovado inválido'; end if;
    update public.perfis set faturado = faturado + p_valor,
                             stop_atual = greatest(stop_atual, public.hs_escala(faturado + p_valor))
     where id = k.user_id returning faturado into novo_fat;
    update public.comprovantes set status = 'aprovado', valor_aprovado = p_valor, resposta = left(nullif(trim(p_resposta), ''), 500),
           analisado_por = auth.uid(), analisado_em = now() where id = k.id;
  else
    if char_length(trim(coalesce(p_resposta, ''))) < 4 then raise exception 'escreva o motivo da recusa'; end if;
    update public.comprovantes set status = 'recusado', resposta = left(trim(p_resposta), 500),
           analisado_por = auth.uid(), analisado_em = now() where id = k.id;
  end if;
  perform public.hs_registrar(case when p_aprovar then 'comprovante_aprovado' else 'comprovante_recusado' end,
                              (select email::text from auth.users where id = k.user_id),
                              jsonb_build_object('valor', p_valor, 'declarado', k.valor_declarado, 'faturado', novo_fat));
  return json_build_object('faturado', novo_fat);
end $$;

-- ============ Permissões ============

do $$
declare f text;
begin
  foreach f in array array[
    'public.hs_preparar_exclusao(uuid)', 'public.hs_lembretes_pendentes()', 'public.hs_escala(numeric)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'public.meus_dados()', 'public.enviar_comprovante(jsonb)', 'public.meus_comprovantes()',
    'public.painel_comprovantes(text)', 'public.analisar_comprovante(uuid, boolean, numeric, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

grant execute on function public.hs_preparar_exclusao(uuid) to service_role;
grant execute on function public.hs_lembretes_pendentes() to service_role;
