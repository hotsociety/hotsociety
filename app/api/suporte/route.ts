// Chamados de suporte. Grava pelo banco (com as regras do próprio usuário) e avisa por e-mail.
// POST { acao: "abrir", tema, assunto, texto }  → aluno abre chamado, recebe protocolo
// POST { acao: "responder", id, texto }         → aluno ou equipe responde
import { SITE } from "../../_lib/site";
import { SITE_URL, clienteDoUsuario, enviarEmail, esc, moldura } from "../../_lib/email";

const resp = (corpo: object, status = 200) => Response.json(corpo, { status, headers: { "cache-control": "no-store" } });

function erroDoBanco(m: string) {
  if (/limite/.test(m)) return "Você atingiu o limite de mensagens por hoje. Tente amanhã ou escreva para " + SITE.supportEmail + ".";
  if (/assunto|conte o que|escreva/.test(m)) return "Preencha o assunto e conte o que aconteceu.";
  if (/não encontrado/.test(m)) return "Chamado não encontrado.";
  if (/sem login|JWT/i.test(m)) return "Sua sessão expirou. Entre de novo.";
  return "Não deu para enviar agora. Tente de novo.";
}

export async function POST(req: Request) {
  const sb = clienteDoUsuario(req);
  if (!sb) return resp({ erro: "Entre na sua conta." }, 401);

  let c: { acao?: string; tema?: string; assunto?: string; texto?: string; id?: string };
  try {
    c = await req.json();
  } catch {
    return resp({ erro: "Pedido inválido." }, 400);
  }
  const texto = String(c.texto ?? "").slice(0, 4000);

  if (c.acao === "abrir") {
    const { data, error } = await sb.rpc("abrir_chamado", {
      p_tema: String(c.tema ?? "").slice(0, 60),
      p_assunto: String(c.assunto ?? "").slice(0, 120),
      p_texto: texto,
    });
    if (error) return resp({ erro: erroDoBanco(error.message) }, 400);
    const r = data as { id: string; protocolo: string; email: string; assunto: string; tema: string };
    await Promise.all([
      enviarEmail({
        para: r.email,
        assunto: `Recebemos seu chamado · ${r.protocolo}`,
        chave: `chamado-${r.id}`,
        html: moldura(
          "Chamado recebido",
          `<p>Seu protocolo é <b>${esc(r.protocolo)}</b>.</p><p><b>Assunto:</b> ${esc(r.assunto)}</p><p>Respondemos em até 5 dias, normalmente bem antes. A resposta aparece em Suporte e também chega neste e-mail.</p>`,
          { t: "Ver meu chamado", href: `${SITE_URL}/dashboard/suporte` },
        ),
      }),
      enviarEmail({
        para: SITE.supportEmail,
        assunto: `[Novo chamado] ${r.tema} · ${r.assunto}`,
        chave: `chamado-equipe-${r.id}`,
        responderPara: r.email,
        html: moldura(
          `Novo chamado ${esc(r.protocolo)}`,
          `<p><b>De:</b> ${esc(r.email)}<br><b>Tema:</b> ${esc(r.tema)}</p><p style="white-space:pre-wrap;background:#f4f2ec;padding:12px;border-radius:8px">${esc(texto)}</p>`,
          { t: "Responder no painel", href: `${SITE_URL}/dashboard/painel/chamados` },
        ),
      }),
    ]);
    return resp({ id: r.id, protocolo: r.protocolo });
  }

  if (c.acao === "responder") {
    if (!c.id || !/^[0-9a-f-]{36}$/i.test(c.id)) return resp({ erro: "Chamado inválido." }, 400);
    const { data, error } = await sb.rpc("responder_chamado", { p_id: c.id, p_texto: texto });
    if (error) return resp({ erro: erroDoBanco(error.message) }, 400);
    const r = data as { protocolo: string; email: string; assunto: string; equipe: boolean };
    if (r.equipe) {
      await enviarEmail({
        para: r.email,
        assunto: `Resposta do suporte · ${r.protocolo}`,
        html: moldura(
          "Seu chamado foi respondido",
          `<p><b>Protocolo:</b> ${esc(r.protocolo)}<br><b>Assunto:</b> ${esc(r.assunto)}</p><p style="white-space:pre-wrap;background:#f4f2ec;padding:12px;border-radius:8px">${esc(texto)}</p>`,
          { t: "Abrir o chamado", href: `${SITE_URL}/dashboard/suporte` },
        ),
      });
    }
    return resp({ ok: true });
  }

  return resp({ erro: "Ação inválida." }, 400);
}
