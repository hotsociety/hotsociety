// Aviso automático da Transfeer (webhook). Só aceita avisos com a assinatura certa (TRANSFEER_WEBHOOK_SECRET)
// e ainda confirma o status direto na API da Transfeer antes de liberar ou bloquear acesso.

import { admin, aplicarCobranca, transfeerAssinaturaConfere, transfeerConsultar, transfeerNormalizar, type Cobranca } from "../../../_lib/pagamentos";

export async function POST(req: Request) {
  if (!process.env.TRANSFEER_WEBHOOK_SECRET || !process.env.SUPABASE_SERVICE_ROLE_KEY) return Response.json({ ok: false }, { status: 503 });

  const cru = await req.text();
  if (cru.length > 200_000) return Response.json({ ok: false }, { status: 413 });
  if (!transfeerAssinaturaConfere(cru, req.headers.get("x-webhook-signature"))) {
    console.warn("webhook Transfeer com assinatura inválida", req.headers.get("x-webhook-delivery"));
    return Response.json({ ok: false, erro: "assinatura inválida" }, { status: 401 });
  }

  let ev: { event?: string; resource?: string; data?: Record<string, unknown> };
  try {
    ev = JSON.parse(cru);
  } catch {
    return Response.json({ ok: false, erro: "JSON inválido" }, { status: 400 });
  }
  if (ev.resource !== "charge" || !ev.data?.id) return Response.json({ ok: true, ignorado: true });

  let cobranca: Cobranca = transfeerNormalizar(ev.data);
  try {
    cobranca = await transfeerConsultar(cobranca.id);
  } catch (e) {
    console.error("Transfeer consultar (webhook):", (e as Error).message);
  }

  const pedido = await aplicarCobranca(admin(), cobranca);
  return Response.json({ ok: true, evento: ev.event, pedido: pedido?.id ?? null, status: pedido?.status ?? null });
}
