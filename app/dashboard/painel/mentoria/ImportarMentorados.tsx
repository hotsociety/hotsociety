"use client";

import { useState } from "react";
import { Modal, toast } from "../../../_components/membros/Toast";
import { supabase } from "../../../_lib/supabase";

type Turma = { id: string; nome: string; ativa: boolean };
type Resultado = { email: string; status: "liberado" | "conta_criada" | "erro"; detalhe?: string };

const ROTULO: Record<Resultado["status"], { t: string; c: string }> = {
  conta_criada: { t: "Conta criada + liberado", c: "ativo" },
  liberado: { t: "Liberado", c: "ativo" },
  erro: { t: "Erro", c: "bloqueado" },
};

// Coloca de uma vez quem JÁ é mentorado (fechou por fora). Cria a conta se precisar e manda o link de entrada.
export default function ImportarMentorados({ turmas, onClose, onFeito }: { turmas: Turma[]; onClose: () => void; onFeito: () => void }) {
  const [linhas, setLinhas] = useState("");
  const [turma, setTurma] = useState(turmas.find((t) => t.ativa)?.id ?? "");
  const [acesso, setAcesso] = useState("365");
  const [avisar, setAvisar] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [res, setRes] = useState<Resultado[] | null>(null);

  const qtd = new Set((linhas.match(/[^\s<>,;"'()]+@[^\s<>,;"'()]+\.[a-z]{2,}/gi) ?? []).map((e) => e.toLowerCase())).size;

  async function importar(e: React.FormEvent) {
    e.preventDefault();
    if (!qtd) return setErro("Cole pelo menos um e-mail (um por linha).");
    if (qtd > 50) return setErro("No máximo 50 por vez. Divida a lista.");
    setErro("");
    setSalvando(true);
    const { data: s } = await supabase.auth.getSession();
    const r = await fetch("/api/mentoria/importar", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token ?? ""}` },
      body: JSON.stringify({ linhas, turma: turma || null, acessoDias: acesso === "nao" ? "nao" : acesso ? Number(acesso) : null, avisar }),
    }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { resultados?: Resultado[]; erro?: string } | null;
    setSalvando(false);
    if (!r?.ok || !j?.resultados) return setErro(j?.erro ?? "Não deu para importar agora. Tente de novo.");
    setRes(j.resultados);
    const ok = j.resultados.filter((x) => x.status !== "erro").length;
    toast(`${ok} mentorado${ok === 1 ? "" : "s"} liberado${ok === 1 ? "" : "s"}`);
  }

  if (res) {
    const erros = res.filter((x) => x.status === "erro").length;
    return (
      <Modal title="Importação concluída" onClose={onFeito}>
        <div className="hs-pn-form">
          <p style={{ margin: 0 }}>
            {res.length - erros} de {res.length} liberados{erros ? ` · ${erros} com erro` : ""}.
          </p>
          <div className="hs-pn-tw" style={{ maxHeight: 320, overflow: "auto" }}>
            <table className="hs-pn-t">
              <tbody>
                {res.map((x) => (
                  <tr key={x.email}>
                    <td style={{ overflowWrap: "anywhere" }}>
                      {x.email}
                      {x.detalhe && <small>{x.detalhe}</small>}
                    </td>
                    <td className="nw">
                      <span className={"hs-pn-st " + ROTULO[x.status].c}>{ROTULO[x.status].t}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="hs-pn-bar">
            <button type="button" className="hs-pn-btn hs-pn-btn-p" onClick={onFeito}>
              Fechar
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Importar quem já é mentorado" onClose={onClose}>
      <form className="hs-pn-form" onSubmit={importar}>
        <p className="hs-pn-nota" style={{ margin: 0 }}>
          Para quem já fechou a mentoria por fora (Pix, WhatsApp, contrato). Não precisa ter conta: o sistema cria e manda o link para a pessoa criar a senha.
        </p>
        <label className="hs-pn-fld">
          E-mails (um por linha, pode ter o nome junto)
          <textarea
            className="hs-pn-in"
            rows={7}
            value={linhas}
            onChange={(e) => setLinhas(e.target.value)}
            placeholder={"joao@gmail.com\nMaria Souza, maria@hotmail.com\nPedro <pedro@icloud.com>"}
            style={{ resize: "vertical", fontFamily: "inherit" }}
          />
          <small>{qtd ? `${qtd} e-mail${qtd === 1 ? "" : "s"} na lista` : "Até 50 por vez"}</small>
        </label>
        <label className="hs-pn-fld">
          Turma
          <select className="hs-pn-sel" value={turma} onChange={(e) => setTurma(e.target.value)}>
            <option value="">Sem turma (só calls 1:1 e conversa privada)</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
                {t.ativa ? "" : " (encerrada)"}
              </option>
            ))}
          </select>
        </label>
        <label className="hs-pn-fld">
          Acesso à plataforma (cursos e área de membros)
          <select className="hs-pn-sel" value={acesso} onChange={(e) => setAcesso(e.target.value)}>
            <option value="90">3 meses</option>
            <option value="180">6 meses</option>
            <option value="365">1 ano</option>
            <option value="">Sem prazo</option>
            <option value="nao">Não mexer (só se já tiver assinatura)</option>
          </select>
          <small>Quem já tem acesso maior continua com o dele. Sem acesso, o mentorado não consegue entrar na plataforma.</small>
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
          <input type="checkbox" checked={avisar} onChange={(e) => setAvisar(e.target.checked)} />
          Mandar e-mail de boas-vindas com o link de entrada
        </label>
        {erro && <p className="hs-pn-erro">{erro}</p>}
        <div className="hs-pn-bar">
          <button type="submit" className="hs-pn-btn hs-pn-btn-p" disabled={salvando || !qtd}>
            {salvando ? `Importando ${qtd}…` : `Importar ${qtd || ""}`.trim()}
          </button>
          <button type="button" className="hs-pn-btn" onClick={onClose} disabled={salvando}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
