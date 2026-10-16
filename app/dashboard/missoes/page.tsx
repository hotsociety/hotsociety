"use client";

import { useState } from "react";
import { useMembro } from "../../_components/membros/MemberContext";
import { toast } from "../../_components/membros/Toast";
import { m } from "../../_components/membros/proto";
import { useProgresso } from "../../_components/membros/Progresso";
import { missoesDoAluno } from "../../_lib/progresso";
import { ROUTE } from "../../_lib/site";
import { IMG, MISSOES_PLANO, type MissaoPlano } from "./dados";

type Aba = "d" | "s" | "m";
const ABAS: [Aba, string][] = [
  ["d", "Diárias"],
  ["s", "Semanais"],
  ["m", "Desafio do mês"],
];

export default function Missoes() {
  const { nome } = useMembro();
  const primeiro = nome.split(/\s+/)[0];
  const [aba, setAba] = useState<Aba>("d");
  const { perfil, avancos, avancarMissao } = useProgresso();
  const lista = missoesDoAluno(MISSOES_PLANO, avancos);
  const xp = perfil.xp;
  const ROUTE_ATUAL = (ROUTE[perfil.stopAtual] ?? ROUTE[0]).country;
  const [salvando, setSalvando] = useState<string | null>(null);

  async function avancar(i: number) {
    const mi = lista[aba][i];
    if (salvando) return;
    setSalvando(mi.id);
    try {
      const r = await avancarMissao(mi.id);
      if (r.concluiu) toast(`+${mi.xp} XP · missão concluída`, true);
    } catch {
      toast("Não deu para salvar agora. Tente de novo.");
    } finally {
      setSalvando(null);
    }
  }

  return (
    <section className={m("view")} aria-label="Missões">
      <div className={m("top")}>
        <div>
          <h1>Missões</h1>
          <p className={m("sub")}>Montadas para o seu momento: {ROUTE_ATUAL} · Modelo IA.</p>
        </div>
        <div className={m("chips")}>
          <span className={m("chip fire")}>
            <i>{perfil.streak}</i> dias seguidos
          </span>
          <span className={m("chip gold")}>
            <i className={m("num")}>{xp.toLocaleString("pt-BR")}</i> XP
          </span>
        </div>
      </div>

      <div className={m("coach")}>
        <span className={m("av")} style={{ backgroundImage: `url(${IMG.cappu})` }} />
        <div>
          <p className={m("eb")}>Recado do Cappu para você</p>
          <p>
            {primeiro}, você já tem a página pronta. O que falta para o Chile é a primeira venda. Esta semana o foco é{" "}
            <b>tráfego orgânico + conversa</b>. Fiz as missões em cima disso.
          </p>
        </div>
      </div>

      <div className={m("split")}>
        <div className={m("seg")} role="group" aria-label="Tipo de missão">
          {ABAS.map(([k, t]) => (
            <button key={k} type="button" aria-pressed={aba === k} onClick={() => setAba(k)}>
              {t}
            </button>
          ))}
        </div>
        <span className={m("mono")} style={{ fontSize: 12, color: "var(--muted)" }}>
          Diárias renovam às 00h
        </span>
      </div>

      <div className={m("mlist")}>
        {lista[aba].map((mi, i) => (
          <Item key={mi.id} mi={mi} onAvancar={() => avancar(i)} />
        ))}
      </div>
    </section>
  );
}

function Item({ mi, onAvancar }: { mi: MissaoPlano; onAvancar: () => void }) {
  const feita = mi.feito >= mi.total;
  const pct = Math.round((mi.feito / mi.total) * 100);
  return (
    <div className={m("mi" + (feita ? " done" : "") + (mi.porque ? " why" : ""))}>
      <span className={m("ic")}>{feita ? "✓" : mi.id}</span>
      <div>
        <b>{mi.t}</b>
        <small>{mi.meta}</small>
        {mi.porque && <small style={{ display: "block", color: "var(--red-t)", marginTop: 2 }}>{mi.porque}</small>}
        <div className={m("pg")}>
          <div className={m("prog")}>
            <i style={{ width: `${pct}%` }} />
          </div>
          <span>
            {mi.feito} de {mi.total}
          </span>
        </div>
      </div>
      <div className={m("rw")}>
        <span className={m("xp")}>+{mi.xp} XP</span>
        {feita ? (
          <span className={m("tag ok")}>Feita</span>
        ) : (
          <button className={m("btn btn-s")} style={{ minHeight: 36 }} type="button" onClick={onAvancar}>
            Registrar avanço
          </button>
        )}
      </div>
    </div>
  );
}
