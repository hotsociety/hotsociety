"use client";

import { useEffect, useState } from "react";
import Conversa, { STATUS_CHAMADO } from "../../../_components/membros/Chamado";
import { supabase } from "../../../_lib/supabase";
import { dataHora, erroAmigavel } from "../../../_lib/painel";

type Linha = {
  id: string;
  protocolo: string;
  email: string;
  nome: string | null;
  tema: string;
  assunto: string;
  status: "aberto" | "respondido" | "resolvido";
  criado_em: string;
  atualizado_em: string;
  msgs: number;
  ultima_do_aluno: boolean;
};

const COR: Record<string, string> = { aberto: "pendente", respondido: "ativo", resolvido: "sem" };

// Fila de chamados. Prazo de resposta do SAC: até 5 dias (Decreto 7.962/2013).
export default function Chamados() {
  const [status, setStatus] = useState<string>("aberto");
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const [lista, setLista] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setTermo(busca.trim().slice(0, 80)), 350);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    let vivo = true;
    setLista(null);
    supabase.rpc("painel_chamados", { p_status: status || null, p_busca: termo || null, p_limite: 200 }).then(({ data, error }) => {
      if (!vivo) return;
      setErro(error ? erroAmigavel(error) : "");
      setLista((data ?? []) as Linha[]);
    });
    return () => {
      vivo = false;
    };
  }, [status, termo, n]);

  const agora = Date.now();
  const atrasado = (l: Linha) => l.status === "aberto" && agora - new Date(l.atualizado_em).getTime() > 3 * 86400e3;

  return (
    <>
      <div className="hs-pn-bar">
        <input className="hs-pn-in" type="search" placeholder="Buscar por e-mail, protocolo ou assunto" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar chamados" />
        <select className="hs-pn-sel" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por status">
          <option value="aberto">Aguardando equipe</option>
          <option value="respondido">Respondidos</option>
          <option value="resolvido">Resolvidos</option>
          <option value="">Todos</option>
        </select>
      </div>
      {erro && <p className="hs-pn-erro">{erro}</p>}

      <div className="hs-pn-tw">
        <table className="hs-pn-t">
          <thead>
            <tr>
              <th>Protocolo</th>
              <th>Aluno</th>
              <th>Assunto</th>
              <th>Status</th>
              <th>Última atividade</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {lista?.map((l) => (
              <tr key={l.id}>
                <td className="hs-pn-mono nw">{l.protocolo}</td>
                <td>
                  {l.nome || "—"}
                  <small style={{ overflowWrap: "anywhere" }}>{l.email}</small>
                </td>
                <td>
                  {l.assunto}
                  <small>
                    {l.tema} · {l.msgs} {l.msgs === 1 ? "mensagem" : "mensagens"}
                  </small>
                </td>
                <td>
                  <span className={"hs-pn-st " + COR[l.status]}>{STATUS_CHAMADO[l.status]}</span>
                  {atrasado(l) && <span className="hs-pn-alerta">Há mais de 3 dias sem resposta</span>}
                </td>
                <td className="nw">{dataHora(l.atualizado_em)}</td>
                <td>
                  <div className="hs-pn-acts">
                    <button type="button" className="hs-pn-btn hs-pn-btn-sm hs-pn-btn-p" onClick={() => setAberto(l.id)}>
                      {l.status === "aberto" ? "Responder" : "Abrir"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lista === null && <p className="hs-pn-vazio">Carregando chamados…</p>}
        {lista?.length === 0 && <p className="hs-pn-vazio">{status === "aberto" ? "Nenhum chamado esperando resposta." : "Nenhum chamado encontrado."}</p>}
      </div>
      <p className="hs-pn-nota">Prazo legal de resposta: até 5 dias. A resposta vai para o aluno aqui no site e por e-mail.</p>

      {aberto && <Conversa id={aberto} equipe onClose={() => setAberto(null)} onMudou={() => setN((x) => x + 1)} />}
    </>
  );
}
