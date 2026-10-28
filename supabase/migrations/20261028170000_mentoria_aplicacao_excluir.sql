-- Painel → Mentoria → Aplicações: excluir uma aplicação (ex.: testes). Só o mentor (admin).
create or replace function public.mentoria_aplicacao_excluir(p_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare a public.mentoria_aplicacoes;
begin
  perform public.hs_exigir_mentor();
  delete from public.mentoria_aplicacoes where id = p_id returning * into a;
  if not found then raise exception 'aplicação não encontrada'; end if;
  perform public.hs_registrar('aplicacao_excluida', p_id::text, jsonb_build_object('nome', a.nome, 'comentario', a.comentario));
end $$;

revoke all on function public.mentoria_aplicacao_excluir(uuid) from public, anon;
grant execute on function public.mentoria_aplicacao_excluir(uuid) to authenticated;
