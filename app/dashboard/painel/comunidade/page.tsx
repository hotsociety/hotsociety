"use client";

import { useEffect, useState } from "react";
import { PODE, useMembro } from "../../../_components/membros/MemberContext";
import { Modal, toast } from "../../../_components/membros/Toast";
import { dataHora, erroAmigavel } from "../../../_lib/painel";
import { supabase } from "../../../_lib/supabase";

type Denuncia = { tipo: "post" | "comentario" | "mensagem"; ref: string; denuncias: number; motivos: string | null; texto: string | null; autor_email: string | null; ultima: string };
type Live = { id: string; titulo: string; descricao: string | null; inicio: string; link: string | null };

const TIPO: Record<string, string> = { post: "Post do feed", comentario: "Comentário", mensagem: "Mensagem de canal" };

// Moderação (denúncias) e agenda de lives.
export default function Comunidade() {
  const { cargo } = useMembro();
  const [den, setDen] = useState<Denuncia[] | null>(null);
  const [lives, setLives] = useState<Live[] | null>(null);
  const [erro, setErro] = useState("");
  const [edit, setEdit] = useState<Live | "nova" | null>(null);
  const [n, setN] = useState(0);
  const podeLive = PODE.verPlacas(cargo); // admin e suporte

  useEffect(() => {
    let vivo = true;
    Promise.all([supabase.rpc("painel_denuncias"), supabase.rpc("proximas_lives")]).then(([d, l]) => {
      if (!vivo) return;
      setErro(d.error ? erroAmigavel(d.error) : "");
      setDen((d.data ?? []) as Denuncia[]);
      setLives((l.data ?? []) as Live[]);
    });
    return () => {
      vivo = false;
    };
  }, [n]);

  async function remover(d: Denuncia) {
    const { error } = await supabase.rpc("apagar_conteudo", { p_tipo: d.tipo, p_ref: d.ref });
    if (error) return toast(erroAmigavel(error));
    toast("Conteúdo removido");
    setN((x) => x + 1);
  }
  async function ignorar(d: Denuncia) {
    const { error } = await supabase.rpc("ignorar_denuncia", { p_tipo: d.tipo, p_ref: d.ref });
    if (error) return toast(erroAmigavel(error));
    toast("Denúncia arquivada");
    setN((x) => x + 1);
  }
  async function apagarLive(l: Live) {
    const { error } = await supabase.rpc("apagar_live", { p_id: l.id });
    if (error) return toast(erroAmigavel(error));
    toast("Live apagada");
    setN((x) => x + 1);
  }

  return (
    <>
      {erro && <p className="hs-pn-erro">{erro}</p>}
      {cargo === "admin" && <MusicaPlataforma />}
      <h2 style={{ margin: "4px 0 0", font: "800 18px/1.2 var(--f-d)" }}>Denúncias</h2>
      <div className="hs-pn-tw">
        <table className="hs-pn-t">
          <thead>
            <tr>
              <th>Conteúdo</th>
              <th>Autor</th>
              <th className="n">Denúncias</th>
              <th>Última</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {den?.map((d) => (
              <tr key={d.tipo + d.ref}>
                <td style={{ maxWidth: 420 }}>
                  <small style={{ marginTop: 0 }}>{TIPO[d.tipo]}</small>
                  <span style={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>{d.texto ?? "(já removido)"}</span>
                  {d.motivos && <small>Motivo: {d.motivos}</small>}
                </td>
                <td style={{ overflowWrap: "anywhere" }}>{d.autor_email ?? "—"}</td>
                <td className="n">{d.denuncias}</td>
                <td className="nw">{dataHora(d.ultima)}</td>
                <td>
                  <div className="hs-pn-acts">
                    <button type="button" className="hs-pn-btn hs-pn-btn-sm hs-pn-btn-d" onClick={() => remover(d)}>
                      Remover
                    </button>
                    <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => ignorar(d)}>
                      Manter
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {den === null && <p className="hs-pn-vazio">Carregando…</p>}
        {den?.length === 0 && <p className="hs-pn-vazio">Nenhuma denúncia aberta.</p>}
      </div>
      <p className="hs-pn-nota">Qualquer pessoa da equipe também pode apagar um post, comentário ou mensagem direto no feed (menu ⋯ ou &ldquo;apagar&rdquo;).</p>

      <div className="hs-pn-bar" style={{ justifyContent: "space-between", marginTop: 8 }}>
        <h2 style={{ margin: 0, font: "800 18px/1.2 var(--f-d)" }}>Lives</h2>
        {podeLive && (
          <button type="button" className="hs-pn-btn hs-pn-btn-p hs-pn-btn-sm" onClick={() => setEdit("nova")}>
            Marcar live
          </button>
        )}
      </div>
      <div className="hs-pn-tw">
        <table className="hs-pn-t" style={{ minWidth: 640 }}>
          <thead>
            <tr>
              <th>Quando</th>
              <th>Live</th>
              <th>Link</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {lives?.map((l) => (
              <tr key={l.id}>
                <td className="nw">{dataHora(l.inicio)}</td>
                <td>
                  {l.titulo}
                  {l.descricao && <small>{l.descricao}</small>}
                </td>
                <td>{l.link ? "✓" : <span className="hs-pn-alerta">Sem link</span>}</td>
                <td>
                  {podeLive && (
                    <div className="hs-pn-acts">
                      <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => setEdit(l)}>
                        Editar
                      </button>
                      <button type="button" className="hs-pn-btn hs-pn-btn-sm hs-pn-btn-d" onClick={() => apagarLive(l)}>
                        Apagar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lives?.length === 0 && <p className="hs-pn-vazio">Nenhuma live marcada.</p>}
      </div>
      <p className="hs-pn-nota">A próxima live aparece na tela inicial e no HOTPHONE. O link (Zoom, Meet, YouTube) só aparece para quem tem acesso ativo.</p>

      {edit && (
        <EditarLive
          l={edit === "nova" ? null : edit}
          onClose={() => setEdit(null)}
          onFeito={() => {
            setEdit(null);
            setN((x) => x + 1);
          }}
        />
      )}
    </>
  );
}

// Playlist do player de música da área de membros (só admin).
function MusicaPlataforma() {
  const [url, setUrl] = useState("");
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    supabase.rpc("musica_playlist").then(({ data }) => setUrl((data as string | null) ?? ""));
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const { data, error } = await supabase.rpc("musica_definir", { p_url: url.trim() });
    setSalvando(false);
    if (error) return toast(/inválido/.test(error.message) ? "Cole um link do Spotify (playlist, álbum, artista ou podcast)." : erroAmigavel(error));
    setUrl((data as string | null) ?? "");
    toast(data ? "Playlist atualizada. Vale para quem abrir o player a partir de agora." : "Player de música desligado.");
  }

  return (
    <form onSubmit={salvar} style={{ display: "grid", gap: 8, padding: 14, borderRadius: 12, border: "1px solid var(--line)", background: "var(--s1)" }}>
      <h2 style={{ margin: 0, font: "800 18px/1.2 var(--f-d)" }}>Música da plataforma</h2>
      <p className="hs-pn-nota" style={{ margin: 0 }}>
        Player do Spotify que os alunos ouvem enquanto navegam. Cole o link de uma playlist (Spotify → Compartilhar → Copiar link). Deixe vazio para desligar.
      </p>
      <div className="hs-pn-bar" style={{ gap: 8 }}>
        <input className="hs-pn-in" style={{ flex: 1, minWidth: 0 }} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://open.spotify.com/playlist/…" />
        <button type="submit" className="hs-pn-btn hs-pn-btn-p" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}

// "2026-10-22T20:00" no fuso de Brasília ↔ ISO
function paraLocal(iso: string) {
  const d = new Date(new Date(iso).getTime() - 3 * 3600e3);
  return d.toISOString().slice(0, 16);
}
function deLocal(v: string) {
  return new Date(v + ":00-03:00").toISOString();
}

function EditarLive({ l, onClose, onFeito }: { l: Live | null; onClose: () => void; onFeito: () => void }) {
  const [titulo, setTitulo] = useState(l?.titulo ?? "");
  const [descricao, setDescricao] = useState(l?.descricao ?? "");
  const [inicio, setInicio] = useState(l ? paraLocal(l.inicio) : "");
  const [link, setLink] = useState(l?.link ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (titulo.trim().length < 3 || !inicio) return setErro("Preencha o título e a data.");
    if (link.trim() && !/^https:\/\//.test(link.trim())) return setErro("O link precisa começar com https://");
    setSalvando(true);
    const { error } = await supabase.rpc("salvar_live", { p_id: l?.id ?? null, p_titulo: titulo, p_descricao: descricao, p_inicio: deLocal(inicio), p_link: link });
    setSalvando(false);
    if (error) return setErro(erroAmigavel(error));
    toast("Live salva");
    onFeito();
  }

  return (
    <Modal title={l ? "Editar live" : "Marcar live"} onClose={onClose}>
      <form className="hs-pn-form" onSubmit={salvar}>
        <label className="hs-pn-fld">
          Título
          <input className="hs-pn-in" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} required />
        </label>
        <label className="hs-pn-fld">
          Descrição (opcional)
          <input className="hs-pn-in" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={400} />
        </label>
        <label className="hs-pn-fld">
          Dia e hora (Brasília)
          <input className="hs-pn-in" type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
        </label>
        <label className="hs-pn-fld">
          Link para entrar
          <input className="hs-pn-in" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
        </label>
        {erro && <p className="hs-pn-erro">{erro}</p>}
        <div className="hs-pn-bar">
          <button type="submit" className="hs-pn-btn hs-pn-btn-p" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
          <button type="button" className="hs-pn-btn" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
