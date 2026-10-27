"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../_lib/supabase";

// Passe da marca d'água (nome, e-mail e passaporte do aluno por cima do vídeo).
// undefined = ainda buscando; null = marca desligada ou indisponível.
let cache: { p: Promise<string | null>; vence: number } | null = null;

async function buscar(): Promise<{ token: string | null; vence: number }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { token: null, vence: 0 };
  const r = await fetch("/api/aulas/marca", { method: "POST", headers: { authorization: `Bearer ${session.access_token}` } });
  const j = (await r.json().catch(() => ({}))) as { token?: string | null; vence?: number };
  return { token: r.ok ? (j.token ?? null) : null, vence: j.vence ?? 0 };
}

export function useMarcaDagua() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let vivo = true;
    const agora = Date.now() / 1000;
    let atual = cache;
    if (!atual || atual.vence - 600 < agora) {
      const novo = buscar().catch(() => ({ token: null, vence: 0 }));
      const entrada = { p: novo.then((x) => x.token), vence: agora + 3600 };
      cache = atual = entrada;
      novo.then((x) => {
        if (x.vence) entrada.vence = x.vence;
        if (!x.token && cache === entrada) cache = null; // tenta de novo na próxima tela
      });
    }
    atual.p.then((t) => vivo && setToken(t));
    return () => {
      vivo = false;
    };
  }, []);
  return token;
}
