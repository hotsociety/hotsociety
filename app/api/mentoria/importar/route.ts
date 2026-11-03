// POST { linhas, turma, acessoDias, avisar }
// Importa de uma vez quem JÁ é mentorado (fechou a mentoria por fora: Pix, WhatsApp, contrato).
// Para cada e-mail: acha a conta ou cria uma já confirmada, coloca em Mentorados (com a turma),
// libera a entrada na plataforma (sem encurtar acesso que a pessoa já tenha) e manda o e-mail de boas-vindas.
// Só Admin (o mesmo que hs_e_mentor no banco).
import { admin } from "../../../_lib/pagamentos";
import { SITE_URL, clienteDoUsuario, enviarEmail, esc, moldura } from "../../../_lib/email";

const resp = (corpo: object, status = 200) => Response.json(corpo, { status, headers: { "cache-control": "no-store" } });
const EMAIL = /[^\s<>,;"'()]+@[^\s<>,;"'()]+\.[a-z]{2,}/i;
const MAX = 50;
export const maxDuration = 120;

type Linha = { email: string; nome: string };
type Resultado = { email: string; status: "liberado" | "conta_criada" | "erro"; detalhe?: string };

function lerLinhas(texto: string): Linha[] {
  const vistos = new Set<string>();
  const out: Linha[] = [];
  for (const bruta of texto.split(/\r?\n/)) {
    const m = bruta.match(EMAIL);
    if (!m) continue;
    const email = m[0].toLowerCase().replace(/[.]+$/, "");
    if (vistos.has(email)) continue;
    vistos.add(email);
    const nome = bruta
      .replace(m[0], " ")
      .replace(/[<>,;|\t"]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    out.push({ email, nome });
  }
  return out;
}

export async function POST(req: Request) {
  const sb = clienteDoUsuario(req);
  if (!sb) return resp({ erro: "Entre na sua conta." }, 401);
  const { data: eu } = await sb.auth.getUser();
  if (!eu?.user) return resp({ erro: "Entre na sua conta." }, 401);

  const adm = admin();
  const { data: perfil } = await adm.from("perfis").select("cargo").eq("id", eu.user.id).maybeSingle();
  if (perfil?.cargo !== "admin") return resp({ erro: "Só o Admin importa mentorados." }, 403);

  const corpo = (await req.json().catch(() => ({}))) as { linhas?: string; turma?: string | null; acessoDias?: number | null | "nao"; avisar?: boolean };
  const linhas = lerLinhas(String(corpo.linhas ?? "").slice(0, 20000));
  if (!linhas.length) return resp({ erro: "Cole pelo menos um e-mail." }, 400);
  if (linhas.length > MAX) return resp({ erro: `No máximo ${MAX} por vez. Divida a lista.` }, 400);

  const turma = corpo.turma && /^[0-9a-f-]{36}$/i.test(corpo.turma) ? corpo.turma : null;
  if (turma) {
    const { data: t } = await adm.from("mentoria_turmas").select("id").eq("id", turma).maybeSingle();
    if (!t) return resp({ erro: "Turma não encontrada." }, 400);
  }
  const mexerAcesso = corpo.acessoDias !== "nao";
  const dias = typeof corpo.acessoDias === "number" && corpo.acessoDias > 0 ? Math.min(Math.round(corpo.acessoDias), 3650) : null;
  const avisar = corpo.avisar !== false;
  const base = new URL(SITE_URL).origin;

  const resultados: Resultado[] = [];
  for (const l of linhas) {
    try {
      // 1) Conta: cria já confirmada; se o e-mail já tem conta, usa a existente.
      let nova = false;
      const criada = await adm.auth.admin.createUser({
        email: l.email,
        email_confirm: true,
        user_metadata: l.nome ? { full_name: l.nome } : undefined,
      });
      if (!criada.error && criada.data.user) nova = true;
      else if (criada.error && !/already|registered|exists/i.test(criada.error.message)) throw new Error("não deu para criar a conta");

      // O link de entrada também devolve a conta (serve para achar o id de quem já existe).
      const link = await adm.auth.admin.generateLink({ type: "recovery", email: l.email, options: { redirectTo: `${base}/redefinir-senha` } });
      const user = link.data?.user;
      if (!user) throw new Error("conta não encontrada");
      const nuncaEntrou = nova || !user.last_sign_in_at;

      // 2) Mentorado (ativo, na turma escolhida).
      const { error: em } = await adm
        .from("mentorados")
        .upsert({ user_id: user.id, turma_id: turma, ativo: true }, { onConflict: "user_id" });
      if (em) throw new Error("não deu para salvar o mentorado");

      // 3) Entrada na plataforma, sem encurtar quem já tem acesso maior.
      let semEquipe = true;
      if (mexerAcesso) {
        const [{ data: p }, { data: a }] = await Promise.all([
          adm.from("perfis").select("cargo").eq("id", user.id).maybeSingle(),
          adm.from("acessos").select("status, valido_ate").eq("user_id", user.id).maybeSingle(),
        ]);
        semEquipe = !p?.cargo;
        const ate = dias ? new Date(Date.now() + dias * 864e5) : null;
        const atual = a && a.status === "ativo" ? (a.valido_ate ? new Date(a.valido_ate) : "sempre") : null;
        const jaCobre = atual === "sempre" || (atual instanceof Date && ate !== null && atual >= ate);
        if (semEquipe && !jaCobre) {
          const { error: ea } = await adm.from("acessos").upsert(
            {
              user_id: user.id,
              status: "ativo",
              origem: "manual",
              plano: "mentoria",
              valido_ate: ate?.toISOString() ?? null,
              motivo: "Mentorado (importado no painel)",
              atualizado_por: eu.user.id,
              atualizado_em: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
          if (ea) throw new Error("mentorado salvo, mas o acesso à plataforma falhou");
        }
      }

      await adm.from("auditoria").insert({
        quem: eu.user.id,
        acao: "importar_mentorado",
        alvo: l.email,
        detalhes: { turma, conta_nova: nova, acesso_dias: mexerAcesso ? dias : "nao" },
      });

      // 4) E-mail: quem nunca entrou recebe o link para criar a senha; quem já usa a plataforma, só o aviso.
      let detalhe = "";
      if (avisar) {
        const primeiro = (l.nome || (user.user_metadata as { full_name?: string })?.full_name || "").split(" ")[0];
        const ola = `<p>Olá${primeiro ? ", " + esc(primeiro) : ""}!</p>`;
        const enviado = await enviarEmail({
          para: l.email,
          assunto: "Sua Mentoria está liberada · HOT SOCIETY",
          html: nuncaEntrou && link.data?.properties?.action_link
            ? moldura(
                "Sua Mentoria está liberada",
                `${ola}<p>Você já faz parte da Mentoria HOT SOCIETY e agora tem a sua área na plataforma: encontros ao vivo, gravações, chat da turma e conversa direta com o mentor.</p><p>Toque no botão para criar a sua senha e entrar. O link vale por 1 hora; depois disso, use "Esqueci a senha" no login com este e-mail.</p><p>Na plataforma, abra <b>Minha Mentoria</b> no menu.</p>`,
                { t: "Criar senha e entrar", href: link.data.properties.action_link },
              )
            : moldura(
                "Sua Mentoria está liberada",
                `${ola}<p>A área <b>Minha Mentoria</b> já está liberada na sua conta: encontros ao vivo, gravações, chat da turma e conversa direta com o mentor.</p><p>Entre com o seu e-mail e senha de sempre.</p>`,
                { t: "Abrir Minha Mentoria", href: `${base}/dashboard/mentoria` },
              ),
        });
        if (!enviado) detalhe = "e-mail não saiu";
      }
      if (!semEquipe) detalhe = [detalhe, "é da equipe (acesso pelo cargo)"].filter(Boolean).join(" · ");
      resultados.push({ email: l.email, status: nova ? "conta_criada" : "liberado", detalhe: detalhe || undefined });
    } catch (e) {
      resultados.push({ email: l.email, status: "erro", detalhe: e instanceof Error ? e.message : "falhou" });
    }
  }
  return resp({ ok: true, resultados });
}
