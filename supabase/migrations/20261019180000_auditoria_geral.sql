-- HOT SOCIETY · Revisão geral (19/10/2026)
-- 1) Direito de arrependimento (CDC art. 49 e Decreto 7.962/2013): o aluno pede reembolso
--    em até 7 dias pelo próprio site e recebe um protocolo na hora.
-- 2) Aceite dos termos e declaração de 18+ registrados no pedido.
-- 3) Ranking real (sem nomes de exemplo).
-- 4) Ajustes de desempenho apontados pelo Supabase.
-- Pode rodar mais de uma vez. Não apaga dados.

-- ============ 1) Reembolso em 7 dias ============

alter table public.vendas add column if not exists reembolso_pedido_em timestamptz;
alter table public.vendas add column if not exists reembolso_motivo text;
alter table public.vendas add column if not exists reembolso_protocolo text;

create sequence if not exists public.protocolo_seq start 1001;

-- Compras do próprio aluno (inclui as lançadas na mão pelo time).
create or replace function public.minhas_compras()
returns table (id uuid, pedido text, produto text, plano text, metodo text, valor numeric, status text,
               criado_em timestamptz, pode_reembolsar boolean, reembolso_pedido_em timestamptz, reembolso_protocolo text)
language sql stable security definer set search_path = '' as $$
  select v.id, v.pedido, v.produto, v.plano, v.metodo, v.valor, v.status, v.criado_em,
         (v.status = 'pago' and v.reembolso_pedido_em is null and v.criado_em > now() - interval '7 days'),
         v.reembolso_pedido_em, v.reembolso_protocolo
  from public.vendas v
  where v.user_id = auth.uid()
  order by v.criado_em desc
  limit 50
$$;

create or replace function public.pedir_reembolso(p_venda uuid, p_motivo text default null)
returns json
language plpgsql security definer set search_path = '' as $$
declare
  v public.vendas;
  prot text;
begin
  if auth.uid() is null then raise exception 'sem login'; end if;
  select * into v from public.vendas where id = p_venda and user_id = auth.uid();
  if not found then raise exception 'compra não encontrada'; end if;
  if v.reembolso_pedido_em is not null then
    return json_build_object('protocolo', v.reembolso_protocolo, 'ja_pedido', true);
  end if;
  if v.status <> 'pago' then raise exception 'essa compra não está paga'; end if;
  if v.criado_em <= now() - interval '7 days' then raise exception 'o prazo de 7 dias para reembolso já passou'; end if;

  prot := 'HS-' || to_char(now() at time zone 'America/Sao_Paulo', 'YYMMDD') || '-' || nextval('public.protocolo_seq');
  update public.vendas set reembolso_pedido_em = now(), reembolso_motivo = left(nullif(trim(p_motivo), ''), 500),
         reembolso_protocolo = prot, atualizado_em = now()
  where id = v.id;
  perform public.hs_registrar('reembolso_pedido', v.pedido, jsonb_build_object('protocolo', prot, 'email', v.cliente_email, 'valor', v.valor));
  return json_build_object('protocolo', prot, 'ja_pedido', false);
end $$;

-- ============ 2) Aceite dos termos no pedido ============

alter table public.pedidos add column if not exists aceite_termos_em timestamptz;
alter table public.pedidos add column if not exists versao_termos text;

-- ============ 3) Ranking real ============

-- Top 5 por XP (só alunos, sem equipe) + a posição de quem pergunta.
-- Mostra só primeiro nome e inicial do sobrenome.
create or replace function public.ranking_temporada()
returns table (pos int, nome text, escala smallint, xp int, eu boolean)
language sql stable security definer set search_path = '' as $$
  with base as (
    select p.id, p.xp, p.stop_atual, p.created_at,
           case when p.nome is null or p.nome ~ '@' or trim(p.nome) = '' then 'Passageiro' else trim(p.nome) end as n
    from public.perfis p
    where p.cargo is null
  ), r as (
    select b.*, row_number() over (order by b.xp desc, b.created_at) as pos from base b
  )
  select r.pos::int,
         split_part(r.n, ' ', 1) || coalesce(' ' || left(nullif(split_part(r.n, ' ', 2), ''), 1) || '.', ''),
         r.stop_atual, r.xp, r.id = auth.uid()
  from r
  where r.pos <= 5 or r.id = auth.uid()
  order by r.pos
$$;

-- ============ 4) Desempenho ============

create index if not exists acessos_atualizado_por_idx on public.acessos (atualizado_por);
create index if not exists auditoria_quem_idx on public.auditoria (quem);
create index if not exists missoes_progresso_missao_idx on public.missoes_progresso (missao_id);
do $$ begin
  if to_regclass('public.aulas') is not null then execute 'create index if not exists aulas_modulo_idx on public.aulas (modulo_id)'; end if;
  if to_regclass('public.compras') is not null then execute 'create index if not exists compras_curso_idx on public.compras (curso_id)'; end if;
  if to_regclass('public.modulos') is not null then execute 'create index if not exists modulos_curso_idx on public.modulos (curso_id)'; end if;
end $$;

drop policy if exists "Usuários podem ver o próprio perfil" on public.perfis;
create policy "Usuários podem ver o próprio perfil" on public.perfis
  for select to authenticated using (id = (select auth.uid()));

do $$ begin
  if to_regclass('public.aulas') is not null then
    execute 'drop policy if exists "Aulas visíveis apenas para alunos logados" on public.aulas';
    execute 'create policy "Aulas visíveis apenas para alunos logados" on public.aulas for select to authenticated using (true)';
  end if;
  if to_regclass('public.compras') is not null then
    execute 'drop policy if exists "Alunos veem apenas as suas próprias compras" on public.compras';
    execute 'create policy "Alunos veem apenas as suas próprias compras" on public.compras for select to authenticated using (aluno_id = (select auth.uid()))';
  end if;
end $$;

drop policy if exists "acessos: o meu" on public.acessos;
drop policy if exists "acessos: equipe" on public.acessos;
drop policy if exists "acessos: o meu ou equipe" on public.acessos;
create policy "acessos: o meu ou equipe" on public.acessos
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.tem_cargo('admin', 'financeiro', 'suporte')));

-- ============ Permissões ============

revoke all on function public.minhas_compras()            from public, anon;
revoke all on function public.pedir_reembolso(uuid, text)  from public, anon;
revoke all on function public.ranking_temporada()          from public, anon;
grant execute on function public.minhas_compras()           to authenticated;
grant execute on function public.pedir_reembolso(uuid, text) to authenticated;
grant execute on function public.ranking_temporada()        to authenticated;
