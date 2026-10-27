"use client";

import "./vitrine.css";
import { memo, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

// Vitrine 3D guiada pela rolagem, com movimento contínuo: a posição acompanha a rolagem
// em tempo real (com inércia suave), sem pular de item em item.
// Serve para a Biblioteca (produtos) e para os módulos de um curso.

const PASSO_VH = 42; // quanto rolar para avançar um item

export type ItemVitrine = {
  key: string;
  no: string; // número curto (bolinha e contador): "01", "00"…
  selo: string; // etiqueta no card: "PRODUTO 01", "MOD 03"
  palavra: string; // palavra gigante do fundo
  titulo: string;
  sub?: string;
  eyebrow: string;
  desc: string;
  img?: string; // sem imagem: card cinza da plataforma com a descrição
  tom: string; // cor neon do item
  nums?: ReactNode;
  pct?: number;
  acoes: ReactNode;
  status?: string; // etiqueta no card cinza ("Liberado", "Bloqueado"…)
  apagado?: boolean;
  corrente?: boolean; // preso por corrente e cadeado
  quebrar?: boolean; // tocar a quebra da corrente quando chegar ao centro
};

const lim = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

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
  inicial?: number;
}) {
  const secao = useRef<HTMLElement>(null);
  const palco = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(0); // posição contínua (0 … n-1)
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [quebrando, setQuebrando] = useState<string | null>(null);
  const n = itens.length;
  const ref = useRef({ ativo, onAtivo, n });
  useEffect(() => {
    ref.current = { ativo, onAtivo, n };
  });

  // Rolagem → posição alvo; a posição exibida persegue o alvo com inércia (fluido, sem trancos).
  useEffect(() => {
    const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let atual = 0;
    let antes = 0;
    let primeira = true;
    const alvoDaRolagem = () => {
      const s = secao.current;
      const p = palco.current;
      const { n } = ref.current;
      if (!s || !p || n < 2) return 0;
      const r = s.getBoundingClientRect();
      const curso = r.height - p.offsetHeight;
      return curso > 0 ? lim(-r.top / curso, 0, 1) * (n - 1) : 0;
    };
    const quadro = (agora: number) => {
      const alvo = alvoDaRolagem();
      // Inércia por tempo (não por quadro): chega no mesmo tempo em qualquer aparelho.
      const dt = antes ? Math.min(100, agora - antes) : 16;
      antes = agora;
      const passo = reduz || primeira ? 1 : 1 - Math.exp(-dt / 110);
      primeira = false;
      atual += (alvo - atual) * passo;
      if (Math.abs(alvo - atual) < 0.001) atual = alvo;
      setPos(atual);
      const k = Math.round(atual);
      if (k !== ref.current.ativo) ref.current.onAtivo(k);
      raf = Math.abs(alvo - atual) > 0.0005 ? requestAnimationFrame(quadro) : 0;
      if (!raf) antes = 0;
    };
    const pedir = () => {
      if (!raf) raf = requestAnimationFrame(quadro);
    };
    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    pedir();
    return () => {
      window.removeEventListener("scroll", pedir);
      window.removeEventListener("resize", pedir);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Ir para um item = rolar a página até o trecho dele.
  const irPara = useCallback(
    (k: number, instantaneo = false) => {
      const s = secao.current;
      const p = palco.current;
      const alvo = lim(k, 0, n - 1);
      if (!s || !p || n < 2) return onAtivo(alvo);
      const topo = s.getBoundingClientRect().top + window.scrollY;
      const curso = s.offsetHeight - p.offsetHeight;
      const reduz = instantaneo || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: topo + (alvo / (n - 1)) * curso + 1, behavior: reduz ? "auto" : "smooth" });
    },
    [n, onAtivo],
  );

  const jaFoi = useRef(false);
  useEffect(() => {
    if (jaFoi.current || inicial === undefined || inicial <= 0) return;
    jaFoi.current = true;
    const t = setTimeout(() => irPara(inicial, true), 120);
    return () => clearTimeout(t);
  }, [inicial, irPara]);

  // Quebra da corrente: quando o item pago fica parado no centro.
  const atualItem = itens[lim(ativo, 0, Math.max(0, n - 1))];
  const parado = Math.abs(pos - ativo) < 0.04;
  const chaveQuebrar = atualItem?.quebrar && parado ? atualItem.key : null;
  useEffect(() => {
    if (!chaveQuebrar || quebrando) return;
    const t = setTimeout(() => setQuebrando(chaveQuebrar), 350);
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
      reduz ? 700 : 2900,
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

        <div className="hs-vt-palavra" aria-hidden="true" key={`p-${atual.key}`}>
          <span>{atual.palavra}</span>
        </div>

        {/* Cards em perspectiva: posição contínua, acompanha a rolagem */}
        <div className="hs-vt-fila" aria-hidden="true">
          {itens.map((it, k) => {
            const d = k - pos;
            const ad = Math.abs(d);
            const perto = Math.max(0, 1 - ad); // 1 no centro, 0 a partir de um passo
            const x = Math.sign(d) * (ad <= 1 ? ad * 60 : 60 + (Math.min(ad, 3) - 1) * 34);
            const st: CSSProperties = {
              transform:
                `translate(-50%,-50%) translateX(${x}%) translateZ(${-ad * 150 + perto * 60}px) ` +
                `rotateY(${-lim(d, -1, 1) * 44 + tilt.x * 10 * perto}deg) rotateX(${-tilt.y * 8 * perto}deg) scale(${1 - Math.min(ad, 3) * 0.07})`,
              opacity: ad > 2.6 ? 0 : ad <= 1 ? 1 - ad * 0.2 : Math.max(0, 0.8 - (ad - 1) * 0.4),
              zIndex: Math.round(100 - ad * 10),
              pointerEvents: ad > 2.2 ? "none" : "auto",
              ["--tomc" as string]: it.tom,
            } as CSSProperties;
            const q = quebrando === it.key;
            const centro = ad < 0.5;
            return (
              <button
                key={it.key}
                type="button"
                tabIndex={-1}
                className={
                  "hs-vt-card" +
                  (centro ? " on" : "") +
                  (it.img ? "" : " cinza") +
                  (it.apagado ? " lock" : "") +
                  (it.corrente && !q ? " preso" : "") +
                  (q ? " quebrando" : "")
                }
                style={st}
                onClick={() => (centro ? undefined : irPara(k))}
              >
                <span className="flutua">
                  {it.img ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.img} alt="" loading={ad <= 2 ? "eager" : "lazy"} />
                      <span className="tt">{it.titulo}</span>
                    </>
                  ) : (
                    <span className="pl">
                      <span className="pl-no">{it.no}</span>
                      <span className="pl-tt">{it.titulo}</span>
                      {it.sub && <span className="pl-sub">{it.sub}</span>}
                      <span className="pl-desc">{it.desc}</span>
                      {it.status && <span className="pl-st">{it.status}</span>}
                    </span>
                  )}
                  <span className="brilho" style={centro ? { backgroundPosition: `${50 + tilt.x * 30}% ${50 + tilt.y * 30}%` } : undefined} />
                  <span className="no">{it.selo}</span>
                  {q && <span className="hs-vt-carimbo">Desbloqueado</span>}
                </span>
                {/* Corrente 3D só nos cards perto do centro; os de longe mostram um cadeado simples (mais leve) */}
                {(it.corrente || q) && (ad < 1.6 || q ? <Corrente quebrando={q} /> : <span className="hs-ct-mini" aria-hidden="true" />)}
              </button>
            );
          })}
          <span className="hs-vt-chao" />
        </div>

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

        <nav className="hs-vt-dots" aria-label={rotulo}>
          {itens.map((it, k) => (
            <button
              key={it.key}
              type="button"
              aria-current={k === ativo || undefined}
              aria-label={`${it.selo}: ${it.titulo}`}
              style={{ ["--tomc" as string]: it.tom } as CSSProperties}
              onClick={() => irPara(k)}
            >
              <span>{it.no}</span>
            </button>
          ))}
        </nav>

        <div className="hs-vt-pe">
          <span className="cont">
            <b>{String(ativo + 1).padStart(2, "0")}</b> / {String(n).padStart(2, "0")}
          </span>
          <span className="trilho">
            <i style={{ width: `${(n > 1 ? pos / (n - 1) : 1) * 100}%` }} />
          </span>
          <button type="button" aria-label="Anterior" disabled={ativo === 0} onClick={() => irPara(ativo - 1)}>
            ‹
          </button>
          <button type="button" aria-label="Próximo" disabled={ativo === n - 1} onClick={() => irPara(ativo + 1)}>
            ›
          </button>
        </div>
        {pos < 0.15 && n > 1 && (
          <span className="hs-vt-dica" aria-hidden="true">
            role para ver mais ↓
          </span>
        )}
      </div>
    </section>
  );
}

/* ===================== Corrente 3D ===================== */

// Cada elo é um anel com espessura (camadas em profundidade). Elos alternados ficam girados 90°,
// encaixados como numa corrente de verdade; a corrente balança em 3D e reflete a luz neon.
const ELOS = 12;
const CAMADAS = [-2.5, 0, 2.5];

function Elo({ i, lado }: { i: number; lado: "a" | "b" }) {
  const meio = i - (ELOS - 1) / 2;
  const dx = meio * 30 + (lado === "a" ? -1 : 1) * (i % 2 ? 26 : -14);
  const dy = -70 - ((i * 37) % 80);
  const dz = 120 + ((i * 53) % 160);
  const r = ((i * 97) % 340) - 170;
  return (
    <span
      className={"elo" + (i % 2 ? " giro" : "")}
      style={{ ["--dx" as string]: `${dx}px`, ["--dy" as string]: `${dy}px`, ["--dz" as string]: `${dz}px`, ["--r" as string]: `${r}deg`, ["--d" as string]: `${Math.abs(meio) * 22}ms` } as CSSProperties}
    >
      {CAMADAS.map((z) => (
        <i key={z} style={{ transform: `translateZ(${z}px)` }} className={z === 0 ? "face" : undefined} />
      ))}
    </span>
  );
}

const Corrente = memo(function Corrente({ quebrando }: { quebrando: boolean }) {
  return (
    <span className={"hs-ct" + (quebrando ? " quebra" : "")} aria-hidden="true">
      {(["a", "b"] as const).map((lado) => (
        <span key={lado} className={`hs-ct-fio ${lado}`}>
          <span className="balanca">
            {Array.from({ length: ELOS }, (_, i) => (
              <Elo key={i} i={i} lado={lado} />
            ))}
          </span>
        </span>
      ))}
      <span className="hs-ct-flash" />
      <span className="hs-ct-faiscas">
        {Array.from({ length: 18 }, (_, i) => (
          <i key={i} style={{ ["--a" as string]: `${(i * 360) / 18 + ((i * 13) % 11)}deg`, ["--l" as string]: `${80 + ((i * 29) % 80)}px` } as CSSProperties} />
        ))}
      </span>
      {/* Cadeado 3D: corpo com espessura e arco que abre na quebra */}
      <span className="hs-ct-cad">
        <span className="gira">
          <span className="arco">
            {CAMADAS.map((z) => (
              <i key={z} style={{ transform: `translateZ(${z * 1.4}px)` }} />
            ))}
          </span>
          <span className="corpo">
            {[-7, -4.5, -2, 0].map((z) => (
              <i key={z} className={z === 0 ? "frente" : undefined} style={{ transform: `translateZ(${z}px)` }} />
            ))}
            <b className="fechadura" />
          </span>
        </span>
      </span>
    </span>
  );
});

function CadeadoMini() {
  return (
    <svg width="11" height="12" viewBox="0 0 12 13" aria-hidden="true" style={{ verticalAlign: "-1px" }}>
      <path fill="currentColor" d="M3 6V4.5a3 3 0 0 1 6 0V6h1v7H2V6h1Zm1.5 0h3V4.5a1.5 1.5 0 0 0-3 0V6Z" />
    </svg>
  );
}
