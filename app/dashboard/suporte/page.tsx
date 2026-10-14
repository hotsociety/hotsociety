"use client";

import { useState } from "react";
import { SITE } from "../../_lib/site";
import { AJUDA_FAQ, AJUDA_TEMAS, CHAMADOS } from "../../_lib/demo";
import ui from "../../_components/membros/ui.module.css";
import s from "./suporte.module.css";

export default function Suporte() {
  const [tema, setTema] = useState(AJUDA_TEMAS[0].t);
  const [enviado, setEnviado] = useState(false);

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
              setEnviado(false);
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
            {enviado ? (
              <p className={ui.okBox}>Chamado aberto. Você recebe a resposta aqui e no seu e-mail.</p>
            ) : (
              <form
                className={s.form}
                onSubmit={(e) => {
                  e.preventDefault();
                  setEnviado(true);
                }}
              >
                <label className={ui.field}>
                  <span>Assunto</span>
                  <input className={ui.input} required placeholder="Resuma em poucas palavras" />
                </label>
                <label className={ui.field}>
                  <span>Detalhes</span>
                  <textarea className={ui.input} required placeholder="O que aconteceu? Se puder, diga o módulo e a aula." />
                </label>
                <button type="submit" className={ui.btnGold}>
                  Enviar chamado
                </button>
              </form>
            )}
          </section>
        </div>

        <div className={ui.page}>
          <section className={ui.card} aria-labelledby="chamados">
            <h2 id="chamados" className={ui.h2}>
              Seus chamados
            </h2>
            <ul className={ui.list}>
              {CHAMADOS.map((c) => (
                <li key={c.id} className={ui.row}>
                  <span className={ui.rowMain}>
                    <b>{c.t}</b>
                    <small>
                      {c.id} · {c.quando}
                    </small>
                  </span>
                  <span className={`${ui.badge} ${c.status === "Resolvido" ? ui.badgeOk : ui.badgeGold}`}>{c.status}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${ui.card} ${ui.cardGold}`}>
            <h2 className={ui.h2}>Falar com um humano</h2>
            <p className={ui.muted}>Tempo médio de resposta hoje: 38 min.</p>
            <a href={`mailto:${SITE.supportEmail}`} className={ui.btnGhost}>
              {SITE.supportEmail}
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
