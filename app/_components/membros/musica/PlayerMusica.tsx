"use client";

// Player do Spotify fixo na área de membros: abre num botão no canto e continua tocando ao trocar de página
// (fica no layout; ao minimizar o iframe só é escondido, nunca desmontado).
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../_lib/supabase";
import "./musica.css";

const CHAVE = "hs-musica-aberta";

function uriDe(url: string | null) {
  const m = url?.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(playlist|album|artist|show)\/([A-Za-z0-9]+)/);
  return m ? `spotify:${m[1]}:${m[2]}` : null;
}

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
  const [uri, setUri] = useState<string | null>(null);
  const [tocando, setTocando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const alvo = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState(false);
  const [carregado, setCarregado] = useState(false); // só cria o player depois do primeiro clique

  useEffect(() => {
    let vivo = true;
    supabase.rpc("musica_playlist").then(({ data }) => vivo && setUri(uriDe((data as string | null) ?? null)));
    return () => {
      vivo = false;
    };
  }, []);

  // Se a pessoa deixou aberto, reabre o painel (a música recomeça só quando ela der play: o navegador não deixa tocar sozinho).
  useEffect(() => {
    try {
      if (sessionStorage.getItem(CHAVE) === "1") {
        setAberto(true);
        setCarregado(true);
      }
    } catch {}
  }, []);

  // Cria o player uma única vez (depois do primeiro clique).
  useEffect(() => {
    if (!carregado || !uri || !alvo.current) return;
    let vivo = true;
    let ctrl: Controle | null = null;
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
  }, [carregado, uri]);

  function alternar(v: boolean) {
    setAberto(v);
    if (v) setCarregado(true);
    try {
      sessionStorage.setItem(CHAVE, v ? "1" : "0");
    } catch {}
  }

  if (!uri) return null;
  const [tipo, id] = uri.split(":").slice(1);

  return (
    <div className={"hs-mu" + (aberto ? " aberto" : "")}>
      <section className="hs-mu-painel" aria-label="Música" aria-hidden={!aberto}>
        <header>
          <span className={"hs-mu-eq" + (tocando ? "" : " parado")} aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <b>Trilha da Society</b>
          {tocando && <em>tocando</em>}
          <button type="button" onClick={() => alternar(false)} aria-label="Minimizar o player" tabIndex={aberto ? 0 : -1}>
            –
          </button>
        </header>
        {carregado &&
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
          ))}
        <small>Entre no Spotify neste navegador para ouvir as faixas inteiras.</small>
      </section>
      <button type="button" className="hs-mu-btn" aria-expanded={aberto} aria-label={aberto ? "Minimizar música" : "Abrir música"} onClick={() => alternar(!aberto)}>
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 18V5l11-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="17" cy="16" r="3" />
        </svg>
        <span>{tocando ? "Tocando" : "Ouvir música"}</span>
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
