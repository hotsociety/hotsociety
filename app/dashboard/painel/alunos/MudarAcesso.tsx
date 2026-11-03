"use client";

import { useState } from "react";
import { Modal, toast } from "../../../_components/membros/Toast";
import { supabase } from "../../../_lib/supabase";
import { erroAmigavel, type Aluno } from "../../../_lib/painel";

export type Acao = { aluno: Pick<Aluno, "id" | "email">; tipo: "ativo" | "bloqueado" };

export default function MudarAcesso({ acao, onClose, onFeito }: { acao: Acao; onClose: () => void; onFeito: () => void }) {
  const liberar = acao.tipo === "ativo";
  const [dias, setDias] = useState("30");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (motivo.trim().length < 4) return setErro("Escreva o motivo (fica no histórico).");
    setSalvando(true);
    const { error } = await supabase.rpc("definir_acesso", {
      p_user: acao.aluno.id,
      p_status: acao.tipo,
      p_dias: liberar && dias ? Number(dias) : null,
      p_motivo: motivo.trim(),
    });
    setSalvando(false);
    if (error) return setErro(erroAmigavel(error));
    toast(liberar ? "Acesso liberado" : "Acesso bloqueado");
    onFeito();
  }

  return (
    <Modal title={liberar ? "Liberar acesso" : "Bloquear acesso"} onClose={onClose}>
      <form className="hs-pn-form" onSubmit={salvar}>
        <p style={{ margin: 0 }}>
          {liberar ? "Liberar" : "Bloquear"} <b style={{ overflowWrap: "anywhere" }}>{acao.aluno.email}</b>
        </p>
        {liberar && (
          <label className="hs-pn-fld">
            Por quanto tempo
            <select className="hs-pn-sel" value={dias} onChange={(e) => setDias(e.target.value)}>
              <option value="7">7 dias</option>
              <option value="30">30 dias</option>
              <option value="365">1 ano</option>
              <option value="">Sem prazo</option>
            </select>
          </label>
        )}
        <label className="hs-pn-fld">
          Motivo
          <input
            className="hs-pn-in"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={300}
            placeholder={liberar ? "Ex.: pagou por Pix direto, comprovante no WhatsApp" : "Ex.: compartilhando a conta"}
            required
          />
        </label>
        {!liberar && <p className="hs-pn-nota">O aluno perde o acesso na hora. O progresso dele fica guardado.</p>}
        {erro && <p className="hs-pn-erro">{erro}</p>}
        <div className="hs-pn-bar">
          <button type="submit" className={"hs-pn-btn " + (liberar ? "hs-pn-btn-p" : "hs-pn-btn-d")} disabled={salvando}>
            {salvando ? "Salvando…" : liberar ? "Liberar" : "Bloquear"}
          </button>
          <button type="button" className="hs-pn-btn" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
