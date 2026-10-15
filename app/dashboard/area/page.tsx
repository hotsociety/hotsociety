"use client";

import { useRouter } from "next/navigation";
import { toast } from "../../_components/membros/Toast";
import { m } from "../../_components/membros/proto";
import { IMG, MODULOS } from "../../_lib/demo";

type Card = {
  t: string;
  s: string;
  ir: string; // rota ou "hotphone"
  img?: string;
  gfx?: string;
  tag?: string;
  tagCor?: "ok" | "am";
  pct?: number;
  lock?: boolean;
};

const andamento = MODULOS.find((x) => x.status === "andamento") ?? MODULOS[0];
const proxima = andamento.aulas[Math.min(andamento.feitas, andamento.aulas.length - 1)];
const pctAcademy = Math.round(
  (MODULOS.reduce((a, x) => a + x.feitas, 0) / MODULOS.reduce((a, x) => a + x.aulas.length, 0)) * 100,
);

const LINHAS: { t: string; s: string; largo?: boolean; cards: Card[] }[] = [
  {
    t: "Meus produtos",
    s: "3 ativos",
    largo: true,
    cards: [
      { img: IMG.hero, t: "Hot Academy", s: `Curso completo · ${MODULOS.length} módulos`, tag: "Ativo", tagCor: "ok", ir: "/dashboard/aulas", pct: pctAcademy },
      { gfx: "H", t: "HOTPHONE", s: "CappuIA, Cofre e Feed no canto da tela", tag: "Ativo", tagCor: "ok", ir: "hotphone" },
      { img: IMG.cappu, t: "Comunidade", s: "Feed, canais e lives", tag: "Ativo", tagCor: "ok", ir: "/dashboard/feed" },
    ],
  },
  {
    t: "Hot Academy",
    s: `${MODULOS.length} módulos`,
    cards: MODULOS.map((x) => {
      const pct = Math.round((x.feitas / x.aulas.length) * 100);
      const lock = x.status === "bloqueado";
      return {
        img: x.img,
        t: x.t,
        s: `Módulo ${x.n} · ${x.aulas.length} aulas`,
        ir: lock ? "/dashboard/aulas" : `/dashboard/aulas/${x.slug}`,
        pct: lock ? undefined : pct,
        lock,
        tag: pct === 100 ? "Concluído" : pct > 0 ? "Em andamento" : undefined,
        tagCor: pct === 100 ? "ok" : "am",
      } satisfies Card;
    }),
  },
  {
    t: "Bônus da assinatura",
    s: "Liberados",
    cards: [
      { gfx: "100", t: "Pack de prompts", s: "Personas e cenários", ir: "/dashboard/ferramentas" },
      { gfx: "R$", t: "Planilha de operação", s: "Funil e metas", ir: "/dashboard/ferramentas" },
      { img: IMG.teleferico, t: "Lives gravadas", s: "12 encontros", ir: "/dashboard/feed" },
      { img: IMG.placas, t: "Guia das placas", s: "Como pedir sua placa", ir: "/dashboard/jornada" },
    ],
  },
  {
    t: "Libere mais",
    s: "Na Hot Store",
    cards: [
      { img: IMG.hero, t: "Mentoria High Ticket", s: "Acompanhamento com o Cappu", lock: true, ir: "/dashboard/store" },
      { gfx: "1:1", t: "Consultoria", s: "Uma call de 60 min", lock: true, ir: "/dashboard/store" },
      { img: IMG.m4, t: "Funis prontos", s: "Templates editáveis", lock: true, ir: "/dashboard/store" },
    ],
  },
];

export default function AreaDeMembros() {
  const router = useRouter();
  const ir = (destino: string) =>
    destino === "hotphone" ? toast("O HOTPHONE chega na próxima atualização") : router.push(destino);

  return (
    <section className={m("view")} aria-label="Área de Membros">
      <div className={m("top")}>
        <div>
          <h1>Área de Membros</h1>
          <p className={m("sub")}>Todos os seus produtos, aulas e bônus num lugar só.</p>
        </div>
        <div className={m("chips")}>
          <span className={m("chip")}>
            <i style={{ color: "var(--ok)" }}>●</i> Assinatura ativa
          </span>
        </div>
      </div>

      <div className={m("am-hero")} style={{ backgroundImage: `url(${andamento.img})` }}>
        <div className={m("in")}>
          <p className={m("eb")} style={{ color: "var(--red-t)" }}>
            Continue de onde parou
          </p>
          <h2 className={m("stack")}>
            <span className={m("s")}>
              Módulo {andamento.n} · Aula {andamento.feitas + 1}
            </span>
            <span>{proxima.t.split(" ").slice(0, -1).join(" ") || proxima.t}</span>
            {proxima.t.includes(" ") && <span style={{ color: "var(--red-t)" }}>{proxima.t.split(" ").slice(-1)}.</span>}
          </h2>
          <div className={m("pr")}>
            <div className={m("prog")}>
              <i style={{ width: `${Math.round((andamento.feitas / andamento.aulas.length) * 100)}%` }} />
            </div>
            {andamento.feitas} de {andamento.aulas.length} aulas
          </div>
          <div className={m("row")}>
            <button className={m("btn btn-p")} type="button" onClick={() => router.push(`/dashboard/aulas/${andamento.slug}`)}>
              Continuar aula
            </button>
            <button className={m("btn btn-s")} type="button" onClick={() => router.push("/dashboard/ferramentas")}>
              Prompts da aula
            </button>
          </div>
        </div>
      </div>

      {LINHAS.map((l) => (
        <div key={l.t} className={m("am-row")}>
          <h2>
            {l.t} <small>{l.s}</small>
          </h2>
          <div className={m("am-sc" + (l.largo ? " wide" : ""))}>
            {l.cards.map((c) => (
              <button
                key={c.t}
                type="button"
                className={m("am-c" + (c.lock ? " lock" : "") + (c.gfx ? " gfx" : ""))}
                style={c.img ? { backgroundImage: `url(${c.img})` } : undefined}
                onClick={() => ir(c.ir)}
              >
                {c.gfx && <span className={m("big")}>{c.gfx}</span>}
                {c.tag && <span className={m("tag tg " + (c.tagCor ?? ""))}>{c.tag}</span>}
                {c.lock && (
                  <span className={m("lk")} aria-hidden="true">
                    🔒
                  </span>
                )}
                <span className={m("in")}>
                  <b>{c.t}</b>
                  <small>{c.s}</small>
                  {c.pct !== undefined && (
                    <span className={m("prog")} style={{ display: "block" }}>
                      <i style={{ width: `${c.pct}%` }} />
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
