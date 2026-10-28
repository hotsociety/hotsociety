"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useMembro } from "../../_components/membros/MemberContext";
import { Modal } from "../../_components/membros/Toast";
import { supabase } from "../../_lib/supabase";
import "../../_components/membros/ui.css";
import ui from "../../_components/membros/ui.styles";

type Compra = {
  id: string;
  pedido: string;
  produto: string;
  plano: string | null;
  metodo: string | null;
  valor: number | string;
  status: string;
  criado_em: string;
  pode_reembolsar: boolean;
  reembolso_pedido_em: string | null;
  reembolso_protocolo: string | null;
};
type Acesso = { ativo: boolean; cargo: string | null; status: string | null; valido_ate: string | null };

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DATA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
const STATUS: Record<string, string> = {
  pago: "Pago",
  pendente: "Aguardando",
  reembolsado: "Reembolsado",
  chargeback: "Contestado",
  cancelado: "Não concluído",
  recusado: "Recusado",
};

// Acesso real + compras do aluno + pedido de reembolso em 7 dias (CDC art. 49).
export default function MinhasCompras() {
  const { cargo } = useMembro();
  const [acesso, setAcesso] = useState<Acesso | null>(null);
  const [compras, setCompras] = useState<Compra[] | null>(null);
  const [pedir, setPedir] = useState<Compra | null>(null);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [protocolo, setProtocolo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const [a, c] = await Promise.all([supabase.rpc("meu_acesso"), supabase.rpc("minhas_compras")]);
    setAcesso((a.data as Acesso) ?? null);
    setCompras(c.error ? [] : ((c.data ?? []) as Compra[]));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function confirmar() {
    if (!pedir) return;
    setEnviando(true);
    setErro("");
    const { data, error } = await supabase.rpc("pedir_reembolso", { p_venda: pedir.id, p_motivo: motivo.trim() || null });
    setEnviando(false);
    if (error) return setErro(error.message.includes("prazo") ? "O prazo de 7 dias para reembolso já passou." : "Não deu para registrar agora. Tente de novo ou escreva para o suporte.");
    setProtocolo((data as { protocolo: string }).protocolo);
    carregar();
  }

  const validade = acesso?.valido_ate ? DATA.format(new Date(acesso.valido_ate)) : null;

  return (
    <section className={ui.card} aria-labelledby="minhas-compras">
      <div className={ui.rowBetween}>
        <h2 id="minhas-compras" className={ui.h2}>
          Acesso e compras
        </h2>
        {acesso && (
          <span className={`${ui.badge} ${acesso.ativo ? ui.badgeOk : ui.badgeRed}`}>
            {cargo ? "Equipe" : acesso.ativo ? "Ativo" : acesso.status === "bloqueado" ? "Bloqueado" : "Inativo"}
          </span>
        )}
      </div>

      <p className={ui.muted}>
        {cargo
          ? "Seu acesso vem do cargo na equipe."
          : acesso?.ativo
            ? validade
              ? `Seu acesso vale até ${validade}. Não há renovação automática: para continuar, pague um novo plano antes dessa data.`
              : "Seu acesso está ativo, sem data de fim."
            : "Você não tem acesso ativo no momento."}
      </p>
      {!cargo && (
        <Link href="/assinar" className={ui.btnSm}>
          {acesso?.ativo ? "Renovar ou trocar de plano" : "Assinar um plano"}
        </Link>
      )}

      <h3 className={ui.h2} style={{ marginTop: 18 }}>
        Minhas compras
      </h3>
      {compras === null ? (
        <p className={ui.muted}>Carregando…</p>
      ) : compras.length === 0 ? (
        <p className={ui.muted}>Nenhuma compra ligada a este e-mail.</p>
      ) : (
        <ul className={ui.list}>
          {compras.map((c) => (
            <li key={c.id} className={ui.row}>
              <span className={ui.rowMain}>
                <b>
                  {c.produto} · {BRL.format(Number(c.valor))}
                </b>
                <small>
                  {DATA.format(new Date(c.criado_em))} · Pedido {c.pedido} · {STATUS[c.status] ?? c.status}
                  {c.reembolso_protocolo && ` · Reembolso pedido (protocolo ${c.reembolso_protocolo})`}
                </small>
              </span>
              {c.pode_reembolsar && (
                <button
                  type="button"
                  className={ui.btnSm}
                  onClick={() => {
                    setPedir(c);
                    setMotivo("");
                    setErro("");
                    setProtocolo(null);
                  }}
                >
                  Pedir reembolso
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className={ui.small}>
        Você pode desistir em até 7 dias após o pagamento e receber o valor integral, sem precisar explicar o motivo (CDC, art. 49).
      </p>

      {pedir && (
        <Modal title={protocolo ? "Pedido registrado" : "Pedir reembolso"} onClose={() => setPedir(null)}>
          {protocolo ? (
            <div style={{ display: "grid", gap: 12 }}>
              <p style={{ margin: 0 }}>
                Recebemos seu pedido. Protocolo: <b>{protocolo}</b>.
              </p>
              <p className={ui.muted} style={{ margin: 0 }}>
                O valor de {BRL.format(Number(pedir.valor))} volta pelo mesmo meio de pagamento, e o acesso é encerrado quando o
                reembolso for feito. Guarde o protocolo.
              </p>
              <button type="button" className={ui.btnGold} onClick={() => setPedir(null)}>
                Fechar
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <p style={{ margin: 0 }}>
                {pedir.produto} · {BRL.format(Number(pedir.valor))} · pago em {DATA.format(new Date(pedir.criado_em))}
              </p>
              <label className={ui.field}>
                <span>Quer contar o motivo? (opcional)</span>
                <input className={ui.input} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} />
              </label>
              {erro && (
                <p className={ui.muted} role="alert" style={{ color: "var(--erro-t)", margin: 0 }}>
                  {erro}
                </p>
              )}
              <button type="button" className={ui.btnGold} disabled={enviando} onClick={confirmar}>
                {enviando ? "Enviando…" : "Confirmar pedido de reembolso"}
              </button>
            </div>
          )}
        </Modal>
      )}
    </section>
  );
}
