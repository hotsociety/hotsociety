"use client";

import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../_lib/supabase";

// Membros online: cada aluno com a área de membros aberta entra no canal de presença "hs-online"
// (Supabase Realtime). Contamos pessoas únicas, não abas.
let canal: RealtimeChannel | null = null;
let dono: string | null = null;
let total = 0;
const ouvintes = new Set<(n: number) => void>();

function avisar() {
  for (const f of ouvintes) f(total);
}

export function entrarOnline(userId: string) {
  if (canal && dono === userId) return;
  if (canal) supabase.removeChannel(canal);
  dono = userId;
  canal = supabase.channel("hs-online", { config: { presence: { key: userId } } });
  canal
    .on("presence", { event: "sync" }, () => {
      total = Object.keys(canal?.presenceState() ?? {}).length;
      avisar();
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") canal?.track({ desde: Date.now() });
    });
}

export function sairOnline() {
  if (canal) supabase.removeChannel(canal);
  canal = null;
  dono = null;
  total = 0;
  avisar();
}

export function useOnline() {
  const [n, setN] = useState(total);
  useEffect(() => {
    ouvintes.add(setN);
    setN(total);
    return () => {
      ouvintes.delete(setN);
    };
  }, []);
  return n;
}
