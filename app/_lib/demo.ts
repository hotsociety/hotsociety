// Dados de EXEMPLO da área de membros.
// Tudo que está aqui é fictício e serve para o front ficar navegável.
// Quando cada tabela existir no Supabase, troque a importação na tela
// correspondente pela consulta real. Os tipos já estão prontos para isso.

export type Missao = { id: string; t: string; meta: string; xp: number };
export type Aula = { id: string; t: string; dur: string };
export type Modulo = {
  slug: string;
  n: string;
  t: string;
  desc: string;
  img: string;
  stop: "GRU" | "SCL" | "LIS" | "DXB";
  status: "andamento" | "feito" | "novo" | "bloqueado";
  feitas: number;
  aulas: Aula[];
  trava?: string;
};

export const PERFIL_DEMO = {
  nivel: 7,
  xp: 2140,
  xpProx: 2500,
  streak: 12,
  coins: 340,
  passaporte: "HS-26-30039",
  stopAtual: 0, // 0 = GRU, 1 = SCL, 2 = LIS, 3 = JFK, 4 = MCM, 5 = DXB
  faturado: 6240, // em reais, verificado pelo gateway
  temporadaFim: "18 dias",
};

export const MISSOES: Record<"diarias" | "semanais" | "mes", Missao[]> = {
  diarias: [
    { id: "d1", t: "Publicar 3 prévias no funil", meta: "15 min · Módulo 04", xp: 120 },
    { id: "d2", t: "Responder 10 conversas com o script novo", meta: "20 min · Ferramentas", xp: 80 },
    { id: "d3", t: "Assistir à próxima aula", meta: "12 min · Hot Academy", xp: 40 },
  ],
  semanais: [
    { id: "s1", t: "Testar 2 preços de entrada", meta: "7 dias", xp: 300 },
    { id: "s2", t: "Postar seu resultado em #resultados", meta: "Comunidade", xp: 150 },
  ],
  mes: [{ id: "m1", t: "Primeira venda comprovada", meta: "Carimba o Chile", xp: 1000 }],
};

function aulas(prefix: string, titulos: string[]): Aula[] {
  const dur = ["08:40", "12:30", "06:15", "14:02", "09:48", "11:20", "07:05", "13:37", "10:10"];
  return titulos.map((t, i) => ({ id: `${prefix}-${i + 1}`, t, dur: dur[i % dur.length] }));
}

export const MODULOS: Modulo[] = [
  {
    slug: "comece-aqui",
    n: "01",
    t: "Comece aqui",
    desc: "Como a Society funciona, sua rota e o plano dos primeiros 7 dias.",
    img: "/img/modulo-01.jpg",
    stop: "GRU",
    status: "feito",
    feitas: 4,
    aulas: aulas("m1", ["Boas-vindas a bordo", "Como usar a plataforma", "Sua rota até Dubai", "Plano dos 7 primeiros dias"]),
  },
  {
    slug: "modelo-ia",
    n: "02",
    t: "Criando sua modelo IA",
    desc: "Persona, visual consistente, rotina de conteúdo e as regras do jogo.",
    img: "/img/modulo-02.jpg",
    stop: "GRU",
    status: "andamento",
    feitas: 3,
    aulas: aulas("m2", [
      "Escolhendo o nicho",
      "Construindo a persona",
      "Visual consistente com IA",
      "Rotina de conteúdo",
      "Prévia x conteúdo fechado",
      "Bio, nome e link",
      "Regras e identificação de IA",
      "Checklist de lançamento",
    ]),
  },
  {
    slug: "modelo-real",
    n: "03",
    t: "Operação com modelo real",
    desc: "Contrato, consentimento, divisão de ganhos e gestão da operação.",
    img: "/img/modulo-03.jpg",
    stop: "SCL",
    status: "novo",
    feitas: 0,
    aulas: aulas("m3", [
      "Quem pode participar",
      "Contrato e consentimento",
      "Divisão de ganhos",
      "Produção de conteúdo",
      "Atendimento e chat",
      "Segurança da modelo",
      "Rotina da operação",
    ]),
  },
  {
    slug: "trafego-funil",
    n: "04",
    t: "Tráfego e funil",
    desc: "Orgânico, pago, funil de prévias e conversa que converte.",
    img: "/img/modulo-04.jpg",
    stop: "LIS",
    status: "novo",
    feitas: 0,
    aulas: aulas("m4", [
      "Mapa do funil",
      "Perfis e alcance orgânico",
      "Tráfego pago sem ban",
      "Criativos que param o dedo",
      "Funil de prévias",
      "Scripts de conversa",
      "Precificação",
      "Upsell e retenção",
      "Métricas que importam",
    ]),
  },
  {
    slug: "escala",
    n: "05",
    t: "Escala",
    desc: "Time de chat, várias personas e a rota até os 100K.",
    img: "/img/modulo-05.jpg",
    stop: "DXB",
    status: "bloqueado",
    feitas: 0,
    trava: "Libera ao carimbar o Chile (R$ 10 mil verificados).",
    aulas: aulas("m5", ["Montando o time", "Várias personas", "Processos e SOPs", "Gestão financeira", "Plano 100K", "Encerramento"]),
  },
];

export const RANKING = [
  { pos: 1, nome: "Vini P.", stop: "LIS", xp: 8420, medalhas: 9 },
  { pos: 2, nome: "Gui S.", stop: "SCL", xp: 7980, medalhas: 8 },
  { pos: 3, nome: "Rafa T.", stop: "LIS", xp: 7310, medalhas: 8 },
  { pos: 4, nome: "João B.", stop: "SCL", xp: 6050, medalhas: 6 },
  { pos: 5, nome: "Ana M.", stop: "SCL", xp: 5870, medalhas: 6 },
  { pos: 6, nome: "Leo C.", stop: "GRU", xp: 4410, medalhas: 5 },
  { pos: 7, nome: "Bia R.", stop: "GRU", xp: 3990, medalhas: 4 },
];

export const VITORIAS = [
  { ini: "GS", t: "Gui S. carimbou o Chile", quando: "2 h" },
  { ini: "RT", t: "Rafa T. recebeu a placa 10K", quando: "ontem" },
  { ini: "VP", t: "Vini P. fez 30 dias de sequência", quando: "ontem" },
  { ini: "JB", t: "João B. fez a primeira venda", quando: "2 d" },
];

export const LIVE = {
  dia: "Qui · 20h",
  t: "Revisão de funis dos membros",
  d: "Envie o seu até quarta. Os escolhidos são analisados ao vivo.",
};

export type Medalha = { sigla: string; t: string; d: string; status: "ok" | "perto" | "futuro" };
export const MEDALHAS: Medalha[] = [
  { sigla: "1M", t: "1 mês", d: "Tempo de Society", status: "ok" },
  { sigla: "3M", t: "3 meses", d: "Tempo de Society", status: "ok" },
  { sigla: "6M", t: "6 meses", d: "Faltam 3 meses", status: "futuro" },
  { sigla: "1A", t: "1 ano", d: "Ganha o moletom", status: "futuro" },
  { sigla: "1ª", t: "Primeira venda", d: "Falta pouco", status: "perto" },
  { sigla: "10K", t: "R$ 10 mil", d: "Placa física", status: "futuro" },
  { sigla: "50K", t: "R$ 50 mil", d: "Placa física", status: "futuro" },
  { sigla: "100K", t: "R$ 100 mil", d: "Placa física", status: "futuro" },
];

export const PLACAS = [
  { id: "10K", meta: 10000, t: "Placa 10K", d: "R$ 10 mil faturados" },
  { id: "50K", meta: 50000, t: "Placa 50K", d: "R$ 50 mil faturados" },
  { id: "100K", meta: 100000, t: "Placa 100K", d: "R$ 100 mil faturados" },
];

export type Msg = { id: string; ini: string; nome: string; t: string; quando: string; eu?: boolean };
export const CANAIS: { id: string; nome: string; desc: string; novas: number; msgs: Msg[] }[] = [
  {
    id: "geral",
    nome: "geral",
    desc: "Conversa livre da comunidade. Regras fixadas no topo.",
    novas: 4,
    msgs: [
      { id: "g1", ini: "VP", nome: "Vini P.", t: "Bom dia, Society. Quem vai na live de quinta?", quando: "09:12" },
      { id: "g2", ini: "AM", nome: "Ana M.", t: "Eu! Já mandei meu funil pra análise.", quando: "09:15" },
      { id: "g3", ini: "GS", nome: "Gui S.", t: "Dica: a aula 05 do módulo 02 mudou meu jogo de prévias.", quando: "09:31" },
    ],
  },
  {
    id: "duvidas",
    nome: "dúvidas",
    desc: "Pergunte sem medo. Marque o módulo e a aula.",
    novas: 6,
    msgs: [
      { id: "d1", ini: "LC", nome: "Leo C.", t: "Qual preço de entrada vocês estão testando?", quando: "08:02" },
      { id: "d2", ini: "RT", nome: "Rafa T.", t: "Começa baixo e sobe a cada 50 assinantes. Tá no módulo 04, aula 07.", quando: "08:10" },
    ],
  },
  {
    id: "resultados",
    nome: "resultados",
    desc: "Print de resultado só seu e real.",
    novas: 2,
    msgs: [{ id: "r1", ini: "JB", nome: "João B.", t: "Primeira venda feita! R$ 39,90. Rumo ao Chile.", quando: "ontem" }],
  },
  { id: "modelo-ia", nome: "modelo-ia", desc: "Persona, visual e rotina com IA.", novas: 0, msgs: [] },
  { id: "modelo-real", nome: "modelo-real", desc: "Operação com modelo real, contrato e gestão.", novas: 0, msgs: [] },
  { id: "trafego", nome: "tráfego", desc: "Orgânico, pago e criativos.", novas: 0, msgs: [] },
  { id: "apresente-se", nome: "apresente-se", desc: "Chegou agora? Conta quem você é.", novas: 0, msgs: [] },
];

export const REGRAS = [
  "Nada de conteúdo explícito no chat.",
  "Print de resultado só seu e real.",
  "Sem venda ou spam de links.",
  "Respeito sempre. Banimento sem aviso.",
];

export const IA_MODOS = [
  { id: "tutor", t: "Tutor", d: "Dúvidas das aulas" },
  { id: "persona", t: "Persona", d: "Crie ou refine sua modelo" },
  { id: "legendas", t: "Legendas", d: "Texto pronto para postar" },
  { id: "scripts", t: "Scripts", d: "Conversas que convertem" },
] as const;

export const IA_SUGESTOES: Record<(typeof IA_MODOS)[number]["id"], string[]> = {
  tutor: ["Qual a diferença entre prévia e conteúdo fechado?", "Como precificar a assinatura?", "Minha conta caiu, e agora?"],
  persona: ["Quero uma modelo IA para o nicho fitness", "Me dá 3 nomes e bios", "Monte um calendário de 7 dias"],
  legendas: ["5 legendas para prévia de academia", "Chamada para assinar sem parecer venda"],
  scripts: ["Primeira mensagem para novo assinante", "Como responder quem acha caro"],
};

export const IA_RESPOSTA =
  "Regra prática do método: a prévia mostra o contexto e corta antes do ponto alto. Ela vende a curiosidade; o conteúdo fechado entrega.\n\n• Prévia sempre sem nudez: só sugestão e personalidade.\n• Uma chamada clara para assinar em toda prévia.\n• Nunca repita a prévia dentro do conteúdo fechado.\n\nReferência: Módulo 02 · aula 05.";

export type Ferramenta = { id: string; t: string; texto: string };
export const FERRAMENTAS: { id: string; n: string; t: string; d: string; qtd: string; itens: Ferramenta[] }[] = [
  {
    id: "prompts",
    n: "01",
    t: "Prompts de modelo IA",
    d: "Persona, visual e rotina",
    qtd: "48 prompts",
    itens: [
      { id: "p1", t: "Persona base", texto: "Crie uma persona original, maior de 18 anos, para o nicho [NICHO]. Defina nome, idade, cidade fictícia, rotina, 3 traços de personalidade e o tom de voz. Ela deve ser identificada como IA." },
      { id: "p2", t: "Visual consistente", texto: "Retrato editorial de [DESCRIÇÃO DA PERSONA], luz natural, fundo [CENÁRIO], mesma fisionomia da referência, sem semelhança com pessoas reais." },
      { id: "p3", t: "Rotina de 7 dias", texto: "Monte um calendário de 7 dias de conteúdo para [PERSONA]: 1 post de feed, 3 stories e 1 prévia por dia, com tema e chamada para assinar." },
    ],
  },
  {
    id: "abordagens",
    n: "02",
    t: "Abordagens modelo real",
    d: "Conteúdo sem nudez que vende",
    qtd: "22 scripts",
    itens: [
      { id: "a1", t: "Boas-vindas ao assinante", texto: "Oi, [NOME]! Que bom te ver por aqui. Separei um conteúdo especial pra quem chegou hoje. Me conta: o que te trouxe até mim?" },
      { id: "a2", t: "Resposta para \"tá caro\"", texto: "Entendo! Por isso a assinatura tem o primeiro mês com valor de entrada. Se não curtir, cancela quando quiser. Bora testar?" },
    ],
  },
  {
    id: "trafego-pago",
    n: "03",
    t: "Tráfego pago",
    d: "Estruturas e criativos",
    qtd: "9 playbooks",
    itens: [{ id: "t1", t: "Estrutura de campanha", texto: "1 campanha · 3 conjuntos (interesses, amplo, lookalike) · 3 criativos por conjunto · orçamento igual · avaliar em 72 h." }],
  },
  {
    id: "trafego-organico",
    n: "04",
    t: "Tráfego orgânico",
    d: "Perfis, rotina e alcance",
    qtd: "14 rotinas",
    itens: [{ id: "o1", t: "Rotina diária", texto: "Manhã: 1 reels + 3 stories. Tarde: responder comentários e DMs. Noite: 1 prévia com chamada para o link da bio." }],
  },
  {
    id: "funil",
    n: "05",
    t: "Funil operacional",
    d: "Do perfil ao saque",
    qtd: "1 mapa · 6 checklists",
    itens: [{ id: "f1", t: "Mapa do funil", texto: "Perfil → prévia → link da bio → página de assinatura → boas-vindas → conteúdo fechado → upsell → renovação." }],
  },
];

export const AJUDA_TEMAS = [
  { n: "01", t: "Acesso e login", d: "Senha, e-mail, dispositivos" },
  { n: "02", t: "Pagamento", d: "Pix, cartão, nota, reembolso" },
  { n: "03", t: "Carimbos e placas", d: "Como comprovar faturamento" },
  { n: "04", t: "Conta banida", d: "Plano de recuperação" },
];

export const AJUDA_FAQ = [
  { q: "Como comprovo faturamento para subir de país?", a: "Conecte seu gateway em Jornada → Comprovar. A conferência é automática. Print sozinho entra em revisão manual em até 48 h." },
  { q: "Minha conta na plataforma foi restringida. E agora?", a: "Abra um chamado do tipo \"Conta banida\". Você recebe o checklist de recurso e o passo a passo para voltar a operar." },
  { q: "Como peço reembolso dentro dos 7 dias?", a: "Em Perfil → Assinatura → Pedir reembolso. O valor volta pelo mesmo meio de pagamento." },
  { q: "Posso assistir pelo celular?", a: "Sim. A plataforma funciona no celular, tablet e computador, com o mesmo login." },
];

export const CHAMADOS = [
  { id: "#2481", t: "Comprovação de venda", status: "Em análise", quando: "aberto ontem" },
  { id: "#2310", t: "Acesso ao módulo 02", status: "Resolvido", quando: "03/10" },
];
