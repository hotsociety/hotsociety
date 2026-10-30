// Aplicação para a Mentoria High Ticket: mesmas perguntas do formulário do site do Cappu
// (capputino-hq.vercel.app → "Aplicar para a mentoria"). Usado pelo formulário da plataforma,
// pela rota /api/mentoria/aplicacao e pelo Painel → Mentoria.

export type Aplicacao = {
  nome: string;
  ig: string;
  wpp: string;
  trabalho: string;
  momento: string;
  operacao: string;
  trava: string;
  invest: string;
  pc: string;
  tempo: string;
  maior: boolean;
};

export const APLICACAO_VAZIA: Aplicacao = { nome: "", ig: "", wpp: "", trabalho: "", momento: "", operacao: "", trava: "", invest: "", pc: "", tempo: "", maior: false };

// Investimento: resposta aberta (o lead escreve com as próprias palavras).
export const PERGUNTA_INVEST = "Quanto você estaria disposto a investir?";

// Perguntas de múltipla escolha (texto da pergunta e opções iguais às do site do Cappu).
export const ESCOLHAS: { campo: "momento" | "operacao" | "pc" | "tempo"; t: string; opcoes: string[] }[] = [
  { campo: "momento", t: "Em que momento você está?", opcoes: ["Começando do zero", "Já opero, até R$ 10 mil/mês", "Entre R$ 10 e 50 mil/mês", "Acima de R$ 50 mil/mês"] },
  { campo: "operacao", t: "Qual é o seu tipo de operação?", opcoes: ["Modelo de IA", "Modelo real", "As duas", "Agência OFM", "Ainda não decidi", "Não sou do digital"] },
  { campo: "pc", t: "Você tem computador ou notebook em casa?", opcoes: ["Sim, notebook", "Sim, computador", "Não, só celular"] },
  { campo: "tempo", t: "Você tem tempo para aplicar a mentoria?", opcoes: ["Sim, mais de 2h por dia", "Entre 1h e 2h por dia", "Menos de 1h por dia"] },
];

export const ROTULO_ORIGEM = { insta_cappu: "lead insta cappu", plataforma: "lead plataforma" } as const;

const txt = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

// Confere e normaliza o que chegou (do navegador ou do site do Cappu). Devolve erro em português.
export function validarAplicacao(c: Record<string, unknown>): { ok: true; a: Aplicacao } | { ok: false; erro: string } {
  const a: Aplicacao = {
    nome: txt(c.nome, 80),
    ig: txt(c.ig ?? c.instagram, 60),
    wpp: String(c.wpp ?? c.whatsapp ?? "").replace(/\D/g, "").slice(0, 13),
    trabalho: txt(c.trabalho, 200),
    momento: txt(c.momento, 80),
    operacao: txt(c.operacao, 80),
    trava: txt(c.trava, 1500),
    invest: txt(c.invest, 80),
    pc: txt(c.pc, 80),
    tempo: txt(c.tempo, 80),
    maior: c.maior === true || c.maior === "on" || c.maior === "true" || c.maior === 1,
  };
  if (a.nome.length < 2) return { ok: false, erro: "Preencha seu nome." };
  if (a.ig.replace(/^@+/, "").length < 2) return { ok: false, erro: "Preencha seu Instagram." };
  if (!/^\d{10,13}$/.test(a.wpp)) return { ok: false, erro: "WhatsApp com DDD, só números. Ex.: (11) 99999-9999." };
  if (a.trabalho.length < 2) return { ok: false, erro: "Conte com o que você trabalha hoje." };
  if (a.trava.length < 2) return { ok: false, erro: "Conte qual a sua maior trava hoje." };
  if (!a.maior) return { ok: false, erro: "Confirme que tem 18 anos ou mais." };
  return { ok: true, a };
}

// Máscara simples para o WhatsApp enquanto digita.
export function mascaraWpp(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
}
