"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PODE, useMembro } from "../../_components/membros/MemberContext";
import { m } from "../../_components/membros/proto";
import { supabase } from "../../_lib/supabase";
import { erroAmigavel, hojeISO, reais, reais0, somarDias } from "../../_lib/painel";

type Resumo = {
  bruto: number;
  liquido: number;
  pagos: number;
  pedidos: number;
  nao_pagos: number;
  reembolsos: number;
  a_receber: number;
  alunos_ativos: number;
  por_dia: { dia: string; valor: number | null; pedidos: number }[];
  por_metodo: Record<string, number>;
};

const PERIODOS: [number, string][] = [
  [7, "7 dias"],
  [30, "30 dias"],
  [90, "90 dias"],
];

export default function VisaoGeral() {
  const { cargo } = useMembro();
  const router = useRouter();
  const [dias, setDias] = useState(30);
  const [r, setR] = useState<Resumo | null>(null);
  const [erro, setErro] = useState("");

  // Suporte não vê valores: vai direto para Alunos.
  useEffect(() => {
    if (!PODE.verValores(cargo)) router.replace("/dashboard/painel/alunos");
  }, [cargo, router]);

  useEffect(() => {
    if (!PODE.verValores(cargo)) return;
    let vivo = true;
    const ate = hojeISO(new Date());
    const de = somarDias(ate, -(dias - 1));
    supabase.rpc("painel_resumo", { p_de: de, p_ate: ate }).then(({ data, error }) => {
      if (!vivo) return;
      if (error) setErro(erroAmigavel(error));
      else {
        setErro("");
        setR(preencher(data as Resumo, de, dias));
      }
    });
    return () => {
      vivo = false;
    };
  }, [dias, cargo]);

  if (!PODE.verValores(cargo)) return null;

  const ticket = r && r.pagos ? r.bruto / r.pagos : 0;
  const max = r ? Math.max(1, ...r.por_dia.map((d) => Number(d.valor ?? 0))) : 1;

  return (
    <>
      <div className={m("split")}>
        <div className={m("seg")} role="group" aria-label="Período">
          {PERIODOS.map(([d, t]) => (
            <button key={d} type="button" aria-pressed={dias === d} onClick={() => setDias(d)}>
              {t}
            </button>
          ))}
        </div>
        <Link href="/dashboard/painel/vendas" className="hs-pn-btn hs-pn-btn-sm">
          Ver todas as vendas
        </Link>
      </div>

      {erro && <p className="hs-pn-erro">{erro}</p>}

      <div className="hs-pn-kpis">
        <Kpi t="Faturamento" v={r ? reais(r.bruto) : "…"} e={r ? `${r.pagos} vendas pagas` : ""} />
        <Kpi t="Sua parte (líquido)" v={r ? reais(r.liquido) : "…"} e={r ? `${reais(r.a_receber)} ainda a liberar` : ""} />
        <Kpi t="Ticket médio" v={r ? reais(ticket) : "…"} e={r ? `${r.pedidos} pedidos no período` : ""} />
        <Kpi t="Alunos ativos" v={r ? String(r.alunos_ativos) : "…"} e={r ? `${r.reembolsos} reembolsos · ${r.nao_pagos} não pagos` : ""} />
      </div>

      <div className={m("card")}>
        <h2>Vendas pagas por dia</h2>
        {r && r.pagos === 0 ? (
          <p className="hs-pn-vazio">Nenhuma venda paga neste período.</p>
        ) : (
          <div className="hs-pn-chart">
            <div className="hs-pn-bars" role="list" aria-label="Faturamento por dia">
              {r?.por_dia.map((d) => (
                <button key={d.dia} type="button" role="listitem" aria-label={`${fmtDia(d.dia)}: ${reais(d.valor ?? 0)}, ${d.pedidos} vendas`}>
                  <i style={{ height: `${(Number(d.valor ?? 0) / max) * 100}%` }} />
                  <span className="hs-pn-tip">
                    {fmtDia(d.dia)}
                    <br />
                    <b>{reais0(d.valor ?? 0)}</b> · {d.pedidos} {d.pedidos === 1 ? "venda" : "vendas"}
                  </span>
                </button>
              ))}
            </div>
            <div className="hs-pn-axis">
              <span>{r ? fmtDia(r.por_dia[0]?.dia) : ""}</span>
              <span>máx. {reais0(max)}/dia</span>
              <span>{r ? fmtDia(r.por_dia[r.por_dia.length - 1]?.dia) : ""}</span>
            </div>
          </div>
        )}
      </div>

      {r && r.pagos > 0 && (
        <div className={m("card")}>
          <h2>Forma de pagamento</h2>
          <div className="hs-pn-bar">
            {Object.entries(r.por_metodo).map(([k, n]) => (
              <span key={k} className="hs-pn-pill off">
                {({ pix: "Pix", cartao: "Cartão", boleto: "Boleto" } as Record<string, string>)[k] ?? "Outro"}: <b>{n}</b>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Kpi({ t, v, e }: { t: string; v: string; e: string }) {
  return (
    <div className="hs-pn-kpi">
      <small>{t}</small>
      <b>{v}</b>
      <em>{e}</em>
    </div>
  );
}

function fmtDia(iso?: string) {
  if (!iso) return "";
  const [, mm, dd] = iso.split("-");
  return `${dd}/${mm}`;
}

// Garante uma barra para cada dia do período, mesmo sem venda.
function preencher(r: Resumo, de: string, dias: number): Resumo {
  const mapa = new Map(r.por_dia.map((d) => [d.dia, d]));
  const por_dia = Array.from({ length: dias }, (_, i) => {
    const dia = somarDias(de, i);
    return mapa.get(dia) ?? { dia, valor: 0, pedidos: 0 };
  });
  return { ...r, por_dia };
}
