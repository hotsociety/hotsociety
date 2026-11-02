// POST { codigo, plano }: confere um cupom para mostrar o desconto no checkout.
// O banco não deixa mais o navegador conferir direto: aqui há limite de tentativas (por conta ou por IP).
import { createHmac } from "node:crypto";
import { admin, usuarioDoPedido } from "../../../_lib/pagamentos";

const resp = (corpo: object, status = 200) => Response.json(corpo, { status, headers: { "cache-control": "no-store" } });

export async function POST(req: Request) {
  let corpo: { codigo?: string; plano?: string };
  try {
    corpo = await req.json();
  } catch {
    return resp({ ok: false }, 400);
  }
  const codigo = (corpo.codigo ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  const plano = corpo.plano === "mensal" ? "mensal" : corpo.plano === "anual" ? "anual" : null;
  if (!codigo || !plano) return resp({ ok: false });

  const sb = admin();
  const user = await usuarioDoPedido(req).catch(() => null);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?";
  const chave = user ? `u:${user.id}` : `ip:${createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "hs").update(`ip:${ip}`).digest("hex").slice(0, 40)}`;
  const { data: pode } = await sb.rpc("hs_cupom_pode_tentar", { p_chave: chave });
  if (pode === false) return resp({ ok: false, erro: "Muitas tentativas. Espere um pouco e tente de novo." }, 429);

  const { data } = await sb.rpc("conferir_cupom", { p_codigo: codigo, p_plano: plano });
  return resp((data as object) ?? { ok: false });
}
