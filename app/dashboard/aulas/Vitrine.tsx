"use client";

import "./vitrine.css";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { Modulo } from "../../_lib/demo";

// Vitrine 3D guiada pela rolagem: cada trecho de rolagem traz o próximo módulo para o centro.
// O palco fica preso na tela (sticky) enquanto a seção passa; setas, bolinhas e teclado também navegam.

// Brilho de fundo de cada módulo (tons quentes da marca + um contraste por parada).
const TONS = ["#C9A24E", "#D98A3D", "#B5523B", "#8E2F45", "#3E7C86", "#6C8FB8", "#C9A24E", "#4E8F6A", "#B8784E"];
const PASSO_VH = 55; // quanto rolar para trocar de módulo

export type ItemVitrine = { mod: Modulo; i: number };

function palavra(t: string) {
  const p = (t.split(" · ")[0] || t).split(" ");
  return (p[0].length <= 2 && p[1] ? `${p[0]} ${p[1]}` : p[0]).toUpperCase();
}

export default function Vitrine({
  itens,
  ativo,
  onAtivo,
  onVerAulas,
  hrefDe,
  rotuloDe,
}: {
  itens: ItemVitrine[];
  ativo: number; // índice dentro de `itens`
  onAtivo: (k: number) => void;
  onVerAulas: () => void;
  hrefDe: (m: Modulo) => string;
  rotuloDe: (m: Modulo) => string;
}) {
  const secao = useRef<HTMLElement>(null);
  const palco = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const n = itens.length;
  const ref = useRef({ ativo, onAtivo, n });
  useEffect(() => {
    ref.current = { ativo, onAtivo, n };
  });

  // Rolagem → módulo ativo.
  useEffect(() => {
    let raf = 0;
    const ler = () => {
      raf = 0;
      const s = secao.current;
      const p = palco.current;
      const { n, ativo, onAtivo } = ref.current;
      if (!s || !p || n < 2) return;
      const r = s.getBoundingClientRect();
      const curso = r.height - p.offsetHeight;
      if (curso <= 0) return;
      const prog = Math.min(1, Math.max(0, -r.top / curso));
      const k = Math.round(prog * (n - 1));
      if (k !== ativo) onAtivo(k);
    };
    const pedir = () => {
      if (!raf) raf = requestAnimationFrame(ler);
    };
    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    return () => {
      window.removeEventListener("scroll", pedir);
      window.removeEventListener("resize", pedir);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Ir para um módulo = rolar a página até o trecho dele (assim a rolagem e a vitrine nunca se desencontram).
  const irPara = useCallback(
    (k: number) => {
      const s = secao.current;
      const p = palco.current;
      const alvo = Math.max(0, Math.min(n - 1, k));
      if (!s || !p || n < 2) return onAtivo(alvo);
      const topo = s.getBoundingClientRect().top + window.scrollY;
      const curso = s.offsetHeight - p.offsetHeight;
      const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      onAtivo(alvo);
      window.scrollTo({ top: topo + (alvo / (n - 1)) * curso + 1, behavior: reduz ? "auto" : "smooth" });
    },
    [n, onAtivo],
  );

  const teclado = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      irPara(ativo + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      irPara(ativo - 1);
    }
  };

  const mover = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 2, y: ((e.clientY - r.top) / r.height - 0.5) * 2 });
  };

  if (!n) return null;
  const atual = itens[Math.min(ativo, n - 1)].mod;
  const pct = Math.round((atual.feitas / atual.aulas.length) * 100);
  const travado = atual.status === "bloqueado";
  const tom = TONS[Number(atual.n) % TONS.length] ?? TONS[0];

  return (
    <section ref={secao} className="hs-vt" style={{ height: `calc(var(--vt-h) + ${(n - 1) * PASSO_VH}vh)`, ["--tom" as string]: tom } as CSSProperties} aria-label="Vitrine dos módulos">
      <div ref={palco} className="hs-vt-palco" tabIndex={0} onKeyDown={teclado} onPointerMove={mover} onPointerLeave={() => setTilt({ x: 0, y: 0 })} aria-roledescription="carrossel">
        <div className="hs-vt-luz" aria-hidden="true" />
        <div className="hs-vt-grade" aria-hidden="true" />

        {/* Palavra gigante atrás do pôster */}
        <div className="hs-vt-palavra" aria-hidden="true" key={`p-${atual.slug}`}>
          <span>{palavra(atual.t)}</span>
          <span className="eco">{palavra(atual.t)}</span>
        </div>

        {/* Pôsteres em perspectiva */}
        <div className="hs-vt-fila" aria-hidden="true">
          {itens.map(({ mod }, k) => {
            const d = k - ativo;
            const ad = Math.abs(d);
            const centro = d === 0;
            const st: CSSProperties = {
              transform: centro
                ? `translate(-50%,-50%) translateZ(60px) rotateY(${tilt.x * 10}deg) rotateX(${-tilt.y * 8}deg)`
                : `translate(-50%,-50%) translateX(${Math.sign(d) * (58 + (Math.min(ad, 3) - 1) * 34)}%) translateZ(${-ad * 150}px) rotateY(${-Math.sign(d) * 44}deg) scale(${1 - Math.min(ad, 3) * 0.07})`,
              opacity: ad > 2 ? 0 : centro ? 1 : ad === 1 ? 0.8 : 0.45,
              zIndex: 20 - ad,
              pointerEvents: ad > 2 ? "none" : "auto",
            };
            return (
              <button key={mod.slug} type="button" tabIndex={-1} className={"hs-vt-card" + (centro ? " on" : "") + (mod.status === "bloqueado" ? " lock" : "")} style={st} onClick={() => (centro ? undefined : irPara(k))}>
                <span className="flutua">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mod.img} alt="" loading={ad <= 2 ? "eager" : "lazy"} />
                  <span className="brilho" style={centro ? { backgroundPosition: `${50 + tilt.x * 30}% ${50 + tilt.y * 30}%` } : undefined} />
                  <span className="no">MOD {mod.n}</span>
                  <span className="tt">{mod.t.split(" · ")[0]}</span>
                </span>
              </button>
            );
          })}
          <span className="hs-vt-chao" />
        </div>

        {/* Texto do módulo ativo */}
        <div className="hs-vt-info" key={`i-${atual.slug}`} aria-live="polite">
          <p className="eb">
            Módulo {atual.n} · {atual.stop}
            {atual.status === "feito" ? " · ✓ concluído" : atual.status === "andamento" ? ` · ${pct}% feito` : ""}
          </p>
          <h2>
            {atual.t.split(" · ")[0]}
            {atual.t.includes(" · ") && <small>{atual.t.split(" · ").slice(1).join(" · ")}</small>}
          </h2>
          <p className="desc">{travado ? atual.trava : atual.desc}</p>
          <div className="nums">
            <span>
              <b>{atual.aulas.length}</b> aulas
            </span>
            <span>
              <b>{atual.feitas}</b> vistas
            </span>
            <span className="barra">
              <i style={{ width: `${pct}%` }} />
            </span>
          </div>
          <div className="acoes">
            {travado ? (
              <Link className="hs-vt-btn p" href="/dashboard/jornada">
                Ver requisitos
              </Link>
            ) : (
              <Link className="hs-vt-btn p" href={hrefDe(atual)}>
                ▶ {rotuloDe(atual)}
              </Link>
            )}
            <button type="button" className="hs-vt-btn" onClick={onVerAulas}>
              Ver aulas
            </button>
          </div>
        </div>

        {/* Bolinhas de navegação */}
        <nav className="hs-vt-dots" aria-label="Módulos">
          {itens.map(({ mod }, k) => (
            <button key={mod.slug} type="button" aria-current={k === ativo || undefined} aria-label={`Módulo ${mod.n}: ${mod.t}`} onClick={() => irPara(k)}>
              <span>{mod.n}</span>
            </button>
          ))}
        </nav>

        {/* Rodapé: contador, setas e dica de rolagem */}
        <div className="hs-vt-pe">
          <span className="cont">
            <b>{String(ativo + 1).padStart(2, "0")}</b> / {String(n).padStart(2, "0")}
          </span>
          <span className="trilho">
            <i style={{ width: `${((ativo + 1) / n) * 100}%` }} />
          </span>
          <button type="button" aria-label="Módulo anterior" disabled={ativo === 0} onClick={() => irPara(ativo - 1)}>
            ‹
          </button>
          <button type="button" aria-label="Próximo módulo" disabled={ativo === n - 1} onClick={() => irPara(ativo + 1)}>
            ›
          </button>
        </div>
        {ativo === 0 && n > 1 && (
          <span className="hs-vt-dica" aria-hidden="true">
            role para ver os módulos ↓
          </span>
        )}
      </div>
    </section>
  );
}
