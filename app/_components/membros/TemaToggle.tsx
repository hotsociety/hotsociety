"use client";

import { useEffect, useState } from "react";

// Botão claro/escuro da área de membros. A escolha fica salva no navegador (o padrão é o escuro).
export type Tema = "escuro" | "claro";
const CHAVE = "hs-tema";

export function lerTema(): Tema {
  try {
    return localStorage.getItem(CHAVE) === "claro" ? "claro" : "escuro";
  } catch {
    return "escuro";
  }
}

export function aplicarTema(t: Tema) {
  document.documentElement.dataset.tema = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "claro" ? "#F5F2EB" : "#0A0A0B");
  try {
    localStorage.setItem(CHAVE, t);
  } catch {}
}

export default function TemaToggle({ className, rotulo = true, tamanho = 20 }: { className?: string; rotulo?: boolean; tamanho?: number }) {
  const [tema, setTema] = useState<Tema>("escuro");
  useEffect(() => setTema(lerTema()), []);
  const claro = tema === "claro";
  const trocar = () => {
    const novo: Tema = claro ? "escuro" : "claro";
    aplicarTema(novo);
    setTema(novo);
  };
  return (
    <button type="button" className={className} onClick={trocar} aria-pressed={claro} title={claro ? "Mudar para o tema escuro" : "Mudar para o tema claro"} aria-label={claro ? "Tema escuro" : "Tema claro"}>
      <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {claro ? (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        )}
      </svg>
      {rotulo && <span>{claro ? "Tema escuro" : "Tema claro"}</span>}
    </button>
  );
}
