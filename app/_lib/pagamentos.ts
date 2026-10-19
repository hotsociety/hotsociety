// SÓ SERVIDOR. Integração com a Transfeer (Pix) e gravação no Supabase.
// Variáveis na Vercel (tipo Secret, nunca NEXT_PUBLIC):
//   TRANSFEER_API_KEY          → chave da API (escopos charge:write e charge:read)
//   TRANSFEER_WEBHOOK_SECRET   → senha longa inventada por você; assina os avisos de pagamento
//   SUPABASE_SERVICE_ROLE_KEY  → chave secreta do Supabase (grava pedidos e libera acesso)
// Opcional: TRANSFEER_API_URL (padrão https://api.transfeer.io/v1) e SITE_URL (padrão https://hotsociety.com.br)

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PRICE } from "./site";

export type Plano = "mensal" | "anual";
export const VALOR_CENTAVOS: Record<Plano, number> = { mensal: PRICE.mensal * 100, anual: PRICE.anual * 100 };
export const PRODUTO: Record<Plano, string> = { mensal: "HOT SOCIETY Mensal", anual: "HOT SOCIETY Anual" };

const API = process.env.TRANSFEER_API_URL || "https://api.transfeer.io/v1";
const SITE = (process.env.SITE_URL || "https://hotsociety.com.br").replace(/\/$/, "");

export type Pedido = {
  id: string;
  user_id: string;
  email: string;
  nome: string | null;
  plano: Plano;
  valor_centavos: number;
  status: "pendente" | "pago" | "expirado" | "cancelado" | "falhou" | "reembolsado" | "chargeback";
  charge_id: string | null;
  br_code: string | null;
  expira_em: string | null;
  pago_em: string | null;
  criado_em: string;
};

export type Cobranca = {
  id: string;
  status: "processing" | "pending" | "paid" | "expired" | "canceled" | "failed" | "refunded" | "charged_back" | "infraction";
  amount: number;
  reference: string | null;
  pix?: { br_code?: string | null } | null;
  expires_at?: string | null;
  paid_at?: string | null;
};

export function configurado() {
  const faltando = ["TRANSFEER_API_KEY", "TRANSFEER_WEBHOOK_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"].filter(
    (k) => !process.env[k],
  );
  return { ok: faltando.length === 0, faltando };
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

// ---------- Transfeer ----------
async function transfeer<T>(caminho: string, init: RequestInit & { idempotencia?: string } = {}): Promise<T> {
  const headers: Record<string, string> = {
    "x-api-key": process.env.TRANSFEER_API_KEY!,
    "content-type": "application/json",
  };
  if (init.idempotencia) headers["Idempotency-Key"] = init.idempotencia;
  const r = await fetch(`${API}${caminho}`, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = corpo as { code?: string; message?: string };
    throw Object.assign(new Error(e.message || `Transfeer ${r.status}`), { code: e.code || String(r.status), status: r.status });
  }
  return corpo as T;
}

export function criarCobranca(p: Pedido, cliente: { nome: string; cpf: string; telefone?: string }) {
  return transfeer<Cobranca>("/charges", {
    method: "POST",
    idempotencia: p.id,
    body: JSON.stringify({
      amount: p.valor_centavos,
      method: "pix",
      description: PRODUTO[p.plano],
      reference: p.id,
      expires_in: 3600,
      customer: {
        name: cliente.nome,
        email: p.email,
        document: cliente.cpf.replace(/\D/g, ""),
        ...(cliente.telefone ? { phone: cliente.telefone.replace(/\D/g, "") } : {}),
      },
      webhook_url: `${SITE}/api/pagamentos/transfeer`,
      webhook_secret: process.env.TRANSFEER_WEBHOOK_SECRET,
    }),
  });
}

export function consultarCobranca(id: string) {
  return transfeer<Cobranca>(`/charges/${encodeURIComponent(id)}`, { method: "GET" });
}

// Assinatura dos avisos: HMAC-SHA256 do corpo cru, em hex, com prefixo "sha256=".
export function assinaturaConfere(corpoCru: string, recebida: string | null) {
  const segredo = process.env.TRANSFEER_WEBHOOK_SECRET || "";
  if (segredo.length < 16 || !recebida) return false;
  const certa = "sha256=" + createHmac("sha256", segredo).update(corpoCru, "utf8").digest("hex");
  const a = Buffer.from(recebida.trim());
  const b = Buffer.from(certa);
  return a.length === b.length && timingSafeEqual(a, b);
}

const STATUS: Record<Cobranca["status"], Pedido["status"] | null> = {
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
const STATUS_VENDA: Partial<Record<Pedido["status"], string>> = {
  pago: "pago",
  reembolsado: "reembolsado",
  chargeback: "chargeback",
};

// Aplica no banco o status atual de uma cobrança (vale para o webhook e para a conferência manual).
// É seguro chamar várias vezes com o mesmo status.
export async function aplicarCobranca(sb: SupabaseClient, c: Cobranca): Promise<Pedido | null> {
  const ref = c.reference;
  if (!ref || !/^[0-9a-f-]{36}$/i.test(ref)) return null;
  const { data: p } = await sb.from("pedidos").select("*").eq("id", ref).maybeSingle<Pedido>();
  if (!p) return null;
  if (p.charge_id && p.charge_id !== c.id) return null; // cobrança não é deste pedido

  const novo = STATUS[c.status];
  if (!novo || novo === p.status) return p;

  // Pagamento só vale se o valor bater com o do plano.
  if (novo === "pago" && c.amount !== p.valor_centavos) {
    console.error(`pagamento com valor diferente: pedido ${p.id} esperava ${p.valor_centavos}, veio ${c.amount}`);
    return p;
  }

  const { data: atual } = await sb
    .from("pedidos")
    .update({
      status: novo,
      charge_id: p.charge_id ?? c.id,
      pago_em: novo === "pago" ? c.paid_at ?? new Date().toISOString() : p.pago_em,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", p.id)
    .select("*")
    .single<Pedido>();

  if (novo === "pago") await enviarRecibo(p, c).catch((e) => console.error("recibo:", (e as Error).message));

  const statusVenda = STATUS_VENDA[novo];
  if (statusVenda) {
    const { error } = await sb.rpc("receber_venda", {
      p: {
        pedido: c.id,
        plataforma: "transfeer",
        produto: PRODUTO[p.plano],
        plano: p.plano,
        cliente_nome: p.nome,
        cliente_email: p.email,
        metodo: "pix",
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
  const data = new Date(c.paid_at ?? Date.now()).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const esc = (t: string) => t.replace(/[&<>"]/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[x]!);
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#141416">
  <h2 style="margin:0 0 12px">Pagamento aprovado ✈️</h2>
  <p>Olá${p.nome ? ", " + esc(p.nome.split(" ")[0]) : ""}! Seu passaporte HOT SOCIETY está ativo.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:6px 0;color:#666">Produto</td><td>${PRODUTO[p.plano]}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Valor</td><td>${valor} (Pix)</td></tr>
    <tr><td style="padding:6px 0;color:#666">Data</td><td>${data}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Pedido</td><td>${esc(c.id)}</td></tr>
  </table>
  <p><a href="${SITE}/dashboard" style="display:inline-block;background:#C9A24E;color:#141416;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Entrar na área de membros</a></p>
  <p style="font-size:12px;color:#666">Garantia de 7 dias: se se arrepender, peça o reembolso integral em Perfil → Minhas compras. Não há renovação automática.</p>
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
