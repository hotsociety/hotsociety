// POST: devolve o "passe" da marca d'água do Panda Video para o aluno logado.
// O Panda escreve nome, e-mail e passaporte do aluno por cima do vídeo (DRM via API).
// Precisa na Vercel: PANDA_DRM_GROUP_ID e PANDA_DRM_SECRET (Panda → Segurança → DRM → Integrar via API).
// Sem essas chaves, devolve token null e o vídeo toca sem marca (como antes).
import { createHmac } from "node:crypto";
import { clienteDoUsuario } from "../../../_lib/email";

const resp = (corpo: object, status = 200) => Response.json(corpo, { status, headers: { "cache-control": "no-store" } });
const b64 = (x: string | Buffer) => Buffer.from(x).toString("base64url");

// JWT HS256 assinado com a chave secreta do grupo DRM (mesmo formato do exemplo oficial do Panda).
function assinar(payload: Record<string, unknown>, segredo: string) {
  const cab = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const corpo = b64(JSON.stringify(payload));
  const sig = createHmac("sha256", segredo).update(`${cab}.${corpo}`).digest("base64url");
  return `${cab}.${corpo}.${sig}`;
}

export async function POST(req: Request) {
  const grupo = process.env.PANDA_DRM_GROUP_ID?.trim();
  const segredo = process.env.PANDA_DRM_SECRET?.trim();
  if (!grupo || !segredo) return resp({ token: null });

  const sb = clienteDoUsuario(req);
  if (!sb) return resp({ erro: "Entre na sua conta." }, 401);
  const { data, error } = await sb.rpc("marca_dagua_dados");
  if (error || !data) return resp({ erro: "Sem acesso às aulas." }, 403);

  const d = data as { nome: string; email: string; passaporte: string };
  const agora = Math.floor(Date.now() / 1000);
  const token = assinar(
    { drm_group_id: grupo, string1: d.nome, string2: d.email, string3: d.passaporte, iat: agora, exp: agora + 6 * 3600 },
    segredo,
  );
  return resp({ token, vence: agora + 6 * 3600 });
}
