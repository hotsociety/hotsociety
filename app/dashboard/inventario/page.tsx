"use client";

import "../../_components/membros/painel.css";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "../../_components/membros/Toast";
import { m } from "../../_components/membros/proto";
import Icon from "../../_components/membros/Icon";
import { postApi } from "../../_lib/api";
import { PRODUTOS } from "../../_lib/demo";
import { ITENS_PAGOS, itemPago } from "../../_lib/loja";
import { BotaoDiscord } from "../../_components/membros/ArsenalCard";
import "../inicio.css";
import { supabase } from "../../_lib/supabase";

// Tudo o que o aluno comprou (em reais) ou resgatou (com coins) na Hot Store.
type ItemInv = {
  origem: "compra" | "resgate";
  id: string;
  protocolo: string;
  item: string;
  titulo: string | null;
  valor: number | null;
  coins: number | null;
  metodo: "pix" | "cartao" | null;
  status: string;
  rastreio: string | null;
  data: string;
};

const ST: Record<string, { t: string; ok: boolean }> = {
  pago: { t: "Ativo", ok: true },
  reembolsado: { t: "Reembolsado", ok: false },
  chargeback: { t: "Contestado", ok: false },
  recebido: { t: "Separando", ok: true },
  enviado: { t: "Enviado", ok: true },
  entregue: { t: "Entregue", ok: true },
  cancelado: { t: "Cancelado (coins devolvidas)", ok: false },
};
const DATA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const GFX_BG = "radial-gradient(90% 70% at 30% 20%,#2e2618,#0b0b0c 70%)";

export default function Inventario() {
  const [itens, setItens] = useState<ItemInv[] | null>(null);
  const [agendados, setAgendados] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const [inv, ch] = await Promise.all([supabase.rpc("meu_inventario"), supabase.rpc("meus_chamados")]);
    const lista = inv.error ? [] : ((inv.data ?? []) as ItemInv[]);
    // A call já foi pedida se existe um chamado com o protocolo da compra no assunto.
    const chamados = (ch.data ?? []) as { protocolo: string; assunto: string }[];
    const ag: Record<string, string> = {};
    for (const it of lista) {
      const c = chamados.find((x) => x.assunto?.includes(it.protocolo));
      if (c) ag[it.id] = c.protocolo;
    }
    setAgendados(ag);
    setItens(lista);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function agendar(it: ItemInv) {
    setEnviando(it.id);
    const r = await postApi<{ protocolo: string }>("/api/suporte", {
      acao: "abrir",
      tema: "Hot Store",
      assunto: `Agendar Consultoria 1:1 · compra ${it.protocolo}`,
      texto: `Comprei a Consultoria 1:1 (compra ${it.protocolo}, ${DATA.format(new Date(it.data))}) e quero agendar a minha call de 60 minutos.`,
    });
    setEnviando(null);
    if (r.erro) return toast(r.erro);
    setAgendados((a) => ({ ...a, [it.id]: r.protocolo }));
    toast(`Pedido de agendamento enviado · ${r.protocolo}`);
  }

  const ativos = (itens ?? []).filter((i) => ST[i.status]?.ok !== false).length;

  return (
    <section className={m("view")} aria-label="Inventário">
      <div className={m("top")}>
        <div>
          <h1>Inventário</h1>
          <p className={m("sub")}>Tudo o que você comprou ou resgatou na Hot Store.</p>
        </div>
        <div className={m("chips")}>
          <span className={m("chip")}>
            <i className={m("num")}>{ativos}</i> {ativos === 1 ? "item" : "itens"}
          </span>
          <Link href="/dashboard/store" className={m("btn btn-s")} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="bag" size={15} /> Hot Store
          </Link>
        </div>
      </div>

      {itens === null ? (
        <p className={m("sub")}>Carregando…</p>
      ) : itens.length === 0 ? (
        <div className="hs-inv-vazio">
          <Icon name="box" size={40} />
          <b>Seu inventário está vazio</b>
          <p>O que você comprar ou resgatar na Hot Store aparece aqui, com o status e o que fazer em seguida.</p>
          <Link href="/dashboard/store" className={m("btn btn-p")}>
            Ver a Hot Store
          </Link>
        </div>
      ) : (
        <div className={m("st-grid")}>
          {itens.map((it) => {
            const p = PRODUTOS.find((x) => x.id === it.item);
            const pago = itemPago(it.item);
            const titulo = pago ? ITENS_PAGOS[pago].titulo : (it.titulo ?? p?.t ?? "Item da Hot Store");
            const st = ST[it.status] ?? { t: it.status, ok: true };
            const ehCall = it.origem === "compra" && it.item === "cs" && it.status === "pago";
            const agendado = agendados[it.id];
            return (
              <div key={`${it.origem}-${it.id}`} className={m("st-p") + (st.ok ? "" : " hs-inv-off")}>
                <div className={m("cv" + (p?.img ? " ph" : ""))} style={p?.img ? { backgroundImage: `url(${p.img})` } : { background: GFX_BG }}>
                  <span className={"hs-inv-st" + (st.ok ? "" : " off")}>{st.t}</span>
                </div>
                <div className={m("bd")}>
                  <div>
                    <b>{titulo}</b>
                    <p>
                      {it.origem === "compra"
                        ? `Comprado em ${DATA.format(new Date(it.data))} · ${brl(it.valor ?? 0)} no ${it.metodo === "cartao" ? "cartão" : "Pix"}`
                        : `Resgatado em ${DATA.format(new Date(it.data))} · ${(it.coins ?? 0).toLocaleString("pt-BR")} coins`}
                    </p>
                    <p className="hs-inv-prot">
                      Protocolo {it.protocolo}
                      {it.rastreio && ` · rastreio ${it.rastreio}`}
                    </p>
                  </div>
                  <div className={m("pr")}>
                    {ehCall ? (
                      agendado ? (
                        <Link href="/dashboard/suporte" className={m("btn btn-s")}>
                          Agendamento enviado ✓ · {agendado}
                        </Link>
                      ) : (
                        <button type="button" className={m("btn btn-p")} disabled={enviando === it.id} onClick={() => agendar(it)}>
                          {enviando === it.id ? "Enviando…" : "Agendar minha call"}
                        </button>
                      )
                    ) : it.origem === "compra" && it.item === "ar" && it.status === "pago" ? (
                      <BotaoDiscord />
                    ) : it.item === "hp" && st.ok ? (
                      <span className="hs-inv-dica">Cor liberada nos Ajustes do HOTPHONE</span>
                    ) : it.origem === "resgate" && st.ok && it.status !== "entregue" ? (
                      <span className="hs-inv-dica">Entrega em até 20 dias úteis</span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className={m("demo")}>
        Para pedir reembolso de uma compra (até 7 dias), vá em <Link href="/dashboard/perfil">Perfil → Acesso e compras</Link>. Dúvidas sobre um item:{" "}
        <Link href="/dashboard/suporte?tema=Hot%20Store">Suporte</Link>.
      </p>
    </section>
  );
}
