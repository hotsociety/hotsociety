"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import Esteira from "../../_components/membros/Esteira";
import { m } from "../../_components/membros/proto";
import { type Modulo } from "../../_lib/demo";
import { moduloAtual, proximaAula } from "../../_lib/progresso";
import Vitrine from "./Vitrine";
import { capaDoVideo } from "../../_lib/video";
import { useProgresso } from "../../_components/membros/Progresso";
import { useAulasInfo } from "../../_components/membros/useAulasInfo";

type Filtro = "all" | "own" | "lock";

const LOCK = (
  <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
    <path fill="currentColor" d="M3 5V3.5a3 3 0 0 1 6 0V5h1v6H2V5h1Zm1.5 0h3V3.5a1.5 1.5 0 0 0-3 0V5Z" />
  </svg>
);
const PLAY = (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M8 5v14l11-7z" />
  </svg>
);
export default function Modulos() {
  const { modulos: MODULOS, feitas } = useProgresso();
  const info = useAulasInfo();
  const [filtro, setFiltro] = useState<Filtro>("all");
  const detalhe = useRef<HTMLDivElement>(null);

  const atual = moduloAtual(MODULOS);
  const iProx = proximaAula(atual, feitas);
  const totalAulas = MODULOS.reduce((a, x) => a + x.aulas.length, 0);
  const totalFeitas = MODULOS.reduce((a, x) => a + x.feitas, 0);
  const pctCurso = Math.round((totalFeitas / Math.max(1, totalAulas)) * 100);

  const visiveis = MODULOS.map((x, i) => ({ mod: x, i })).filter(({ mod: x }) =>
    filtro === "own" ? x.status !== "bloqueado" : filtro === "lock" ? x.status === "bloqueado" : true,
  );
  // Módulo no centro da vitrine (índice dentro de `visiveis`). A vitrine segue a rolagem, então começa no primeiro.
  const [k, setK] = useState(0);
  const kOk = Math.min(k, Math.max(0, visiveis.length - 1));
  const mod = visiveis[kOk]?.mod ?? atual;
  const prox = proximaAula(mod, feitas);
  const travado = mod.status === "bloqueado";

  const hrefDe = (x: Modulo) => `/dashboard/aulas/${x.slug}${x.status === "feito" ? "" : `?aula=${proximaAula(x, feitas) + 1}`}`;
  const rotuloDe = (x: Modulo) => (x.feitas === 0 ? "Começar" : x.status === "feito" ? "Rever" : "Continuar");

  // Próximas aulas na ordem do curso, a partir de onde o aluno está (as já vistas ficam de fora).
  const continuar = useMemo(() => {
    const lista: { mod: Modulo; i: number }[] = [];
    for (const x of MODULOS) {
      if (x.status === "bloqueado") continue;
      x.aulas.forEach((a, i) => {
        if (!feitas.has(a.id)) lista.push({ mod: x, i });
      });
    }
    const ini = lista.findIndex((l) => l.mod.slug === atual.slug && l.i === iProx);
    return (ini > 0 ? lista.slice(ini) : lista).slice(0, 12);
  }, [MODULOS, feitas, atual, iProx]);

  return (
    <section className={m("view")} aria-label="Módulos">
      <div className={m("top")}>
        <div>
          <h1>Hot Academy</h1>
          <p className={m("sub")}>
            {MODULOS.length} módulos · {totalAulas} aulas · {pctCurso}% concluído
          </p>
        </div>
        <div className={m("row")}>
          <Link className={m("btn btn-p")} href={`/dashboard/aulas/${atual.slug}?aula=${iProx + 1}`}>
            ▶ {totalFeitas === 0 ? "Começar o curso" : `Continuar · Mod ${atual.n}, aula ${iProx + 1}`}
          </Link>
        <div className={m("seg")} role="group" aria-label="Filtro">
          {(
            [
              ["all", "Todos"],
              ["own", "Meus"],
              ["lock", "Para destravar"],
            ] as [Filtro, string][]
          ).map(([f, t]) => (
            <button
              key={f}
              type="button"
              aria-pressed={filtro === f}
              onClick={() => {
                setFiltro(f);
                setK(0);
              }}
            >
              {t}
            </button>
          ))}
        </div>
        </div>
      </div>

      {visiveis.length === 0 ? (
        <div className={m("card")}>
          <p className={m("sub")} style={{ margin: 0 }}>
            {filtro === "lock" ? "Nenhum módulo travado: você já tem acesso a todos." : "Nenhum módulo aqui."}
          </p>
        </div>
      ) : (
        <Vitrine
          itens={visiveis}
          ativo={kOk}
          onAtivo={setK}
          onVerAulas={() => detalhe.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          hrefDe={hrefDe}
          rotuloDe={rotuloDe}
        />
      )}

      {/* Aulas do módulo que está no centro da vitrine */}
      <div ref={detalhe} className={m("card") + " hs-mod-det"}>
        <div className={m("split")} style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>
            Mod {mod.n} · {mod.t}
          </h2>
          {travado ? (
            <Link className={m("btn btn-s")} href="/dashboard/jornada">
              Ver requisitos
            </Link>
          ) : (
            <Link className={m("btn btn-p")} href={hrefDe(mod)}>
              {rotuloDe(mod)}
            </Link>
          )}
        </div>
        <ol className={m("lessons")}>
          {mod.aulas.map((a, j) => {
            const estado = travado ? "lk" : feitas.has(a.id) ? "done" : j === prox && mod.status === "andamento" ? "cur" : "";
            const conteudo = (
              <>
                <span className={m("c")}>{estado === "done" ? "✓" : estado === "lk" ? LOCK : j + 1}</span>
                <span className={m("n")}>
                  {a.t}
                  {estado === "lk" && <small>{mod.trava}</small>}
                  {estado === "cur" && <small>Próxima aula</small>}
                </span>
                <span className={m("t")}>{travado ? "—" : (info?.get(a.id)?.duracao ?? "")}</span>
              </>
            );
            return (
              <li key={a.id} className={estado ? m(estado) : undefined}>
                {travado ? conteudo : <Link href={`/dashboard/aulas/${mod.slug}?aula=${j + 1}`}>{conteudo}</Link>}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Próximas aulas com a capa real do vídeo */}
      {continuar.length > 0 && (
        <Esteira titulo={totalFeitas === 0 ? "Comece por aqui" : "Continue assistindo"} sub={`${totalAulas - totalFeitas} aulas pela frente`} largo="aula">
          {continuar.map(({ mod: x, i }, n) => {
            const a = x.aulas[i];
            const dados = info?.get(a.id);
            const capa = capaDoVideo(dados?.video_url) ?? x.img;
            return (
              <Link key={a.id} className="hs-aula-c" href={`/dashboard/aulas/${x.slug}?aula=${i + 1}`}>
                <span className="cv" style={{ backgroundImage: `url(${capa})` }}>
                  {n === 0 && <span className="tag">Próxima</span>}
                  <span className="play">{PLAY}</span>
                  {dados?.duracao && <span className="dur">{dados.duracao}</span>}
                </span>
                <small>
                  Mod {x.n} · Aula {i + 1}
                </small>
                <b>{a.t}</b>
              </Link>
            );
          })}
        </Esteira>
      )}
    </section>
  );
}
