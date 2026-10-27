"use client";

import { useEffect, useRef, useState } from "react";

// Número que "sobe" até o valor quando aparece na tela (ou muda). Sem animação se o aluno pediu menos movimento.
export default function Contador({ valor, formato, ms = 900 }: { valor: number; formato?: (n: number) => string; ms?: number }) {
  const [n, setN] = useState(0);
  const de = useRef(0);
  const primeira = useRef(true);

  useEffect(() => {
    const parado = typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const inicio = primeira.current ? 0 : de.current;
    primeira.current = false;
    if (parado || inicio === valor) {
      de.current = valor;
      setN(valor);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const passo = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setN(inicio + (valor - inicio) * e);
      if (p < 1) raf = requestAnimationFrame(passo);
      else de.current = valor;
    };
    raf = requestAnimationFrame(passo);
    return () => {
      cancelAnimationFrame(raf);
      de.current = valor;
    };
  }, [valor, ms]);

  const r = Math.round(n);
  return <>{formato ? formato(r) : r}</>;
}
