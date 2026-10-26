// SÓ SERVIDOR. E-mails transacionais pelo Resend.
// Se RESEND_API_KEY não estiver na Vercel, nada é enviado (o resto do site segue normal).
import { createClient } from "@supabase/supabase-js";

export const SITE_URL = (process.env.SITE_URL || "https://hotsociety.com.br").replace(/\/$/, "");

export const esc = (t: string) => t.replace(/[&<>"']/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[x]!);

// Moldura padrão dos e-mails (texto já escapado vai em `corpo`).
export function moldura(titulo: string, corpo: string, botao?: { t: string; href: string }) {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#141416;line-height:1.5">
  <p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;color:#9a7b2f;font-weight:bold">HOT SOCIETY</p>
  <h2 style="margin:0 0 14px">${titulo}</h2>
  ${corpo}
  ${botao ? `<p style="margin:20px 0"><a href="${botao.href}" style="display:inline-block;background:#C9A24E;color:#141416;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">${botao.t}</a></p>` : ""}
  <p style="font-size:12px;color:#666;margin-top:24px">Você recebeu este e-mail porque tem uma conta em hotsociety.com.br.</p>
</div>`;
}

export async function enviarEmail(m: { para: string | string[]; assunto: string; html: string; chave?: string; responderPara?: string }) {
  const api = process.env.RESEND_API_KEY;
  if (!api) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${api}`,
      "content-type": "application/json",
      ...(m.chave ? { "Idempotency-Key": m.chave.slice(0, 250) } : {}),
    },
    body: JSON.stringify({
      from: process.env.EMAIL_REMETENTE || "HOT SOCIETY <nao-responda@hotsociety.com.br>",
      to: Array.isArray(m.para) ? m.para : [m.para],
      subject: m.assunto,
      html: m.html,
      ...(m.responderPara ? { reply_to: m.responderPara } : {}),
    }),
    signal: AbortSignal.timeout(8000),
  }).catch((e) => {
    console.error("e-mail:", (e as Error).message);
    return null;
  });
  if (r && !r.ok) console.error("e-mail:", r.status, await r.text().catch(() => ""));
  return !!r?.ok;
}

// Até 100 e-mails numa chamada só (API de lote do Resend). Conta como 1 requisição no limite por segundo.
export async function enviarLote(msgs: { para: string; assunto: string; html: string }[], chave?: string) {
  const api = process.env.RESEND_API_KEY;
  if (!api || !msgs.length) return false;
  const r = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      authorization: `Bearer ${api}`,
      "content-type": "application/json",
      ...(chave ? { "Idempotency-Key": chave.slice(0, 250) } : {}),
    },
    body: JSON.stringify(
      msgs.slice(0, 100).map((m) => ({
        from: process.env.EMAIL_REMETENTE || "HOT SOCIETY <nao-responda@hotsociety.com.br>",
        to: [m.para],
        subject: m.assunto,
        html: m.html,
      })),
    ),
    signal: AbortSignal.timeout(20000),
  }).catch((e) => {
    console.error("e-mail lote:", (e as Error).message);
    return null;
  });
  if (r && !r.ok) console.error("e-mail lote:", r.status, await r.text().catch(() => ""));
  return !!r?.ok;
}

// Cliente do Supabase "como o usuário": as regras do banco valem igual ao navegador.
export function clienteDoUsuario(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
