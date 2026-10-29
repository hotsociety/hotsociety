// SÓ SERVIDOR. Pagamentos: gateway (Stripe, Novus ou Transfeer) + gravação no Supabase.
//
// STRIPE (gateway principal — com STRIPE_SECRET_KEY configurada, ela vira o gateway ativo):
//   STRIPE_SECRET_KEY      → chave secreta (sk_live_…) em Developers → API keys
//   STRIPE_WEBHOOK_SECRET  → segredo do webhook (whsec_…) do endpoint https://hotsociety.com.br/api/pagamentos/stripe
//   Repasse automático (Stripe Connect) — parte de cada venda vai para a conta conectada do sócio:
//   STRIPE_PLATAFORMA          → "fernando" quando a chave for da conta HotSociety Org (repasse padrão 70% ao GuTayler)
//   STRIPE_REPASSE_CONTA       → id da conta conectada (acct_…)
//   Percentual por produto: REPASSE_PADRAO (30% em Mensal, Anual e Loja), sobre o líquido depois da taxa da Stripe.
//   Opcional: STRIPE_REPASSE_PCT_MENSAL / _ANUAL / _LOJA ou STRIPE_REPASSE_PERCENTUAL (todos) para trocar sem deploy de código.
//   Página segura da Stripe (Checkout) com todas as formas ativas no painel: Pix, boleto, cartão
//   (parcelado quando a conta permitir), Apple Pay, Google Pay, Link…
//
// Variáveis na Vercel (tipo Sensitive, nunca NEXT_PUBLIC):
//   NOVUS_API_KEY              → chave privada da Novus (Integrações → Chave Privada). Com ela, a Novus vira o gateway ativo.
//   SUPABASE_SERVICE_ROLE_KEY  → chave secreta do Supabase (grava pedidos e libera acesso)
// Opcionais: NOVUS_WEBHOOK_SECRET (whsec_… se criar um webhook global no painel da Novus),
//            NOVUS_API_URL (padrão https://api.novuspagamentos.com), SITE_URL (padrão https://hotsociety.com.br)
// Transfeer (alternativa, usada só se NOVUS_API_KEY não existir): TRANSFEER_API_KEY e TRANSFEER_WEBHOOK_SECRET.
//
// Divisão automática (split) do Pix na Novus — parte de cada venda vai direto para a chave Pix do sócio:
//   NOVUS_SPLIT_PIX_KEY   → chave Pix do sócio
//   NOVUS_SPLIT_PIX_TYPE  → CPF | CNPJ | PHONE | EMAIL | RANDOM
//   NOVUS_SPLIT_NOME      → nome do titular (opcional)
//   NOVUS_SPLIT_PERCENTUAL→ parte do sócio em % (ex.: 70)

import { enviarUtmify } from "./utmify";
import { avisarVenda } from "./avisoVenda";
import type { Utm } from "./utm";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ADICIONAL } from "./adicional";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PRICE } from "./site";
import { ITENS_PAGOS, itemPago } from "./loja";

export type PlanoAssinatura = "mensal" | "anual";
export type Plano = PlanoAssinatura | "loja"; // "loja" = item avulso da Hot Store (não mexe no acesso)
export type Metodo = "pix" | "cartao";
export type Gateway = "stripe" | "novus" | "transfeer";
export const VALOR_CENTAVOS: Record<PlanoAssinatura, number> = { mensal: PRICE.mensal * 100, anual: PRICE.anual * 100 };
export const PRODUTO: Record<PlanoAssinatura, string> = { mensal: "HOT SOCIETY Mensal", anual: "HOT SOCIETY Anual" };

/** Nome do que foi vendido (plano ou item da loja). */
// Convite do Discord do adicional (só servidor; mostrado só para quem pagou).
export const ARSENAL_CONVITE = (process.env.ARSENAL_DISCORD_URL || "https://discord.gg/VWxpJGvuS").trim();

// Pedido que dá direito ao convite do Discord: adicional no plano ou o item "ar" da Hot Store.
export const temArsenal = (p: { plano: Plano; item?: string | null; adicional?: string | null }) => !!p.adicional || (p.plano === "loja" && p.item === "ar");

// Nome com o adicional, para recibo, venda e Stripe.
export function nomeVenda(p: { plano: Plano; item?: string | null; adicional?: string | null }) {
  return p.adicional ? `${nomeProduto(p)} + ${ADICIONAL.titulo}` : nomeProduto(p);
}

export function nomeProduto(p: { plano: Plano; item?: string | null }) {
  if (p.plano === "loja") {
    const it = itemPago(p.item);
    return it ? ITENS_PAGOS[it].titulo : "Hot Store";
  }
  return PRODUTO[p.plano];
}
export const SITE = (process.env.SITE_URL || "https://hotsociety.com.br").replace(/\/$/, "");

export type Pedido = {
  id: string;
  user_id: string;
  email: string;
  nome: string | null;
  plano: Plano;
  item?: string | null; // id do item quando plano = "loja"
  valor_centavos: number;
  status: "pendente" | "pago" | "expirado" | "cancelado" | "falhou" | "reembolsado" | "chargeback";
  gateway?: string | null;
  metodo?: Metodo | null;
  charge_id: string | null;
  br_code: string | null;
  checkout_url?: string | null;
  expira_em: string | null;
  pago_em: string | null;
  criado_em: string;
  cupom?: string | null;
  split_centavos?: number | null;
  utm?: Utm | null;
  adicional?: string | null; // "arsenal" quando o cliente marcou o adicional no checkout
  adicional_centavos?: number | null;
};

/** Cobrança no formato do site, igual para qualquer gateway. */
export type Cobranca = {
  gateway: Gateway;
  id: string; // id da transação/cobrança no gateway (vira o número do pedido nas vendas)
  status: Pedido["status"] | "bloqueado" | null; // null = ainda sem decisão
  valor: number | null; // em centavos
  referencia: string | null; // id do nosso pedido
  sessao?: string | null; // checkout (cartão): id da sessão
  br_code?: string | null;
  checkout_url?: string | null;
  expira_em?: string | null;
  pago_em?: string | null;
};

export type Cliente = { nome: string; cpf: string; telefone?: string; email: string };

export function gatewayAtivo(): Gateway {
  if (process.env.STRIPE_SECRET_KEY) return "stripe";
  return process.env.NOVUS_API_KEY ? "novus" : "transfeer";
}

export function configurado() {
  const g = gatewayAtivo();
  const precisa =
    g === "stripe"
      ? ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"]
      : g === "novus"
        ? ["NOVUS_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"]
        : ["TRANSFEER_API_KEY", "TRANSFEER_WEBHOOK_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"];
  const faltando = precisa.filter((k) => !process.env[k]);
  return { ok: faltando.length === 0, faltando, gateway: g, cartao: g === "novus" || g === "stripe" };
}

export function admin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Confere quem está logado a partir do token enviado pelo navegador.
export async function usuarioDoPedido(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user?.email) return null;
  return data.user;
}

// ---------- CPF ----------
export function cpfValido(cpf: string) {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dig = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dig(9) === Number(d[9]) && dig(10) === Number(d[10]);
}

// HMAC-SHA256 em hex do corpo cru, comparado sem vazar tempo. Aceita com ou sem o prefixo "sha256=".
export function hmacConfere(corpoCru: string, recebida: string | null, segredo: string | undefined) {
  if (!segredo || segredo.length < 16 || !recebida) return false;
  const certa = createHmac("sha256", segredo).update(corpoCru, "utf8").digest("hex");
  const a = Buffer.from(recebida.trim().replace(/^sha256=/i, "").toLowerCase());
  const b = Buffer.from(certa);
  return a.length === b.length && timingSafeEqual(a, b);
}

class ErroGateway extends Error {
  constructor(
    msg: string,
    public code: string,
    public status: number,
  ) {
    super(msg);
  }
}

async function chamar(url: string, init: RequestInit & { chave: string; idempotencia?: string; prefixo?: "Bearer" | "x-api-key" }) {
  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json" };
  if (init.prefixo === "x-api-key") headers["x-api-key"] = init.chave;
  else headers.authorization = `Bearer ${init.chave}`;
  if (init.idempotencia) headers["Idempotency-Key"] = init.idempotencia;
  const r = await fetch(url, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
  const corpo = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) {
    const e = corpo as { code?: string; message?: string; errors?: unknown };
    throw new ErroGateway(`${e.message || `HTTP ${r.status}`}${e.errors ? " " + JSON.stringify(e.errors).slice(0, 300) : ""}`, e.code || String(r.status), r.status);
  }
  return corpo;
}

/* =====================================================================
   STRIPE  (API REST direto, sem SDK)
   Pix: PaymentIntent confirmado no servidor → QR Code (copia e cola) mostrado no nosso site.
        Se o Pix não estiver liberado na conta, usa a página da Stripe (Checkout) com Pix.
   Cartão: Checkout Session (página segura da Stripe), parcelado quando disponível.
   Avisos: webhook assinado (Stripe-Signature) em /api/pagamentos/stripe; o status é sempre
           conferido de novo na API antes de liberar ou bloquear acesso.
   ===================================================================== */
const STRIPE = "https://api.stripe.com/v1";

// Qual conta Stripe cobra (é a dona da STRIPE_SECRET_KEY). STRIPE_PLATAFORMA=fernando troca para a conta
// HotSociety Org (FChelottiDev), que repassa 70% ao GuTayler; sem a variável, cobra a conta do GuTayler, que repassa 30%.
const PLATAFORMA: "gutayler" | "fernando" = process.env.STRIPE_PLATAFORMA?.trim().toLowerCase() === "fernando" ? "fernando" : "gutayler";

// Produtos cadastrados no Catálogo da Stripe de cada conta (o preço vai junto em cada cobrança, para valer cupom).
const CATALOGO: Record<typeof PLATAFORMA, { mensal: string; anual: string; loja: Record<string, string>; adicional?: string }> = {
  gutayler: {
    mensal: "prod_VWh6H33G7ohbLy", // HOT SOCIETY Mensal · R$ 97
    anual: "prod_VWh6aDtUihsB0H", // HOT SOCIETY Anual · R$ 997
    loja: { cs: "prod_VWh7UUduu9Z1ad" }, // Consultoria 1:1 · call de 60 min · R$ 497
  },
  fernando: {
    mensal: "prod_VWieiN23k1rObe",
    anual: "prod_VWif1gGbWP13Lo",
    loja: { cs: "prod_VWifdkQI8mcokg", ar: "prod_VWlIsxmdXQ5ZLs" },
    adicional: "prod_VWlIsxmdXQ5ZLs", // Arsenal do Cappu + Networking (R$ 87 na loja, R$ 57 como adicional)
  },
};
const STRIPE_PRODUTO = CATALOGO[PLATAFORMA];
function produtoStripe(p: Pedido) {
  return p.plano === "loja" ? (p.item ? STRIPE_PRODUTO.loja[p.item] : undefined) : STRIPE_PRODUTO[p.plano];
}

// Corpo no formato da Stripe (form-urlencoded com colchetes: a[b][0]=c).
function formStripe(o: Record<string, unknown>, prefixo = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null) continue;
    const chave = prefixo ? `${prefixo}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => (typeof x === "object" && x !== null ? formStripe(x as Record<string, unknown>, `${chave}[${i}]`, out) : out.append(`${chave}[${i}]`, String(x))));
    else if (typeof v === "object") formStripe(v as Record<string, unknown>, chave, out);
    else out.append(chave, String(v));
  }
  return out;
}

async function stripe(caminho: string, metodo: "GET" | "POST", corpo?: Record<string, unknown>, idempotencia?: string) {
  const headers: Record<string, string> = { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "stripe-version": "2024-06-20" };
  if (corpo) headers["content-type"] = "application/x-www-form-urlencoded";
  if (idempotencia) headers["idempotency-key"] = idempotencia;
  const r = await fetch(`${STRIPE}${caminho}`, { method: metodo, headers, body: corpo ? formStripe(corpo).toString() : undefined, cache: "no-store", signal: AbortSignal.timeout(15000) });
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown> & { error?: { message?: string; code?: string; type?: string; param?: string } };
  if (!r.ok) throw new ErroGateway(`${j.error?.message || `HTTP ${r.status}`}${j.error?.param ? ` (${j.error.param})` : ""}`, j.error?.code || j.error?.type || String(r.status), r.status);
  return j;
}

type PIStripe = Record<string, unknown> & {
  id: string;
  status: string;
  amount: number;
  amount_received?: number;
  metadata?: Record<string, string>;
  latest_charge?: (Record<string, unknown> & { refunded?: boolean; amount_refunded?: number; disputed?: boolean; created?: number }) | string | null;
  next_action?: { type?: string; pix_display_qr_code?: { data?: string; expires_at?: number } } | null;
};

const isoDe = (seg: unknown) => (typeof seg === "number" ? new Date(seg * 1000).toISOString() : null);

// Status de um PaymentIntent (com a última cobrança expandida) no formato do site.
function stripeStatusPI(pi: PIStripe): Cobranca["status"] {
  const ch = typeof pi.latest_charge === "object" && pi.latest_charge ? pi.latest_charge : null;
  if (ch?.disputed) return "bloqueado";
  if (ch?.refunded || (ch?.amount_refunded ?? 0) >= pi.amount) return pi.status === "succeeded" ? "reembolsado" : null;
  if (pi.status === "succeeded") return "pago";
  if (pi.status === "canceled") return "expirado";
  return null; // requires_action (Pix aguardando), processing, requires_payment_method…
}

function stripeDoPI(pi: PIStripe, sessao?: string | null): Cobranca {
  const ch = typeof pi.latest_charge === "object" && pi.latest_charge ? pi.latest_charge : null;
  return {
    gateway: "stripe",
    id: pi.id,
    status: stripeStatusPI(pi),
    valor: pi.status === "succeeded" ? (pi.amount_received ?? pi.amount) : pi.amount,
    referencia: pi.metadata?.pedido ?? null,
    sessao: sessao ?? null,
    br_code: pi.next_action?.pix_display_qr_code?.data ?? null,
    expira_em: isoDe(pi.next_action?.pix_display_qr_code?.expires_at),
    pago_em: pi.status === "succeeded" ? isoDe(ch?.created) : null,
  };
}

type TipoStripe = "card" | "pix" | "todos";

async function stripeCheckout(p: Pedido, c: Cliente, tipo: TipoStripe): Promise<Cobranca> {
  try {
    return await stripeCheckoutCom(p, c, tipo, true);
  } catch (e) {
    // Produto do catálogo não encontrado (ex.: chave de teste): cobra com o nome avulso.
    if (/No such product|product/i.test((e as Error).message) && produtoStripe(p)) return stripeCheckoutCom(p, c, tipo, true, true);
    // Conta sem parcelamento (ou sem alguma forma) liberada: tenta de novo sem as opções extras.
    if (/installment|payment_method_options/i.test((e as Error).message)) return stripeCheckoutCom(p, c, tipo, false);
    throw e;
  }
}

// parcelas = false: sem opções extras (parcelamento, validade do Pix e do boleto).
async function stripeCheckoutCom(p: Pedido, c: Cliente, tipo: TipoStripe, parcelas: boolean, semProduto = false): Promise<Cobranca> {
  const expira = Math.floor(Date.now() / 1000) + 2 * 3600; // a sessão da Stripe aceita de 30 min a 24 h
  const volta = `${SITE}/assinar?${p.plano === "loja" ? `item=${p.item}&` : ""}pedido=${p.id}`;
  const s = await stripe(
    "/checkout/sessions",
    "POST",
    {
      mode: "payment",
      // "todos": sem lista fixa, a Stripe mostra todas as formas ativas no painel (Pix, boleto, cartão, Apple Pay, Google Pay, Link…).
      ...(tipo === "todos" ? {} : { payment_method_types: [tipo] }),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: p.valor_centavos - (p.adicional_centavos ?? 0),
            ...(produtoStripe(p) && !semProduto ? { product: produtoStripe(p) } : { product_data: { name: nomeProduto(p) } }),
          },
        },
        // Adicional marcado no checkout (Arsenal do Cappu + Networking).
        ...(p.adicional && p.adicional_centavos
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: "brl",
                  unit_amount: p.adicional_centavos,
                  ...(STRIPE_PRODUTO.adicional && !semProduto ? { product: STRIPE_PRODUTO.adicional } : { product_data: { name: ADICIONAL.titulo } }),
                },
              },
            ]
          : []),
      ],
      customer_email: c.email,
      client_reference_id: p.id,
      metadata: { pedido: p.id },
      payment_intent_data: {
        metadata: { pedido: p.id, divisao: `${100 - repassePercentual(p.plano)}/${repassePercentual(p.plano)}`, ...(p.adicional ? { adicional: p.adicional } : {}) },
        description: nomeVenda(p),
        transfer_group: p.id,
      },
      success_url: volta,
      cancel_url: `${SITE}/assinar?${p.plano === "loja" ? `item=${p.item}` : `plano=${p.plano}`}`,
      expires_at: expira,
      locale: "pt-BR",
      ...(parcelas
        ? {
            payment_method_options: {
              ...(tipo !== "pix" ? { card: { installments: { enabled: true } } } : {}),
              ...(tipo !== "card" ? { pix: { expires_after_seconds: 3600 } } : {}),
              ...(tipo === "todos" ? { boleto: { expires_after_days: 3 } } : {}),
            },
          }
        : {}),
    },
    `sessao-${p.id}${parcelas ? "" : "-sem-parcelas"}${semProduto ? "-avulso" : ""}`,
  );
  const url = txt(s.url);
  if (!url || !/^https:\/\//.test(url)) throw new ErroGateway("Stripe não devolveu a página de pagamento", "SEM_URL", 502);
  return { gateway: "stripe", id: txt(s.id) ?? "", status: null, valor: num(s.amount_total) ?? p.valor_centavos, referencia: p.id, sessao: txt(s.id), checkout_url: url, expira_em: isoDe(s.expires_at) };
}

async function stripeConsultarPI(id: string, sessao?: string | null): Promise<Cobranca> {
  const pi = (await stripe(`/payment_intents/${encodeURIComponent(id)}?expand[]=latest_charge`, "GET")) as PIStripe;
  return stripeDoPI(pi, sessao);
}

async function stripeConsultarSessao(id: string, pedidoId: string): Promise<Cobranca> {
  const s = await stripe(`/checkout/sessions/${encodeURIComponent(id)}`, "GET");
  const pi = txt(s.payment_intent);
  if (pi) {
    const c = await stripeConsultarPI(pi, id);
    return { ...c, referencia: c.referencia ?? pedidoId };
  }
  return { gateway: "stripe", id, status: txt(s.status) === "expired" ? "expirado" : null, valor: num(s.amount_total), referencia: pedidoId, sessao: id };
}

// ---------- Repasse (Connect) ----------
// Divisão por produto: % que vai para a conta conectada (STRIPE_REPASSE_CONTA). O resto fica na conta que cobra.
// Pode ser trocado sem mexer no código: STRIPE_REPASSE_PCT_MENSAL, _ANUAL, _LOJA, _MENTORIA (ou STRIPE_REPASSE_PERCENTUAL para todos).
export type ProdutoRepasse = Plano | "mentoria";
// Conta do GuTayler cobrando: 30% vai para o FChelottiDev. Conta do FChelottiDev cobrando: 70% vai para o GuTayler.
const PCT_PADRAO = PLATAFORMA === "fernando" ? 70 : 30;
export const REPASSE_PADRAO: Record<ProdutoRepasse, number> = { mensal: PCT_PADRAO, anual: PCT_PADRAO, loja: PCT_PADRAO, mentoria: PCT_PADRAO };

export function repassePercentual(produto: ProdutoRepasse): number {
  const porProduto = process.env[`STRIPE_REPASSE_PCT_${produto.toUpperCase()}`];
  const geral = process.env.STRIPE_REPASSE_PERCENTUAL;
  const pct = Number(porProduto ?? geral ?? REPASSE_PADRAO[produto]);
  return pct >= 0 && pct < 100 ? pct : REPASSE_PADRAO[produto];
}

function repasseConfig(produto: ProdutoRepasse) {
  const conta = process.env.STRIPE_REPASSE_CONTA?.trim();
  const pct = repassePercentual(produto);
  return conta && /^acct_[A-Za-z0-9]+$/.test(conta) && pct > 0 ? { conta, pct } : null;
}

// Transfere a parte do sócio de um pagamento (sobre o líquido, depois da taxa da Stripe). Devolve os centavos repassados.
async function repassarPI(piId: string, produto: ProdutoRepasse, grupo: string, brutoCentavos: number, descricao: string): Promise<number> {
  const cfg = repasseConfig(produto);
  if (!cfg) return 0;
  const pi = await stripe(`/payment_intents/${encodeURIComponent(piId)}?expand[]=latest_charge.balance_transaction`, "GET");
  const ch = pi.latest_charge as (Record<string, unknown> & { id: string; balance_transaction?: { net?: number } | string | null }) | null;
  if (!ch?.id) throw new ErroGateway("cobrança sem charge para repassar", "SEM_CHARGE", 400);
  const bt = typeof ch.balance_transaction === "object" && ch.balance_transaction ? ch.balance_transaction : null;
  // Pix/boleto podem ainda não ter o saldo calculado: usa o valor bruto como base nesse caso.
  const base = typeof bt?.net === "number" ? bt.net : brutoCentavos;
  const bruto = Math.floor((base * cfg.pct) / 100);
  if (bruto <= 0) return 0;
  // Débitos pendentes do sócio (estorno sem saldo, parte dele da taxa de contestação) saem deste repasse.
  const desconto = await reservarDebitos(cfg.conta, bruto, grupo);
  const valor = bruto - desconto;
  if (valor <= 0) return 0;
  await stripe(
    "/transfers",
    "POST",
    {
      amount: valor,
      currency: "brl",
      destination: cfg.conta,
      source_transaction: ch.id,
      transfer_group: grupo,
      description: `Repasse ${cfg.pct}% · ${descricao}${desconto ? ` (− ${(desconto / 100).toFixed(2)} de débitos)` : ""}`,
      metadata: { grupo, ...(desconto ? { debitos_centavos: String(desconto) } : {}) },
    },
    `repasse-${grupo}`,
  );
  return valor;
}

// ---------- Débitos do sócio (reembolso/contestação cobrados da conta dele) ----------
// Quando não dá para puxar na hora (saldo dele zerado) ou é a parte dele da taxa de contestação,
// o valor fica em repasse_debitos e é descontado dos próximos repasses.
async function registrarDebito(conta: string, centavos: number, motivo: string, referencia: string) {
  if (centavos <= 0) return;
  const { error } = await admin()
    .from("repasse_debitos")
    .upsert({ conta, valor_centavos: centavos, restante_centavos: centavos, motivo, referencia }, { onConflict: "referencia", ignoreDuplicates: true });
  if (error) console.error("registrar débito:", error.message);
}

async function reservarDebitos(conta: string, limite: number, grupo: string): Promise<number> {
  const sb = admin();
  const { data } = await sb
    .from("repasse_debitos")
    .select("id, restante_centavos")
    .eq("conta", conta)
    .gt("restante_centavos", 0)
    .order("criado_em", { ascending: true })
    .limit(50);
  let usado = 0;
  for (const d of (data as { id: string; restante_centavos: number }[] | null) ?? []) {
    if (usado >= limite) break;
    const parte = Math.min(d.restante_centavos, limite - usado);
    const resto = d.restante_centavos - parte;
    const { error } = await sb
      .from("repasse_debitos")
      .update({ restante_centavos: resto, quitado_em: resto === 0 ? new Date().toISOString() : null, ultimo_repasse: grupo })
      .eq("id", d.id)
      .eq("restante_centavos", d.restante_centavos); // não usa o mesmo débito duas vezes
    if (!error) usado += parte;
  }
  return usado;
}

// Venda do site paga: repasse do pedido.
export async function stripeRepassar(p: Pedido, piId: string): Promise<number> {
  return repassarPI(piId, p.plano, p.id, p.valor_centavos, nomeProduto(p));
}

// Reembolso/contestação: a parte do sócio sai da conta dele.
//  - reembolso parcial → devolve a mesma proporção do repasse; total ou contestação → devolve tudo;
//  - se a Stripe não deixar puxar (saldo dele zerado), o valor vira débito e sai dos próximos repasses;
//  - contestação: a parte dele (mesmo % do repasse) da taxa de contestação também vira débito.
export async function stripeEstornarRepasse(p: Pick<Pedido, "id"> & { plano?: Plano }, piId?: string | null, produto?: ProdutoRepasse) {
  if (!process.env.STRIPE_SECRET_KEY) return;
  let fracao = 1;
  let disputa: { id: string; taxa: number } | null = null;
  if (piId) {
    const pi = await stripe(`/payment_intents/${encodeURIComponent(piId)}?expand[]=latest_charge`, "GET").catch(() => null);
    const ch = (pi?.latest_charge ?? null) as { id?: string; amount?: number; amount_refunded?: number; disputed?: boolean } | null;
    if (ch?.amount && !ch.disputed && ch.amount_refunded) fracao = Math.min(1, ch.amount_refunded / ch.amount);
    if (ch?.disputed && ch.id) {
      const ds = await stripe(`/disputes?charge=${encodeURIComponent(ch.id)}&limit=1`, "GET").catch(() => null);
      const d = (ds?.data as { id: string; balance_transactions?: { fee?: number }[] }[] | undefined)?.[0];
      if (d) disputa = { id: d.id, taxa: (d.balance_transactions ?? []).reduce((t, b) => t + (b.fee ?? 0), 0) };
    }
  }
  const lista = await stripe(`/transfers?transfer_group=${encodeURIComponent(p.id)}&limit=10`, "GET");
  for (const t of (lista.data as { id: string; amount: number; amount_reversed: number; destination: string }[] | undefined) ?? []) {
    const falta = Math.min(t.amount, Math.ceil(t.amount * fracao)) - t.amount_reversed;
    if (falta <= 0) continue;
    try {
      await stripe(`/transfers/${t.id}/reversals`, "POST", { amount: falta, metadata: { pedido: p.id } }, `estorno-${t.id}-${falta}`);
    } catch (e) {
      console.error(`estorno ${t.id} sem saldo, vira débito:`, (e as Error).message);
      await registrarDebito(t.destination, falta, "estorno sem saldo", `estorno-${t.id}-${falta}`);
    }
  }
  if (disputa && disputa.taxa > 0) {
    const prod = produto ?? p.plano;
    const cfg = prod ? repasseConfig(prod) : null;
    if (cfg) await registrarDebito(cfg.conta, Math.floor((disputa.taxa * cfg.pct) / 100), "taxa de contestação", `taxa-${disputa.id}`);
  }
}

// ---------- Links de pagamento da mentoria (Painel → Mentoria) ----------
export type MentoriaLink = {
  id: string;
  descricao: string;
  valor_centavos: number;
  lead_nome: string | null;
  status: string;
  stripe_link_id: string | null;
  pi_id: string | null;
  criado_em: string;
};

// Cria um Payment Link da Stripe de uso único (todas as formas ativas: Pix, boleto, cartão, carteiras…).
export async function stripeCriarLinkMentoria(l: Pick<MentoriaLink, "id" | "descricao" | "valor_centavos" | "lead_nome">) {
  const preco = await stripe(
    "/prices",
    "POST",
    { currency: "brl", unit_amount: l.valor_centavos, product_data: { name: l.descricao.slice(0, 120), metadata: { tipo: "mentoria" } }, metadata: { mentoria_link: l.id } },
    `mentoria-preco-${l.id}`,
  );
  const meta = { mentoria_link: l.id, ...(l.lead_nome ? { lead: l.lead_nome.slice(0, 80) } : {}) };
  const base = {
    line_items: [{ price: preco.id as string, quantity: 1 }],
    metadata: meta,
    payment_intent_data: { metadata: meta, description: l.descricao.slice(0, 120), transfer_group: l.id },
    phone_number_collection: { enabled: true },
    after_completion: { type: "hosted_confirmation", hosted_confirmation: { custom_message: "Pagamento recebido! Em breve a equipe HOT SOCIETY fala com você no WhatsApp." } },
  };
  let link: Record<string, unknown>;
  try {
    link = await stripe("/payment_links", "POST", { ...base, restrictions: { completed_sessions: { limit: 1 } } }, `mentoria-link-${l.id}`);
  } catch (e) {
    if (!/restriction/i.test((e as Error).message)) throw e;
    link = await stripe("/payment_links", "POST", base, `mentoria-link2-${l.id}`);
  }
  return { url: String(link.url), linkId: String(link.id) };
}

export async function stripeDesativarLink(linkId: string) {
  await stripe(`/payment_links/${encodeURIComponent(linkId)}`, "POST", { active: false });
}

// Webhook: acha o link da mentoria do evento (metadata da sessão/PI) ou null se não for de mentoria.
export async function mentoriaLinkDoEvento(o: Record<string, unknown> & { metadata?: Record<string, string> | null }): Promise<string | null> {
  const direto = o.metadata?.mentoria_link;
  if (direto && /^[0-9a-f-]{36}$/i.test(direto)) return direto;
  if (typeof o.payment_intent === "string") {
    const pi = await stripe(`/payment_intents/${encodeURIComponent(o.payment_intent)}`, "GET").catch(() => null);
    const m = (pi?.metadata as Record<string, string> | undefined)?.mentoria_link;
    if (m && /^[0-9a-f-]{36}$/i.test(m)) return m;
  }
  return null;
}

const METODO_STRIPE: Record<string, string> = { card: "cartao", pix: "pix", boleto: "boleto" };

// Confere o pagamento na Stripe e atualiza o link: pago → repasse + lança em Vendas; reembolso/contestação → estorna.
export async function mentoriaAplicarEvento(sb: SupabaseClient, linkId: string, tipo: string, o: Record<string, unknown>) {
  const { data: l } = await sb.from("mentoria_links").select("*").eq("id", linkId).maybeSingle<MentoriaLink>();
  if (!l) return { ignorado: "link não encontrado" };

  // Reembolso ou contestação.
  if (/^charge\.(refunded|dispute\.created)/.test(tipo)) {
    if (l.status !== "pago") return { status: l.status };
    await stripeEstornarRepasse({ id: l.id }, l.pi_id, "mentoria").catch((e) => console.error(`estorno repasse mentoria ${l.id}:`, (e as Error).message));
    await sb.from("mentoria_links").update({ status: "reembolsado" }).eq("id", l.id);
    await lancarVendaMentoria(sb, { ...l, status: "reembolsado" }, null);
    return { status: "reembolsado" };
  }

  // Descobre o PaymentIntent do evento (sessão do Payment Link ou o próprio PI).
  let piId: string | null = null;
  if (typeof o.id === "string" && o.id.startsWith("pi_")) piId = o.id;
  else if (typeof o.payment_intent === "string") piId = o.payment_intent;
  if (!piId) return { status: l.status };

  const pi = (await stripe(`/payment_intents/${encodeURIComponent(piId)}?expand[]=latest_charge`, "GET")) as PIStripe;
  if (pi.status !== "succeeded") {
    if (/async_payment_failed|payment_failed/.test(tipo) && l.status === "aberto") await sb.from("mentoria_links").update({ status: "falhou", pi_id: pi.id }).eq("id", l.id);
    return { status: l.status };
  }
  if (l.status === "pago") return { status: "pago" };
  if ((pi.amount_received ?? pi.amount) !== l.valor_centavos) {
    console.error(`mentoria ${l.id}: valor pago ${pi.amount_received} diferente de ${l.valor_centavos}`);
    return { status: l.status };
  }

  const ch = typeof pi.latest_charge === "object" && pi.latest_charge ? pi.latest_charge : null;
  const bd = (ch?.billing_details ?? {}) as { name?: string; email?: string };
  const tipoPM = ((ch?.payment_method_details as { type?: string } | undefined)?.type ?? "") as string;
  const metodo = METODO_STRIPE[tipoPM] ?? "outro";
  const pago = {
    status: "pago",
    pi_id: pi.id,
    pago_em: isoDe(ch?.created) ?? new Date().toISOString(),
    pagador_nome: bd.name?.slice(0, 120) ?? null,
    pagador_email: bd.email?.toLowerCase().slice(0, 200) ?? null,
    metodo,
  };
  // Marca pago só uma vez (avisos repetidos não repassam de novo).
  const { data: marcado } = await sb.from("mentoria_links").update(pago).eq("id", l.id).neq("status", "pago").select("id");
  if (!marcado?.length) return { status: "pago" };

  let repassado = 0;
  try {
    repassado = await repassarPI(pi.id, "mentoria", l.id, l.valor_centavos, l.descricao);
    if (repassado > 0) await sb.from("mentoria_links").update({ split_centavos: repassado }).eq("id", l.id);
  } catch (e) {
    console.error(`repasse mentoria ${l.id}:`, (e as Error).message);
  }
  if (l.stripe_link_id) await stripeDesativarLink(l.stripe_link_id).catch(() => null);
  await lancarVendaMentoria(sb, { ...l, ...pago }, repassado);
  return { status: "pago" };
}

async function lancarVendaMentoria(
  sb: SupabaseClient,
  l: MentoriaLink & { pagador_nome?: string | null; pagador_email?: string | null; metodo?: string | null; pago_em?: string | null },
  repassado: number | null,
) {
  let { pagador_email: email, pagador_nome: nome, metodo } = l;
  if (!email) {
    const { data } = await sb.from("mentoria_links").select("pagador_email, pagador_nome, metodo, split_centavos").eq("id", l.id).maybeSingle();
    email = data?.pagador_email ?? null;
    nome = nome ?? data?.pagador_nome ?? null;
    metodo = metodo ?? data?.metodo ?? null;
    if (repassado === null) repassado = data?.split_centavos ?? 0;
  }
  const { error } = await sb.rpc("receber_venda", {
    p: {
      pedido: `mentoria-${l.id}`,
      plataforma: "stripe",
      produto: l.descricao,
      plano: "loja", // não mexe no acesso à plataforma
      cliente_nome: nome ?? l.lead_nome,
      cliente_email: email ?? "sem-email@hotsociety.com.br",
      metodo: metodo ?? "outro",
      valor: l.valor_centavos / 100,
      liquido: (l.valor_centavos - (repassado ?? 0)) / 100,
      status: l.status === "pago" ? "pago" : "reembolsado",
      criado_em: l.pago_em ?? l.criado_em,
    },
  });
  if (error) console.error("receber_venda mentoria:", error.message);
}

export async function stripeConsultar(p: Pedido): Promise<Cobranca | null> {
  if (!p.charge_id) return null;
  return p.charge_id.startsWith("cs_") ? stripeConsultarSessao(p.charge_id, p.id) : stripeConsultarPI(p.charge_id);
}

// Assinatura do webhook: cabeçalho "t=…,v1=…" = HMAC-SHA256 de "t.corpo" com o segredo whsec_…; tolera 5 min.
export function stripeAssinaturaConfere(corpoCru: string, cabecalho: string | null) {
  const segredo = process.env.STRIPE_WEBHOOK_SECRET;
  if (!segredo || !cabecalho) return false;
  const partes = cabecalho.split(",").map((x) => x.trim().split("="));
  const t = partes.find(([k]) => k === "t")?.[1];
  const assinaturas = partes.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !/^\d+$/.test(t) || !assinaturas.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const certa = Buffer.from(createHmac("sha256", segredo).update(`${t}.${corpoCru}`, "utf8").digest("hex"));
  return assinaturas.some((v) => {
    const a = Buffer.from(v ?? "");
    return a.length === certa.length && timingSafeEqual(a, certa);
  });
}

/* =====================================================================
   NOVUS  (docs: app.novuspagamentos.com/docs)
   Pix: POST /api/v2/invoices · consulta: GET /api/v2/invoices/{id}
   Cartão: página de pagamento da Novus (Checkout Sessions), sem o site tocar no número do cartão
   Avisos: postback por cobrança, assinado com HMAC-SHA256 da chave da API (X-Webhook-Signature)
   ===================================================================== */
const NOVUS = (process.env.NOVUS_API_URL || "https://api.novuspagamentos.com").replace(/\/$/, "");

const STATUS_NOVUS: Record<string, Cobranca["status"]> = {
  paid: "pago",
  approved: "pago",
  completed: "pago",
  waiting_payment: null,
  pending: null,
  active: null,
  processing: null,
  processing_error: null,
  created: null,
  canceled: "expirado",
  cancelled: "expirado",
  expired: "expirado",
  refused: "falhou",
  failed: "falhou",
  refunded: "reembolsado",
  chargedback: "chargeback",
  chargeback: "chargeback",
  blocked: "bloqueado",
};

type ObjNovus = Record<string, unknown> & { pix?: Record<string, unknown> | null };
const txt = (v: unknown) => (typeof v === "string" && v ? v : typeof v === "number" ? String(v) : null);
const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && /^\d+$/.test(v) ? Number(v) : null);

// Transforma uma transação/fatura da Novus (resposta da API ou aviso) no formato do site.
export function novusNormalizar(o: ObjNovus): Cobranca {
  const st = (txt(o.status) ?? "").toLowerCase();
  return {
    gateway: "novus",
    id: txt(o.invoice_id) ?? txt(o.id) ?? txt(o.transaction_id) ?? "",
    status: st in STATUS_NOVUS ? STATUS_NOVUS[st] : null,
    valor: num(o.total_cents) ?? num(o.total) ?? num(o.amount),
    referencia: txt(o.external_id) ?? txt(o.externalRef) ?? txt(o.external_ref),
    sessao: txt(o.checkout_session_id),
    br_code: txt(o.qr_code_pix) ?? txt(o.pix?.qrcode) ?? txt(o.qr_code),
    expira_em: txt(o.pix?.expirationDate) ?? txt(o.detectable_until) ?? txt(o.expires_at),
    pago_em: txt(o.paid_at),
  };
}

function dados(j: Record<string, unknown>): ObjNovus {
  return ((j.data && typeof j.data === "object" ? j.data : j) as ObjNovus) ?? {};
}

// Divisão do Pix configurada na Vercel (ou null se não houver).
export function splitNovus(valorCentavos: number) {
  const chave = process.env.NOVUS_SPLIT_PIX_KEY?.trim();
  const tipo = process.env.NOVUS_SPLIT_PIX_TYPE?.trim().toUpperCase();
  const pct = Number(process.env.NOVUS_SPLIT_PERCENTUAL);
  if (!chave || !tipo || !["CPF", "CNPJ", "PHONE", "EMAIL", "RANDOM"].includes(tipo) || !(pct > 0 && pct < 100)) return null;
  const bp = Math.round(pct * 100); // 70% = 7000 basis points
  const nome = process.env.NOVUS_SPLIT_NOME?.trim();
  return {
    centavos: Math.floor((valorCentavos * bp) / 10000),
    corpo: { pix_key: chave, pix_type: tipo, percentage_basis_points: bp, ...(nome ? { recipient_name: nome } : {}) },
  };
}

async function novusCriarPix(p: Pedido, c: Cliente): Promise<Cobranca> {
  const split = splitNovus(p.valor_centavos);
  const j = await chamar(`${NOVUS}/api/v2/invoices`, {
    method: "POST",
    chave: process.env.NOVUS_API_KEY!,
    idempotencia: p.id,
    body: JSON.stringify({
      method: "pix",
      total_price_cents: p.valor_centavos,
      product_fisical: "digital",
      external_id: p.id,
      postback_url: `${SITE}/api/pagamentos/novus`,
      payer: { name: c.nome, cpf_cnpj: c.cpf, email: c.email, ...(c.telefone ? { phone: c.telefone } : {}) },
      items: [{ name: nomeProduto(p), unit_price: p.valor_centavos, quantity: 1 }],
      ...(split ? { splits: [{ ...split.corpo, external_id: `${p.id}-socio` }] } : {}),
    }),
  });
  const n = novusNormalizar(dados(j));
  return { ...n, referencia: n.referencia ?? p.id, valor: n.valor ?? p.valor_centavos };
}

// Cartão: cria a página de pagamento da Novus (até 12x). O número do cartão nunca passa pelo nosso site.
async function novusCriarCartao(p: Pedido, c: Cliente): Promise<Cobranca> {
  const expira = new Date(Date.now() + 2 * 3600e3).toISOString();
  const j = await chamar(`${NOVUS}/v2/checkout/sessions`, {
    method: "POST",
    chave: process.env.NOVUS_API_KEY!,
    body: JSON.stringify({
      items: [{ title: nomeProduto(p), unitPrice: p.valor_centavos, quantity: 1 }],
      currency: "BRL",
      maxInstallments: 12,
      successUrl: `${SITE}/assinar?${p.plano === "loja" ? `item=${p.item}&` : ""}pedido=${p.id}`,
      cancelUrl: `${SITE}/assinar?${p.plano === "loja" ? `item=${p.item}` : `plano=${p.plano}`}`,
      postbackUrl: `${SITE}/api/pagamentos/novus`,
      externalRef: p.id,
      metadata: JSON.stringify({ pedido: p.id }),
      expiresAt: expira,
      customer: { name: c.nome, email: c.email, documentNumber: c.cpf, documentType: "CPF", ...(c.telefone ? { phone: c.telefone } : {}) },
    }),
  });
  const s = dados(j);
  const url = txt(s.checkoutUrl);
  if (!url || !/^https:\/\//.test(url)) throw new ErroGateway("Novus não devolveu a página de pagamento", "SEM_URL", 502);
  return { gateway: "novus", id: txt(s.id) ?? "", status: null, valor: num(s.totalAmount) ?? p.valor_centavos, referencia: p.id, sessao: txt(s.id), checkout_url: url, expira_em: txt(s.expiresAt) ?? expira };
}

export async function novusConsultarFatura(id: string): Promise<Cobranca> {
  const j = await chamar(`${NOVUS}/api/v2/invoices/${encodeURIComponent(id)}`, { method: "GET", chave: process.env.NOVUS_API_KEY! });
  return novusNormalizar(dados(j));
}

async function novusConsultarSessao(id: string, pedidoId: string): Promise<Cobranca> {
  const j = await chamar(`${NOVUS}/v2/checkout/sessions/${encodeURIComponent(id)}`, { method: "GET", chave: process.env.NOVUS_API_KEY! });
  const s = dados(j);
  const transacao = txt(s.transactionId);
  if (transacao) {
    const f = await novusConsultarFatura(transacao);
    return { ...f, referencia: f.referencia ?? pedidoId, sessao: id };
  }
  const st = (txt(s.status) ?? "").toUpperCase();
  return { gateway: "novus", id, status: st === "EXPIRED" || st === "CANCELED" ? "expirado" : null, valor: num(s.totalAmount), referencia: pedidoId, sessao: id };
}

// Avisos da Novus: postback por cobrança (assinado com a chave da API) ou webhook global (whsec_…).
export function novusAssinaturaConfere(corpoCru: string, recebida: string | null) {
  return hmacConfere(corpoCru, recebida, process.env.NOVUS_API_KEY) || hmacConfere(corpoCru, recebida, process.env.NOVUS_WEBHOOK_SECRET);
}

/* =====================================================================
   TRANSFEER  (alternativa)
   ===================================================================== */
const TRANSFEER = process.env.TRANSFEER_API_URL || "https://api.transfeer.io/v1";
const STATUS_TRANSFEER: Record<string, Cobranca["status"]> = {
  processing: null,
  pending: null,
  paid: "pago",
  expired: "expirado",
  canceled: "cancelado",
  failed: "falhou",
  refunded: "reembolsado",
  charged_back: "chargeback",
  infraction: "chargeback", // MED do Pix: trata como contestação
};

export function transfeerNormalizar(o: Record<string, unknown> & { pix?: { br_code?: string | null } | null }): Cobranca {
  return {
    gateway: "transfeer",
    id: txt(o.id) ?? "",
    status: STATUS_TRANSFEER[txt(o.status) ?? ""] ?? null,
    valor: num(o.amount),
    referencia: txt(o.reference),
    br_code: o.pix?.br_code ?? null,
    expira_em: txt(o.expires_at),
    pago_em: txt(o.paid_at),
  };
}

async function transfeerCriarPix(p: Pedido, c: Cliente) {
  const j = await chamar(`${TRANSFEER}/charges`, {
    method: "POST",
    chave: process.env.TRANSFEER_API_KEY!,
    prefixo: "x-api-key",
    idempotencia: p.id,
    body: JSON.stringify({
      amount: p.valor_centavos,
      method: "pix",
      description: nomeProduto(p),
      reference: p.id,
      expires_in: 3600,
      customer: { name: c.nome, email: c.email, document: c.cpf, ...(c.telefone ? { phone: c.telefone } : {}) },
      webhook_url: `${SITE}/api/pagamentos/transfeer`,
      webhook_secret: process.env.TRANSFEER_WEBHOOK_SECRET,
    }),
  });
  return transfeerNormalizar(j);
}

export async function transfeerConsultar(id: string) {
  return transfeerNormalizar(await chamar(`${TRANSFEER}/charges/${encodeURIComponent(id)}`, { method: "GET", chave: process.env.TRANSFEER_API_KEY!, prefixo: "x-api-key" }));
}

export function transfeerAssinaturaConfere(corpoCru: string, recebida: string | null) {
  return hmacConfere(corpoCru, recebida, process.env.TRANSFEER_WEBHOOK_SECRET);
}

/* =====================================================================
   Comum
   ===================================================================== */

export async function criarCobranca(p: Pedido, c: Cliente, metodo: Metodo): Promise<Cobranca> {
  // Stripe: uma página só com todas as formas de pagamento ativas na conta.
  if (gatewayAtivo() === "stripe") return stripeCheckout(p, c, "todos");
  if (gatewayAtivo() === "novus") return metodo === "cartao" ? novusCriarCartao(p, c) : novusCriarPix(p, c);
  if (metodo === "cartao") throw new ErroGateway("Cartão indisponível neste gateway", "SEM_CARTAO", 400);
  return transfeerCriarPix(p, c);
}

// Status atual de um pedido direto no gateway em que ele foi criado.
export async function consultarPedido(p: Pedido): Promise<Cobranca | null> {
  if (!p.charge_id) return null;
  if (p.gateway === "stripe") return stripeConsultar(p);
  if ((p.gateway ?? "transfeer") === "novus") {
    return p.metodo === "cartao" ? novusConsultarSessao(p.charge_id, p.id) : novusConsultarFatura(p.charge_id);
  }
  return transfeerConsultar(p.charge_id);
}

const STATUS_VENDA: Partial<Record<Pedido["status"], string>> = { pago: "pago", reembolsado: "reembolsado", chargeback: "chargeback" };

// Aplica no banco o status de uma cobrança (aviso automático ou conferência manual).
// É seguro chamar várias vezes com o mesmo status.
export async function aplicarCobranca(sb: SupabaseClient, c: Cobranca): Promise<Pedido | null> {
  const ref = c.referencia;
  if (!ref || !/^[0-9a-f-]{36}$/i.test(ref) || !c.id) return null;
  const { data: p } = await sb.from("pedidos").select("*").eq("id", ref).maybeSingle<Pedido>();
  if (!p) return null;
  // A cobrança precisa ser deste pedido (no cartão, o pedido guarda o id da sessão de checkout).
  if (p.charge_id && p.charge_id !== c.id && p.charge_id !== c.sessao) return null;

  // MED/contestação aberta: bloqueia só se já estava pago; se voltar a "pago", libera de novo.
  const novo = c.status === "bloqueado" ? (p.status === "pago" ? "chargeback" : null) : c.status;
  if (!novo || novo === p.status) return p;

  // Pagamento só vale se o valor bater com o do pedido.
  if (novo === "pago" && c.valor !== p.valor_centavos) {
    console.error(`pagamento com valor diferente: pedido ${p.id} esperava ${p.valor_centavos}, veio ${c.valor}`);
    return p;
  }

  const { data: atual } = await sb
    .from("pedidos")
    .update({
      status: novo,
      charge_id: p.charge_id ?? c.id,
      pago_em: novo === "pago" ? (c.pago_em ?? new Date().toISOString()) : p.pago_em,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", p.id)
    .select("*")
    .single<Pedido>();

  // Stripe: repasse automático da parte do sócio (Connect) e estorno em reembolso/contestação.
  if (atual && c.gateway === "stripe" && novo === "pago") {
    try {
      const repassado = await stripeRepassar(atual, c.id);
      if (repassado > 0) {
        await sb.from("pedidos").update({ split_centavos: repassado }).eq("id", atual.id);
        atual.split_centavos = repassado;
        p.split_centavos = repassado;
      }
    } catch (e) {
      console.error(`repasse Stripe pedido ${atual.id}:`, (e as Error).message);
    }
  } else if (atual && c.gateway === "stripe" && (novo === "reembolsado" || novo === "chargeback")) {
    await stripeEstornarRepasse(atual, c.id).catch((e) => console.error(`estorno repasse pedido ${atual.id}:`, (e as Error).message));
  }
  if (atual && ["pago", "reembolsado", "chargeback", "falhou"].includes(novo)) await enviarUtmify(atual);
  // Afiliados: pago gera a comissão de quem indicou; reembolso ou contestação cancela.
  // Itens da loja não geram comissão de afiliado.
  if (atual && p.plano === "loja") {
    // nada
  } else if (atual && novo === "pago") {
    const { error } = await sb.rpc("hs_registrar_comissao", { p_pedido: atual.id });
    if (error) console.error("comissão afiliado:", error.message);
  } else if (atual && (novo === "reembolsado" || novo === "chargeback")) {
    const { error } = await sb.rpc("hs_cancelar_comissao", { p_pedido: atual.id });
    if (error) console.error("cancelar comissão:", error.message);
  }
  if (atual && ["pago", "reembolsado", "chargeback"].includes(novo)) await avisarVenda(atual);

  if (novo === "pago" && p.status !== "chargeback") {
    await enviarRecibo(p, c).catch((e) => console.error("recibo:", (e as Error).message));
    if (p.cupom) await sb.rpc("hs_usar_cupom", { p_codigo: p.cupom });
  }

  const statusVenda = STATUS_VENDA[novo];
  if (statusVenda) {
    const { error } = await sb.rpc("receber_venda", {
      p: {
        pedido: c.id,
        plataforma: c.gateway,
        produto: nomeVenda(p),
        plano: p.plano,
        cliente_nome: p.nome,
        cliente_email: p.email,
        metodo: p.metodo === "cartao" ? "cartao" : "pix",
        valor: p.valor_centavos / 100,
        liquido: (p.valor_centavos - (p.split_centavos ?? 0)) / 100, // o que fica na sua conta depois da divisão

        status: statusVenda,
        criado_em: p.criado_em,
      },
    });
    if (error) console.error("receber_venda:", error.message);
  }
  return atual ?? p;
}

// Recibo por e-mail (Decreto 7.962/2013: confirmar a compra). Só envia se RESEND_API_KEY estiver configurada.
async function enviarRecibo(p: Pedido, c: Cobranca) {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) return;
  const valor = (p.valor_centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const data = new Date(c.pago_em ?? Date.now()).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const esc = (t: string) => t.replace(/[&<>"]/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[x]!);
  const meio = p.metodo === "cartao" ? "Cartão" : "Pix";
  const loja = p.plano === "loja";
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#141416">
  <h2 style="margin:0 0 12px">Pagamento aprovado ✈️</h2>
  <p>Olá${p.nome ? ", " + esc(p.nome.split(" ")[0]) : ""}! ${loja ? (p.item === "ar" ? "Seu Arsenal do Cappu está liberado." : "Sua compra já está no seu Inventário.") : "Seu passaporte HOT SOCIETY está ativo."}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:6px 0;color:#666">Produto</td><td>${esc(nomeVenda(p))}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Valor</td><td>${valor} (${meio})</td></tr>
    <tr><td style="padding:6px 0;color:#666">Data</td><td>${data}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Pedido</td><td>${esc(c.id)}</td></tr>
  </table>
  <p><a href="${SITE}${loja ? "/dashboard/inventario" : "/dashboard"}" style="display:inline-block;background:#C9A24E;color:#141416;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">${loja ? "Abrir meu Inventário" : "Entrar na área de membros"}</a></p>
  ${
    temArsenal(p)
      ? `<div style="margin:16px 0;padding:14px 16px;border:1px solid #e6c978;border-radius:10px;background:#fffaf0">
    <b>🔓 ${esc(ADICIONAL.titulo)}</b><br><span style="font-size:13px;color:#555">Seu acesso ao Arsenal e à comunidade de networking é pelo Discord:</span>
    <p style="margin:10px 0 0"><a href="${ARSENAL_CONVITE}" style="display:inline-block;background:#5865F2;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">Entrar no Discord</a></p>
    <p style="font-size:12px;color:#666;margin:8px 0 0">O convite também fica na sua área de membros.</p>
  </div>`
      : ""
  }
  <p style="font-size:12px;color:#666">${loja && p.item === "cs" ? "No Inventário você agenda a sua call. " : ""}Garantia de 7 dias: se se arrepender, peça o reembolso integral em Perfil → Acesso e compras.${loja ? "" : " Não há renovação automática."}</p>
</div>`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${chave}`, "content-type": "application/json", "Idempotency-Key": `recibo-${p.id}` },
    body: JSON.stringify({
      from: process.env.EMAIL_REMETENTE || "HOT SOCIETY <nao-responda@hotsociety.com.br>",
      to: [p.email],
      subject: `Pagamento aprovado · ${nomeVenda(p)}`,
      html,
    }),
    signal: AbortSignal.timeout(8000),
  });
}

export { ErroGateway };
