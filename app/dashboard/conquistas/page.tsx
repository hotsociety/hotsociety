"use client";

import { useProgresso } from "../../_components/membros/Progresso";
import { useEffect, useState } from "react";
import type { Medalha } from "../../_lib/demo";
import RankingTemporada from "../../_components/membros/ranking/RankingTemporada";
import VitrineInsignias, { useMinhasInsignias } from "../../_components/membros/insignias/Vitrine";
import { InsigniasNome } from "../../_components/membros/insignias/Insignia";
import { destaque } from "../../_lib/insignias";
import { useMembro } from "../../_components/membros/MemberContext";
import { ROUTE } from "../../_lib/site";
import "../../_components/membros/ui.css";
import ui from "../../_components/membros/ui.styles";
import "./conquistas.css";
import "../inicio.css";
import s from "./conquistas.styles";

const NUM = new Intl.NumberFormat("pt-BR");
const STATUS = { ok: "Conquistada", perto: "Falta pouco", futuro: "Bloqueada" } as const;

export default function Conquistas() {
  const { nome, iniciais, user } = useMembro();
  const [dias, setDias] = useState<number | null>(null);
  useEffect(() => {
    const t = new Date(user.created_at).getTime();
    setDias(Number.isFinite(t) ? Math.max(0, Math.floor((Date.now() - t) / 86400000)) : 0);
  }, [user.created_at]);
  const { perfil, nivel, xpProx } = useProgresso();
  const p = { ...perfil, nivel, xpProx };
  const pct = Math.round((p.xp / p.xpProx) * 100);
  const ins = useMinhasInsignias({ stop: p.stopAtual, faturado: p.faturado, missoes: 0 });
  const MEDALHAS = medalhas(dias ?? 0, p.faturado, ins.medalhas ?? []);
  const ganhas = MEDALHAS.filter((m) => m.status === "ok").length;

  return (
    <div className={ui.page}>
      <header className={ui.head}>
        <p className={ui.eyebrow}>Ranking</p>
        <h1 className={ui.h1}>
          Quem lidera a <span className={ui.gold}>temporada.</span>
        </h1>
      </header>

      <RankingTemporada />

      <section className={`${ui.card} ${ui.cardGold} ${s.profile}`}>
        <span className={s.avatar}>{iniciais}</span>
        <div className={s.pInfo}>
          <b className={s.pName}>
            {nome}
            <InsigniasNome ids={destaque(ins)} tamanho={18} />
          </b>
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

      <section className={ui.card} aria-labelledby="insignias">
        <h2 id="insignias" className={ui.h2}>
          Insígnias
        </h2>
        <VitrineInsignias m={ins} />
      </section>

      <section className={ui.card} aria-labelledby="medalhas">
        <h2 id="medalhas" className={ui.h2}>
          Medalhas
        </h2>
        <ul className={s.medals}>
          {MEDALHAS.map((m) => (
            <li key={m.sigla} className={`${s.medal} ${s[m.status]}`}>
              <span className="hs-moeda" aria-hidden>
                <span className="hs-moeda-face">
                  <i>HSC</i>
                  <b className={m.sigla.length >= 4 ? "lg" : undefined}>{m.sigla}</b>
                </span>
              </span>
              <code className="hs-moeda-tk">$HS{m.sigla.replace("ª", "V")}</code>
              <b>{m.t}</b>
              <small>{m.d}</small>
              <span className={`${ui.badge} ${m.status === "ok" ? ui.badgeOk : m.status === "perto" ? ui.badgeGold : ""}`}>
                {STATUS[m.status]}
              </span>
            </li>
          ))}
        </ul>
      </section>

    </div>
  );
}

// Medalhas calculadas com os dados reais do aluno.
function medalhas(dias: number, faturado: number, concedidas: string[]): Medalha[] {
  const tempo = (d: number, sigla: string, t: string, extra?: string): Medalha => ({
    sigla,
    t,
    d: dias >= d ? extra ?? "Tempo de Society" : `Faltam ${d - dias} dias`,
    status: dias >= d ? "ok" : d - dias <= 7 ? "perto" : "futuro",
  });
  const meta = (m: number, sigla: string, t: string): Medalha => ({
    sigla,
    t,
    d: "Placa física",
    status: faturado >= m ? "ok" : faturado >= m * 0.7 ? "perto" : "futuro",
  });
  const lista: Medalha[] = [
    tempo(30, "1M", "1 mês"),
    tempo(90, "3M", "3 meses"),
    tempo(180, "6M", "6 meses"),
    tempo(365, "1A", "1 ano", "Ganha o moletom"),
    { sigla: "1ª", t: "Primeira venda", d: faturado > 0 ? "Verificada" : "Registre seu primeiro faturamento", status: faturado > 0 ? "ok" : "futuro" },
    meta(10000, "10K", "R$ 10 mil"),
    meta(50000, "50K", "R$ 50 mil"),
    meta(100000, "100K", "R$ 100 mil"),
  ];
  // Concedidas à mão contam como conquistadas.
  return lista.map((m): Medalha => (concedidas.includes(m.sigla) && m.status !== "ok" ? { ...m, status: "ok", d: "Concedida pela equipe" } : m));
}
