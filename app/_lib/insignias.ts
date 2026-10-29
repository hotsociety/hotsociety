// Insígnias da gamificação: liberadas por métricas e mostradas ao lado do nome.
//  · Rota (bandeiras): cada país alcançado na rota (perfis.stop_atual, mesma ordem de ROUTE em site.ts).
//  · Missões (dinheiro e cartões): total de missões concluídas.
//  · Capital comprovado (veículos): faturamento verificado (perfis.faturado).
// Ao lado do nome aparece só a maior de cada categoria (até 3). A vitrine completa fica em Conquistas.
// As regras daqui precisam bater com public.hs_insignias (migração 20261029020000_insignias.sql).

export type Categoria = "rota" | "missoes" | "capital";
export type Insignia = { id: string; cat: Categoria; nome: string; regra: string; min: number };

export const INSIGNIAS: Insignia[] = [
  { id: "br", cat: "rota", nome: "Brasil", regra: "Ativou o passaporte", min: 0 },
  { id: "cl", cat: "rota", nome: "Chile", regra: "Chegou ao Chile (R$ 10 mil verificados)", min: 1 },
  { id: "pt", cat: "rota", nome: "Lisboa", regra: "Chegou a Lisboa (R$ 50 mil verificados)", min: 2 },
  { id: "ae", cat: "rota", nome: "Dubai", regra: "Chegou a Dubai (R$ 100 mil verificados)", min: 3 },
  { id: "us", cat: "rota", nome: "Nova York", regra: "Chegou a Nova York (R$ 500 mil verificados)", min: 4 },
  { id: "mc", cat: "rota", nome: "Mônaco", regra: "Chegou a Mônaco (R$ 1 milhão verificado)", min: 5 },

  { id: "m1", cat: "missoes", nome: "Primeira nota", regra: "1 missão concluída", min: 1 },
  { id: "m10", cat: "missoes", nome: "Maço de notas", regra: "10 missões concluídas", min: 10 },
  { id: "m50", cat: "missoes", nome: "Cartão Azul", regra: "50 missões concluídas", min: 50 },
  { id: "m100", cat: "missoes", nome: "Cartão Gold", regra: "100 missões concluídas", min: 100 },
  { id: "m300", cat: "missoes", nome: "Cartão Black", regra: "300 missões concluídas", min: 300 },

  { id: "c1k", cat: "capital", nome: "Honda Civic", regra: "R$ 1 mil de capital comprovado", min: 1_000 },
  { id: "c10k", cat: "capital", nome: "Audi TT Roadster", regra: "R$ 10 mil de capital comprovado", min: 10_000 },
  { id: "c50k", cat: "capital", nome: "Porsche GT3 RS", regra: "R$ 50 mil de capital comprovado", min: 50_000 },
  { id: "c100k", cat: "capital", nome: "Iate", regra: "R$ 100 mil de capital comprovado", min: 100_000 },
  { id: "c500k", cat: "capital", nome: "Helicóptero", regra: "R$ 500 mil de capital comprovado", min: 500_000 },
  { id: "c1m", cat: "capital", nome: "Jatinho", regra: "R$ 1 milhão de capital comprovado", min: 1_000_000 },
];

export const CATEGORIAS: { cat: Categoria; t: string; d: string }[] = [
  { cat: "rota", t: "Rota", d: "Uma bandeira para cada país que você alcança na rota." },
  { cat: "missoes", t: "Missões", d: "Dinheiro e cartões por missões concluídas." },
  { cat: "capital", t: "Capital comprovado", d: "Carros, iate, helicóptero e jatinho pelo faturamento verificado pelo time." },
];

export const insignia = (id: string) => INSIGNIAS.find((i) => i.id === id) ?? null;

export type Metricas = { stop: number; missoes: number; faturado: number };

// Todas as liberadas (vitrine).
export function liberadas(m: Metricas): Set<string> {
  const ok = new Set<string>();
  for (const i of INSIGNIAS) {
    const v = i.cat === "rota" ? m.stop : i.cat === "missoes" ? m.missoes : m.faturado;
    if (v >= i.min) ok.add(i.id);
  }
  return ok;
}

// A maior de cada categoria (o que aparece ao lado do nome).
export function destaque(m: Metricas): string[] {
  const ok = liberadas(m);
  return (["rota", "missoes", "capital"] as Categoria[])
    .map((c) => INSIGNIAS.filter((i) => i.cat === c && ok.has(i.id)).pop()?.id)
    .filter((x): x is string => !!x);
}
