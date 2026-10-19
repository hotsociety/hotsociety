"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../_lib/supabase";
import Icon from "./Icon";
import "./ui.css";
import ui from "./ui.styles";

type Live = { id: string; titulo: string; descricao: string | null; inicio: string; link: string | null };

const DIA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit" });
const HORA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

// Próxima live cadastrada pela equipe no painel (aba Lives).
export default function ProximaLive({ classeTitulo }: { classeTitulo?: string }) {
  const [live, setLive] = useState<Live | null | undefined>(undefined);

  useEffect(() => {
    let vivo = true;
    supabase.rpc("proximas_lives").then(({ data }) => {
      if (!vivo) return;
      const l = ((data ?? []) as Live[]).find((x) => new Date(x.inicio).getTime() > Date.now() - 3 * 3600e3);
      setLive(l ?? null);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const agora = live ? new Date(live.inicio).getTime() <= Date.now() : false;

  return (
    <section className={`${ui.card} ${ui.cardGold}`} aria-labelledby="live">
      <div className={ui.rowBetween}>
        <h2 id="live" className={ui.h2}>
          {agora ? "Ao vivo agora" : "Próxima live"}
        </h2>
        {live && (
          <span className={`${ui.badge} ${ui.badgeRed}`}>
            <Icon name="live" size={14} /> {agora ? "AO VIVO" : `${DIA.format(new Date(live.inicio))} · ${HORA.format(new Date(live.inicio))}`}
          </span>
        )}
      </div>
      {live === undefined ? (
        <p className={ui.muted}>Carregando…</p>
      ) : live === null ? (
        <p className={ui.muted}>Nenhuma live marcada agora. Assim que o time marcar, ela aparece aqui.</p>
      ) : (
        <>
          <b className={classeTitulo}>{live.titulo}</b>
          {live.descricao && <p className={ui.muted}>{live.descricao}</p>}
          {agora && live.link && (
            <a href={live.link} target="_blank" rel="noopener noreferrer" className={ui.btnGold}>
              Entrar na live
            </a>
          )}
        </>
      )}
    </section>
  );
}
