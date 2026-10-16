// Aviso automático da Transfeer (webhook). Cada Pix criado pelo site manda os eventos para cá.
// Só aceita avisos com a assinatura certa (TRANSFEER_WEBHOOK_SECRET) e ainda confirma
// o status direto na API da Transfeer antes de liberar ou bloquear acesso.

import { admin, aplicarCobranca, assinaturaConfere, configurado, consultarCobranca, type Cobranca } from "../../../_lib/pagamentos";

export async function POST(req: Request) {
  if (!configurado().ok) return Response.json({ ok: false }, { status: 503 });

  const cru = await req.text();
  if (cru.length > 200_000) return Response.json({ ok: false }, { status: 413 });
  if (!assinaturaConfere(cru, req.headers.get("x-webhook-signature"))) {
    console.warn("webhook Transfeer com assinatura inválida", req.headers.get("x-webhook-delivery"));
    return Response.json({ ok: false, erro: "assinatura inválida" }, { status: 401 });
  }

  let ev: { event?: string; resource?: string; data?: Cobranca };
  try {
    ev = JSON.parse(cru);
  } catch {
    return Response.json({ ok: false, erro: "JSON inválido" }, { status: 400 });
  }
  if (ev.resource !== "charge" || !ev.data?.id) return Response.json({ ok: true, ignorado: true });

  // Confirma na fonte. Se a consulta falhar, usa os dados do aviso (que já vieram assinados).
  let cobranca: Cobranca = ev.data;
  try {
    cobranca = await consultarCobranca(ev.data.id);
  } catch (e) {
    console.error("Transfeer consultar (webhook):", (e as Error).message);
  }

  const pedido = await aplicarCobranca(admin(), cobranca);
  return Response.json({ ok: true, evento: ev.event, pedido: pedido?.id ?? null, status: pedido?.status ?? null });
}
