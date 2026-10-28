"use client";

import { useProgresso } from "../../_components/membros/Progresso";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import Icon from "../../_components/membros/Icon";
import { useMembro } from "../../_components/membros/MemberContext";
import { ROUTE } from "../../_lib/site";
import { PLACAS } from "../../_lib/demo";
import { supabase } from "../../_lib/supabase";
import Comprovantes from "./Comprovantes";
import "../../_components/membros/ui.css";
import ui from "../../_components/membros/ui.styles";
import "./jornada.css";
import s from "./jornada.styles";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const DATA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });

type PedidoPlaca = { id: string; protocolo: string; placa: string; status: string; rastreio: string | null; obs: string | null; criado_em: string };
const STATUS_PLACA: Record<string, string> = {
  recebido: "Pedido recebido",
  producao: "Em produção",
  enviado: "Enviada",
  entregue: "Entregue",
  recusado: "Não aprovado",
};
const VAZIO = { whatsapp: "", cep: "", endereco: "", cidade_uf: "" };

function erroPlaca(m: string) {
  if (/meta/.test(m)) return "Seu faturamento verificado ainda não chegou na meta desta placa.";
  if (/assinatura/.test(m)) return "Seu acesso não está ativo.";
  if (/check constraint|whatsapp|cep/i.test(m)) return "Confira o WhatsApp (com DDD) e o CEP.";
  return "Não deu para enviar o pedido agora. Tente de novo.";
}

export default function Jornada() {
  const { nome, user } = useMembro();
  const { perfil } = useProgresso();
  const fat = perfil.faturado;
  const [placa, setPlaca] = useState(PLACAS[0].id);
  const [nomePlaca, setNomePlaca] = useState(nome);
  const [end, setEnd] = useState(VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [pedidos, setPedidos] = useState<PedidoPlaca[]>([]);
  const escolhida = PLACAS.find((p) => p.id === placa)!;
  const liberada = fat >= escolhida.meta;
  const jaPedida = pedidos.find((p) => p.placa === placa);

  const carregar = useCallback(async () => {
    const { data } = await supabase.rpc("minhas_placas");
    setPedidos((data ?? []) as PedidoPlaca[]);
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);

  async function pedir(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const { data, error } = await supabase.rpc("pedir_placa", { p: { placa, nome_placa: nomePlaca.trim(), ...end } });
    setEnviando(false);
    if (error) return setErro(erroPlaca(error.message));
    setProtocolo((data as { protocolo: string }).protocolo);
    setEnd(VAZIO);
    carregar();
  }

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
              const status = i < perfil.stopAtual ? "ok" : i === perfil.stopAtual ? "aqui" : "futuro";
              const falta = Math.max(0, (r.meta ?? 0) - fat);
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
                      ) : status === "futuro" && r.meta === null ? (
                        <span className={`${ui.badge} ${ui.badgeGold}`}>Mentoria</span>
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
            <p className={ui.muted}>Conferido pela equipe a partir dos seus comprovantes</p>
            <div className={ui.bar}>
              <i style={{ width: `${Math.min(100, (fat / 10000) * 100)}%` }} />
            </div>
            <p className={ui.small}>Faltam {BRL.format(Math.max(0, 10000 - fat))} para carimbar o Chile.</p>
            <a href="#comprovantes" className={ui.btnGhost}>
              Enviar comprovantes
            </a>
          </section>

          <div className={s.plaque}>
            <Image src="/img/placas.jpg" alt="Placas 10K, 50K e 100K da HOT SOCIETY" fill sizes="(max-width: 1024px) 100vw, 420px" />
          </div>
        </div>
      </div>

      <Comprovantes />

      {/* pedido de placa */}
      <section className={ui.card} aria-labelledby="placa">
        <h2 id="placa" className={ui.h2}>
          Pedir minha placa
        </h2>

        {pedidos.length > 0 && (
          <ul className={ui.list}>
            {pedidos.map((p) => (
              <li key={p.id} className={ui.row}>
                <span className={ui.rowMain}>
                  <b>Placa {p.placa}</b>
                  <small>
                    {p.protocolo} · pedida em {DATA.format(new Date(p.criado_em))}
                    {p.rastreio && ` · rastreio ${p.rastreio}`}
                    {p.obs && ` · ${p.obs}`}
                  </small>
                </span>
                <span className={`${ui.badge} ${p.status === "entregue" || p.status === "enviado" ? ui.badgeOk : p.status === "recusado" ? ui.badgeRed : ui.badgeGold}`}>
                  {STATUS_PLACA[p.status] ?? p.status}
                </span>
              </li>
            ))}
          </ul>
        )}

        {protocolo ? (
          <div style={{ display: "grid", gap: 12 }}>
            <p className={ui.okBox} role="status">
              Pedido enviado. Protocolo <b>{protocolo}</b>. Você acompanha o andamento e o rastreio aqui nesta página.
            </p>
            <button type="button" className={ui.btnGhost} onClick={() => setProtocolo(null)}>
              Voltar
            </button>
          </div>
        ) : (
          <form className={s.form} onSubmit={pedir}>
            <div className={s.choice} role="radiogroup" aria-label="Qual placa">
              {PLACAS.map((p) => {
                const ok = fat >= p.meta;
                const pedida = pedidos.find((x) => x.placa === p.id);
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
                      {pedida ? STATUS_PLACA[pedida.status] : ok ? "Liberada" : `Faltam ${BRL.format(p.meta - fat)}`}
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
                <input className={ui.input} type="email" value={user.email ?? ""} readOnly aria-readonly="true" />
              </label>
              <label className={ui.field}>
                <span>WhatsApp</span>
                <input
                  className={ui.input}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(11) 90000-0000"
                  pattern="[0-9()+ -]{10,20}"
                  value={end.whatsapp}
                  onChange={(e) => setEnd({ ...end, whatsapp: e.target.value })}
                  required
                />
              </label>
              <label className={ui.field}>
                <span>CEP</span>
                <input
                  className={ui.input}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="00000-000"
                  pattern="[0-9]{5}-?[0-9]{3}"
                  value={end.cep}
                  onChange={(e) => setEnd({ ...end, cep: e.target.value })}
                  required
                />
              </label>
              <label className={ui.field}>
                <span>Endereço, número e complemento</span>
                <input className={ui.input} autoComplete="street-address" minLength={5} maxLength={160} value={end.endereco} onChange={(e) => setEnd({ ...end, endereco: e.target.value })} required />
              </label>
              <label className={ui.field}>
                <span>Cidade / UF</span>
                <input className={ui.input} minLength={3} maxLength={80} placeholder="São Paulo / SP" value={end.cidade_uf} onChange={(e) => setEnd({ ...end, cidade_uf: e.target.value })} required />
              </label>
            </div>

            <label className={s.check}>
              <input type="checkbox" required /> Declaro que o faturamento é meu, real e que posso comprovar se pedido.
            </label>

            {erro && (
              <p className={ui.muted} role="alert" style={{ color: "var(--erro-t)", margin: 0 }}>
                {erro}
              </p>
            )}
            <button type="submit" className={ui.btnGold} disabled={!liberada || !!jaPedida || enviando}>
              {jaPedida ? `${escolhida.t} já pedida` : !liberada ? `${escolhida.t} ainda não liberada` : enviando ? "Enviando…" : `Solicitar ${escolhida.t}`}
            </button>
            <p className={ui.small}>Produção e envio em até 20 dias úteis. Frete por nossa conta.</p>
          </form>
        )}
      </section>
    </div>
  );
}
