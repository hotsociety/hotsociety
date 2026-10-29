"use client";

// Vitrine de insígnias (Conquistas): todas as insígnias, liberadas em cor e bloqueadas em cinza, com o quanto falta.
import { useEffect, useState } from "react";
import { CATEGORIAS, INSIGNIAS, destaque, liberadas, type Metricas } from "../../../_lib/insignias";
import { supabase } from "../../../_lib/supabase";
import { Insignia, InsigniasNome } from "./Insignia";

const NUM = new Intl.NumberFormat("pt-BR");

// Métricas reais do aluno (rota, missões concluídas, capital comprovado); "reserva" enquanto carrega.
export function useMinhasInsignias(reserva: Metricas) {
  const [m, setM] = useState<Metricas | null>(null);
  useEffect(() => {
    let vivo = true;
    supabase.rpc("minhas_insignias").then(({ data }) => {
      const d = data as { stop?: number; faturado?: number; missoes?: number } | null;
      if (vivo && d) setM({ stop: Number(d.stop ?? 0), faturado: Number(d.faturado ?? 0), missoes: Number(d.missoes ?? 0) });
    });
    return () => {
      vivo = false;
    };
  }, []);
  return m ?? reserva;
}

export default function VitrineInsignias({ m }: { m: Metricas }) {
  const ok = liberadas(m);
  const valor = (cat: string) => (cat === "rota" ? m.stop : cat === "missoes" ? m.missoes : m.faturado);
  const falta = (cat: string, min: number) => {
    const f = min - valor(cat);
    if (cat === "missoes") return `Faltam ${NUM.format(f)} ${f === 1 ? "missão" : "missões"}`;
    if (cat === "capital") return `Faltam R$ ${NUM.format(f)}`;
    return "Avance na rota";
  };

  return (
    <div className="hs-ins-vit">
      <p className="hs-ins-eu">
        Ao lado do seu nome: <InsigniasNome ids={destaque(m)} tamanho={20} />
        <small>{ok.size} de {INSIGNIAS.length} liberadas</small>
      </p>
      {CATEGORIAS.map((c) => (
        <div key={c.cat} className="hs-ins-cat">
          <h3>{c.t}</h3>
          <p>{c.d}</p>
          <ul className="hs-ins-grid">
            {INSIGNIAS.filter((i) => i.cat === c.cat).map((i) => {
              const tem = ok.has(i.id);
              const pct = i.min > 0 ? Math.min(100, Math.round((valor(i.cat) / i.min) * 100)) : 100;
              return (
                <li key={i.id} className={"hs-ins-card" + (tem ? " ok" : "")}>
                  <Insignia id={i.id} tamanho={48} bloqueada={!tem} />
                  <b>{i.nome}</b>
                  <small>{i.regra}</small>
                  {tem ? (
                    <span className="st">Liberada</span>
                  ) : (
                    <>
                      {i.cat !== "rota" && (
                        <span className="hs-ins-prox" aria-hidden>
                          <i style={{ width: `${pct}%` }} />
                        </span>
                      )}
                      <span className="st">{falta(i.cat, i.min)}</span>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
