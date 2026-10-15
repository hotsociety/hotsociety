"use client";

import { useState } from "react";
import { m } from "../../_components/membros/proto";
import { FERRAMENTAS, FERRAMENTA_TAG } from "../../_lib/demo";

const FUNIL = [
  ["Perfil", "Orgânico e pago atraem"],
  ["Prévia", "Desperta curiosidade"],
  ["Conversa", "Script e relacionamento"],
  ["Assinatura", "Página e preço"],
  ["Retenção", "Conteúdo e renovação"],
];

export default function Ferramentas() {
  const [atual, setAtual] = useState(FERRAMENTAS[0].id);
  const [busca, setBusca] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);
  const f = FERRAMENTAS.find((x) => x.id === atual)!;
  const q = busca.trim().toLowerCase();
  const itens = f.itens.filter((x) => !q || (x.t + x.texto).toLowerCase().includes(q));

  async function copiar(id: string, texto: string, pre: HTMLElement | null) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(id);
      setTimeout(() => setCopiado((c) => (c === id ? null : c)), 1400);
    } catch {
      // sem permissão de área de transferência: seleciona o texto para o usuário copiar
      if (pre) {
        const r = document.createRange();
        r.selectNodeContents(pre);
        const sel = getSelection();
        sel?.removeAllRanges();
        sel?.addRange(r);
      }
    }
  }

  return (
    <section className={m("view")} aria-label="Ferramentas">
      <div className={m("top")}>
        <div>
          <h1>Ferramentas</h1>
          <p className={m("sub")}>Material pronto para copiar e usar hoje.</p>
        </div>
      </div>

      <div className={m("tools")}>
        {FERRAMENTAS.map((x) => (
          <button
            key={x.id}
            type="button"
            className={m("tool")}
            aria-pressed={atual === x.id}
            onClick={() => {
              setAtual(x.id);
              setBusca("");
            }}
          >
            <span className={m("ic")}>{x.n}</span>
            <b>{x.t}</b>
            <small>{x.d}</small>
            <span className={m("ct")}>{x.qtd.toUpperCase()}</span>
          </button>
        ))}
      </div>

      <div className={m("card")} style={{ display: "grid", gap: 14 }}>
        <div className={m("split")}>
          <h2 style={{ margin: 0 }}>{f.t}</h2>
          <label htmlFor="tsearch" style={{ position: "absolute", left: -9999 }}>
            Buscar
          </label>
          <input
            id="tsearch"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar nesta ferramenta"
            style={{
              minHeight: 40,
              borderRadius: 6,
              border: "1px solid var(--line2)",
              background: "var(--s2)",
              color: "var(--neve)",
              padding: "0 12px",
              minWidth: 0,
              flex: "0 1 260px",
            }}
          />
        </div>
        <div className={m("items")}>
          {f.id === "funil" && (
            <div className={m("flow")}>
              {FUNIL.map(([b, t]) => (
                <div key={b}>
                  <b>{b}</b>
                  {t}
                </div>
              ))}
            </div>
          )}
          {itens.map((x) => (
            <div key={x.id} className={m("it")}>
              <div className={m("split")}>
                <b>{x.t}</b>
                <div className={m("row")}>
                  {FERRAMENTA_TAG[x.id] && <span className={m("tag")}>{FERRAMENTA_TAG[x.id]}</span>}
                  <button
                    className={m("copy")}
                    type="button"
                    onClick={(e) => copiar(x.id, x.texto, e.currentTarget.closest(`.${m("it")}`)?.querySelector("pre") ?? null)}
                  >
                    {copiado === x.id ? "Copiado ✓" : "Copiar"}
                  </button>
                </div>
              </div>
              <pre>{x.texto}</pre>
            </div>
          ))}
          {!itens.length && <p className={m("sub")}>Nada encontrado nesta ferramenta.</p>}
        </div>
      </div>
    </section>
  );
}
