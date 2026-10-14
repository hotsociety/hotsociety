"use client";

import { useState } from "react";
import { useMembro } from "../../_components/membros/MemberContext";
import { ROUTE } from "../../_lib/site";
import { MEDALHAS, PERFIL_DEMO, RANKING } from "../../_lib/demo";
import "../../_components/membros/ui.css";
import ui from "../../_components/membros/ui.styles";
import "./conquistas.css";
import s from "./conquistas.styles";

const NUM = new Intl.NumberFormat("pt-BR");
const STATUS = { ok: "Conquistada", perto: "Falta pouco", futuro: "Bloqueada" } as const;

export default function Conquistas() {
  const { nome, iniciais } = useMembro();
  const [aba, setAba] = useState<"temporada" | "geral">("temporada");
  const p = PERFIL_DEMO;
  const pct = Math.round((p.xp / p.xpProx) * 100);
  const fator = aba === "geral" ? 3 : 1;
  const ganhas = MEDALHAS.filter((m) => m.status === "ok").length;

  return (
    <div className={ui.page}>
      <header className={ui.head}>
        <p className={ui.eyebrow}>Conquistas</p>
        <h1 className={ui.h1}>
          Medalhas e <span className={ui.gold}>ranking.</span>
        </h1>
      </header>

      <section className={`${ui.card} ${ui.cardGold} ${s.profile}`}>
        <span className={s.avatar}>{iniciais}</span>
        <div className={s.pInfo}>
          <b className={s.pName}>{nome}</b>
          <small>
            {ROUTE[p.stopAtual].country} · {ROUTE[p.stopAtual].code} · {ganhas} medalhas
          </small>
          <div className={ui.rowBetween}>
            <small>
              Nível {p.nivel} · faltam {NUM.format(p.xpProx - p.xp)} XP para o {p.nivel + 1}
            </small>
            <small className={s.xp}>{NUM.format(p.xp)} XP</small>
          </div>
          <div className={ui.bar}>
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>
      </section>

      <section className={ui.card} aria-labelledby="medalhas">
        <h2 id="medalhas" className={ui.h2}>
          Medalhas
        </h2>
        <ul className={s.medals}>
          {MEDALHAS.map((m) => (
            <li key={m.sigla} className={`${s.medal} ${s[m.status]}`}>
              <span className={s.coin}>{m.sigla}</span>
              <b>{m.t}</b>
              <small>{m.d}</small>
              <span className={`${ui.badge} ${m.status === "ok" ? ui.badgeOk : m.status === "perto" ? ui.badgeGold : ""}`}>
                {STATUS[m.status]}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={ui.card} aria-labelledby="rank">
        <div className={ui.rowBetween}>
          <h2 id="rank" className={ui.h2}>
            Ranking por XP
          </h2>
          <div className={ui.tabs} role="group" aria-label="Período do ranking">
            <button type="button" className={ui.tab} aria-pressed={aba === "temporada"} onClick={() => setAba("temporada")}>
              Temporada
            </button>
            <button type="button" className={ui.tab} aria-pressed={aba === "geral"} onClick={() => setAba("geral")}>
              Geral
            </button>
          </div>
        </div>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Membro</th>
                <th scope="col">País</th>
                <th scope="col" className={s.hideSm}>
                  Medalhas
                </th>
                <th scope="col" className={s.right}>
                  XP
                </th>
              </tr>
            </thead>
            <tbody>
              {RANKING.map((r) => (
                <tr key={r.pos}>
                  <td className={s.pos}>{String(r.pos).padStart(2, "0")}</td>
                  <td>{r.nome}</td>
                  <td>
                    <span className={ui.badge}>{r.stop}</span>
                  </td>
                  <td className={s.hideSm}>{r.medalhas}</td>
                  <td className={s.right}>{NUM.format(r.xp * fator)}</td>
                </tr>
              ))}
              <tr className={s.meRow}>
                <td className={s.pos}>14</td>
                <td>Você</td>
                <td>
                  <span className={ui.badge}>{ROUTE[p.stopAtual].code}</span>
                </td>
                <td className={s.hideSm}>{ganhas}</td>
                <td className={s.right}>{NUM.format(p.xp * fator)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
