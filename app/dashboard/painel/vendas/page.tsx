"use client";

import { useCallback, useEffect, useState } from "react";
import { PODE, useMembro } from "../../../_components/membros/MemberContext";
import { Modal, toast } from "../../../_components/membros/Toast";
import { supabase } from "../../../_lib/supabase";
import {
  METODO,
  STATUS_VENDA,
  data,
  dataHora,
  erroAmigavel,
  hora,
  mascararEmail,
  nomeCurto,
  reais,
  type StatusVenda,
  type Venda,
} from "../../../_lib/painel";

const POR_PAGINA = 50;
const FILTROS: [StatusVenda | "todos", string][] = [
  ["todos", "Todos"],
  ["pago", "Pagos"],
  ["pendente", "Aguardando"],
  ["cancelado", "Não concluídos"],
  ["reembolsado", "Reembolsos"],
  ["chargeback", "Chargeback"],
];

// Tira caracteres que quebram o filtro do Supabase.
const limpar = (t: string) => t.replace(/[,()*%\\]/g, " ").trim().slice(0, 80);

export default function Vendas() {
  const { cargo } = useMembro();
  const comValores = PODE.verValores(cargo);
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const [status, setStatus] = useState<StatusVenda | "todos">("todos");
  const [lista, setLista] = useState<Venda[] | null>(null);
  const [fim, setFim] = useState(false);
  const [erro, setErro] = useState("");
  const [aberta, setAberta] = useState<Venda | null>(null);
  const [lancar, setLancar] = useState(false);
  const [agora, setAgora] = useState(0);

  useEffect(() => setAgora(Date.now()), [lista]);

  // Espera a pessoa parar de digitar.
  useEffect(() => {
    const t = setTimeout(() => setTermo(limpar(busca)), 350);
    return () => clearTimeout(t);
  }, [busca]);

  const carregar = useCallback(
    async (de: number) => {
      if (comValores) {
        let q = supabase.from("vendas").select("*").order("criado_em", { ascending: false }).range(de, de + POR_PAGINA - 1);
        if (status !== "todos") q = q.eq("status", status);
        if (termo) q = q.or(`cliente_email.ilike.%${termo}%,cliente_nome.ilike.%${termo}%,pedido.ilike.%${termo}%`);
        return q;
      }
      // Suporte: mesma lista, sem valores.
      const r = await supabase.rpc("pedidos_suporte", { p_busca: termo || null, p_limite: 200 });
      const d = ((r.data ?? []) as Venda[]).filter((v) => status === "todos" || v.status === status);
      return { data: de === 0 ? d : [], error: r.error };
    },
    [comValores, status, termo],
  );

  useEffect(() => {
    let vivo = true;
    setLista(null);
    carregar(0).then(({ data, error }) => {
      if (!vivo) return;
      setErro(error ? erroAmigavel(error) : "");
      const d = (data ?? []) as Venda[];
      setLista(d);
      setFim(!comValores || d.length < POR_PAGINA);
    });
    return () => {
      vivo = false;
    };
  }, [carregar, comValores]);

  async function mais() {
    const { data, error } = await carregar(lista?.length ?? 0);
    if (error) return setErro(erroAmigavel(error));
    const d = (data ?? []) as Venda[];
    setLista((l) => [...(l ?? []), ...d]);
    setFim(d.length < POR_PAGINA);
  }

  function atualizar(v: Venda) {
    setLista((l) => l?.map((x) => (x.id === v.id ? v : x)) ?? null);
    setAberta(v);
  }

  return (
    <>
      <div className="hs-pn-bar">
        <input
          className="hs-pn-in"
          type="search"
          placeholder="Buscar por e-mail, nome ou nº do pedido"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar vendas"
        />
        <select className="hs-pn-sel" value={status} onChange={(e) => setStatus(e.target.value as StatusVenda | "todos")} aria-label="Filtrar por status">
          {FILTROS.map(([k, t]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
        </select>
        {PODE.lancarVenda(cargo) && (
          <button type="button" className="hs-pn-btn hs-pn-btn-p" onClick={() => setLancar(true)}>
            + Lançar venda
          </button>
        )}
      </div>

      {!comValores && <p className="hs-pn-nota">Como Suporte, você vê os pedidos sem valores. Para liberar ou bloquear um aluno, use a aba Alunos e acesso.</p>}
      {erro && <p className="hs-pn-erro">{erro}</p>}

      <div className="hs-pn-tw">
        <table className="hs-pn-t">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Data</th>
              <th>Produto</th>
              <th>Cliente</th>
              <th>Pagamento</th>
              {comValores && <th>Liberação prevista</th>}
              {comValores && <th className="n">Preço</th>}
              {comValores && <th className="n">Sua parte</th>}
              <th>Status</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {lista?.map((v) => {
              const pago = v.status === "pago";
              const liberado = pago && (!v.liberacao_prevista || new Date(v.liberacao_prevista).getTime() <= agora);
              return (
                <tr key={v.id}>
                  <td className="hs-pn-mono">{v.pedido}</td>
                  <td>
                    {data(v.criado_em)}
                    <small>{hora(v.criado_em)}</small>
                  </td>
                  <td className="nw">{v.produto}</td>
                  <td>
                    <div className="hs-pn-cli">
                      <span className="hs-pn-av" aria-hidden="true">
                        {(v.cliente_nome || v.cliente_email)[0]?.toUpperCase()}
                      </span>
                      <div>
                        {nomeCurto(v.cliente_nome)}
                        <small>{mascararEmail(v.cliente_email)}</small>
                      </div>
                    </div>
                  </td>
                  <td className="nw">{v.metodo ? METODO[v.metodo] : "—"}</td>
                  {comValores && (
                    <td>
                      <span className={"hs-pn-pill " + (!pago ? "off" : liberado ? "ok" : "wait")}>
                        {!pago ? "Sem repasse" : liberado ? "Prazo cumprido" : "A liberar"}
                      </span>
                      {pago && v.liberacao_prevista && <small className="nw">{dataHora(v.liberacao_prevista)}</small>}
                    </td>
                  )}
                  {comValores && <td className="n">{reais(v.valor)}</td>}
                  {comValores && <td className={"n" + (pago ? "" : " hs-pn-risk")}>{reais(v.liquido)}</td>}
                  <td>
                    <span className={"hs-pn-st " + v.status}>{STATUS_VENDA[v.status]}</span>
                    {v.reembolso_pedido_em && v.status === "pago" && <small className="hs-pn-alerta">Reembolso pedido</small>}
                  </td>
                  <td>
                    <div className="hs-pn-acts">
                      <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => setAberta(v)} aria-label={`Detalhes do pedido ${v.pedido}`}>
                        Ver
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {lista === null && <p className="hs-pn-vazio">Carregando vendas…</p>}
        {lista?.length === 0 && <p className="hs-pn-vazio">Nenhuma venda encontrada.</p>}
      </div>

      {lista && !fim && (
        <button type="button" className="hs-pn-btn" onClick={mais} style={{ justifySelf: "center" }}>
          Carregar mais
        </button>
      )}

      {aberta && <Detalhes v={aberta} comValores={comValores} podeMudar={PODE.lancarVenda(cargo)} onClose={() => setAberta(null)} onMudou={atualizar} />}
      {lancar && (
        <Lancar
          onClose={() => setLancar(false)}
          onLancou={(v) => {
            setLista((l) => [v, ...(l ?? [])]);
            setLancar(false);
          }}
        />
      )}
    </>
  );
}

function Detalhes({
  v,
  comValores,
  podeMudar,
  onClose,
  onMudou,
}: {
  v: Venda;
  comValores: boolean;
  podeMudar: boolean;
  onClose: () => void;
  onMudou: (v: Venda) => void;
}) {
  const [confirmar, setConfirmar] = useState<StatusVenda | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function mudar(s: StatusVenda) {
    setSalvando(true);
    const { data, error } = await supabase.rpc("mudar_status_venda", { p_id: v.id, p_status: s });
    setSalvando(false);
    if (error) return setErro(erroAmigavel(error));
    setConfirmar(null);
    toast(`Pedido ${v.pedido}: ${STATUS_VENDA[s]}`);
    onMudou({ ...v, ...(data as Venda) });
  }

  const linhas: [string, string][] = [
    ["Pedido", v.pedido],
    ["Plataforma", v.plataforma],
    ["Produto", `${v.produto}${v.plano ? ` · plano ${v.plano}` : ""}`],
    ["Cliente", v.cliente_nome || "—"],
    ["E-mail", v.cliente_email],
    ["Pagamento", v.metodo ? METODO[v.metodo] : "—"],
    ["Data", dataHora(v.criado_em)],
    ["Status", STATUS_VENDA[v.status]],
    ["Conta no site", v.user_id ? "Criada e ligada à venda" : "Ainda não criou conta com esse e-mail"],
    ...(v.reembolso_pedido_em
      ? ([
          ["Reembolso pedido", `${dataHora(v.reembolso_pedido_em)} · protocolo ${v.reembolso_protocolo ?? "-"}`],
          ["Motivo", v.reembolso_motivo || "Não informado"],
        ] as [string, string][])
      : []),
  ];
  if (comValores) {
    linhas.push(["Preço", reais(v.valor)], ["Sua parte", reais(v.liquido)], ["Liberação prevista", dataHora(v.liberacao_prevista)]);
  }

  const efeito: Partial<Record<StatusVenda, string>> = {
    pago: "O aluno ganha acesso à área de membros.",
    reembolsado: "O acesso do aluno será bloqueado.",
    chargeback: "O acesso do aluno será bloqueado.",
    cancelado: "Nada muda no acesso do aluno.",
  };

  return (
    <Modal title={`Pedido ${v.pedido}`} onClose={onClose}>
      <div className="hs-pn-form">
        <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "8px 16px", margin: 0, fontSize: 14 }}>
          {linhas.map(([k, x]) => (
            <div key={k} style={{ display: "contents" }}>
              <dt style={{ color: "var(--muted)" }}>{k}</dt>
              <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{x}</dd>
            </div>
          ))}
        </dl>

        {podeMudar && !confirmar && (
          <div className="hs-pn-bar">
            {v.status !== "pago" && (
              <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => setConfirmar("pago")}>
                Marcar como pago
              </button>
            )}
            {v.status === "pago" && (
              <>
                <button type="button" className="hs-pn-btn hs-pn-btn-sm hs-pn-btn-d" onClick={() => setConfirmar("reembolsado")}>
                  Registrar reembolso
                </button>
                <button type="button" className="hs-pn-btn hs-pn-btn-sm hs-pn-btn-d" onClick={() => setConfirmar("chargeback")}>
                  Registrar chargeback
                </button>
              </>
            )}
            {v.status === "pendente" && (
              <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => setConfirmar("cancelado")}>
                Marcar como não concluído
              </button>
            )}
          </div>
        )}

        {confirmar && (
          <div className="hs-pn-form" style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
            <p style={{ margin: 0 }}>
              Mudar para <b>{STATUS_VENDA[confirmar]}</b>? {efeito[confirmar]}
            </p>
            <div className="hs-pn-bar">
              <button type="button" className="hs-pn-btn hs-pn-btn-p hs-pn-btn-sm" disabled={salvando} onClick={() => mudar(confirmar)}>
                {salvando ? "Salvando…" : "Confirmar"}
              </button>
              <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => setConfirmar(null)}>
                Voltar
              </button>
            </div>
          </div>
        )}
        {erro && <p className="hs-pn-erro">{erro}</p>}
      </div>
    </Modal>
  );
}

function Lancar({ onClose, onLancou }: { onClose: () => void; onLancou: (v: Venda) => void }) {
  const [f, setF] = useState({
    pedido: "",
    cliente_nome: "",
    cliente_email: "",
    produto: "HOT SOCIETY",
    plano: "mensal",
    metodo: "pix",
    valor: "97",
    liquido: "",
    status: "pago",
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const valor = Number(f.valor.replace(",", "."));
    const liquido = f.liquido ? Number(f.liquido.replace(",", ".")) : valor;
    if (!f.pedido.trim() || !/^\S+@\S+\.\S+$/.test(f.cliente_email)) return setErro("Preencha o nº do pedido e um e-mail válido.");
    if (!(valor >= 0) || !(liquido >= 0)) return setErro("Valor inválido.");
    setSalvando(true);
    const { data, error } = await supabase.rpc("lancar_venda", {
      p: { ...f, pedido: f.pedido.trim(), cliente_email: f.cliente_email.trim(), valor, liquido },
    });
    setSalvando(false);
    if (error) return setErro(erroAmigavel(error));
    toast("Venda lançada");
    onLancou(data as Venda);
  }

  return (
    <Modal title="Lançar venda manual" onClose={onClose}>
      <form className="hs-pn-form" onSubmit={salvar}>
        <p className="hs-pn-nota">Use para vendas feitas fora da plataforma. Se o status for Pago, o aluno com esse e-mail ganha acesso (na hora ou quando criar a conta).</p>
        <div className="hs-pn-form2">
          <label className="hs-pn-fld">
            Nº do pedido
            <input className="hs-pn-in" value={f.pedido} onChange={set("pedido")} required maxLength={80} />
          </label>
          <label className="hs-pn-fld">
            Status
            <select className="hs-pn-sel" value={f.status} onChange={set("status")}>
              <option value="pago">Pago</option>
              <option value="pendente">Aguardando</option>
            </select>
          </label>
          <label className="hs-pn-fld">
            Nome do cliente
            <input className="hs-pn-in" value={f.cliente_nome} onChange={set("cliente_nome")} maxLength={120} />
          </label>
          <label className="hs-pn-fld">
            E-mail do cliente
            <input className="hs-pn-in" type="email" value={f.cliente_email} onChange={set("cliente_email")} required maxLength={200} />
          </label>
          <label className="hs-pn-fld">
            Plano
            <select className="hs-pn-sel" value={f.plano} onChange={set("plano")}>
              <option value="mensal">Mensal (32 dias)</option>
              <option value="anual">Anual (367 dias)</option>
              <option value="avulso">Avulso (sem prazo)</option>
            </select>
          </label>
          <label className="hs-pn-fld">
            Pagamento
            <select className="hs-pn-sel" value={f.metodo} onChange={set("metodo")}>
              <option value="pix">Pix</option>
              <option value="cartao">Cartão</option>
              <option value="boleto">Boleto</option>
              <option value="outro">Outro</option>
            </select>
          </label>
          <label className="hs-pn-fld">
            Preço (R$)
            <input className="hs-pn-in" inputMode="decimal" value={f.valor} onChange={set("valor")} required />
          </label>
          <label className="hs-pn-fld">
            Sua parte (R$)
            <input className="hs-pn-in" inputMode="decimal" value={f.liquido} onChange={set("liquido")} placeholder="Igual ao preço" />
          </label>
        </div>
        {erro && <p className="hs-pn-erro">{erro}</p>}
        <div className="hs-pn-bar">
          <button type="submit" className="hs-pn-btn hs-pn-btn-p" disabled={salvando}>
            {salvando ? "Salvando…" : "Lançar venda"}
          </button>
          <button type="button" className="hs-pn-btn" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
