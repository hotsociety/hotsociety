// Lembretes diários por e-mail (a Vercel chama 1x por dia, veja vercel.json).
// Precisa na Vercel: CRON_SECRET (senha longa inventada), SUPABASE_SERVICE_ROLE_KEY e RESEND_API_KEY.
import { connection } from "next/server";
import { admin } from "../../../_lib/pagamentos";
import { SITE_URL, enviarEmail, enviarLote, esc, moldura } from "../../../_lib/email";
import { PRICE } from "../../../_lib/site";

type Linha = { user_id: string; email: string; nome: string | null; tipo: "vence_7d" | "vence_1d" | "venceu" | "pix_expirado"; ref: string; plano: string | null; valido_ate: string | null };

const DATA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });

function texto(l: Linha) {
  const ola = `<p>Olá${l.nome ? ", " + esc(l.nome.split(" ")[0]) : ""}!</p>`;
  const data = l.valido_ate ? DATA.format(new Date(l.valido_ate)) : "";
  const renovar = { t: "Renovar meu acesso", href: `${SITE_URL}/assinar?plano=${l.plano === "anual" ? "anual" : "mensal"}` };
  switch (l.tipo) {
    case "vence_7d":
      return { assunto: "Seu acesso vence em 7 dias", html: moldura("Seu acesso vence em 7 dias", `${ola}<p>Seu passaporte HOT SOCIETY vale até <b>${data}</b>. O Pix não renova sozinho: para continuar sem interrupção, pague um novo plano antes dessa data. O tempo que sobrar é somado.</p>`, renovar) };
    case "vence_1d":
      return { assunto: "Seu acesso vence amanhã", html: moldura("Seu acesso vence amanhã", `${ola}<p>Seu passaporte vale até <b>${data}</b>. Renove hoje para não perder o acesso às aulas, ferramentas e comunidade. Seu progresso fica guardado.</p>`, renovar) };
    case "venceu":
      return { assunto: "Seu acesso venceu", html: moldura("Seu acesso venceu", `${ola}<p>Seu passaporte venceu em <b>${data}</b>. Seu progresso, XP e conquistas continuam guardados: é só renovar para voltar de onde parou.</p>`, renovar) };
    case "pix_expirado":
      return {
        assunto: "Seu Pix expirou: gere outro em 1 minuto",
        html: moldura(
          "Seu Pix expirou",
          `${ola}<p>O código Pix do plano ${l.plano === "anual" ? `anual (R$ ${PRICE.anual})` : `mensal (R$ ${PRICE.mensal})`} venceu antes do pagamento. Se ainda quiser entrar, gere um novo código: leva menos de um minuto.</p><p style="font-size:13px;color:#666">Se você já pagou, ignore este e-mail: o acesso é liberado assim que o banco confirma.</p>`,
          { t: "Gerar novo Pix", href: `${SITE_URL}/assinar?plano=${l.plano === "anual" ? "anual" : "mensal"}` },
        ),
      };
  }
}

// Boas-vindas dos alunos que vieram da Astron (versão 1). Vai aos poucos por causa do limite diário do Resend.
type Novo = { user_id: string; email: string; nome: string | null; valido_ate: string | null };
// Desligado até BOAS_VINDAS_POR_DIA existir na Vercel. No Resend Pro dá para mandar todos de uma vez (lotes de 100).
const BOAS_VINDAS_POR_DIA = Math.min(Number(process.env.BOAS_VINDAS_POR_DIA) || 0, 1000);

// Dá tempo de enviar o lote de boas-vindas sem passar do limite do Resend (2 por segundo).
export const maxDuration = 60;

function boasVindas(n: Novo) {
  const nome = n.nome ? esc(n.nome.split(" ")[0]) : "";
  const ate = n.valido_ate ? DATA.format(new Date(n.valido_ate)) : "";
  const link = `${SITE_URL}/login?esqueci=1&email=${encodeURIComponent(n.email)}`;
  return {
    assunto: "A Hot Academy mudou de casa: crie sua senha e entre",
    html: moldura(
      "Sua nova área de membros chegou",
      `<p>Olá${nome ? ", " + nome : ""}!</p>
<p>A Hot Academy saiu da Astron e agora mora na <b>HOT SOCIETY</b>, nossa plataforma própria: aulas, comunidade com lives, ferramentas, CappuIA, missões e placas de conquista, tudo no mesmo lugar.</p>
<p>Sua conta já está pronta com este e-mail (<b>${esc(n.email)}</b>) e você ganhou <b>30 dias de acesso cortesia</b>${ate ? `, até <b>${ate}</b>` : ""}.</p>
<p><b>Para entrar pela primeira vez:</b> clique no botão abaixo, confirme seu e-mail e você recebe na hora um link para criar sua senha.</p>`,
      { t: "Criar minha senha", href: link },
    ),
  };
}

export async function GET(req: Request) {
  await connection();
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) return new Response("não autorizado", { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.RESEND_API_KEY) {
    return Response.json({ ok: false, motivo: "faltam SUPABASE_SERVICE_ROLE_KEY ou RESEND_API_KEY" }, { status: 503 });
  }

  const sb = admin();
  const { data, error } = await sb.rpc("hs_lembretes_pendentes");
  if (error) {
    console.error("lembretes:", error.message);
    return Response.json({ ok: false }, { status: 500 });
  }
  let enviados = 0;
  for (const l of (data ?? []) as Linha[]) {
    // Pix expirado de item da Hot Store: não manda o e-mail de "gere outro Pix do plano" (só marca como visto).
    if (l.tipo === "pix_expirado" && l.plano === "loja") {
      await sb.from("lembretes_enviados").insert({ user_id: l.user_id, tipo: l.tipo, ref: l.ref });
      continue;
    }
    const m = texto(l);
    const ok = await enviarEmail({ para: l.email, assunto: m.assunto, html: m.html, chave: `lembrete-${l.user_id}-${l.tipo}-${l.ref}` });
    if (!ok) continue;
    await sb.from("lembretes_enviados").insert({ user_id: l.user_id, tipo: l.tipo, ref: l.ref });
    enviados++;
  }
  // Boas-vindas da importação da Astron (no máximo BOAS_VINDAS_POR_DIA por execução).
  let boasVindasEnviadas = 0;
  for (let rodada = 0; BOAS_VINDAS_POR_DIA && boasVindasEnviadas < BOAS_VINDAS_POR_DIA && rodada < 10; rodada++) {
    const { data: novos, error: erroNovos } = await sb.rpc("hs_boas_vindas_pendentes", { p_limite: Math.min(100, BOAS_VINDAS_POR_DIA - boasVindasEnviadas) });
    if (erroNovos) {
      console.error("boas-vindas:", erroNovos.message);
      break;
    }
    const lote = (novos ?? []) as Novo[];
    if (!lote.length) break;
    const ok = await enviarLote(
      lote.map((n) => ({ para: n.email, ...boasVindas(n) })),
      `boas-vindas-${lote.map((n) => n.user_id.slice(0, 8)).join("")}`.slice(0, 250),
    );
    if (!ok) break; // provável limite do plano: tenta de novo no próximo envio
    await sb.from("importacao_astron").update({ boas_vindas_em: new Date().toISOString() }).in("user_id", lote.map((n) => n.user_id));
    boasVindasEnviadas += lote.length;
    await new Promise((r) => setTimeout(r, 600));
  }

  return Response.json({ ok: true, enviados, boasVindasEnviadas });
}
