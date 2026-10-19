"use client";

import { useEffect, useState } from "react";
import { ROUTE } from "../../_lib/site";

type Linha = { pos: number; nome: string; escala: number; xp: number; eu: boolean };

const NUM = new Intl.NumberFormat("pt-BR");

// Ranking real da temporada (top 5 + sua posição). Vem da função ranking_temporada do banco.
export default function Ranking({ classes }: { classes: { lista: string; pos: string; nome: string; badge: string; xp: string; eu: string; vazio: string } }) {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);

  useEffect(() => {
    let vivo = true;
    import("../../_lib/supabase").then(({ supabase }) =>
      supabase.rpc("ranking_temporada").then(({ data, error }) => {
        if (vivo) setLinhas(error ? [] : ((data ?? []) as Linha[]));
      }),
    );
    return () => {
      vivo = false;
    };
  }, []);

  if (linhas === null) return <p className={classes.vazio}>Carregando ranking…</p>;
  if (linhas.length === 0) return <p className={classes.vazio}>O ranking aparece assim que os primeiros alunos ganharem XP.</p>;

  return (
    <ol className={classes.lista}>
      {linhas.map((r) => (
        <li key={r.pos} className={r.eu ? classes.eu : undefined}>
          <span className={classes.pos}>{String(r.pos).padStart(2, "0")}</span>
          <span className={classes.nome}>{r.eu ? "Você" : r.nome}</span>
          <span className={classes.badge}>{ROUTE[r.escala]?.code ?? "GRU"}</span>
          <span className={classes.xp}>{NUM.format(r.xp)}</span>
        </li>
      ))}
    </ol>
  );
}
