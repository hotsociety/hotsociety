// POST { email, tipo: "senha" | "confirmar", destino? }
// Manda pelo Resend o link de criar nova senha ("Esqueci a senha") ou de confirmar o e-mail do cadastro.
// Antes isso saía pelo e-mail padrão do Supabase, que só entrega para a equipe do projeto: aluno não recebia.
// Sempre responde "ok" (não diz se o e-mail tem conta). Limite: 3 por e-mail e 15 por IP a cada hora.
import { createHmac } from "node:crypto";
import { admin } from "../../../_lib/pagamentos";
import { SITE_URL, enviarEmail, esc, moldura } from "../../../_lib/email";
import { caminhoSeguro } from "../../../_lib/cursos";

const resp = (corpo: object, status = 200) => Response.json(corpo, { status, headers: { "cache-control": "no-store" } });
const hash = (t: string) => createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "hs").update(t).digest("hex").slice(0, 40);

async function pode(chave: string, max: number) {
  // Mesmo contador de tentativas do cupom (15 por hora por chave); para o e-mail, conta 5x para dar 3 por hora.
  const sb = admin();
  for (let i = 0; i < Math.round(15 / max); i++) {
    const { data } = await sb.rpc("hs_cupom_pode_tentar", { p_chave: chave });
    if (data === false) return false;
  }
  return true;
}

export async function POST(req: Request) {
  let corpo: { email?: string; tipo?: string; destino?: string };
  try {
    corpo = await req.json();
  } catch {
    return resp({ ok: false }, 400);
  }
  const email = (corpo.email ?? "").trim().toLowerCase().slice(0, 120);
  const tipo = corpo.tipo === "confirmar" ? "confirmar" : "senha";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return resp({ ok: false, erro: "Digite um e-mail válido." }, 400);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?";
  if (!(await pode(`link-ip:${hash(ip)}`, 15))) return resp({ ok: false, erro: "Muitas tentativas. Espere um pouco e tente de novo." }, 429);
  if (!(await pode(`link-email:${hash(email)}`, 3))) return resp({ ok: true }); // já mandou bastante: não manda de novo, mas não conta

  const base = new URL(SITE_URL).origin;
  const destino = tipo === "senha" ? "/redefinir-senha" : caminhoSeguro(corpo.destino, "/dashboard");
  const { data, error } = await admin().auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: `${base}${destino}` } });
  if (error || !data?.properties?.action_link) return resp({ ok: true }); // e-mail sem conta: resposta igual
  if (tipo === "confirmar" && data.user?.email_confirmed_at && data.user.last_sign_in_at) return resp({ ok: true });

  const link = data.properties.action_link;
  const nome = (data.user?.user_metadata as { full_name?: string } | undefined)?.full_name?.split(" ")[0];
  const ola = `<p>Olá${nome ? ", " + esc(nome) : ""}!</p>`;
  const enviado = await enviarEmail({
    para: email,
    assunto: tipo === "senha" ? "Criar nova senha · HOT SOCIETY" : "Confirme seu e-mail · HOT SOCIETY",
    html:
      tipo === "senha"
        ? moldura(
            "Criar nova senha",
            `${ola}<p>Recebemos um pedido para criar uma nova senha na sua conta. Toque no botão abaixo. O link vale por 1 hora e só funciona uma vez.</p><p style="font-size:13px;color:#666">Não foi você? Pode ignorar este e-mail: sua senha continua a mesma.</p>`,
            { t: "Criar nova senha", href: link },
          )
        : moldura(
            "Confirme seu e-mail",
            `${ola}<p>Falta só confirmar o seu e-mail para liberar a sua conta na HOT SOCIETY. O link vale por 1 hora.</p>`,
            { t: "Confirmar e entrar", href: link },
          ),
  }).catch((e) => {
    console.error("link por e-mail:", (e as Error).message);
    return false;
  });
  if (!enviado) console.error("link por e-mail: Resend não enviou (confira RESEND_API_KEY)");
  return resp({ ok: true });
}
