"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useMembro } from "../_components/membros/MemberContext";
import Contador from "../_components/membros/Contador";
import Icon from "../_components/membros/Icon";
import { supabase } from "../_lib/supabase";
import { formatPreco, type Curso } from "../_lib/cursos";
import { ROUTE } from "../_lib/site";
import { MISSOES_PLANO } from "../_lib/demo";
import ProximaLive from "../_components/membros/ProximaLive";
import Ranking from "../_components/membros/Ranking";
import { moduloAtual, proximaAula } from "../_lib/progresso";
import { useProgresso } from "../_components/membros/Progresso";
import { toast } from "../_components/membros/Toast";
import "../_components/membros/ui.css";
import ui from "../_components/membros/ui.styles";
import "./inicio.css";
import s from "./inicio.styles";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("pt-BR");

export default function Inicio() {
  const { nome } = useMembro();
  const { perfil, nivel, modulos, feitas, avancos, avancarMissao } = useProgresso();
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

  const p = { ...perfil, nivel };
  const atual = ROUTE[p.stopAtual];
  const prox = ROUTE[p.stopAtual + 1];
  const metaProx = prox?.meta || 10000;
  const pctProx = Math.min(100, Math.round((p.faturado / metaProx) * 100));
  const continuar = moduloAtual(modulos);
  const iAula = proximaAula(continuar, feitas);
  const aula = continuar.aulas[iAula];
  const diarias = MISSOES_PLANO.d.map((m) => ({ ...m, feito: Math.min(m.total, avancos[m.id] ?? 0) }));
  const xpHoje = diarias.filter((m) => m.feito >= m.total).reduce((t, m) => t + m.xp, 0);

  async function avancar(id: string) {
    try {
      const r = await avancarMissao(id);
      const mi = diarias.find((m) => m.id === id);
      if (r.concluiu && mi) toast(`+${mi.xp} XP · missão concluída`, true);
    } catch {
      toast("Não deu para salvar agora. Tente de novo.");
    }
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
          <b><Contador valor={p.streak} /></b>
          <small>dias seguidos</small>
        </div>
        <div className={s.stat}>
          <Icon name="medal" />
          <b><Contador valor={p.xp} formato={(n) => NUM.format(n)} /></b>
          <small>XP · nível {p.nivel}</small>
        </div>
        <div className={s.stat}>
          <Icon name="coin" />
          <b><Contador valor={p.coins} formato={(n) => NUM.format(n)} /></b>
          <small>Cappu Coins</small>
        </div>
        <div className={s.stat}>
          <Icon name="plane" />
          <b><Contador valor={p.faturado} formato={(n) => BRL.format(n)} /></b>
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
                Aula {String(iAula + 1).padStart(2, "0")} · {aula.t}
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
              {diarias.map((m) => {
                const ok = m.feito >= m.total;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      className={`${s.mission} ${ok ? s.missionOk : ""}`}
                      onClick={() => !ok && avancar(m.id)}
                      aria-pressed={ok}
                      disabled={ok}
                    >
                      <span className={s.check}>{ok && <Icon name="check" size={16} />}</span>
                      <span className={ui.rowMain}>
                        <b>{m.t}</b>
                        <small>
                          {m.total > 1 ? `${m.feito} de ${m.total} · ` : ""}
                          {m.meta}
                        </small>
                      </span>
                      <span className={s.xpTag}>+{m.xp}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className={ui.small}>Toque para registrar. Missão concluída vira XP na hora e fica salva.</p>
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
          <ProximaLive classeTitulo={s.liveT} />

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
            <Ranking classes={{ lista: s.rank, pos: s.pos, nome: s.rname, badge: ui.badge, xp: s.rxp, eu: s.me, vazio: ui.muted }} />
          </section>

        </div>
      </div>

    </div>
  );
}
