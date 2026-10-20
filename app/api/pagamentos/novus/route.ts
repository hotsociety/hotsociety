// Aviso automático da Novus (postback). Cada cobrança criada pelo site manda as mudanças de status para cá.
// Só aceita avisos com a assinatura certa (HMAC-SHA256 com a chave da API) e ainda confirma
// o status direto na API da Novus antes de liberar ou bloquear acesso.

import { admin, aplicarCobranca, consultarPedido, novusAssinaturaConfere, novusNormalizar, type Cobranca, type Pedido } from "../../../_lib/pagamentos";

export async function POST(req: Request) {
  if (!process.env.NOVUS_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) return Response.json({ ok: false }, { status: 503 });

  const cru = await req.text();
  if (cru.length > 200_000) return Response.json({ ok: false }, { status: 413 });
  if (!novusAssinaturaConfere(cru, req.headers.get("x-webhook-signature"))) {
    console.warn("aviso Novus com assinatura inválida");
    return Response.json({ ok: false, erro: "assinatura inválida" }, { status: 401 });
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = JSON.parse(cru);
  } catch {
    return Response.json({ ok: false, erro: "JSON inválido" }, { status: 400 });
  }
  // Postback vem "solto"; webhook global vem num envelope { event, timestamp, data }.
  const evento = typeof corpo.event === "string" ? corpo.event : null;
  if (evento && /^withdrawal\.|underpayment/.test(evento)) return Response.json({ ok: true, ignorado: evento });
  const bruto = (corpo.data && typeof corpo.data === "object" ? corpo.data : corpo) as Record<string, unknown>;
  const aviso = novusNormalizar(bruto);

  const sb = admin();
  // Acha o pedido pela nossa referência ou pelo id da cobrança/sessão.
  let pedido: Pedido | null = null;
  if (aviso.referencia && /^[0-9a-f-]{36}$/i.test(aviso.referencia)) {
    ({ data: pedido } = await sb.from("pedidos").select("*").eq("id", aviso.referencia).maybeSingle<Pedido>());
  }
  for (const id of [aviso.id, aviso.sessao]) {
    if (pedido || !id) continue;
    ({ data: pedido } = await sb.from("pedidos").select("*").eq("charge_id", id).maybeSingle<Pedido>());
  }
  if (!pedido) return Response.json({ ok: true, ignorado: "pedido não encontrado" });

  // Confirma na fonte. Se a consulta falhar, usa os dados do aviso (que já vieram assinados).
  let cobranca: Cobranca = { ...aviso, referencia: pedido.id };
  try {
    const c = await consultarPedido(pedido);
    if (c?.id) cobranca = { ...c, referencia: pedido.id, sessao: c.sessao ?? aviso.sessao };
  } catch (e) {
    console.error("Novus consultar (aviso):", (e as Error).message);
  }

  const atual = await aplicarCobranca(sb, cobranca);
  return Response.json({ ok: true, pedido: atual?.id ?? null, status: atual?.status ?? null });
}
