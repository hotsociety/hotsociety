// Verificação de saúde para monitor de queda (UptimeRobot, Better Stack…).
// 200 = site e banco respondendo. 503 = algo fora do ar.
// Não mostra nenhum dado, só se cada parte está de pé.
import { connection } from "next/server";
import { configurado } from "../../_lib/pagamentos";

export async function GET() {
  await connection(); // sempre na hora, nunca guardado em cache
  const inicio = Date.now();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let banco = false;
  try {
    const r = await fetch(`${url}/auth/v1/health`, { headers: { apikey: chave ?? "" }, cache: "no-store", signal: AbortSignal.timeout(5000) });
    banco = r.ok;
  } catch {
    banco = false;
  }
  const cfg = configurado();
  const pix = cfg.ok;
  const ok = banco;
  return Response.json(
    { ok, banco, pix, gateway: cfg.gateway, cartao: cfg.ok && cfg.cartao, ms: Date.now() - inicio },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
