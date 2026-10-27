"use client";

import "./vitrine.css";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

// Vitrine 3D guiada pela rolagem: cada trecho de rolagem traz o próximo item para o centro.
// O palco fica preso na tela (sticky) enquanto a seção passa; setas, bolinhas e teclado também navegam.
// Serve para a Biblioteca (produtos) e para os módulos de um curso.

const PASSO_VH = 55; // quanto rolar para trocar de item

export type ItemVitrine = {
  key: string;
  no: string; // número curto (bolinha e contador): "01", "00"…
  selo: string; // etiqueta no pôster: "PRODUTO 01", "MOD 03"
  palavra: string; // palavra gigante do fundo
  titulo: string;
  sub?: string;
  eyebrow: string;
  desc: string;
  img: string;
  tom: string; // cor da luz de fundo
  nums?: ReactNode;
  pct?: number; // barra de progresso (0–100)
  acoes: ReactNode;
  apagado?: boolean; // pôster escuro (travado sem corrente)
  corrente?: boolean; // preso por corrente e cadeado
  quebrar?: boolean; // tocar a animação de quebrar a corrente quando chegar ao centro
};

export default function Vitrine({
  itens,
  ativo,
  onAtivo,
  onQuebrou,
  rotulo = "Vitrine",
  inicial,
}: {
  itens: ItemVitrine[];
  ativo: number;
  onAtivo: (k: number) => void;
  onQuebrou?: (key: string) => void;
  rotulo?: string;
  inicial?: number; // abre já posicionada neste item (rola a página até ele)
}) {
  const secao = useRef<HTMLElement>(null);
  const palco = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [quebrando, setQuebrando] = useState<string | null>(null);
  const n = itens.length;
  const ref = useRef({ ativo, onAtivo, n });
  useEffect(() => {
    ref.current = { ativo, onAtivo, n };
  });

  // Rolagem → item ativo.
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

  // Ir para um item = rolar a página até o trecho dele (rolagem e vitrine nunca se desencontram).
  const irPara = useCallback(
    (k: number, instantaneo = false) => {
      const s = secao.current;
      const p = palco.current;
      const alvo = Math.max(0, Math.min(n - 1, k));
      if (!s || !p || n < 2) return onAtivo(alvo);
      const topo = s.getBoundingClientRect().top + window.scrollY;
      const curso = s.offsetHeight - p.offsetHeight;
      const reduz = instantaneo || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      onAtivo(alvo);
      window.scrollTo({ top: topo + (alvo / (n - 1)) * curso + 1, behavior: reduz ? "auto" : "smooth" });
    },
    [n, onAtivo],
  );

  // Abre já no item pedido (ex.: voltou do pagamento de um produto).
  const jaFoi = useRef(false);
  useEffect(() => {
    if (jaFoi.current || inicial === undefined || inicial <= 0) return;
    jaFoi.current = true;
    const t = setTimeout(() => irPara(inicial, true), 120);
    return () => clearTimeout(t);
  }, [inicial, irPara]);

  // Item pago agora: quando chega ao centro, a corrente quebra (uma vez).
  const atualItem = itens[Math.min(ativo, Math.max(0, n - 1))];
  const chaveQuebrar = atualItem?.quebrar ? atualItem.key : null;
  useEffect(() => {
    if (!chaveQuebrar || quebrando) return;
    const t = setTimeout(() => setQuebrando(chaveQuebrar), 450);
    return () => clearTimeout(t);
  }, [chaveQuebrar, quebrando]);
  useEffect(() => {
    if (!quebrando) return;
    const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(
      () => {
        onQuebrou?.(quebrando);
        setQuebrando(null);
      },
      reduz ? 600 : 2600,
    );
    return () => clearTimeout(t);
  }, [quebrando, onQuebrou]);

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
  const atual = atualItem;
  const travado = atual.corrente && quebrando !== atual.key;

  return (
    <section
      ref={secao}
      className="hs-vt"
      style={{ height: `calc(var(--vt-h) + ${(n - 1) * PASSO_VH}vh)`, ["--tom" as string]: atual.tom } as CSSProperties}
      aria-label={rotulo}
    >
      <div
        ref={palco}
        className={"hs-vt-palco" + (quebrando ? " tremendo" : "")}
        tabIndex={0}
        onKeyDown={teclado}
        onPointerMove={mover}
        onPointerLeave={() => setTilt({ x: 0, y: 0 })}
        aria-roledescription="carrossel"
      >
        <div className="hs-vt-luz" aria-hidden="true" />
        <div className="hs-vt-grade" aria-hidden="true" />

        {/* Palavra gigante atrás do pôster */}
        <div className="hs-vt-palavra" aria-hidden="true" key={`p-${atual.key}`}>
          <span>{atual.palavra}</span>
          <span className="eco">{atual.palavra}</span>
        </div>

        {/* Pôsteres em perspectiva */}
        <div className="hs-vt-fila" aria-hidden="true">
          {itens.map((it, k) => {
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
            const q = quebrando === it.key;
            return (
              <button
                key={it.key}
                type="button"
                tabIndex={-1}
                className={"hs-vt-card" + (centro ? " on" : "") + (it.apagado ? " lock" : "") + (it.corrente && !q ? " preso" : "") + (q ? " quebrando" : "")}
                style={st}
                onClick={() => (centro ? undefined : irPara(k))}
              >
                <span className="flutua">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.img} alt="" loading={ad <= 2 ? "eager" : "lazy"} />
                  <span className="brilho" style={centro ? { backgroundPosition: `${50 + tilt.x * 30}% ${50 + tilt.y * 30}%` } : undefined} />
                  <span className="no">{it.selo}</span>
                  <span className="tt">{it.titulo}</span>
                  {q && <span className="hs-vt-carimbo">Desbloqueado</span>}
                </span>
                {(it.corrente || q) && <Corrente quebrando={q} />}
              </button>
            );
          })}
          <span className="hs-vt-chao" />
        </div>

        {/* Texto do item ativo */}
        <div className="hs-vt-info" key={`i-${atual.key}`} aria-live="polite">
          <p className="eb">
            {travado && <CadeadoMini />} {atual.eyebrow}
          </p>
          <h2>
            {atual.titulo}
            {atual.sub && <small>{atual.sub}</small>}
          </h2>
          <p className="desc">{atual.desc}</p>
          {(atual.nums || atual.pct !== undefined) && (
            <div className="nums">
              {atual.nums}
              {atual.pct !== undefined && (
                <span className="barra">
                  <i style={{ width: `${atual.pct}%` }} />
                </span>
              )}
            </div>
          )}
          <div className="acoes">{atual.acoes}</div>
        </div>

        {/* Bolinhas de navegação */}
        <nav className="hs-vt-dots" aria-label={rotulo}>
          {itens.map((it, k) => (
            <button key={it.key} type="button" aria-current={k === ativo || undefined} aria-label={`${it.selo}: ${it.titulo}`} onClick={() => irPara(k)}>
              <span>{it.no}</span>
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
          <button type="button" aria-label="Anterior" disabled={ativo === 0} onClick={() => irPara(ativo - 1)}>
            ‹
          </button>
          <button type="button" aria-label="Próximo" disabled={ativo === n - 1} onClick={() => irPara(ativo + 1)}>
            ›
          </button>
        </div>
        {ativo === 0 && n > 1 && (
          <span className="hs-vt-dica" aria-hidden="true">
            role para ver mais ↓
          </span>
        )}
      </div>
    </section>
  );
}

// Elos de uma corrente na diagonal. Cada elo tem o próprio rumo para voar na quebra.
const ELOS = 13;
function Elos({ lado }: { lado: "a" | "b" }) {
  return (
    <span className={`hs-ct-fio ${lado}`}>
      {Array.from({ length: ELOS }, (_, i) => {
        const meio = i - (ELOS - 1) / 2;
        const dx = (meio * 26 + (lado === "a" ? -1 : 1) * (i % 2 ? 18 : -10)) * (1 + Math.abs(meio) * 0.15);
        const dy = -60 - ((i * 37) % 70);
        const r = ((i * 97) % 300) - 150;
        return (
          <i
            key={i}
            className={i % 2 ? "elo de-lado" : "elo"}
            style={{ ["--dx" as string]: `${dx}px`, ["--dy" as string]: `${dy}px`, ["--r" as string]: `${r}deg`, ["--d" as string]: `${Math.abs(meio) * 25}ms` } as CSSProperties}
          />
        );
      })}
    </span>
  );
}

function Corrente({ quebrando }: { quebrando: boolean }) {
  return (
    <span className={"hs-ct" + (quebrando ? " quebra" : "")} aria-hidden="true">
      <Elos lado="a" />
      <Elos lado="b" />
      <span className="hs-ct-flash" />
      <span className="hs-ct-faiscas">
        {Array.from({ length: 16 }, (_, i) => (
          <i key={i} style={{ ["--a" as string]: `${(i * 360) / 16 + ((i * 13) % 11)}deg`, ["--l" as string]: `${70 + ((i * 29) % 70)}px` } as CSSProperties} />
        ))}
      </span>
      <svg className="hs-ct-cadeado" viewBox="0 0 64 80">
        <defs>
          <linearGradient id="hs-ct-ouro" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFF3C4" />
            <stop offset=".45" stopColor="#E6C978" />
            <stop offset="1" stopColor="#8A6A28" />
          </linearGradient>
        </defs>
        <path className="arco" d="M18 36V24a14 14 0 0 1 28 0v12" fill="none" stroke="url(#hs-ct-ouro)" strokeWidth="7" strokeLinecap="round" />
        <rect x="8" y="34" width="48" height="40" rx="8" fill="url(#hs-ct-ouro)" />
        <rect x="8" y="34" width="48" height="40" rx="8" fill="none" stroke="#5a4518" strokeOpacity=".5" />
        <circle cx="32" cy="50" r="5.5" fill="#2a2010" />
        <path d="M30 53h4l1.5 10h-7z" fill="#2a2010" />
      </svg>
    </span>
  );
}

function CadeadoMini() {
  return (
    <svg width="11" height="12" viewBox="0 0 12 13" aria-hidden="true" style={{ verticalAlign: "-1px" }}>
      <path fill="currentColor" d="M3 6V4.5a3 3 0 0 1 6 0V6h1v7H2V6h1Zm1.5 0h3V4.5a1.5 1.5 0 0 0-3 0V6Z" />
    </svg>
  );
}
