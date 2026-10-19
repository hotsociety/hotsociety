"use client";
// Chama as rotas /api do próprio site levando o login do aluno.
import { supabase } from "./supabase";

export async function postApi<T = Record<string, unknown>>(caminho: string, corpo: object): Promise<T & { erro?: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { erro: "Sua sessão expirou. Entre de novo." } as T & { erro?: string };
  try {
    const r = await fetch(caminho, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(corpo),
      cache: "no-store",
    });
    const j = (await r.json().catch(() => ({}))) as T & { erro?: string };
    if (!r.ok && !j.erro) j.erro = "Não deu para enviar agora. Tente de novo.";
    return j;
  } catch {
    return { erro: "Sem conexão. Confira a internet e tente de novo." } as T & { erro?: string };
  }
}
