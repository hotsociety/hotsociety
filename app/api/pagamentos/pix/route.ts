// POST: gera a cobrança de um plano para quem está logado (Pix com QR Code, ou cartão na página segura do gateway).
// GET ?id=PEDIDO: devolve o status do pedido (e confere direto no gateway se ainda estiver pendente).
// GET sem id: diz quais formas de pagamento estão ligadas.

import {
  VALOR_CENTAVOS,
  admin,
  aplicarCobranca,
  configurado,
  consultarPedido,
  cpfValido,
  criarCobranca,
  gatewayAtivo,
  splitNovus,
  usuarioDoPedido,
  type ErroGateway,
  type Metodo,
  type Pedido,
  type Plano,
} from "../../../_lib/pagamentos";
import { SITE } from "../../../_lib/site";
import { ADICIONAL, adicionalValido } from "../../../_lib/adicional";
import { ARSENAL_CONVITE, temArsenal } from "../../../_lib/pagamentos";
import { ITENS_PAGOS, itemPago } from "../../../_lib/loja";
import { limparUtm } from "../../../_lib/utm";
import { enviarUtmify } from "../../../_lib/utmify";

const resp = (corpo: object, status = 200) => Response.json(corpo, { status, headers: { "cache-control": "no-store" } });

function publico(p: Pedido) {
  return {
    id: p.id,
    plano: p.plano,
    item: p.item ?? null,
    metodo: p.metodo ?? "pix",
    valor: p.valor_centavos / 100,
    status: p.status,
    br_code: p.status === "pendente" && p.metodo !== "cartao" ? p.br_code : null,
    // Página segura do gateway (cartão, ou Pix da Stripe quando o QR não pode ser mostrado aqui).
    checkout_url: p.status === "pendente" ? (p.checkout_url ?? null) : null,
    expira_em: p.expira_em,
    adicional: p.adicional ?? null,
    // Convite do Discord do adicional: só depois de pago.
    convite: temArsenal(p) && p.status === "pago" ? ARSENAL_CONVITE : null,
  };
}

export async function POST(req: Request) {
  const cfg = configurado();
  if (!cfg.ok) {
    console.error("Pagamento desligado, faltam variáveis:", cfg.faltando.join(", "));
    return resp({ erro: "O pagamento ainda não está disponível. Tente mais tarde." }, 503);
  }

  const user = await usuarioDoPedido(req);
  if (!user) return resp({ erro: "Entre na sua conta para assinar." }, 401);

  let corpo: { plano?: string; item?: string; nome?: string; cpf?: string; telefone?: string; aceite?: boolean; cupom?: string; metodo?: string; utm?: unknown; adicional?: string };
  try {
    corpo = await req.json();
  } catch {
    return resp({ erro: "Pedido inválido." }, 400);
  }
  // Item da Hot Store (ex.: a call) ou plano de assinatura.
  const item = itemPago(corpo.item);
  const plano: Plano | null = item ? "loja" : corpo.plano === "anual" ? "anual" : corpo.plano === "mensal" ? "mensal" : null;
  const metodo: Metodo = corpo.metodo === "cartao" ? "cartao" : "pix";
  const nome = (corpo.nome ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const cpf = (corpo.cpf ?? "").replace(/\D/g, "");
  const telefone = (corpo.telefone ?? "").replace(/\D/g, "").slice(0, 13);
  if (!plano) return resp({ erro: corpo.item ? "Este item não está à venda." : "Escolha um plano." }, 400);
  if (metodo === "cartao" && !cfg.cartao) return resp({ erro: "Pagamento com cartão ainda não está disponível. Use o Pix." }, 400);
  if (nome.split(" ").length < 2) return resp({ erro: "Digite seu nome completo." }, 400);
  if (!cpfValido(cpf)) return resp({ erro: "CPF inválido. Confira os números." }, 400);
  if (corpo.aceite !== true) return resp({ erro: "Para continuar, confirme que tem 18 anos ou mais e aceita os termos." }, 400);

  const sb = admin();
  const gateway = gatewayAtivo();

  // Cupom de desconto (conferido no banco, nunca pelo navegador).
  const codigo = (corpo.cupom ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  let desconto = 0;
  if (codigo && plano === "loja") return resp({ erro: "Cupom não vale para itens da loja." }, 400);
  if (codigo && plano !== "loja") {
    const { data: c } = await sb.rpc("conferir_cupom", { p_codigo: codigo, p_plano: plano });
    const r = c as { ok: boolean; desconto?: number } | null;
    if (!r?.ok) return resp({ erro: "Cupom inválido, vencido ou esgotado." }, 400);
    desconto = Math.round((VALOR_CENTAVOS[plano] * (r.desconto ?? 0)) / 100);
  }
  // Adicional (Arsenal do Cappu + Networking): só nos planos e só pela Stripe (uma página com os dois itens).
  const adicional = !item && gateway === "stripe" ? adicionalValido(corpo.adicional) : null;
  const adicionalCentavos = adicional ? ADICIONAL.preco * 100 : 0;
  const valor = (item ? ITENS_PAGOS[item].preco * 100 : VALOR_CENTAVOS[plano as "mensal" | "anual"] - desconto) + adicionalCentavos;

  // Já existe uma cobrança igual ainda válida? Reaproveita.
  const { data: aberto } = await sb
    .from("pedidos")
    .select("*")
    .eq("user_id", user.id)
    .eq("plano", plano)
    .filter("item", item ? "eq" : "is", item ?? null)
    .eq("valor_centavos", valor)
    .eq("gateway", gateway)
    .eq("metodo", metodo)
    .filter("adicional", adicional ? "eq" : "is", adicional ?? null)
    .eq("status", "pendente")
    .gt("expira_em", new Date(Date.now() + 5 * 60_000).toISOString())
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle<Pedido>();
  if (aberto && (aberto.br_code || aberto.checkout_url)) return resp(publico(aberto));

  // Freio contra abuso: no máximo 8 cobranças por hora por conta.
  const { count } = await sb
    .from("pedidos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gt("criado_em", new Date(Date.now() - 3600_000).toISOString());
  if ((count ?? 0) >= 8) return resp({ erro: "Muitas tentativas. Espere um pouco e tente de novo." }, 429);

  // Afiliado do último clique (cookie de 30 dias do link /r/<codigo>). Autoindicação não conta.
  const ref = req.headers.get("cookie")?.match(/(?:^|; )hs_ref=([a-z0-9-]{3,24})/)?.[1];
  let refAfiliado: string | null = null;
  if (ref) {
    const { data: af } = await sb.from("afiliados").select("user_id").eq("codigo", ref).maybeSingle<{ user_id: string }>();
    if (af && af.user_id !== user.id) refAfiliado = af.user_id;
  }

  // Guarda quando e qual versão dos termos foi aceita (prova em caso de contestação).
  const { data: pedido, error } = await sb
    .from("pedidos")
    .insert({
      user_id: user.id,
      email: user.email!,
      nome,
      plano,
      item,
      valor_centavos: valor,
      gateway,
      metodo,
      split_centavos: gateway === "novus" && metodo === "pix" ? (splitNovus(valor)?.centavos ?? 0) : 0,
      aceite_termos_em: new Date().toISOString(),
      versao_termos: SITE.versaoTermos,
      utm: limparUtm(corpo.utm),
      ref_afiliado: refAfiliado,
      ...(codigo ? { cupom: codigo, desconto_centavos: desconto } : {}),
      ...(adicional ? { adicional, adicional_centavos: adicionalCentavos } : {}),
    })
    .select("*")
    .single<Pedido>();
  if (error || !pedido) {
    console.error("criar pedido:", error?.message);
    return resp({ erro: "Não deu para iniciar o pagamento. Tente de novo." }, 500);
  }

  try {
    const c = await criarCobranca(pedido, { nome, cpf, telefone: telefone || undefined, email: user.email! }, metodo);
    if (!c.br_code && !c.checkout_url) throw new Error("o gateway não devolveu o pagamento");
    if (!c.id) throw new Error("o gateway não devolveu o id da cobrança");
    const { data: atual } = await sb
      .from("pedidos")
      .update({
        charge_id: c.sessao ?? c.id,
        br_code: c.br_code ?? null,
        checkout_url: c.checkout_url ?? null,
        expira_em: c.expira_em ?? new Date(Date.now() + 3600e3).toISOString(),
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", pedido.id)
      .select("*")
      .single<Pedido>();
    if (!atual) throw new Error("não deu para salvar a cobrança");
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    await enviarUtmify(atual, { ip, cpf, telefone: telefone || null });
    return resp(publico(atual));
  } catch (e) {
    const err = e as ErroGateway;
    console.error(`${gateway} criar cobrança:`, err.code, err.status, err.message);
    await sb.from("pedidos").update({ status: "falhou", atualizado_em: new Date().toISOString() }).eq("id", pedido.id);
    const doc = /cpf|document/i.test(err.message ?? "") || err.code === "INVALID_DOCUMENT";
    const msg = doc ? "CPF recusado pelo banco. Confira os números." : "Não deu para gerar o pagamento agora. Tente de novo em alguns minutos.";
    return resp({ erro: msg }, 502);
  }
}

export async function GET(req: Request) {
  const cfg = configurado();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return resp({ pix: cfg.ok, cartao: cfg.ok && cfg.cartao, gateway: cfg.gateway });
  if (!cfg.ok) return resp({ erro: "indisponível" }, 503);
  const user = await usuarioDoPedido(req);
  if (!user) return resp({ erro: "Entre na sua conta." }, 401);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return resp({ erro: "Pedido inválido." }, 400);

  const sb = admin();
  const { data: p } = await sb.from("pedidos").select("*").eq("id", id).eq("user_id", user.id).maybeSingle<Pedido>();
  if (!p) return resp({ erro: "Pedido não encontrado." }, 404);

  // Ainda pendente: pergunta direto para o gateway (caso o aviso automático atrase).
  if (p.status === "pendente" && p.charge_id) {
    try {
      const c = await consultarPedido(p);
      const atual = c ? await aplicarCobranca(sb, { ...c, referencia: p.id }) : null;
      if (atual) return resp(publico(atual));
    } catch (e) {
      console.error("consultar pedido:", (e as Error).message);
    }
  }
  return resp(publico(p));
}
