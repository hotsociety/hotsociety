"use client";

import { useState } from "react";
import { useMembro } from "../../_components/membros/MemberContext";
import { Modal, toast } from "../../_components/membros/Toast";
import { postApi } from "../../_lib/api";
import { SITE } from "../../_lib/site";
import { supabase } from "../../_lib/supabase";
import "../../_components/membros/ui.css";
import ui from "../../_components/membros/ui.styles";

// Direitos do titular (LGPD art. 18): cópia dos dados e exclusão da conta.
export default function MeusDados() {
  const { cargo, sair } = useMembro();
  const [baixando, setBaixando] = useState(false);
  const [excluir, setExcluir] = useState(false);
  const [conf, setConf] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function baixar() {
    setBaixando(true);
    const { data, error } = await supabase.rpc("meus_dados");
    setBaixando(false);
    if (error) return toast("Não deu para gerar o arquivo agora. Tente de novo.");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meus-dados-hotsociety-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const r = await postApi("/api/conta/excluir", { confirmacao: conf });
    setEnviando(false);
    if (r.erro) return setErro(r.erro);
    await sair();
    window.location.href = "/";
  }

  return (
    <section className={ui.card} aria-labelledby="lgpd">
      <h2 id="lgpd" className={ui.h2}>
        Privacidade e seus dados
      </h2>
      <p className={ui.muted}>
        Você pode baixar uma cópia de tudo o que guardamos sobre você ou excluir a sua conta. Dúvidas: {SITE.privacidadeEmail}.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" className={ui.btnGhost} onClick={baixar} disabled={baixando}>
          {baixando ? "Gerando…" : "Baixar meus dados"}
        </button>
        {!cargo && (
          <button type="button" className={ui.btnGhost} style={{ borderColor: "#6e2a2a", color: "#ff9b9b" }} onClick={() => setExcluir(true)}>
            Excluir minha conta
          </button>
        )}
      </div>

      {excluir && (
        <Modal title="Excluir minha conta" onClose={() => setExcluir(false)}>
          <form onSubmit={confirmar} style={{ display: "grid", gap: 12 }}>
            <p style={{ margin: 0 }}>Isto não tem volta. Apagamos na hora:</p>
            <ul className={ui.muted} style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              <li>seu login, perfil, XP, progresso e conquistas;</li>
              <li>seus chamados, pedidos de placa e comprovantes enviados.</li>
            </ul>
            <p className={ui.muted} style={{ margin: 0 }}>
              Se você tem acesso ativo, ele acaba junto, sem reembolso do tempo restante. Para pedir reembolso dentro dos 7 dias, faça isso antes em &ldquo;Acesso e
              compras&rdquo;. Os registros de compra ficam guardados pelo prazo da lei fiscal.
            </p>
            <label className={ui.field}>
              <span>Digite EXCLUIR para confirmar</span>
              <input className={ui.input} value={conf} onChange={(e) => setConf(e.target.value)} autoComplete="off" />
            </label>
            {erro && (
              <p className={ui.muted} role="alert" style={{ color: "#ff9b9b", margin: 0 }}>
                {erro}
              </p>
            )}
            <button type="submit" className={ui.btnGold} style={{ background: "#7a2222", color: "#fff" }} disabled={enviando || conf.trim().toUpperCase() !== "EXCLUIR"}>
              {enviando ? "Excluindo…" : "Excluir minha conta para sempre"}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
