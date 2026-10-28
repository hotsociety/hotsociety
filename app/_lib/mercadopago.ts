// SÓ SERVIDOR. Mercado Pago: links de pagamento da mentoria com valor exclusivo e cartão em até 12x.
// A Stripe não parcela cartão no Brasil; para isso o Painel gera um link do Mercado Pago (Checkout Pro).
//
// Variável na Vercel (tipo Secret):
//   MERCADOPAGO_ACCESS_TOKEN → Access Token de PRODUÇÃO (APP_USR-…) em
//                              mercadopago.com.br/developers → Suas integrações → (aplicação) → Credenciais de produção
// Avisos de pagamento chegam em https://hotsociety.com.br/api/pagamentos/mercadopago (o link já manda esse endereço).
// O aviso só serve de gatilho: o status é sempre conferido direto na API com o token.

import type { SupabaseClient } from "@supabase/supabase-js";
import { SITE } from "./pagamentos";

const MP = "https://api.mercadopago.com";
export const mpConfigurado = () => Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim());

async function mp(caminho: string, metodo: "GET" | "POST" | "PUT", corpo?: object, idem?: string) {
  const headers: Record<string, string> = { authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()}` };
  if (corpo) headers["content-type"] = "application/json";
  if (idem) headers["x-idempotency-key"] = idem;
  const r = await fetch(`${MP}${caminho}`, { method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined, cache: "no-store", signal: AbortSignal.timeout(15000) });
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown> & { message?: string; error?: string };
  if (!r.ok) throw new Error(`Mercado Pago ${r.status}: ${j.message || j.error || "erro"}`);
  return j;
}

// Cria o link (preferência do Checkout Pro) com o valor exato e até 12 parcelas.
export async function mpCriarLinkMentoria(l: { id: string; descricao: string; valor_centavos: number; lead_nome: string | null }) {
  const pref = await mp(
    "/checkout/preferences",
    "POST",
    {
      items: [{ id: "mentoria", title: l.descricao.slice(0, 120), quantity: 1, currency_id: "BRL", unit_price: l.valor_centavos / 100 }],
      external_reference: l.id,
      metadata: { mentoria_link: l.id, ...(l.lead_nome ? { lead: l.lead_nome.slice(0, 80) } : {}) },
      notification_url: `${SITE}/api/pagamentos/mercadopago`,
      payment_methods: { installments: 12 },
      statement_descriptor: "HOTSOCIETY",
      back_urls: { success: `${SITE}/mentoria?pago=1`, pending: `${SITE}/mentoria?pago=pendente`, failure: `${SITE}/mentoria` },
      auto_return: "approved",
    },
    `mentoria-mp-${l.id}`,
  );
  return { url: String(pref.init_point), linkId: String(pref.id) };
}

export async function mpDesativarLink(prefId: string) {
  await mp(`/checkout/preferences/${encodeURIComponent(prefId)}`, "PUT", { expires: true, expiration_date_to: new Date().toISOString() });
}

type PagamentoMP = {
  id: number;
  status: string;
  external_reference?: string | null;
  transaction_amount?: number;
  payment_type_id?: string;
  date_approved?: string | null;
  payer?: { email?: string | null; first_name?: string | null; last_name?: string | null } | null;
};

const METODO: Record<string, string> = { credit_card: "cartao", debit_card: "cartao", ticket: "boleto", bank_transfer: "pix" };

// Aviso do Mercado Pago: confere o pagamento na API e atualiza o link da mentoria (pago, reembolso, contestação).
export async function mpAplicarPagamento(sb: SupabaseClient, pagamentoId: string) {
  const p = (await mp(`/v1/payments/${encodeURIComponent(pagamentoId)}`, "GET")) as unknown as PagamentoMP;
  const ref = p.external_reference ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(ref)) return { ignorado: "sem referência" };
  const { data: l } = await sb
    .from("mentoria_links")
    .select("id, descricao, valor_centavos, lead_nome, status, stripe_link_id, criado_em, gateway")
    .eq("id", ref)
    .maybeSingle<{ id: string; descricao: string; valor_centavos: number; lead_nome: string | null; status: string; stripe_link_id: string | null; criado_em: string; gateway: string }>();
  if (!l || l.gateway !== "mercadopago") return { ignorado: "link não encontrado" };

  const email = p.payer?.email?.toLowerCase().slice(0, 200) ?? null;
  const nome = [p.payer?.first_name, p.payer?.last_name].filter(Boolean).join(" ").slice(0, 120) || null;
  const metodo = METODO[p.payment_type_id ?? ""] ?? "outro";

  if (p.status === "approved") {
    if (l.status === "pago") return { status: "pago" };
    if (Math.round((p.transaction_amount ?? 0) * 100) !== l.valor_centavos) {
      console.error(`mentoria MP ${l.id}: valor pago ${p.transaction_amount} diferente de ${l.valor_centavos / 100}`);
      return { status: l.status };
    }
    const pago_em = p.date_approved ?? new Date().toISOString();
    const { data: marcado } = await sb
      .from("mentoria_links")
      .update({ status: "pago", pi_id: `mp_${p.id}`, pago_em, pagador_email: email, pagador_nome: nome, metodo })
      .eq("id", l.id)
      .neq("status", "pago")
      .select("id");
    if (!marcado?.length) return { status: "pago" };
    if (l.stripe_link_id) await mpDesativarLink(l.stripe_link_id).catch(() => null);
    await lancarVenda(sb, l, { status: "pago", email, nome, metodo, quando: pago_em });
    return { status: "pago" };
  }

  if ((p.status === "refunded" || p.status === "charged_back") && l.status === "pago") {
    await sb.from("mentoria_links").update({ status: "reembolsado" }).eq("id", l.id);
    await lancarVenda(sb, l, { status: p.status === "charged_back" ? "chargeback" : "reembolsado", email, nome, metodo, quando: l.criado_em });
    return { status: "reembolsado" };
  }

  if ((p.status === "rejected" || p.status === "cancelled") && l.status === "aberto") {
    // Cartão recusado não fecha o link: o lead pode tentar de novo com outro cartão.
    return { status: "aberto" };
  }
  return { status: l.status };
}

async function lancarVenda(
  sb: SupabaseClient,
  l: { id: string; descricao: string; valor_centavos: number; lead_nome: string | null },
  v: { status: string; email: string | null; nome: string | null; metodo: string; quando: string },
) {
  const { error } = await sb.rpc("receber_venda", {
    p: {
      pedido: `mentoria-${l.id}`,
      plataforma: "mercadopago",
      produto: l.descricao,
      plano: "loja", // não mexe no acesso à plataforma
      cliente_nome: v.nome ?? l.lead_nome,
      cliente_email: v.email ?? "sem-email@hotsociety.com.br",
      metodo: v.metodo,
      valor: l.valor_centavos / 100,
      liquido: l.valor_centavos / 100,
      status: v.status,
      criado_em: v.quando,
    },
  });
  if (error) console.error("receber_venda mentoria MP:", error.message);
}
