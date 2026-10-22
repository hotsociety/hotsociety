"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Aba = { href: string; t: string };

// Abas do painel com rolagem lateral suave: a rodinha do mouse anda para os lados,
// as pontas escurecem quando há mais abas escondidas e a aba aberta fica sempre à vista.
export default function AbasRolagem({ abas, atual }: { abas: Aba[]; atual: string }) {
  const nav = useRef<HTMLElement>(null);
  const alvo = useRef(0);
  const anim = useRef(0);
  const [pontas, setPontas] = useState({ esq: false, dir: false });

  const medir = () => {
    const el = nav.current;
    if (!el) return;
    setPontas({ esq: el.scrollLeft > 2, dir: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
  };

  // Desliza até `x` com desaceleração suave (ou direto, para quem pede menos movimento).
  const deslizar = (x: number) => {
    const el = nav.current;
    if (!el) return;
    alvo.current = Math.max(0, Math.min(x, el.scrollWidth - el.clientWidth));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.scrollLeft = alvo.current;
      return medir();
    }
    if (anim.current) return;
    const passo = () => {
      const d = alvo.current - el.scrollLeft;
      if (Math.abs(d) < 0.5) {
        el.scrollLeft = alvo.current;
        anim.current = 0;
        return medir();
      }
      el.scrollLeft += d * 0.18;
      medir();
      anim.current = requestAnimationFrame(passo);
    };
    anim.current = requestAnimationFrame(passo);
  };

  useEffect(() => {
    const el = nav.current;
    if (!el) return;
    const roda = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const base = anim.current ? alvo.current : el.scrollLeft;
      const max = el.scrollWidth - el.clientWidth;
      // Nas pontas, deixa a página rolar normalmente.
      if ((delta < 0 && base <= 0) || (delta > 0 && base >= max)) return;
      e.preventDefault();
      deslizar(base + delta * (e.deltaMode === 1 ? 32 : 1.2));
    };
    el.addEventListener("wheel", roda, { passive: false });
    el.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir);
    medir();
    return () => {
      el.removeEventListener("wheel", roda);
      el.removeEventListener("scroll", medir);
      window.removeEventListener("resize", medir);
      cancelAnimationFrame(anim.current);
      anim.current = 0;
    };
  }, []);

  // Traz a aba aberta para o meio.
  useEffect(() => {
    const el = nav.current;
    const ativa = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!el || !ativa) return;
    deslizar(ativa.offsetLeft - (el.clientWidth - ativa.offsetWidth) / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atual]);

  const andar = (lado: 1 | -1) => {
    const el = nav.current;
    if (el) deslizar((anim.current ? alvo.current : el.scrollLeft) + lado * el.clientWidth * 0.7);
  };

  return (
    <div className="hs-pn-tabsw" data-esq={pontas.esq || undefined} data-dir={pontas.dir || undefined}>
      <button type="button" className="hs-pn-tabs-seta esq" aria-label="Ver abas anteriores" tabIndex={-1} onClick={() => andar(-1)}>
        ‹
      </button>
      <nav ref={nav} className="hs-pn-tabs" aria-label="Seções do painel">
        {abas.map((a) => (
          <Link key={a.href} href={a.href} aria-current={atual === a.href ? "page" : undefined}>
            {a.t}
          </Link>
        ))}
      </nav>
      <button type="button" className="hs-pn-tabs-seta dir" aria-label="Ver mais abas" tabIndex={-1} onClick={() => andar(1)}>
        ›
      </button>
    </div>
  );
}
