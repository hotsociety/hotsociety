// POST: gera o Pix de um plano para quem está logado.
// GET ?id=PEDIDO: devolve o status do pedido (e confere direto na Transfeer se ainda estiver pendente).

import {
  VALOR_CENTAVOS,
  admin,
  aplicarCobranca,
  configurado,
  consultarCobranca,
  cpfValido,
  criarCobranca,
  usuarioDoPedido,
  type Pedido,
  type Plano,
} from "../../../_lib/pagamentos";
import { SITE } from "../../../_lib/site";

const resp = (corpo: object, status = 200) => Response.json(corpo, { status, headers: { "cache-control": "no-store" } });

function publico(p: Pedido) {
  return {
    id: p.id,
    plano: p.plano,
    valor: p.valor_centavos / 100,
    status: p.status,
    br_code: p.status === "pendente" ? p.br_code : null,
    expira_em: p.expira_em,
  };
}

export async function POST(req: Request) {
  const cfg = configurado();
  if (!cfg.ok) {
    console.error("Pix desligado, faltam variáveis:", cfg.faltando.join(", "));
    return resp({ erro: "O pagamento por Pix ainda não está disponível. Tente mais tarde." }, 503);
  }

  const user = await usuarioDoPedido(req);
  if (!user) return resp({ erro: "Entre na sua conta para assinar." }, 401);

  let corpo: { plano?: string; nome?: string; cpf?: string; telefone?: string; aceite?: boolean; cupom?: string };
  try {
    corpo = await req.json();
  } catch {
    return resp({ erro: "Pedido inválido." }, 400);
  }
  const plano = corpo.plano === "anual" ? "anual" : corpo.plano === "mensal" ? "mensal" : null;
  const nome = (corpo.nome ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const cpf = (corpo.cpf ?? "").replace(/\D/g, "");
  const telefone = (corpo.telefone ?? "").replace(/\D/g, "").slice(0, 13);
  if (!plano) return resp({ erro: "Escolha um plano." }, 400);
  if (nome.split(" ").length < 2) return resp({ erro: "Digite seu nome completo." }, 400);
  if (!cpfValido(cpf)) return resp({ erro: "CPF inválido. Confira os números." }, 400);
  if (corpo.aceite !== true) return resp({ erro: "Para continuar, confirme que tem 18 anos ou mais e aceita os termos." }, 400);

  const sb = admin();

  // Cupom de desconto (conferido no banco, nunca pelo navegador).
  const codigo = (corpo.cupom ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  let desconto = 0;
  if (codigo) {
    const { data: c } = await sb.rpc("conferir_cupom", { p_codigo: codigo, p_plano: plano });
    const r = c as { ok: boolean; desconto?: number } | null;
    if (!r?.ok) return resp({ erro: "Cupom inválido, vencido ou esgotado." }, 400);
    desconto = Math.round((VALOR_CENTAVOS[plano as Plano] * (r.desconto ?? 0)) / 100);
  }
  const valor = VALOR_CENTAVOS[plano as Plano] - desconto;

  // Já existe um Pix deste plano (e mesmo valor) ainda válido? Reaproveita.
  const { data: aberto } = await sb
    .from("pedidos")
    .select("*")
    .eq("user_id", user.id)
    .eq("plano", plano)
    .eq("valor_centavos", valor)
    .eq("status", "pendente")
    .gt("expira_em", new Date(Date.now() + 5 * 60_000).toISOString())
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle<Pedido>();
  if (aberto?.br_code) return resp(publico(aberto));

  // Freio contra abuso: no máximo 8 Pix gerados por hora por conta.
  const { count } = await sb
    .from("pedidos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gt("criado_em", new Date(Date.now() - 3600_000).toISOString());
  if ((count ?? 0) >= 8) return resp({ erro: "Muitas tentativas. Espere um pouco e tente de novo." }, 429);

  const novo = {
    user_id: user.id,
    email: user.email!,
    nome,
    plano,
    valor_centavos: valor,
    ...(codigo ? { cupom: codigo, desconto_centavos: desconto } : {}),
  };
  // Guarda quando e qual versão dos termos foi aceita (prova em caso de contestação).
  let { data: pedido, error } = await sb
    .from("pedidos")
    .insert({ ...novo, aceite_termos_em: new Date().toISOString(), versao_termos: SITE.versaoTermos })
    .select("*")
    .single<Pedido>();
  if (error && /aceite_termos_em|versao_termos/.test(error.message)) {
    // Banco ainda sem as colunas novas: grava sem elas para não travar a venda.
    ({ data: pedido, error } = await sb.from("pedidos").insert(novo).select("*").single<Pedido>());
  }
  if (error || !pedido) {
    console.error("criar pedido:", error?.message);
    return resp({ erro: "Não deu para iniciar o pagamento. Tente de novo." }, 500);
  }

  try {
    const c = await criarCobranca(pedido, { nome, cpf, telefone: telefone || undefined });
    const { data: atual } = await sb
      .from("pedidos")
      .update({ charge_id: c.id, br_code: c.pix?.br_code ?? null, expira_em: c.expires_at ?? null, atualizado_em: new Date().toISOString() })
      .eq("id", pedido.id)
      .select("*")
      .single<Pedido>();
    if (!atual?.br_code) throw new Error("Transfeer não devolveu o código Pix");
    return resp(publico(atual));
  } catch (e) {
    const err = e as Error & { code?: string };
    console.error("Transfeer criar cobrança:", err.code, err.message);
    await sb.from("pedidos").update({ status: "falhou", atualizado_em: new Date().toISOString() }).eq("id", pedido.id);
    const msg =
      err.code === "INVALID_DOCUMENT"
        ? "CPF recusado pelo banco. Confira os números."
        : "Não deu para gerar o Pix agora. Tente de novo em alguns minutos.";
    return resp({ erro: msg }, 502);
  }
}

export async function GET(req: Request) {
  if (!configurado().ok) return resp({ erro: "indisponível" }, 503);
  const user = await usuarioDoPedido(req);
  if (!user) return resp({ erro: "Entre na sua conta." }, 401);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return resp({ erro: "Pedido inválido." }, 400);

  const sb = admin();
  const { data: p } = await sb.from("pedidos").select("*").eq("id", id).eq("user_id", user.id).maybeSingle<Pedido>();
  if (!p) return resp({ erro: "Pedido não encontrado." }, 404);

  // Ainda pendente: pergunta direto para a Transfeer (caso o aviso automático atrase).
  if (p.status === "pendente" && p.charge_id) {
    try {
      const c = await consultarCobranca(p.charge_id);
      const atual = await aplicarCobranca(sb, c);
      if (atual) return resp(publico(atual));
    } catch (e) {
      console.error("Transfeer consultar:", (e as Error).message);
    }
  }
  return resp(publico(p));
}
