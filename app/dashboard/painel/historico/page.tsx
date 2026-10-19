"use client";

import { useEffect, useState } from "react";
import { PODE, useMembro } from "../../../_components/membros/MemberContext";
import { supabase } from "../../../_lib/supabase";
import { STATUS_VENDA, dataHora, erroAmigavel, reais, type StatusVenda } from "../../../_lib/painel";

type Linha = { em: string; quem: string; acao: string; alvo: string | null; detalhes: Record<string, unknown> | null };

const CARGO: Record<string, string> = { admin: "Admin", financeiro: "Financeiro", suporte: "Suporte" };

// Frase simples para cada ação registrada.
function frase(l: Linha) {
  const d = l.detalhes ?? {};
  switch (l.acao) {
    case "cargo":
      return d.para ? `deu o cargo ${CARGO[String(d.para)] ?? d.para} para ${l.alvo}` : `tirou o cargo de ${l.alvo}`;
    case "liberar_acesso":
      return `liberou o acesso de ${l.alvo}${d.dias ? ` por ${d.dias} dias` : " sem prazo"} · "${d.motivo ?? ""}"`;
    case "bloquear_acesso":
      return `bloqueou o acesso de ${l.alvo} · "${d.motivo ?? ""}"`;
    case "venda_manual":
      return `lançou a venda ${l.alvo} (${d.email}, ${reais(d.valor as number)})`;
    case "reembolso_pedido":
      return `pediu reembolso do pedido ${l.alvo} (protocolo ${d.protocolo}, ${reais(d.valor as number)})`;
    case "faturamento_teste":
      return `TESTE: faturamento de ${l.alvo} alterado para ${reais(d.faturado as number)}`;
    case "status_venda":
      return `mudou o pedido ${l.alvo} de ${STATUS_VENDA[d.de as StatusVenda] ?? d.de} para ${STATUS_VENDA[d.para as StatusVenda] ?? d.para}`;
    default:
      return `${l.acao} ${l.alvo ?? ""}`;
  }
}

export default function Historico() {
  const { cargo } = useMembro();
  const [lista, setLista] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!PODE.verHistorico(cargo)) return;
    supabase.rpc("painel_historico", { p_limite: 300 }).then(({ data, error }) => {
      setErro(error ? erroAmigavel(error) : "");
      setLista((data ?? []) as Linha[]);
    });
  }, [cargo]);

  if (!PODE.verHistorico(cargo)) return null;

  return (
    <>
      <p className="hs-pn-nota">Tudo o que a equipe faz no painel fica aqui. Ninguém consegue apagar estas linhas pelo site.</p>
      {erro && <p className="hs-pn-erro">{erro}</p>}
      {lista === null ? (
        <p className="hs-pn-vazio">Carregando…</p>
      ) : lista.length === 0 ? (
        <p className="hs-pn-vazio">Nenhuma ação registrada ainda.</p>
      ) : (
        <ul className="hs-pn-log" style={{ margin: 0, padding: 0 }}>
          {lista.map((l, i) => (
            <li key={i}>
              <time dateTime={l.em}>{dataHora(l.em)}</time>
              <span style={{ overflowWrap: "anywhere" }}>
                <b>{l.quem}</b> {frase(l)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
