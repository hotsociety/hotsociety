"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { m } from "../../../../_components/membros/proto";
import { supabase } from "../../../../_lib/supabase";

// Sala de vídeo da mentoria (Daily) dentro da plataforma. O passe de entrada é pessoal e vence sozinho.
export default function SalaMentoria() {
  const { id } = useParams<{ id: string }>();
  const [url, setUrl] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    let vivo = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return vivo && setErro("Entre na sua conta.");
      const r = await fetch("/api/mentoria/sala", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ encontro: id }),
      });
      const j = (await r.json().catch(() => ({}))) as { url?: string; titulo?: string; erro?: string };
      if (!vivo) return;
      if (!r.ok || !j.url) return setErro(j.erro || "Não deu para abrir a sala.");
      setTitulo(j.titulo ?? "");
      setUrl(j.url);
    })();
    return () => {
      vivo = false;
    };
  }, [id]);

  return (
    <section className={m("view")} aria-label="Sala da mentoria" style={{ gap: 12 }}>
      <div className={m("split")}>
        <div>
          <p className={m("eb")} style={{ color: "var(--ambar)", margin: 0 }}>
            Mentoria High Ticket · ao vivo
          </p>
          <h1 style={{ margin: "4px 0 0", font: "800 22px/1.2 var(--f-d)" }}>{titulo || "Sala da mentoria"}</h1>
        </div>
        <Link href="/dashboard/mentoria" className={m("btn btn-s")}>
          Sair da sala
        </Link>
      </div>

      {erro ? (
        <div className={m("card")}>
          <p style={{ margin: 0 }}>{erro}</p>
        </div>
      ) : !url ? (
        <div className={m("card")}>
          <p className={m("sub")} style={{ margin: 0 }}>
            Preparando a sala…
          </p>
        </div>
      ) : (
        <iframe
          src={url}
          title="Sala de vídeo da mentoria"
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          style={{ width: "100%", height: "calc(100dvh - 190px)", minHeight: 480, border: "1px solid var(--line)", borderRadius: 14, background: "#000" }}
        />
      )}
      <p className={m("sub")} style={{ margin: 0, fontSize: 12.5 }}>
        Na primeira vez, o navegador pede permissão para câmera e microfone. Se não aparecer imagem, confira o cadeado ao lado do endereço do site.
      </p>
    </section>
  );
}
