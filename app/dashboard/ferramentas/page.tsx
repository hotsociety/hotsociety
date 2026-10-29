"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Icon from "../../_components/membros/Icon";
import { FERRAMENTAS, FUNIL, camposDe, type ItemFerramenta } from "../../_lib/ferramentas";
import "./ferramentas.css";

const FAV = "hs-ferramentas-fav";

function lerFav(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(FAV) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// Destaca os campos [ASSIM] no texto.
function ComCampos({ t }: { t: string }) {
  const partes = t.split(/(\[[^\]]+\])/g);
  return (
    <>
      {partes.map((p, i) => (/^\[[^\]]+\]$/.test(p) ? <mark key={i}>{p}</mark> : <Fragment key={i}>{p}</Fragment>))}
    </>
  );
}

export default function Ferramentas() {
  const [atual, setAtual] = useState(FERRAMENTAS[0].id);
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState("Todos");
  const [fav, setFav] = useState<string[]>([]);
  useEffect(() => setFav(lerFav()), []);

  const f = FERRAMENTAS.find((x) => x.id === atual)!;
  const cats = useMemo(() => ["Todos", ...new Set(f.itens.map((x) => x.cat))], [f]);
  const q = busca.trim().toLowerCase();
  const itens = f.itens.filter(
    (x) =>
      (cat === "Todos" || (cat === "★ Favoritos" ? fav.includes(x.id) : x.cat === cat)) &&
      (!q || (x.t + x.texto + x.cat).toLowerCase().includes(q)),
  );
  const favDaFerramenta = f.itens.filter((x) => fav.includes(x.id)).length;

  function alternarFav(id: string) {
    setFav((v) => {
      const n = v.includes(id) ? v.filter((x) => x !== id) : [...v, id];
      try {
        localStorage.setItem(FAV, JSON.stringify(n));
      } catch {}
      return n;
    });
  }

  return (
    <section className="hs-fr" aria-label="Ferramentas">
      <header className="hs-fr-head">
        <p className="hs-fr-eyebrow">Arsenal</p>
        <h1>
          Ferramentas <span>prontas.</span>
        </h1>
        <p className="hs-fr-sub">Copie, preencha os campos em dourado e use hoje. Tudo sem nudez e dentro das regras das plataformas.</p>
      </header>

      <div className="hs-fr-tools" role="tablist" aria-label="Ferramentas">
        {FERRAMENTAS.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={atual === x.id}
            className="hs-fr-tool"
            onClick={() => {
              setAtual(x.id);
              setBusca("");
              setCat("Todos");
            }}
          >
            <span className="hs-fr-ic">
              <Icon name={x.icon as never} size={20} />
            </span>
            <span className="hs-fr-n">{x.n}</span>
            <b>{x.t}</b>
            <small>{x.d}</small>
            <span className="hs-fr-ct">
              {x.itens.length} {x.itens.length === 1 ? x.unidade[0] : x.unidade[1]}
            </span>
          </button>
        ))}
      </div>

      <div className="hs-fr-painel" role="tabpanel">
        <div className="hs-fr-ptop">
          <div>
            <h2>{f.t}</h2>
            <p>
              {itens.length} de {f.itens.length} {f.unidade[1]}
              {favDaFerramenta > 0 && ` · ${favDaFerramenta} nos favoritos`}
            </p>
          </div>
          <label className="hs-fr-busca">
            <Icon name="search" size={16} />
            <span className="sr-only">Buscar nesta ferramenta</span>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nesta ferramenta" />
          </label>
        </div>

        <div className="hs-fr-cats" role="group" aria-label="Filtrar por categoria">
          {[...cats, ...(favDaFerramenta ? ["★ Favoritos"] : [])].map((c) => (
            <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>

        {f.id === "funil" && cat === "Todos" && !q && (
          <ol className="hs-fr-flow">
            {FUNIL.map(([b, t], i) => (
              <li key={b}>
                <span>{i + 1}</span>
                <b>{b}</b>
                <small>{t}</small>
              </li>
            ))}
          </ol>
        )}

        <div className="hs-fr-itens">
          {itens.map((x) => (
            <Item key={x.id} x={x} fav={fav.includes(x.id)} onFav={() => alternarFav(x.id)} />
          ))}
          {!itens.length && <p className="hs-fr-vazio">Nada encontrado nesta ferramenta.</p>}
        </div>
      </div>
    </section>
  );
}

function Item({ x, fav, onFav }: { x: ItemFerramenta; fav: boolean; onFav: () => void }) {
  const campos = useMemo(() => camposDe(x.texto), [x.texto]);
  const [abrir, setAbrir] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [copiado, setCopiado] = useState(false);
  const final = campos.reduce((t, c) => (vals[c]?.trim() ? t.split(c).join(vals[c].trim()) : t), x.texto);
  const preenchidos = campos.filter((c) => vals[c]?.trim()).length;

  async function copiar(el: HTMLElement | null) {
    try {
      await navigator.clipboard.writeText(final);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1400);
    } catch {
      // sem permissão: seleciona o texto para copiar na mão
      if (el) {
        const r = document.createRange();
        r.selectNodeContents(el);
        const sel = getSelection();
        sel?.removeAllRanges();
        sel?.addRange(r);
      }
    }
  }

  return (
    <article className={"hs-fr-it" + (fav ? " fav" : "")}>
      <div className="hs-fr-ith">
        <span className="hs-fr-tag">{x.cat}</span>
        <b>{x.t}</b>
        <button type="button" className="hs-fr-star" aria-pressed={fav} aria-label={fav ? "Tirar dos favoritos" : "Salvar nos favoritos"} onClick={onFav}>
          {fav ? "★" : "☆"}
        </button>
      </div>
      <pre>
        <ComCampos t={final} />
      </pre>
      {x.dica && (
        <p className="hs-fr-dica">
          <Icon name="spark" size={14} />
          {x.dica}
        </p>
      )}
      {abrir && campos.length > 0 && (
        <div className="hs-fr-campos">
          {campos.map((c) => (
            <label key={c}>
              <span>{c.slice(1, -1).toLowerCase()}</span>
              <input value={vals[c] ?? ""} onChange={(e) => setVals((v) => ({ ...v, [c]: e.target.value }))} placeholder={c.slice(1, -1)} />
            </label>
          ))}
        </div>
      )}
      <div className="hs-fr-acoes">
        {campos.length > 0 && (
          <button type="button" className="hs-fr-sec" aria-expanded={abrir} onClick={() => setAbrir((v) => !v)}>
            <Icon name="note" size={15} />
            {abrir ? "Fechar campos" : `Preencher ${campos.length} ${campos.length === 1 ? "campo" : "campos"}`}
            {preenchidos > 0 && <em>{preenchidos}</em>}
          </button>
        )}
        <button
          type="button"
          className={"hs-fr-copy" + (copiado ? " ok" : "")}
          onClick={(e) => copiar(e.currentTarget.closest("article")?.querySelector("pre") ?? null)}
        >
          <Icon name={copiado ? "check" : "copy"} size={15} />
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
    </article>
  );
}
