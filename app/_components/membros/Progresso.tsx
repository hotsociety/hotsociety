"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../_lib/supabase";
import { MISSOES_PLANO, MODULOS, PERFIL_DEMO, type Modulo } from "../../_lib/demo";
import { diasParaFimDoMes, doBanco, modulosDoAluno, nivelDe, type Perfil, type PerfilBanco } from "../../_lib/progresso";

export type Progresso = {
  /** true = números do Supabase; false = exemplo (tabelas ainda não criadas ou erro de conexão) */
  real: boolean;
  perfil: Perfil;
  nivel: number;
  xpProx: number;
  feitas: ReadonlySet<string>;
  modulos: Modulo[];
  avancos: Record<string, number>;
  temporadaFim: string;
  concluirAula: (aulaId: string) => Promise<void>;
  avancarMissao: (missaoId: string) => Promise<{ feito: number; concluiu: boolean }>;
};

const Ctx = createContext<Progresso | null>(null);

export function useProgresso() {
  const p = useContext(Ctx);
  if (!p) throw new Error("useProgresso precisa estar dentro da área de membros (/dashboard).");
  return p;
}

// Dados de exemplo, usados só enquanto as tabelas não existirem no Supabase.
const DEMO_PERFIL: Perfil = {
  passaporte: PERFIL_DEMO.passaporte,
  xp: PERFIL_DEMO.xp,
  coins: PERFIL_DEMO.coins,
  streak: PERFIL_DEMO.streak,
  stopAtual: PERFIL_DEMO.stopAtual,
  faturado: PERFIL_DEMO.faturado,
};
const DEMO_FEITAS = MODULOS.flatMap((m) => m.aulas.slice(0, m.feitas).map((a) => a.id));
const DEMO_AVANCOS = Object.fromEntries(Object.values(MISSOES_PLANO).flat().map((x) => [x.id, x.feito]));
const XP_MISSAO = Object.fromEntries(Object.values(MISSOES_PLANO).flat().map((x) => [x.id, x]));

export function ProgressoProvider({ user, fallback, children }: { user: User; fallback?: ReactNode; children: ReactNode }) {
  const [carregado, setCarregado] = useState(false);
  const [real, setReal] = useState(false);
  const [perfil, setPerfil] = useState<Perfil>(DEMO_PERFIL);
  const [feitas, setFeitas] = useState<ReadonlySet<string>>(() => new Set(DEMO_FEITAS));
  const [avancos, setAvancos] = useState<Record<string, number>>(DEMO_AVANCOS);
  const [temporadaFim, setTemporadaFim] = useState(PERFIL_DEMO.temporadaFim);

  useEffect(() => {
    let vivo = true;
    setTemporadaFim(diasParaFimDoMes(new Date()));
    (async () => {
      const p = await supabase.rpc("garantir_perfil");
      if (p.error || !p.data) {
        // Tabelas ainda não criadas: o site segue com os dados de exemplo.
        console.warn("Progresso: usando dados de exemplo.", p.error?.message);
        if (vivo) setCarregado(true);
        return;
      }
      const [a, mi] = await Promise.all([
        supabase.from("aulas_feitas").select("aula_id"),
        supabase.rpc("minhas_missoes"),
      ]);
      if (!vivo) return;
      setPerfil(doBanco(p.data as PerfilBanco));
      setFeitas(new Set((a.data ?? []).map((r: { aula_id: string }) => r.aula_id)));
      setAvancos(Object.fromEntries(((mi.data ?? []) as { missao_id: string; feito: number }[]).map((r) => [r.missao_id, r.feito])));
      setReal(true);
      setCarregado(true);
    })();
    return () => {
      vivo = false;
    };
  }, [user.id]);

  const concluirAula = useCallback(
    async (aulaId: string) => {
      if (feitas.has(aulaId)) return;
      setFeitas((f) => new Set(f).add(aulaId));
      if (!real) {
        setPerfil((p) => ({ ...p, xp: p.xp + 40, coins: p.coins + 20 }));
        return;
      }
      const { data, error } = await supabase.rpc("concluir_aula", { p_aula: aulaId });
      if (error) {
        console.error("Erro ao salvar aula:", error.message);
        setFeitas((f) => {
          const n = new Set(f);
          n.delete(aulaId);
          return n;
        });
        throw error;
      }
      setPerfil(doBanco(data as PerfilBanco));
    },
    [feitas, real],
  );

  const avancarMissao = useCallback(
    async (missaoId: string) => {
      const mi = XP_MISSAO[missaoId];
      if (!real) {
        const feito = Math.min(mi?.total ?? 1, (avancos[missaoId] ?? 0) + 1);
        const concluiu = !!mi && feito === mi.total && (avancos[missaoId] ?? 0) < mi.total;
        setAvancos((a) => ({ ...a, [missaoId]: feito }));
        if (concluiu) setPerfil((p) => ({ ...p, xp: p.xp + mi.xp }));
        return { feito, concluiu };
      }
      const { data, error } = await supabase.rpc("avancar_missao", { p_missao: missaoId });
      if (error) {
        console.error("Erro ao salvar missão:", error.message);
        throw error;
      }
      const r = data as { feito: number; concluiu: boolean; perfil: PerfilBanco };
      setAvancos((a) => ({ ...a, [missaoId]: r.feito }));
      setPerfil(doBanco(r.perfil));
      return { feito: r.feito, concluiu: r.concluiu };
    },
    [avancos, real],
  );

  const valor = useMemo<Progresso>(() => {
    const { nivel, xpProx } = nivelDe(perfil.xp);
    return {
      real,
      perfil,
      nivel,
      xpProx,
      feitas,
      modulos: modulosDoAluno(feitas, perfil.stopAtual),
      avancos,
      temporadaFim,
      concluirAula,
      avancarMissao,
    };
  }, [real, perfil, feitas, avancos, temporadaFim, concluirAula, avancarMissao]);

  // Evita mostrar números de exemplo piscando antes dos reais.
  if (!carregado) return <>{fallback}</>;
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
