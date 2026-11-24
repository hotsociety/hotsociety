// SÓ SERVIDOR. Cliente da API da Appmax (v1). Documentação: https://docs.appmax.com.br
// As credenciais são as da loja HOT SOCIETY, geradas no painel da Appmax em API → Credenciais.
//
// Variáveis na Vercel:
//   APPMAX_CLIENT_ID e APPMAX_CLIENT_SECRET (Sensitive) → credenciais da loja
//   APPMAX_EXTERNAL_ID     → identificador da loja, usado no navegador para tokenizar o cartão (não é segredo)
//   APPMAX_AMBIENTE        → "sandbox" para testar com credenciais do sandbox (padrão: produção)
//   APPMAX_PARCELAS_MAX    → máximo de parcelas no cartão, de 1 a 12 (padrão: 12)
//   APPMAX_WEBHOOK_SECRET  → opcional: secret do webhook cadastrado em Appmax → API → Webhooks
//
// Valores sempre em centavos. O token da loja vale 1 hora e fica guardado em memória.

import { createHmac, timingSafeEqual } from "node:crypto";

export type AmbienteAppmax = "sandbox" | "producao";

export function appmaxAmbiente(): AmbienteAppmax {
  return process.env.APPMAX_AMBIENTE?.trim().toLowerCase() === "sandbox" ? "sandbox" : "producao";
}

export function appmaxUrls() {
  const sandbox = appmaxAmbiente() === "sandbox";
  return {
    auth: sandbox ? "https://auth.sandboxappmax.com.br" : "https://auth.appmax.com.br",
    api: sandbox ? "https://api.sandboxappmax.com.br" : "https://api.appmax.com.br",
    // Cada ambiente tem o seu script: tokenizar num e cobrar no outro dá 404 na cobrança.
    script: sandbox ? "https://scripts.sandboxappmax.com.br/appmax.min.js" : "https://scripts.appmax.com.br/appmax.min.js",
  };
}

export const appmaxConfigurada = () => !!(process.env.APPMAX_CLIENT_ID?.trim() && process.env.APPMAX_CLIENT_SECRET?.trim());

// Parcelas no cartão (sem juros para quem compra). Cada parcela precisa ter pelo menos R$ 5.
export function appmaxParcelasMax(valorCentavos?: number): number {
  const conf = Math.trunc(Number(process.env.APPMAX_PARCELAS_MAX) || 12);
  const max = Math.min(12, Math.max(1, conf));
  if (!valorCentavos) return max;
  return Math.max(1, Math.min(max, Math.floor(valorCentavos / 500)));
}

export class ErroAppmax extends Error {
  constructor(
    msg: string,
    public status: number,
    public corpo: unknown,
  ) {
    super(msg);
  }
}

async function lerCorpo(r: Response): Promise<Record<string, unknown> | null> {
  const t = await r.text().catch(() => "");
  if (!t) return null;
  try {
    const j = JSON.parse(t);
    return j && typeof j === "object" ? (j as Record<string, unknown>) : { valor: j };
  } catch {
    return { texto: t.slice(0, 300) };
  }
}

// Motivo do erro nos formatos que a Appmax usa (OAuth, { message }, { error: { message } }, validação 422 por campo).
function mensagem(corpo: Record<string, unknown> | null, padrao: string): string {
  if (!corpo) return padrao;
  if (typeof corpo.message === "string") return corpo.message;
  const dados = corpo.data as Record<string, unknown> | undefined;
  if (dados && typeof dados.message === "string") return dados.message;
  if (typeof corpo.error === "string") return typeof corpo.error_description === "string" ? `${corpo.error}: ${corpo.error_description}` : corpo.error;
  const erro = corpo.error as Record<string, unknown> | undefined;
  if (erro && typeof erro.message === "string") return erro.message;
  const erros = corpo.errors as Record<string, unknown> | undefined;
  if (erros && typeof erros.message === "string") return erros.message;
  if (erros?.message && typeof erros.message === "object") {
    return Object.entries(erros.message as Record<string, unknown>)
      .map(([campo, motivo]) => `${campo}: ${Array.isArray(motivo) ? motivo.join(", ") : String(motivo)}`)
      .join("; ");
  }
  if (typeof corpo.texto === "string") return corpo.texto;
  return padrao;
}

let cache: { token: string; ate: number; ambiente: AmbienteAppmax } | null = null;

async function tokenAppmax(): Promise<string> {
  const ambiente = appmaxAmbiente();
  if (cache && cache.ambiente === ambiente && cache.ate > Date.now()) return cache.token;
  const r = await fetch(`${appmaxUrls().auth}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.APPMAX_CLIENT_ID?.trim() ?? "",
      client_secret: process.env.APPMAX_CLIENT_SECRET?.trim() ?? "",
    }).toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const j = await lerCorpo(r);
  const token = typeof j?.access_token === "string" ? j.access_token : null;
  if (!r.ok || !token) throw new ErroAppmax(mensagem(j, `Appmax: falha ao autenticar (HTTP ${r.status})`), r.status || 502, j);
  const validade = Number(j?.expires_in) > 0 ? Number(j?.expires_in) : 3600;
  cache = { token, ate: Date.now() + validade * 1000 - 60_000, ambiente };
  return token;
}

async function api<T>(metodo: "GET" | "POST", caminho: string, corpo?: unknown, tentativa = 1): Promise<T> {
  const token = await tokenAppmax();
  const r = await fetch(`${appmaxUrls().api}${caminho}`, {
    method: metodo,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
      ...(corpo !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const j = await lerCorpo(r);
  // Token vencido ou trocado: pega outro e tenta mais uma vez.
  if (r.status === 401 && tentativa === 1) {
    cache = null;
    return api<T>(metodo, caminho, corpo, 2);
  }
  if (!r.ok) throw new ErroAppmax(mensagem(j, `Appmax: HTTP ${r.status}`), r.status, j);
  // Formato antigo: às vezes vem HTTP 200 com { success: false }.
  if (j && j.success === false) throw new ErroAppmax(mensagem(j, "Appmax recusou o pedido"), 502, j);
  return (j && "data" in j ? j.data : j) as T;
}

const idNumero = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" && /^\d+$/.test(v) ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

// ---------- Cliente, pedido e pagamento ----------

export type CompradorAppmax = { nome: string; email: string; telefone: string; cpf: string; ip: string };

// Cria (ou atualiza) o comprador. O IP é obrigatório e vem do script da Appmax no navegador.
export async function appmaxCriarCliente(c: CompradorAppmax): Promise<number> {
  const partes = c.nome.trim().split(/\s+/);
  const primeiro = partes.shift() ?? c.nome.trim();
  const d = await api<{ customer?: { id?: unknown } }>("POST", "/v1/customers", {
    first_name: primeiro.slice(0, 60),
    last_name: (partes.join(" ") || primeiro).slice(0, 120),
    email: c.email,
    phone: c.telefone,
    ip: c.ip,
    document_number: c.cpf,
  });
  const id = idNumero(d?.customer?.id);
  if (!id) throw new ErroAppmax("Appmax não devolveu o cliente", 502, d);
  return id;
}

export type ItemAppmax = { sku: string; nome: string; centavos: number };

export async function appmaxCriarPedido(clienteId: number, itens: ItemAppmax[]): Promise<number> {
  const d = await api<{ order?: { id?: unknown } }>("POST", "/v1/orders", {
    customer_id: clienteId,
    discount_value: 0,
    shipping_value: 0,
    products: itens.map((i) => ({ sku: i.sku.slice(0, 40), name: i.nome.slice(0, 120), quantity: 1, unit_value: i.centavos, type: "digital" })),
  });
  const id = idNumero(d?.order?.id);
  if (!id) throw new ErroAppmax("Appmax não devolveu o pedido", 502, d);
  return id;
}

// Pix do pedido: devolve o copia e cola (o QR Code é desenhado no nosso site a partir dele).
export async function appmaxPix(pedidoId: number, cpf: string, expira: Date): Promise<{ emv: string; expiraEm: string | null }> {
  const d = await api<Record<string, unknown> & { payment?: Record<string, unknown> }>("POST", "/v1/payments/pix", {
    order_id: pedidoId,
    payment_data: { pix: { document_number: cpf, expiration_date: dataSaoPaulo(expira) } },
  });
  const pg = (d?.payment && typeof d.payment === "object" ? d.payment : d) as Record<string, unknown>;
  const emv = typeof pg?.pix_emv === "string" && pg.pix_emv ? pg.pix_emv : null;
  if (!emv) throw new ErroAppmax("Appmax não devolveu o Pix", 502, d);
  return { emv, expiraEm: isoDeSaoPaulo(pg.pix_expiration_date) };
}

// Cartão: o token vem do script da Appmax no navegador (o número do cartão nunca passa pelo nosso servidor).
export async function appmaxCartao(pedidoId: number, clienteId: number, c: { token: string; titular: string; cpf: string; parcelas: number }) {
  return api<Record<string, unknown>>("POST", "/v1/payments/credit-card", {
    order_id: pedidoId,
    customer_id: clienteId,
    payment_data: {
      credit_card: { token: c.token, holder_document_number: c.cpf, holder_name: c.titular, installments: c.parcelas },
    },
  });
}

export type PedidoAppmax = {
  order?: {
    id?: unknown;
    status?: unknown;
    total_paid?: unknown;
    total?: unknown;
    amounts?: { sub_total?: unknown; shipping_value?: unknown; discount?: unknown; installment_fee?: unknown };
  };
  payment?: { method?: unknown; paid_at?: unknown; installments?: unknown };
  refund?: { refunded_at?: unknown };
};

export async function appmaxConsultarPedido(id: number | string): Promise<PedidoAppmax> {
  return api<PedidoAppmax>("GET", `/v1/orders/${encodeURIComponent(String(id))}`);
}

// ---------- Webhook ----------
// Com APPMAX_WEBHOOK_SECRET: header "Signature" = HMAC-SHA256 (hex) do corpo cru. Sem secret, o aviso só serve
// de gatilho: o status é sempre conferido de novo na API antes de liberar ou bloquear acesso.
export function appmaxAssinaturaConfere(corpoCru: string, recebida: string | null): boolean {
  const segredo = process.env.APPMAX_WEBHOOK_SECRET?.trim();
  if (!segredo) return true;
  if (!recebida) return false;
  const certa = Buffer.from(createHmac("sha256", segredo).update(corpoCru, "utf8").digest("hex"));
  const veio = Buffer.from(recebida.trim().replace(/^sha256=/i, "").toLowerCase());
  return veio.length === certa.length && timingSafeEqual(veio, certa);
}

// ---------- Datas (a Appmax usa "Y-m-d H:i:s" no horário de Brasília) ----------
function dataSaoPaulo(d: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

export function isoDeSaoPaulo(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const m = v.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?$/);
  // O Brasil não tem mais horário de verão: Brasília é sempre UTC−3.
  const t = m ? Date.parse(`${m[1]}T${m[2]}${m[3] ?? ":00"}-03:00`) : Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}
