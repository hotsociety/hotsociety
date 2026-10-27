import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import SiteHeader from "./_components/home/SiteHeader";
import CourseGrid, { CourseGridSkeleton } from "./_components/catalog/CourseGrid";
import { Passport3D } from "./_components/passport3d";
import { DADOS_EMPRESA, FAQ, FEATURES, MODULES, PLANS, ROUTE, SITE } from "./_lib/site";
import "./home.css";
import s from "./home.styles";

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main id="conteudo">
        {/* HERO · Passaporte 3D: o lead escreve o nome, abre, carimba e ativa */}
        <Passport3D />

        {/* JOGO */}
        <section className={s.section} aria-labelledby="jogo-title">
          <div className={s.wrap}>
            <header className={s.secHead}>
              <p className={s.eyebrow}>Escolha o seu caminho</p>
              <h2 id="jogo-title" className={s.h2}>
                Qual é o <span className={s.gold}>seu jogo?</span>
              </h2>
            </header>
            <div className={s.grid2}>
              <article className={s.gameCard}>
                <span className={s.gameTag}>Trilha 01</span>
                <h3>Modelo IA</h3>
                <p>
                  Crie uma persona do zero, sem rosto real, com conteúdo identificado como IA. Você opera sem aparecer.
                </p>
                <ul>
                  <li>Persona e consistência de rosto</li>
                  <li>Prompts prontos e roteiros</li>
                  <li>Funil e recorrência</li>
                </ul>
              </article>
              <article className={s.gameCard}>
                <span className={s.gameTag}>Trilha 02</span>
                <h3>Modelo real</h3>
                <p>
                  Opere com uma modelo maior de 18 anos, com contrato, consentimento por escrito e divisão de ganhos clara.
                </p>
                <ul>
                  <li>Abordagem e contrato</li>
                  <li>Produção e calendário</li>
                  <li>Tráfego e escala</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        {/* ROTA */}
        <section id="rota" className={`${s.section} ${s.sectionAlt}`} aria-labelledby="rota-title">
          <div className={s.wrap}>
            <header className={s.secHead}>
              <p className={s.eyebrow}>A rota</p>
              <h2 id="rota-title" className={s.h2}>
                Cada meta, <span className={s.gold}>um carimbo.</span>
              </h2>
              <p className={s.secLead}>
                Você sobe de país conforme fatura. Faturamento verificado pelo time vira placa física na sua casa.
              </p>
            </header>
            <ol className={s.route}>
              {ROUTE.map((r, i) => (
                <li key={r.code} className={s.routeStop}>
                  <span className={s.routeCode}>{r.code}</span>
                  <span className={s.routeDot} aria-hidden="true" />
                  <h3>{r.country}</h3>
                  <p>{r.goal}</p>
                  <small>{r.reward}</small>
                  {i === 0 && <span className={s.routeStart}>Início</span>}
                  {i === ROUTE.length - 1 && <span className={s.routeTop}>Topo</span>}
                </li>
              ))}
            </ol>
            <p className={s.fine}>Valores são metas da rota, não promessa de ganho.</p>
          </div>
        </section>

        {/* POR DENTRO */}
        <section id="por-dentro" className={s.section} aria-labelledby="dentro-title">
          <div className={s.wrap}>
            <header className={s.secHead}>
              <p className={s.eyebrow}>Por dentro</p>
              <h2 id="dentro-title" className={s.h2}>
                Tudo que você precisa <span className={s.gold}>num lugar só.</span>
              </h2>
            </header>
            <div className={s.features}>
              {FEATURES.map((f, i) => (
                <article key={f.t} className={s.feature}>
                  <span className={s.featureN}>{String(i + 1).padStart(2, "0")}</span>
                  <h3>{f.t}</h3>
                  <p>{f.d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* MÓDULOS */}
        <section id="modulos" className={`${s.section} ${s.sectionAlt}`} aria-labelledby="mod-title">
          <div className={s.wrap}>
            <header className={`${s.secHead} ${s.secHeadRow}`}>
              <div>
                <p className={s.eyebrow}>Hot Academy</p>
                <h2 id="mod-title" className={s.h2}>
                  9 módulos, <span className={s.gold}>do zero à gringa.</span>
                </h2>
              </div>
              <p className={s.secLead}>Aulas curtas, missão no fim de cada módulo e a CappuIA para tirar dúvida.</p>
            </header>
          </div>
          <div className={s.modScroll} role="list">
            {MODULES.map((m) => (
              <article key={m.n} className={s.modCard} role="listitem">
                <Image src={m.img} alt="" fill sizes="(max-width: 640px) 70vw, (max-width: 1024px) 34vw, 240px" className={s.modImg} />
                <span className={s.modNo}>MOD {m.n}</span>
                <div className={s.modIn}>
                  <h3>{m.t}</h3>
                  <span className={s.modRule} aria-hidden="true" />
                  <small>{m.lessons} aulas</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* CATÁLOGO (Supabase) */}
        <section id="cursos" className={s.section} aria-labelledby="cursos-title">
          <div className={s.wrap}>
            <header className={s.secHead}>
              <p className={s.eyebrow}>Catálogo</p>
              <h2 id="cursos-title" className={s.h2}>
                Cursos <span className={s.gold}>disponíveis.</span>
              </h2>
            </header>
            <Suspense fallback={<CourseGridSkeleton />}>
              <CourseGrid />
            </Suspense>
          </div>
        </section>

        {/* PLACAS */}
        <section className={s.section} aria-labelledby="placas-title">
          <div className={`${s.wrap} ${s.split}`}>
            <div className={s.splitMedia}>
              <Image src="/img/placas.jpg" alt="Placas físicas HOT SOCIETY de 10K" fill sizes="(max-width: 1024px) 100vw, 50vw" className={s.cover} />
            </div>
            <div className={s.splitText}>
              <p className={s.eyebrow}>Prêmios</p>
              <h2 id="placas-title" className={s.h2}>
                Bateu a meta? <span className={s.gold}>A placa vai até você.</span>
              </h2>
              <p className={s.secLead}>
                10K, 50K e 100K. Você envia os prints do faturamento, o time confere e a placa sai com o seu nome.
              </p>
              <div className={s.plaques}>
                {["10K", "50K", "100K"].map((p) => (
                  <span key={p} className={s.plaque}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* COMANDANTE */}
        <section className={`${s.section} ${s.sectionAlt}`} aria-labelledby="cmd-title">
          <div className={`${s.wrap} ${s.split} ${s.splitRev}`}>
            <div className={`${s.splitMedia} ${s.splitMediaSq}`}>
              <Image src="/img/comandante.jpg" alt="Cappu, fundador da HOT SOCIETY" fill sizes="(max-width: 1024px) 100vw, 45vw" className={`${s.cover} ${s.bw}`} />
            </div>
            <div className={s.splitText}>
              <p className={s.eyebrow}>O comandante</p>
              <h2 id="cmd-title" className={s.stack} style={{ fontSize: "clamp(40px, 7vw, 76px)" }}>
                <span className={s.stackS}>Não existe</span>
                <span className={s.goldText}>nobreza</span>
                <span className={s.stackS}>na pobreza.</span>
              </h2>
              <p className={s.secLead}>
                A HOT SOCIETY é do Cappu. Tudo o que funciona na operação dele virou aula, ferramenta e missão para você
                aplicar no seu ritmo.
              </p>
            </div>
          </div>
        </section>

        {/* PLANOS */}
        <section id="planos" className={s.section} aria-labelledby="planos-title">
          <div className={s.wrap}>
            <header className={`${s.secHead} ${s.center}`}>
              <p className={s.eyebrow}>Ative seu passaporte</p>
              <h2 id="planos-title" className={s.h2}>
                Escolha a sua <span className={s.gold}>classe.</span>
              </h2>
            </header>
            <div className={s.plans}>
              {PLANS.map((p) => (
                <article key={p.id} className={`${s.plan} ${p.featured ? s.planFeatured : ""}`}>
                  {p.badge && <span className={s.planBadge}>{p.badge}</span>}
                  <h3>{p.name}</h3>
                  <p className={s.planPrice}>
                    <strong>{p.price}</strong>
                    <span>{p.period}</span>
                  </p>
                  <p className={s.planNote}>{p.note}</p>
                  <ul>
                    {p.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                  <a href={p.href} className={`${s.btn} ${p.featured ? s.btnGold : s.btnGhost} ${s.btnBlock}`}>
                    Ativar plano {p.name.toLowerCase()}
                  </a>
                </article>
              ))}
            </div>
            <div className={s.guarantee}>
              <span className={s.guaranteeSeal} aria-hidden="true">
                7
                <small>dias</small>
              </span>
              <div>
                <h3>Garantia de 7 dias</h3>
                <p>Entrou e não era pra você? Peça o reembolso em até 7 dias e devolvemos 100%. Depois disso, cancele quando quiser, em 2 cliques.</p>
              </div>
            </div>
            <div className={s.guarantee} style={{ marginTop: 12 }}>
              <span className={s.guaranteeSeal} aria-hidden="true" style={{ fontSize: 19 }}>
                MCM
                <small>topo</small>
              </span>
              <div>
                <h3>Mentoria High Ticket com o Cappu</h3>
                <p>Encontros ao vivo, calls individuais e chat direto com o mentor. Entrada por aplicação.</p>
                <p style={{ marginTop: 12 }}>
                  <Link href="/mentoria" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}>
                    Aplicar para a mentoria
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className={`${s.section} ${s.sectionAlt}`} aria-labelledby="faq-title">
          <div className={`${s.wrap} ${s.faqWrap}`}>
            <header className={s.secHead}>
              <p className={s.eyebrow}>Dúvidas</p>
              <h2 id="faq-title" className={s.h2}>
                Perguntas <span className={s.gold}>frequentes.</span>
              </h2>
            </header>
            <div className={s.faq}>
              {FAQ.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className={s.final} aria-labelledby="final-title">
          <span className={s.goldLine} aria-hidden="true" />
          <div className={`${s.wrap} ${s.finalIn}`}>
            <h2 id="final-title" className={s.stack}>
              <span className={s.stackS}>Seu passaporte</span>
              <span>está te</span>
              <span className={s.goldText}>esperando.</span>
            </h2>
            <a href="#planos" className={`${s.btn} ${s.btnGold} ${s.btnLg}`}>
              Emitir meu passaporte
            </a>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={`${s.wrap} ${s.footerIn}`}>
          <div className={s.footerBrand}>
            <Image src="/brand/hs-logo.svg" alt="HOT SOCIETY" width={1253} height={170} />
            <p>{SITE.slogan}</p>
          </div>
          <nav className={s.footerNav} aria-label="Rodapé">
            <Link href="/login">Entrar</Link>
            <a href="#planos">Planos</a>
            <a href="#faq">Dúvidas</a>
            <Link href="/mentoria">Mentoria</Link>
            <Link href="/termos">Termos de uso</Link>
            <Link href="/privacidade">Privacidade</Link>
            <a href={`mailto:${SITE.supportEmail}`}>Suporte</a>
          </nav>
        </div>
        <div className={`${s.wrap} ${s.footerLegal}`}>
          <p>
            Conteúdo para maiores de 18 anos. Resultados dependem do seu trabalho e não são garantidos. Conteúdo de IA é
            sempre identificado. © {SITE.year} HOT SOCIETY
          </p>
          <p>
            {DADOS_EMPRESA} · <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>
          </p>
        </div>
      </footer>
    </>
  );
}
