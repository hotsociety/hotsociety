"use client";

import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../_lib/supabase";

// Membros online: cada aluno com a área de membros aberta entra no canal de presença "hs-online"
// (Supabase Realtime). Contamos pessoas únicas, não abas.
let canal: RealtimeChannel | null = null;
let dono: string | null = null;
let total = 0;
let iniciais: string[] = [];
type Online = { n: number; iniciais: string[] };
const ouvintes = new Set<(o: Online) => void>();

function avisar() {
  for (const f of ouvintes) f({ n: total, iniciais });
}

export function entrarOnline(userId: string, ini = "") {
  if (canal && dono === userId) return;
  if (canal) supabase.removeChannel(canal);
  dono = userId;
  canal = supabase.channel("hs-online", { config: { presence: { key: userId } } });
  canal
    .on("presence", { event: "sync" }, () => {
      const estado = (canal?.presenceState() ?? {}) as Record<string, { ini?: string }[]>;
      total = Object.keys(estado).length;
      iniciais = Object.values(estado)
        .map((v) => (v[0]?.ini ?? "").slice(0, 2).toUpperCase())
        .filter(Boolean);
      avisar();
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") canal?.track({ desde: Date.now(), ini });
    });
}

export function sairOnline() {
  if (canal) supabase.removeChannel(canal);
  canal = null;
  dono = null;
  total = 0;
  iniciais = [];
  avisar();
}

// Quantos estão com a plataforma aberta e as iniciais deles (só as iniciais, sem nome).
export function useOnline(): Online {
  const [o, setO] = useState<Online>({ n: total, iniciais });
  useEffect(() => {
    ouvintes.add(setO);
    setO({ n: total, iniciais });
    return () => {
      ouvintes.delete(setO);
    };
  }, []);
  return o;
}
