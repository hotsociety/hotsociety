"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Esteira from "../../_components/membros/Esteira";
import PalcoProdutos from "../../_components/membros/PalcoProdutos";
import { abrirHotphone } from "../../_components/membros/hotphone/HotPhone";
import { m } from "../../_components/membros/proto";
import { IMG, PRODUTOS, type Modulo } from "../../_lib/demo";
import { ITENS_PAGOS, itemPago } from "../../_lib/loja";
import { BIBLIOTECA, CHAVE_LIBERADO } from "../../_lib/biblioteca";
import { supabase } from "../../_lib/supabase";
import { moduloAtual, proximaAula } from "../../_lib/progresso";
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
const brl = (v: number) => "R$ " + v.toLocaleString("pt-BR");
const lerFlag = (k: string) => {
  try {
    return !!localStorage.getItem(k);
  } catch {
    return true; // sem armazenamento: não repete a animação
  }
};
const gravarFlag = (k: string) => {
  try {
    localStorage.setItem(k, "1");
  } catch {}
};

// "Introdução · Quem é o Cappu" → grande "Introdução", pequeno "Quem é o Cappu".
function Titulo({ t }: { t: string }) {
  const partes = t.includes(" · ") ? t.split(" · ") : t.split(" ");
  const n = partes[0].length <= 2 && partes.length > 2 ? 2 : 1;
  const a = partes.slice(0, n).join(" ");
  const resto = partes.slice(n);
  // Palavra longa encolhe para caber no pôster.
  const tam = a.length > 8 ? { fontSize: `${Math.max(0.55, 8 / a.length)}em` } : undefined;
  if (!resto.length)
    return (
      <span className={m("stack")}>
        <span style={tam}>{a}</span>
      </span>
    );
  const curto = resto.length === 1 && resto[0].length <= 8;
  return (
    <span className={m("stack")}>
      <span style={tam}>{a}</span>
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

// Card de produto (mesmo visual da Área de Membros).
type CardProduto = { t: string; s: string; img: string; tag?: string; tagCor?: "ok" | "am"; lock?: boolean; preco?: string; ir: () => void };
function Produto({ c }: { c: CardProduto }) {
  return (
    <button type="button" className={m("am-c" + (c.lock ? " lock" : ""))} style={{ backgroundImage: `url(${c.img})` }} onClick={c.ir}>
      {c.tag && <span className={m("tag tg " + (c.tagCor ?? ""))}>{c.tag}</span>}
      {c.lock && (
        <span className={m("lk")} aria-hidden="true">
          🔒
        </span>
      )}
      <span className={m("in")}>
        <b>{c.t}</b>
        <small>{c.s}</small>
        {c.preco && <span className="hs-prd-preco">{c.preco}</span>}
      </span>
    </button>
  );
}

// Cadeado da trilha de produtos: o arco sobe quando o produto é liberado.
function Cadeado({ aberto }: { aberto?: boolean }) {
  return (
    <svg className={"hs-tp-cad" + (aberto ? " aberto" : "")} viewBox="0 0 32 40" aria-hidden="true">
      <path className="arco" d="M9 18v-6a7 7 0 0 1 14 0v6" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      <rect x="4" y="17" width="24" height="20" rx="4.5" fill="currentColor" />
      <circle cx="16" cy="26" r="2.6" fill="#141416" />
      <path d="M15 27.5h2l.7 4.5h-3.4z" fill="#141416" />
    </svg>
  );
}

export default function Modulos() {
  const router = useRouter();
  const { modulos: MODULOS, feitas } = useProgresso();
  const info = useAulasInfo();
  const [filtro, setFiltro] = useState<Filtro>("all");
  const [sel, setSel] = useState(() => Math.max(0, MODULOS.indexOf(moduloAtual(MODULOS))));
  const detalhe = useRef<HTMLDivElement>(null);
  const [prodSel, setProdSel] = useState(0); // produto escolhido na trilha (0 = Hot Academy)
  const [mentorado, setMentorado] = useState(false);
  const [abrindo, setAbrindo] = useState<string | null>(null); // produto liberado agora (animação)
  const proximos = useRef<HTMLDivElement>(null);

  const atual = moduloAtual(MODULOS);
  const iProx = proximaAula(atual, feitas);
  const proxAula = atual.aulas[iProx];
  const totalAulas = MODULOS.reduce((a, x) => a + x.aulas.length, 0);
  const totalFeitas = MODULOS.reduce((a, x) => a + x.feitas, 0);
  const pctCurso = Math.round((totalFeitas / Math.max(1, totalAulas)) * 100);

  const mod = MODULOS[sel] ?? atual;
  const prox = proximaAula(mod, feitas);
  const travado = mod.status === "bloqueado";

  const visiveis = MODULOS.map((x, i) => ({ x, i })).filter(({ x }) =>
    filtro === "own" ? x.status !== "bloqueado" : filtro === "lock" ? x.status === "bloqueado" : true,
  );

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

  // Trilha de produtos: cada um libera quando o anterior é concluído (a Mentoria também por aplicação).
  useEffect(() => {
    supabase.rpc("minha_mentoria").then(({ data }) => setMentorado(!!(data as { mentorado?: boolean } | null)?.mentorado));
  }, []);
  const trilha = BIBLIOTECA.map((p, i) => ({ ...p, i }));
  const concluido = (i: number) => (i === 0 ? pctCurso === 100 : false); // produtos 2–4 ainda sem aulas
  const liberado = (i: number) => i === 0 || concluido(i - 1) || (trilha[i].tipo === "mentoria" && mentorado);
  const anterior = (i: number) => trilha[i - 1];

  // Primeira vez que um produto aparece liberado: toca a animação do cadeado abrindo.
  useEffect(() => {
    const novo = trilha.find((p) => !p.incluso && liberado(p.i) && !lerFlag(CHAVE_LIBERADO(p.id)));
    if (!novo || abrindo) return;
    setAbrindo(novo.id);
    const t = setTimeout(() => {
      gravarFlag(CHAVE_LIBERADO(novo.id));
      setAbrindo(null);
    }, 2400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pctCurso, mentorado, abrindo]);

  // Clique no produto do centro (ou no botão do pedestal): desce até as aulas / próximos módulos.
  const abrirProduto = (i: number) => {
    setProdSel(i);
    requestAnimationFrame(() => proximos.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const prodAtual = trilha[prodSel];

  const abrirModulo = (i: number) => {
    setSel(i);
    requestAnimationFrame(() => detalhe.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const meus: CardProduto[] = [
    { img: IMG.academy, t: "Hot Academy", s: `${MODULOS.length} módulos · ${totalAulas} aulas`, tag: `${pctCurso}% feito`, tagCor: "ok", ir: () => router.push(`/dashboard/aulas/${atual.slug}?aula=${iProx + 1}`) },
    { img: IMG.hotphone, t: "HOTPHONE", s: "CappuIA, Cofre e Feed no canto da tela", tag: "Ativo", tagCor: "ok", ir: () => abrirHotphone() },
    { img: IMG.comunidade, t: "Comunidade", s: "Feed, canais e lives", tag: "Ativo", tagCor: "ok", ir: () => router.push("/dashboard/feed") },
    { img: IMG.cappuia, t: "CappuIA", s: "Tire dúvidas das aulas com IA", tag: "Ativo", tagCor: "ok", ir: () => router.push("/dashboard/cappuia") },
    { img: IMG.prompts, t: "Ferramentas", s: "Prompts, planilhas e funis", tag: "Bônus", tagCor: "am", ir: () => router.push("/dashboard/ferramentas") },
    { img: IMG.lives, t: "Lives", s: "Agenda e gravações", tag: "Bônus", tagCor: "am", ir: () => router.push("/dashboard/feed") },
  ];

  // Vitrine da Hot Store: o que está à venda primeiro, o resto com cadeado.
  const loja: CardProduto[] = [...PRODUTOS]
    .filter((p) => p.img)
    .sort((a, b) => Number(!!b.compra) - Number(!!a.compra))
    .map((p) => {
      const pago = p.compra ? itemPago(p.id) : null;
      return {
        img: p.img!,
        t: p.t,
        s: p.d,
        tag: pago ? "Disponível" : "Em breve",
        tagCor: pago ? ("ok" as const) : undefined,
        lock: !pago,
        preco: pago ? brl(ITENS_PAGOS[pago].preco) : undefined,
        ir: () => router.push(pago ? `/assinar?item=${pago}` : "/dashboard/store"),
      };
    });

  return (
    <section className={m("view")} aria-label="Módulos">
      {/* Destaque: de onde o aluno parou */}
      <div className={m("am-hero")} style={{ backgroundImage: `url(${atual.img})` }}>
        <div className={m("in")}>
          <p className={m("eb")} style={{ color: "var(--red-t)" }}>
            {totalFeitas === 0 ? "Comece por aqui" : "Continue de onde parou"} · Hot Academy
          </p>
          <h2 className={m("stack")} style={proxAula.t.length > 28 ? { fontSize: proxAula.t.length > 48 ? "clamp(24px,2.6vw,34px)" : "clamp(28px,3.2vw,44px)" } : undefined}>
            <span className={m("s")}>
              Módulo {atual.n} · Aula {iProx + 1}
            </span>
            <span>{proxAula.t}</span>
          </h2>
          <div className={m("pr")}>
            <div className={m("prog")}>
              <i style={{ width: `${pctCurso}%` }} />
            </div>
            {totalFeitas} de {totalAulas} aulas do curso
          </div>
          <div className={m("row")}>
            <Link className={m("btn btn-p")} href={`/dashboard/aulas/${atual.slug}?aula=${iProx + 1}`}>
              {totalFeitas === 0 ? "Começar agora" : "Continuar aula"}
            </Link>
            <button className={m("btn btn-s")} type="button" onClick={() => abrirModulo(MODULOS.indexOf(atual))}>
              Ver aulas do módulo
            </button>
          </div>
        </div>
      </div>

      {/* Trilha de produtos: palco com os produtos flutuando; conclua um para liberar o próximo */}
      <PalcoProdutos
        sel={prodSel}
        onSel={setProdSel}
        onAbrir={abrirProduto}
        cadeado={(aberto) => <Cadeado aberto={aberto} />}
        acao={prodSel === 0 ? (totalFeitas === 0 ? "Começar a Hot Academy" : "Ver minhas aulas") : liberado(prodSel) ? "Ver módulos" : prodAtual.tipo === "mentoria" ? "Ver a mentoria" : "Ver o que vem"}
        itens={trilha.map((p) => {
          const lib = liberado(p.i);
          const ant = anterior(p.i);
          return {
            id: p.id,
            no: p.no,
            titulo: p.titulo,
            rotulo: p.tipo === "mentoria" ? "High Ticket" : undefined,
            sub: p.sub,
            desc: p.desc,
            lib: lib && abrindo !== p.id,
            abrindo: abrindo === p.id,
            pct: p.i === 0 ? pctCurso : undefined,
            tema: p.i === 0 ? "ouro" : p.tipo === "mentoria" ? "monaco" : "grafite",
            req: lib
              ? p.i === 0
                ? pctCurso === 100 ? "✓ Concluído" : `Liberado · ${pctCurso}% concluído`
                : p.tipo === "mentoria" ? "Liberado · você é mentorado" : "Liberado · conteúdo chegando em breve"
              : p.tipo === "mentoria"
                ? `Travado · conclua o ${ant.titulo} ou aplique`
                : `Travado · conclua o ${ant.titulo} para liberar`,
          };
        })}
      />

      <div ref={proximos} style={{ scrollMarginTop: 80 }}>
      {prodSel === 0 ? (
        <>
      {/* Próximas aulas com a capa real do vídeo */}
      {continuar.length > 0 && (
        <Esteira titulo={totalFeitas === 0 ? "Comece por aqui" : "Continue assistindo"} sub={`${totalAulas - totalFeitas} aulas pela frente`} largo="aula">
          {continuar.map(({ mod: x, i }, k) => {
            const a = x.aulas[i];
            const dados = info?.get(a.id);
            const capa = capaDoVideo(dados?.video_url) ?? x.img;
            return (
              <Link key={a.id} className="hs-aula-c" href={`/dashboard/aulas/${x.slug}?aula=${i + 1}`}>
                <span className="cv" style={{ backgroundImage: `url(${capa})` }}>
                  {k === 0 && <span className="tag">Próxima</span>}
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

      {/* Módulos do curso */}
      <Esteira
        titulo="Hot Academy"
        sub={`${MODULOS.length} módulos · ${pctCurso}% concluído`}
        acao={
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
        }
      >
        {visiveis.length === 0 ? (
          <p className={m("sub")} style={{ margin: "30px 4px" }}>
            {filtro === "lock" ? "Nenhum módulo travado: você já tem acesso a tudo." : "Nenhum módulo aqui."}
          </p>
        ) : (
          visiveis.map(({ x, i }) => {
            const pct = Math.round((x.feitas / x.aulas.length) * 100);
            return (
              <button
                key={x.slug}
                type="button"
                className={m("mod" + (x.status === "bloqueado" ? " lock" : ""))}
                aria-pressed={sel === i}
                onClick={() => abrirModulo(i)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={x.img} alt="" loading="lazy" />
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
                {x.status !== "bloqueado" && pct > 0 && (
                  <span className="hs-mod-pct">
                    <i style={{ width: `${pct}%` }} />
                  </span>
                )}
              </button>
            );
          })
        )}
      </Esteira>

      {/* Aulas do módulo escolhido */}
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
            <Link className={m("btn btn-p")} href={`/dashboard/aulas/${mod.slug}${mod.status === "feito" ? "" : `?aula=${prox + 1}`}`}>
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
                <span className={m("t")}>{travado ? "—" : (info?.get(a.id)?.duracao ?? "")}</span>
              </>
            );
            return (
              <li key={a.id} className={estado ? m(estado) : undefined}>
                {travado ? conteudo : <Link href={`/dashboard/aulas/${mod.slug}?aula=${k + 1}`}>{conteudo}</Link>}
              </li>
            );
          })}
        </ol>
      </div>
        </>
      ) : (
        /* Próximos módulos do produto escolhido (travados até liberar) */
        <div className="hs-tp-prox">
          <div className={m("card") + " hs-tp-aviso"}>
            <span className="hs-tp-aviso-cad">
              <Cadeado aberto={liberado(prodSel)} />
            </span>
            <div>
              <h2 style={{ margin: 0 }}>
                Produto {prodAtual.no} · {prodAtual.titulo}
              </h2>
              <p className={m("sub")} style={{ margin: "6px 0 0" }}>
                {liberado(prodSel)
                  ? prodAtual.tipo === "mentoria"
                    ? "Sua mentoria está liberada."
                    : "Liberado! O conteúdo deste produto chega em breve, e você vai ser avisado."
                  : prodAtual.tipo === "mentoria"
                    ? `Libera quando você concluir o ${anterior(prodSel).titulo}, ou antes, se for aprovado na aplicação.`
                    : `Libera quando você concluir 100% do ${anterior(prodSel).titulo}.`}
              </p>
            </div>
            {prodAtual.tipo === "mentoria" ? (
              <Link className={m("btn btn-p")} href="/dashboard/mentoria">
                {liberado(prodSel) ? "Abrir a mentoria" : "Aplicar"}
              </Link>
            ) : prodSel === 1 && !liberado(1) ? (
              <button type="button" className={m("btn btn-s")} onClick={() => setProdSel(0)}>
                Voltar à Hot Academy · {pctCurso}%
              </button>
            ) : null}
          </div>
          <Esteira titulo={`Próximos módulos · ${prodAtual.titulo}`} sub={liberado(prodSel) ? "Em preparação" : "Travados até liberar"}>
            {prodAtual.previa.map((nome, k) => (
              <div key={nome + k} className="hs-tp-mod">
                <span className="hs-tp-mod-no">
                  {prodAtual.tipo === "mentoria" ? "" : "MOD "}
                  {String(k + 1).padStart(2, "0")}
                </span>
                <Cadeado />
                <b>{nome}</b>
                <small>{liberado(prodSel) ? "Em breve" : "Travado"}</small>
              </div>
            ))}
          </Esteira>
        </div>
      )}
      </div>

      {/* Outros produtos */}
      <Esteira titulo="Incluídos na assinatura" sub="Ferramentas e bônus" largo="wide">
        {meus.map((c) => (
          <Produto key={c.t} c={c} />
        ))}
      </Esteira>

      <Esteira
        titulo="Na Hot Store"
        sub="Libere mais"
        largo="wide"
        acao={
          <Link href="/dashboard/store" className={m("btn btn-s")}>
            Ver loja
          </Link>
        }
      >
        {loja.map((c) => (
          <Produto key={c.t} c={c} />
        ))}
      </Esteira>
    </section>
  );
}
