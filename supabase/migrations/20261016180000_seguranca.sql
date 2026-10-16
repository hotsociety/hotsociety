-- HOT SOCIETY · Revisão de segurança do banco (16/10/2026)
-- Pode rodar mais de uma vez. Não apaga dados.

-- 1) Pelo site (chave pública), ninguém escreve direto nas tabelas.
--    Toda escrita passa pelas funções (concluir_aula, avancar_missao, garantir_perfil)
--    ou pelo painel do Supabase. Leitura continua controlada pelas políticas (RLS).
do $$
declare t text;
begin
  foreach t in array array['cursos','modulos','aulas','compras','perfis','aulas_feitas','missoes','missoes_progresso'] loop
    if to_regclass('public.' || t) is not null then
      execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;

-- O aluno edita só nome, telefone e foto do próprio perfil.
grant update (nome, telefone, avatar_url) on public.perfis to authenticated;

drop policy if exists "Usuários podem atualizar o próprio perfil" on public.perfis;
create policy "Usuários podem atualizar o próprio perfil" on public.perfis
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Limites de tamanho/formato para o que o aluno escreve.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'perfis_campos_ok') then
    alter table public.perfis add constraint perfis_campos_ok check (
      (nome is null or char_length(nome) <= 80)
      and (telefone is null or telefone ~ '^[0-9 +()-]{8,20}$')
      and (avatar_url is null or (avatar_url ~ '^https://' and char_length(avatar_url) <= 500))
    ) not valid;
  end if;
end $$;

-- 2) Função do cadastro: caminho de busca fixo e não pode ser chamada pela API.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)), 80))
  on conflict (id) do nothing;
  return new;
end $$;

do $$
declare f text;
begin
  foreach f in array array['public.handle_new_user()','public.rls_auto_enable()','public.hs_novo_passaporte()','public.hs_hoje()'] loop
    begin
      execute format('revoke all on function %s from public, anon, authenticated', f);
    exception when others then
      raise notice 'não deu para ajustar %: %', f, sqlerrm;
    end;
  end loop;
end $$;
