"use client";

import AvisoExemplo from "../../_components/membros/AvisoExemplo";
import "../../_components/membros/painel.css";
import { useState } from "react";
import { Modal, toast } from "../../_components/membros/Toast";
import { m } from "../../_components/membros/proto";
import { IMG } from "../../_lib/demo";

const ENCONTROS = [
  { d: "21", q: "OUT · TER", t: "Hotseat: funil de 3 membros", h: "20h · ao vivo · 90 min", prox: true },
  { d: "28", q: "OUT · TER", t: "Escala: time de chat", h: "20h · ao vivo" },
];
const PLANO = [
  { t: "Ajustar bio e link da persona", q: "CAPPU · 07/10", ok: true },
  { t: "Testar 2 preços de entrada por 7 dias", q: "ATÉ 18/10" },
  { t: "Enviar números do funil antes do hotseat", q: "ATÉ 20/10" },
];
const GRAVACOES = [
  ["Encontro 2 · Persona que vende", "1h32"],
  ["Encontro 1 · Diagnóstico da operação", "1h48"],
];
const MATERIAIS = [
  ["Planilha de metas da agência", "XLSX"],
  ["Contrato modelo de parceria", "DOCX · revisar com advogado"],
];

export default function MinhaMentoria() {
  // Enquanto a mentoria não vem do Supabase, o alternador mostra as duas versões da tela.
  const [mentorado, setMentorado] = useState(true);
  const [aplicar, setAplicar] = useState(false);

  return (
    <section className={m("view")} aria-label="Minha Mentoria">
      <AvisoExemplo>Tela de exemplo da mentoria High Ticket (liberada em Dubai).</AvisoExemplo>
      <div className={m("split")}>
        <div className={m("seg")} role="group" aria-label="Visualização">
          <button type="button" aria-pressed={mentorado} onClick={() => setMentorado(true)}>
            Como mentorado
          </button>
          <button type="button" aria-pressed={!mentorado} onClick={() => setMentorado(false)}>
            Sem mentoria
          </button>
        </div>
        <span className={m("mono")} style={{ fontSize: 12, color: "var(--muted2)" }}>
          Alternador de exemplo
        </span>
      </div>

      {mentorado ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div className={m("mhero")}>
            <div style={{ display: "grid", gap: 12 }}>
              <p className={m("eb")} style={{ color: "var(--ambar)" }}>
                Mentoria High Ticket · Turma Novembro
              </p>
              <h1 className={m("stack")}>
                <span className={m("s")}>Minha</span>
                <span>Mentoria</span>
              </h1>
              <p className={m("sub")} style={{ color: "#C9CFDB" }}>
                Encontro 3 de 8 · grupo de 12 · acompanhamento direto com o Cappu
              </p>
              <div className={m("row")}>
                <button className={m("btn btn-p")} type="button" onClick={() => toast("O link da sala abre 15 min antes")}>
                  Entrar no próximo encontro
                </button>
                <button className={m("btn btn-s")} type="button" onClick={() => toast("Canal direto abre no seu HOTPHONE")}>
                  Canal direto
                </button>
              </div>
            </div>
            <span className={m("ph")} style={{ backgroundImage: `url(${IMG.cappu})` }} />
          </div>

          <div className={m("grid g-2")}>
            <div className={m("card")}>
              <h2>Próximos encontros</h2>
              <div style={{ display: "grid", gap: 8 }}>
                {ENCONTROS.map((e) => (
                  <div key={e.t} className={m("next")}>
                    <span className={m("d")}>
                      {e.d}
                      <small>{e.q}</small>
                    </span>
                    <div>
                      <b>{e.t}</b>
                      <small style={{ display: "block", color: "var(--muted)", fontSize: 12.5 }}>{e.h}</small>
                    </div>
                    <span className={m("tag" + (e.prox ? " live" : ""))}>{e.prox ? "Próximo" : "Agendado"}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={m("card")}>
              <h2>Seu plano de ação</h2>
              <ul className={m("plan-a")}>
                {PLANO.map((p) => (
                  <li key={p.t}>
                    <label>
                      <input type="checkbox" defaultChecked={p.ok} />
                      <span>{p.t}</span>
                      <small>{p.q}</small>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={m("grid g-2")}>
            <div className={m("card")}>
              <h2>Gravações</h2>
              <div className={m("recs")}>
                {GRAVACOES.map(([t, d]) => (
                  <div key={t}>
                    <span>{t}</span>
                    <small>{d}</small>
                  </div>
                ))}
              </div>
            </div>
            <div className={m("card")}>
              <h2>Materiais exclusivos</h2>
              <div className={m("recs")}>
                {MATERIAIS.map(([t, d]) => (
                  <div key={t}>
                    <span>{t}</span>
                    <small>{d}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={m("mhero")}>
          <div style={{ display: "grid", gap: 12 }}>
            <p className={m("eb")} style={{ color: "var(--ambar)" }}>
              Mentoria High Ticket · Dubai
            </p>
            <h1 className={m("stack")}>
              <span className={m("s")}>Acesso direto ao</span>
              <span>Cappu</span>
            </h1>
            <p className={m("sub")} style={{ color: "#C9CFDB" }}>
              8 encontros ao vivo, grupo de até 12, plano de ação individual e canal direto. Entrada por aplicação.
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, color: "#C9CFDB", fontSize: 14, display: "grid", gap: 4 }}>
              <li>Análise da sua operação</li>
              <li>Hotseats com o seu funil</li>
              <li>Encontro presencial em Dubai para quem carimbar Dubai</li>
            </ul>
            <div className={m("row")}>
              <button className={m("btn btn-p")} type="button" onClick={() => setAplicar(true)}>
                Aplicar para a mentoria
              </button>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Próxima turma: novembro · valor na aplicação</span>
            </div>
          </div>
          <span className={m("ph")} style={{ backgroundImage: `url(${IMG.cappu})` }} />
        </div>
      )}

      {aplicar && <Aplicar onClose={() => setAplicar(false)} />}
    </section>
  );
}

function Aplicar({ onClose }: { onClose: () => void }) {
  const [texto, setTexto] = useState("");
  return (
    <Modal
      title="Aplicação · Mentoria High Ticket"
      onClose={onClose}
      foot={
        <>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className={m("btn btn-p")}
            onClick={() => {
              if (!texto.trim()) return toast("Conta um pouco sobre você antes de enviar");
              onClose();
              toast("Aplicação enviada. Resposta em até 48 h");
            }}
          >
            Enviar aplicação
          </button>
        </>
      }
    >
      <p className={m("sub")} style={{ margin: 0 }}>
        Conta rapidinho onde você está. O time responde em até 48 h.
      </p>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        aria-label="Sua aplicação"
        placeholder="Hoje eu faturo… minha maior trava é…"
        maxLength={600}
      />
    </Modal>
  );
}
