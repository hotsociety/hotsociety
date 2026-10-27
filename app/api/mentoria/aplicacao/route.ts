// Aplicação para a Mentoria High Ticket → Painel → Mentoria.
// Recebe de dois lugares:
//   • site do Cappu (capputino-hq.vercel.app), sem login  → comentário "lead insta cappu"
//   • a própria plataforma (logado ou na página /mentoria) → comentário "lead plataforma"
// POST JSON com os campos do formulário (nome, ig, wpp, trabalho, momento, operacao, trava, invest, pc, tempo, maior).
import { createHash } from "node:crypto";
import { validarAplicacao, ROTULO_ORIGEM } from "../../../_lib/aplicacao";
import { SITE_URL, enviarEmail, esc, moldura } from "../../../_lib/email";
import { admin, usuarioDoPedido } from "../../../_lib/pagamentos";
import { SITE } from "../../../_lib/site";

// Sites do sócio autorizados a enviar (lead insta cappu). Dá para somar outros pela variável CAPPU_ORIGENS (separados por vírgula).
const ORIGENS_CAPPU = ["https://capputino-hq.vercel.app", ...(process.env.CAPPU_ORIGENS ?? "").split(",").map((s) => s.trim()).filter(Boolean)];
const PROPRIO = [SITE_URL, "https://hotsociety.com.br", "https://www.hotsociety.com.br"];

function cors(origem: string | null): Record<string, string> {
  if (!origem || !ORIGENS_CAPPU.includes(origem)) return {};
  return { "access-control-allow-origin": origem, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", vary: "origin" };
}
const resp = (corpo: object, status: number, origem: string | null) =>
  Response.json(corpo, { status, headers: { "cache-control": "no-store", ...cors(origem) } });

export function OPTIONS(req: Request) {
  const origem = req.headers.get("origin");
  return new Response(null, { status: ORIGENS_CAPPU.includes(origem ?? "") ? 204 : 403, headers: { ...cors(origem), "access-control-max-age": "86400" } });
}

function erroDoBanco(m: string) {
  if (/limite/.test(m)) return "Você já enviou algumas aplicações agora há pouco. Aguarde um pouco e tente de novo.";
  if (/18 anos/.test(m)) return "Confirme que tem 18 anos ou mais.";
  if (/whatsapp/.test(m)) return "WhatsApp com DDD, só números.";
  if (/preencha/.test(m)) return "Preencha todos os campos.";
  return "Não deu para enviar agora. Tente de novo.";
}

export async function POST(req: Request) {
  const origem = req.headers.get("origin");
  const doCappu = !!origem && ORIGENS_CAPPU.includes(origem);
  const user = await usuarioDoPedido(req).catch(() => null);
  // Sem login, só aceita do próprio site ou do site do Cappu (o navegador manda a origem, outros sites ficam de fora).
  if (!doCappu && !user && !(origem && PROPRIO.includes(origem))) return resp({ erro: "Origem não autorizada." }, 403, origem);
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return resp({ erro: "Não deu para enviar agora. Tente de novo." }, 503, origem);

  let corpo: Record<string, unknown>;
  try {
    const bruto = await req.text();
    if (bruto.length > 20000) return resp({ erro: "Aplicação grande demais." }, 413, origem);
    corpo = JSON.parse(bruto);
  } catch {
    return resp({ erro: "Pedido inválido." }, 400, origem);
  }
  if (typeof corpo.site === "string" && corpo.site) return resp({ ok: true }, 200, origem); // campo-isca para robôs

  const v = validarAplicacao(corpo);
  if (!v.ok) return resp({ erro: v.erro }, 400, origem);
  const a = v.a;
  const tipo = doCappu ? "insta_cappu" : "plataforma";
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const ipHash = ip ? createHash("sha256").update(`hs-aplic:${ip}`).digest("hex").slice(0, 32) : null;

  const { data, error } = await admin().rpc("mentoria_registrar_aplicacao", {
    p_origem: tipo,
    p_nome: a.nome,
    p_instagram: a.ig,
    p_whatsapp: a.wpp,
    p_trabalho: a.trabalho,
    p_momento: a.momento,
    p_operacao: a.operacao,
    p_trava: a.trava,
    p_invest: a.invest,
    p_pc: a.pc,
    p_tempo: a.tempo,
    p_maior18: a.maior,
    p_user: user?.id ?? null,
    p_ip: ipHash,
  });
  if (error) {
    console.error("aplicação mentoria:", error.message);
    return resp({ erro: erroDoBanco(error.message) }, 400, origem);
  }

  const linhas: [string, string][] = [
    ["Comentário", ROTULO_ORIGEM[tipo]],
    ["Nome", a.nome],
    ["Instagram", a.ig],
    ["WhatsApp", a.wpp],
    ["Trabalha com", a.trabalho],
    ["Momento", a.momento],
    ["Operação", a.operacao],
    ["Maior trava", a.trava],
    ["Investimento", a.invest],
    ["Computador", a.pc],
    ["Tempo", a.tempo],
  ];
  await enviarEmail({
    para: SITE.supportEmail,
    assunto: `[Mentoria] Nova aplicação · ${a.nome} · ${ROTULO_ORIGEM[tipo]}`,
    chave: `aplicacao-${data}`,
    html: moldura(
      "Nova aplicação para a mentoria",
      `<table style="border-collapse:collapse">${linhas
        .filter(([, x]) => x)
        .map(([k, x]) => `<tr><td style="padding:4px 12px 4px 0;color:#777;vertical-align:top">${esc(k)}</td><td style="padding:4px 0;white-space:pre-wrap">${esc(x)}</td></tr>`)
        .join("")}</table>`,
      { t: "Ver no painel", href: `${SITE_URL}/dashboard/painel/mentoria` },
    ),
  }).catch(() => null);

  return resp({ ok: true, id: data }, 200, origem);
}
