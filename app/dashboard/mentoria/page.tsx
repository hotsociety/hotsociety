"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "../../_components/membros/painel.css";
import MentoriaChat from "../../_components/membros/MentoriaChat";
import { Modal, toast } from "../../_components/membros/Toast";
import { m } from "../../_components/membros/proto";
import FormAplicacao from "../../_components/FormAplicacao";
import { IMG } from "../../_lib/demo";
import { supabase } from "../../_lib/supabase";

type Encontro = { id: string; titulo: string; inicio: string; duracao_min: number; tipo: "grupo" | "individual"; gravacao_url: string | null };
type Info = {
  mentorado: boolean;
  mentor: boolean;
  eu?: string;
  turma?: { id: string; nome: string } | null;
  encontros?: Encontro[];
};

const TZ = "America/Sao_Paulo";
const fDia = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit" });
const fMes = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, month: "short", weekday: "short" });
const fHora = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const fData = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit" });

const fim = (e: Encontro) => new Date(e.inicio).getTime() + e.duracao_min * 60e3;
// A sala abre 15 min antes e fecha 1 h depois do fim.
const salaAberta = (e: Encontro, agora = Date.now()) => agora >= new Date(e.inicio).getTime() - 15 * 60e3 && agora <= fim(e) + 3600e3;

export default function MinhaMentoria() {
  const [info, setInfo] = useState<Info | null>(null);
  const [aplicar, setAplicar] = useState(false);
  const [aba, setAba] = useState<"turma" | "dm">("turma");
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    supabase.rpc("minha_mentoria").then(({ data, error }) => setInfo(error ? { mentorado: false, mentor: false } : (data as Info)));
    const t = setInterval(() => setAgora(Date.now()), 30e3);
    return () => clearInterval(t);
  }, []);

  if (!info) {
    return (
      <section className={m("view")} aria-label="Minha Mentoria">
        <p className={m("sub")}>Carregando…</p>
      </section>
    );
  }

  if (!info.mentorado) {
    return (
      <section className={m("view")} aria-label="Mentoria High Ticket">
        {info.mentor && (
          <div className={m("card")}>
            <b>Você é mentor.</b>{" "}
            <span className={m("sub")}>
              Turmas, mentorados, encontros e conversas ficam no <Link href="/dashboard/painel/mentoria">Painel → Mentoria</Link>.
            </span>
          </div>
        )}
        <div className={m("mhero")}>
          <div style={{ display: "grid", gap: 12 }}>
            <p className={m("eb")} style={{ color: "var(--ambar)" }}>
              Mentoria High Ticket · Mônaco
            </p>
            <h1 className={m("stack")}>
              <span className={m("s")}>Acesso direto ao</span>
              <span>Cappu</span>
            </h1>
            <p className={m("sub")} style={{ color: "var(--texto2)" }}>
              Encontros ao vivo em grupo, calls individuais e chat direto com o mentor, tudo aqui dentro. Entrada por aplicação.
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--texto2)", fontSize: 14, display: "grid", gap: 4 }}>
              <li>Análise da sua operação</li>
              <li>Hotseats com o seu funil</li>
              <li>Chat da turma e canal privado com o mentor</li>
            </ul>
            <div className={m("row")}>
              <button className={m("btn btn-p")} type="button" onClick={() => setAplicar(true)}>
                Aplicar para a mentoria
              </button>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Valor sob consulta: a equipe responde a aplicação e combina tudo na call</span>
            </div>
          </div>
          <span className={m("ph")} style={{ backgroundImage: `url(${IMG.mentoria})` }} />
        </div>
        {aplicar && <Aplicar onClose={() => setAplicar(false)} />}
      </section>
    );
  }

  const encontros = info.encontros ?? [];
  const futuros = encontros.filter((e) => fim(e) + 3600e3 >= agora);
  const gravacoes = encontros.filter((e) => fim(e) < agora && e.gravacao_url).reverse();
  const prox = futuros[0];
  const abaAtual = info.turma ? aba : "dm";
  // Carregamento completo (não navegação interna): a página da sala libera câmera e microfone no cabeçalho.
  const entrar = (e: Encontro) => window.location.assign(`/dashboard/mentoria/sala/${e.id}`);

  return (
    <section className={m("view")} aria-label="Minha Mentoria">
      <div className={m("mhero")}>
        <div style={{ display: "grid", gap: 12 }}>
          <p className={m("eb")} style={{ color: "var(--ambar)" }}>
            Mentoria High Ticket{info.turma ? ` · ${info.turma.nome}` : ""}
          </p>
          <h1 className={m("stack")}>
            <span className={m("s")}>Minha</span>
            <span>Mentoria</span>
          </h1>
          <p className={m("sub")} style={{ color: "var(--texto2)" }}>
            {prox
              ? `Próximo: ${prox.titulo} · ${fData.format(new Date(prox.inicio))} às ${fHora.format(new Date(prox.inicio))}`
              : "Nenhum encontro marcado ainda. O mentor avisa por aqui."}
          </p>
          <div className={m("row")}>
            {prox && (
              <button className={m("btn btn-p")} type="button" disabled={!salaAberta(prox, agora)} onClick={() => entrar(prox)}>
                {salaAberta(prox, agora) ? "Entrar na sala agora" : "Sala abre 15 min antes"}
              </button>
            )}
            <button
              className={m("btn btn-s")}
              type="button"
              onClick={() => {
                setAba("dm");
                document.getElementById("mentoria-chat")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Falar com o mentor
            </button>
          </div>
        </div>
        <span className={m("ph")} style={{ backgroundImage: `url(${IMG.mentoria})` }} />
      </div>

      <div className={m("grid g-2")}>
        <div className={m("card")}>
          <h2>Próximos encontros</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {futuros.length === 0 && <p className={m("sub")}>Nada marcado por enquanto.</p>}
            {futuros.map((e) => {
              const d = new Date(e.inicio);
              const aberta = salaAberta(e, agora);
              return (
                <div key={e.id} className={m("next")}>
                  <span className={m("d")}>
                    {fDia.format(d)}
                    <small>{fMes.format(d).replace(/\./g, "").toUpperCase()}</small>
                  </span>
                  <div>
                    <b>{e.titulo}</b>
                    <small style={{ display: "block", color: "var(--muted)", fontSize: 12.5 }}>
                      {fHora.format(d)} · {e.duracao_min} min · {e.tipo === "grupo" ? "em grupo" : "individual"}
                    </small>
                  </div>
                  {aberta ? (
                    <button type="button" className={m("btn btn-p")} onClick={() => entrar(e)}>
                      Entrar
                    </button>
                  ) : (
                    <span className={m("tag" + (e === prox ? " live" : ""))}>{e === prox ? "Próximo" : "Agendado"}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className={m("card")}>
          <h2>Gravações</h2>
          <div className={m("recs")}>
            {gravacoes.length === 0 && <p className={m("sub")}>As gravações aparecem aqui depois de cada encontro.</p>}
            {gravacoes.map((e) => (
              <a key={e.id} href={e.gravacao_url!} target="_blank" rel="noopener noreferrer">
                <span>{e.titulo}</span>
                <small>{fData.format(new Date(e.inicio))}</small>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div id="mentoria-chat" style={{ display: "grid", gap: 10 }}>
        {info.turma && (
          <div className={m("seg")} role="group" aria-label="Conversas">
            <button type="button" aria-pressed={abaAtual === "turma"} onClick={() => setAba("turma")}>
              Chat da turma
            </button>
            <button type="button" aria-pressed={abaAtual === "dm"} onClick={() => setAba("dm")}>
              Mentor (privado)
            </button>
          </div>
        )}
        {abaAtual === "turma" && info.turma ? (
          <MentoriaChat
            key="turma"
            conversa={`turma:${info.turma.id}`}
            titulo={`Chat da turma · ${info.turma.nome}`}
            sub="Só mentorados desta turma e o mentor veem."
            vazio="Ninguém falou ainda. Se apresente para a turma."
          />
        ) : (
          <MentoriaChat
            key="dm"
            conversa={`dm:${info.eu}`}
            titulo="Conversa privada com o mentor"
            sub="Só você e o mentor veem. Resposta em até 48 h úteis."
            vazio="Mande sua dúvida, número do funil ou print aqui."
          />
        )}
      </div>
    </section>
  );
}

function Aplicar({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Aplicação · Mentoria High Ticket" onClose={onClose}>
      <p className={m("sub")} style={{ margin: 0 }}>
        Leva 2 minutos. A equipe do Cappu analisa e chama você no WhatsApp em até 48 h úteis.
      </p>
      <FormAplicacao compacto onEnviado={() => toast("Aplicação enviada ✓")} />
    </Modal>
  );
}
