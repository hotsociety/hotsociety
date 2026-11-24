// SÓ SERVIDOR. Links de pagamento da mentoria pela Appmax (loja HOT SOCIETY).
// O link é uma página do próprio site (/pagar/<id>): o lead preenche os dados e paga com Pix (QR Code na página)
// ou cartão em até 12x sem juros (tokenizado no navegador pelo script da Appmax).
// Cada tentativa vira um pedido na Appmax com o SKU "m-<id do link>", que é como o webhook acha o link.
// Pago → o link fecha, entra em Vendas e o lead vira mentorado. Reembolso ou contestação → desfaz.

import type { SupabaseClient } from "@supabase/supabase-js";
import { SITE, appmaxNormalizar, type CartaoTokenizado } from "./pagamentos";
import { appmaxCartao, appmaxConsultarPedido, appmaxCriarCliente, appmaxCriarPedido, appmaxParcelasMax, appmaxPix } from "./appmax";
import { mentoradoDoPagamento, mentoradoReembolso } from "./mentorados";

export const urlPagarMentoria = (id: string) => `${SITE}/pagar/${id}`;
export const SKU_MENTORIA = (id: string) => `m-${id}`;

export type LinkMentoria = {
  id: string;
  descricao: string;
  valor_centavos: number;
  lead_nome: string | null;
  status: string;
  gateway: string;
  pi_id: string | null;
  metodo: string | null;
  pagador_email: string | null;
  pagador_nome: string | null;
  pago_em: string | null;
  criado_em: string;
};

const CAMPOS = "id, descricao, valor_centavos, lead_nome, status, gateway, pi_id, metodo, pagador_email, pagador_nome, pago_em, criado_em";

export async function linkMentoria(sb: SupabaseClient, id: string): Promise<LinkMentoria | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await sb.from("mentoria_links").select(CAMPOS).eq("id", id).maybeSingle<LinkMentoria>();
  return data && data.gateway === "appmax" ? data : null;
}

export type Comprador = { nome: string; email: string; cpf: string; telefone: string; ip: string };

// Gera a cobrança de uma tentativa (Pix ou cartão). Devolve o Pix ou o resultado do cartão.
export async function mentoriaAppmaxCobrar(sb: SupabaseClient, l: LinkMentoria, c: Comprador, cartao: CartaoTokenizado | null) {
  if (cartao && (cartao.parcelas < 1 || cartao.parcelas > appmaxParcelasMax(l.valor_centavos))) throw new Error("parcelas fora do limite");
  const cliente = await appmaxCriarCliente(c);
  const pedido = await appmaxCriarPedido(cliente, [{ sku: SKU_MENTORIA(l.id), nome: l.descricao, centavos: l.valor_centavos }]);
  // Guarda quem está pagando e a tentativa mais recente (o webhook também acha o link pelo SKU).
  await sb
    .from("mentoria_links")
    .update({ pi_id: `appmax_${pedido}`, pagador_email: c.email, pagador_nome: c.nome, metodo: cartao ? "cartao" : "pix" })
    .eq("id", l.id)
    .eq("status", "aberto");

  if (!cartao) {
    const pix = await appmaxPix(pedido, c.cpf, new Date(Date.now() + 3600e3));
    return { pedido, br_code: pix.emv, expira_em: pix.expiraEm ?? new Date(Date.now() + 3600e3).toISOString(), status: "aberto" as string };
  }
  let recusado = false;
  try {
    await appmaxCartao(pedido, cliente, { token: cartao.token, titular: cartao.titular, cpf: c.cpf, parcelas: cartao.parcelas });
  } catch (e) {
    const st = (e as { status?: number }).status;
    recusado = typeof st === "number" && st >= 400 && st < 500;
    console.error(`mentoria ${l.id} cartão Appmax ${pedido}:`, (e as Error).message);
  }
  const r = await mentoriaAppmaxAplicar(sb, l.id, String(pedido)).catch(() => null);
  const status = r?.status ?? "aberto";
  return { pedido, br_code: null, expira_em: null, status: recusado && status === "aberto" ? "recusado" : status };
}

// Confere um pedido da Appmax na API e aplica no link (pago, reembolso, contestação). Pode ser chamado várias vezes.
export async function mentoriaAppmaxAplicar(sb: SupabaseClient, linkId: string, pedidoAppmax: string): Promise<{ status: string }> {
  const l = await linkMentoria(sb, linkId);
  if (!l) return { status: "ignorado" };
  const o = await appmaxConsultarPedido(pedidoAppmax);
  const c = appmaxNormalizar({ id: l.id, metodo: l.metodo === "cartao" ? "cartao" : "pix", valor_centavos: l.valor_centavos }, o);
  const desteLink = l.pi_id === `appmax_${pedidoAppmax}`;

  if (c.status === "pago") {
    if (l.status === "pago") return { status: "pago" };
    if (c.valor !== l.valor_centavos) {
      console.error(`mentoria ${l.id}: valor pago ${c.valor} diferente de ${l.valor_centavos}`);
      return { status: l.status };
    }
    const pago_em = c.pago_em ?? new Date().toISOString();
    const { data: marcado } = await sb
      .from("mentoria_links")
      .update({ status: "pago", pi_id: `appmax_${pedidoAppmax}`, pago_em })
      .eq("id", l.id)
      .neq("status", "pago")
      .select("id");
    if (!marcado?.length) return { status: "pago" };
    await lancarVenda(sb, l, "pago", pago_em);
    // Pagou → vira mentorado (conta, aba Mentorados, acesso e e-mail de boas-vindas).
    await mentoradoDoPagamento(sb, l.id).catch((e) => console.error(`mentorado pagamento ${l.id}:`, (e as Error).message));
    return { status: "pago" };
  }

  if ((c.status === "reembolsado" || c.status === "chargeback") && l.status === "pago" && desteLink) {
    await sb.from("mentoria_links").update({ status: "reembolsado" }).eq("id", l.id);
    await mentoradoReembolso(sb, l.id).catch((e) => console.error(`mentorado reembolso ${l.id}:`, (e as Error).message));
    await lancarVenda(sb, l, c.status === "chargeback" ? "chargeback" : "reembolsado", l.criado_em);
    return { status: "reembolsado" };
  }
  // Cartão recusado ou Pix vencido não fecham o link: o lead pode tentar de novo.
  if (desteLink && (c.status === "falhou" || c.status === "expirado")) return { status: c.status === "falhou" ? "recusado" : "expirado" };
  return { status: l.status };
}

async function lancarVenda(sb: SupabaseClient, l: LinkMentoria, status: string, quando: string) {
  const { error } = await sb.rpc("receber_venda", {
    p: {
      pedido: `mentoria-${l.id}`,
      plataforma: "appmax",
      produto: l.descricao,
      plano: "loja", // não mexe no acesso à plataforma
      cliente_nome: l.pagador_nome ?? l.lead_nome,
      cliente_email: l.pagador_email ?? "sem-email@hotsociety.com.br",
      metodo: l.metodo === "cartao" ? "cartao" : "pix",
      valor: l.valor_centavos / 100,
      liquido: l.valor_centavos / 100,
      status,
      criado_em: quando,
    },
  });
  if (error) console.error("receber_venda mentoria Appmax:", error.message);
}
