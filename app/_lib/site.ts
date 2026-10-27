// Conteúdo e configurações da homepage HOT SOCIETY.
// Edite textos, preços e links aqui sem mexer no layout.

export const SITE = {
  name: "HOT SOCIETY",
  slogan: "Embarque no zero. Desembarque no topo.",
  description:
    "Plataforma de assinatura para quem quer faturar no digital com modelo IA ou modelo real: aulas, ferramentas, comunidade e a CappuIA.",
  instagram: "https://instagram.com/capputin0",
  supportEmail: "suporte@hotsociety.com.br",
  // Dados da empresa (obrigatórios pelo Decreto 7.962/2013), mostrados numa linha discreta.
  // Nome empresarial e CNPJ como estão na Receita Federal (MEI).
  razaoSocial: "54.438.333 GUSTAVO R. S.",
  cnpj: "54.438.333/0001-26",
  // Endereço comercial (escritório virtual). Vazio = não aparece no site.
  endereco: "",
  // Encarregado de dados (LGPD art. 41): pode ser o próprio dono.
  // Encarregado de dados (LGPD art. 41). Vazio = atendimento pelo e-mail de privacidade.
  encarregado: "",
  privacidadeEmail: "privacidade@hotsociety.com.br",
  versaoTermos: "2026-10-19",
  year: 2026,
};

// Links de checkout do gateway. Configure no .env.local:
// NEXT_PUBLIC_CHECKOUT_MENSAL=https://...
// NEXT_PUBLIC_CHECKOUT_ANUAL=https://...
export const CHECKOUT = {
  mensal: process.env.NEXT_PUBLIC_CHECKOUT_MENSAL || "/assinar?plano=mensal",
  anual: process.env.NEXT_PUBLIC_CHECKOUT_ANUAL || "/assinar?plano=anual",
};

// Preços em R$ (fonte única: planos da home e checkout do passaporte 3D).
export const PRICE = { mensal: 97, anual: 997 } as const;

const brl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const ANUAL_MES = Math.round((PRICE.anual / 12) * 100) / 100; // 83,08
const ECONOMIA = PRICE.mensal * 12 - PRICE.anual; // 167

export const PLANS = [
  {
    id: "anual",
    name: "Anual",
    price: brl(PRICE.anual),
    period: "/ano",
    note: `${brl(ANUAL_MES)} por mês · economize ${brl(ECONOMIA)} · Pix à vista, sem renovação automática`,
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
    price: brl(PRICE.mensal),
    period: "/mês",
    note: "Pix à vista · 30 dias de acesso · sem renovação automática",
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

// Rota de níveis (mesma ordem do passaporte 3D). meta = faturamento verificado em R$.
// Mônaco (1M) é o topo e dá acesso à Mentoria High Ticket.
export const ROUTE: readonly { code: string; country: string; goal: string; reward: string; meta: number | null }[] = [
  { code: "GRU", country: "Brasil", goal: "Ativou o passaporte", reward: "Medalha Embarque e +500 XP", meta: 0 },
  { code: "SCL", country: "Chile", goal: "R$ 10 mil verificados", reward: "Placa física 10K", meta: 10_000 },
  { code: "LIS", country: "Lisboa", goal: "R$ 50 mil verificados", reward: "Placa física 50K", meta: 50_000 },
  { code: "DXB", country: "Dubai", goal: "R$ 100 mil verificados", reward: "Placa física 100K", meta: 100_000 },
  { code: "JFK", country: "Nova York", goal: "R$ 500 mil verificados", reward: "Placa física 500K", meta: 500_000 },
  { code: "MCM", country: "Mônaco", goal: "R$ 1 milhão verificado", reward: "Mentoria High Ticket", meta: 1_000_000 },
];

export const FEATURES = [
  { t: "Hot Academy", d: "85 aulas em 9 módulos, do primeiro passo à gringa, com missões." },
  { t: "Feed da Society", d: "Stories, posts, enquetes e canais para trocar ideia com quem está no mesmo jogo." },
  { t: "CappuIA (beta)", d: "Assistente para tirar dúvidas rápidas sobre as aulas. Em evolução." },
  { t: "HOTPHONE", d: "Seu celular dentro da plataforma: CappuIA, cofre de anotações e feed das aulas." },
  { t: "Ferramentas", d: "Prompts, abordagens, tráfego pago e orgânico e funil operacional prontos para copiar." },
  { t: "Missões e games", d: "Missões diárias, quiz e desafios que valem XP para a sua rota." },
  { t: "Levantar caixa", d: "Calculadora de meta, jogadas de 48 horas e plano de 7 dias." },
  { t: "Afiliados (em breve)", d: "Programa de indicação com comissão. Abre em breve para os assinantes." },
] as const;

export const MODULES = [
  { n: "00", t: "Introdução", img: "/img/modulo-01.jpg", lessons: 4 },
  { n: "01", t: "Prospectando modelos white", img: "/img/modulo-03.jpg", lessons: 9 },
  { n: "02", t: "A doce arte do X1", img: "/img/modulo-04.jpg", lessons: 9 },
  { n: "03", t: "Modelos de IA", img: "/img/modulo-02.jpg", lessons: 18 },
  { n: "04", t: "Operacional do zero", img: "/img/modulo-04.jpg", lessons: 14 },
  { n: "05", t: "Modelo white", img: "/img/modulo-03.jpg", lessons: 13 },
  { n: "06", t: "Tráfego pago", img: "/img/modulo-04.jpg", lessons: 3 },
  { n: "07", t: "Abrindo uma agência OFM", img: "/img/modulo-05.jpg", lessons: 4 },
  { n: "08", t: "Hot na gringa", img: "/img/modulo-05.jpg", lessons: 11 },
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
    q: "Tem renovação automática? E se eu me arrepender?",
    a: "Não há renovação automática: o pagamento é por Pix e vale pelo período do plano. Se você se arrepender, pede o reembolso integral em até 7 dias da compra em Perfil → Minhas compras, sem precisar explicar o motivo (Código de Defesa do Consumidor, art. 49).",
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
    q: "Quem vende a HOT SOCIETY?",
    a: `Os dados da empresa responsável (nome empresarial e CNPJ) ficam no rodapé do site e nos Termos de uso. Atendimento: ${SITE.supportEmail} (respondemos em até 5 dias úteis).`,
  },
  {
    q: "Qual a diferença entre o mensal e o anual?",
    a: `O conteúdo é o mesmo. No anual você paga ${brl(PRICE.anual)} por ano, o equivalente a ${brl(ANUAL_MES)} por mês, economiza ${brl(ECONOMIA)} e ganha bônus exclusivos.`,
  },
] as const;

// Linha única e discreta com os dados que a lei exige (Decreto 7.962/2013, art. 2º).
export const DADOS_EMPRESA = [SITE.name, SITE.razaoSocial, `CNPJ ${SITE.cnpj}`, SITE.endereco].filter(Boolean).join(" · ");
