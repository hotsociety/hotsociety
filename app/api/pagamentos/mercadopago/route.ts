// Aviso automático do Mercado Pago (links da mentoria com cartão em até 12x).
// Endpoint: https://hotsociety.com.br/api/pagamentos/mercadopago (cada link já manda este endereço).
// O corpo do aviso não é confiável por si: o pagamento é sempre consultado de novo na API com o token.

import { admin } from "../../../_lib/pagamentos";
import { mpAplicarPagamento, mpConfigurado } from "../../../_lib/mercadopago";

export async function POST(req: Request) {
  if (!mpConfigurado() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return Response.json({ ok: false }, { status: 503 });

  const url = new URL(req.url);
  let corpo: { type?: string; action?: string; topic?: string; data?: { id?: string | number }; resource?: string } = {};
  try {
    corpo = await req.json();
  } catch {
    /* alguns avisos vêm só na URL */
  }
  const tipo = corpo.type ?? corpo.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "";
  if (tipo !== "payment") return Response.json({ ok: true, ignorado: tipo || "sem tipo" });

  const id = String(corpo.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? (corpo.resource ?? "").split("/").pop() ?? "");
  if (!/^\d{1,20}$/.test(id)) return Response.json({ ok: true, ignorado: "sem id" });

  try {
    const r = await mpAplicarPagamento(admin(), id);
    return Response.json({ ok: true, ...r });
  } catch (e) {
    console.error("Mercado Pago aviso:", (e as Error).message);
    return Response.json({ ok: false }, { status: 500 }); // o Mercado Pago tenta de novo
  }
}

// O Mercado Pago às vezes testa o endereço com GET.
export function GET() {
  return Response.json({ ok: true });
}
