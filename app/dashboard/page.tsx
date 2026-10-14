"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useMembro } from "../_components/membros/MemberContext";
import Icon from "../_components/membros/Icon";
import { supabase } from "../_lib/supabase";
import { formatPreco, type Curso } from "../_lib/cursos";
import { ROUTE } from "../_lib/site";
import { LIVE, MISSOES, MODULOS, PERFIL_DEMO, RANKING, VITORIAS } from "../_lib/demo";
import ui from "../_components/membros/ui.module.css";
import s from "./inicio.module.css";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("pt-BR");

export default function Inicio() {
  const { nome } = useMembro();
  const [feitas, setFeitas] = useState<string[]>([]);
  const [cursos, setCursos] = useState<Curso[] | null>(null);

  // Cursos avulsos cadastrados na tabela "cursos" do Supabase.
  useEffect(() => {
    let vivo = true;
    supabase
      .from("cursos")
      .select("*")
      .then(({ data, error }) => {
        if (error) console.error("Erro ao buscar cursos:", error);
        if (vivo) setCursos((data ?? []) as Curso[]);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const p = PERFIL_DEMO;
  const atual = ROUTE[p.stopAtual];
  const prox = ROUTE[p.stopAtual + 1];
  const metaProx = 10000;
  const pctProx = Math.min(100, Math.round((p.faturado / metaProx) * 100));
  const continuar = MODULOS.find((m) => m.status === "andamento") ?? MODULOS[0];
  const aula = continuar.aulas[continuar.feitas] ?? continuar.aulas[0];
  const xpHoje = MISSOES.diarias.filter((m) => feitas.includes(m.id)).reduce((t, m) => t + m.xp, 0);

  function alternar(id: string) {
    setFeitas((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  }

  return (
    <div className={ui.page}>
      {/* passaporte / rota */}
      <section className={s.hero}>
        <Image src="/img/hero-neve.jpg" alt="" fill sizes="(max-width: 1024px) 100vw, 900px" className={s.heroImg} preload />
        <span className={s.heroLine} aria-hidden="true" />
        <div className={s.heroIn}>
          <p className={ui.eyebrow}>Passaporte · {p.passaporte}</p>
          <h1 className={ui.h1}>
            <span className={s.hello}>Bem-vindo de volta,</span>
            <span className={ui.gold}>{nome}.</span>
          </h1>
          <p className={s.where}>
            Você está em <b>{atual.country}</b>. Próxima escala: <b>{prox?.country ?? "topo"}</b>.
          </p>
          <ol className={s.route} aria-label="Sua rota">
            {ROUTE.map((r, i) => (
              <li key={r.code} className={i < p.stopAtual ? s.done : i === p.stopAtual ? s.here : ""}>
                <i aria-hidden="true" />
                <b>{r.code}</b>
                <small>{r.country}</small>
              </li>
            ))}
          </ol>
          {prox && (
            <div className={s.next}>
              <div className={ui.rowBetween}>
                <small>
                  Rumo a {prox.country}: {BRL.format(p.faturado)} de {BRL.format(metaProx)}
                </small>
                <small className={s.pct}>{pctProx}%</small>
              </div>
              <div className={ui.bar}>
                <i style={{ width: `${pctProx}%` }} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* números */}
      <div className={s.stats}>
        <div className={s.stat}>
          <Icon name="fire" />
          <b>{p.streak}</b>
          <small>dias seguidos</small>
        </div>
        <div className={s.stat}>
          <Icon name="medal" />
          <b>{NUM.format(p.xp)}</b>
          <small>XP · nível {p.nivel}</small>
        </div>
        <div className={s.stat}>
          <Icon name="coin" />
          <b>{p.coins}</b>
          <small>Cappu Coins</small>
        </div>
        <div className={s.stat}>
          <Icon name="plane" />
          <b>{BRL.format(p.faturado)}</b>
          <small>faturado verificado</small>
        </div>
      </div>

      <div className={ui.gridMain}>
        <div className={ui.page}>
          {/* continuar */}
          <Link href={`/dashboard/aulas/${continuar.slug}`} className={s.continue}>
            <span className={s.contImg}>
              <Image src={continuar.img} alt="" fill sizes="160px" />
              <span className={s.play}>
                <Icon name="play" size={22} />
              </span>
            </span>
            <span className={s.contTxt}>
              <small>
                Continuar · Mod {continuar.n} · {continuar.t}
              </small>
              <b>
                Aula {String(continuar.feitas + 1).padStart(2, "0")} · {aula.t}
              </b>
              <span className={ui.bar}>
                <i style={{ width: `${Math.round((continuar.feitas / continuar.aulas.length) * 100)}%` }} />
              </span>
            </span>
          </Link>

          {/* missões */}
          <section className={ui.card} aria-labelledby="missoes">
            <div className={ui.rowBetween}>
              <h2 id="missoes" className={ui.h2}>
                Missões de hoje
              </h2>
              <span className={`${ui.badge} ${ui.badgeGold}`}>+{xpHoje} XP hoje</span>
            </div>
            <ul className={ui.list}>
              {MISSOES.diarias.map((m) => {
                const ok = feitas.includes(m.id);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      className={`${s.mission} ${ok ? s.missionOk : ""}`}
                      onClick={() => alternar(m.id)}
                      aria-pressed={ok}
                    >
                      <span className={s.check}>{ok && <Icon name="check" size={16} />}</span>
                      <span className={ui.rowMain}>
                        <b>{m.t}</b>
                        <small>{m.meta}</small>
                      </span>
                      <span className={s.xpTag}>+{m.xp}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className={ui.small}>Toque para marcar. Missão concluída vira XP na hora.</p>
          </section>

          {/* cursos avulsos do Supabase */}
          <section className={ui.card} aria-labelledby="catalogo">
            <div className={ui.rowBetween}>
              <h2 id="catalogo" className={ui.h2}>
                Cursos avulsos
              </h2>
              <Link href="/#cursos" className={ui.btnSm}>
                Ver na loja
              </Link>
            </div>
            {cursos === null ? (
              <p className={ui.muted}>Carregando cursos…</p>
            ) : cursos.length === 0 ? (
              <p className={ui.muted}>Nenhum curso avulso publicado ainda.</p>
            ) : (
              <div className={s.courses}>
                {cursos.map((c) => (
                  <Link key={c.id} href={`/curso/${c.id}`} className={s.course}>
                    <span className={s.courseCover} aria-hidden="true">
                      {c.titulo.slice(0, 2).toUpperCase()}
                    </span>
                    <span className={ui.rowMain}>
                      <b>{c.titulo}</b>
                      <small>{formatPreco(c.preco)}</small>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className={ui.page}>
          {/* live */}
          <section className={`${ui.card} ${ui.cardGold}`} aria-labelledby="live">
            <div className={ui.rowBetween}>
              <h2 id="live" className={ui.h2}>
                Próxima live
              </h2>
              <span className={`${ui.badge} ${ui.badgeRed}`}>
                <Icon name="live" size={14} /> {LIVE.dia}
              </span>
            </div>
            <b className={s.liveT}>{LIVE.t}</b>
            <p className={ui.muted}>{LIVE.d}</p>
          </section>

          {/* ranking */}
          <section className={ui.card} aria-labelledby="ranking">
            <div className={ui.rowBetween}>
              <h2 id="ranking" className={ui.h2}>
                Temporada · top 5
              </h2>
              <Link href="/dashboard/conquistas" className={ui.btnSm}>
                Ver tudo
              </Link>
            </div>
            <ol className={s.rank}>
              {RANKING.slice(0, 5).map((r) => (
                <li key={r.pos}>
                  <span className={s.pos}>{String(r.pos).padStart(2, "0")}</span>
                  <span className={s.rname}>{r.nome}</span>
                  <span className={ui.badge}>{r.stop}</span>
                  <span className={s.rxp}>{NUM.format(r.xp)}</span>
                </li>
              ))}
              <li className={s.me}>
                <span className={s.pos}>14</span>
                <span className={s.rname}>Você</span>
                <span className={ui.badge}>{atual.code}</span>
                <span className={s.rxp}>{NUM.format(p.xp + xpHoje)}</span>
              </li>
            </ol>
          </section>

          {/* vitórias */}
          <section className={ui.card} aria-labelledby="vitorias">
            <h2 id="vitorias" className={ui.h2}>
              Vitórias da comunidade
            </h2>
            <ul className={ui.list}>
              {VITORIAS.map((v) => (
                <li key={v.t} className={ui.row}>
                  <span className={ui.ini}>{v.ini}</span>
                  <span className={ui.rowMain}>
                    <b>{v.t}</b>
                    <small>{v.quando}</small>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <p className={ui.note}>
        Números, ranking e missões desta tela são exemplos até as tabelas de progresso existirem no Supabase.
      </p>
    </div>
  );
}
