"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { useMembro } from "./MemberContext";
import { CANAIS, REGRAS, type Msg } from "../../_lib/demo";
import "./ui.css";
import ui from "./ui.styles";
import "./canais.css";
import s from "./canais.styles";

const ONLINE = ["VP", "GS", "RT", "JB", "AM", "LC"];

/** Chat por canais (aba "Canais" do Feed). */
export default function Canais() {
  const { nome, iniciais } = useMembro();
  const [canal, setCanal] = useState(CANAIS[0].id);
  const [msgs, setMsgs] = useState<Record<string, Msg[]>>(() =>
    Object.fromEntries(CANAIS.map((c) => [c.id, c.msgs])),
  );
  const [texto, setTexto] = useState("");
  const caixa = useRef<HTMLDivElement>(null);
  const atual = CANAIS.find((c) => c.id === canal)!;
  const lista = msgs[canal] ?? [];

  useEffect(() => {
    const el = caixa.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lista.length, canal]);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setMsgs((m) => ({
      ...m,
      [canal]: [...(m[canal] ?? []), { id: `${canal}-eu-${(m[canal] ?? []).length}`, ini: iniciais, nome, t, quando: "agora", eu: true }],
    }));
    setTexto("");
  }

  return (
    <div className={ui.page}>
      <div className={s.layout}>
        <nav className={s.channels} aria-label="Canais">
          <span className={s.chTitle}>Canais</span>
          {CANAIS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={s.ch}
              aria-current={canal === c.id}
              onClick={() => setCanal(c.id)}
            >
              <span>
                <i>#</i> {c.nome}
              </span>
              {c.novas > 0 && canal !== c.id && <b>{c.novas}</b>}
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

          <div className={s.msgs} ref={caixa}>
            {lista.length === 0 ? (
              <p className={s.vazio}>Ninguém falou aqui ainda. Puxa o assunto.</p>
            ) : (
              lista.map((m) => (
                <div key={m.id} className={`${s.msg} ${m.eu ? s.eu : ""}`}>
                  <span className={ui.ini}>{m.ini}</span>
                  <div className={s.bubble}>
                    <div className={s.meta}>
                      <b>{m.eu ? "Você" : m.nome}</b>
                      <small>{m.quando}</small>
                    </div>
                    <p>{m.t}</p>
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
            />
            <button type="submit" className={s.send} aria-label="Enviar" disabled={!texto.trim()}>
              <Icon name="send" />
            </button>
          </form>
        </section>

        <aside className={s.side}>
          <section className={ui.card}>
            <div className={ui.rowBetween}>
              <h2 className={ui.h2}>Online agora</h2>
              <span className={`${ui.badge} ${ui.badgeOk}`}>● 214</span>
            </div>
            <div className={s.online}>
              {ONLINE.map((o) => (
                <span key={o} className={ui.ini}>
                  {o}
                </span>
              ))}
              <span className={ui.ini}>+</span>
            </div>
          </section>
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

      <p className={ui.note}>Mensagens desta tela são exemplos e não ficam salvas. Para chat real, use Supabase Realtime numa tabela de mensagens.</p>
    </div>
  );
}
