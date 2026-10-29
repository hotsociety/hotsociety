"use client";

// Perfil → Música: ligar/desligar o player e escolher a própria música.
import { useEffect, useState } from "react";
import { supabase } from "../../_lib/supabase";
import { toast } from "../../_components/membros/Toast";
import { EVENTO_MUSICA } from "../../_components/membros/musica/PlayerMusica";
import ui from "../../_components/membros/ui.styles";

type Config = { padrao: string | null; minha: string | null; oculto: boolean };

export default function MusicaPerfil() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [link, setLink] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    supabase.rpc("musica_config").then(({ data }) => {
      const c = data as Config | null;
      if (c) {
        setCfg(c);
        setLink(c.minha ?? "");
      }
    });
  }, []);

  const avisar = () => window.dispatchEvent(new Event(EVENTO_MUSICA));

  async function ligar(v: boolean) {
    setCfg((c) => (c ? { ...c, oculto: !v } : c));
    const { error } = await supabase.rpc("musica_ocultar", { p_oculto: !v });
    if (error) return toast("Não deu para salvar agora.");
    avisar();
    toast(v ? "Música ligada: o botão aparece no canto da tela." : "Música desligada.");
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const { data, error } = await supabase.rpc("musica_minha", { p_url: link.trim() });
    setSalvando(false);
    if (error) return toast(/inválido/.test(error.message) ? "Cole um link do Spotify (Compartilhar → Copiar link)." : "Não deu para salvar agora.");
    setCfg((c) => (c ? { ...c, minha: (data as string | null) ?? null } : c));
    setLink((data as string | null) ?? "");
    avisar();
    toast(data ? "Sua música foi salva." : "Voltou para a trilha da Society.");
  }

  if (!cfg) return null;
  const ligado = !cfg.oculto;

  return (
    <form className={ui.card} onSubmit={salvar} style={{ display: "grid", gap: 12 }}>
      <div className={ui.rowBetween}>
        <h2 className={ui.h2}>Música</h2>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={ligado} onChange={(e) => ligar(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#C9A24E" }} />
          {ligado ? "Ligada" : "Desligada"}
        </label>
      </div>
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
        Mini player do Spotify que continua tocando enquanto você navega. Use a trilha da Society ou cole o link da sua playlist, álbum, artista ou
        música (no Spotify: Compartilhar → Copiar link). Para ouvir as faixas inteiras, entre no Spotify neste navegador.
      </p>
      {ligado && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            className={ui.input}
            style={{ flex: "1 1 260px", minWidth: 0 }}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://open.spotify.com/playlist/…  (vazio = trilha da Society)"
            aria-label="Link do Spotify"
          />
          <button type="submit" className={ui.btnGhost} disabled={salvando || link.trim() === (cfg.minha ?? "")}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      )}
    </form>
  );
}
