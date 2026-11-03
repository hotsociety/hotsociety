-- Painel → Alunos → Localizar aluno: busca por e-mail, nome ou telefone e ficha completa da conta.

-- Busca: os caracteres % e _ digitados viram texto comum (antes funcionavam como curinga).
create or replace function public.painel_alunos(p_busca text default null, p_limite int default 50)
returns table (id uuid, email text, nome text, criado_em timestamptz, ultimo_login timestamptz,
               email_confirmado boolean, cargo text, xp int, acesso text, origem text,
               valido_ate timestamptz, motivo text)
language plpgsql stable security definer set search_path = '' as $$
declare
  b text := nullif(trim(coalesce(p_busca, '')), '');
  pad text := '%' || replace(replace(replace(coalesce(b, ''), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  dig text := regexp_replace(coalesce(b, ''), '\D', '', 'g');
begin
  if not public.tem_cargo('admin', 'financeiro', 'suporte') then raise exception 'sem permissão' using errcode = '42501'; end if;
  return query
    select u.id, u.email::text, p.nome, u.created_at, u.last_sign_in_at, u.email_confirmed_at is not null,
           p.cargo, coalesce(p.xp, 0),
           case
             when p.cargo is not null then 'equipe'
             when a.status = 'ativo' and (a.valido_ate is null or a.valido_ate > now()) then 'ativo'
             when a.status = 'ativo' then 'vencido'
             when a.status = 'bloqueado' then 'bloqueado'
             else 'sem acesso' end,
           a.origem, a.valido_ate, a.motivo
    from auth.users u
    left join public.perfis p on p.id = u.id
    left join public.acessos a on a.user_id = u.id
    where b is null
       or u.email ilike pad
       or p.nome ilike pad
       or (length(dig) >= 8 and regexp_replace(coalesce(p.telefone, ''), '\D', '', 'g') like '%' || dig || '%')
    order by (lower(u.email) = lower(b)) desc, u.created_at desc
    limit least(greatest(p_limite, 1), 200);
end $$;

-- Ficha do aluno: conta, perfil, acesso, compras e progresso. Só a equipe (admin, financeiro, suporte).
create or replace function public.painel_aluno_ficha(p_user uuid)
returns json
language plpgsql stable security definer set search_path = '' as $$
declare
  u auth.users;
  r json;
begin
  if not public.tem_cargo('admin', 'financeiro', 'suporte') then raise exception 'sem permissão' using errcode = '42501'; end if;
  select * into u from auth.users where id = p_user;
  if not found then raise exception 'aluno não encontrado'; end if;

  select json_build_object(
    'id', u.id,
    'email', u.email,
    'email_confirmado', u.email_confirmed_at is not null,
    'criado_em', u.created_at,
    'ultimo_login', u.last_sign_in_at,
    'entra_com', coalesce(u.raw_app_meta_data ->> 'provider', 'email'),
    'nome', p.nome,
    'telefone', p.telefone,
    'cargo', p.cargo,
    'xp', coalesce(p.xp, 0),
    'coins', coalesce(p.coins, 0),
    'streak', coalesce(p.streak, 0),
    'escala', p.stop_atual,
    'faturado', coalesce(p.faturado, 0),
    'acesso', case
                when p.cargo is not null then 'equipe'
                when a.status = 'ativo' and (a.valido_ate is null or a.valido_ate > now()) then 'ativo'
                when a.status = 'ativo' then 'vencido'
                when a.status = 'bloqueado' then 'bloqueado'
                else 'sem acesso' end,
    'acesso_origem', a.origem,
    'acesso_plano', a.plano,
    'valido_ate', a.valido_ate,
    'acesso_motivo', a.motivo,
    'aulas_feitas', (select count(*) from public.aulas_feitas f where f.user_id = u.id),
    'ultima_aula', (select max(f.feita_em) from public.aulas_feitas f where f.user_id = u.id),
    'compras', coalesce((
      select json_agg(x order by x.criado_em desc) from (
        select v.criado_em, v.produto, v.plano, v.valor, v.metodo, v.status, v.plataforma
        from public.vendas v
        where v.user_id = u.id or lower(v.cliente_email) = lower(u.email)
        order by v.criado_em desc limit 15
      ) x), '[]'::json),
    'pedidos_abertos', (select count(*) from public.pedidos o where o.user_id = u.id and o.status = 'pendente' and o.expira_em > now())
  ) into r
  from (select 1) _
  left join public.perfis p on p.id = u.id
  left join public.acessos a on a.user_id = u.id;
  return r;
end $$;
revoke all on function public.painel_aluno_ficha(uuid) from public, anon;
grant execute on function public.painel_aluno_ficha(uuid) to authenticated;
