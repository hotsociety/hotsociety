"use client";

import { Fragment, type ReactNode } from "react";
import { supabase } from "../../_lib/supabase";

export type FalaIA = { de: "eu" | "ia"; t: string };
export type Saldo = { usadas: number; limite: number; ilimitado: boolean };

// Pergunta para a CappuIA (rota /api/cappuia). Devolve o texto ou uma mensagem de erro amigável.
export async function perguntarCappuIA(modo: string, historico: FalaIA[]): Promise<{ texto?: string; erro?: string; restam?: number; desligada?: boolean }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { erro: "Entre na sua conta." };
  try {
    const r = await fetch("/api/cappuia", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ modo, historico }),
    });
    const j = (await r.json().catch(() => ({}))) as { texto?: string; erro?: string; restam?: number; desligada?: boolean };
    if (!r.ok || !j.texto) return { erro: j.erro ?? "Não consegui responder agora. Tenta de novo.", desligada: j.desligada };
    return j;
  } catch {
    return { erro: "Sem conexão. Confira a internet e tente de novo." };
  }
}

export async function saldoCappuIA(): Promise<Saldo | null> {
  const { data, error } = await supabase.rpc("cappuia_saldo");
  return error ? null : (data as Saldo);
}

// Mostra a resposta com listas e **negrito**, sem HTML vindo de fora.
function negrito(linha: string): ReactNode[] {
  return linha.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") && p.length > 4 ? <b key={i}>{p.slice(2, -2)}</b> : <Fragment key={i}>{p.replace(/^#+\s*/, "")}</Fragment>));
}

export function TextoIA({ t }: { t: string }) {
  const blocos: ReactNode[] = [];
  let lista: string[] = [];
  const fecharLista = () => {
    if (!lista.length) return;
    blocos.push(
      <ul key={`l${blocos.length}`} style={{ margin: "4px 0", paddingLeft: 18, display: "grid", gap: 3 }}>
        {lista.map((x, i) => (
          <li key={i}>{negrito(x)}</li>
        ))}
      </ul>,
    );
    lista = [];
  };
  for (const linha of t.split(/\r?\n/)) {
    const item = linha.match(/^\s*[-*•]\s+(.*)$/);
    if (item) {
      lista.push(item[1]);
      continue;
    }
    fecharLista();
    if (linha.trim()) blocos.push(<p key={`p${blocos.length}`} style={{ margin: "4px 0" }}>{negrito(linha)}</p>);
  }
  fecharLista();
  return <>{blocos}</>;
}
