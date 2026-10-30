-- Aplicações da mentoria vindas do site do NK (nk-ferreiraa.vercel.app): origem "ferreira", comentário "lead ferreira".
alter table public.mentoria_aplicacoes drop constraint if exists mentoria_aplicacoes_origem_check;
alter table public.mentoria_aplicacoes add constraint mentoria_aplicacoes_origem_check
  check (origem in ('insta_cappu', 'plataforma', 'ferreira'));

create or replace function public.mentoria_registrar_aplicacao(
  p_origem text, p_nome text, p_instagram text, p_whatsapp text, p_trabalho text,
  p_momento text, p_operacao text, p_trava text, p_invest text, p_pc text, p_tempo text,
  p_maior18 boolean, p_user uuid, p_ip text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  wpp text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
  ig  text := left(regexp_replace(trim(coalesce(p_instagram, '')), '^@*', '@'), 60);
  em  text;
  novo uuid;
begin
  if p_origem not in ('insta_cappu', 'plataforma', 'ferreira') then raise exception 'origem inválida'; end if;
  if not coalesce(p_maior18, false) then raise exception 'confirme que tem 18 anos ou mais'; end if;
  if char_length(trim(coalesce(p_nome, ''))) < 2 or char_length(ig) < 2 or char_length(trim(coalesce(p_trabalho, ''))) < 2 or char_length(trim(coalesce(p_trava, ''))) < 2 then
    raise exception 'preencha todos os campos';
  end if;
  if wpp !~ '^[0-9]{10,13}$' then raise exception 'whatsapp inválido'; end if;
  -- Freio contra envio repetido: 3 por WhatsApp e 10 por IP a cada hora.
  if (select count(*) from public.mentoria_aplicacoes where whatsapp = wpp and criado_em > now() - interval '1 hour') >= 3
     or (p_ip is not null and (select count(*) from public.mentoria_aplicacoes where ip_hash = p_ip and criado_em > now() - interval '1 hour') >= 10) then
    raise exception 'limite de envios';
  end if;
  if p_user is not null then select u.email into em from auth.users u where u.id = p_user; end if;
  insert into public.mentoria_aplicacoes (origem, comentario, nome, instagram, whatsapp, trabalho, momento, operacao, trava, invest, pc, tempo, maior18, user_id, email, ip_hash)
  values (
    p_origem,
    case p_origem when 'insta_cappu' then 'lead insta cappu' when 'ferreira' then 'lead ferreira' else 'lead plataforma' end,
    left(trim(p_nome), 80), ig, wpp, left(trim(p_trabalho), 200),
    nullif(left(trim(coalesce(p_momento, '')), 80), ''), nullif(left(trim(coalesce(p_operacao, '')), 80), ''),
    left(trim(p_trava), 1500),
    nullif(left(trim(coalesce(p_invest, '')), 80), ''), nullif(left(trim(coalesce(p_pc, '')), 80), ''), nullif(left(trim(coalesce(p_tempo, '')), 80), ''),
    true, p_user, em, p_ip
  ) returning id into novo;
  return novo;
end $$;
