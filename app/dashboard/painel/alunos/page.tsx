"use client";

import { useEffect, useState } from "react";
import { NOME_CARGO, PODE, useMembro } from "../../../_components/membros/MemberContext";
import { supabase } from "../../../_lib/supabase";
import { ACESSO, data, dataHora, erroAmigavel, type Aluno } from "../../../_lib/painel";
import LocalizarAluno from "./LocalizarAluno";
import MudarAcesso, { type Acao } from "./MudarAcesso";


export default function Alunos() {
  const [aba, setAba] = useState<"localizar" | "lista">("localizar");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("aba") === "lista") setAba("lista");
  }, []);
  const trocar = (a: "localizar" | "lista") => {
    setAba(a);
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("aba", a);
      window.history.replaceState(null, "", u);
    } catch {}
  };
  return (
    <>
      <div className="hs-pn-sub" role="tablist" aria-label="Alunos">
        <button type="button" role="tab" aria-selected={aba === "localizar"} onClick={() => trocar("localizar")}>
          Localizar aluno
        </button>
        <button type="button" role="tab" aria-selected={aba === "lista"} onClick={() => trocar("lista")}>
          Todos os alunos
        </button>
      </div>
      {aba === "localizar" ? <LocalizarAluno /> : <ListaAlunos />}
    </>
  );
}

function ListaAlunos() {
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
