-- Música na área de membros: player do Spotify (embed) que continua tocando entre as páginas.
-- A playlist fica em ajustes('musica_playlist'); o admin troca pelo Painel → Comunidade.
insert into public.ajustes (chave, valor)
values ('musica_playlist', to_jsonb('https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn'::text))
on conflict (chave) do nothing;

create or replace function public.musica_playlist()
returns text
language sql stable security definer set search_path = '' as $$
  select a.valor #>> '{}' from public.ajustes a where a.chave = 'musica_playlist' and auth.uid() is not null
$$;
revoke all on function public.musica_playlist() from public, anon;
grant execute on function public.musica_playlist() to authenticated;

-- Só admin. Aceita link de playlist, álbum, artista ou podcast do Spotify; vazio desliga o player.
create or replace function public.musica_definir(p_url text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  m text[];
  limpo text;
begin
  if not public.tem_cargo('admin') then raise exception 'sem permissão'; end if;
  if p_url is null or trim(p_url) = '' then
    delete from public.ajustes where chave = 'musica_playlist';
    return null;
  end if;
  m := regexp_match(trim(p_url), '^https://open\.spotify\.com/(?:intl-[a-z-]+/)?(?:embed/)?(playlist|album|artist|show)/([A-Za-z0-9]{10,40})');
  if m is null then raise exception 'link do Spotify inválido'; end if;
  limpo := 'https://open.spotify.com/' || m[1] || '/' || m[2];
  insert into public.ajustes (chave, valor) values ('musica_playlist', to_jsonb(limpo))
  on conflict (chave) do update set valor = excluded.valor, atualizado_em = now();
  return limpo;
end $$;
revoke all on function public.musica_definir(text) from public, anon;
grant execute on function public.musica_definir(text) to authenticated;
