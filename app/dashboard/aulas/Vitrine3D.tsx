"use client";

import "./vitrine3d.css";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Corrente } from "./Vitrine";

// Biblioteca no formato "página de produto 3D":
// 1) seletor em arco: produtos flutuando, o do centro sobre uma base iluminada (setas, arrastar, teclado);
// 2) ao rolar, o produto escolhido cresce e gira à direita enquanto os destaques passam à esquerda;
// 3) no fim, todos os produtos enfileirados em perspectiva.
// Cada produto é uma caixa 3D cinza (padrão da plataforma) com a descrição na frente.

export type Produto3D = {
  key: string;
  no: string;
  titulo: string;
  sub?: string;
  desc: string;
  tom: string;
  status: string;
  estado: string; // linha pequena acima do nome ("Produto 02 · bloqueado")
  palavra: string; // palavra gigante do fundo na parte que rola
  preso: boolean;
  quebrar?: boolean;
  cta: ReactNode;
  destaques: { k: string; t: string; d: string }[];
};

const lim = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const reduzMov = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- caixa 3D cinza ---------- */
// leve = cadeado simples no canto em vez da corrente 3D (cards de longe e a fila final).
function Caixa({ p, quebrando, grande, leve }: { p: Produto3D; quebrando?: boolean; grande?: boolean; leve?: boolean }) {
  return (
    <span className={"bx-caixa" + (grande ? " grande" : "") + (p.preso && !quebrando ? " preso" : "") + (quebrando ? " quebrando" : "")} style={{ ["--tomc" as string]: p.tom } as CSSProperties}>
      <span className="f bx-fr">
        <span className="selo">Produto {p.no}</span>
        <span className="num">{p.no}</span>
        <span className="tt">{p.titulo}</span>
        {p.sub && <span className="sub">{p.sub}</span>}
        <span className="desc">{p.desc}</span>
        <span className="st">{p.status}</span>
        {quebrando && <span className="hs-vt-carimbo">Desbloqueado</span>}
        {(p.preso || quebrando) && (leve && !quebrando ? <span className="bx-mini" aria-hidden="true" /> : <Corrente quebrando={!!quebrando} />)}
      </span>
      <span className="f bx-tr" />
      <span className="f bx-di" />
      <span className="f bx-es" />
      <span className="f bx-to" />
      <span className="f bx-ba" />
    </span>
  );
}

export default function Vitrine3D({
  produtos,
  inicial = 0,
  onQuebrou,
}: {
  produtos: Produto3D[];
  inicial?: number;
  onQuebrou?: (key: string) => void;
}) {
  const n = produtos.length;
  const [sel, setSel] = useState(lim(inicial, 0, n - 1));
  const [pos, setPos] = useState(sel); // posição animada do arco
  const [quebrando, setQuebrando] = useState<string | null>(null);
  const [prog, setProg] = useState(0); // 0…1 na parte que rola
  const alvo = useRef(sel);
  const arraste = useRef<{ x: number; base: number; mexeu: boolean } | null>(null);
  const arco = useRef<HTMLDivElement>(null);
  const historia = useRef<HTMLElement>(null);
  const topo = useRef<HTMLElement>(null);
  const [sp, setSp] = useState(220); // espaço entre caixas no arco (px)

  // Arco: a posição persegue o alvo com inércia por tempo.
  const raf = useRef(0);
  const posRef = useRef(sel);
  const fimArraste = useRef(0);
  const mudarPos = (v: number) => {
    posRef.current = v;
    setPos(v);
  };
  const animar = useCallback(() => {
    let antes = 0;
    const passo = (agora: number) => {
      const dt = antes ? Math.min(100, agora - antes) : 16;
      antes = agora;
      const k = reduzMov() ? 1 : 1 - Math.exp(-dt / 140);
      let nv = posRef.current + (alvo.current - posRef.current) * k;
      if (Math.abs(alvo.current - nv) < 0.001) nv = alvo.current;
      posRef.current = nv;
      setPos(nv);
      raf.current = nv !== alvo.current ? requestAnimationFrame(passo) : 0;
    };
    if (!raf.current) raf.current = requestAnimationFrame(passo);
  }, []);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const escolher = useCallback(
    (k: number) => {
      const v = lim(k, 0, n - 1);
      alvo.current = v;
      setSel(v);
      animar();
    },
    [n, animar],
  );

  // Pedido de abrir num produto (ex.: voltou do pagamento ou prévia da equipe).
  useEffect(() => {
    if (inicial > 0) escolher(inicial);
  }, [inicial, escolher]);

  // Tamanho do espaço entre caixas conforme a largura.
  useEffect(() => {
    const el = arco.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSp(lim(el.clientWidth * 0.2, 120, 270)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Parte que rola: progresso 0…1 com inércia.
  useEffect(() => {
    let id = 0;
    let atual = 0;
    let antes = 0;
    const ler = () => {
      const s = historia.current;
      if (!s) return 0;
      const r = s.getBoundingClientRect();
      const curso = r.height - window.innerHeight;
      return curso > 0 ? lim(-r.top / curso, 0, 1) : 0;
    };
    const quadro = (agora: number) => {
      const a = ler();
      const dt = antes ? Math.min(100, agora - antes) : 16;
      antes = agora;
      atual += (a - atual) * (reduzMov() ? 1 : 1 - Math.exp(-dt / 120));
      if (Math.abs(a - atual) < 0.0005) atual = a;
      setProg(atual);
      id = Math.abs(a - atual) > 0.0005 ? requestAnimationFrame(quadro) : 0;
      if (!id) antes = 0;
    };
    const pedir = () => {
      if (!id) id = requestAnimationFrame(quadro);
    };
    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    pedir();
    return () => {
      window.removeEventListener("scroll", pedir);
      window.removeEventListener("resize", pedir);
      cancelAnimationFrame(id);
    };
  }, []);

  // Quebra da corrente: produto pago parado no centro do arco.
  const atual = produtos[sel];
  const parado = Math.abs(pos - sel) < 0.02;
  const chave = atual?.quebrar && parado ? atual.key : null;
  useEffect(() => {
    if (!chave || quebrando) return;
    const t = setTimeout(() => setQuebrando(chave), 400);
    return () => clearTimeout(t);
  }, [chave, quebrando]);
  useEffect(() => {
    if (!quebrando) return;
    const t = setTimeout(
      () => {
        onQuebrou?.(quebrando);
        setQuebrando(null);
      },
      reduzMov() ? 700 : 2900,
    );
    return () => clearTimeout(t);
  }, [quebrando, onQuebrou]);

  // Arrastar o arco para os lados.
  const baixo = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    arraste.current = { x: e.clientX, base: posRef.current, mexeu: false };
  };
  const move = (e: React.PointerEvent) => {
    const a = arraste.current;
    if (!a) return;
    const dx = e.clientX - a.x;
    if (Math.abs(dx) > 6) a.mexeu = true;
    if (!a.mexeu) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    mudarPos(lim(a.base - dx / sp, -0.4, n - 0.6));
  };
  const solta = () => {
    const a = arraste.current;
    arraste.current = null;
    if (a?.mexeu) {
      fimArraste.current = Date.now();
      escolher(Math.round(posRef.current));
    }
  };

  const teclado = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      escolher(sel + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      escolher(sel - 1);
    }
  };

  const irParaTopo = (k: number) => {
    escolher(k);
    topo.current?.scrollIntoView({ behavior: reduzMov() ? "auto" : "smooth", block: "start" });
  };

  if (!n || !atual) return null;
  const nD = atual.destaques.length;
  const bloco = Math.min(nD - 1, Math.floor(prog * nD * 0.999));

  return (
    <div className="bx" style={{ ["--tom" as string]: atual.tom } as CSSProperties}>
      {/* ===== 1) Seletor em arco ===== */}
      <section ref={topo} className="bx-hero" aria-label="Escolha o produto">
        <div className="bx-luz" aria-hidden="true" />
        <div
          ref={arco}
          className="bx-arco"
          tabIndex={0}
          onKeyDown={teclado}
          onPointerDown={baixo}
          onPointerMove={move}
          onPointerUp={solta}
          onPointerCancel={solta}
          aria-roledescription="carrossel"
          aria-label="Produtos"
        >
          <span className="bx-feixe" aria-hidden="true" />
          {produtos.map((p, k) => {
            const d = k - pos;
            const ad = Math.abs(d);
            const st: CSSProperties = {
              transform:
                `translate(-50%,-50%) translateX(${d * sp * (1 - Math.min(ad, 3) * 0.06)}px) translateY(${-Math.min(ad, 3) * 14}px) ` +
                `translateZ(${-Math.min(ad, 4) * 190}px) rotateY(${-lim(d, -2.5, 2.5) * 22}deg) rotateZ(${lim(d, -2, 2) * 5}deg) scale(${1 - Math.min(ad, 3) * 0.1})`,
              opacity: ad > 3.4 ? 0 : 1 - Math.max(0, ad - 2) * 0.6,
              zIndex: Math.round(100 - ad * 10),
              filter: ad > 0.5 ? `brightness(${1 - Math.min(ad, 3) * 0.16})` : undefined,
              ["--i" as string]: k,
            } as CSSProperties;
            return (
              <button
                key={p.key}
                type="button"
                className={"bx-item" + (ad < 0.5 ? " on" : "")}
                style={st}
                tabIndex={-1}
                aria-label={`${p.titulo} (${p.status})`}
                onClick={() => Date.now() - fimArraste.current > 250 && ad >= 0.5 && escolher(k)}
              >
                <span className="bx-bob">
                  <Caixa p={p} quebrando={quebrando === p.key} leve={ad >= 0.6} />
                </span>
              </button>
            );
          })}
          <span className="bx-base" aria-hidden="true" />
        </div>

        <div className="bx-nome" key={atual.key} aria-live="polite">
          <p className="eb">{atual.estado}</p>
          <h2>{atual.titulo}</h2>
          {atual.sub && <p className="sub">{atual.sub}</p>}
        </div>
        <div className="bx-ctrl">
          <button type="button" className="bx-seta" aria-label="Produto anterior" disabled={sel === 0} onClick={() => escolher(sel - 1)}>
            ‹
          </button>
          <div className="bx-cta">{atual.cta}</div>
          <button type="button" className="bx-seta" aria-label="Próximo produto" disabled={sel === n - 1} onClick={() => escolher(sel + 1)}>
            ›
          </button>
        </div>
        <div className="bx-pontos" aria-hidden="true">
          {produtos.map((p, k) => (
            <i key={p.key} className={k === sel ? "on" : undefined} style={{ ["--tomc" as string]: p.tom } as CSSProperties} />
          ))}
        </div>
        <span className="bx-dica" aria-hidden="true">
          role para conhecer ↓
        </span>
      </section>

      {/* ===== 2) Parte que rola: produto grande + destaques ===== */}
      <section ref={historia} className="bx-hist" style={{ height: `${100 + nD * 70}vh` }} aria-label={`Sobre ${atual.titulo}`}>
        <div className="bx-cola">
          <div className="bx-hist-luz" aria-hidden="true" />
          <div className="bx-palavra" aria-hidden="true" key={atual.palavra}>
            {atual.palavra}
          </div>
          <div className="bx-grande" aria-hidden="true">
            <span
              className="bx-grande-gira"
              style={{
                transform: `translateY(${(0.5 - prog) * 60}px) rotateY(${-32 + prog * 64}deg) rotateX(${10 - prog * 16}deg) rotateZ(${-6 + prog * 10}deg) scale(${0.92 + Math.sin(prog * Math.PI) * 0.12})`,
              }}
            >
              <Caixa p={atual} grande />
            </span>
          </div>
          <div className="bx-txts">
            {atual.destaques.map((d, k) => (
              <div key={d.t} className={"bx-txt" + (k === bloco ? " on" : k < bloco ? " foi" : "")}>
                <span className="tag">{d.k}</span>
                <h3>{d.t}</h3>
                <p>{d.d}</p>
                {k === nD - 1 && <div className="bx-cta">{atual.cta}</div>}
              </div>
            ))}
          </div>
          <nav className="bx-icones" aria-label="Destaques">
            {atual.destaques.map((d, k) => (
              <span key={d.t} className={k === bloco ? "on" : undefined} title={d.k}>
                {String(k + 1).padStart(2, "0")}
              </span>
            ))}
          </nav>
        </div>
      </section>

      {/* ===== 3) Todos os produtos em fila ===== */}
      <section className="bx-fila" aria-label="Todos os produtos">
        <h2>
          Toda a <span>Biblioteca</span>
        </h2>
        <div className="bx-fila-palco">
          <div className="bx-fila-trilho">
            {produtos.map((p, k) => (
              <button key={p.key} type="button" className="bx-fila-item" style={{ ["--i" as string]: k } as CSSProperties} onClick={() => irParaTopo(k)} aria-label={`Ver ${p.titulo}`}>
                <span className="bx-bob">
                  <Caixa p={p} leve />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
