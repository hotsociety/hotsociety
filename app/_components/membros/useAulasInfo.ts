"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../_lib/supabase";
import type { AulaInfo } from "../../_lib/video";

// Vídeo, duração e material das aulas (só para quem tem acesso). Busca uma vez por visita.
let cache: Promise<Map<string, AulaInfo>> | null = null;

export function recarregarAulasInfo() {
  cache = null;
}

export function useAulasInfo() {
  const [info, setInfo] = useState<Map<string, AulaInfo> | null>(null);
  useEffect(() => {
    let vivo = true;
    cache ??= Promise.resolve(supabase.rpc("aulas_info")).then(({ data, error }) => {
      if (error) {
        cache = null;
        return new Map<string, AulaInfo>();
      }
      return new Map(((data ?? []) as AulaInfo[]).map((a) => [a.aula_id, a]));
    });
    cache.then((m) => vivo && setInfo(m));
    return () => {
      vivo = false;
    };
  }, []);
  return info;
}
