// Tipos e formatação do painel da equipe.

export type StatusVenda = "pago" | "pendente" | "recusado" | "reembolsado" | "chargeback" | "cancelado";

export type Aluno = {
  id: string;
  email: string;
  nome: string | null;
  criado_em: string;
  ultimo_login: string | null;
  email_confirmado: boolean;
  cargo: "admin" | "financeiro" | "suporte" | null;
  xp: number;
  acesso: "equipe" | "ativo" | "vencido" | "bloqueado" | "sem acesso";
  origem: "venda" | "manual" | null;
  valido_ate: string | null;
  motivo: string | null;
};

export const STATUS_VENDA: Record<StatusVenda, string> = {
  pago: "Pago",
  pendente: "Aguardando",
  recusado: "Recusado",
  reembolsado: "Reembolsado",
  chargeback: "Chargeback",
  cancelado: "Não concluído",
};

export const ACESSO: Record<Aluno["acesso"], string> = {
  equipe: "Equipe",
  ativo: "Ativo",
  vencido: "Vencido",
  bloqueado: "Bloqueado",
  "sem acesso": "Sem acesso",
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const BRL0 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const DATA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
const HORA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

export const reais = (v: number | string | null | undefined) => BRL.format(Number(v ?? 0));
export const reais0 = (v: number | string | null | undefined) => BRL0.format(Number(v ?? 0));
export const data = (iso: string | null | undefined) => (iso ? DATA.format(new Date(iso)) : "—");
export const hora = (iso: string | null | undefined) => (iso ? HORA.format(new Date(iso)) : "");
export const dataHora = (iso: string | null | undefined) => (iso ? `${data(iso)}, ${hora(iso)}` : "—");

// Data de hoje no fuso de Brasília, como AAAA-MM-DD.
export function hojeISO(agora: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}
export function somarDias(iso: string, dias: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Mensagem do banco em português simples.
export function erroAmigavel(e: { message?: string; code?: string } | null | undefined) {
  if (!e) return "";
  const m = e.message ?? "";
  if (e.code === "42501" || /permiss/i.test(m)) return "Seu cargo não tem permissão para isso.";
  if (e.code === "PGRST202" || e.code === "42883") return "O banco ainda não foi atualizado com o painel. Rode o SQL do painel no Supabase.";
  if (/duplicate key|unique/i.test(m)) return "Já existe uma venda com esse número de pedido.";
  return m || "Algo deu errado. Tente de novo.";
}
