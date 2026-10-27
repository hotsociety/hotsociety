"use client";

import { useEffect, useState } from "react";
import { PODE, useMembro } from "../../../_components/membros/MemberContext";
import { toast } from "../../../_components/membros/Toast";
import { dataHora, erroAmigavel, reais } from "../../../_lib/painel";
import { supabase } from "../../../_lib/supabase";

type Saque = { id: string; email: string; nome: string; valor: number; chave_pix: string; status: "pendente" | "pago" | "recusado"; criado_em: string; pago_em: string | null };
type Rank = { email: string; codigo: string; cliques: number; vendas: number; comissao: number };
type Dados = { saques: Saque[]; ranking: Rank[]; a_pagar: number; comissoes_total: number };

const ST: Record<Saque["status"], [string, string]> = { pendente: ["Pagar", "pendente"], pago: ["Pago", "ativo"], recusado: ["Recusado", "bloqueado"] };

// Programa de afiliados: saques para pagar e quem mais indica. Admin e Financeiro.
export default function PainelAfiliados() {
  const { cargo } = useMembro();
  const pode = PODE.verValores(cargo);
  const [d, setD] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!pode) return;
    supabase.rpc("painel_afiliados").then(({ data, error }) => {
      if (error) setErro(erroAmigavel(error));
      setD((data as Dados) ?? { saques: [], ranking: [], a_pagar: 0, comissoes_total: 0 });
    });
  }, [n, pode]);

  if (!pode) return <p className="hs-pn-nota">Só Admin e Financeiro veem os afiliados.</p>;

  async function decidir(s: Saque, pago: boolean) {
    const obs = pago ? "Pix enviado" : window.prompt("Motivo da recusa (o valor volta para o saldo do afiliado):") || "";
    if (!pago && !obs.trim()) return;
    if (pago && !window.confirm(`Confirma que já enviou ${reais(s.valor)} por Pix para ${s.chave_pix}?`)) return;
    const { error } = await supabase.rpc("decidir_saque_afiliado", { p_id: s.id, p_pago: pago, p_obs: obs });
    if (error) return toast(erroAmigavel(error));
    toast(pago ? "Saque marcado como pago" : "Saque recusado");
    setN((x) => x + 1);
  }

  return (
    <>
      {erro && <p className="hs-pn-erro">{erro}</p>}
      {!d && <p className="hs-pn-vazio">Carregando…</p>}
      {d && (
        <>
          <div className="hs-pn-bar" style={{ gap: 24 }}>
            <div>
              <small className="hs-pn-nota">Saques a pagar</small>
              <div style={{ font: "900 26px/1.1 var(--f-d)" }}>{reais(d.a_pagar)}</div>
            </div>
            <div>
              <small className="hs-pn-nota">Comissões geradas (total)</small>
              <div style={{ font: "900 26px/1.1 var(--f-d)" }}>{reais(d.comissoes_total)}</div>
            </div>
          </div>

          <h2 style={{ margin: "8px 0 0", font: "800 18px/1.2 var(--f-d)" }}>Saques</h2>
          <div className="hs-pn-tw">
            <table className="hs-pn-t" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>Afiliado</th>
                  <th className="n">Valor</th>
                  <th>Chave Pix</th>
                  <th>Pedido em</th>
                  <th>Status</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {d.saques.map((s) => (
                  <tr key={s.id}>
                    <td style={{ overflowWrap: "anywhere" }}>
                      <b>{s.nome}</b>
                      <small>{s.email}</small>
                    </td>
                    <td className="n">{reais(s.valor)}</td>
                    <td className="hs-pn-mono" style={{ overflowWrap: "anywhere" }}>
                      {s.chave_pix}
                    </td>
                    <td className="nw">{dataHora(s.criado_em)}</td>
                    <td>
                      <span className={"hs-pn-st " + ST[s.status][1]}>{s.status === "pendente" ? "Aguardando" : ST[s.status][0]}</span>
                    </td>
                    <td>
                      {s.status === "pendente" && (
                        <div className="hs-pn-acts">
                          <button type="button" className="hs-pn-btn hs-pn-btn-p hs-pn-btn-sm" onClick={() => decidir(s, true)}>
                            Marcar pago
                          </button>
                          <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => decidir(s, false)}>
                            Recusar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {d.saques.length === 0 && <p className="hs-pn-vazio">Nenhum saque pedido ainda.</p>}
          </div>
          <p className="hs-pn-nota">Envie o Pix pelo banco e depois marque como pago. A comissão só libera 7 dias depois da venda; reembolso ou contestação cancela.</p>

          <h2 style={{ margin: "8px 0 0", font: "800 18px/1.2 var(--f-d)" }}>Quem mais indica</h2>
          <div className="hs-pn-tw">
            <table className="hs-pn-t">
              <thead>
                <tr>
                  <th>Afiliado</th>
                  <th className="n">Cliques</th>
                  <th className="n">Vendas</th>
                  <th className="n">Comissão</th>
                </tr>
              </thead>
              <tbody>
                {d.ranking.map((r) => (
                  <tr key={r.codigo}>
                    <td style={{ overflowWrap: "anywhere" }}>
                      <b>{r.email}</b>
                      <small className="hs-pn-mono">/r/{r.codigo}</small>
                    </td>
                    <td className="n">{r.cliques}</td>
                    <td className="n">{r.vendas}</td>
                    <td className="n">{reais(r.comissao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {d.ranking.length === 0 && <p className="hs-pn-vazio">Ninguém indicou ainda.</p>}
          </div>
        </>
      )}
    </>
  );
}
