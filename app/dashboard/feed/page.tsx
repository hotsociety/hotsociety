"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Canais from "../../_components/membros/Canais";
import ParaVoce from "./ParaVoce";
import { m } from "../../_components/membros/proto";

function Feed() {
  const params = useSearchParams();
  const router = useRouter();
  const [modo, setModo] = useState<"ig" | "ch">(params.get("modo") === "canais" ? "ch" : "ig");

  function trocar(novo: "ig" | "ch") {
    setModo(novo);
    router.replace(novo === "ch" ? "/dashboard/feed?modo=canais" : "/dashboard/feed", { scroll: false });
  }

  return (
    <section className={m("view")} aria-label="Feed">
      <div className={m("top")}>
        <div>
          <h1>Feed</h1>
          <p className={m("sub")}>O chat da Society. Dúvida, resultado e troca de ideia, tudo aqui.</p>
        </div>
        <div className={m("chips")}>
          <span className={m("chip")}>
            <i style={{ color: "var(--ok)" }}>●</i> 214 online
          </span>
        </div>
      </div>
      <div className={m("seg")} role="group" aria-label="Modo do feed" style={{ marginTop: -8, justifySelf: "start" }}>
        <button type="button" aria-pressed={modo === "ig"} onClick={() => trocar("ig")}>
          Para você
        </button>
        <button type="button" aria-pressed={modo === "ch"} onClick={() => trocar("ch")}>
          Canais
        </button>
      </div>
      {modo === "ig" ? <ParaVoce onCanais={() => trocar("ch")} /> : <Canais />}
    </section>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={null}>
      <Feed />
    </Suspense>
  );
}
