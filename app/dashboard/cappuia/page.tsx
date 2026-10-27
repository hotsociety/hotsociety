"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Icon from "../../_components/membros/Icon";
import { useMembro } from "../../_components/membros/MemberContext";
import { IA_MODOS, IA_SUGESTOES } from "../../_lib/demo";
import { perguntarCappuIA, saldoCappuIA, TextoIA, type Saldo } from "../../_components/membros/cappuia";
import { toast } from "../../_components/membros/Toast";
import "../../_components/membros/ui.css";
import ui from "../../_components/membros/ui.styles";
import "./cappuia.css";
import s from "./cappuia.styles";

type Modo = (typeof IA_MODOS)[number]["id"];
type Fala = { id: number; de: "eu" | "ia"; t: string; erro?: boolean };

export default function CappuIA() {
  const { nome } = useMembro();
  const [modo, setModo] = useState<Modo>("tutor");
  const [falas, setFalas] = useState<Fala[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [saldo, setSaldo] = useState<Saldo | null>(null);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saldoCappuIA().then(setSaldo);
  }, []);

  useEffect(() => {
    const el = caixa.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [falas.length, pensando]);

  const limite = saldo?.limite ?? 100;
  const usados = saldo?.usadas ?? 0;
  const acabou = !!saldo && !saldo.ilimitado && usados >= limite;

  async function perguntar(t: string) {
    const q = t.trim();
    if (!q || pensando) return;
    if (acabou) return toast("Você usou as perguntas deste mês. Elas voltam no dia 1º.");
    const nova: Fala = { id: Date.now(), de: "eu", t: q };
    const historico = [...falas.filter((f) => !f.erro), nova].map((f) => ({ de: f.de, t: f.t }));
    setFalas((f) => [...f, nova]);
    setTexto("");
    setPensando(true);
    const r = await perguntarCappuIA(modo, historico);
    setPensando(false);
    if (r.texto) {
      setFalas((f) => [...f, { id: Date.now() + 1, de: "ia", t: r.texto! }]);
      setSaldo((s) => (s ? { ...s, usadas: s.usadas + 1 } : s));
    } else {
      setFalas((f) => [...f, { id: Date.now() + 1, de: "ia", t: r.erro ?? "Não consegui responder agora.", erro: true }]);
    }
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
              <span className={s.creditN}>{saldo?.ilimitado ? "∞" : saldo ? `${usados}/${limite}` : "…"}</span>
            </div>
            <div className={ui.bar}>
              <i style={{ width: saldo?.ilimitado ? "100%" : `${Math.min(100, (usados / limite) * 100)}%` }} />
            </div>
            <small style={{ color: "var(--muted)", fontSize: 11.5 }}>
              {saldo?.ilimitado ? "Equipe: sem limite." : `${Math.max(0, limite - usados)} perguntas restantes. Renova todo dia 1º.`}
            </small>
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
              <div key={f.id} className={f.de === "eu" ? s.me : s.ia} style={f.erro ? { borderColor: "rgba(239,68,68,.45)", color: "#fca5a5" } : undefined}>
                {f.de === "ia" && !f.erro ? <TextoIA t={f.t} /> : f.t}
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
              placeholder={acabou ? "Perguntas do mês esgotadas. Voltam no dia 1º." : "Pergunte à CappuIA…"}
              maxLength={1500}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  perguntar(texto);
                }
              }}
            />
            <button type="submit" className={s.send} aria-label="Enviar" disabled={!texto.trim() || pensando || acabou}>
              <Icon name="send" />
            </button>
          </form>
        </section>
      </div>

      <p className={ui.note}>
        A CappuIA usa inteligência artificial e pode errar: confira o que for importante na aula indicada. Não escreva dados
        pessoais (CPF, senha, cartão) na conversa. Ela não cria conteúdo explícito, imagens de pessoas reais nem nada com
        aparência de menor de idade.
      </p>
    </div>
  );
}
