// POST { linhas, turma, acessoDias, avisar }
// Importa de uma vez quem JÁ é mentorado (fechou a mentoria por fora: Pix, WhatsApp, contrato).
// Para cada e-mail: acha a conta ou cria uma já confirmada, coloca em Mentorados (com a turma),
// libera a entrada na plataforma (sem encurtar acesso que a pessoa já tenha) e manda o e-mail de boas-vindas.
// Só Admin (o mesmo que hs_e_mentor no banco).
import { admin } from "../../../_lib/pagamentos";
import { clienteDoUsuario } from "../../../_lib/email";
import { liberarMentorado, type ResultadoLiberacao } from "../../../_lib/mentorados";

const resp = (corpo: object, status = 200) => Response.json(corpo, { status, headers: { "cache-control": "no-store" } });
const EMAIL = /[^\s<>,;"'()]+@[^\s<>,;"'()]+\.[a-z]{2,}/i;
const MAX = 50;
export const maxDuration = 120;

type Linha = { email: string; nome: string };

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

  const resultados: ResultadoLiberacao[] = [];
  for (const l of linhas) {
    const r = await liberarMentorado(adm, {
      email: l.email,
      nome: l.nome,
      turma,
      acessoDias: mexerAcesso ? dias : "nao",
      avisar,
      quem: eu.user.id,
      origem: "importado no painel",
    });
    delete r.user_id;
    resultados.push(r);
  }
  return resp({ ok: true, resultados });
}
