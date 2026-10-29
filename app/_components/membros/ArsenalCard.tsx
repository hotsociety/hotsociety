"use client";

// Card do adicional "Arsenal do Cappu + Networking" no Início: aparece só para quem comprou.
import Image from "next/image";
import { useEffect, useState } from "react";
import { ADICIONAL } from "../../_lib/adicional";
import { supabase } from "../../_lib/supabase";

export default function ArsenalCard() {
  const [convite, setConvite] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) return;
      const r = await fetch("/api/adicionais", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" }).catch(() => null);
      const j = (await r?.json().catch(() => null)) as { arsenal?: string | null } | null;
      if (vivo && j?.arsenal) setConvite(j.arsenal);
    });
    return () => {
      vivo = false;
    };
  }, []);

  if (!convite) return null;
  return (
    <section className="hs-arsenal" aria-labelledby="arsenal-t">
      <Image src={ADICIONAL.img} alt="" width={84} height={84} className="hs-arsenal-img" />
      <div className="hs-arsenal-tx">
        <small>Seu adicional</small>
        <h2 id="arsenal-t">🔓 {ADICIONAL.titulo}</h2>
        <p>Funis, scripts, precificação, checklists e a comunidade de networking ficam no Discord.</p>
      </div>
      <a href={convite} target="_blank" rel="noopener noreferrer" className="hs-arsenal-btn">
        Entrar no Discord
      </a>
    </section>
  );
}

// Botão do Inventário: busca o convite só no clique e abre o Discord.
export function BotaoDiscord() {
  const [abrindo, setAbrindo] = useState(false);
  async function abrir() {
    setAbrindo(true);
    // Abre a aba já no clique (senão o navegador bloqueia como pop-up) e só depois põe o convite.
    const janela = window.open("about:blank", "_blank");
    if (janela) janela.opener = null;
    try {
      const { data } = await supabase.auth.getSession();
      const r = await fetch("/api/adicionais", { headers: { authorization: `Bearer ${data.session?.access_token ?? ""}` }, cache: "no-store" });
      const j = (await r.json().catch(() => null)) as { arsenal?: string | null } | null;
      if (j?.arsenal) {
        if (janela) janela.location.href = j.arsenal;
        else window.location.href = j.arsenal;
      } else janela?.close();
    } catch {
      janela?.close();
    } finally {
      setAbrindo(false);
    }
  }
  return (
    <button type="button" className="hs-arsenal-btn" onClick={abrir} disabled={abrindo}>
      {abrindo ? "Abrindo…" : "Entrar no Discord"}
    </button>
  );
}
