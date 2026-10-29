// GET: adicionais comprados pelo aluno logado (hoje: Arsenal do Cappu + Networking → convite do Discord).
// O convite só sai para quem tem um pedido pago com o adicional.
import { admin, ARSENAL_CONVITE, usuarioDoPedido } from "../../_lib/pagamentos";

const resp = (corpo: object, status = 200) => Response.json(corpo, { status, headers: { "cache-control": "no-store" } });

export async function GET(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return resp({ arsenal: null });
  const user = await usuarioDoPedido(req);
  if (!user) return resp({ erro: "Entre na sua conta." }, 401);
  const { data } = await admin()
    .from("pedidos")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pago")
    .eq("adicional", "arsenal")
    .limit(1);
  return resp({ arsenal: data?.length ? ARSENAL_CONVITE : null });
}
