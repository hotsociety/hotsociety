// Regras do progresso do aluno (nível, módulos, missões).
// Os números vêm das tabelas perfis / aulas_feitas / missoes_progresso do Supabase.
import { MODULOS, type MissaoPlano, type Modulo } from "./demo";

export type Perfil = {
  passaporte: string;
  xp: number;
  coins: number;
  streak: number;
  stopAtual: number; // 0 GRU · 1 SCL · 2 LIS · 3 DXB · 4 JFK · 5 MCM
  faturado: number;
};

export type PerfilBanco = {
  passaporte: string;
  xp: number;
  coins: number;
  streak: number;
  stop_atual: number;
  faturado: number | string;
};

export function doBanco(r: PerfilBanco): Perfil {
  return {
    passaporte: r.passaporte,
    xp: r.xp,
    coins: r.coins,
    streak: r.streak,
    stopAtual: r.stop_atual,
    faturado: Number(r.faturado),
  };
}

// Cada nível pede 350 XP.
export const XP_POR_NIVEL = 350;
export function nivelDe(xp: number) {
  const nivel = 1 + Math.floor(xp / XP_POR_NIVEL);
  return { nivel, xpProx: nivel * XP_POR_NIVEL };
}

// Módulo travado até o aluno chegar nesta escala da rota (índice do ROUTE).
const LIBERA_EM: Record<string, number> = {};

// Junta o conteúdo dos módulos com as aulas que o aluno já assistiu.
export function modulosDoAluno(feitas: ReadonlySet<string>, stopAtual: number): Modulo[] {
  return MODULOS.map((m) => {
    const trava = LIBERA_EM[m.slug];
    if (trava !== undefined && stopAtual < trava) return { ...m, status: "bloqueado", feitas: 0 };
    const n = m.aulas.filter((a) => feitas.has(a.id)).length;
    const status: Modulo["status"] = n === 0 ? "novo" : n >= m.aulas.length ? "feito" : "andamento";
    return { ...m, status, feitas: n };
  });
}

// Módulo para "continuar de onde parou": o que está em andamento, senão o primeiro não terminado.
export function moduloAtual(mods: Modulo[]) {
  return (
    mods.find((m) => m.status === "andamento") ??
    mods.find((m) => m.status === "novo") ??
    mods.find((m) => m.status !== "bloqueado") ??
    mods[0]
  );
}

// Próxima aula ainda não assistida dentro do módulo (índice).
export function proximaAula(m: Modulo, feitas: ReadonlySet<string>) {
  const i = m.aulas.findIndex((a) => !feitas.has(a.id));
  return i === -1 ? m.aulas.length - 1 : i;
}

// Aplica o avanço salvo no banco ao plano de missões.
export function missoesDoAluno(
  plano: Record<"d" | "s" | "m", MissaoPlano[]>,
  avancos: Record<string, number>,
): Record<"d" | "s" | "m", MissaoPlano[]> {
  const ap = (l: MissaoPlano[]) => l.map((x) => ({ ...x, feito: Math.min(x.total, avancos[x.id] ?? 0) }));
  return { d: ap(plano.d), s: ap(plano.s), m: ap(plano.m) };
}

// Dias até o fim do mês (a temporada fecha no último dia).
export function diasParaFimDoMes(agora: Date) {
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
  const d = fim.getDate() - agora.getDate();
  return d === 0 ? "hoje" : d === 1 ? "1 dia" : `${d} dias`;
}
