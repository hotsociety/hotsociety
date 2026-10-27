"use client";

import "./esteira.css";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

// Esteira de cards no estilo streaming: setas com rolagem suave, trackpad / Shift+rodinha
// (nativos do navegador), pontas escurecidas quando há mais itens escondidos e encaixe card a card.
// A rodinha vertical continua rolando a página (não prende o aluno em cima de uma esteira).
export default function Esteira({
  titulo,
  sub,
  acao,
  largo,
  children,
  id,
}: {
  titulo: ReactNode;
  sub?: ReactNode;
  acao?: ReactNode; // algo à direita do título (filtro, link…)
  largo?: "poster" | "wide" | "aula"; // tamanho dos cards
  children: ReactNode;
  id?: string;
}) {
  const trilho = useRef<HTMLDivElement>(null);
  const alvo = useRef(0);
  const anim = useRef(0);
  const [pontas, setPontas] = useState({ esq: false, dir: false });

  const medir = useCallback(() => {
    const el = trilho.current;
    if (!el) return;
    const esq = el.scrollLeft > 2;
    const dir = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    // Só atualiza se mudou: um objeto novo a cada medida re-renderizava sem parar
    // (o efeito abaixo mede a cada render) e travava a navegação para outras abas.
    setPontas((p) => (p.esq === esq && p.dir === dir ? p : { esq, dir }));
  }, []);

  const deslizar = useCallback(
    (x: number) => {
      const el = trilho.current;
      if (!el) return;
      alvo.current = Math.max(0, Math.min(x, el.scrollWidth - el.clientWidth));
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.scrollLeft = alvo.current;
        return medir();
      }
      if (anim.current) return;
      el.style.scrollSnapType = "none"; // o encaixe brigaria com a animação
      const passo = () => {
        const d = alvo.current - el.scrollLeft;
        if (Math.abs(d) < 0.5) {
          el.scrollLeft = alvo.current;
          anim.current = 0;
          el.style.scrollSnapType = "";
          return medir();
        }
        el.scrollLeft += d * 0.16;
        medir();
        anim.current = requestAnimationFrame(passo);
      };
      anim.current = requestAnimationFrame(passo);
    },
    [medir],
  );

  useEffect(() => {
    const el = trilho.current;
    if (!el) return;
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    el.addEventListener("scroll", medir, { passive: true });
    medir();
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", medir);
      cancelAnimationFrame(anim.current);
      anim.current = 0;
    };
  }, [medir]);

  // Itens mudaram (ex.: filtro): mede as pontas de novo.
  useEffect(() => {
    medir();
  });

  const andar = (lado: 1 | -1) => {
    const el = trilho.current;
    if (el) deslizar((anim.current ? alvo.current : el.scrollLeft) + lado * el.clientWidth * 0.8);
  };

  return (
    <section className="hs-est" id={id}>
      <header className="hs-est-h">
        <h2>
          {titulo}
          {sub && <small>{sub}</small>}
        </h2>
        {acao}
      </header>
      <div className="hs-est-w" data-esq={pontas.esq || undefined} data-dir={pontas.dir || undefined}>
        <button type="button" className="hs-est-seta esq" aria-label="Voltar" tabIndex={-1} onClick={() => andar(-1)}>
          ‹
        </button>
        <div ref={trilho} className={`hs-est-sc ${largo ?? "poster"}`}>
          {children}
        </div>
        <button type="button" className="hs-est-seta dir" aria-label="Avançar" tabIndex={-1} onClick={() => andar(1)}>
          ›
        </button>
      </div>
    </section>
  );
}
