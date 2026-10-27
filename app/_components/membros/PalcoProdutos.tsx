"use client";

import "./palco.css";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

// Palco de produtos (referência: vitrine de latinhas flutuando em arco, holofote e pedestal).
// Cada produto é uma "embalagem" vertical com sombreado cilíndrico; o escolhido fica no centro,
// maior e inclinado, sobre o pedestal. Só transform/opacity (leve até em celular).
export type ItemPalco = {
  id: string;
  no: string;
  titulo: string;
  rotulo?: string; // nome curto impresso na embalagem (padrão: título)
  sub: string;
  desc: string;
  req: string; // linha de status/requisito no pedestal
  lib: boolean;
  abrindo?: boolean;
  pct?: number;
  tema: "ouro" | "grafite" | "monaco";
};

export default function PalcoProdutos({
  itens,
  sel,
  onSel,
  onAbrir,
  cadeado,
  acao,
}: {
  itens: ItemPalco[];
  sel: number;
  onSel: (i: number) => void;
  onAbrir: (i: number) => void; // clique no produto do centro / botão do pedestal
  cadeado: (aberto: boolean) => ReactNode;
  acao: string;
}) {
  // Arrastar / deslizar no celular troca de produto (a rodinha continua rolando a página).
  const arrasto = useRef<{ x: number; id: number } | null>(null);
  const n = itens.length;
  const ir = (d: number) => onSel((sel + d + n) % n); // gira em círculo, como a vitrine da referência
  // Distância circular até o centro (-2..2 com 5 produtos), para ter produtos dos dois lados.
  const dist = (i: number) => {
    const d = (((i - sel) % n) + n) % n;
    return d > n / 2 ? d - n : d;
  };
  // Quem dá a volta (de uma ponta para a outra) troca de lado sem atravessar o palco.
  const antes = useRef<Record<string, number>>({});
  useEffect(() => {
    itens.forEach((p, i) => (antes.current[p.id] = dist(i)));
  });

  const atual = itens[sel];

  return (
    <section className="hs-pc" aria-label="Seus produtos" aria-roledescription="carrossel">
      <header className="hs-pc-hd">
        <h3>Seus produtos</h3>
        <span>Conclua um para liberar o próximo</span>
      </header>

      <div
        className="hs-pc-palco"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") (e.preventDefault(), ir(1));
          if (e.key === "ArrowLeft") (e.preventDefault(), ir(-1));
          if (e.key === "Enter") onAbrir(sel);
        }}
        onPointerDown={(e) => (arrasto.current = { x: e.clientX, id: e.pointerId })}
        onPointerMove={(e) => {
          const a = arrasto.current;
          if (!a || a.id !== e.pointerId) return;
          const dx = e.clientX - a.x;
          if (Math.abs(dx) > 48) {
            ir(dx < 0 ? 1 : -1);
            arrasto.current = { x: e.clientX, id: e.pointerId };
          }
        }}
        onPointerUp={() => (arrasto.current = null)}
        onPointerLeave={() => (arrasto.current = null)}
      >
        <div className="hs-pc-luz" aria-hidden="true" />
        <div className="hs-pc-chao" aria-hidden="true" />
        <div className="hs-pc-base" aria-hidden="true" />

        {itens.map((p, i) => {
          const d = dist(i);
          const ad = Math.abs(d);
          const salto = Math.abs(d - (antes.current[p.id] ?? d)) > 2;
          const st = { "--d": d, "--ad": ad, zIndex: 20 - ad } as CSSProperties;
          return (
            <button
              key={p.id}
              type="button"
              className={`hs-pc-it t-${p.tema}` + (d === 0 ? " on" : "") + (p.lib ? "" : " trava") + (p.abrindo ? " abrindo" : "") + (ad > 2 ? " longe" : "") + (salto ? " salto" : "")}
              style={st}
              aria-label={`${p.no} · ${p.titulo}${p.lib ? "" : " (travado)"}`}
              aria-current={d === 0}
              tabIndex={-1}
              onClick={() => (d === 0 ? onAbrir(i) : onSel(i))}
            >
              <span className="hs-pc-flut" style={{ animationDelay: `${-i * 0.9}s` }}>
                <span className="hs-pc-lata">
                  <span className="hs-pc-tampa" />
                  <span className="hs-pc-marca">HOT SOCIETY</span>
                  <span className="hs-pc-no">{p.no}</span>
                  {(!p.lib || p.abrindo) && <span className="hs-pc-cad">{cadeado(!!p.abrindo)}</span>}
                  <Rotulo txt={p.rotulo ?? p.titulo} />
                  <span className="hs-pc-fx" />
                  {p.abrindo && <span className="hs-pc-selo">Liberado</span>}
                </span>
              </span>
              <span className="hs-pc-sombra" />
            </button>
          );
        })}

        <button type="button" className="hs-pc-seta esq" aria-label="Produto anterior" onClick={() => ir(-1)}>
          ‹
        </button>
        <button type="button" className="hs-pc-seta dir" aria-label="Próximo produto" onClick={() => ir(1)}>
          ›
        </button>
      </div>

      {/* Pedestal: nome e status do produto do centro */}
      <div className="hs-pc-info" key={atual.id} aria-live="polite">
        <p className="hs-pc-eb">
          Produto {atual.no} · {atual.sub}
        </p>
        <h4>{atual.titulo}</h4>
        <p className="hs-pc-desc">{atual.desc}</p>
        {typeof atual.pct === "number" && (
          <span className="hs-pc-barra">
            <i style={{ width: `${atual.pct}%` }} />
          </span>
        )}
        <p className={"hs-pc-req" + (atual.lib ? " ok" : "")}>{atual.req}</p>
        <button type="button" className="hs-pc-cta" onClick={() => onAbrir(sel)}>
          {acao}
        </button>
        <div className="hs-pc-dots" role="tablist" aria-label="Escolher produto">
          {itens.map((p, i) => (
            <button key={p.id} type="button" role="tab" aria-selected={i === sel} aria-label={p.titulo} className={i === sel ? "on" : ""} onClick={() => onSel(i)} />
          ))}
        </div>
      </div>
    </section>
  );
}

// Nome na embalagem, na vertical: até 6 letras numa linha, senão quebra em duas; a fonte encolhe para caber.
function Rotulo({ txt }: { txt: string }) {
  const pal = txt.toUpperCase().split(/\s+/);
  const linhas = txt.length <= 6 || pal.length < 2 ? [pal.join(" ")] : [pal.slice(0, Math.ceil(pal.length / 2)).join(" "), pal.slice(Math.ceil(pal.length / 2)).join(" ")];
  const maior = Math.max(...linhas.map((l) => l.length));
  const tam = Math.min(0.24, 1.4 / maior);
  return (
    <span className="hs-pc-nome" style={{ fontSize: `calc(var(--lw) * ${tam.toFixed(3)})` }}>
      {linhas.map((l) => (
        <span key={l}>{l}</span>
      ))}
    </span>
  );
}
