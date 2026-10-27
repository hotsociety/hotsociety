"use client";

import { useEffect, useState } from "react";
import { Modal, toast } from "../../../_components/membros/Toast";
import { recarregarAulasInfo } from "../../../_components/membros/useAulasInfo";
import { MODULOS, comExtras, type AulaExtra, type Aula } from "../../../_lib/demo";
import { erroAmigavel } from "../../../_lib/painel";
import { supabase } from "../../../_lib/supabase";
import { duracaoValida, embedDoVideo, type AulaInfo } from "../../../_lib/video";

// Admin cola o link do vídeo de cada aula e cria aulas novas. O link só é entregue a quem tem acesso ativo.
export default function Aulas() {
  const [info, setInfo] = useState<Map<string, AulaInfo> | null>(null);
  const [extras, setExtras] = useState<AulaExtra[]>([]);
  const [erro, setErro] = useState("");
  const [edit, setEdit] = useState<{ aula: Aula; mod: string; extra: boolean } | null>(null);
  const [nova, setNova] = useState<string | null>(null); // slug do módulo da aula nova
  const [n, setN] = useState(0);

  useEffect(() => {
    let vivo = true;
    supabase.rpc("aulas_info").then(({ data, error }) => {
      if (!vivo) return;
      setErro(error ? erroAmigavel(error) : "");
      setInfo(new Map(((data ?? []) as AulaInfo[]).map((a) => [a.aula_id, a])));
    });
    supabase.rpc("aulas_extras").then(({ data, error }) => {
      if (vivo && !error && Array.isArray(data)) setExtras(data as AulaExtra[]);
    });
    return () => {
      vivo = false;
    };
  }, [n]);

  const mods = comExtras(MODULOS, extras);
  const ehExtra = new Set(extras.map((x) => x.aula_id));
  const total = mods.reduce((s, m) => s + m.aulas.length, 0);
  const comVideo = info ? mods.flatMap((m) => m.aulas).filter((a) => embedDoVideo(info.get(a.id)?.video_url)).length : 0;
  const feito = () => {
    setEdit(null);
    setNova(null);
    recarregarAulasInfo();
    setN((x) => x + 1);
  };

  return (
    <>
      <div className="hs-pn-kpis" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
        <div className="hs-pn-kpi">
          <small>Aulas com vídeo</small>
          <b>
            {info ? comVideo : "…"} / {total}
          </b>
        </div>
        <div className="hs-pn-kpi">
          <small>Sem vídeo</small>
          <b>{info ? total - comVideo : "…"}</b>
          <em>O aluno vê &ldquo;Vídeo desta aula em breve&rdquo;</em>
        </div>
      </div>
      {erro && <p className="hs-pn-erro">{erro}</p>}
      <div className="hs-pn-bar" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: "8px 0 0", font: "800 18px/1.2 var(--f-d)" }}>Aulas da Hot Academy</h2>
        <button type="button" className="hs-pn-btn hs-pn-btn-p hs-pn-btn-sm" onClick={() => setNova(MODULOS[0].slug)}>
          + Adicionar aula
        </button>
      </div>
      <p className="hs-pn-nota">
        Use Panda Video ou Vimeo com o vídeo marcado como privado e liberado só para hotsociety.com.br. YouTube &ldquo;não listado&rdquo; funciona, mas qualquer um com o link
        consegue assistir.
      </p>

      {mods.map((m) => (
        <div key={m.slug} className="hs-pn-tw">
          <table className="hs-pn-t" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th>
                  Módulo {m.n} · {m.t}
                </th>
                <th>Vídeo</th>
                <th>Duração</th>
                <th>
                  <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => setNova(m.slug)}>
                    + Aula
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {m.aulas.map((a, i) => {
                const x = info?.get(a.id);
                const ok = !!embedDoVideo(x?.video_url);
                return (
                  <tr key={a.id}>
                    <td>
                      {String(i + 1).padStart(2, "0")} · {a.t}
                      {(x?.material || ehExtra.has(a.id)) && (
                        <small>
                          {[ehExtra.has(a.id) && "Criada pelo painel", x?.material && "Com material de apoio"].filter(Boolean).join(" · ")}
                        </small>
                      )}
                    </td>
                    <td>
                      <span className={"hs-pn-st " + (ok ? "ativo" : "sem")}>{ok ? "Publicado" : "Sem vídeo"}</span>
                    </td>
                    <td className="hs-pn-mono">{x?.duracao ?? "—"}</td>
                    <td>
                      <div className="hs-pn-acts">
                        <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => setEdit({ aula: a, mod: `${m.n} · ${m.t}`, extra: ehExtra.has(a.id) })}>
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {edit && <Editar aula={edit.aula} mod={edit.mod} extra={edit.extra} atual={info?.get(edit.aula.id)} onClose={() => setEdit(null)} onFeito={feito} />}
      {nova && <Editar modulo={nova} onClose={() => setNova(null)} onFeito={feito} />}
    </>
  );
}

// Edita uma aula (vídeo, duração, material; título se foi criada pelo painel) ou cria uma nova (quando recebe `modulo`).
function Editar({
  aula,
  mod,
  extra,
  modulo,
  atual,
  onClose,
  onFeito,
}: {
  aula?: Aula;
  mod?: string;
  extra?: boolean;
  modulo?: string;
  atual?: AulaInfo;
  onClose: () => void;
  onFeito: () => void;
}) {
  const criando = !aula;
  const [slug, setSlug] = useState(modulo ?? MODULOS[0].slug);
  const [titulo, setTitulo] = useState(aula?.t ?? "");
  const [video, setVideo] = useState(atual?.video_url ?? "");
  const [duracao, setDuracao] = useState(atual?.duracao ?? "");
  const [material, setMaterial] = useState(atual?.material ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const previa = embedDoVideo(video);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (video.trim() && !previa) return setErro("Link não aceito. Use o link de incorporação do Panda Video, um link do Vimeo ou do YouTube.");
    if (duracao.trim() && !duracaoValida(duracao)) return setErro("Duração no formato minutos:segundos, ex.: 12:30.");
    if ((criando || extra) && titulo.trim().length < 2) return setErro("Dê um título para a aula.");
    setSalvando(true);
    let error;
    if (criando) {
      ({ error } = await supabase.rpc("criar_aula", { p_modulo: slug, p_titulo: titulo.trim(), p_video: video.trim(), p_duracao: duracao.trim(), p_material: material.trim() }));
    } else {
      ({ error } = await supabase.rpc("salvar_aula", { p_aula: aula.id, p_video: video.trim(), p_duracao: duracao.trim(), p_material: material.trim() }));
      if (!error && extra && titulo.trim() !== aula.t) ({ error } = await supabase.rpc("renomear_aula", { p_aula: aula.id, p_titulo: titulo.trim() }));
    }
    setSalvando(false);
    if (error) return setErro(/check constraint/.test(error.message) ? "Link ou duração em formato não aceito." : /limite de aulas/.test(error.message) ? "Este módulo chegou ao limite de 99 aulas." : erroAmigavel(error));
    toast(criando ? "Aula criada · já aparece para os alunos" : "Aula salva");
    onFeito();
  }

  return (
    <Modal title={criando ? "Nova aula" : aula.t} onClose={onClose}>
      <form className="hs-pn-form" onSubmit={salvar}>
        {criando ? (
          <label className="hs-pn-fld">
            Módulo
            <select className="hs-pn-sel" value={slug} onChange={(e) => setSlug(e.target.value)}>
              {MODULOS.map((m) => (
                <option key={m.slug} value={m.slug}>
                  Módulo {m.n} · {m.t}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="hs-pn-nota" style={{ margin: 0 }}>
            Módulo {mod}
          </p>
        )}
        {(criando || extra) && (
          <label className="hs-pn-fld">
            Título da aula
            <input className="hs-pn-in" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={140} placeholder="Ex.: Como precificar o primeiro pack" autoFocus={criando} />
          </label>
        )}
        <label className="hs-pn-fld">
          Link do vídeo
          <input className="hs-pn-in" type="url" inputMode="url" value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://player-vz-….tv.pandavideo.com.br/embed/?v=…" />
        </label>
        {video.trim() && (
          <div style={{ position: "relative", aspectRatio: "16 / 9", borderRadius: 10, overflow: "hidden", background: "#111113", border: "1px solid var(--line)" }}>
            {previa ? (
              <iframe src={previa} title="Prévia do vídeo" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} allow="fullscreen; picture-in-picture; encrypted-media" />
            ) : (
              <p className="hs-pn-nota" style={{ padding: 16 }}>
                Link não reconhecido.
              </p>
            )}
          </div>
        )}
        <label className="hs-pn-fld">
          Duração
          <input className="hs-pn-in" value={duracao} onChange={(e) => setDuracao(e.target.value)} placeholder="12:30" maxLength={6} />
        </label>
        <label className="hs-pn-fld">
          Material de apoio (texto, links, prompts)
          <textarea className="hs-pn-in" style={{ minHeight: 110, padding: 12, lineHeight: 1.45 }} value={material} onChange={(e) => setMaterial(e.target.value)} maxLength={8000} placeholder={"Uma linha por item. Link: Nome | https://…\nEx.: Mapa mental | https://miro.com/…"} />
        </label>
        {criando && <p className="hs-pn-nota">A aula entra no fim do módulo escolhido e aparece para os alunos na hora. O vídeo pode ser colado depois em &quot;Editar&quot;.</p>}
        {erro && <p className="hs-pn-erro">{erro}</p>}
        <div className="hs-pn-bar">
          <button type="submit" className="hs-pn-btn hs-pn-btn-p" disabled={salvando}>
            {salvando ? "Salvando…" : criando ? "Criar aula" : "Salvar"}
          </button>
          <button type="button" className="hs-pn-btn" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
