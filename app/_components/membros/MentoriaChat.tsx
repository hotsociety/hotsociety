"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { toast } from "./Toast";
import { supabase } from "../../_lib/supabase";
import "./ui.css";
import ui from "./ui.styles";
import "./canais.css";
import s from "./canais.styles";

type Msg = { id: number; autor: string; eu: boolean; mentor: boolean; texto: string; criado_em: string };

const HORA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
const DIA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
const hora = (iso: string) => {
  const d = new Date(iso);
  return Date.now() - d.getTime() < 20 * 3600e3 ? HORA.format(d) : `${DIA.format(d)} ${HORA.format(d)}`;
};
const ini = (n: string) =>
  n
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();

/** Chat da mentoria: "turma:<id>" (grupo) ou "dm:<aluno>" (privado com o mentor). Atualiza sozinho. */
export default function MentoriaChat({ conversa, titulo, sub, vazio }: { conversa: string; titulo: string; sub?: string; vazio?: string }) {
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const ultimo = useRef(0);

  const buscar = useCallback(
    async (novas: boolean) => {
      const { data, error } = await supabase.rpc("mentoria_mensagens", { p_conversa: conversa, p_depois: novas ? ultimo.current : 0 });
      if (error) {
        if (!novas) setMsgs([]);
        return;
      }
      const l = (data ?? []) as Msg[];
      if (l.length) ultimo.current = l[l.length - 1].id;
      setMsgs((m) => (novas && m ? [...m, ...l.filter((x) => !m.some((y) => y.id === x.id))] : l));
    },
    [conversa],
  );

  useEffect(() => {
    ultimo.current = 0;
    setMsgs(null);
    buscar(false);
    const t = setInterval(() => document.visibilityState === "visible" && buscar(true), 5000);
    return () => clearInterval(t);
  }, [buscar]);

  useEffect(() => {
    const el = caixa.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs?.length, conversa]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    const { error } = await supabase.rpc("mentoria_enviar", { p_conversa: conversa, p_texto: t });
    setEnviando(false);
    if (error) return toast(/devagar/.test(error.message) ? "Calma: muitas mensagens seguidas." : "Não deu para enviar.");
    setTexto("");
    buscar(true);
  }

  async function apagar(m: Msg) {
    const { error } = await supabase.rpc("mentoria_apagar_msg", { p_id: m.id });
    if (error) return toast("Não deu para apagar.");
    setMsgs((l) => l?.filter((x) => x.id !== m.id) ?? l);
  }

  return (
    <section className={s.chat} aria-label={titulo} style={{ minHeight: 420 }}>
      <div className={s.chatHead}>
        <b>{titulo}</b>
        {sub && <small>{sub}</small>}
      </div>
      <div className={s.msgs} ref={caixa} aria-live="polite">
        {msgs === null ? (
          <p className={s.vazio}>Carregando…</p>
        ) : msgs.length === 0 ? (
          <p className={s.vazio}>{vazio ?? "Nenhuma mensagem ainda."}</p>
        ) : (
          msgs.map((m) => (
            <div key={m.id} className={`${s.msg} ${m.eu ? s.eu : ""}`}>
              <span className={ui.ini}>{ini(m.autor)}</span>
              <div className={s.bubble}>
                <div className={s.meta}>
                  <b>{m.eu ? "Você" : m.mentor ? `${m.autor} · Mentor` : m.autor}</b>
                  <small>{hora(m.criado_em)}</small>
                  {m.eu && (
                    <button type="button" className="hs-ch-acao" onClick={() => apagar(m)}>
                      apagar
                    </button>
                  )}
                </div>
                <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.texto}</p>
              </div>
            </div>
          ))
        )}
      </div>
      <form className={s.composer} onSubmit={enviar}>
        <label className="sr-only" htmlFor={`msg-${conversa}`}>
          Mensagem
        </label>
        <input
          id={`msg-${conversa}`}
          className={ui.input}
          placeholder="Escreva uma mensagem"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoComplete="off"
          maxLength={2000}
        />
        <button type="submit" className={s.send} aria-label="Enviar" disabled={!texto.trim() || enviando}>
          <Icon name="send" />
        </button>
      </form>
    </section>
  );
}
