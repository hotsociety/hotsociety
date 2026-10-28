"use client";

import { useCallback, useEffect, useState } from "react";
import Conversa, { STATUS_CHAMADO, corStatus, type ChamadoResumo } from "../../_components/membros/Chamado";
import { postApi } from "../../_lib/api";
import { SITE } from "../../_lib/site";
import { AJUDA_FAQ, AJUDA_TEMAS } from "../../_lib/demo";
import { supabase } from "../../_lib/supabase";
import "../../_components/membros/ui.css";
import ui from "../../_components/membros/ui.styles";
import "./suporte.css";
import s from "./suporte.styles";

const DATA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });

export default function Suporte() {
  const [tema, setTema] = useState(AJUDA_TEMAS[0].t);
  const [assunto, setAssunto] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [lista, setLista] = useState<ChamadoResumo[] | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc("meus_chamados");
    setLista(error ? [] : ((data ?? []) as ChamadoResumo[]));
  }, []);

  useEffect(() => {
    carregar();
    // /dashboard/suporte?tema=... (links de outras telas)
    const t = new URLSearchParams(window.location.search).get("tema");
    if (t && AJUDA_TEMAS.some((x) => x.t === t)) setTema(t);
  }, [carregar]);

  async function abrir(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (assunto.trim().length < 3 || texto.trim().length < 5) return setErro("Preencha o assunto e conte o que aconteceu.");
    setEnviando(true);
    const r = await postApi<{ protocolo: string }>("/api/suporte", { acao: "abrir", tema, assunto: assunto.trim(), texto: texto.trim() });
    setEnviando(false);
    if (r.erro) return setErro(r.erro);
    setProtocolo(r.protocolo);
    setAssunto("");
    setTexto("");
    carregar();
  }

  return (
    <div className={ui.page}>
      <header className={ui.head}>
        <p className={ui.eyebrow}>Suporte</p>
        <h1 className={ui.h1}>
          Torre de <span className={ui.gold}>controle.</span>
        </h1>
        <p className={ui.sub}>Resposta humana de segunda a sábado, das 9h às 22h.</p>
      </header>

      <div className={ui.grid4}>
        {AJUDA_TEMAS.map((t) => (
          <button
            key={t.n}
            type="button"
            className={s.topic}
            aria-pressed={tema === t.t}
            onClick={() => {
              setTema(t.t);
              setProtocolo(null);
            }}
          >
            <span className={s.n}>{t.n}</span>
            <b>{t.t}</b>
            <small>{t.d}</small>
          </button>
        ))}
      </div>

      <div className={ui.gridMain}>
        <div className={ui.page}>
          <section className={ui.card} aria-labelledby="faq">
            <h2 id="faq" className={ui.h2}>
              Mais perguntadas
            </h2>
            <div className={s.faq}>
              {AJUDA_FAQ.map((f) => (
                <details key={f.q} className={s.item}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className={ui.card} aria-labelledby="novo">
            <h2 id="novo" className={ui.h2}>
              Abrir chamado · {tema}
            </h2>
            {protocolo ? (
              <div style={{ display: "grid", gap: 12 }}>
                <p className={ui.okBox} role="status">
                  Chamado aberto. Protocolo <b>{protocolo}</b>. A resposta aparece aqui ao lado e chega no seu e-mail.
                </p>
                <button type="button" className={ui.btnGhost} onClick={() => setProtocolo(null)}>
                  Abrir outro chamado
                </button>
              </div>
            ) : (
              <form className={s.form} onSubmit={abrir}>
                <label className={ui.field}>
                  <span>Assunto</span>
                  <input className={ui.input} required minLength={3} maxLength={120} value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Resuma em poucas palavras" />
                </label>
                <label className={ui.field}>
                  <span>Detalhes</span>
                  <textarea
                    className={ui.input}
                    required
                    minLength={5}
                    maxLength={4000}
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder="O que aconteceu? Se puder, diga o módulo e a aula."
                  />
                </label>
                {erro && (
                  <p className={ui.muted} role="alert" style={{ color: "var(--erro-t)", margin: 0 }}>
                    {erro}
                  </p>
                )}
                <button type="submit" className={ui.btnGold} disabled={enviando}>
                  {enviando ? "Enviando…" : "Enviar chamado"}
                </button>
                <p className={ui.small}>Não escreva senhas nem dados de cartão no chamado.</p>
              </form>
            )}
          </section>
        </div>

        <div className={ui.page}>
          <section className={ui.card} aria-labelledby="chamados">
            <h2 id="chamados" className={ui.h2}>
              Seus chamados
            </h2>
            {lista === null ? (
              <p className={ui.muted}>Carregando…</p>
            ) : lista.length === 0 ? (
              <p className={ui.muted}>Você ainda não abriu nenhum chamado.</p>
            ) : (
              <ul className={ui.list}>
                {lista.map((c) => (
                  <li key={c.id}>
                    <button type="button" className={ui.row} style={{ width: "100%", textAlign: "left", cursor: "pointer", background: "none", color: "inherit", font: "inherit" }} onClick={() => setAberto(c.id)}>
                      <span className={ui.rowMain}>
                        <b>{c.assunto}</b>
                        <small>
                          {c.protocolo} · {DATA.format(new Date(c.atualizado_em))}
                        </small>
                      </span>
                      <span className={`${ui.badge} ${corStatus(c.status)}`}>{STATUS_CHAMADO[c.status] ?? c.status}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`${ui.card} ${ui.cardGold}`}>
            <h2 className={ui.h2}>Falar com um humano</h2>
            <p className={ui.muted}>Respondemos todo chamado em até 5 dias, normalmente bem antes. Se preferir, escreva direto para o e-mail:</p>
            <a href={`mailto:${SITE.supportEmail}`} className={ui.btnGhost}>
              {SITE.supportEmail}
            </a>
          </section>
        </div>
      </div>

      {aberto && <Conversa id={aberto} onClose={() => setAberto(null)} onMudou={carregar} />}
    </div>
  );
}
