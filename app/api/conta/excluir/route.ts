// Exclusão da conta pelo próprio aluno (LGPD art. 18, VI).
// Apaga login, perfil, progresso, chamados, pedidos de placa e comprovantes.
// Vendas ficam guardadas sem vínculo com a conta (obrigação fiscal, art. 16, I).
import { admin, usuarioDoPedido } from "../../../_lib/pagamentos";
import { enviarEmail, moldura } from "../../../_lib/email";
import { SITE } from "../../../_lib/site";

const resp = (corpo: object, status = 200) => Response.json(corpo, { status, headers: { "cache-control": "no-store" } });

export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return resp({ erro: `A exclusão automática ainda não está ligada. Peça por e-mail: ${SITE.privacidadeEmail}` }, 503);
  }
  const user = await usuarioDoPedido(req);
  if (!user) return resp({ erro: "Sua sessão expirou. Entre de novo." }, 401);

  const corpo = (await req.json().catch(() => ({}))) as { confirmacao?: string };
  if (corpo.confirmacao?.trim().toUpperCase() !== "EXCLUIR") return resp({ erro: "Digite EXCLUIR para confirmar." }, 400);

  const sb = admin();
  const { data, error } = await sb.rpc("hs_preparar_exclusao", { p_user: user.id });
  if (error) {
    if (/equipe/.test(error.message)) return resp({ erro: "Conta da equipe não pode ser excluída por aqui. Peça a um Admin para tirar seu cargo antes." }, 400);
    console.error("excluir conta:", error.message);
    return resp({ erro: "Não deu para excluir agora. Tente de novo." }, 500);
  }

  // Arquivos de comprovantes da pasta do aluno.
  const pasta = sb.storage.from("comprovantes");
  const { data: arquivos } = await pasta.list(user.id, { limit: 1000 });
  if (arquivos?.length) await pasta.remove(arquivos.map((a) => `${user.id}/${a.name}`));

  const { error: e2 } = await sb.auth.admin.deleteUser(user.id);
  if (e2) {
    console.error("excluir conta (auth):", e2.message);
    return resp({ erro: "Não deu para excluir agora. Tente de novo." }, 500);
  }

  await enviarEmail({
    para: (data as { email: string }).email,
    assunto: "Sua conta HOT SOCIETY foi excluída",
    chave: `exclusao-${user.id}`,
    html: moldura(
      "Conta excluída",
      `<p>Seu login, perfil, progresso, chamados e comprovantes foram apagados.</p><p>Os registros de compra ficam guardados pelo prazo da lei fiscal, sem ligação com uma conta ativa.</p><p>Se não foi você, responda para ${SITE.privacidadeEmail}.</p>`,
    ),
  });
  return resp({ ok: true });
}
