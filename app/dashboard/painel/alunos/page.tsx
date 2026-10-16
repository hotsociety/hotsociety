"use client";

import { useEffect, useState } from "react";
import { NOME_CARGO, PODE, useMembro } from "../../../_components/membros/MemberContext";
import { Modal, toast } from "../../../_components/membros/Toast";
import { supabase } from "../../../_lib/supabase";
import { ACESSO, data, dataHora, erroAmigavel, type Aluno } from "../../../_lib/painel";

type Acao = { aluno: Aluno; tipo: "ativo" | "bloqueado" };

export default function Alunos() {
  const { cargo, user } = useMembro();
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const [filtro, setFiltro] = useState<Aluno["acesso"] | "todos">("todos");
  const [lista, setLista] = useState<Aluno[] | null>(null);
  const [erro, setErro] = useState("");
  const [acao, setAcao] = useState<Acao | null>(null);
  const [recarregar, setRecarregar] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setTermo(busca.trim().slice(0, 80)), 350);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    let vivo = true;
    setLista(null);
    supabase.rpc("painel_alunos", { p_busca: termo || null, p_limite: 200 }).then(({ data, error }) => {
      if (!vivo) return;
      setErro(error ? erroAmigavel(error) : "");
      setLista((data ?? []) as Aluno[]);
    });
    return () => {
      vivo = false;
    };
  }, [termo, recarregar]);

  const visiveis = lista?.filter((a) => filtro === "todos" || a.acesso === filtro) ?? null;
  const podeMudar = PODE.mudarAcesso(cargo);

  return (
    <>
      <div className="hs-pn-bar">
        <input
          className="hs-pn-in"
          type="search"
          placeholder="Buscar por e-mail ou nome"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar alunos"
        />
        <select className="hs-pn-sel" value={filtro} onChange={(e) => setFiltro(e.target.value as Aluno["acesso"] | "todos")} aria-label="Filtrar por acesso">
          <option value="todos">Todos</option>
          {Object.entries(ACESSO).map(([k, t]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
        </select>
      </div>
      {!podeMudar && <p className="hs-pn-nota">Seu cargo só consulta. Liberar e bloquear é com Admin ou Suporte.</p>}
      {erro && <p className="hs-pn-erro">{erro}</p>}

      <div className="hs-pn-tw">
        <table className="hs-pn-t">
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Conta criada</th>
              <th>Último login</th>
              <th>Acesso</th>
              <th>Detalhe</th>
              <th className="n">XP</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {visiveis?.map((a) => (
              <tr key={a.id}>
                <td>
                  <div className="hs-pn-cli">
                    <span className="hs-pn-av" aria-hidden="true">
                      {(a.nome || a.email)[0]?.toUpperCase()}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      {a.nome || "—"}
                      <small style={{ overflowWrap: "anywhere" }}>
                        {a.email}
                        {!a.email_confirmado && " · e-mail não confirmado"}
                      </small>
                    </div>
                  </div>
                </td>
                <td>{data(a.criado_em)}</td>
                <td>{a.ultimo_login ? dataHora(a.ultimo_login) : "Nunca"}</td>
                <td>
                  <span className={"hs-pn-st " + (a.acesso === "sem acesso" ? "sem" : a.acesso)}>
                    {a.cargo ? `${ACESSO.equipe} · ${NOME_CARGO[a.cargo]}` : ACESSO[a.acesso]}
                  </span>
                </td>
                <td>
                  {a.cargo
                    ? "Acesso pelo cargo"
                    : a.valido_ate
                      ? `${a.acesso === "vencido" ? "Venceu" : "Até"} ${data(a.valido_ate)}`
                      : a.acesso === "ativo"
                        ? "Sem prazo"
                        : "—"}
                  {a.motivo && <small>{a.motivo}</small>}
                </td>
                <td className="n">{a.xp.toLocaleString("pt-BR")}</td>
                <td>
                  {podeMudar && !a.cargo && a.id !== user.id && (
                    <div className="hs-pn-acts">
                      {a.acesso !== "ativo" && (
                        <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => setAcao({ aluno: a, tipo: "ativo" })}>
                          Liberar
                        </button>
                      )}
                      {a.acesso !== "bloqueado" && a.acesso !== "sem acesso" && (
                        <button type="button" className="hs-pn-btn hs-pn-btn-sm hs-pn-btn-d" onClick={() => setAcao({ aluno: a, tipo: "bloqueado" })}>
                          Bloquear
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visiveis === null && <p className="hs-pn-vazio">Carregando alunos…</p>}
        {visiveis?.length === 0 && <p className="hs-pn-vazio">Nenhum aluno encontrado.</p>}
      </div>
      <p className="hs-pn-nota">Mostra até 200 contas, das mais novas para as mais antigas. Use a busca para achar uma conta específica.</p>

      {acao && (
        <MudarAcesso
          acao={acao}
          onClose={() => setAcao(null)}
          onFeito={() => {
            setAcao(null);
            setRecarregar((n) => n + 1);
          }}
        />
      )}
    </>
  );
}

function MudarAcesso({ acao, onClose, onFeito }: { acao: Acao; onClose: () => void; onFeito: () => void }) {
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
