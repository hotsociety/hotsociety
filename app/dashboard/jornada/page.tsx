"use client";

import Image from "next/image";
import { useState } from "react";
import Icon from "../../_components/membros/Icon";
import { useMembro } from "../../_components/membros/MemberContext";
import { ROUTE } from "../../_lib/site";
import { PERFIL_DEMO, PLACAS } from "../../_lib/demo";
import ui from "../../_components/membros/ui.module.css";
import s from "./jornada.module.css";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const METAS = [0, 10000, 50000, 100000];

export default function Jornada() {
  const { nome, user } = useMembro();
  const fat = PERFIL_DEMO.faturado;
  const [placa, setPlaca] = useState(PLACAS[0].id);
  const [nomePlaca, setNomePlaca] = useState(nome);
  const [enviado, setEnviado] = useState(false);
  const escolhida = PLACAS.find((p) => p.id === placa)!;
  const liberada = fat >= escolhida.meta;

  return (
    <div className={ui.page}>
      <header className={ui.head}>
        <p className={ui.eyebrow}>Jornada</p>
        <h1 className={ui.h1}>
          Embarque no zero. <span className={ui.gold}>Desembarque no topo.</span>
        </h1>
        <p className={ui.sub}>Cada escala é carimbada com faturamento verificado. A placa chega na sua casa.</p>
      </header>

      <div className={ui.gridMain}>
        {/* linha do tempo */}
        <section className={ui.card} aria-labelledby="rota">
          <h2 id="rota" className={ui.h2}>
            Sua rota
          </h2>
          <ol className={s.timeline}>
            {ROUTE.map((r, i) => {
              const status = i < PERFIL_DEMO.stopAtual ? "ok" : i === PERFIL_DEMO.stopAtual ? "aqui" : "futuro";
              const falta = Math.max(0, METAS[i] - fat);
              return (
                <li key={r.code} className={s[status]}>
                  <span className={s.dot} aria-hidden="true">
                    {status === "ok" || status === "aqui" ? <Icon name="check" size={14} /> : null}
                  </span>
                  <div className={s.stopBody}>
                    <div className={ui.rowBetween}>
                      <b className={s.code}>
                        {r.code} <span>{r.country}</span>
                      </b>
                      {status === "aqui" ? (
                        <span className={`${ui.badge} ${ui.badgeGold}`}>Você está aqui</span>
                      ) : status === "futuro" ? (
                        <span className={ui.badge}>Faltam {BRL.format(falta)}</span>
                      ) : (
                        <span className={`${ui.badge} ${ui.badgeOk}`}>Carimbado</span>
                      )}
                    </div>
                    <small>
                      {r.goal} · {r.reward}
                    </small>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <div className={ui.page}>
          {/* faturamento */}
          <section className={`${ui.card} ${ui.cardGold}`} aria-labelledby="fat">
            <h2 id="fat" className={ui.h2}>
              Faturamento verificado
            </h2>
            <b className={s.big}>{BRL.format(fat)}</b>
            <p className={ui.muted}>Gateway conectado · últimos 12 meses</p>
            <div className={ui.bar}>
              <i style={{ width: `${Math.min(100, (fat / 10000) * 100)}%` }} />
            </div>
            <p className={ui.small}>Faltam {BRL.format(Math.max(0, 10000 - fat))} para carimbar o Chile.</p>
            <button type="button" className={ui.btnGhost}>
              Conectar outro gateway
            </button>
          </section>

          <div className={s.plaque}>
            <Image src="/img/placas.jpg" alt="Placas 10K, 50K e 100K da HOT SOCIETY" fill sizes="(max-width: 1024px) 100vw, 420px" />
          </div>
        </div>
      </div>

      {/* pedido de placa */}
      <section className={ui.card} aria-labelledby="placa">
        <h2 id="placa" className={ui.h2}>
          Pedir minha placa
        </h2>

        {enviado ? (
          <p className={ui.okBox}>
            Pedido enviado. Protocolo <b>HS-PLQ-0001</b>. Você acompanha aqui e recebe o rastreio no WhatsApp.
          </p>
        ) : (
          <form
            className={s.form}
            onSubmit={(e) => {
              e.preventDefault();
              setEnviado(true);
            }}
          >
            <div className={s.choice} role="radiogroup" aria-label="Qual placa">
              {PLACAS.map((p) => {
                const ok = fat >= p.meta;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={placa === p.id}
                    className={s.opt}
                    onClick={() => setPlaca(p.id)}
                  >
                    <b>{p.id}</b>
                    <small>{p.d}</small>
                    <span className={`${ui.badge} ${ok ? ui.badgeOk : ""}`}>
                      {ok ? "Liberada" : `Faltam ${BRL.format(p.meta - fat)}`}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className={ui.grid2}>
              <label className={ui.field}>
                <span>Nome que vai na placa</span>
                <input className={ui.input} maxLength={24} value={nomePlaca} onChange={(e) => setNomePlaca(e.target.value)} required />
              </label>
              <label className={ui.field}>
                <span>E-mail</span>
                <input className={ui.input} type="email" defaultValue={user.email ?? ""} required />
              </label>
              <label className={ui.field}>
                <span>WhatsApp</span>
                <input className={ui.input} type="tel" inputMode="tel" placeholder="(11) 90000-0000" required />
              </label>
              <label className={ui.field}>
                <span>CEP</span>
                <input className={ui.input} inputMode="numeric" placeholder="00000-000" required />
              </label>
              <label className={ui.field}>
                <span>Endereço e número</span>
                <input className={ui.input} required />
              </label>
              <label className={ui.field}>
                <span>Cidade / UF</span>
                <input className={ui.input} required />
              </label>
            </div>

            <label className={s.check}>
              <input type="checkbox" required /> Declaro que o faturamento é meu, real e que posso comprovar se pedido.
            </label>

            <button type="submit" className={ui.btnGold} disabled={!liberada}>
              {liberada ? `Solicitar ${escolhida.t}` : `${escolhida.t} ainda não liberada`}
            </button>
            <p className={ui.small}>Produção e envio em até 20 dias úteis. Frete por nossa conta.</p>
          </form>
        )}
      </section>
    </div>
  );
}
