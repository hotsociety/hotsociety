"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { useMembro } from "./MemberContext";
import { toast } from "./Toast";
import { CANAIS, REGRAS } from "../../_lib/demo";
import { supabase } from "../../_lib/supabase";
import { InsigniasNome } from "./insignias/Insignia";
import "./ui.css";
import ui from "./ui.styles";
import "./canais.css";
import s from "./canais.styles";

type Msg = { id: number; autor: string; eu: boolean; equipe: boolean; texto: string; criado_em: string; insignias?: string[] | null };

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

/** Chat por canais (aba "Canais" do Feed). Atualiza sozinho a cada poucos segundos. */
export default function Canais() {
  const { cargo } = useMembro();
  const [canal, setCanal] = useState(CANAIS[0].id);
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const ultimo = useRef(0);
  const atual = CANAIS.find((c) => c.id === canal)!;

  const buscar = useCallback(
    async (novas: boolean) => {
      const { data, error } = await supabase.rpc("canal_mensagens", { p_canal: canal, p_depois: novas ? ultimo.current : 0 });
      if (error) {
        if (!novas) setMsgs([]);
        return;
      }
      const l = (data ?? []) as Msg[];
      if (l.length) ultimo.current = l[l.length - 1].id;
      setMsgs((m) => (novas && m ? [...m, ...l.filter((x) => !m.some((y) => y.id === x.id))] : l));
    },
    [canal],
  );

  useEffect(() => {
    ultimo.current = 0;
    setMsgs(null);
    buscar(false);
    const t = setInterval(() => document.visibilityState === "visible" && buscar(true), 6000);
    return () => clearInterval(t);
  }, [buscar]);

  useEffect(() => {
    const el = caixa.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs?.length, canal]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    const { error } = await supabase.rpc("enviar_mensagem", { p_canal: canal, p_texto: t });
    setEnviando(false);
    if (error) return toast(/devagar/.test(error.message) ? "Calma: muitas mensagens seguidas." : "Não deu para enviar.");
    setTexto("");
    buscar(true);
  }

  async function acao(m: Msg) {
    if (m.eu || cargo) {
      const { error } = await supabase.rpc("apagar_conteudo", { p_tipo: "mensagem", p_ref: String(m.id) });
      if (error) return toast("Não deu para apagar.");
      setMsgs((l) => l?.filter((x) => x.id !== m.id) ?? l);
      toast("Mensagem apagada");
    } else {
      const { error } = await supabase.rpc("denunciar", { p_tipo: "mensagem", p_ref: String(m.id), p_motivo: null });
      toast(error ? "Não deu para denunciar." : "Denúncia enviada. A equipe vai olhar.");
    }
  }

  return (
    <div className={ui.page}>
      <div className={s.layout}>
        <nav className={s.channels} aria-label="Canais">
          <span className={s.chTitle}>Canais</span>
          {CANAIS.map((c) => (
            <button key={c.id} type="button" className={s.ch} aria-current={canal === c.id} onClick={() => setCanal(c.id)}>
              <span>
                <i>#</i> {c.nome}
              </span>
            </button>
          ))}
        </nav>

        <section className={s.chat} aria-label={`Canal ${atual.nome}`}>
          <div className={s.chatHead}>
            <b>
              <i>#</i> {atual.nome}
            </b>
            <small>{atual.desc}</small>
          </div>

          <div className={s.msgs} ref={caixa} aria-live="polite">
            {msgs === null ? (
              <p className={s.vazio}>Carregando…</p>
            ) : msgs.length === 0 ? (
              <p className={s.vazio}>Ninguém falou aqui ainda. Puxa o assunto.</p>
            ) : (
              msgs.map((m) => (
                <div key={m.id} className={`${s.msg} ${m.eu ? s.eu : ""}`}>
                  <span className={ui.ini}>{ini(m.autor)}</span>
                  <div className={s.bubble}>
                    <div className={s.meta}>
                      <b>
                        {m.eu ? "Você" : m.equipe ? `${m.autor} · Equipe` : m.autor}
                        <InsigniasNome ids={m.insignias} />
                      </b>
                      <small>{hora(m.criado_em)}</small>
                      <button type="button" className="hs-ch-acao" onClick={() => acao(m)}>
                        {m.eu || cargo ? "apagar" : "denunciar"}
                      </button>
                    </div>
                    <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.texto}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <form className={s.composer} onSubmit={enviar}>
            <label className="sr-only" htmlFor="msg">
              Mensagem
            </label>
            <input
              id="msg"
              className={ui.input}
              placeholder={`Mensagem em #${atual.nome}`}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              autoComplete="off"
              maxLength={1000}
            />
            <button type="submit" className={s.send} aria-label="Enviar" disabled={!texto.trim() || enviando}>
              <Icon name="send" />
            </button>
          </form>
        </section>

        <aside className={s.side}>
          <section className={ui.card}>
            <h2 className={ui.h2}>Regras da casa</h2>
            <ol className={s.rules}>
              {REGRAS.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
