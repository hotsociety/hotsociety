"use client";

// Mini player do Spotify na área de membros. O aluno escolhe: ouvir a trilha da Society, colar a própria música
// (playlist, álbum, artista, faixa ou podcast) ou esconder o player. Continua tocando entre as páginas
// (fica no layout; minimizar só esconde, não desmonta).
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../_lib/supabase";
import { toast } from "../Toast";
import "./musica.css";

const ABERTO = "hs-musica-aberta";
export const EVENTO_MUSICA = "hs-musica-pref";

type Config = { padrao: string | null; minha: string | null; oculto: boolean };
type Fonte = "society" | "minha";

const RE = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(playlist|album|artist|track|show|episode)\/([A-Za-z0-9]+)/;
const uriDe = (url: string | null) => {
  const m = url?.match(RE);
  return m ? `spotify:${m[1]}:${m[2]}` : null;
};
const TIPO: Record<string, string> = { playlist: "Playlist", album: "Álbum", artist: "Artista", track: "Música", show: "Podcast", episode: "Episódio" };

// API oficial de embed do Spotify (avisa quando toca/pausa).
type Controle = { addListener: (ev: string, cb: (e: { data: { isPaused: boolean } }) => void) => void; destroy?: () => void };
type IFrameAPI = { createController: (el: HTMLElement, o: { uri: string; width: string; height: number }, cb: (c: Controle) => void) => void };
let apiPromessa: Promise<IFrameAPI> | null = null;
function carregarApi(): Promise<IFrameAPI> {
  if (apiPromessa) return apiPromessa;
  apiPromessa = new Promise((ok, falha) => {
    const w = window as unknown as { onSpotifyIframeApiReady?: (api: IFrameAPI) => void };
    w.onSpotifyIframeApiReady = (api) => ok(api);
    const sc = document.createElement("script");
    sc.src = "https://open.spotify.com/embed/iframe-api/v1";
    sc.async = true;
    sc.onerror = () => {
      apiPromessa = null;
      falha(new Error("spotify"));
    };
    document.body.appendChild(sc);
  });
  return apiPromessa;
}

export default function PlayerMusica() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [fonte, setFonte] = useState<Fonte>("society");
  const [aberto, setAberto] = useState(false);
  const [carregado, setCarregado] = useState(false); // só cria o player depois do primeiro clique
  const [tocando, setTocando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [link, setLink] = useState("");
  const [salvando, setSalvando] = useState(false);
  const alvo = useRef<HTMLDivElement>(null);

  function buscar() {
    supabase.rpc("musica_config").then(({ data }) => {
      const c = (data as Config | null) ?? { padrao: null, minha: null, oculto: false };
      setCfg(c);
      setLink(c.minha ?? "");
      setFonte(c.minha ? "minha" : "society");
    });
  }

  useEffect(() => {
    buscar();
    // o Perfil avisa quando o aluno liga/desliga a música
    const ouvir = () => buscar();
    window.addEventListener(EVENTO_MUSICA, ouvir);
    try {
      if (sessionStorage.getItem(ABERTO) === "1") {
        setAberto(true);
        setCarregado(true);
      }
    } catch {}
    return () => window.removeEventListener(EVENTO_MUSICA, ouvir);
  }, []);

  const uri = cfg ? uriDe(fonte === "minha" ? cfg.minha : cfg.padrao) : null;

  // Cria (ou troca) o player quando muda a música escolhida.
  useEffect(() => {
    if (!carregado || !uri || !alvo.current || falhou) return;
    let vivo = true;
    let ctrl: Controle | null = null;
    setTocando(false);
    carregarApi()
      .then((api) => {
        if (!vivo || !alvo.current) return;
        // O Spotify troca este elemento pelo iframe; criado fora do React para não atrapalhar a renderização.
        const el = document.createElement("div");
        alvo.current.replaceChildren(el);
        api.createController(el, { uri, width: "100%", height: 152 }, (c) => {
          ctrl = c;
          c.addListener("playback_update", (e) => setTocando(!e.data.isPaused));
        });
      })
      .catch(() => vivo && setFalhou(true));
    return () => {
      vivo = false;
      ctrl?.destroy?.();
    };
  }, [carregado, uri, falhou]);

  function alternar(v: boolean) {
    setAberto(v);
    if (v) setCarregado(true);
    try {
      sessionStorage.setItem(ABERTO, v ? "1" : "0");
    } catch {}
  }

  async function salvarMinha(e: React.FormEvent) {
    e.preventDefault();
    if (!link.trim()) return;
    setSalvando(true);
    const { data, error } = await supabase.rpc("musica_minha", { p_url: link.trim() });
    setSalvando(false);
    if (error) return toast(/inválido/.test(error.message) ? "Cole um link do Spotify (Compartilhar → Copiar link)." : "Não deu para salvar agora.");
    setCfg((c) => (c ? { ...c, minha: data as string } : c));
    setLink(data as string);
    setFonte("minha");
    toast("Sua música foi salva na sua conta.");
  }

  async function tirarMinha() {
    await supabase.rpc("musica_minha", { p_url: "" });
    setCfg((c) => (c ? { ...c, minha: null } : c));
    setLink("");
    setFonte("society");
  }

  async function esconder() {
    alternar(false);
    setCfg((c) => (c ? { ...c, oculto: true } : c));
    await supabase.rpc("musica_ocultar", { p_oculto: true });
    toast("Música desligada. Para voltar: Perfil → Música.");
  }

  if (!cfg || cfg.oculto || (!cfg.padrao && !cfg.minha)) return null;
  const tipoMinha = cfg.minha?.match(RE)?.[1];
  const [, tipo, id] = (uri ?? "::").split(":");

  return (
    <div className={"hs-mu" + (aberto ? " aberto" : "")}>
      <section className="hs-mu-painel" aria-label="Música" aria-hidden={!aberto}>
        <header>
          <span className={"hs-mu-eq" + (tocando ? "" : " parado")} aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <b>Música</b>
          {tocando && <em>tocando</em>}
          <button type="button" onClick={() => alternar(false)} aria-label="Minimizar o player" tabIndex={aberto ? 0 : -1}>
            –
          </button>
        </header>

        <div className="hs-mu-abas" role="tablist" aria-label="O que ouvir">
          {cfg.padrao && (
            <button type="button" role="tab" aria-selected={fonte === "society"} tabIndex={aberto ? 0 : -1} onClick={() => setFonte("society")}>
              Trilha da Society
            </button>
          )}
          <button type="button" role="tab" aria-selected={fonte === "minha"} tabIndex={aberto ? 0 : -1} onClick={() => setFonte("minha")}>
            Minha música
          </button>
        </div>

        {fonte === "minha" && (
          <form className="hs-mu-link" onSubmit={salvarMinha}>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Cole o link do Spotify (playlist, álbum, música…)"
              tabIndex={aberto ? 0 : -1}
              aria-label="Link do Spotify"
            />
            <button type="submit" disabled={salvando || !link.trim() || link.trim() === cfg.minha} tabIndex={aberto ? 0 : -1}>
              {salvando ? "…" : cfg.minha ? "Trocar" : "Tocar"}
            </button>
          </form>
        )}

        {uri ? (
          carregado &&
          (falhou ? (
            <iframe
              title="Player do Spotify"
              src={`https://open.spotify.com/embed/${tipo}/${id}?utm_source=generator&theme=0`}
              width="100%"
              height="152"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              tabIndex={aberto ? 0 : -1}
            />
          ) : (
            <div className="hs-mu-alvo" ref={alvo} />
          ))
        ) : (
          <p className="hs-mu-vazio">
            No Spotify, abra a playlist ou música que você quer → <b>Compartilhar</b> → <b>Copiar link</b> e cole aqui. Ela fica salva na sua conta.
          </p>
        )}

        <footer>
          <a href="https://accounts.spotify.com/login" target="_blank" rel="noopener noreferrer" tabIndex={aberto ? 0 : -1}>
            <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden>
              <circle cx="12" cy="12" r="11" fill="#1DB954" />
              <path d="M6.5 9.3c3.6-1.1 7.9-.8 11 1M7.2 12.4c3-.9 6.5-.6 9.1.9M7.8 15.3c2.4-.6 5-.4 7.1.7" stroke="#0b0b0c" strokeWidth={1.6} strokeLinecap="round" fill="none" />
            </svg>
            Entrar no Spotify
          </a>
          <span>Logado, você ouve as faixas inteiras e salva na sua biblioteca.</span>
        </footer>
        <div className="hs-mu-rodape">
          {fonte === "minha" && cfg.minha && (
            <button type="button" onClick={tirarMinha} tabIndex={aberto ? 0 : -1}>
              Remover {TIPO[tipoMinha ?? ""]?.toLowerCase() ?? "minha música"}
            </button>
          )}
          <button type="button" onClick={esconder} tabIndex={aberto ? 0 : -1}>
            Não quero música
          </button>
        </div>
      </section>
      <button type="button" className="hs-mu-btn" aria-expanded={aberto} aria-label={aberto ? "Minimizar música" : "Abrir música"} onClick={() => alternar(!aberto)}>
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 18V5l11-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="17" cy="16" r="3" />
        </svg>
        <span>{tocando ? "Tocando" : "Música"}</span>
        {tocando && !aberto && (
          <span className="hs-mu-eq" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        )}
      </button>
    </div>
  );
}
