// POST { modo, historico: [{ de: "eu" | "ia", t }] }: resposta da CappuIA com IA de verdade (Google Gemini).
// Cada pergunta gasta 1 do limite do mês (100 por aluno; a equipe não tem limite). Se a IA falhar, a pergunta volta.
// Precisa na Vercel: GEMINI_API_KEY (aistudio.google.com → Get API key). Opcional: CAPPUIA_MODELO.
import { clienteDoUsuario } from "../../_lib/email";
import { MODULOS } from "../../_lib/demo";

export const maxDuration = 30;

const resp = (corpo: object, status = 200) => Response.json(corpo, { status, headers: { "cache-control": "no-store" } });

const MODOS: Record<string, string> = {
  tutor: "Modo TUTOR: tire a dúvida do aluno sobre o conteúdo do curso e diga em qual módulo e aula está o assunto.",
  persona: "Modo PERSONA: ajude a criar ou refinar a persona de uma modelo (de IA ou real com contrato): nicho, nome, bio, estilo, rotina de conteúdo.",
  legendas: "Modo LEGENDAS: escreva legendas e chamadas prontas para postar (Instagram, X, Telegram, prévias). Sugestivas e criativas, nunca explícitas.",
  scripts: "Modo SCRIPTS: escreva roteiros de conversa (X1, chat de assinante, objeções, recuperação, upsell) que convertem com respeito.",
};

// Grade do curso (título dos módulos e aulas) para a IA apontar a aula certa.
const GRADE = MODULOS.map((m) => `Módulo ${m.n} · ${m.t.split(" · ")[0]}: ${m.aulas.map((a, i) => `${i + 1}) ${a.t}`).join("; ")}`).join("\n");

function sistema(modo: string, nome: string) {
  return `Você é a CappuIA, assistente da Hot Academy (HOT SOCIETY), treinada no método do Cappu.
A Hot Academy ensina a montar e escalar uma operação no mercado de criadoras de conteúdo adulto (Privacy, OnlyFans, Telegram, X1/chat, modelos de IA, modelos reais "white", tráfego pago, funis Shark e Apex, agência OFM, mercado gringo).
Você está falando com ${nome || "um aluno"}.

${MODOS[modo] ?? MODOS.tutor}

Como responder:
- Português do Brasil, simples, direto e prático, no tom do Cappu (confiante, sem enrolação). Frases curtas.
- Respostas curtas: no máximo uns 8 itens ou 180 palavras, a não ser que peçam algo maior (ex.: lista de legendas).
- Use listas com "- " quando ajudar. Pode usar **negrito** para destacar. Nada de títulos com #.
- Quando o assunto estiver no curso, termine com "Aula de referência: Módulo X · Aula Y (nome)" usando a grade abaixo. Não invente aula que não existe.
- Se não souber ou não estiver no curso, diga isso e sugira perguntar na Comunidade ou no Suporte.

Regras que você nunca quebra:
- Só maiores de 18 anos. Recuse qualquer coisa que envolva menor de idade ou aparência infantil.
- Nada de conteúdo sexual explícito: legendas e scripts são sugestivos, nunca pornográficos.
- Modelo real só com contrato e consentimento por escrito. Nunca usar rosto, nome ou fotos de pessoa real sem autorização (nada de deepfake).
- Respeite as regras das plataformas e a lei. Não ensine golpe, fraude, invasão de conta, burlar pagamento ou enganar cliente.
- Não prometa ganhos. Resultados dependem da execução.
- Não peça nem guarde dados pessoais (CPF, senha, cartão). Problema de acesso, pagamento ou reembolso: mande abrir chamado em Suporte.

Grade do curso:
${GRADE}`;
}

type Fala = { de: "eu" | "ia"; t: string };

export async function POST(req: Request) {
  const chave = process.env.GEMINI_API_KEY?.trim();
  if (!chave) return resp({ erro: "A CappuIA ainda está sendo ligada. Volte em breve.", desligada: true }, 503);

  const sb = clienteDoUsuario(req);
  if (!sb) return resp({ erro: "Entre na sua conta." }, 401);

  const corpo = (await req.json().catch(() => ({}))) as { modo?: string; historico?: Fala[] };
  const modo = typeof corpo.modo === "string" && corpo.modo in MODOS ? corpo.modo : "tutor";
  const historico = (Array.isArray(corpo.historico) ? corpo.historico : [])
    .filter((f) => f && (f.de === "eu" || f.de === "ia") && typeof f.t === "string" && f.t.trim())
    .slice(-10)
    .map((f) => ({ de: f.de, t: f.t.slice(0, f.de === "eu" ? 1500 : 3000) }));
  if (!historico.length || historico[historico.length - 1].de !== "eu") return resp({ erro: "Escreva a pergunta." }, 400);

  // Gasta 1 pergunta (o banco confere acesso, limite do mês e intervalo mínimo).
  const gasto = await sb.rpc("cappuia_consumir");
  if (gasto.error) {
    const m = gasto.error.message;
    if (/limite/.test(m)) return resp({ erro: "Você usou as 100 perguntas deste mês. Elas voltam no dia 1º.", limite: true }, 429);
    if (/devagar/.test(m)) return resp({ erro: "Calma: espere uns segundos entre as perguntas." }, 429);
    return resp({ erro: "Sua assinatura precisa estar ativa para usar a CappuIA." }, 403);
  }
  const restam = gasto.data as number;

  const { data: dados } = await sb.rpc("marca_dagua_dados");
  const nome = ((dados as { nome?: string } | null)?.nome ?? "").split(" ")[0];

  // A conversa precisa começar pelo aluno.
  while (historico.length && historico[0].de !== "eu") historico.shift();

  const modelo = process.env.CAPPUIA_MODELO?.trim() || "gemini-flash-latest";
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": chave },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sistema(modo, nome) }] },
        contents: historico.map((f) => ({ role: f.de === "eu" ? "user" : "model", parts: [{ text: f.t }] })),
        generationConfig: { temperature: modo === "tutor" ? 0.5 : 0.85, maxOutputTokens: 1200 },
      }),
      signal: AbortSignal.timeout(25000),
    });
    const j = (await r.json().catch(() => ({}))) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      promptFeedback?: { blockReason?: string };
      error?: { message?: string; status?: string };
    };
    const texto = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    if (!r.ok || !texto) {
      await sb.rpc("cappuia_devolver");
      const bloqueio = j.promptFeedback?.blockReason || j.candidates?.[0]?.finishReason === "SAFETY";
      if (!r.ok) console.error("cappuia:", r.status, j.error?.status, (j.error?.message ?? "").slice(0, 200));
      return resp(
        {
          erro: bloqueio
            ? "Essa eu não posso responder. Reformula focando na estratégia (sem conteúdo explícito) que eu te ajudo."
            : r.status === 429
              ? "Muita gente perguntando agora. Tenta de novo em 1 minuto (essa pergunta não contou)."
              : "Não consegui responder agora. Tenta de novo (essa pergunta não contou).",
        },
        502,
      );
    }
    return resp({ texto, restam });
  } catch (e) {
    await sb.rpc("cappuia_devolver");
    console.error("cappuia falhou:", e instanceof Error ? e.message : e);
    return resp({ erro: "A CappuIA demorou demais. Tenta de novo (essa pergunta não contou)." }, 504);
  }
}
