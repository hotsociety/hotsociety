"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import Icon from "../../_components/membros/Icon";
import { MODULOS, type Modulo } from "../../_lib/demo";
import ui from "../../_components/membros/ui.module.css";
import s from "./aulas.module.css";

type Filtro = "todos" | "meus" | "travados";

const SELO: Record<Modulo["status"], { t: string; cls: string }> = {
  andamento: { t: "Em andamento", cls: ui.badgeGold },
  feito: { t: "Concluído", cls: ui.badgeOk },
  novo: { t: "Novo", cls: "" },
  bloqueado: { t: "Bloqueado", cls: ui.badgeRed },
};

export default function Aulas() {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const lista = MODULOS.filter((m) =>
    filtro === "todos" ? true : filtro === "meus" ? m.status !== "bloqueado" : m.status === "bloqueado",
  );
  const total = MODULOS.reduce((t, m) => t + m.aulas.length, 0);
  const feitas = MODULOS.reduce((t, m) => t + m.feitas, 0);

  return (
    <div className={ui.page}>
      <header className={ui.head}>
        <p className={ui.eyebrow}>Hot Academy</p>
        <h1 className={ui.h1}>
          Suas <span className={ui.gold}>aulas.</span>
        </h1>
        <p className={ui.sub}>
          {feitas} de {total} aulas concluídas. Cada módulo libera uma escala da sua rota.
        </p>
      </header>

      <div className={ui.tabs} role="group" aria-label="Filtrar módulos">
        {(
          [
            ["todos", "Todos"],
            ["meus", "Liberados"],
            ["travados", "Para destravar"],
          ] as const
        ).map(([id, t]) => (
          <button key={id} type="button" className={ui.tab} aria-pressed={filtro === id} onClick={() => setFiltro(id)}>
            {t}
          </button>
        ))}
      </div>

      <div className={s.grid}>
        {lista.map((m) => {
          const pct = Math.round((m.feitas / m.aulas.length) * 100);
          const travado = m.status === "bloqueado";
          const conteudo = (
            <>
              <span className={s.cover}>
                <Image src={m.img} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                <span className={s.num}>{m.n}</span>
                <span className={`${ui.badge} ${SELO[m.status].cls} ${s.selo}`}>
                  {travado && <Icon name="lock" size={12} />} {SELO[m.status].t}
                </span>
              </span>
              <span className={s.body}>
                <small className={s.stop}>
                  Mod {m.n} · {m.stop}
                </small>
                <b className={s.title}>{m.t}</b>
                <span className={s.desc}>{travado ? m.trava : m.desc}</span>
                <span className={s.meta}>
                  <span>
                    {m.feitas}/{m.aulas.length} aulas
                  </span>
                  <span>{pct}%</span>
                </span>
                <span className={ui.bar}>
                  <i style={{ width: `${pct}%` }} />
                </span>
              </span>
            </>
          );
          return travado ? (
            <div key={m.slug} className={`${s.card} ${s.locked}`} aria-disabled="true">
              {conteudo}
            </div>
          ) : (
            <Link key={m.slug} href={`/dashboard/aulas/${m.slug}`} className={s.card}>
              {conteudo}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
