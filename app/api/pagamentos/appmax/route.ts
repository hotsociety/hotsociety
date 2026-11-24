// Aviso automático da Appmax (webhook). Cadastro: Appmax → API → Webhooks, loja HOT SOCIETY.
// URL: https://hotsociety.com.br/api/pagamentos/appmax
// Eventos de pedido e pagamento: order_paid, order_approved, order_paid_by_pix, order_integrated, order_pix_expired,
//   order_refund, order_partial_refund, order_chargeback_in_treatment, order_chargeback_gain, order_refused_by_risk,
//   payment_not_authorized.
// Com APPMAX_WEBHOOK_SECRET, só aceita avisos com o header Signature certo. Com ou sem secret, o status é sempre
// conferido de novo na API da Appmax antes de liberar ou bloquear acesso (o aviso sozinho não decide nada).

import { admin, aplicarCobranca, consultarPedido, type Pedido } from "../../../_lib/pagamentos";
import { appmaxAssinaturaConfere, appmaxConfigurada } from "../../../_lib/appmax";

const idPedido = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v > 0 ? String(v) : typeof v === "string" && /^\d{1,15}$/.test(v.trim()) ? v.trim() : null);

export async function POST(req: Request) {
  if (!appmaxConfigurada() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return Response.json({ ok: false }, { status: 503 });

  const cru = await req.text();
  if (cru.length > 300_000) return Response.json({ ok: false }, { status: 413 });
  if (!appmaxAssinaturaConfere(cru, req.headers.get("signature"))) {
    console.warn("aviso Appmax com assinatura inválida");
    return Response.json({ ok: false, erro: "assinatura inválida" }, { status: 401 });
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = JSON.parse(cru);
  } catch {
    return Response.json({ ok: false, erro: "JSON inválido" }, { status: 400 });
  }
  const evento = typeof corpo.event === "string" ? corpo.event : "";
  // Avisos de cliente, assinatura e saque não mexem em pedidos.
  if (/^(customer|subscription|withdraw)_/.test(evento) || /^(customer|subscription|withdraw)$/.test(String(corpo.event_type ?? ""))) {
    return Response.json({ ok: true, ignorado: evento || String(corpo.event_type) });
  }

  const d = (corpo.data && typeof corpo.data === "object" ? corpo.data : corpo) as Record<string, unknown>;
  const pedidoAppmax = idPedido(d.order_id) ?? idPedido((d.order as { id?: unknown } | undefined)?.id) ?? idPedido(corpo.order_id) ?? idPedido(d.id);
  if (!pedidoAppmax) return Response.json({ ok: true, ignorado: evento || "sem pedido" });

  const sb = admin();
  const { data: pedido } = await sb.from("pedidos").select("*").eq("gateway", "appmax").eq("charge_id", pedidoAppmax).maybeSingle<Pedido>();
  if (!pedido) return Response.json({ ok: true, ignorado: "pedido não encontrado" });

  // Confirma na fonte. Se a consulta falhar, devolve erro e a Appmax reenvia depois (30 min, 2 h e 4 h).
  try {
    const c = await consultarPedido(pedido);
    if (!c?.id) throw new Error("consulta sem pedido");
    const atual = await aplicarCobranca(sb, { ...c, referencia: pedido.id });
    return Response.json({ ok: true, pedido: atual?.id ?? null, status: atual?.status ?? null });
  } catch (e) {
    console.error("Appmax conferir (aviso):", (e as Error).message);
    return Response.json({ ok: false, erro: "conferência indisponível" }, { status: 503 });
  }
}
