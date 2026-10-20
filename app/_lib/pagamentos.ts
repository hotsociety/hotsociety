// SÓ SERVIDOR. Pagamentos: gateway (Novus ou Transfeer) + gravação no Supabase.
//
// Variáveis na Vercel (tipo Sensitive, nunca NEXT_PUBLIC):
//   NOVUS_API_KEY              → chave privada da Novus (Integrações → Chave Privada). Com ela, a Novus vira o gateway ativo.
//   SUPABASE_SERVICE_ROLE_KEY  → chave secreta do Supabase (grava pedidos e libera acesso)
// Opcionais: NOVUS_WEBHOOK_SECRET (whsec_… se criar um webhook global no painel da Novus),
//            NOVUS_API_URL (padrão https://api.novuspagamentos.com), SITE_URL (padrão https://hotsociety.com.br)
// Transfeer (alternativa, usada só se NOVUS_API_KEY não existir): TRANSFEER_API_KEY e TRANSFEER_WEBHOOK_SECRET.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PRICE } from "./site";

export type Plano = "mensal" | "anual";
export type Metodo = "pix" | "cartao";
export type Gateway = "novus" | "transfeer";
export const VALOR_CENTAVOS: Record<Plano, number> = { mensal: PRICE.mensal * 100, anual: PRICE.anual * 100 };
export const PRODUTO: Record<Plano, string> = { mensal: "HOT SOCIETY Mensal", anual: "HOT SOCIETY Anual" };
export const SITE = (process.env.SITE_URL || "https://hotsociety.com.br").replace(/\/$/, "");

export type Pedido = {
  id: string;
  user_id: string;
  email: string;
  nome: string | null;
  plano: Plano;
  valor_centavos: number;
  status: "pendente" | "pago" | "expirado" | "cancelado" | "falhou" | "reembolsado" | "chargeback";
  gateway?: string | null;
  metodo?: Metodo | null;
  charge_id: string | null;
  br_code: string | null;
  checkout_url?: string | null;
  expira_em: string | null;
  pago_em: string | null;
  criado_em: string;
  cupom?: string | null;
};

/** Cobrança no formato do site, igual para qualquer gateway. */
export type Cobranca = {
  gateway: Gateway;
  id: string; // id da transação/cobrança no gateway (vira o número do pedido nas vendas)
  status: Pedido["status"] | "bloqueado" | null; // null = ainda sem decisão
  valor: number | null; // em centavos
  referencia: string | null; // id do nosso pedido
  sessao?: string | null; // checkout (cartão): id da sessão
  br_code?: string | null;
  checkout_url?: string | null;
  expira_em?: string | null;
  pago_em?: string | null;
};

export type Cliente = { nome: string; cpf: string; telefone?: string; email: string };

export function gatewayAtivo(): Gateway {
  return process.env.NOVUS_API_KEY ? "novus" : "transfeer";
}

export function configurado() {
  const g = gatewayAtivo();
  const precisa =
    g === "novus"
      ? ["NOVUS_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"]
      : ["TRANSFEER_API_KEY", "TRANSFEER_WEBHOOK_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"];
  const faltando = precisa.filter((k) => !process.env[k]);
  return { ok: faltando.length === 0, faltando, gateway: g, cartao: g === "novus" };
}

export function admin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Confere quem está logado a partir do token enviado pelo navegador.
export async function usuarioDoPedido(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user?.email) return null;
  return data.user;
}

// ---------- CPF ----------
export function cpfValido(cpf: string) {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dig = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dig(9) === Number(d[9]) && dig(10) === Number(d[10]);
}

// HMAC-SHA256 em hex do corpo cru, comparado sem vazar tempo. Aceita com ou sem o prefixo "sha256=".
export function hmacConfere(corpoCru: string, recebida: string | null, segredo: string | undefined) {
  if (!segredo || segredo.length < 16 || !recebida) return false;
  const certa = createHmac("sha256", segredo).update(corpoCru, "utf8").digest("hex");
  const a = Buffer.from(recebida.trim().replace(/^sha256=/i, "").toLowerCase());
  const b = Buffer.from(certa);
  return a.length === b.length && timingSafeEqual(a, b);
}

class ErroGateway extends Error {
  constructor(
    msg: string,
    public code: string,
    public status: number,
  ) {
    super(msg);
  }
}

async function chamar(url: string, init: RequestInit & { chave: string; idempotencia?: string; prefixo?: "Bearer" | "x-api-key" }) {
  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json" };
  if (init.prefixo === "x-api-key") headers["x-api-key"] = init.chave;
  else headers.authorization = `Bearer ${init.chave}`;
  if (init.idempotencia) headers["Idempotency-Key"] = init.idempotencia;
  const r = await fetch(url, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
  const corpo = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) {
    const e = corpo as { code?: string; message?: string; errors?: unknown };
    throw new ErroGateway(`${e.message || `HTTP ${r.status}`}${e.errors ? " " + JSON.stringify(e.errors).slice(0, 300) : ""}`, e.code || String(r.status), r.status);
  }
  return corpo;
}

/* =====================================================================
   NOVUS  (docs: app.novuspagamentos.com/docs)
   Pix: POST /api/v2/invoices · consulta: GET /api/v2/invoices/{id}
   Cartão: página de pagamento da Novus (Checkout Sessions), sem o site tocar no número do cartão
   Avisos: postback por cobrança, assinado com HMAC-SHA256 da chave da API (X-Webhook-Signature)
   ===================================================================== */
const NOVUS = (process.env.NOVUS_API_URL || "https://api.novuspagamentos.com").replace(/\/$/, "");

const STATUS_NOVUS: Record<string, Cobranca["status"]> = {
  paid: "pago",
  approved: "pago",
  completed: "pago",
  waiting_payment: null,
  pending: null,
  active: null,
  processing: null,
  processing_error: null,
  created: null,
  canceled: "expirado",
  cancelled: "expirado",
  expired: "expirado",
  refused: "falhou",
  failed: "falhou",
  refunded: "reembolsado",
  chargedback: "chargeback",
  chargeback: "chargeback",
  blocked: "bloqueado",
};

type ObjNovus = Record<string, unknown> & { pix?: Record<string, unknown> | null };
const txt = (v: unknown) => (typeof v === "string" && v ? v : typeof v === "number" ? String(v) : null);
const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && /^\d+$/.test(v) ? Number(v) : null);

// Transforma uma transação/fatura da Novus (resposta da API ou aviso) no formato do site.
export function novusNormalizar(o: ObjNovus): Cobranca {
  const st = (txt(o.status) ?? "").toLowerCase();
  return {
    gateway: "novus",
    id: txt(o.invoice_id) ?? txt(o.id) ?? txt(o.transaction_id) ?? "",
    status: st in STATUS_NOVUS ? STATUS_NOVUS[st] : null,
    valor: num(o.total_cents) ?? num(o.total) ?? num(o.amount),
    referencia: txt(o.external_id) ?? txt(o.externalRef) ?? txt(o.external_ref),
    sessao: txt(o.checkout_session_id),
    br_code: txt(o.qr_code_pix) ?? txt(o.pix?.qrcode) ?? txt(o.qr_code),
    expira_em: txt(o.pix?.expirationDate) ?? txt(o.detectable_until) ?? txt(o.expires_at),
    pago_em: txt(o.paid_at),
  };
}

function dados(j: Record<string, unknown>): ObjNovus {
  return ((j.data && typeof j.data === "object" ? j.data : j) as ObjNovus) ?? {};
}

async function novusCriarPix(p: Pedido, c: Cliente): Promise<Cobranca> {
  const j = await chamar(`${NOVUS}/api/v2/invoices`, {
    method: "POST",
    chave: process.env.NOVUS_API_KEY!,
    idempotencia: p.id,
    body: JSON.stringify({
      method: "pix",
      total_price_cents: p.valor_centavos,
      product_fisical: "digital",
      external_id: p.id,
      postback_url: `${SITE}/api/pagamentos/novus`,
      payer: { name: c.nome, cpf_cnpj: c.cpf, email: c.email, ...(c.telefone ? { phone: c.telefone } : {}) },
      items: [{ name: PRODUTO[p.plano], unit_price: p.valor_centavos, quantity: 1 }],
    }),
  });
  const n = novusNormalizar(dados(j));
  return { ...n, referencia: n.referencia ?? p.id, valor: n.valor ?? p.valor_centavos };
}

// Cartão: cria a página de pagamento da Novus (até 12x). O número do cartão nunca passa pelo nosso site.
async function novusCriarCartao(p: Pedido, c: Cliente): Promise<Cobranca> {
  const expira = new Date(Date.now() + 2 * 3600e3).toISOString();
  const j = await chamar(`${NOVUS}/v2/checkout/sessions`, {
    method: "POST",
    chave: process.env.NOVUS_API_KEY!,
    body: JSON.stringify({
      items: [{ title: PRODUTO[p.plano], unitPrice: p.valor_centavos, quantity: 1 }],
      currency: "BRL",
      maxInstallments: 12,
      successUrl: `${SITE}/assinar?pedido=${p.id}`,
      cancelUrl: `${SITE}/assinar?plano=${p.plano}`,
      postbackUrl: `${SITE}/api/pagamentos/novus`,
      externalRef: p.id,
      metadata: JSON.stringify({ pedido: p.id }),
      expiresAt: expira,
      customer: { name: c.nome, email: c.email, documentNumber: c.cpf, documentType: "CPF", ...(c.telefone ? { phone: c.telefone } : {}) },
    }),
  });
  const s = dados(j);
  const url = txt(s.checkoutUrl);
  if (!url || !/^https:\/\//.test(url)) throw new ErroGateway("Novus não devolveu a página de pagamento", "SEM_URL", 502);
  return { gateway: "novus", id: txt(s.id) ?? "", status: null, valor: num(s.totalAmount) ?? p.valor_centavos, referencia: p.id, sessao: txt(s.id), checkout_url: url, expira_em: txt(s.expiresAt) ?? expira };
}

export async function novusConsultarFatura(id: string): Promise<Cobranca> {
  const j = await chamar(`${NOVUS}/api/v2/invoices/${encodeURIComponent(id)}`, { method: "GET", chave: process.env.NOVUS_API_KEY! });
  return novusNormalizar(dados(j));
}

async function novusConsultarSessao(id: string, pedidoId: string): Promise<Cobranca> {
  const j = await chamar(`${NOVUS}/v2/checkout/sessions/${encodeURIComponent(id)}`, { method: "GET", chave: process.env.NOVUS_API_KEY! });
  const s = dados(j);
  const transacao = txt(s.transactionId);
  if (transacao) {
    const f = await novusConsultarFatura(transacao);
    return { ...f, referencia: f.referencia ?? pedidoId, sessao: id };
  }
  const st = (txt(s.status) ?? "").toUpperCase();
  return { gateway: "novus", id, status: st === "EXPIRED" || st === "CANCELED" ? "expirado" : null, valor: num(s.totalAmount), referencia: pedidoId, sessao: id };
}

// Avisos da Novus: postback por cobrança (assinado com a chave da API) ou webhook global (whsec_…).
export function novusAssinaturaConfere(corpoCru: string, recebida: string | null) {
  return hmacConfere(corpoCru, recebida, process.env.NOVUS_API_KEY) || hmacConfere(corpoCru, recebida, process.env.NOVUS_WEBHOOK_SECRET);
}

/* =====================================================================
   TRANSFEER  (alternativa)
   ===================================================================== */
const TRANSFEER = process.env.TRANSFEER_API_URL || "https://api.transfeer.io/v1";
const STATUS_TRANSFEER: Record<string, Cobranca["status"]> = {
  processing: null,
  pending: null,
  paid: "pago",
  expired: "expirado",
  canceled: "cancelado",
  failed: "falhou",
  refunded: "reembolsado",
  charged_back: "chargeback",
  infraction: "chargeback", // MED do Pix: trata como contestação
};

export function transfeerNormalizar(o: Record<string, unknown> & { pix?: { br_code?: string | null } | null }): Cobranca {
  return {
    gateway: "transfeer",
    id: txt(o.id) ?? "",
    status: STATUS_TRANSFEER[txt(o.status) ?? ""] ?? null,
    valor: num(o.amount),
    referencia: txt(o.reference),
    br_code: o.pix?.br_code ?? null,
    expira_em: txt(o.expires_at),
    pago_em: txt(o.paid_at),
  };
}

async function transfeerCriarPix(p: Pedido, c: Cliente) {
  const j = await chamar(`${TRANSFEER}/charges`, {
    method: "POST",
    chave: process.env.TRANSFEER_API_KEY!,
    prefixo: "x-api-key",
    idempotencia: p.id,
    body: JSON.stringify({
      amount: p.valor_centavos,
      method: "pix",
      description: PRODUTO[p.plano],
      reference: p.id,
      expires_in: 3600,
      customer: { name: c.nome, email: c.email, document: c.cpf, ...(c.telefone ? { phone: c.telefone } : {}) },
      webhook_url: `${SITE}/api/pagamentos/transfeer`,
      webhook_secret: process.env.TRANSFEER_WEBHOOK_SECRET,
    }),
  });
  return transfeerNormalizar(j);
}

export async function transfeerConsultar(id: string) {
  return transfeerNormalizar(await chamar(`${TRANSFEER}/charges/${encodeURIComponent(id)}`, { method: "GET", chave: process.env.TRANSFEER_API_KEY!, prefixo: "x-api-key" }));
}

export function transfeerAssinaturaConfere(corpoCru: string, recebida: string | null) {
  return hmacConfere(corpoCru, recebida, process.env.TRANSFEER_WEBHOOK_SECRET);
}

/* =====================================================================
   Comum
   ===================================================================== */

export async function criarCobranca(p: Pedido, c: Cliente, metodo: Metodo): Promise<Cobranca> {
  if (gatewayAtivo() === "novus") return metodo === "cartao" ? novusCriarCartao(p, c) : novusCriarPix(p, c);
  if (metodo === "cartao") throw new ErroGateway("Cartão indisponível neste gateway", "SEM_CARTAO", 400);
  return transfeerCriarPix(p, c);
}

// Status atual de um pedido direto no gateway em que ele foi criado.
export async function consultarPedido(p: Pedido): Promise<Cobranca | null> {
  if (!p.charge_id) return null;
  if ((p.gateway ?? "transfeer") === "novus") {
    return p.metodo === "cartao" ? novusConsultarSessao(p.charge_id, p.id) : novusConsultarFatura(p.charge_id);
  }
  return transfeerConsultar(p.charge_id);
}

const STATUS_VENDA: Partial<Record<Pedido["status"], string>> = { pago: "pago", reembolsado: "reembolsado", chargeback: "chargeback" };

// Aplica no banco o status de uma cobrança (aviso automático ou conferência manual).
// É seguro chamar várias vezes com o mesmo status.
export async function aplicarCobranca(sb: SupabaseClient, c: Cobranca): Promise<Pedido | null> {
  const ref = c.referencia;
  if (!ref || !/^[0-9a-f-]{36}$/i.test(ref) || !c.id) return null;
  const { data: p } = await sb.from("pedidos").select("*").eq("id", ref).maybeSingle<Pedido>();
  if (!p) return null;
  // A cobrança precisa ser deste pedido (no cartão, o pedido guarda o id da sessão de checkout).
  if (p.charge_id && p.charge_id !== c.id && p.charge_id !== c.sessao) return null;

  // MED/contestação aberta: bloqueia só se já estava pago; se voltar a "pago", libera de novo.
  const novo = c.status === "bloqueado" ? (p.status === "pago" ? "chargeback" : null) : c.status;
  if (!novo || novo === p.status) return p;

  // Pagamento só vale se o valor bater com o do pedido.
  if (novo === "pago" && c.valor !== p.valor_centavos) {
    console.error(`pagamento com valor diferente: pedido ${p.id} esperava ${p.valor_centavos}, veio ${c.valor}`);
    return p;
  }

  const { data: atual } = await sb
    .from("pedidos")
    .update({
      status: novo,
      charge_id: p.charge_id ?? c.id,
      pago_em: novo === "pago" ? (c.pago_em ?? new Date().toISOString()) : p.pago_em,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", p.id)
    .select("*")
    .single<Pedido>();

  if (novo === "pago" && p.status !== "chargeback") {
    await enviarRecibo(p, c).catch((e) => console.error("recibo:", (e as Error).message));
    if (p.cupom) await sb.rpc("hs_usar_cupom", { p_codigo: p.cupom });
  }

  const statusVenda = STATUS_VENDA[novo];
  if (statusVenda) {
    const { error } = await sb.rpc("receber_venda", {
      p: {
        pedido: c.id,
        plataforma: c.gateway,
        produto: PRODUTO[p.plano],
        plano: p.plano,
        cliente_nome: p.nome,
        cliente_email: p.email,
        metodo: p.metodo === "cartao" ? "cartao" : "pix",
        valor: p.valor_centavos / 100,
        liquido: p.valor_centavos / 100,
        status: statusVenda,
        criado_em: p.criado_em,
      },
    });
    if (error) console.error("receber_venda:", error.message);
  }
  return atual ?? p;
}

// Recibo por e-mail (Decreto 7.962/2013: confirmar a compra). Só envia se RESEND_API_KEY estiver configurada.
async function enviarRecibo(p: Pedido, c: Cobranca) {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) return;
  const valor = (p.valor_centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const data = new Date(c.pago_em ?? Date.now()).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const esc = (t: string) => t.replace(/[&<>"]/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[x]!);
  const meio = p.metodo === "cartao" ? "Cartão" : "Pix";
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#141416">
  <h2 style="margin:0 0 12px">Pagamento aprovado ✈️</h2>
  <p>Olá${p.nome ? ", " + esc(p.nome.split(" ")[0]) : ""}! Seu passaporte HOT SOCIETY está ativo.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:6px 0;color:#666">Produto</td><td>${PRODUTO[p.plano]}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Valor</td><td>${valor} (${meio})</td></tr>
    <tr><td style="padding:6px 0;color:#666">Data</td><td>${data}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Pedido</td><td>${esc(c.id)}</td></tr>
  </table>
  <p><a href="${SITE}/dashboard" style="display:inline-block;background:#C9A24E;color:#141416;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Entrar na área de membros</a></p>
  <p style="font-size:12px;color:#666">Garantia de 7 dias: se se arrepender, peça o reembolso integral em Perfil → Acesso e compras. Não há renovação automática.</p>
</div>`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${chave}`, "content-type": "application/json", "Idempotency-Key": `recibo-${p.id}` },
    body: JSON.stringify({
      from: process.env.EMAIL_REMETENTE || "HOT SOCIETY <nao-responda@hotsociety.com.br>",
      to: [p.email],
      subject: `Pagamento aprovado · ${PRODUTO[p.plano]}`,
      html,
    }),
    signal: AbortSignal.timeout(8000),
  });
}

export { ErroGateway };
