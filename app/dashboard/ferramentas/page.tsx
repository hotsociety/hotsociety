"use client";

import { useState } from "react";
import Icon from "../../_components/membros/Icon";
import { FERRAMENTAS } from "../../_lib/demo";
import ui from "../../_components/membros/ui.module.css";
import s from "./ferramentas.module.css";

export default function Ferramentas() {
  const [cat, setCat] = useState(FERRAMENTAS[0].id);
  const [busca, setBusca] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);
  const atual = FERRAMENTAS.find((f) => f.id === cat)!;
  const termo = busca.trim().toLowerCase();
  const itens = termo
    ? FERRAMENTAS.flatMap((f) => f.itens).filter((i) => (i.t + " " + i.texto).toLowerCase().includes(termo))
    : atual.itens;

  async function copiar(id: string, texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(id);
      setTimeout(() => setCopiado((c) => (c === id ? null : c)), 1800);
    } catch {
      setCopiado(null);
    }
  }

  return (
    <div className={ui.page}>
      <header className={ui.head}>
        <p className={ui.eyebrow}>Ferramentas</p>
        <h1 className={ui.h1}>
          Pronto para <span className={ui.gold}>copiar.</span>
        </h1>
        <p className={ui.sub}>Prompts, scripts e playbooks testados. Troque o que está entre colchetes e use hoje.</p>
      </header>

      <div className={s.cats}>
        {FERRAMENTAS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={s.cat}
            aria-pressed={!termo && cat === f.id}
            onClick={() => {
              setCat(f.id);
              setBusca("");
            }}
          >
            <span className={s.n}>{f.n}</span>
            <b>{f.t}</b>
            <small>{f.d}</small>
            <span className={ui.badge}>{f.qtd}</span>
          </button>
        ))}
      </div>

      <section className={ui.card} aria-label={termo ? "Resultado da busca" : atual.t}>
        <div className={ui.rowBetween}>
          <h2 className={ui.h2}>{termo ? `Busca: “${busca}”` : atual.t}</h2>
          <label className={s.search}>
            <Icon name="search" size={18} />
            <span className="sr-only">Buscar ferramenta</span>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar" />
          </label>
        </div>

        {itens.length === 0 ? (
          <p className={ui.muted}>Nada encontrado com esse termo.</p>
        ) : (
          <ul className={s.items}>
            {itens.map((i) => (
              <li key={i.id} className={s.item}>
                <div className={ui.rowBetween}>
                  <b>{i.t}</b>
                  <button type="button" className={ui.btnSm} onClick={() => copiar(i.id, i.texto)}>
                    <Icon name={copiado === i.id ? "check" : "copy"} size={16} />
                    {copiado === i.id ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <pre className={s.text}>{i.texto}</pre>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
