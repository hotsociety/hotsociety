"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { postApi } from "../../_lib/api";
import { supabase } from "../../_lib/supabase";
import { Modal, toast } from "./Toast";
import "./ui.css";
import ui from "./ui.styles";

export type ChamadoResumo = { id: string; protocolo: string; tema: string; assunto: string; status: string; criado_em: string; atualizado_em: string };
type Msg = { id: number; equipe: boolean; texto: string; em: string; quem: string };
type Detalhe = ChamadoResumo & { email: string | null; msgs: Msg[] };

export const STATUS_CHAMADO: Record<string, string> = { aberto: "Aguardando equipe", respondido: "Respondido", resolvido: "Resolvido" };
export const corStatus = (s: string) => (s === "resolvido" ? ui.badgeOk : s === "respondido" ? ui.badgeGold : "");

const QUANDO = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Conversa de um chamado. `equipe` = aberto pelo painel (mostra e-mail e botões de status). */
export default function Conversa({ id, equipe = false, onClose, onMudou }: { id: string; equipe?: boolean; onClose: () => void; onMudou?: () => void }) {
  const [d, setD] = useState<Detalhe | null>(null);
  const [erro, setErro] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc("ver_chamado", { p_id: id });
    if (error) return setErro("Não deu para abrir este chamado.");
    setD(data as Detalhe);
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);
  useEffect(() => {
    fim.current?.scrollIntoView({ block: "nearest" });
  }, [d?.msgs.length]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (texto.trim().length < 2) return;
    setEnviando(true);
    const r = await postApi("/api/suporte", { acao: "responder", id, texto: texto.trim() });
    setEnviando(false);
    if (r.erro) return toast(r.erro);
    setTexto("");
    toast(equipe ? "Resposta enviada ao aluno" : "Mensagem enviada");
    await carregar();
    onMudou?.();
  }

  async function status(s: "resolvido" | "aberto") {
    const { error } = equipe
      ? await supabase.rpc("mudar_status_chamado", { p_id: id, p_status: s })
      : await supabase.rpc("encerrar_meu_chamado", { p_id: id });
    if (error) return toast("Não deu para mudar o status.");
    toast(s === "resolvido" ? "Chamado encerrado" : "Chamado reaberto");
    await carregar();
    onMudou?.();
  }

  return (
    <Modal title={d ? `${d.protocolo} · ${d.assunto}` : "Chamado"} onClose={onClose}>
      {erro ? (
        <p className={ui.muted}>{erro}</p>
      ) : !d ? (
        <p className={ui.muted}>Carregando…</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <div className={ui.rowBetween}>
            <small className={ui.small}>
              {d.tema}
              {d.email && <> · <span style={{ overflowWrap: "anywhere" }}>{d.email}</span></>}
            </small>
            <span className={`${ui.badge} ${corStatus(d.status)}`}>{STATUS_CHAMADO[d.status] ?? d.status}</span>
          </div>
          <div style={{ display: "grid", gap: 8, maxHeight: "48vh", overflowY: "auto", paddingRight: 4 }}>
            {d.msgs.map((m) => (
              <div
                key={m.id}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: m.equipe ? "#1d1a12" : "var(--s2, #1b1b1e)",
                  border: `1px solid ${m.equipe ? "#4a3d1c" : "var(--line, #2e2e33)"}`,
                }}
              >
                <small className={ui.small} style={{ display: "block", marginBottom: 4 }}>
                  <b style={{ color: m.equipe ? "var(--gold-t)" : undefined }}>{m.equipe ? `${m.quem} · Equipe HOT SOCIETY` : m.quem}</b> · {QUANDO.format(new Date(m.em))}
                </small>
                <p style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 14.5, lineHeight: 1.5 }}>{m.texto}</p>
              </div>
            ))}
            <div ref={fim} />
          </div>
          <form onSubmit={enviar} style={{ display: "grid", gap: 10 }}>
            <label className={ui.field}>
              <span>{equipe ? "Responder ao aluno (vai por e-mail também)" : d.status === "resolvido" ? "Escrever de novo reabre o chamado" : "Escrever mais"}</span>
              <textarea className={ui.input} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={4000} rows={3} required />
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="submit" className={ui.btnGold} disabled={enviando || texto.trim().length < 2}>
                {enviando ? "Enviando…" : "Enviar"}
              </button>
              {d.status !== "resolvido" ? (
                <button type="button" className={ui.btnGhost} onClick={() => status("resolvido")}>
                  {equipe ? "Marcar como resolvido" : "Já resolveu, encerrar"}
                </button>
              ) : (
                equipe && (
                  <button type="button" className={ui.btnGhost} onClick={() => status("aberto")}>
                    Reabrir
                  </button>
                )
              )}
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}
