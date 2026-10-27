"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Esteira from "../../_components/membros/Esteira";
import { useMembro } from "../../_components/membros/MemberContext";
import { m } from "../../_components/membros/proto";
import { BIBLIOTECA, CHAVE_QUEBRADO } from "../../_lib/biblioteca";
import { type Modulo } from "../../_lib/demo";
import { ITENS_PAGOS, itemPago } from "../../_lib/loja";
import { moduloAtual, proximaAula } from "../../_lib/progresso";
import { supabase } from "../../_lib/supabase";
import Vitrine, { type ItemVitrine } from "./Vitrine";
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
// Brilho de fundo de cada módulo (tons quentes da marca + um contraste por parada).
const TONS = ["#C9A24E", "#D98A3D", "#B5523B", "#8E2F45", "#3E7C86", "#6C8FB8", "#C9A24E", "#4E8F6A", "#B8784E"];
const palavraDe = (t: string) => {
  const p = (t.split(" · ")[0] || t).split(" ");
  return (p[0].length <= 2 && p[1] ? `${p[0]} ${p[1]}` : p[0]).toUpperCase();
};
const brl = (v: number) => "R$ " + v.toLocaleString("pt-BR");

export default function Pagina() {
  return (
    <Suspense fallback={null}>
      <Roteador />
    </Suspense>
  );
}

// /dashboard/aulas → Biblioteca (produtos) · /dashboard/aulas?produto=hot-academy → módulos do curso
function Roteador() {
  const q = useSearchParams();
  return q.get("produto") === "hot-academy" ? <CursoHotAcademy /> : <Biblioteca desbloqueado={q.get("desbloqueado")} demo={q.get("demo") === "corrente"} />;
}

/* ===================== Biblioteca de produtos ===================== */

function Biblioteca({ desbloqueado, demo }: { desbloqueado: string | null; demo: boolean }) {
  const { cargo } = useMembro();
  const { modulos: MODULOS, feitas } = useProgresso();
  const [comprados, setComprados] = useState<Set<string> | null>(null);
  const [mentorado, setMentorado] = useState(false);
  const [quebrados, setQuebrados] = useState<Set<string>>(new Set());
  const [demoAtivo, setDemoAtivo] = useState(false);
  const [k, setK] = useState(0);

  useEffect(() => {
    // O que já foi desbloqueado (compras pagas no inventário) e se é mentorado.
    Promise.all([supabase.rpc("meu_inventario"), supabase.rpc("minha_mentoria")]).then(([inv, men]) => {
      const lista = (inv.data ?? []) as { origem: string; item: string; status: string }[];
      setComprados(new Set(lista.filter((i) => i.origem === "compra" && i.status === "pago").map((i) => i.item)));
      setMentorado(!!(men.data as { mentorado?: boolean } | null)?.mentorado);
    });
    const ja = new Set<string>();
    for (const p of BIBLIOTECA) {
      try {
        if (localStorage.getItem(CHAVE_QUEBRADO(p.id))) ja.add(p.id);
      } catch {}
    }
    setQuebrados(ja);
  }, []);

  // Prévia da animação para a equipe: /dashboard/aulas?demo=corrente (não libera nada).
  useEffect(() => {
    if (demo && cargo) setDemoAtivo(true);
  }, [demo, cargo]);

  const onQuebrou = useCallback((id: string) => {
    if (id === "p2" && demoAtivo) return setDemoAtivo(false);
    try {
      localStorage.setItem(CHAVE_QUEBRADO(id), "1");
    } catch {}
    setQuebrados((q) => new Set(q).add(id));
  }, [demoAtivo]);

  const atual = moduloAtual(MODULOS);
  const iProx = proximaAula(atual, feitas);
  const totalAulas = MODULOS.reduce((a, x) => a + x.aulas.length, 0);
  const totalFeitas = MODULOS.reduce((a, x) => a + x.feitas, 0);
  const pctCurso = Math.round((totalFeitas / Math.max(1, totalAulas)) * 100);

  const itens: ItemVitrine[] = BIBLIOTECA.map((p) => {
    const acesso = !!p.incluso || (p.tipo === "mentoria" ? mentorado || !!comprados?.has(p.id) : !!comprados?.has(p.id));
    const emDemo = demoAtivo && p.id === "p2";
    const quebrar = emDemo || (acesso && !p.incluso && comprados !== null && !quebrados.has(p.id));
    const preso = !acesso || quebrar;
    const venda = itemPago(p.id);
    const base = { key: p.id, no: p.no, selo: `Produto ${p.no}`, img: p.img, tom: p.tom, sub: p.sub, desc: p.desc, corrente: preso, quebrar };

    if (p.id === "hot-academy") {
      return {
        ...base,
        titulo: p.titulo,
        palavra: "ACADEMY",
        eyebrow: `Produto ${p.no} · incluso na sua assinatura`,
        pct: pctCurso,
        nums: (
          <>
            <span>
              <b>{MODULOS.length}</b> módulos
            </span>
            <span>
              <b>{totalAulas}</b> aulas
            </span>
          </>
        ),
        acoes: (
          <>
            <Link className="hs-vt-btn p" href="/dashboard/aulas?produto=hot-academy">
              ▶ Acessar o curso
            </Link>
            <Link className="hs-vt-btn" href={`/dashboard/aulas/${atual.slug}?aula=${iProx + 1}`}>
              {totalFeitas === 0 ? "Primeira aula" : `Continuar · Mod ${atual.n}`}
            </Link>
          </>
        ),
      };
    }
    if (p.tipo === "mentoria") {
      return {
        ...base,
        titulo: p.titulo,
        palavra: "MÔNACO",
        eyebrow: preso ? `Produto ${p.no} · bloqueado · por aplicação` : `Produto ${p.no} · você é mentorado`,
        acoes: (
          <Link className="hs-vt-btn p" href="/dashboard/mentoria">
            {preso ? "Aplicar para a mentoria" : "▶ Acessar a mentoria"}
          </Link>
        ),
      };
    }
    // Produtos 2, 3 e 4
    return {
      ...base,
      titulo: p.titulo,
      palavra: preso ? "TRAVADO" : p.titulo.toUpperCase(),
      eyebrow: preso ? `Produto ${p.no} · bloqueado` : `Produto ${p.no} · desbloqueado`,
      acoes: !preso ? (
        <span className="hs-vt-btn" aria-disabled="true">
          Conteúdo chegando em breve
        </span>
      ) : venda ? (
        <Link className="hs-vt-btn p" href={`/assinar?item=${venda}`}>
          🔓 Quebrar a corrente · {brl(ITENS_PAGOS[venda].preco)}
        </Link>
      ) : (
        <span className="hs-vt-btn" aria-disabled="true">
          🔒 Em breve
        </span>
      ),
    };
  });

  const inicial = desbloqueado ? BIBLIOTECA.findIndex((p) => p.id === desbloqueado) : demoAtivo ? 1 : -1;
  const liberados = itens.filter((i) => !i.corrente).length;

  return (
    <section className={m("view")} aria-label="Biblioteca">
      <div className={m("top")}>
        <div>
          <h1>Biblioteca</h1>
          <p className={m("sub")}>
            {liberados} de {itens.length} produtos liberados · role para ver cada um
          </p>
        </div>
        <Link className={m("btn btn-p")} href={`/dashboard/aulas/${atual.slug}?aula=${iProx + 1}`}>
          ▶ {totalFeitas === 0 ? "Começar a Hot Academy" : `Continuar · Mod ${atual.n}, aula ${iProx + 1}`}
        </Link>
      </div>
      <Vitrine itens={itens} ativo={Math.min(k, itens.length - 1)} onAtivo={setK} onQuebrou={onQuebrou} rotulo="Produtos" inicial={inicial > 0 ? inicial : undefined} />
    </section>
  );
}

/* ===================== Curso: Hot Academy (módulos) ===================== */

function CursoHotAcademy() {
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
          <Link href="/dashboard/aulas" className={m("sub")} style={{ display: "inline-block", marginBottom: 6, textDecoration: "none" }}>
            ‹ Biblioteca · Produto 01
          </Link>
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
          rotulo="Módulos"
          ativo={kOk}
          onAtivo={setK}
          itens={visiveis.map(({ mod: x }) => {
            const pct = Math.round((x.feitas / x.aulas.length) * 100);
            const lock = x.status === "bloqueado";
            return {
              key: x.slug,
              no: x.n,
              selo: `MOD ${x.n}`,
              palavra: palavraDe(x.t),
              titulo: x.t.split(" · ")[0],
              sub: x.t.includes(" · ") ? x.t.split(" · ").slice(1).join(" · ") : undefined,
              eyebrow: `Módulo ${x.n} · ${x.stop}${x.status === "feito" ? " · ✓ concluído" : x.status === "andamento" ? ` · ${pct}% feito` : ""}`,
              desc: lock ? (x.trava ?? "") : x.desc,
              img: x.img,
              tom: TONS[Number(x.n) % TONS.length] ?? TONS[0],
              apagado: lock,
              pct,
              nums: (
                <>
                  <span>
                    <b>{x.aulas.length}</b> aulas
                  </span>
                  <span>
                    <b>{x.feitas}</b> vistas
                  </span>
                </>
              ),
              acoes: (
                <>
                  {lock ? (
                    <Link className="hs-vt-btn p" href="/dashboard/jornada">
                      Ver requisitos
                    </Link>
                  ) : (
                    <Link className="hs-vt-btn p" href={hrefDe(x)}>
                      ▶ {rotuloDe(x)}
                    </Link>
                  )}
                  <button type="button" className="hs-vt-btn" onClick={() => detalhe.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                    Ver aulas
                  </button>
                </>
              ),
            };
          })}
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
