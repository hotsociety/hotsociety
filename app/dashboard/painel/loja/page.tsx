"use client";

import { useEffect, useState } from "react";
import { PODE, useMembro } from "../../../_components/membros/MemberContext";
import { Modal, toast } from "../../../_components/membros/Toast";
import { data, erroAmigavel } from "../../../_lib/painel";
import { supabase } from "../../../_lib/supabase";

type Resgate = {
  id: string;
  protocolo: string;
  email: string;
  titulo: string;
  coins: number;
  tamanho: string | null;
  endereco: { cep?: string; endereco?: string; cidade_uf?: string; whatsapp?: string } | null;
  status: string;
  rastreio: string | null;
  criado_em: string;
};
type Cupom = { codigo: string; desconto: number; planos: string[]; validade: string | null; max_usos: number | null; usos: number; ativo: boolean };

const ST: Record<string, string> = { recebido: "Separar e enviar", enviado: "Enviado", entregue: "Entregue", cancelado: "Cancelado" };
const COR: Record<string, string> = { recebido: "pendente", enviado: "ativo", entregue: "ativo", cancelado: "bloqueado" };

// Resgates da Hot Store (Admin e Suporte) e cupons de desconto (Admin e Financeiro).
export default function Loja() {
  const { cargo } = useMembro();
  const verResgates = PODE.verPlacas(cargo);
  const verCupons = PODE.verValores(cargo);
  const [resgates, setResgates] = useState<Resgate[] | null>(null);
  const [cupons, setCupons] = useState<Cupom[] | null>(null);
  const [erro, setErro] = useState("");
  const [editR, setEditR] = useState<Resgate | null>(null);
  const [editC, setEditC] = useState<Cupom | "novo" | null>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    let vivo = true;
    if (verResgates)
      supabase.rpc("painel_resgates", { p_status: null }).then(({ data, error }) => {
        if (!vivo) return;
        if (error) setErro(erroAmigavel(error));
        setResgates((data ?? []) as Resgate[]);
      });
    if (verCupons)
      supabase.rpc("painel_cupons").then(({ data, error }) => {
        if (!vivo) return;
        if (error) setErro(erroAmigavel(error));
        setCupons((data ?? []) as Cupom[]);
      });
    return () => {
      vivo = false;
    };
  }, [n, verResgates, verCupons]);

  const recarregar = () => setN((x) => x + 1);

  return (
    <>
      {erro && <p className="hs-pn-erro">{erro}</p>}

      {verResgates && (
        <>
          <h2 style={{ margin: "4px 0 0", font: "800 18px/1.2 var(--f-d)" }}>Resgates com Cappu Coins</h2>
          <div className="hs-pn-tw">
            <table className="hs-pn-t">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Aluno</th>
                  <th>Entrega</th>
                  <th>Status</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {resgates?.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.titulo}</b>
                      {r.tamanho && <small>Tamanho {r.tamanho}</small>}
                      <small className="hs-pn-mono">
                        {r.protocolo} · {data(r.criado_em)}
                      </small>
                    </td>
                    <td style={{ overflowWrap: "anywhere" }}>
                      {r.email}
                      {r.endereco?.whatsapp && <small>WhatsApp {r.endereco.whatsapp}</small>}
                    </td>
                    <td style={{ maxWidth: 260 }}>
                      {r.endereco?.endereco ?? "—"}
                      {r.endereco && (
                        <small>
                          {r.endereco.cidade_uf} · CEP {r.endereco.cep?.replace(/^(\d{5})(\d{3})$/, "$1-$2")}
                        </small>
                      )}
                    </td>
                    <td>
                      <span className={"hs-pn-st " + COR[r.status]}>{ST[r.status] ?? r.status}</span>
                      {r.rastreio && <small>Rastreio {r.rastreio}</small>}
                    </td>
                    <td>
                      {r.status !== "cancelado" && (
                        <div className="hs-pn-acts">
                          <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => setEditR(r)}>
                            Atualizar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {resgates === null && <p className="hs-pn-vazio">Carregando…</p>}
            {resgates?.length === 0 && <p className="hs-pn-vazio">Nenhum resgate de produto físico.</p>}
          </div>
          <p className="hs-pn-nota">Cancelar um resgate devolve as coins ao aluno.</p>
        </>
      )}

      {verCupons && (
        <>
          <div className="hs-pn-bar" style={{ justifyContent: "space-between", marginTop: 8 }}>
            <h2 style={{ margin: 0, font: "800 18px/1.2 var(--f-d)" }}>Cupons de desconto</h2>
            <button type="button" className="hs-pn-btn hs-pn-btn-p hs-pn-btn-sm" onClick={() => setEditC("novo")}>
              Criar cupom
            </button>
          </div>
          <div className="hs-pn-tw">
            <table className="hs-pn-t" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th className="n">Desconto</th>
                  <th>Planos</th>
                  <th>Validade</th>
                  <th className="n">Usos</th>
                  <th>Status</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {cupons?.map((c) => (
                  <tr key={c.codigo}>
                    <td className="hs-pn-mono">{c.codigo}</td>
                    <td className="n">{c.desconto}%</td>
                    <td>{c.planos.join(", ")}</td>
                    <td className="nw">{c.validade ? data(c.validade) : "Sem prazo"}</td>
                    <td className="n">
                      {c.usos}
                      {c.max_usos ? ` / ${c.max_usos}` : ""}
                    </td>
                    <td>
                      <span className={"hs-pn-st " + (c.ativo ? "ativo" : "sem")}>{c.ativo ? "Ativo" : "Desligado"}</span>
                    </td>
                    <td>
                      <div className="hs-pn-acts">
                        <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => setEditC(c)}>
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cupons?.length === 0 && <p className="hs-pn-vazio">Nenhum cupom criado.</p>}
          </div>
          <p className="hs-pn-nota">
            Link pronto para divulgar: hotsociety.com.br/assinar?plano=anual&amp;cupom=CODIGO. O uso só conta quando o Pix é pago.
          </p>
        </>
      )}

      {editR && (
        <AtualizarResgate
          r={editR}
          onClose={() => setEditR(null)}
          onFeito={() => {
            setEditR(null);
            recarregar();
          }}
        />
      )}
      {editC && (
        <EditarCupom
          c={editC === "novo" ? null : editC}
          onClose={() => setEditC(null)}
          onFeito={() => {
            setEditC(null);
            recarregar();
          }}
        />
      )}
    </>
  );
}

function AtualizarResgate({ r, onClose, onFeito }: { r: Resgate; onClose: () => void; onFeito: () => void }) {
  const [status, setStatus] = useState(r.status);
  const [rastreio, setRastreio] = useState(r.rastreio ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const { error } = await supabase.rpc("atualizar_resgate", { p_id: r.id, p_status: status, p_rastreio: rastreio });
    setSalvando(false);
    if (error) return setErro(erroAmigavel(error));
    toast(status === "cancelado" ? "Cancelado e coins devolvidas" : "Resgate atualizado");
    onFeito();
  }

  return (
    <Modal title={`${r.titulo} · ${r.protocolo}`} onClose={onClose}>
      <form className="hs-pn-form" onSubmit={salvar}>
        <label className="hs-pn-fld">
          Status
          <select className="hs-pn-sel" value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(ST).map(([k, t]) => (
              <option key={k} value={k}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="hs-pn-fld">
          Código de rastreio
          <input className="hs-pn-in" value={rastreio} onChange={(e) => setRastreio(e.target.value)} maxLength={80} />
        </label>
        {status === "cancelado" && <p className="hs-pn-nota">As {r.coins.toLocaleString("pt-BR")} coins voltam para o aluno.</p>}
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

function EditarCupom({ c, onClose, onFeito }: { c: Cupom | null; onClose: () => void; onFeito: () => void }) {
  const [codigo, setCodigo] = useState(c?.codigo ?? "");
  const [desconto, setDesconto] = useState(String(c?.desconto ?? 10));
  const [mensal, setMensal] = useState(c ? c.planos.includes("mensal") : true);
  const [anual, setAnual] = useState(c ? c.planos.includes("anual") : true);
  const [validade, setValidade] = useState(c?.validade ? c.validade.slice(0, 10) : "");
  const [max, setMax] = useState(c?.max_usos ? String(c.max_usos) : "");
  const [ativo, setAtivo] = useState(c?.ativo ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const d = Number(desconto);
    if (!/^[A-Z0-9]{3,20}$/.test(codigo)) return setErro("Código com 3 a 20 letras ou números, sem espaço.");
    if (!(d >= 1 && d <= 90)) return setErro("Desconto entre 1% e 90%.");
    if (!mensal && !anual) return setErro("Escolha pelo menos um plano.");
    setSalvando(true);
    const { error } = await supabase.rpc("salvar_cupom", {
      p_codigo: codigo,
      p_desconto: d,
      p_planos: [...(mensal ? ["mensal"] : []), ...(anual ? ["anual"] : [])],
      p_validade: validade ? new Date(validade + "T23:59:59-03:00").toISOString() : null,
      p_max_usos: max ? Number(max) : null,
      p_ativo: ativo,
    });
    setSalvando(false);
    if (error) return setErro(erroAmigavel(error));
    toast("Cupom salvo");
    onFeito();
  }

  return (
    <Modal title={c ? `Cupom ${c.codigo}` : "Criar cupom"} onClose={onClose}>
      <form className="hs-pn-form" onSubmit={salvar}>
        <div className="hs-pn-form2">
          <label className="hs-pn-fld">
            Código
            <input className="hs-pn-in" value={codigo} disabled={!!c} onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20))} placeholder="BEMVINDO" />
          </label>
          <label className="hs-pn-fld">
            Desconto (%)
            <input className="hs-pn-in" inputMode="numeric" value={desconto} onChange={(e) => setDesconto(e.target.value.replace(/\D/g, "").slice(0, 2))} />
          </label>
          <label className="hs-pn-fld">
            Vale até (opcional)
            <input className="hs-pn-in" type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
          </label>
          <label className="hs-pn-fld">
            Máximo de usos (opcional)
            <input className="hs-pn-in" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, "").slice(0, 6))} />
          </label>
        </div>
        <div className="hs-pn-bar">
          <label className="hs-pn-nota" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={mensal} onChange={(e) => setMensal(e.target.checked)} /> Mensal
          </label>
          <label className="hs-pn-nota" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={anual} onChange={(e) => setAnual(e.target.checked)} /> Anual
          </label>
          <label className="hs-pn-nota" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Ativo
          </label>
        </div>
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
