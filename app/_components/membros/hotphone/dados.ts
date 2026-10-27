// Dados do HOTPHONE (exemplo). Quando existir tabela no Supabase, troque por consultas.

export type Cor = { k: string; n: string; pc: string; pc2: string; pb: string; pb2: string; pt: string; sw: string; premio?: boolean };

export const CORES: Cor[] = [
  { k: "onix", n: "Preto Ônix", pc: "#1b1b1e", pc2: "#4a4a52", pb: "#111113", pb2: "#2c2c31", pt: "#C9A24E", sw: "linear-gradient(135deg,#3a3a40,#0e0e10)" },
  { k: "ouro", n: "Dourado Society", pc: "#B8913F", pc2: "#F1DC9A", pb: "#C9A24E", pb2: "#F1DC9A", pt: "#141416", sw: "linear-gradient(135deg,#F1DC9A,#9C7A33)" },
  { k: "neve", n: "Branco Neve", pc: "#d9d6cf", pc2: "#ffffff", pb: "#ECEAE4", pb2: "#ffffff", pt: "#9C7A33", sw: "linear-gradient(135deg,#ffffff,#cfccc4)" },
  { k: "titanio", n: "Titânio", pc: "#7c7972", pc2: "#b7b3ab", pb: "#8E8B85", pb2: "#b9b5ad", pt: "#141416", sw: "linear-gradient(135deg,#c2beb6,#6b6862)" },
  { k: "carimbo", n: "Vermelho Carimbo", pc: "#6e1c1c", pc2: "#b84040", pb: "#8E2424", pb2: "#b84040", pt: "#F1DC9A", sw: "linear-gradient(135deg,#c24a4a,#5c1515)" },
  // Resgatada na Hot Store com Cappu Coins.
  { k: "dubai", n: "Edição Dubai", pc: "#3b2a12", pc2: "#d9b566", pb: "#2a1e0c", pb2: "#C9A24E", pt: "#F1DC9A", sw: "linear-gradient(135deg,#F1DC9A,#7a5a1e 55%,#1b140a)", premio: true },
];

export const CATEGORIAS = ["Tudo", "Prompts", "Ideias", "Links", "Contatos", "Metas"] as const;
export type Nota = { id: number; c: string; t: string; x: string };

export const COFRE_INICIAL: Nota[] = [
  { id: 1, c: "Prompts", t: "Persona base", x: "Mulher adulta, 25 anos, estilo minimalista, luz natural, retrato de estúdio, fundo neutro. Mesma persona em 3 ângulos." },
  { id: 2, c: "Metas", t: "Meta do mês", x: "Primeira venda até dia 30. 3 posts por dia no orgânico. Live de quinta sem faltar." },
  { id: 3, c: "Links", t: "Planilha de funil", x: "Ferramentas › Funil operacional › mapa do funil" },
  { id: 4, c: "Ideias", t: "Ganchos que funcionaram", x: "1. \"Ninguém te conta isso…\"\n2. Bastidor do dia\n3. Pergunta na legenda" },
];

// Respostas da CappuIA dentro do HOTPHONE (por palavra-chave). A CappuIA completa fica em /dashboard/cappuia.
export const RESPOSTAS: [RegExp, string][] = [
  [/semana|come[cç]/i, "Dia 1: Comece aqui e se apresenta no feed. Dias 2 e 3: módulo 2 e a persona comigo. Dia 4: prepara 9 posts. Dias 5 e 6: 3 posts por dia no orgânico. Dia 7: live de quinta e balanço no # resultados."],
  [/modelo ia|persona|rosto|prompt/i, "Começa pela persona (nome, idade aparente sempre adulta, estilo, história) e cria o rosto do zero com os prompts de Ferramentas. Nada de rosto real nem deepfake, e todo conteúdo leva aviso de IA."],
  [/modelo real|contrato/i, "Antes de qualquer foto: contrato assinado, documento que comprove 18+, consentimento por escrito do que pode ser publicado e a divisão de ganhos definida."],
  [/tr[áa]fego|org[âa]nico|pago/i, "Orgânico primeiro: valida a persona sem queimar dinheiro e sem risco de bloqueio. Pago só quando uma oferta vender todo dia."],
  [/placa|10k|pr[êe]mio|meta/i, "Em Prêmios você anexa os prints do faturamento e o endereço. O time confere em até 5 dias úteis e a placa vai até você."],
];
export const RESPOSTA_PADRAO = "Me fala em qual módulo você está que eu te mostro o caminho exato.";
export const SUGESTOES_IA = ["Monta minha primeira semana", "Como crio a persona?", "Contrato com modelo real", "Orgânico ou pago?"];

export const POSTS_HP: { img: string; sub: string; t: string; ir: string; aula?: boolean }[] = [
  { img: "/img/modulo-02.jpg", sub: "Aula nova · Módulo 02", t: "Criando sua modelo IA: o rosto do zero, sem rosto real.", ir: "/dashboard/aulas/modelos-ia", aula: true },
  { img: "/img/feed/resultado.jpg", sub: "Resultado verificado", t: "Mais um aluno carimbou o Chile. Próxima escala: Lisboa.", ir: "/dashboard/feed" },
  { img: "/img/modulo-03.jpg", sub: "Aula · Módulo 03", t: "Contrato e consentimento antes de qualquer foto.", ir: "/dashboard/aulas/modelo-white", aula: true },
  { img: "/img/placas.jpg", sub: "Prêmios", t: "Cada meta da rota vira placa física na sua casa.", ir: "/dashboard/jornada" },
  { img: "/img/modulo-04.jpg", sub: "Aula · Módulo 04", t: "Orgânico que vende: 3 ganchos que seguram o scroll.", ir: "/dashboard/aulas/trafego-pago", aula: true },
  { img: "/img/hero-neve.jpg", sub: "Recado do Cappu", t: "Não existe nobreza na pobreza. Bora pra cima.", ir: "/dashboard/feed" },
];

export const MISSOES_HP: [string, string, string, number][] = [
  ["m1", "Assistir à próxima aula do seu módulo", "Diária", 100],
  ["m2", "Postar 3 conteúdos no orgânico", "Diária", 150],
  ["m3", "Perguntar algo à CappuIA", "Diária", 30],
  ["m4", "Salvar 1 prompt no Cofre", "Diária", 20],
  ["m5", "Ir na live de quinta", "Semanal", 200],
];

