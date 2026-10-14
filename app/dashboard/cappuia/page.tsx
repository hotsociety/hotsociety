"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Icon from "../../_components/membros/Icon";
import { useMembro } from "../../_components/membros/MemberContext";
import { IA_MODOS, IA_RESPOSTA, IA_SUGESTOES } from "../../_lib/demo";
import "../../_components/membros/ui.css";
import ui from "../../_components/membros/ui.styles";
import "./cappuia.css";
import s from "./cappuia.styles";

type Modo = (typeof IA_MODOS)[number]["id"];
type Fala = { id: number; de: "eu" | "ia"; t: string };

const LIMITE = 100;

export default function CappuIA() {
  const { nome } = useMembro();
  const [modo, setModo] = useState<Modo>("tutor");
  const [falas, setFalas] = useState<Fala[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [usados, setUsados] = useState(28);
  const caixa = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = caixa.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [falas.length, pensando]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function perguntar(t: string) {
    const q = t.trim();
    if (!q || pensando || usados >= LIMITE) return;
    setFalas((f) => [...f, { id: f.length, de: "eu", t: q }]);
    setTexto("");
    setPensando(true);
    setUsados((u) => u + 1);
    // DEMO: troque por uma chamada à sua rota de IA (ex.: /api/cappuia).
    timer.current = setTimeout(() => {
      setFalas((f) => [...f, { id: f.length, de: "ia", t: IA_RESPOSTA }]);
      setPensando(false);
    }, 900);
  }

  const modoAtual = IA_MODOS.find((m) => m.id === modo)!;

  return (
    <div className={ui.page}>
      <header className={ui.head}>
        <p className={ui.eyebrow}>Assistente</p>
        <h1 className={ui.h1}>
          Cappu<span className={ui.gold}>IA.</span>
        </h1>
        <p className={ui.sub}>Treinada no método HOT. Tira dúvida das aulas e aponta onde está a resposta.</p>
      </header>

      <div className={s.layout}>
        <aside className={s.side}>
          <div className={s.modes} role="radiogroup" aria-label="Modo da CappuIA">
            {IA_MODOS.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={modo === m.id}
                className={s.mode}
                onClick={() => setModo(m.id)}
              >
                <b>{m.t}</b>
                <small>{m.d}</small>
              </button>
            ))}
          </div>
          <div className={`${ui.card} ${s.credits}`}>
            <div className={ui.rowBetween}>
              <h2 className={ui.h2}>Créditos do mês</h2>
              <span className={s.creditN}>
                {usados}/{LIMITE}
              </span>
            </div>
            <div className={ui.bar}>
              <i style={{ width: `${(usados / LIMITE) * 100}%` }} />
            </div>
          </div>
        </aside>

        <section className={s.chat} aria-label="Conversa com a CappuIA">
          <div className={s.chatHead}>
            <Image src="/brand/hs-simbolo.svg" alt="" width={34} height={34} />
            <div>
              <b>CappuIA · {modoAtual.t}</b>
              <small>Respostas com referência da aula</small>
            </div>
          </div>

          <div className={s.msgs} ref={caixa}>
            {falas.length === 0 && (
              <div className={s.welcome}>
                <b>E aí, {nome}. Manda a dúvida.</b>
                <p>Escolha uma sugestão ou escreva do seu jeito.</p>
                <div className={s.sugs}>
                  {IA_SUGESTOES[modo].map((q) => (
                    <button key={q} type="button" className={s.sug} onClick={() => perguntar(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {falas.map((f) => (
              <div key={f.id} className={f.de === "eu" ? s.me : s.ia}>
                {f.t}
              </div>
            ))}
            {pensando && (
              <div className={`${s.ia} ${s.typing}`} aria-live="polite">
                <i />
                <i />
                <i />
                <span className="sr-only">CappuIA está digitando</span>
              </div>
            )}
          </div>

          <form
            className={s.composer}
            onSubmit={(e) => {
              e.preventDefault();
              perguntar(texto);
            }}
          >
            <label htmlFor="pergunta" className="sr-only">
              Pergunta
            </label>
            <textarea
              id="pergunta"
              className={`${ui.input} ${s.ta}`}
              rows={1}
              placeholder="Pergunte à CappuIA…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  perguntar(texto);
                }
              }}
            />
            <button type="submit" className={s.send} aria-label="Enviar" disabled={!texto.trim() || pensando}>
              <Icon name="send" />
            </button>
          </form>
        </section>
      </div>

      <p className={ui.note}>
        Demonstração: as respostas são exemplos fixos. A CappuIA não cria imagens de pessoas reais nem conteúdo com aparência
        de menor de idade.
      </p>
    </div>
  );
}
