"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import Icon from "../../../_components/membros/Icon";
import { MODULOS } from "../../../_lib/demo";
import ui from "../../../_components/membros/ui.module.css";
import s from "../aulas.module.css";

export default function ModuloPage() {
  const { modulo } = useParams<{ modulo: string }>();
  const m = MODULOS.find((x) => x.slug === modulo);

  if (!m || m.status === "bloqueado") {
    return (
      <div className={ui.page}>
        <Link href="/dashboard/aulas" className={s.back}>
          <Icon name="back" size={16} /> Voltar às aulas
        </Link>
        <div className={ui.card}>
          <h1 className={ui.h1}>{m ? "Módulo bloqueado" : "Módulo não encontrado"}</h1>
          <p className={ui.muted}>{m?.trava ?? "Esse módulo não existe ou mudou de endereço."}</p>
        </div>
      </div>
    );
  }

  return <Player key={m.slug} slug={m.slug} />;
}

function Player({ slug }: { slug: string }) {
  const m = MODULOS.find((x) => x.slug === slug)!;
  const [atual, setAtual] = useState(Math.min(m.feitas, m.aulas.length - 1));
  const [feitas, setFeitas] = useState<string[]>(() => m.aulas.slice(0, m.feitas).map((a) => a.id));
  const aula = m.aulas[atual];
  const concluida = feitas.includes(aula.id);
  const pct = Math.round((feitas.length / m.aulas.length) * 100);

  function concluir() {
    setFeitas((f) => (f.includes(aula.id) ? f : [...f, aula.id]));
    if (atual < m.aulas.length - 1) setAtual(atual + 1);
  }

  return (
    <div className={ui.page}>
      <Link href="/dashboard/aulas" className={s.back}>
        <Icon name="back" size={16} /> Voltar às aulas
      </Link>

      <div className={ui.gridMain}>
        <div className={ui.page}>
          <div className={s.player}>
            <Image src={m.img} alt="" fill sizes="(max-width: 1024px) 100vw, 700px" />
            <button type="button" className={s.playBtn} aria-label={`Assistir ${aula.t}`}>
              <Icon name="play" size={30} />
            </button>
            <span className={s.playerInfo}>
              Aula {String(atual + 1).padStart(2, "0")} · {aula.dur}
            </span>
          </div>

          <header className={ui.head}>
            <p className={ui.eyebrow}>
              Mod {m.n} · {m.t}
            </p>
            <h1 className={ui.h1} style={{ fontSize: "clamp(24px, 4vw, 36px)" }}>
              {aula.t}
            </h1>
            <p className={ui.sub}>{m.desc}</p>
          </header>

          <div className={s.actions}>
            <button type="button" className={ui.btnGold} onClick={concluir} disabled={concluida && atual === m.aulas.length - 1}>
              <Icon name="check" size={18} /> {concluida ? "Aula concluída" : "Concluir aula"}
            </button>
            <Link href="/dashboard/cappuia" className={ui.btnGhost}>
              <Icon name="spark" size={18} /> Perguntar à CappuIA
            </Link>
          </div>

          <p className={ui.note}>
            O vídeo entra aqui. Coloque a URL de cada aula (Vimeo, Panda, YouTube não listado) no campo da aula quando a
            tabela de aulas existir no Supabase.
          </p>
        </div>

        <aside className={ui.card} aria-label="Aulas do módulo">
          <div className={ui.rowBetween}>
            <h2 className={ui.h2}>Aulas do módulo</h2>
            <span className={`${ui.badge} ${ui.badgeGold}`}>{pct}%</span>
          </div>
          <div className={ui.bar}>
            <i style={{ width: `${pct}%` }} />
          </div>
          <ol className={ui.list}>
            {m.aulas.map((a, i) => {
              const ok = feitas.includes(a.id);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    className={`${s.lesson} ${ok ? s.lessonDone : ""}`}
                    aria-current={i === atual}
                    onClick={() => setAtual(i)}
                  >
                    <span className={s.lessonN}>{ok ? <Icon name="check" size={14} /> : String(i + 1).padStart(2, "0")}</span>
                    <span className={ui.rowMain}>
                      <b>{a.t}</b>
                    </span>
                    <span className={s.dur}>{a.dur}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </div>
  );
}
