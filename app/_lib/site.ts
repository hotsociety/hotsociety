// Conteúdo e configurações da homepage HOT SOCIETY.
// Edite textos, preços e links aqui sem mexer no layout.

export const SITE = {
  name: "HOT SOCIETY",
  slogan: "Embarque no zero. Desembarque no topo.",
  description:
    "Plataforma de assinatura para quem quer faturar no digital com modelo IA ou modelo real: aulas, ferramentas, comunidade e a CappuIA.",
  instagram: "https://instagram.com/capputin0",
  supportEmail: "suporte@hotsociety.com.br",
  cnpj: "00.000.000/0001-00",
  year: 2026,
};

// Links de checkout do gateway. Configure no .env.local:
// NEXT_PUBLIC_CHECKOUT_MENSAL=https://...
// NEXT_PUBLIC_CHECKOUT_ANUAL=https://...
export const CHECKOUT = {
  mensal: process.env.NEXT_PUBLIC_CHECKOUT_MENSAL || "/login?plano=mensal",
  anual: process.env.NEXT_PUBLIC_CHECKOUT_ANUAL || "/login?plano=anual",
};

export const PLANS = [
  {
    id: "anual",
    name: "Anual",
    price: "R$ 999",
    period: "/ano",
    note: "R$ 83,25 por mês · 2 meses grátis",
    badge: "Melhor valor",
    href: CHECKOUT.anual,
    featured: true,
    items: [
      "Hot Academy completa: modelo IA e modelo real",
      "Ferramentas: prompts, abordagens, tráfego e funil",
      "CappuIA e HOTPHONE",
      "Feed, missões, games e ranking",
      "Placas 10K · 50K · 100K",
      "Bônus exclusivos do anual",
    ],
  },
  {
    id: "mensal",
    name: "Mensal",
    price: "R$ 99",
    period: "/mês",
    note: "Renova todo mês · sem fidelidade",
    badge: null,
    href: CHECKOUT.mensal,
    featured: false,
    items: [
      "Hot Academy completa: modelo IA e modelo real",
      "Ferramentas: prompts, abordagens, tráfego e funil",
      "CappuIA e HOTPHONE",
      "Feed, missões, games e ranking",
      "Placas 10K · 50K · 100K",
    ],
  },
] as const;

export const ROUTE = [
  { code: "GRU", country: "Brasil", goal: "Ativou o passaporte", reward: "Medalha Embarque e +500 XP" },
  { code: "SCL", country: "Chile", goal: "R$ 10 mil verificados", reward: "Placa física 10K" },
  { code: "LIS", country: "Lisboa", goal: "R$ 50 mil verificados", reward: "Placa física 50K" },
  { code: "DXB", country: "Dubai", goal: "R$ 100 mil verificados", reward: "Placa física 100K" },
] as const;

export const FEATURES = [
  { t: "Hot Academy", d: "5 módulos, do primeiro passo à escala, com aulas curtas e missões." },
  { t: "Feed da Society", d: "Stories, posts, enquetes e canais para trocar ideia com quem está no mesmo jogo." },
  { t: "CappuIA", d: "Assistente que responde dúvidas das aulas 24 horas por dia." },
  { t: "HOTPHONE", d: "Seu celular dentro da plataforma: CappuIA, cofre de anotações e feed das aulas." },
  { t: "Ferramentas", d: "Prompts, abordagens, tráfego pago e orgânico e funil operacional prontos para copiar." },
  { t: "Missões e games", d: "Missões diárias, quiz e desafios que valem XP para a sua rota." },
  { t: "Levantar caixa", d: "Calculadora de meta, jogadas de 48 horas e plano de 7 dias." },
  { t: "Afiliados", d: "Indique a Society e ganhe na primeira venda e em toda renovação." },
] as const;

export const MODULES = [
  { n: "01", t: "Comece aqui", img: "/img/modulo-01.jpg", lessons: 4 },
  { n: "02", t: "Criando sua modelo IA", img: "/img/modulo-02.jpg", lessons: 8 },
  { n: "03", t: "Operação com modelo real", img: "/img/modulo-03.jpg", lessons: 7 },
  { n: "04", t: "Tráfego e funil", img: "/img/modulo-04.jpg", lessons: 9 },
  { n: "05", t: "Escala", img: "/img/modulo-05.jpg", lessons: 6 },
] as const;

export const FAQ = [
  {
    q: "Preciso aparecer ou mostrar o rosto?",
    a: "Não. Você pode operar com uma modelo criada por IA, sem rosto real, ou com uma modelo real com contrato e consentimento. A Hot Academy ensina os dois caminhos.",
  },
  {
    q: "Quanto vou faturar?",
    a: "Depende do seu trabalho, do seu nicho e do tempo que você dedica. Não prometemos ganho. Os valores de 10K, 50K e 100K são metas da rota, comprovadas com faturamento verificado.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. O cancelamento é feito em 2 cliques na sua conta. Nos primeiros 7 dias você recebe o reembolso integral.",
  },
  {
    q: "Quais são as regras para modelo real e modelo IA?",
    a: "Modelo real só maior de 18 anos, com contrato assinado e consentimento por escrito. Modelo IA sem rosto de pessoa real, sem deepfake e sempre identificada como IA.",
  },
  {
    q: "Como funcionam as placas?",
    a: "Quando você bate a meta com faturamento verificado pelo time, pede a placa na aba Prêmios e ela é enviada para a sua casa.",
  },
  {
    q: "Qual a diferença entre o mensal e o anual?",
    a: "O conteúdo é o mesmo. No anual você paga R$ 999 por ano, o equivalente a R$ 83,25 por mês, ganha 2 meses e bônus exclusivos.",
  },
] as const;
