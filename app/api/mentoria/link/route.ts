// Painel → Mentoria → Links de pagamento.
// POST { descricao, valor, aplicacao?, gateway? } → cria um link de uso único e devolve { id, url }.
//   gateway "stripe" (padrão): Pix, boleto, cartão à vista · "mercadopago": cartão em até 12x.
// POST { acao: "desativar", id }          → desliga um link ainda não pago.
// Só mentor/admin (a função do banco confere o cargo com o login de quem chamou).

import { clienteDoUsuario } from "../../../_lib/email";
import { admin, stripeCriarLinkMentoria, stripeDesativarLink } from "../../../_lib/pagamentos";
import { mpConfigurado, mpCriarLinkMentoria, mpDesativarLink } from "../../../_lib/mercadopago";

const resp = (corpo: object, status = 200) => Response.json(corpo, { status, headers: { "cache-control": "no-store" } });
const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return resp({ erro: "Pagamento não configurado." }, 503);
  const sbUser = clienteDoUsuario(req);
  if (!sbUser) return resp({ erro: "Entre na sua conta." }, 401);

  let corpo: { acao?: string; id?: string; descricao?: string; valor?: number | string; aplicacao?: string | null; gateway?: string };
  try {
    corpo = await req.json();
  } catch {
    return resp({ erro: "Pedido inválido." }, 400);
  }
  const sb = admin();

  if (corpo.acao === "desativar") {
    if (!corpo.id || !UUID.test(corpo.id)) return resp({ erro: "Link inválido." }, 400);
    const { data: linkId, error } = await sbUser.rpc("mentoria_link_pode_desativar", { p_id: corpo.id });
    if (error) return resp({ erro: error.message.includes("permiss") ? "Sem permissão." : error.message }, 403);
    const { data: g } = await sb.from("mentoria_links").select("gateway").eq("id", corpo.id).maybeSingle<{ gateway: string }>();
    const desligar = g?.gateway === "mercadopago" ? mpDesativarLink : stripeDesativarLink;
    if (linkId) await desligar(String(linkId)).catch((e) => console.error("desativar link:", (e as Error).message));
    await sb.from("mentoria_links").update({ status: "desativado" }).eq("id", corpo.id).eq("status", "aberto");
    return resp({ ok: true });
  }

  const gateway = corpo.gateway === "mercadopago" ? "mercadopago" : "stripe";
  if (gateway === "mercadopago" && !mpConfigurado()) return resp({ erro: "Mercado Pago ainda não configurado (falta a chave na Vercel)." }, 503);
  if (gateway === "stripe" && !process.env.STRIPE_SECRET_KEY) return resp({ erro: "Stripe não configurada." }, 503);

  const descricao = (corpo.descricao ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const valor = typeof corpo.valor === "number" ? corpo.valor : Number(String(corpo.valor ?? "").replace(/\./g, "").replace(",", "."));
  const centavos = Math.round(valor * 100);
  const aplicacao = corpo.aplicacao && UUID.test(corpo.aplicacao) ? corpo.aplicacao : null;
  if (descricao.length < 2) return resp({ erro: "Escreva o que está sendo vendido." }, 400);
  if (!Number.isFinite(centavos) || centavos < 100) return resp({ erro: "Valor mínimo: R$ 1,00." }, 400);
  if (centavos > 100_000_000) return resp({ erro: "Valor alto demais." }, 400);

  const { data: id, error } = await sbUser.rpc("mentoria_link_criar", { p_aplicacao: aplicacao, p_descricao: descricao, p_valor_centavos: centavos });
  if (error || !id) return resp({ erro: error?.message.includes("permiss") ? "Sem permissão." : (error?.message ?? "Não deu para criar.") }, 403);

  const { data: l } = await sb.from("mentoria_links").select("lead_nome").eq("id", id).single<{ lead_nome: string | null }>();
  try {
    const dados = { id: String(id), descricao, valor_centavos: centavos, lead_nome: l?.lead_nome ?? null };
    const { url, linkId } = gateway === "mercadopago" ? await mpCriarLinkMentoria(dados) : await stripeCriarLinkMentoria(dados);
    // "gateway" só é gravado no Mercado Pago (links da Stripe ficam com o padrão do banco).
    const { error: eUp } = await sb
      .from("mentoria_links")
      .update({ url, stripe_link_id: linkId, status: "aberto", ...(gateway === "mercadopago" ? { gateway } : {}) })
      .eq("id", id);
    if (eUp) throw new Error(`salvar link: ${eUp.message}`);
    return resp({ id, url });
  } catch (e) {
    console.error("criar link mentoria:", (e as Error).message);
    await sb.from("mentoria_links").delete().eq("id", id).eq("status", "criando");
    return resp({ erro: `${gateway === "mercadopago" ? "O Mercado Pago" : "A Stripe"} não criou o link agora. Tente de novo em instantes.` }, 502);
  }
}

// GET: quais formas de gerar link estão ligadas (o Painel esconde/avisa o que falta configurar).
export function GET() {
  return resp({ stripe: Boolean(process.env.STRIPE_SECRET_KEY), mercadopago: mpConfigurado() });
}
