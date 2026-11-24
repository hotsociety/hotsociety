// Página pública de pagamento da mentoria pela Appmax (/pagar/<id>). O id do link é o acesso (UUID que só o lead recebe).
// GET ?id=…            → descrição, valor, status e configuração do script da Appmax.
// GET ?id=…&pedido=…   → confere o pagamento daquela tentativa na Appmax (a página chama a cada 5 s no Pix).
// POST { id, nome, email, cpf, telefone, metodo, ip, cartao? } → gera o Pix ou cobra o cartão (token da Appmax).

import { admin, cpfValido, type CartaoTokenizado } from "../../../_lib/pagamentos";
import { appmaxConfigurada, appmaxParcelasMax, appmaxUrls } from "../../../_lib/appmax";
import { linkMentoria, mentoriaAppmaxAplicar, mentoriaAppmaxCobrar } from "../../../_lib/mentoriaAppmax";

const resp = (corpo: object, status = 200) => Response.json(corpo, { status, headers: { "cache-control": "no-store" } });

function publico(l: { descricao: string; valor_centavos: number; status: string; lead_nome: string | null }) {
  return {
    descricao: l.descricao,
    valor: l.valor_centavos / 100,
    status: l.status === "pago" ? "pago" : l.status === "aberto" ? "aberto" : "fechado",
    primeiroNome: l.lead_nome?.split(" ")[0] ?? null,
  };
}

function ipValido(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(s) && s.split(".").every((n) => Number(n) <= 255)) return s;
  if (s.includes(":") && /^[0-9a-f:.]{3,45}$/i.test(s)) return s;
  return null;
}

export async function GET(req: Request) {
  if (!appmaxConfigurada() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return resp({ erro: "Pagamento indisponível." }, 503);
  const url = new URL(req.url);
  const sb = admin();
  const l = await linkMentoria(sb, url.searchParams.get("id") ?? "");
  if (!l) return resp({ erro: "Link não encontrado." }, 404);

  const pedido = url.searchParams.get("pedido");
  if (pedido && /^\d{1,15}$/.test(pedido) && l.status === "aberto" && l.pi_id === `appmax_${pedido}`) {
    try {
      const r = await mentoriaAppmaxAplicar(sb, l.id, pedido);
      return resp({ ...publico({ ...l, status: r.status === "pago" ? "pago" : l.status }), tentativa: r.status });
    } catch (e) {
      console.error("mentoria conferir:", (e as Error).message);
    }
  }
  const cartao = !!process.env.APPMAX_EXTERNAL_ID?.trim();
  return resp({
    ...publico(l),
    appmax: { script: appmaxUrls().script, externalId: process.env.APPMAX_EXTERNAL_ID?.trim() || null, parcelas: appmaxParcelasMax(l.valor_centavos), cartao },
  });
}

export async function POST(req: Request) {
  if (!appmaxConfigurada() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return resp({ erro: "Pagamento indisponível." }, 503);
  let corpo: { id?: string; nome?: string; email?: string; cpf?: string; telefone?: string; metodo?: string; ip?: string; cartao?: { token?: unknown; titular?: unknown; parcelas?: unknown } };
  try {
    corpo = await req.json();
  } catch {
    return resp({ erro: "Pedido inválido." }, 400);
  }
  const sb = admin();
  const l = await linkMentoria(sb, corpo.id ?? "");
  if (!l) return resp({ erro: "Link não encontrado." }, 404);
  if (l.status === "pago") return resp({ ...publico(l) });
  if (l.status !== "aberto") return resp({ erro: "Este link não está mais ativo. Fale com a equipe HOT SOCIETY." }, 410);

  const nome = (corpo.nome ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const email = (corpo.email ?? "").trim().toLowerCase().slice(0, 120);
  const cpf = (corpo.cpf ?? "").replace(/\D/g, "");
  const telefone = (corpo.telefone ?? "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  const metodo = corpo.metodo === "cartao" ? "cartao" : "pix";
  if (nome.split(" ").length < 2) return resp({ erro: "Digite seu nome completo." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return resp({ erro: "Digite um e-mail válido. É nele que chega o seu acesso." }, 400);
  if (!cpfValido(cpf)) return resp({ erro: "CPF inválido. Confira os números." }, 400);
  if (!/^\d{10,11}$/.test(telefone)) return resp({ erro: "Digite seu celular com DDD." }, 400);

  let cartao: CartaoTokenizado | null = null;
  if (metodo === "cartao") {
    const token = typeof corpo.cartao?.token === "string" ? corpo.cartao.token.trim() : "";
    const titular = (typeof corpo.cartao?.titular === "string" ? corpo.cartao.titular : "").trim().replace(/\s+/g, " ").slice(0, 80);
    const parcelas = Math.trunc(Number(corpo.cartao?.parcelas ?? 1));
    if (!/^[A-Za-z0-9._-]{8,300}$/.test(token)) return resp({ erro: "Não deu para ler o cartão. Confira os dados e tente de novo." }, 400);
    if (titular.split(" ").length < 2) return resp({ erro: "Digite o nome como está impresso no cartão." }, 400);
    if (!(parcelas >= 1 && parcelas <= appmaxParcelasMax(l.valor_centavos))) return resp({ erro: "Escolha o número de parcelas." }, 400);
    cartao = { token, titular, parcelas };
  }
  const ip = ipValido(corpo.ip) ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (!ip) return resp({ erro: "Recarregue a página e tente de novo." }, 400);

  try {
    const r = await mentoriaAppmaxCobrar(sb, l, { nome, email, cpf, telefone, ip }, cartao);
    if (r.status === "recusado" || r.status === "falhou")
      return resp({ erro: "Cartão não aprovado. Confira os dados, tente outro cartão ou pague com Pix." }, 402);
    return resp({ ...publico({ ...l, status: r.status === "pago" ? "pago" : "aberto" }), pedido: String(r.pedido), br_code: r.br_code, expira_em: r.expira_em, metodo });
  } catch (e) {
    console.error(`mentoria ${l.id} cobrar Appmax:`, (e as Error).message);
    const doc = /cpf|document/i.test((e as Error).message ?? "");
    return resp({ erro: doc ? "CPF recusado. Confira os números." : "Não deu para gerar o pagamento agora. Tente de novo em alguns minutos." }, 502);
  }
}
