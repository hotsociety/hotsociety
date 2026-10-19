"use client";

import { useEffect, useState } from "react";
import { useMembro } from "../../../_components/membros/MemberContext";
import { Modal, toast } from "../../../_components/membros/Toast";
import { supabase } from "../../../_lib/supabase";
import { data, erroAmigavel, reais } from "../../../_lib/painel";

type Comp = {
  id: string;
  user_id: string;
  email: string;
  nome: string | null;
  faturado_atual: number | string | null;
  plataforma: string;
  periodo: string;
  valor_declarado: number | string;
  arquivos: string[];
  obs_aluno: string | null;
  status: "pendente" | "aprovado" | "recusado";
  valor_aprovado: number | string | null;
  resposta: string | null;
  criado_em: string;
  analisado_em: string | null;
};

const STATUS: Record<string, string> = { pendente: "Em análise", aprovado: "Aprovado", recusado: "Recusado" };
const COR: Record<string, string> = { pendente: "pendente", aprovado: "ativo", recusado: "bloqueado" };

function paraNumero(t: string) {
  const s = t.replace(/[^\d,.]/g, "");
  const n = s.includes(",") ? Number(s.replace(/\./g, "").replace(",", ".")) : Number(s);
  return Number.isFinite(n) ? n : NaN;
}

// Abre o arquivo por um link temporário (60 s). A pasta é privada.
async function abrir(caminho: string) {
  const { data: d, error } = await supabase.storage.from("comprovantes").createSignedUrl(caminho, 60);
  if (error || !d) return toast("Não deu para abrir o arquivo.");
  window.open(d.signedUrl, "_blank", "noopener,noreferrer");
}

export default function Faturamento() {
  const { user } = useMembro();
  const [status, setStatus] = useState("pendente");
  const [lista, setLista] = useState<Comp[] | null>(null);
  const [erro, setErro] = useState("");
  const [sel, setSel] = useState<Comp | null>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    let vivo = true;
    setLista(null);
    supabase.rpc("painel_comprovantes", { p_status: status || null }).then(({ data, error }) => {
      if (!vivo) return;
      setErro(error ? erroAmigavel(error) : "");
      setLista((data ?? []) as Comp[]);
    });
    return () => {
      vivo = false;
    };
  }, [status, n]);

  return (
    <>
      <div className="hs-pn-bar">
        <select className="hs-pn-sel" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por status">
          <option value="pendente">Em análise</option>
          <option value="aprovado">Aprovados</option>
          <option value="recusado">Recusados</option>
          <option value="">Todos</option>
        </select>
      </div>
      {erro && <p className="hs-pn-erro">{erro}</p>}

      <div className="hs-pn-tw">
        <table className="hs-pn-t">
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Período</th>
              <th className="n">Declarado</th>
              <th className="n">Verificado hoje</th>
              <th>Arquivos</th>
              <th>Status</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {lista?.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.nome || "—"}
                  <small style={{ overflowWrap: "anywhere" }}>{c.email}</small>
                </td>
                <td>
                  {c.plataforma} · {c.periodo}
                  <small>Enviado em {data(c.criado_em)}</small>
                  {c.obs_aluno && <small>&ldquo;{c.obs_aluno}&rdquo;</small>}
                </td>
                <td className="n">{reais(c.valor_declarado)}</td>
                <td className="n">{reais(c.faturado_atual)}</td>
                <td>
                  <div className="hs-pn-acts" style={{ justifyContent: "flex-start" }}>
                    {c.arquivos.map((a, i) => (
                      <button key={a} type="button" className="hs-pn-link" onClick={() => abrir(a)}>
                        Arquivo {i + 1}
                      </button>
                    ))}
                  </div>
                </td>
                <td>
                  <span className={"hs-pn-st " + COR[c.status]}>{STATUS[c.status]}</span>
                  {c.valor_aprovado !== null && <small>{reais(c.valor_aprovado)} somados</small>}
                  {c.resposta && <small>{c.resposta}</small>}
                </td>
                <td>
                  {c.status === "pendente" && c.user_id !== user.id && (
                    <div className="hs-pn-acts">
                      <button type="button" className="hs-pn-btn hs-pn-btn-sm hs-pn-btn-p" onClick={() => setSel(c)}>
                        Analisar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lista === null && <p className="hs-pn-vazio">Carregando…</p>}
        {lista?.length === 0 && <p className="hs-pn-vazio">{status === "pendente" ? "Nenhum comprovante esperando análise." : "Nada por aqui."}</p>}
      </div>
      <p className="hs-pn-nota">
        Confira se o nome do titular bate com o aluno e se o período não foi enviado antes. Ao aprovar, o valor é somado ao faturamento verificado e as escalas e placas
        são liberadas sozinhas.
      </p>

      {sel && (
        <Analisar
          c={sel}
          onClose={() => setSel(null)}
          onFeito={() => {
            setSel(null);
            setN((x) => x + 1);
          }}
        />
      )}
    </>
  );
}

function Analisar({ c, onClose, onFeito }: { c: Comp; onClose: () => void; onFeito: () => void }) {
  const [valor, setValor] = useState(String(c.valor_declarado).replace(".", ","));
  const [resposta, setResposta] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function decidir(aprovar: boolean) {
    setErro("");
    const v = paraNumero(valor);
    if (aprovar && !(v > 0 && v <= Number(c.valor_declarado))) return setErro("O valor aprovado precisa ser maior que zero e no máximo o declarado.");
    if (!aprovar && resposta.trim().length < 4) return setErro("Escreva o motivo da recusa (o aluno vê).");
    setSalvando(true);
    const { error } = await supabase.rpc("analisar_comprovante", { p_id: c.id, p_aprovar: aprovar, p_valor: aprovar ? v : null, p_resposta: resposta });
    setSalvando(false);
    if (error) return setErro(/próprio/.test(error.message) ? "Você não pode aprovar o próprio comprovante." : erroAmigavel(error));
    toast(aprovar ? "Faturamento somado" : "Comprovante recusado");
    onFeito();
  }

  return (
    <Modal title={`${c.plataforma} · ${c.periodo}`} onClose={onClose}>
      <div className="hs-pn-form">
        <p style={{ margin: 0, overflowWrap: "anywhere" }}>
          {c.email} declarou <b>{reais(c.valor_declarado)}</b>. Verificado hoje: {reais(c.faturado_atual)}.
        </p>
        <div className="hs-pn-acts" style={{ justifyContent: "flex-start" }}>
          {c.arquivos.map((a, i) => (
            <button key={a} type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => abrir(a)}>
              Abrir arquivo {i + 1}
            </button>
          ))}
        </div>
        <label className="hs-pn-fld">
          Valor confirmado nos comprovantes (R$)
          <input className="hs-pn-in" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
        </label>
        <label className="hs-pn-fld">
          Mensagem para o aluno (obrigatória se recusar)
          <input className="hs-pn-in" maxLength={500} value={resposta} onChange={(e) => setResposta(e.target.value)} placeholder="Ex.: extrato sem o nome do titular" />
        </label>
        {erro && <p className="hs-pn-erro">{erro}</p>}
        <div className="hs-pn-bar">
          <button type="button" className="hs-pn-btn hs-pn-btn-p" disabled={salvando} onClick={() => decidir(true)}>
            Aprovar e somar
          </button>
          <button type="button" className="hs-pn-btn hs-pn-btn-d" disabled={salvando} onClick={() => decidir(false)}>
            Recusar
          </button>
        </div>
      </div>
    </Modal>
  );
}
