// Dados de EXEMPLO da área de membros.
// Tudo que está aqui é fictício e serve para o front ficar navegável.
// Quando cada tabela existir no Supabase, troque a importação na tela
// correspondente pela consulta real. Os tipos já estão prontos para isso.

export type Missao = { id: string; t: string; meta: string; xp: number };
export type Aula = { id: string; t: string };
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
  coins: 4200, // Cappu Coins (pontos de fidelidade, sem valor em dinheiro)
  passaporte: "HS-26-30039",
  stopAtual: 0, // 0 = GRU, 1 = SCL, 2 = LIS, 3 = DXB, 4 = JFK, 5 = MCM
  faturado: 6240, // em reais, verificado pelo gateway
  temporadaFim: "18 dias",
};

export const MISSOES: Record<"diarias" | "semanais" | "mes", Missao[]> = {
  diarias: [
    { id: "d1", t: "Publicar 3 prévias no funil", meta: "15 min · Módulo 04 › Operacional", xp: 120 },
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
  return titulos.map((t, i) => ({ id: `${prefix}-${i + 1}`, t }));
}

export const MODULOS: Modulo[] = [
  {
    slug: "introducao",
    n: "00",
    t: "Introdução · Quem é o Cappu",
    desc: "A história, o método e como tirar o máximo do curso.",
    img: "/img/modulo-01.jpg",
    stop: "GRU",
    status: "novo",
    feitas: 0,
    aulas: aulas("m10", [
      "O inicio do Cappu no HOT (Rafa Martinz explica)",
      "Quem sou eu e como vim parar no HOT",
      "Quem sou eu e como vim parar no HOT pt2",
      "Boas vindas a HOT ACADEMY",
    ]),
  },
  {
    slug: "prospectando-white",
    n: "01",
    t: "Prospectando modelos white",
    desc: "Onde encontrar, como abordar e como fechar parceria com modelos reais, com contrato e consentimento.",
    img: "/img/modulo-03.jpg",
    stop: "GRU",
    status: "novo",
    feitas: 0,
    aulas: aulas("m11", [
      "Levantando caixa com as modelos White pt 1",
      "Levantando caixa com as modelos White pt2",
      "Materiais necessarios para prospectar",
      "Fechando modelo em CALL",
      "Montando o BOT da modelo (sharkbot)",
      "Subindo tráfego nas modelos White - IA",
      "O nicho HOT e suas vertentes",
      "Como ter Closers",
      "Instagram da Agencia e closers para fechar o negócio",
    ]),
  },
  {
    slug: "arte-do-x1",
    n: "02",
    t: "A doce arte do X1",
    desc: "A conversa individual que transforma seguidor em assinante e assinante em cliente fiel.",
    img: "/img/modulo-04.jpg",
    stop: "GRU",
    status: "novo",
    feitas: 0,
    aulas: aulas("m12", [
      "O que é o X1",
      "O que é um Privacy e suas formas de monetizar",
      "Requisitos necessários para ser um Chatter e trabalhar no X1",
      "Chat feminino e masculino o que muda",
      "Explicando o X1 na prática",
      "Como achar modelos para ser chatter pt1",
      "Como achar modelos para ser chatter pt2",
      "Como achar modelos para ser Chatter pt3",
      "Chat ONLY FANS",
    ]),
  },
  {
    slug: "modelos-ia",
    n: "03",
    t: "Modelos de IA",
    desc: "Crie uma modelo de IA do absoluto zero: nicho, consistência de rosto, ferramentas acessíveis e criativos.",
    img: "/img/modulo-02.jpg",
    stop: "SCL",
    status: "novo",
    feitas: 0,
    aulas: aulas("m13", [
      "Criando sua modelo de IA do ABSOLUTO ZERO",
      "Nichando modelo de IA",
      "Como ter acesso as ferramentas mais acessível (DICA DO CAPPU)",
      "Como fazer mais criativos em cima da modelo",
      "Como fazer mais criativos em cima da modelo pt2",
      "Como fazer criativos REALISTAS em cima da Modelo",
      "Como fazer criativos REALISTAS em cima da Modelo pt2",
      "Criando instagram da modelo",
      "Como clonar uma modelo de IA",
      "Limpando metadados",
      "Mineirando modelos de IA e subindo no DR",
      "Aula de 1h mineirando modelos de IA pra subir no DR ou orgânico",
      "Criando modelo de IA do zero com a Voltics",
      "Gerando midias da sua modelo na Voltics",
      "Gerando criativos da sua modelo na Voltics",
      "Gerando criativos da sua modelo na Voltics pt 2",
      "Gerando criativos da sua modelo na Voltics pt3",
      "Criando site e instagram da modelo de IA",
    ]),
  },
  {
    slug: "operacional",
    n: "04",
    t: "Operacional do zero",
    desc: "Telegram, bots, funis, trackeamento e remarketing: a rotina que faz a operação vender todos os dias.",
    img: "/img/modulo-04.jpg",
    stop: "SCL",
    status: "novo",
    feitas: 0,
    aulas: aulas("m14", [
      "Introdução",
      "Criando bots no Telegram",
      "Criação e Configuração de Grupos no Telegram",
      "Elaboração da Esteira de Produtos",
      "Criação de Funil Simplificado Shark",
      "Criação de funil avançado Shark",
      "Configurando trackeamento na Shark",
      "Configurando Cloaker na Shark",
      "Remarketing Shark",
      "Criação de Funil na Apex",
      "Configuração Trackeamento APEX",
      "Configuração Cloaker APEX",
      "Remarketing APEX",
      "Aula Bonus MINEIRANDO OFERTAS + RATARIAS DIGITAL",
    ]),
  },
  {
    slug: "modelo-white",
    n: "05",
    t: "Modelo white",
    desc: "Precificação, Privacy, OnlyFans, Telegram, site e escala com modelos reais, no Brasil e na gringa.",
    img: "/img/modulo-03.jpg",
    stop: "LIS",
    status: "novo",
    feitas: 0,
    aulas: aulas("m15", [
      "O que é modelo white",
      "Como achar modelos pra agenciar",
      "Precificação e oferta MODELO WHITE",
      "Montando estrutura de modelo White com mentorado",
      "Montando Privacy modelo WHITE",
      "Montando Telegram modelo White",
      "Montando Onlyfans modelo WHITE",
      "Montando Site completo pra modelo WHITE",
      "Como escalar uma modelo WHITE Brasil",
      "Como escalar uma modelo WHITE na gringa",
      "Estrutura de modelo MASCULINA",
      "Contratos e repasses",
      "Aula Bônus conclusão e conselhos para quem quer seguir nesse Nicho",
    ]),
  },
  {
    slug: "trafego-pago",
    n: "06",
    t: "Tráfego pago",
    desc: "Anúncios para acelerar o que já funciona no orgânico.",
    img: "/img/modulo-04.jpg",
    stop: "LIS",
    status: "novo",
    feitas: 0,
    aulas: aulas("m16", [
      "Tráfego pago para nicho HOT",
      "Subindo campanhas no tráfego",
      "Criando perfil no Facebook para coleta de público",
    ]),
  },
  {
    slug: "agencia-ofm",
    n: "07",
    t: "Abrindo uma agência OFM",
    desc: "Estrutura, captação, jurídico e contratos para gerenciar várias modelos ao mesmo tempo.",
    img: "/img/modulo-05.jpg",
    stop: "DXB",
    status: "novo",
    feitas: 0,
    aulas: aulas("m17", [
      "O que é uma agência OFM e como funciona tudo",
      "Estruturando sua agência",
      "Como captar modelos diariamente",
      "Juridico e contratos",
    ]),
  },
  {
    slug: "hot-na-gringa",
    n: "08",
    t: "Hot na gringa",
    desc: "Plataformas internacionais, aquecimento de contas, prospecção no X e conversão para vender em dólar.",
    img: "/img/modulo-05.jpg",
    stop: "DXB",
    status: "novo",
    feitas: 0,
    aulas: aulas("m18", [
      "Introdução ao Hot na Gringa - Mindset, potencial de ganho e visão geral",
      "Diferença entre Modelo White x Modelo Black (Non-White)",
      "Configurando a Base - Contas necessárias e onde comprar contas seguras",
      "Criando e Otimizando Conta OnlyFans (gringa)",
      "Privacy + Outras plataformas complementares",
      "Aquecimento de Conta (Warm-up) Como não tomar ban e ganhar confiança",
      "Prospecção no X (Twitter) Estratégia completa",
      "Aplicativos de relacionamento",
      "Conversão - Como transformar visualização em assinatura e pagamento",
      "Fornecedores Confiáveis e Gestão de Risco",
      "(BONUS) Comunidades no Reddit",
    ]),
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
export const CANAIS: { id: string; nome: string; desc: string }[] = [
  { id: "geral", nome: "geral", desc: "Conversa livre da comunidade. Regras ao lado." },
  { id: "duvidas", nome: "dúvidas", desc: "Pergunte sem medo. Marque o módulo e a aula." },
  { id: "resultados", nome: "resultados", desc: "Print de resultado só seu e real." },
  { id: "modelo-ia", nome: "modelo-ia", desc: "Persona, visual e rotina com IA." },
  { id: "modelo-real", nome: "modelo-real", desc: "Operação com modelo real, contrato e gestão." },
  { id: "trafego", nome: "tráfego", desc: "Orgânico, pago e criativos." },
  { id: "apresente-se", nome: "apresente-se", desc: "Chegou agora? Conta quem você é." },
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
  "Regra prática do método: a prévia mostra o contexto e corta antes do ponto alto. Ela vende a curiosidade; o conteúdo fechado entrega.\n\n• Prévia sempre sem nudez: só sugestão e personalidade.\n• Uma chamada clara para assinar em toda prévia.\n• Nunca repita a prévia dentro do conteúdo fechado.\n\nReferência: Módulo 02 · A doce arte do X1.";

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
  { q: "Como comprovo faturamento para subir de país?", a: "Em Prêmios → Comprovar faturamento, envie o extrato ou o relatório da plataforma onde você vende. A equipe confere em até 5 dias e soma o valor ao seu faturamento verificado." },
  { q: "Minha conta na plataforma foi restringida. E agora?", a: "Abra um chamado do tipo \"Conta banida\". Você recebe o checklist de recurso e o passo a passo para voltar a operar." },
  { q: "Como peço reembolso dentro dos 7 dias?", a: "Em Perfil → Acesso e compras → Pedir reembolso. Você recebe um protocolo na hora e o valor volta pelo mesmo meio de pagamento." },
  { q: "Posso assistir pelo celular?", a: "Sim. A plataforma funciona no celular, tablet e computador, com o mesmo login." },
];

/* ===================== Feed estilo rede social ===================== */

export const IMG = {
  cappu: "/img/comandante.jpg",
  cappuia: "/img/feed/cappuia.jpg",
  hero: "/img/hero-neve.jpg",
  placas: "/img/placas.jpg",
  resultado: "/img/feed/resultado.jpg",
  chile: "/img/feed/chile.jpg",
  teleferico: "/img/feed/teleferico.jpg",
  m2: "/img/modulo-02.jpg",
  m4: "/img/modulo-04.jpg",
  // Artes dos produtos (geradas para a marca, sem fotos de terceiros)
  prompts: "/img/produtos/prompts.jpg",
  funil: "/img/produtos/funil.jpg",
  planilha: "/img/produtos/planilha.jpg",
  contrato: "/img/produtos/contrato.jpg",
  consultoria: "/img/produtos/consultoria.jpg",
  moletom: "/img/produtos/moletom.jpg",
  bone: "/img/produtos/bone.jpg",
  mentoria: "/img/produtos/mentoria.jpg",
  academy: "/img/produtos/academy.jpg",
  comunidade: "/img/produtos/comunidade.jpg",
  hotphone: "/img/produtos/hotphone.jpg",
  hotphoneDubai: "/img/produtos/hotphone-dubai.jpg",
  lives: "/img/produtos/lives.jpg",
} as const;

export type StorySlide = { img?: string; h: string; dest?: string; p: string; acao?: [string, string] };
export type Story = { k: string; nome: string; img?: string; simbolo?: boolean; aoVivo?: boolean; autor: string; quando: string; slides: StorySlide[] };

// h = título; o trecho em dest aparece em dourado. acao = [rótulo, destino] (rota ou ação interna).
export const STORIES: Story[] = [
  {
    k: "cappu", nome: "capputin0", img: IMG.cappu, aoVivo: true, autor: "capputin0", quando: "2 h",
    slides: [
      { img: IMG.cappu, h: "Fala,", dest: "passageiro.", p: "Live hoje à noite. Traz suas dúvidas de tráfego." },
      { h: "Live", dest: "quinta 21h", p: "Tráfego pago no nicho sem perder conta.", acao: ["Lembrar da live", "lembrar"] },
      { img: IMG.hero, h: "Não existe", dest: "nobreza na pobreza.", p: "Bora pra cima." },
    ],
  },
  {
    k: "ia", nome: "cappuia", img: IMG.cappuia, autor: "cappuia", quando: "agora",
    slides: [{ img: IMG.cappuia, h: "Travou?", dest: "me chama.", p: "Eu respondo dúvida das aulas 24 horas.", acao: ["Abrir a CappuIA", "/dashboard/cappuia"] }],
  },
  {
    k: "missao", nome: "Missão do dia", simbolo: true, autor: "hotsociety", quando: "hoje",
    slides: [{ h: "Missão do dia:", dest: "+150 XP", p: "Assista à aula 3 do Módulo 03 e comente o que vai aplicar.", acao: ["Aceitar missão", "missao"] }],
  },
  {
    k: "aula", nome: "Aula nova", img: IMG.m2, autor: "hotsociety", quando: "1 h",
    slides: [{ img: IMG.m2, h: "Aula nova no", dest: "Módulo 03", p: "Crie sua modelo de IA do absoluto zero.", acao: ["Assistir aula", "/dashboard/aulas/modelos-ia"] }],
  },
  {
    k: "res", nome: "Resultados", img: IMG.resultado, autor: "hotsociety", quando: "5 h",
    slides: [
      { img: IMG.resultado, h: "Print", dest: "verificado", p: "Resultado de aluno, conferido pelo time." },
      { img: IMG.chile, h: "Mais um no", dest: "Chile.", p: "Rota GRU → SCL concluída." },
    ],
  },
  {
    k: "placas", nome: "Placas", img: IMG.placas, autor: "hotsociety", quando: "ontem",
    slides: [{ img: IMG.placas, h: "Cada meta,", dest: "uma placa.", p: "Faturamento verificado, placa na sua casa.", acao: ["Ver Prêmios", "/dashboard/jornada"] }],
  },
];

export type Post = {
  id: string;
  u: string; // @ do autor
  verificado?: boolean;
  sub: string;
  tipo: "aula" | "img" | "carrossel" | "missao" | "enquete" | "frase" | "texto";
  img?: string;
  quadrado?: boolean;
  tag?: string;
  dur?: string;
  likes: number;
  com: number;
  legenda?: string;
  texto?: string;
  quando: string;
  seguir?: boolean;
  abrir?: string; // rota ao tocar na mídia
  cta?: [string, string];
};

export const POSTS: Post[] = [
  { id: "p1", u: "hotsociety", verificado: true, sub: "Aula nova · Módulo 03", tipo: "aula", img: IMG.m2, tag: "Aula 1 · Módulo 03", dur: "12:40", likes: 1284, com: 86, legenda: "O rosto da sua modelo do zero: persona, estilo e os primeiros prompts. Sem rosto real, sem deepfake.", quando: "há 1 hora", abrir: "/dashboard/aulas/modelos-ia" },
  { id: "p2", u: "hotsociety", verificado: true, sub: "Missão do dia", tipo: "missao", likes: 980, com: 44, quando: "há 2 horas" },
  { id: "p3", u: "gui.moraes", sub: "Conquista · Chile · SCL", tipo: "img", img: IMG.resultado, quadrado: true, tag: "Carimbo do Chile", likes: 642, com: 41, legenda: "Bati os 10K verificados. Placa a caminho, próxima escala Lisboa. Valeu pela call de quinta, Cappu.", quando: "há 3 horas", seguir: true },
  { id: "p4", u: "hotsociety", verificado: true, sub: "Carrossel · Ferramentas", tipo: "carrossel", likes: 2310, com: 120, legenda: "Salva esse pra quando for criar a persona. Completo em Ferramentas › Prompts de modelo IA.", quando: "há 5 horas" },
  { id: "p5", u: "capputin0", verificado: true, sub: "Enquete", tipo: "enquete", likes: 512, com: 73, quando: "há 6 horas" },
  { id: "p6", u: "hotsociety", verificado: true, sub: "Prêmios", tipo: "img", img: IMG.placas, tag: "Prêmios", likes: 3402, com: 210, legenda: "Cada meta da rota vira placa física na sua casa: 10K, 50K, 100K e 500K. Dubai é a Mentoria High Ticket. Valores são metas, não promessa de ganho.", quando: "ontem", cta: ["Ver Prêmios", "/dashboard/jornada"] },
  { id: "p7", u: "capputin0", verificado: true, sub: "Recado", tipo: "frase", likes: 4120, com: 301, quando: "ontem" },
  { id: "p8", u: "vini.alves", sub: "# resultados", tipo: "img", img: IMG.chile, quadrado: true, tag: "Rota GRU → SCL", likes: 388, com: 22, legenda: "Primeira semana postando 3 por dia no orgânico. Segui o roteiro do módulo 4 e já veio a primeira venda.", quando: "há 2 dias", seguir: true },
  { id: "p9", u: "hotsociety", verificado: true, sub: "Mentoria High Ticket", tipo: "img", img: IMG.hero, tag: "Exclusivo", likes: 1890, com: 95, legenda: "Acompanhamento direto com o Cappu, por aplicação. Turma pequena. É o destino final da rota: Dubai.", quando: "há 2 dias" },
];

export const CARROSSEL = [
  { n: "3", h: "Prompts pra criar o rosto da sua modelo", p: "Arrasta pro lado e salva." },
  { n: "1", h: "Persona antes do rosto", code: "Mulher adulta, 25 anos, estilo minimalista, luz natural, retrato de estúdio, fundo neutro" },
  { n: "2", h: "Consistência", code: "Mesma persona, mesmos traços, 3 ângulos: frente, 3/4 e perfil" },
  { n: "3", h: "Identifique como IA", p: "Todo conteúdo gerado leva o aviso de IA. Regra da Society e das plataformas." },
];

export const ENQUETE = {
  pergunta: "Qual live vocês querem na quinta?",
  opcoes: [
    { id: "a", t: "Tráfego pago sem bloqueio", pct: 46 },
    { id: "b", t: "Funil de recorrência", pct: 31 },
    { id: "c", t: "Bastidores da operação", pct: 23 },
  ],
};

export const COMENTARIOS: [string, string, string][] = [
  ["gui.moraes", "Essa aula mudou minha persona, salvei tudo", "2 h"],
  ["vini.alves", "Alguém testou o prompt 2 com luz de fim de tarde?", "1 h"],
  ["capputin0", "Testa e posta no # resultados que eu comento na live", "45 min"],
  ["pedro.h", "Missão de hoje feita", "20 min"],
];

export const SUGESTOES: [string, string][] = [
  ["prompts.ia", "Prompts e personas"],
  ["trafego.pago", "Anúncios no nicho"],
  ["funil.hs", "Funis e ofertas"],
  ["rafa.souza", "Carimbou o Chile"],
  ["pedro.h", "Segue você"],
];

/* ===================== Missões (com progresso) ===================== */

export type MissaoPlano = { id: string; t: string; meta: string; feito: number; total: number; xp: number; porque?: string };

export const MISSOES_PLANO: Record<"d" | "s" | "m", MissaoPlano[]> = {
  d: [
    { id: "01", t: "Responder 10 conversas com o script novo", meta: "20 min · Ferramentas › Abordagens", feito: 0, total: 1, xp: 80, porque: "Seu gargalo hoje é conversa → venda." },
    { id: "02", t: "Publicar 3 prévias no funil", meta: "15 min · Módulo 04 › Operacional", feito: 2, total: 3, xp: 120 },
    { id: "03", t: "Assistir à próxima aula", meta: "Hot Academy › continue de onde parou", feito: 1, total: 1, xp: 40 },
    { id: "04", t: "Responder uma dúvida no # dúvidas", meta: "5 min · Feed › Canais", feito: 0, total: 1, xp: 30, porque: "Ajudar também dá XP." },
  ],
  s: [
    { id: "S1", t: "Postar 5 Reels de 7 segundos", meta: "Ferramentas › Tráfego orgânico", feito: 3, total: 5, xp: 400 },
    { id: "S2", t: "Fazer 50 abordagens no total", meta: "Ferramentas › Abordagens", feito: 22, total: 50, xp: 500 },
    { id: "S3", t: "Concluir o Módulo 04 até a aula 04", meta: "Operacional do zero", feito: 1, total: 4, xp: 300 },
  ],
  m: [
    { id: "M", t: "Desafio do mês: primeira venda em 30 dias", meta: "Carimbo exclusivo do mês + 1.000 XP", feito: 0, total: 1, xp: 1000, porque: "Só existe neste mês. Não volta." },
  ],
};

// Etiqueta mostrada em cada item das Ferramentas (por id do item).
export const FERRAMENTA_TAG: Record<string, string> = {
  p1: "PERSONA",
  p2: "VISUAL",
  p3: "ROTINA",
  a1: "DIRECT",
  a2: "OBJEÇÃO",
  t1: "PLAYBOOK",
  o1: "ROTINA",
  f1: "MAPA",
};

/* ===================== Hot Store ===================== */

export type Produto = {
  id: string;
  cat: "Digitais" | "Ferramentas" | "Mentoria" | "Merch";
  t: string;
  d: string;
  rs: number | null; // preço em reais (null = sem preço em reais)
  coins?: number; // preço alternativo (ou único) em Cappu Coins
  soCoins?: boolean;
  aplicacao?: boolean; // entra por aplicação, sem carrinho
  img?: string;
  gfx?: string; // grafismo dourado no lugar da foto
  breve?: boolean; // aparece com cadeado e "Em breve", sem resgate
  tag?: string;
};

export const PRODUTOS: Produto[] = [
  { id: "pk", cat: "Digitais", t: "Pack 100 prompts de persona", d: "Personas, cenários e consistência de rosto, prontos para colar.", rs: 47, img: IMG.prompts, tag: "Mais vendido" },
  { id: "fn", cat: "Digitais", t: "Templates de funil", d: "Páginas, sequências e roteiros de recorrência editáveis.", rs: 67, img: IMG.funil },
  { id: "pl", cat: "Ferramentas", t: "Planilha de operação", d: "Metas, custos, ROI por canal e controle de modelos.", rs: 37, img: IMG.planilha },
  { id: "ct", cat: "Ferramentas", t: "Kit contrato e consentimento", d: "Modelos revisáveis por advogado para operar com modelo real.", rs: 57, img: IMG.contrato },
  { id: "cs", cat: "Mentoria", t: "Consultoria 1:1", d: "Uma call de 60 minutos com o time para destravar sua operação.", rs: 497, img: IMG.consultoria },
  { id: "ht", cat: "Mentoria", t: "Mentoria High Ticket", d: "Acompanhamento direto com o Cappu, turma pequena. Por aplicação.", rs: null, img: IMG.mentoria, aplicacao: true },
  { id: "mo", cat: "Merch", t: "Moletom HOT SOCIETY", d: "Preto, bordado dourado, edição da temporada.", rs: 249, coins: 6000, img: IMG.moletom, breve: true },
  { id: "bn", cat: "Merch", t: "Boné HOT SOCIETY", d: "Aba curva, H bordado em dourado.", rs: 129, coins: 3000, img: IMG.bone, breve: true },
  { id: "hp", cat: "Digitais", t: "HOTPHONE Edição Dubai", d: "Cor exclusiva do seu HOTPHONE. Só com Cappu Coins.", rs: null, coins: 2500, soCoins: true, img: IMG.hotphoneDubai },
];

/* ===================== Games ===================== */

export const JOGOS = [
  { k: "quiz", t: "Quiz relâmpago", d: "6 perguntas sobre as aulas, 15 segundos cada.", xp: "até 60 XP", ic: "?" },
  { k: "hook", t: "Gancho ou mico", d: "Esse gancho segura o scroll ou é mico? Você decide.", xp: "até 60 XP", ic: "!" },
  { k: "funil", t: "Monte o funil", d: "Coloque as etapas na ordem certa, o mais rápido possível.", xp: "até 50 XP", ic: "→" },
  { k: "soon", t: "Desafio da persona", d: "Em breve: monte a persona perfeita para cada nicho.", xp: "em breve", ic: "★", soon: true },
] as const;

// [pergunta, opções, índice certo, explicação]
export const QUIZ: [string, string[], number, string][] = [
  ["Qual é o primeiro passo para criar uma modelo IA?", ["Gerar o rosto direto", "Definir a persona", "Comprar tráfego"], 1, "Persona primeiro: nome, idade aparente sempre adulta, estilo e história. O rosto vem depois."],
  ["O que é obrigatório antes de fotografar uma modelo real?", ["Só um combinado no WhatsApp", "Contrato, prova de 18+ e consentimento por escrito", "Nada, se ela topar"], 1, "Contrato assinado, documento que comprove 18+ e consentimento escrito do que pode ser publicado."],
  ["Para quem está começando, qual tráfego vem primeiro?", ["Orgânico", "Pago", "Os dois juntos"], 0, "Orgânico valida a persona sem queimar dinheiro e sem risco de bloqueio."],
  ["Conteúdo feito com IA deve…", ["Fingir ser pessoa real", "Ser identificado como IA", "Usar rosto de famosa"], 1, "Sempre identificado como IA. Nada de rosto real nem deepfake."],
  ["Quanto faturamento verificado carimba o Chile?", ["R$ 1 mil", "R$ 10 mil", "R$ 100 mil"], 1, "R$ 10 mil verificados carimbam o Chile e liberam a placa 10K."],
  ["Qual métrica mostra se a assinatura está saudável?", ["Seguidores", "Cancelamento mensal (churn)", "Curtidas"], 1, "Recorrência vive de retenção: acompanhe quantos cancelam por mês."],
];

// [gancho, 1 = gancho / 0 = mico, explicação]
export const GANCHOS: [string, 0 | 1, string][] = [
  ["“Ninguém te conta isso sobre a primeira semana…”", 1, "Curiosidade + promessa de bastidor. Segura o scroll."],
  ["“Oi gente, tudo bem? Hoje vou falar um pouquinho sobre…”", 0, "Começo lento. Os primeiros 2 segundos precisam de tensão, não de saudação."],
  ["“3 erros que fazem sua persona parecer falsa”", 1, "Número + dor específica. Clássico que funciona."],
  ["“Compra aí que é bom”", 0, "Sem contexto, sem desejo, sem prova. Mico."],
  ["“O print que eu não queria mostrar”", 1, "Quebra de expectativa e bastidor. Gancho forte (só com print real)."],
  ["“Post de hoje é sobre motivação”", 0, "Genérico. Não diz por que a pessoa deveria parar."],
];

export const FUNIL_ETAPAS = ["Conteúdo gratuito no perfil", "Link na bio", "Página da persona", "Assinatura na plataforma", "Upsell de pacote"];


/* ===================== Afiliados ===================== */

export const NIVEIS_AFILIADO = [
  { n: "Tripulante", min: 0, p1: 30, pr: 15, b: "T" },
  { n: "Comissário", min: 5, p1: 35, pr: 15, b: "C" },
  { n: "Piloto", min: 20, p1: 40, pr: 20, b: "P" },
  { n: "Comandante", min: 50, p1: 45, pr: 20, b: "★" },
];

// Comissão por mês (R$), do mais antigo ao mais recente.
export const COMISSAO_MES = [180, 420, 610, 890, 760, 1240, 1580, 1310, 2050, 2380, 2710, 3120];

export type VendaAfiliado = { data: string; cliente: string; plano: "Mensal" | "Anual"; tipo: "1ª venda" | "Renovação"; status: "pago" | "garantia" | "reemb" };
export const VENDAS_AFILIADO: VendaAfiliado[] = [
  { data: "12/10", cliente: "Rafael S.", plano: "Anual", tipo: "1ª venda", status: "garantia" },
  { data: "11/10", cliente: "Gui M.", plano: "Mensal", tipo: "Renovação", status: "pago" },
  { data: "09/10", cliente: "Vini A.", plano: "Mensal", tipo: "1ª venda", status: "pago" },
  { data: "08/10", cliente: "Pedro H.", plano: "Anual", tipo: "1ª venda", status: "pago" },
  { data: "05/10", cliente: "Caio L.", plano: "Mensal", tipo: "1ª venda", status: "reemb" },
  { data: "03/10", cliente: "Davi R.", plano: "Mensal", tipo: "Renovação", status: "pago" },
  { data: "01/10", cliente: "Bruno C.", plano: "Mensal", tipo: "Renovação", status: "pago" },
  { data: "28/09", cliente: "Enzo R.", plano: "Anual", tipo: "1ª venda", status: "pago" },
];

export const CLIQUES_ORIGEM: [string, number][] = [
  ["Instagram", 642],
  ["WhatsApp", 318],
  ["TikTok", 204],
  ["YouTube", 96],
  ["Link direto", 71],
];

export const AFILIADO_DEMO = { disponivel: 1186.35, proximo: "15/10", cliques: 1331, cadastros: 212, vendas: 23, ativos: 19, recorrente: 282.15, nivel: 2 };

/* ===================== Levantar Caixa ===================== */

export type Jogada = { t: string; prazo: "24h" | "48h" | "7 dias"; d: string; passos: string[]; roteiro: string; afiliados?: boolean };
export const JOGADAS: Jogada[] = [
  { t: "Pré-venda de pacote", prazo: "48h", d: "Venda antecipada de um pacote de conteúdo para quem já acompanha a persona.", passos: ["Defina o pacote e a data real de entrega.", "Anuncie nos stories com 3 dias de pré-venda.", "Mande no direct para quem mais interage.", "Entregue no prazo prometido."], roteiro: "Vou liberar um pacote novo no dia [DATA]. Quem garantir na pré-venda até [DATA] paga [PREÇO] em vez de [PREÇO CHEIO]. Quer que eu te mande o link?" },
  { t: "Reativar quem sumiu", prazo: "24h", d: "Mensagem pessoal para quem já comprou e parou. É a venda mais barata que existe.", passos: ["Liste quem comprou nos últimos 90 dias e não renovou.", "Mande mensagem individual, sem copiar e colar em massa.", "Ofereça algo novo, não só desconto."], roteiro: "Oi [NOME], faz tempo! Saiu conteúdo novo essa semana que tem a sua cara. Se quiser voltar, consigo liberar pra você hoje com [CONDIÇÃO]. Bora?" },
  { t: "Oferta de 48 horas", prazo: "48h", d: "Condição especial com prazo real. Abre, divulga e fecha quando disse que ia fechar.", passos: ["Escolha a condição (bônus ou preço) e o horário de fim.", "Avise 3 vezes: abertura, meio e últimas horas.", "Feche no horário. Prazo falso queima sua marca."], roteiro: "Só até [DIA] às [HORA]: quem assinar leva [BÔNUS]. Depois disso volta ao normal, sem prorrogar." },
  { t: "Upgrade para anual", prazo: "7 dias", d: "Quem já paga mensal e gosta do conteúdo costuma topar o anual com vantagem clara.", passos: ["Filtre assinantes mensais há 2 meses ou mais.", "Mostre a conta: quanto economiza no ano.", "Ofereça um bônus exclusivo do anual."], roteiro: "Você já tá comigo há [X] meses. No anual você economiza [VALOR] e ainda leva [BÔNUS]. Quer que eu mude seu plano?" },
  { t: "Afiliação HOT SOCIETY", prazo: "7 dias", d: "Indique a Society para quem quer começar no digital e ganhe na primeira venda e nas renovações.", passos: ["Pegue seu link na aba Afiliados.", "Conte sua experiência real, sem prometer ganho.", "Use o kit de divulgação pronto."], roteiro: "Eu uso a HOT SOCIETY pra organizar minha operação. Se fizer sentido pra você, entra pelo meu link: [LINK]", afiliados: true },
  { t: "Vender um serviço", prazo: "7 dias", d: "Ofereça o que você já sabe fazer: criar persona, montar funil ou editar conteúdo para outros operadores.", passos: ["Escolha 1 serviço que você domina.", "Monte 3 exemplos do seu trabalho.", "Ofereça para 10 pessoas da comunidade com preço fechado."], roteiro: "Tô montando [SERVIÇO] para outros operadores. Entrego em [PRAZO] por [PREÇO]. Te mando exemplos?" },
];

export const PLANO_7_DIAS: [string, string, string, string][] = [
  ["Dia 1", "Definir a meta e o prazo", "Escolher 2 jogadas", "Listar 30 contatos quentes"],
  ["Dia 2", "Montar a oferta", "Gravar 3 stories", "Mandar 10 mensagens"],
  ["Dia 3", "Abrir pré-venda ou oferta", "Mandar mais 10 mensagens", "Registrar entradas"],
  ["Dia 4", "Postar prova real (print seu)", "Responder todo direct", "Pedir indicação a quem comprou"],
  ["Dia 5", "Reativar quem sumiu", "Oferecer upgrade anual", "Registrar entradas"],
  ["Dia 6", "Últimas horas da oferta", "Live ou caixinha de perguntas", "Mandar link de afiliado"],
  ["Dia 7", "Fechar a oferta no horário", "Entregar o que vendeu", "Separar % para tráfego"],
];
