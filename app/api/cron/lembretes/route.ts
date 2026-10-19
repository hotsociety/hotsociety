// Lembretes diários por e-mail (a Vercel chama 1x por dia, veja vercel.json).
// Precisa na Vercel: CRON_SECRET (senha longa inventada), SUPABASE_SERVICE_ROLE_KEY e RESEND_API_KEY.
import { connection } from "next/server";
import { admin } from "../../../_lib/pagamentos";
import { SITE_URL, enviarEmail, esc, moldura } from "../../../_lib/email";
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
    const m = texto(l);
    const ok = await enviarEmail({ para: l.email, assunto: m.assunto, html: m.html, chave: `lembrete-${l.user_id}-${l.tipo}-${l.ref}` });
    if (!ok) continue;
    await sb.from("lembretes_enviados").insert({ user_id: l.user_id, tipo: l.tipo, ref: l.ref });
    enviados++;
  }
  return Response.json({ ok: true, enviados });
}
