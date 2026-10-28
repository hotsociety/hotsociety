// Aviso automático da Stripe (webhook). Endpoint: https://hotsociety.com.br/api/pagamentos/stripe
// Só aceita avisos com a assinatura certa (Stripe-Signature com STRIPE_WEBHOOK_SECRET) e sempre
// confere o status de novo na API da Stripe antes de liberar ou bloquear acesso.
//
// Eventos a marcar no painel da Stripe:
//   payment_intent.succeeded · payment_intent.payment_failed · payment_intent.canceled
//   checkout.session.completed · checkout.session.async_payment_succeeded · checkout.session.async_payment_failed · checkout.session.expired
//   charge.refunded · charge.dispute.created · charge.dispute.closed

import { admin, aplicarCobranca, stripeAssinaturaConfere, stripeConsultar, type Pedido } from "../../../_lib/pagamentos";

type Obj = Record<string, unknown> & { id?: string; metadata?: Record<string, string> | null };

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) return Response.json({ ok: false }, { status: 503 });

  const cru = await req.text();
  if (cru.length > 500_000) return Response.json({ ok: false }, { status: 413 });
  if (!stripeAssinaturaConfere(cru, req.headers.get("stripe-signature"))) {
    console.warn("aviso Stripe com assinatura inválida");
    return Response.json({ ok: false, erro: "assinatura inválida" }, { status: 400 });
  }

  let ev: { type?: string; data?: { object?: Obj } };
  try {
    ev = JSON.parse(cru);
  } catch {
    return Response.json({ ok: false, erro: "JSON inválido" }, { status: 400 });
  }
  const o = ev.data?.object ?? {};
  const tipo = ev.type ?? "";

  // Descobre o nosso pedido pelo metadata (pedido), client_reference_id ou pelo id da cobrança.
  const sb = admin();
  const ref = o.metadata?.pedido ?? (typeof o.client_reference_id === "string" ? o.client_reference_id : null);
  let pedido: Pedido | null = null;
  if (ref && /^[0-9a-f-]{36}$/i.test(ref)) ({ data: pedido } = await sb.from("pedidos").select("*").eq("id", ref).maybeSingle<Pedido>());
  const ids = [o.id, o.payment_intent, o.checkout_session].filter((x): x is string => typeof x === "string");
  for (const id of ids) {
    if (pedido) break;
    ({ data: pedido } = await sb.from("pedidos").select("*").eq("charge_id", id).maybeSingle<Pedido>());
  }
  // Reembolso/contestação: o objeto é a cobrança (charge/dispute); o pedido está no PaymentIntent dela.
  if (!pedido && typeof o.payment_intent === "string") {
    const r = await fetch(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(o.payment_intent)}`, {
      headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
      cache: "no-store",
    }).catch(() => null);
    const pi = r?.ok ? ((await r.json()) as Obj) : null;
    const p = pi?.metadata?.pedido;
    if (p && /^[0-9a-f-]{36}$/i.test(p)) ({ data: pedido } = await sb.from("pedidos").select("*").eq("id", p).maybeSingle<Pedido>());
  }
  if (!pedido || pedido.gateway !== "stripe") return Response.json({ ok: true, ignorado: tipo });

  try {
    const c = await stripeConsultar(pedido);
    if (!c) return Response.json({ ok: true, ignorado: "sem cobrança" });
    // Pix pela página da Stripe: a sessão expirou sem pagamento.
    if (tipo === "checkout.session.expired" && !c.status) c.status = "expirado";
    const atual = await aplicarCobranca(sb, { ...c, referencia: pedido.id, sessao: c.sessao ?? (pedido.charge_id?.startsWith("cs_") ? pedido.charge_id : null) });
    return Response.json({ ok: true, pedido: atual?.id ?? null, status: atual?.status ?? null });
  } catch (e) {
    console.error("Stripe conferir (aviso):", (e as Error).message);
    return Response.json({ ok: false }, { status: 500 }); // a Stripe tenta de novo depois
  }
}
