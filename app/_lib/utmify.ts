// Envia as vendas para a UTMify (painel de rastreio dos anúncios).
// Só funciona com UTMIFY_API_TOKEN na Vercel; sem ela, nada é enviado e o resto segue normal.
// Doc: https://docs.utmify.com.br/envio-de-vendas

import { PRODUTO, type Pedido } from "./pagamentos";
import type { Utm } from "./utm";

const STATUS: Partial<Record<Pedido["status"], string>> = {
  pendente: "waiting_payment",
  pago: "paid",
  falhou: "refused",
  reembolsado: "refunded",
  chargeback: "chargedback",
};

// "2026-10-21T19:09:10.123Z" -> "2026-10-21 19:09:10" (UTC)
const data = (iso: string | null | undefined) => (iso ? new Date(iso).toISOString().slice(0, 19).replace("T", " ") : null);

// Sua parte em cada venda: a porcentagem que cai no seu Pix pela divisão.
export function comissaoCentavos(p: Pick<Pedido, "valor_centavos" | "split_centavos">) {
  if (p.split_centavos && p.split_centavos > 0) return p.split_centavos;
  const pct = Number(process.env.UTMIFY_PERCENTUAL || process.env.NOVUS_SPLIT_PERCENTUAL);
  return pct > 0 && pct <= 100 ? Math.floor((p.valor_centavos * pct) / 100) : p.valor_centavos;
}

type Extra = { ip?: string | null; cpf?: string | null; telefone?: string | null };

export async function enviarUtmify(p: Pedido & { utm?: Utm | null }, extra: Extra = {}) {
  const token = process.env.UTMIFY_API_TOKEN?.trim();
  const status = STATUS[p.status];
  if (!token || !status) return;

  const comissao = comissaoCentavos(p);
  const u = p.utm ?? {};
  const corpo = {
    orderId: p.id,
    platform: "HotSociety",
    paymentMethod: p.metodo === "cartao" ? "credit_card" : "pix",
    status,
    createdAt: data(p.criado_em),
    approvedDate: p.status === "pago" || p.status === "reembolsado" || p.status === "chargeback" ? data(p.pago_em) : null,
    refundedAt: p.status === "reembolsado" || p.status === "chargeback" ? data(new Date().toISOString()) : null,
    customer: {
      name: p.nome || p.email,
      email: p.email,
      phone: extra.telefone || null,
      document: extra.cpf || null,
      country: "BR",
      ...(extra.ip ? { ip: extra.ip } : {}),
    },
    products: [
      { id: p.plano, name: PRODUTO[p.plano], planId: p.plano, planName: PRODUTO[p.plano], quantity: 1, priceInCents: p.valor_centavos },
    ],
    trackingParameters: {
      src: u.src ?? null,
      sck: u.sck ?? null,
      utm_source: u.utm_source ?? null,
      utm_campaign: u.utm_campaign ?? null,
      utm_medium: u.utm_medium ?? null,
      utm_content: u.utm_content ?? null,
      utm_term: u.utm_term ?? null,
    },
    commission: {
      totalPriceInCents: p.valor_centavos,
      gatewayFeeInCents: p.valor_centavos - comissao,
      userCommissionInCents: comissao,
    },
  };

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch("https://api.utmify.com.br/api-credentials/orders", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-token": token },
      body: JSON.stringify(corpo),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) console.error("utmify:", r.status, (await r.text().catch(() => "")).slice(0, 300));
  } catch (e) {
    console.error("utmify:", (e as Error).message);
  }
}
