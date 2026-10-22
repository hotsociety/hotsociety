// POST { encontro }: libera a entrada na sala de vídeo da mentoria (Daily).
// O banco confere se a pessoa pode entrar e se a sala está aberta; aqui só criamos a sala privada
// e um passe de entrada pessoal, que vence sozinho. Precisa de DAILY_API_KEY na Vercel.
import { clienteDoUsuario } from "../../../_lib/email";

const DAILY = "https://api.daily.co/v1";
const resp = (corpo: object, status = 200) => Response.json(corpo, { status, headers: { "cache-control": "no-store" } });

type Sala = { sala: string; titulo: string; inicio: string; fim: string; mentor: boolean; nome: string };

async function daily(caminho: string, chave: string, body?: object) {
  const r = await fetch(`${DAILY}${caminho}`, {
    method: body ? "POST" : "GET",
    headers: { authorization: `Bearer ${chave}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: r.ok, status: r.status, j };
}

export async function POST(req: Request) {
  const chave = process.env.DAILY_API_KEY?.trim();
  if (!chave) return resp({ erro: "A sala de vídeo ainda não foi configurada. Avise a equipe." }, 503);

  const sb = clienteDoUsuario(req);
  if (!sb) return resp({ erro: "Entre na sua conta." }, 401);
  const { encontro } = (await req.json().catch(() => ({}))) as { encontro?: string };
  if (!encontro || !/^[0-9a-f-]{36}$/i.test(encontro)) return resp({ erro: "Encontro inválido." }, 400);

  const { data, error } = await sb.rpc("mentoria_sala", { p_encontro: encontro });
  if (error) {
    const msg = /fechada/.test(error.message)
      ? "A sala abre 15 minutos antes do horário."
      : /encerrado/.test(error.message)
        ? "Este encontro já terminou."
        : /acesso|login/.test(error.message)
          ? "Você não tem acesso a este encontro."
          : "Não deu para abrir a sala. Tente de novo.";
    return resp({ erro: msg }, 403);
  }
  const s = data as Sala;
  const fim = Math.floor(new Date(s.fim).getTime() / 1000);
  const agora = Math.floor(Date.now() / 1000);

  // Sala privada: só entra quem tem passe. Some sozinha 2 h depois do fim.
  let sala = await daily("/rooms", chave, {
    name: s.sala,
    privacy: "private",
    properties: { exp: fim + 7200, max_participants: 20, enable_chat: true, enable_screenshare: true, enable_prejoin_ui: true },
  });
  if (!sala.ok) sala = await daily(`/rooms/${s.sala}`, chave); // já existia
  const url = typeof sala.j.url === "string" ? sala.j.url : null;
  if (!url) {
    console.error("daily sala:", sala.status, JSON.stringify(sala.j).slice(0, 300));
    return resp({ erro: "Não deu para abrir a sala agora. Tente de novo em instantes." }, 502);
  }

  const passe = await daily("/meeting-tokens", chave, {
    properties: {
      room_name: s.sala,
      user_name: s.mentor ? `${s.nome} · Mentor` : s.nome,
      is_owner: s.mentor,
      exp: Math.max(fim + 3600, agora + 3600),
      eject_at_token_exp: true,
    },
  });
  const token = typeof passe.j.token === "string" ? passe.j.token : null;
  if (!token) {
    console.error("daily passe:", passe.status, JSON.stringify(passe.j).slice(0, 300));
    return resp({ erro: "Não deu para gerar sua entrada. Tente de novo." }, 502);
  }
  return resp({ url: `${url}?t=${encodeURIComponent(token)}`, titulo: s.titulo, fim: s.fim });
}
