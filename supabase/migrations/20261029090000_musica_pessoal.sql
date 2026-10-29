-- Música por aluno: escolher a própria playlist/álbum/música do Spotify ou esconder o player.
alter table public.perfis add column if not exists musica jsonb not null default '{}'::jsonb;

-- Normaliza um link do Spotify (playlist, álbum, artista, música, podcast ou episódio). Inválido → null.
create or replace function public.hs_spotify_link(p text)
returns text
language sql immutable set search_path = '' as $$
  select 'https://open.spotify.com/' || m[1] || '/' || m[2]
  from (select regexp_match(trim(coalesce(p, '')),
         '^(?:https://)?open\.spotify\.com/(?:intl-[a-z-]+/)?(?:embed/)?(playlist|album|artist|track|show|episode)/([A-Za-z0-9]{10,40})') as m) x
  where m is not null
$$;
revoke all on function public.hs_spotify_link(text) from public, anon, authenticated;

create or replace function public.musica_config()
returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'padrao', (select a.valor #>> '{}' from public.ajustes a where a.chave = 'musica_playlist'),
    'minha', p.musica ->> 'url',
    'oculto', coalesce((p.musica ->> 'oculto')::boolean, false)
  )
  from public.perfis p where p.id = auth.uid()
$$;
revoke all on function public.musica_config() from public, anon;
grant execute on function public.musica_config() to authenticated;

-- Salva a música do próprio aluno (vazio = volta para a trilha da Society).
create or replace function public.musica_minha(p_url text)
returns text
language plpgsql security definer set search_path = '' as $$
declare limpo text := public.hs_spotify_link(p_url);
begin
  if auth.uid() is null then raise exception 'sem login'; end if;
  if coalesce(trim(p_url), '') <> '' and limpo is null then raise exception 'link do Spotify inválido'; end if;
  update public.perfis
     set musica = case when limpo is null then musica - 'url' else jsonb_set(musica, '{url}', to_jsonb(limpo)) end
   where id = auth.uid();
  return limpo;
end $$;
revoke all on function public.musica_minha(text) from public, anon;
grant execute on function public.musica_minha(text) to authenticated;

-- Esconde ou mostra o botão de música para o próprio aluno.
create or replace function public.musica_ocultar(p_oculto boolean)
returns void
language sql security definer set search_path = '' as $$
  update public.perfis set musica = jsonb_set(musica, '{oculto}', to_jsonb(coalesce(p_oculto, false))) where id = auth.uid()
$$;
revoke all on function public.musica_ocultar(boolean) from public, anon;
grant execute on function public.musica_ocultar(boolean) to authenticated;

-- Admin: playlist padrão (agora aceita também álbum, artista, música e podcast).
create or replace function public.musica_definir(p_url text)
returns text
language plpgsql security definer set search_path = '' as $$
declare limpo text := public.hs_spotify_link(p_url);
begin
  if not public.tem_cargo('admin') then raise exception 'sem permissão'; end if;
  if coalesce(trim(p_url), '') = '' then
    delete from public.ajustes where chave = 'musica_playlist';
    return null;
  end if;
  if limpo is null then raise exception 'link do Spotify inválido'; end if;
  insert into public.ajustes (chave, valor) values ('musica_playlist', to_jsonb(limpo))
  on conflict (chave) do update set valor = excluded.valor, atualizado_em = now();
  return limpo;
end $$;
revoke all on function public.musica_definir(text) from public, anon;
grant execute on function public.musica_definir(text) to authenticated;
