"use client";

import { useEffect, useState } from "react";
import { Modal, toast } from "../../../_components/membros/Toast";
import { supabase } from "../../../_lib/supabase";
import { data, erroAmigavel, reais0 } from "../../../_lib/painel";

type Pedido = {
  id: string;
  protocolo: string;
  placa: string;
  nome_placa: string;
  email: string;
  whatsapp: string;
  cep: string;
  endereco: string;
  cidade_uf: string;
  faturado: number | string;
  status: string;
  rastreio: string | null;
  obs: string | null;
  criado_em: string;
};

const STATUS: Record<string, string> = { recebido: "Recebido", producao: "Em produção", enviado: "Enviada", entregue: "Entregue", recusado: "Recusado" };
const COR: Record<string, string> = { recebido: "pendente", producao: "pendente", enviado: "ativo", entregue: "ativo", recusado: "bloqueado" };
const cep = (c: string) => c.replace(/^(\d{5})(\d{3})$/, "$1-$2");
const fone = (f: string) => f.replace(/^(?:55)?(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3");

export default function Placas() {
  const [filtro, setFiltro] = useState("");
  const [lista, setLista] = useState<Pedido[] | null>(null);
  const [erro, setErro] = useState("");
  const [edit, setEdit] = useState<Pedido | null>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    let vivo = true;
    setLista(null);
    supabase.rpc("painel_placas", { p_status: filtro || null }).then(({ data, error }) => {
      if (!vivo) return;
      setErro(error ? erroAmigavel(error) : "");
      setLista((data ?? []) as Pedido[]);
    });
    return () => {
      vivo = false;
    };
  }, [filtro, n]);

  return (
    <>
      <div className="hs-pn-bar">
        <select className="hs-pn-sel" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar por status">
          <option value="">Todos</option>
          {Object.entries(STATUS).map(([k, t]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
        </select>
      </div>
      {erro && <p className="hs-pn-erro">{erro}</p>}

      <div className="hs-pn-tw">
        <table className="hs-pn-t">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Aluno</th>
              <th>Endereço</th>
              <th className="n">Faturado no pedido</th>
              <th>Status</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {lista?.map((p) => (
              <tr key={p.id}>
                <td>
                  <b>Placa {p.placa}</b>
                  <small className="hs-pn-mono">{p.protocolo}</small>
                  <small>{data(p.criado_em)}</small>
                </td>
                <td>
                  &ldquo;{p.nome_placa}&rdquo;
                  <small style={{ overflowWrap: "anywhere" }}>{p.email}</small>
                  <small>{fone(p.whatsapp)}</small>
                </td>
                <td style={{ maxWidth: 260 }}>
                  {p.endereco}
                  <small>
                    {p.cidade_uf} · CEP {cep(p.cep)}
                  </small>
                </td>
                <td className="n">{reais0(p.faturado)}</td>
                <td>
                  <span className={"hs-pn-st " + COR[p.status]}>{STATUS[p.status] ?? p.status}</span>
                  {p.rastreio && <small>Rastreio {p.rastreio}</small>}
                  {p.obs && <small>{p.obs}</small>}
                </td>
                <td>
                  <div className="hs-pn-acts">
                    <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => setEdit(p)}>
                      Atualizar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lista === null && <p className="hs-pn-vazio">Carregando pedidos…</p>}
        {lista?.length === 0 && <p className="hs-pn-vazio">Nenhum pedido de placa.</p>}
      </div>
      <p className="hs-pn-nota">O pedido só é aceito quando o faturamento verificado do aluno bate a meta da placa. O endereço é dado pessoal: use só para o envio.</p>

      {edit && (
        <Atualizar
          p={edit}
          onClose={() => setEdit(null)}
          onFeito={() => {
            setEdit(null);
            setN((x) => x + 1);
          }}
        />
      )}
    </>
  );
}

function Atualizar({ p, onClose, onFeito }: { p: Pedido; onClose: () => void; onFeito: () => void }) {
  const [status, setStatus] = useState(p.status);
  const [rastreio, setRastreio] = useState(p.rastreio ?? "");
  const [obs, setObs] = useState(p.obs ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (status === "recusado" && obs.trim().length < 4) return setErro("Escreva o motivo da recusa (o aluno vê).");
    setSalvando(true);
    const { error } = await supabase.rpc("atualizar_placa", { p_id: p.id, p_status: status, p_rastreio: rastreio, p_obs: obs });
    setSalvando(false);
    if (error) return setErro(erroAmigavel(error));
    toast("Pedido atualizado");
    onFeito();
  }

  return (
    <Modal title={`Placa ${p.placa} · ${p.protocolo}`} onClose={onClose}>
      <form className="hs-pn-form" onSubmit={salvar}>
        <label className="hs-pn-fld">
          Status
          <select className="hs-pn-sel" value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(STATUS).map(([k, t]) => (
              <option key={k} value={k}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="hs-pn-fld">
          Código de rastreio
          <input className="hs-pn-in" value={rastreio} onChange={(e) => setRastreio(e.target.value)} maxLength={80} placeholder="Ex.: AB123456789BR" />
        </label>
        <label className="hs-pn-fld">
          Observação (o aluno vê)
          <input className="hs-pn-in" value={obs} onChange={(e) => setObs(e.target.value)} maxLength={300} />
        </label>
        {erro && <p className="hs-pn-erro">{erro}</p>}
        <div className="hs-pn-bar">
          <button type="submit" className="hs-pn-btn hs-pn-btn-p" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
          <button type="button" className="hs-pn-btn" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
