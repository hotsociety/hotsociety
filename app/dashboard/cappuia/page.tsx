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
type Fala = { id: number; de: "eu" | "ia"; t: string; erro?: boolean; hora: string };

// Ícone e chamada de cada modo.
const VISUAL: Record<Modo, { icon: "help" | "user" | "note" | "chat"; tit: string; sub: string }> = {
  tutor: { icon: "help", tit: "Manda a dúvida.", sub: "Respondo com base no método HOT e aponto a aula onde está a resposta." },
  persona: { icon: "user", tit: "Vamos montar sua modelo.", sub: "Nome, bio, estilo, nicho e rotina de postagem prontos para usar." },
  legendas: { icon: "note", tit: "Legenda pronta em segundos.", sub: "Diga o tipo de post e o objetivo. Eu escrevo as opções." },
  scripts: { icon: "chat", tit: "Conversas que convertem.", sub: "Mensagens para chat, objeções e upsell no tom certo." },
};
const HORA = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const agora = () => HORA.format(new Date());

export default function CappuIA() {
  const { nome } = useMembro();
  const [modo, setModo] = useState<Modo>("tutor");
  const [falas, setFalas] = useState<Fala[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [saldo, setSaldo] = useState<Saldo | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = campo.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [texto]);

  function copiar(t: string) {
    navigator.clipboard?.writeText(t).then(
      () => toast("Resposta copiada."),
      () => toast("Não deu para copiar."),
    );
  }

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
    const nova: Fala = { id: Date.now(), de: "eu", t: q, hora: agora() };
    const historico = [...falas.filter((f) => !f.erro), nova].map((f) => ({ de: f.de, t: f.t }));
    setFalas((f) => [...f, nova]);
    setTexto("");
    setPensando(true);
    const r = await perguntarCappuIA(modo, historico);
    setPensando(false);
    if (r.texto) {
      setFalas((f) => [...f, { id: Date.now() + 1, de: "ia", t: r.texto!, hora: agora() }]);
      setSaldo((s) => (s ? { ...s, usadas: s.usadas + 1 } : s));
    } else {
      setFalas((f) => [...f, { id: Date.now() + 1, de: "ia", t: r.erro ?? "Não consegui responder agora.", erro: true, hora: agora() }]);
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
                <span className="hs-ia-mic">
                  <Icon name={VISUAL[m.id].icon} size={18} />
                </span>
                <span className="hs-ia-mtx">
                  <b>{m.t}</b>
                  <small>{m.d}</small>
                </span>
              </button>
            ))}
          </div>
          <div className={s.credits}>
            <div className="hs-ia-anel" style={{ ["--p" as string]: saldo?.ilimitado ? 100 : Math.max(0, 100 - Math.min(100, (usados / limite) * 100)) }}>
              <span>{saldo?.ilimitado ? "∞" : saldo ? Math.max(0, limite - usados) : "…"}</span>
            </div>
            <div className="hs-ia-ctx">
              <b>Créditos do mês</b>
              <small>{saldo?.ilimitado ? "Equipe: sem limite." : saldo ? `${usados} de ${limite} usadas · renova dia 1º` : "Carregando…"}</small>
            </div>
          </div>
        </aside>

        <section className={s.chat} aria-label="Conversa com a CappuIA">
          <div className={s.chatHead}>
            <span className="hs-ia-avatar">
              <Image src="/brand/hs-simbolo.svg" alt="" width={34} height={34} />
              <i aria-hidden />
            </span>
            <div>
              <b>
                CappuIA <span className="hs-ia-chip">{modoAtual.t}</span>
              </b>
              <small>{pensando ? "digitando…" : "online · treinada no método HOT"}</small>
            </div>
            {falas.length > 0 && (
              <button type="button" className="hs-ia-nova" onClick={() => setFalas([])} disabled={pensando}>
                <Icon name="spark" size={15} /> Nova conversa
              </button>
            )}
          </div>

          <div className={s.msgs} ref={caixa}>
            {falas.length === 0 && (
              <div className={s.welcome}>
                <span className="hs-ia-orb" aria-hidden>
                  <Image src="/brand/hs-simbolo.svg" alt="" width={46} height={46} />
                </span>
                <p className="hs-ia-oi">E aí, {nome}.</p>
                <b>{VISUAL[modo].tit}</b>
                <p>{VISUAL[modo].sub}</p>
                <div className={s.sugs}>
                  {IA_SUGESTOES[modo].map((q) => (
                    <button key={q} type="button" className={s.sug} onClick={() => perguntar(q)}>
                      <Icon name={VISUAL[modo].icon} size={16} />
                      <span>{q}</span>
                      <Icon name="arrow" size={16} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {falas.map((f) =>
              f.de === "eu" ? (
                <div key={f.id} className="hs-ia-linha eu">
                  <div className={s.me}>{f.t}</div>
                  <time>{f.hora}</time>
                </div>
              ) : (
                <div key={f.id} className="hs-ia-linha">
                  <span className="hs-ia-mini" aria-hidden>
                    <Image src="/brand/hs-simbolo.svg" alt="" width={26} height={26} />
                  </span>
                  <div className="hs-ia-bolha">
                    <div className={s.ia + (f.erro ? " erro" : "")}>{f.erro ? f.t : <TextoIA t={f.t} />}</div>
                    <div className="hs-ia-acoes">
                      <time>{f.hora}</time>
                      {!f.erro && (
                        <button type="button" onClick={() => copiar(f.t)}>
                          <Icon name="copy" size={13} /> Copiar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ),
            )}
            {pensando && (
              <div className="hs-ia-linha">
                <span className="hs-ia-mini" aria-hidden>
                  <Image src="/brand/hs-simbolo.svg" alt="" width={26} height={26} />
                </span>
                <div className={`${s.ia} ${s.typing}`} aria-live="polite">
                  <i />
                  <i />
                  <i />
                  <span className="sr-only">CappuIA está digitando</span>
                </div>
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
            <div className="hs-ia-caixa">
              <label htmlFor="pergunta" className="sr-only">
                Pergunta
              </label>
              <textarea
                id="pergunta"
                ref={campo}
                className={s.ta}
                rows={1}
                placeholder={acabou ? "Perguntas do mês esgotadas. Voltam no dia 1º." : `Pergunte à CappuIA · modo ${modoAtual.t}…`}
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
            </div>
            <div className="hs-ia-dica">
              <span>Enter envia · Shift+Enter quebra linha</span>
              {texto.length > 1200 && <span>{texto.length}/1500</span>}
            </div>
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
