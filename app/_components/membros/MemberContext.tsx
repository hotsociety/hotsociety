"use client";

import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";

export type Membro = {
  user: User;
  nome: string;
  iniciais: string;
  sair: () => Promise<void>;
};

export const MemberContext = createContext<Membro | null>(null);

// Use dentro de qualquer página em /dashboard para ler o usuário logado.
export function useMembro() {
  const m = useContext(MemberContext);
  if (!m) throw new Error("useMembro precisa estar dentro da área de membros (/dashboard).");
  return m;
}

export function nomeDoUsuario(user: User) {
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
  const bruto = meta?.full_name || meta?.name || user.email?.split("@")[0] || "passageiro";
  const primeiro = bruto.trim().split(/\s+/)[0];
  return primeiro.charAt(0).toUpperCase() + primeiro.slice(1);
}
