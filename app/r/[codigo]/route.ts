// Link de afiliado: hotsociety.com.br/r/<codigo>?o=ig
// Conta o clique (1 por visitante por dia), guarda o código por 30 dias (vale o último clique) e manda para o site.
import { createHash } from "node:crypto";
import { connection } from "next/server";
import { admin } from "../../_lib/pagamentos";

export async function GET(req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  await connection();
  const { codigo: bruto } = await params;
  const codigo = bruto.toLowerCase().slice(0, 24);
  const url = new URL(req.url);
  const destino = new URL("/", url);
  // Leva junto os UTMs, se o afiliado usar.
  for (const [k, v] of url.searchParams) if (/^(utm_|src$|sck$)/.test(k)) destino.searchParams.set(k, v);

  const res = Response.redirect(destino, 302);
  if (!/^[a-z0-9-]{3,24}$/.test(codigo)) return res;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0";
  const dia = new Date().toISOString().slice(0, 10);
  const visitante = createHash("sha256").update(`${ip}|${req.headers.get("user-agent") ?? ""}|${dia}`).digest("hex").slice(0, 40);
  let existe = false;
  try {
    const { data } = await admin().rpc("registrar_clique", { p_codigo: codigo, p_origem: url.searchParams.get("o") ?? "", p_visitante: visitante });
    existe = data === true;
  } catch (e) {
    console.error("clique afiliado:", (e as Error).message);
  }
  if (!existe) return res;

  const headers = new Headers(res.headers);
  headers.append("set-cookie", `hs_ref=${codigo}; Path=/; Max-Age=${30 * 86400}; SameSite=Lax; Secure`);
  return new Response(null, { status: 302, headers });
}
