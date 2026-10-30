"use client";

import Link from "next/link";
import { useRef } from "react";
import { abrirHotphone } from "../../_components/membros/hotphone/HotPhone";
import { IMG, type Modulo } from "../../_lib/demo";
import { moduloAtual, proximaAula } from "../../_lib/progresso";
import { useProgresso } from "../../_components/membros/Progresso";
import { useAulasInfo } from "../../_components/membros/useAulasInfo";
import "./area.css";

type Card = {
  t: string;
  s: string;
  ir: string; // rota ou "hotphone"
  img: string;
  tag?: string;
  tagCor?: "ok" | "am";
  pct?: number;
  lock?: boolean;
  cta?: string;
};

const PLAY = (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path fill="currentColor" d="M8 5v14l11-7z" />
  </svg>
);
const SETA = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const CADEADO = (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path fill="currentColor" d="M7 10V7a5 5 0 0 1 10 0v3h1.5v11h-13V10H7Zm2.5 0h5V7a2.5 2.5 0 0 0-5 0v3Z" />
  </svg>
);

const BONUS: Card[] = [
  { img: IMG.prompts, t: "Pack de prompts", s: "Personas e cenários prontos para copiar", ir: "/dashboard/ferramentas", cta: "Abrir" },
  { img: IMG.planilha, t: "Planilha de operação", s: "Funil, metas e números da semana", ir: "/dashboard/ferramentas", cta: "Abrir" },
  { img: IMG.lives, t: "Lives", s: "Agenda e gravações das lives", ir: "/dashboard/feed", cta: "Ver agenda" },
  { img: IMG.placas, t: "Guia das placas", s: "Como comprovar e pedir sua placa", ir: "/dashboard/jornada", cta: "Ver guia" },
];
const LOJA: Card[] = [
  { img: IMG.mentoria, t: "Mentoria High Ticket", s: "Acompanhamento direto com o Cappu", lock: true, ir: "/dashboard/store", cta: "Ver na Hot Store" },
  { img: IMG.consultoria, t: "Consultoria", s: "Uma call de 60 min sobre a sua operação", lock: true, ir: "/dashboard/store", cta: "Ver na Hot Store" },
  { img: IMG.funil, t: "Funis prontos", s: "Templates editáveis de funil", lock: true, ir: "/dashboard/store", cta: "Ver na Hot Store" },
];

export default function AreaDeMembros() {
  const { modulos, feitas } = useProgresso();
  const info = useAulasInfo();
  const trilho = useRef<HTMLDivElement>(null);

  const andamento = moduloAtual(modulos);
  const iProx = proximaAula(andamento, feitas);
  const proxima = andamento.aulas[iProx];
  const dadosProx = proxima ? info?.get(proxima.id) : undefined;
  const seguintes = andamento.aulas
    .map((a, i) => ({ a, i }))
    .filter(({ a, i }) => i > iProx && !feitas.has(a.id))
    .slice(0, 2);
  const pctModulo = Math.round((andamento.feitas / Math.max(1, andamento.aulas.length)) * 100);

  const totalAulas = modulos.reduce((a, x) => a + x.aulas.length, 0);
  const totalFeitas = modulos.reduce((a, x) => a + x.feitas, 0);
  const pctAcademy = Math.round((totalFeitas / Math.max(1, totalAulas)) * 100);
  const comecou = totalFeitas > 0;

  const produtos: Card[] = [
    { img: IMG.academy, t: "Hot Academy", s: `${modulos.length} módulos · ${totalAulas} aulas`, tag: "Ativo", tagCor: "ok", ir: "/dashboard/aulas", pct: pctAcademy, cta: comecou ? "Continuar" : "Começar" },
    { img: IMG.hotphone, t: "HOTPHONE", s: "CappuIA, Cofre e Feed no canto da tela", tag: "Ativo", tagCor: "ok", ir: "hotphone", cta: "Abrir" },
    { img: IMG.comunidade, t: "Comunidade", s: "Feed, canais e lives com a turma", tag: "Ativo", tagCor: "ok", ir: "/dashboard/feed", cta: "Entrar" },
  ];

  const rolar = (dir: number) => trilho.current?.scrollBy({ left: dir * trilho.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section className="hs-am2" aria-label="Área de Membros">
      <header className="hs-am2-cab">
        <div>
          <p className="hs-am2-eb">Sua conta</p>
          <h1>
            Área de <span>Membros</span>
          </h1>
          <p className="hs-am2-sub">Todos os seus produtos, aulas e bônus num lugar só.</p>
        </div>
        <ul className="hs-am2-kpis" aria-label="Resumo">
          <li>
            <b>{pctAcademy}%</b>
            <span>da Academy</span>
          </li>
          <li>
            <b>
              {totalFeitas}/{totalAulas}
            </b>
            <span>aulas vistas</span>
          </li>
          <li className="ok">
            <b>
              <i aria-hidden /> Ativa
            </b>
            <span>assinatura</span>
          </li>
        </ul>
      </header>

      {/* Continue de onde parou */}
      {proxima && (
        <div className="hs-am2-hero hs-escuro">
          <span className="hs-am2-hero-bg" style={{ backgroundImage: `url(${andamento.img})` }} aria-hidden />
          <div className="hs-am2-hero-tx">
            <p className="hs-am2-eb">{comecou ? "Continue de onde parou" : "Comece por aqui"}</p>
            <p className="hs-am2-hmod">
              Módulo {andamento.n} · {andamento.t}
            </p>
            <h2>{proxima.t}</h2>
            <div className="hs-am2-prog">
              <span>
                <i style={{ width: `${pctModulo}%` }} />
              </span>
              <small>
                Aula {iProx + 1} de {andamento.aulas.length}
                {dadosProx?.duracao ? ` · ${dadosProx.duracao}` : ""} · {pctModulo}% do módulo
              </small>
            </div>
            <div className="hs-am2-acoes">
              <Link className="hs-am2-btn p" href={`/dashboard/aulas/${andamento.slug}?aula=${iProx + 1}`}>
                {PLAY} {comecou ? "Continuar aula" : "Assistir agora"}
              </Link>
              <Link className="hs-am2-btn s" href="/dashboard/aulas">
                Ver todos os módulos
              </Link>
            </div>
            {seguintes.length > 0 && (
              <div className="hs-am2-seg">
                <span>A seguir</span>
                <ol>
                  {seguintes.map(({ a, i }) => (
                    <li key={a.id}>
                      <Link href={`/dashboard/aulas/${andamento.slug}?aula=${i + 1}`}>
                        <em>{String(i + 1).padStart(2, "0")}</em>
                        <b>{a.t}</b>
                        {info?.get(a.id)?.duracao && <small>{info.get(a.id)!.duracao}</small>}
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Meus produtos */}
      <div className="hs-am2-sec">
        <div className="hs-am2-sec-cab">
          <h2>Meus produtos</h2>
          <small>{produtos.length} ativos</small>
        </div>
        <div className="hs-am2-prods">
          {produtos.map((c) => (
            <Cartao key={c.t} c={c} largo />
          ))}
        </div>
      </div>

      {/* Módulos */}
      <div className="hs-am2-sec">
        <div className="hs-am2-sec-cab">
          <h2>Hot Academy</h2>
          <small>
            {modulos.length} módulos · {pctAcademy}% concluído
          </small>
          <span className="hs-am2-nav">
            <button type="button" aria-label="Voltar" onClick={() => rolar(-1)}>
              ‹
            </button>
            <button type="button" aria-label="Avançar" onClick={() => rolar(1)}>
              ›
            </button>
          </span>
        </div>
        <div className="hs-am2-trilho" ref={trilho}>
          {modulos.map((x) => (
            <ModuloCard key={x.slug} x={x} atual={x.slug === andamento.slug} />
          ))}
        </div>
      </div>

      {/* Bônus */}
      <div className="hs-am2-sec">
        <div className="hs-am2-sec-cab">
          <h2>Bônus da assinatura</h2>
          <small>Liberados</small>
        </div>
        <div className="hs-am2-grade">
          {BONUS.map((c) => (
            <Cartao key={c.t} c={c} />
          ))}
        </div>
      </div>

      {/* Hot Store */}
      <div className="hs-am2-sec">
        <div className="hs-am2-sec-cab">
          <h2>Libere mais</h2>
          <small>Na Hot Store</small>
          <Link className="hs-am2-mais" href="/dashboard/store">
            Abrir a Hot Store {SETA}
          </Link>
        </div>
        <div className="hs-am2-grade">
          {LOJA.map((c) => (
            <Cartao key={c.t} c={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Cartao({ c, largo }: { c: Card; largo?: boolean }) {
  const corpo = (
    <>
      <span className="im" aria-hidden>
        <span className="cv" style={{ backgroundImage: `url(${c.img})` }} />
      </span>
      {c.tag && <span className={"tg " + (c.tagCor ?? "")}>{c.tag}</span>}
      {c.lock && <span className="lk">{CADEADO}</span>}
      <span className="tx">
        <b>{c.t}</b>
        <small>{c.s}</small>
        {c.pct !== undefined && (
          <span className="pg" aria-label={`${c.pct}% concluído`}>
            <i style={{ width: `${c.pct}%` }} />
          </span>
        )}
        {c.cta && (
          <span className="ct">
            {c.cta} {SETA}
          </span>
        )}
      </span>
    </>
  );
  const cls = "hs-am2-card" + (largo ? " largo" : "") + (c.lock ? " lock" : "");
  if (c.ir === "hotphone")
    return (
      <button type="button" className={cls} onClick={() => abrirHotphone()}>
        {corpo}
      </button>
    );
  return (
    <Link className={cls} href={c.ir}>
      {corpo}
    </Link>
  );
}

function ModuloCard({ x, atual }: { x: Modulo; atual: boolean }) {
  const lock = x.status === "bloqueado";
  const pct = Math.round((x.feitas / Math.max(1, x.aulas.length)) * 100);
  const tag = lock ? null : pct === 100 ? ["Concluído", "ok"] : pct > 0 ? ["Em andamento", "am"] : atual ? ["Próximo", "am"] : null;
  return (
    <Link className={"hs-am2-mod" + (lock ? " lock" : "") + (atual ? " atual" : "")} href={lock ? "/dashboard/aulas" : `/dashboard/aulas/${x.slug}`}>
      <span className="cv" style={{ backgroundImage: `url(${x.img})` }} aria-hidden />
      <span className="nu">{x.n}</span>
      {tag && <span className={"tg " + tag[1]}>{tag[0]}</span>}
      {lock && <span className="lk">{CADEADO}</span>}
      <span className="tx">
        <b>{x.t}</b>
        <small>{lock ? (x.trava ?? "Bloqueado") : `${x.aulas.length} aulas${pct > 0 ? ` · ${pct}%` : ""}`}</small>
        {!lock && (
          <span className="pg">
            <i style={{ width: `${pct}%` }} />
          </span>
        )}
      </span>
    </Link>
  );
}
