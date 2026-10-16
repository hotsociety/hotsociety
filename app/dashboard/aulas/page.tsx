"use client";

import Link from "next/link";
import { useState } from "react";
import { m } from "../../_components/membros/proto";
import { type Modulo } from "../../_lib/demo";
import { moduloAtual, proximaAula } from "../../_lib/progresso";
import { useProgresso } from "../../_components/membros/Progresso";

type Filtro = "all" | "own" | "lock";

const LOCK = (
  <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
    <path fill="currentColor" d="M3 5V3.5a3 3 0 0 1 6 0V5h1v6H2V5h1Zm1.5 0h3V3.5a1.5 1.5 0 0 0-3 0V5Z" />
  </svg>
);

// "Criando sua modelo IA" → grande "Criando", pequeno "sua modelo IA".
function Titulo({ t }: { t: string }) {
  const [a, ...resto] = t.split(" ");
  if (!resto.length) return <span className={m("stack")}><span>{a}</span></span>;
  const curto = resto.length === 1;
  return (
    <span className={m("stack")}>
      <span>{a}</span>
      <span className={curto ? undefined : m("s")}>{resto.join(" ")}</span>
    </span>
  );
}

function Selo({ mod }: { mod: Modulo }) {
  if (mod.status === "bloqueado")
    return (
      <span className={m("st tag")}>
        {LOCK} {mod.stop}
      </span>
    );
  if (mod.status === "feito") return <span className={m("st tag ok")}>✓ Feito</span>;
  if (mod.status === "novo") return <span className={m("st tag")}>Novo</span>;
  return (
    <span className={m("st tag")}>
      {mod.feitas}/{mod.aulas.length}
    </span>
  );
}

export default function Modulos() {
  const { modulos: MODULOS, feitas } = useProgresso();
  const [filtro, setFiltro] = useState<Filtro>("all");
  const [sel, setSel] = useState(() => Math.max(0, MODULOS.indexOf(moduloAtual(MODULOS))));
  const mod = MODULOS[sel];
  const prox = proximaAula(mod, feitas);
  const travado = mod.status === "bloqueado";

  const visiveis = MODULOS.map((x, i) => ({ x, i })).filter(({ x }) =>
    filtro === "own" ? x.status !== "bloqueado" : filtro === "lock" ? x.status === "bloqueado" : true,
  );

  return (
    <section className={m("view")} aria-label="Módulos">
      <div className={m("top")}>
        <div>
          <h1>Módulos</h1>
          <p className={m("sub")}>O que você adquiriu e o que ainda pode destravar.</p>
        </div>
        <div className={m("seg")} role="group" aria-label="Filtro">
          {(
            [
              ["all", "Todos"],
              ["own", "Meus"],
              ["lock", "Para destravar"],
            ] as [Filtro, string][]
          ).map(([k, t]) => (
            <button key={k} type="button" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className={m("posters")}>
        {visiveis.map(({ x, i }) => {
          const pct = Math.round((x.feitas / x.aulas.length) * 100);
          return (
            <button
              key={x.slug}
              type="button"
              className={m("mod" + (x.status === "bloqueado" ? " lock" : ""))}
              aria-pressed={sel === i}
              onClick={() => setSel(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={x.img} alt="" />
              <span className={m("no")}>
                MOD {x.n} · {x.stop}
              </span>
              <Selo mod={x} />
              <span className={m("in")}>
                <Titulo t={x.t} />
                <span className={m("rule")} />
                {x.status === "bloqueado" ? (
                  <span className={m("why")}>{x.trava}</span>
                ) : (
                  <span className={m("meta")}>
                    <span>{x.aulas.length} AULAS</span>
                    <span>{pct}%</span>
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className={m("card")}>
        <div className={m("split")} style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>
            Mod {mod.n} · {mod.t}
          </h2>
          {travado ? (
            <Link className={m("btn btn-s")} href="/dashboard/jornada">
              Ver requisitos
            </Link>
          ) : (
            <Link className={m("btn btn-p")} href={`/dashboard/aulas/${mod.slug}`}>
              {mod.feitas === 0 ? "Começar" : mod.status === "feito" ? "Rever" : "Continuar"}
            </Link>
          )}
        </div>
        <ol className={m("lessons")}>
          {mod.aulas.map((a, k) => {
            const estado = travado ? "lk" : feitas.has(a.id) ? "done" : k === prox && mod.status === "andamento" ? "cur" : "";
            const conteudo = (
              <>
                <span className={m("c")}>{estado === "done" ? "✓" : estado === "lk" ? LOCK : k + 1}</span>
                <span className={m("n")}>
                  {a.t}
                  {estado === "lk" && <small>{mod.trava}</small>}
                  {estado === "cur" && <small>Próxima aula</small>}
                </span>
                <span className={m("t")}>{travado ? "—" : a.dur}</span>
              </>
            );
            return (
              <li key={a.id} className={estado ? m(estado) : undefined}>
                {conteudo}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
