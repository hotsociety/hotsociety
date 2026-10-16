// Entrada automática de vendas.
// A plataforma de pagamento chama:  POST https://hotsociety.com.br/api/vendas/webhook?token=SEU_TOKEN
//
// Precisa de 2 variáveis na Vercel (Settings → Environment Variables), NUNCA no código:
//   VENDAS_WEBHOOK_TOKEN       → uma senha longa que só você e a plataforma conhecem
//   SUPABASE_SERVICE_ROLE_KEY  → Supabase → Project Settings → API Keys → service_role (secreta)
//
// Formato aceito hoje (genérico). Quando a plataforma for escolhida, é só criar
// o "tradutor" dela em normalizar() — o resto não muda.
// {
//   "pedido": "EM1QWR9A", "status": "pago" | "pendente" | "recusado" | "reembolsado" | "chargeback" | "cancelado",
//   "cliente_email": "aluno@gmail.com", "cliente_nome": "Nahuel R.",
//   "produto": "HOT SOCIETY", "plano": "mensal" | "anual" | "avulso",
//   "metodo": "pix" | "cartao" | "boleto" | "outro",
//   "valor": 97, "liquido": 88.5, "liberacao_prevista": "2026-10-20T12:00:00-03:00",
//   "criado_em": "2026-10-16T15:00:00-03:00", "plataforma": "minha-plataforma"
// }

import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";

const STATUS = new Set(["pago", "pendente", "recusado", "reembolsado", "chargeback", "cancelado"]);
const PLANOS = new Set(["mensal", "anual", "avulso"]);
const METODOS = new Set(["pix", "cartao", "boleto", "outro"]);

function tokenConfere(recebido: string | null) {
  const certo = process.env.VENDAS_WEBHOOK_TOKEN ?? "";
  if (certo.length < 24 || !recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(certo);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Venda = Record<string, string | number | null | undefined | object>;

function texto(v: unknown, max: number) {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
}
function numero(v: unknown) {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}
function quando(v: unknown) {
  if (typeof v !== "string") return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// Converte o que a plataforma mandou para o formato do banco.
function normalizar(corpo: Record<string, unknown>): Venda | string {
  const status = texto(corpo.status, 20)?.toLowerCase();
  const email = texto(corpo.cliente_email, 200)?.toLowerCase();
  const pedido = texto(corpo.pedido, 80);
  if (!pedido) return "falta o campo pedido";
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return "cliente_email inválido";
  if (!status || !STATUS.has(status)) return "status inválido";
  const plano = texto(corpo.plano, 10)?.toLowerCase();
  const metodo = texto(corpo.metodo, 10)?.toLowerCase();
  return {
    pedido,
    status,
    cliente_email: email,
    cliente_nome: texto(corpo.cliente_nome, 120),
    produto: texto(corpo.produto, 120),
    plano: plano && PLANOS.has(plano) ? plano : undefined,
    metodo: metodo && METODOS.has(metodo) ? metodo : "outro",
    valor: numero(corpo.valor),
    liquido: numero(corpo.liquido),
    liberacao_prevista: quando(corpo.liberacao_prevista),
    criado_em: quando(corpo.criado_em),
    plataforma: texto(corpo.plataforma, 40) ?? "webhook",
  };
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!tokenConfere(req.headers.get("x-webhook-token") ?? url.searchParams.get("token"))) {
    return Response.json({ ok: false, erro: "não autorizado" }, { status: 401 });
  }

  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!chave || !supaUrl) return Response.json({ ok: false, erro: "servidor sem configuração" }, { status: 500 });

  let corpo: Record<string, unknown>;
  try {
    const bruto = await req.text();
    if (bruto.length > 100_000) return Response.json({ ok: false, erro: "corpo grande demais" }, { status: 413 });
    corpo = JSON.parse(bruto);
  } catch {
    return Response.json({ ok: false, erro: "JSON inválido" }, { status: 400 });
  }

  const venda = normalizar(corpo);
  if (typeof venda === "string") return Response.json({ ok: false, erro: venda }, { status: 422 });

  const admin = createClient(supaUrl, chave, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.rpc("receber_venda", { p: { ...venda, bruto: corpo } });
  if (error) {
    console.error("webhook de vendas:", error.message);
    return Response.json({ ok: false, erro: "não deu para gravar" }, { status: 500 });
  }
  const v = data as { pedido: string; status: string; user_id: string | null };
  return Response.json({ ok: true, pedido: v.pedido, status: v.status, aluno_ligado: !!v.user_id });
}
