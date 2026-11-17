// POST: gera a cobrança de um plano (Pix com QR Code, ou cartão na página segura do gateway).
//   Logado: a compra fica na conta. Sem login (só planos): o checkout manda o e-mail e a conta é criada/achada aqui,
//   para o lead pagar sem passar pelo cadastro antes. Itens da Hot Store continuam exigindo login.
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
  PLANO_UNICO,
} from "../../../_lib/pagamentos";
import { SITE } from "../../../_lib/site";
import { SITE_URL } from "../../../_lib/email";
import { createHmac, timingSafeEqual } from "node:crypto";

const iguais = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
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

// Pedido de cortesia (cupom de 100% em tudo): grava como cortesia e confirma na hora pelo mesmo caminho do pagamento
// (libera o acesso, o convite do Discord, o recibo por e-mail e lança nas vendas com valor zero).
async function cortesia(
  req: Request,
  sb: ReturnType<typeof admin>,
  user: { id: string; email?: string },
  o: { plano: Plano; nome: string; codigo: string; desconto: number; adicional: string | null; utm: unknown; contaNova: boolean; ip: string | null; visitante: boolean },
) {
  const { data: pedido, error } = await sb
    .from("pedidos")
    .insert({
      user_id: user.id,
      email: user.email!,
      nome: o.nome,
      plano: o.plano,
      item: null,
      valor_centavos: 0,
      gateway: "cortesia",
      metodo: "pix",
      split_centavos: 0,
      charge_id: `cortesia-${crypto.randomUUID()}`,
      expira_em: new Date(Date.now() + 3600e3).toISOString(),
      aceite_termos_em: new Date().toISOString(),
      versao_termos: SITE.versaoTermos,
      utm: limparUtm(o.utm),
      cupom: o.codigo,
      desconto_centavos: o.desconto,
      conta_nova: o.contaNova,
      ip_hash: o.ip,
      ...(o.adicional ? { adicional: o.adicional, adicional_centavos: 0 } : {}),
    })
    .select("*")
    .single<Pedido>();
  if (error || !pedido) {
    console.error("criar pedido cortesia:", error?.message);
    return resp({ erro: "Não deu para liberar agora. Tente de novo." }, 500);
  }
  const pago = await aplicarCobranca(sb, {
    gateway: "cortesia",
    id: pedido.charge_id!,
    status: "pago",
    valor: 0,
    referencia: pedido.id,
    pago_em: new Date().toISOString(),
  });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  console.log(`cortesia ${pedido.id} (${o.codigo}) para ${user.id} ip=${ip ?? "-"}`);
  const final = pago ?? pedido;
  if (!o.visitante) return resp(publico(final));
  return resp({ ...publico(final), chave: chavePedido(final.id), entrar: await linkDeEntrada({ ...final, conta_nova: o.contaNova }).catch(() => null) });
}

// ---------- Compra sem cadastro ----------
const hmac = (txt: string) => createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "hs").update(txt).digest("hex").slice(0, 40);
// Chave do pedido: só o navegador que fez a compra recebe. Sem ela, quem não está logado não acompanha o pedido.
const chavePedido = (id: string) => hmac(`pedido:${id}`);
const ipHash = (req: Request) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip ? hmac(`ip:${ip}`) : null;
};

// Conta para quem compra sem login. Cria uma conta nova (sem senha, quem pagar cria a senha depois).
// Se o e-mail já tem conta, só reaproveita quando foi criada por uma compra sem cadastro e nunca entrou;
// fora isso, pede para entrar: ninguém paga para cair na conta de outra pessoa.
async function contaDoVisitante(email: string): Promise<{ id: string; email: string; nova: boolean } | "existe" | null> {
  const sb = admin();
  const criado = await sb.auth.admin.createUser({ email, email_confirm: true });
  if (criado.data.user) return { id: criado.data.user.id, email, nova: true };
  if (!/already|registered|exists/i.test(criado.error?.message ?? "")) {
    console.error("conta do visitante:", criado.error?.message);
    return null;
  }
  const { data: antigo } = await sb
    .from("pedidos")
    .select("user_id")
    .eq("email", email)
    .eq("conta_nova", true)
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle<{ user_id: string }>();
  if (!antigo) return "existe";
  const { data } = await sb.auth.admin.getUserById(antigo.user_id);
  if (!data?.user || data.user.last_sign_in_at || (data.user.email ?? "").toLowerCase() !== email) return "existe";
  return { id: antigo.user_id, email, nova: false };
}

// Depois de pago, quem comprou sem cadastro entra direto (link que cai na tela de criar senha).
// Só quando a conta nasceu nesta compra e ainda não entrou.
async function linkDeEntrada(p: Pedido & { conta_nova?: boolean }): Promise<string | null> {
  if (p.status !== "pago" || !p.user_id || !p.conta_nova) return null;
  const pagoHa = Date.now() - new Date(p.pago_em ?? p.criado_em).getTime();
  if (pagoHa > 6 * 3600e3) return null;
  const sb = admin();
  const { data } = await sb.auth.admin.getUserById(p.user_id);
  const u = data?.user;
  if (!u?.email || u.last_sign_in_at) return null;
  const base = new URL(SITE_URL).origin;
  const { data: link } = await sb.auth.admin.generateLink({
    type: "magiclink",
    email: u.email,
    options: { redirectTo: `${base}/redefinir-senha` },
  });
  return link?.properties?.action_link ?? null;
}

export async function POST(req: Request) {
  const cfg = configurado();
  if (!cfg.ok) {
    console.error("Pagamento desligado, faltam variáveis:", cfg.faltando.join(", "));
    return resp({ erro: "O pagamento ainda não está disponível. Tente mais tarde." }, 503);
  }

  let corpo: { plano?: string; item?: string; nome?: string; cpf?: string; telefone?: string; aceite?: boolean; cupom?: string; metodo?: string; utm?: unknown; adicional?: string; email?: string };
  try {
    corpo = await req.json();
  } catch {
    return resp({ erro: "Pedido inválido." }, 400);
  }

  const logado = await usuarioDoPedido(req);
  if (!logado && corpo.item) return resp({ erro: "Entre na sua conta para comprar." }, 401);
  const emailVisitante = (corpo.email ?? "").trim().toLowerCase().slice(0, 120);
  // Item da Hot Store (ex.: a call) ou plano de assinatura.
  const item = itemPago(corpo.item);
  // Plano único (vitalício): links e páginas antigas que mandam mensal/anual também viram vitalício.
  const plano: Plano | null = item ? "loja" : corpo.item ? null : PLANO_UNICO;
  const metodo: Metodo = corpo.metodo === "cartao" ? "cartao" : "pix";
  const nome = (corpo.nome ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const cpf = (corpo.cpf ?? "").replace(/\D/g, "");
  const telefone = (corpo.telefone ?? "").replace(/\D/g, "").slice(0, 13);
  if (!plano) return resp({ erro: corpo.item ? "Este item não está à venda." : "Escolha um plano." }, 400);
  if (metodo === "cartao" && !cfg.cartao) return resp({ erro: "Pagamento com cartão ainda não está disponível. Use o Pix." }, 400);
  if (nome.split(" ").length < 2) return resp({ erro: "Digite seu nome completo." }, 400);
  if (!cpfValido(cpf)) return resp({ erro: "CPF inválido. Confira os números." }, 400);
  if (corpo.aceite !== true) return resp({ erro: "Para continuar, confirme que tem 18 anos ou mais e aceita os termos." }, 400);
  if (!logado && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailVisitante)) return resp({ erro: "Digite um e-mail válido. É nele que chega o seu acesso." }, 400);

  const sb = admin();
  const gateway = gatewayAtivo();
  const ip = ipHash(req);

  // Sem cadastro: freio por IP (6 pedidos por hora) antes de criar qualquer conta.
  if (!logado) {
    if (ip) {
      const { count } = await sb
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ip)
        .gt("criado_em", new Date(Date.now() - 3600_000).toISOString());
      if ((count ?? 0) >= 6) return resp({ erro: "Muitas tentativas. Espere um pouco e tente de novo." }, 429);
    }
  }

  // Cupom: tentativas limitadas (por conta ou por IP) para ninguém sair testando códigos.
  const codigo = (corpo.cupom ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  if (codigo) {
    const { data: pode } = await sb.rpc("hs_cupom_pode_tentar", { p_chave: logado ? `u:${logado.id}` : `ip:${ip ?? "?"}` });
    if (pode === false) return resp({ erro: "Muitas tentativas de cupom. Espere um pouco e tente de novo." }, 429);
  }

  // Cupom de desconto (conferido no banco, nunca pelo navegador).
  let desconto = 0;
  let cuponCobreAdicional = false;
  if (codigo && plano === "loja") return resp({ erro: "Cupom não vale para itens da loja." }, 400);
  if (codigo && plano !== "loja") {
    const { data: c } = await sb.rpc("conferir_cupom", { p_codigo: codigo, p_plano: plano });
    const r = c as { ok: boolean; desconto?: number; adicional?: boolean } | null;
    if (!r?.ok) return resp({ erro: "Cupom inválido, vencido ou esgotado." }, 400);
    desconto = Math.round((VALOR_CENTAVOS[plano] * (r.desconto ?? 0)) / 100);
    cuponCobreAdicional = r.adicional === true && r.desconto === 100;
  }
  // Adicional (Arsenal do Cappu + Networking): só nos planos e só pela Stripe (uma página com os dois itens).
  const adicional = !item && gateway === "stripe" ? adicionalValido(corpo.adicional) : null;
  const adicionalCentavos = adicional && !cuponCobreAdicional ? ADICIONAL.preco * 100 : 0;
  const valor = (item ? ITENS_PAGOS[item].preco * 100 : VALOR_CENTAVOS[PLANO_UNICO] - desconto) + adicionalCentavos;
  // A Stripe não cobra menos de R$ 1.
  if (valor > 0 && valor < 100) return resp({ erro: "Com este cupom, marque o adicional (Arsenal do Cappu) para continuar." }, 400);
  // Só agora (tudo conferido) cria/acha a conta de quem compra sem cadastro.
  let user: { id: string; email?: string };
  let contaNova = false;
  if (logado) user = logado;
  else {
    const c = await contaDoVisitante(emailVisitante);
    if (c === "existe") return resp({ erro: "Esse e-mail já tem conta. Entre na sua conta para pagar.", entrar: true }, 409);
    if (!c) return resp({ erro: "Não deu para iniciar agora. Tente de novo." }, 500);
    user = c;
    contaNova = c.nova;
  }

  // Cupom que zera tudo: pedido "cortesia", confirmado na hora (sem gateway), com a mesma entrega de um pago.
  if (valor === 0) {
    // Reserva o uso do cupom antes (atômico): pedidos ao mesmo tempo não passam do limite.
    const { data: ok } = await sb.rpc("hs_reservar_cupom", { p_codigo: codigo });
    if (ok !== true) return resp({ erro: "Cupom inválido, vencido ou esgotado." }, 400);
    return cortesia(req, sb, user, { plano, nome, codigo, desconto, adicional, utm: corpo.utm, contaNova, ip, visitante: !logado });
  }

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
  if (aberto && (aberto.br_code || aberto.checkout_url)) return resp(logado ? publico(aberto) : { ...publico(aberto), chave: chavePedido(aberto.id) });

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
      conta_nova: contaNova,
      ip_hash: ip,
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
    const ipReal = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    await enviarUtmify(atual, { ip: ipReal, cpf, telefone: telefone || null });
    return resp(logado ? publico(atual) : { ...publico(atual), chave: chavePedido(atual.id) });
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
  if (!/^[0-9a-f-]{36}$/i.test(id)) return resp({ erro: "Pedido inválido." }, 400);
  // Logado: só os pedidos da própria conta. Sem login (compra sem cadastro): precisa da chave que só o navegador
  // que fez a compra recebeu (o id sozinho não basta: ele aparece na volta do cartão e no histórico).
  const user = await usuarioDoPedido(req);
  const t = new URL(req.url).searchParams.get("t") ?? "";
  if (!user && !iguais(t, chavePedido(id))) return resp({ erro: "Entre na sua conta." }, 401);

  const sb = admin();
  let q = sb.from("pedidos").select("*").eq("id", id);
  if (user) q = q.eq("user_id", user.id);
  const { data: p } = await q.maybeSingle<Pedido>();
  if (!p) return resp({ erro: "Pedido não encontrado." }, 404);

  let atual = p;
  // Ainda pendente: pergunta direto para o gateway (caso o aviso automático atrase).
  if (p.status === "pendente" && p.charge_id) {
    try {
      const c = await consultarPedido(p);
      const novo = c ? await aplicarCobranca(sb, { ...c, referencia: p.id }) : null;
      if (novo) atual = novo;
    } catch (e) {
      console.error("consultar pedido:", (e as Error).message);
    }
  }
  const entrar = user ? null : await linkDeEntrada(atual as Pedido & { conta_nova?: boolean }).catch(() => null);
  return resp({ ...publico(atual), entrar });
}
