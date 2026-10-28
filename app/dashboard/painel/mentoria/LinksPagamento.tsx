"use client";

// Painel → Mentoria → Links de pagamento: digita o valor, gera o link da Stripe e manda para o lead.
import { forwardRef, useEffect, useState } from "react";
import { toast } from "../../../_components/membros/Toast";
import { dataHora } from "../../../_lib/painel";
import { supabase } from "../../../_lib/supabase";

export type LeadLink = { id: string; nome: string; whatsapp: string };
type Link = {
  id: string;
  criado_em: string;
  aplicacao_id: string | null;
  lead_nome: string | null;
  descricao: string;
  valor_centavos: number;
  status: "aberto" | "pago" | "falhou" | "desativado" | "reembolsado";
  url: string | null;
  pagador_nome: string | null;
  pagador_email: string | null;
  metodo: string | null;
  pago_em: string | null;
  split_centavos: number;
  gateway?: "stripe" | "mercadopago";
};
type Gateway = "stripe" | "mercadopago";
const GATEWAY: Record<Gateway, { t: string; sub: string }> = {
  stripe: { t: "Pix · boleto · cartão à vista", sub: "Stripe" },
  mercadopago: { t: "Cartão em até 12x", sub: "Mercado Pago" },
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const ST: Record<Link["status"], { t: string; cls: string }> = {
  aberto: { t: "Aguardando", cls: "pendente" },
  pago: { t: "Pago", cls: "pago" },
  falhou: { t: "Não pago", cls: "recusado" },
  desativado: { t: "Desativado", cls: "sem" },
  reembolsado: { t: "Reembolsado", cls: "reembolsado" },
};
const METODO: Record<string, string> = { cartao: "Cartão", pix: "Pix", boleto: "Boleto", outro: "Outro" };
const wpp = (n: string, texto: string) => `https://wa.me/${n.length <= 11 ? "55" + n : n}?text=${encodeURIComponent(texto)}`;
const msg = (nome: string | null, desc: string, valor: number, url: string, g: Gateway = "stripe") =>
  `Oi${nome ? `, ${nome.split(" ")[0]}` : ""}! Segue o link para garantir sua vaga na ${desc} (${BRL.format(valor / 100)}). ${
    g === "mercadopago" ? "Dá para pagar no cartão em até 12x pelo Mercado Pago" : "Dá para pagar com Pix, cartão ou boleto"
  }:\n${url}`;

// Cartão parcelado em até 12x (Mercado Pago). A Stripe não parcela no Brasil, então a mentoria tem este link fixo.
// Pagamentos por ele aparecem no painel do Mercado Pago (não entram sozinhos aqui).
const MP_MENTORIA = { url: "https://mpago.la/24QKUQL", valor: 500000, nome: "Mentoria Individual" };
const msgMp = (nome: string | null) =>
  `Oi${nome ? `, ${nome.split(" ")[0]}` : ""}! Segue o link da ${MP_MENTORIA.nome} HOT SOCIETY (${BRL.format(MP_MENTORIA.valor / 100)}) no cartão em até 12x pelo Mercado Pago:\n${MP_MENTORIA.url}`;

// Valor digitado "5.000,00" / "5000" → número.
const lerValor = (s: string) => Number(s.replace(/[^\d,.]/g, "").replace(/\./g, "").replace(",", "."));

async function chamar(corpo: object) {
  const { data } = await supabase.auth.getSession();
  const r = await fetch("/api/mentoria/link", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify(corpo),
  });
  const j = (await r.json().catch(() => ({}))) as { erro?: string; url?: string; id?: string };
  if (!r.ok) throw new Error(j.erro || "Não deu agora. Tente de novo.");
  return j;
}

const LinksPagamento = forwardRef<HTMLElement, { leads: LeadLink[]; leadInicial: string | null; onLeadUsado: () => void }>(function LinksPagamento(
  { leads, leadInicial, onLeadUsado },
  ref,
) {
  const [links, setLinks] = useState<Link[] | null>(null);
  const [n, setN] = useState(0);
  const [lead, setLead] = useState("");
  const [descricao, setDescricao] = useState("Mentoria HOT SOCIETY");
  const [valor, setValor] = useState("");
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");
  const [novo, setNovo] = useState<{ url: string; lead: LeadLink | null; descricao: string; valor: number; gateway: Gateway } | null>(null);
  const [gateway, setGateway] = useState<Gateway>("stripe");
  const [cfg, setCfg] = useState<{ stripe: boolean; mercadopago: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/mentoria/link")
      .then((r) => r.json())
      .then((j) => setCfg({ stripe: !!j.stripe, mercadopago: !!j.mercadopago }))
      .catch(() => setCfg({ stripe: true, mercadopago: false }));
  }, []);

  useEffect(() => {
    let vivo = true;
    supabase.rpc("painel_mentoria_links").then(({ data, error }) => {
      if (!vivo) return;
      if (error) console.warn("links mentoria:", error.message);
      setLinks((data as Link[]) ?? []);
    });
    return () => {
      vivo = false;
    };
  }, [n]);

  // Clicou em "Link" numa aplicação: já escolhe o lead aqui.
  useEffect(() => {
    if (!leadInicial) return;
    setLead(leadInicial);
    setNovo(null);
    onLeadUsado();
  }, [leadInicial, onLeadUsado]);

  const leadSel = leads.find((l) => l.id === lead) ?? null;
  const v = lerValor(valor);

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!Number.isFinite(v) || v < 1) return setErro("Digite o valor (mínimo R$ 1,00).");
    setGerando(true);
    try {
      const r = await chamar({ descricao, valor: v, aplicacao: lead || null, gateway });
      setNovo({ url: r.url!, lead: leadSel, descricao, valor: Math.round(v * 100), gateway });
      setValor("");
      setN((x) => x + 1);
      toast("Link gerado", true);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setGerando(false);
    }
  }

  async function copiar(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copiado", true);
    } catch {
      window.prompt("Copie o link:", url);
    }
  }

  async function desativar(l: Link) {
    if (!window.confirm(`Desativar o link de ${BRL.format(l.valor_centavos / 100)}${l.lead_nome ? ` (${l.lead_nome})` : ""}? Ele para de aceitar pagamento.`)) return;
    try {
      await chamar({ acao: "desativar", id: l.id });
      if (novo?.url === l.url) setNovo(null);
      toast("Link desativado");
      setN((x) => x + 1);
    } catch (err) {
      toast((err as Error).message);
    }
  }

  const pagos = links?.filter((l) => l.status === "pago") ?? [];
  const totalPago = pagos.reduce((t, l) => t + l.valor_centavos, 0);
  const leadDe = (l: Link) => leads.find((x) => x.id === l.aplicacao_id) ?? null;

  return (
    <section ref={ref} className="hs-pn-gl" aria-labelledby="links-mentoria">
      <div className="hs-pn-gl-cab">
        <div>
          <h2 id="links-mentoria">Link de pagamento</h2>
          <p>Escolha a forma, digite o valor e mande o link para o lead. Cada link vale para um pagamento.</p>
        </div>
        {pagos.length > 0 && (
          <span className="hs-pn-gl-total">
            <small>Recebido por link</small>
            <b>{BRL.format(totalPago / 100)}</b>
          </span>
        )}
      </div>

      <div className="hs-pn-gl-gw" role="radiogroup" aria-label="Forma de pagamento do link">
        {(Object.keys(GATEWAY) as Gateway[]).map((g) => (
          <button
            key={g}
            type="button"
            role="radio"
            aria-checked={gateway === g}
            className={gateway === g ? "on" : ""}
            onClick={() => {
              setGateway(g);
              setErro("");
            }}
          >
            <b>{GATEWAY[g].t}</b>
            <small>
              {GATEWAY[g].sub}
              {cfg && !cfg[g] ? " · falta configurar" : ""}
            </small>
          </button>
        ))}
      </div>

      <form className="hs-pn-gl-form" onSubmit={gerar}>
        <label className="hs-pn-fld">
          Lead (opcional)
          <select className="hs-pn-sel" value={lead} onChange={(e) => setLead(e.target.value)}>
            <option value="">Sem lead (link avulso)</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="hs-pn-fld">
          O que está sendo vendido
          <input className="hs-pn-in" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={120} required />
        </label>
        <label className="hs-pn-fld hs-pn-gl-valor">
          Valor
          <span>
            <i aria-hidden="true">R$</i>
            <input className="hs-pn-in" inputMode="decimal" placeholder="5.000,00" value={valor} onChange={(e) => setValor(e.target.value)} required aria-label="Valor em reais" />
          </span>
        </label>
        <button type="submit" className="hs-pn-btn hs-pn-btn-p" disabled={gerando}>
          {gerando ? "Gerando…" : Number.isFinite(v) && v >= 1 ? `Gerar link · ${BRL.format(v)}` : "Gerar link"}
        </button>
      </form>
      {erro && <p className="hs-pn-erro">{erro}</p>}

      {cfg && !cfg.mercadopago && (
      <div className="hs-pn-gl-mp">
        <span className="hs-pn-gl-oktx">
          <small>Cartão em até 12x · Mercado Pago · {BRL.format(MP_MENTORIA.valor / 100)}</small>
          <a href={MP_MENTORIA.url} target="_blank" rel="noopener noreferrer">
            {MP_MENTORIA.nome} · {MP_MENTORIA.url.replace("https://", "")}
          </a>
        </span>
        <span className="hs-pn-acts">
          <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => copiar(MP_MENTORIA.url)}>
            Copiar
          </button>
          {leadSel && (
            <a className="hs-pn-btn hs-pn-btn-sm" href={wpp(leadSel.whatsapp, msgMp(leadSel.nome))} target="_blank" rel="noopener noreferrer">
              Enviar no WhatsApp
            </a>
          )}
        </span>
      </div>
      )}

      {novo && (
        <div className="hs-pn-gl-ok" role="status">
          <span className="hs-pn-gl-oktx">
            <small>
              Link pronto · {BRL.format(novo.valor / 100)}
              {novo.lead ? ` · ${novo.lead.nome}` : ""}
            </small>
            <a href={novo.url} target="_blank" rel="noopener noreferrer">
              {novo.url}
            </a>
          </span>
          <span className="hs-pn-acts">
            <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => copiar(novo.url)}>
              Copiar
            </button>
            {novo.lead && (
              <a className="hs-pn-btn hs-pn-btn-p hs-pn-btn-sm" href={wpp(novo.lead.whatsapp, msg(novo.lead.nome, novo.descricao, novo.valor, novo.url, novo.gateway))} target="_blank" rel="noopener noreferrer">
                Enviar no WhatsApp
              </a>
            )}
          </span>
        </div>
      )}

      {links && links.length > 0 && (
        <div className="hs-pn-tw">
          <table className="hs-pn-t" style={{ minWidth: 980, tableLayout: "fixed" }}>
            <colgroup>
              <col />
              <col style={{ width: 130 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 290 }} />
            </colgroup>
            <thead>
              <tr>
                <th>Link</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Quando</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {links.map((l) => {
                const ld = leadDe(l);
                return (
                  <tr key={l.id}>
                    <td style={{ overflowWrap: "anywhere" }}>
                      <b>{l.lead_nome ?? "Link avulso"}</b>
                      <small>
                        {l.gateway === "mercadopago" ? "Mercado Pago · " : ""}
                        {l.descricao}
                        {l.status === "pago" && l.pagador_email ? ` · pago por ${l.pagador_email}` : ""}
                      </small>
                    </td>
                    <td className="nw">
                      {BRL.format(l.valor_centavos / 100)}
                      {l.status === "pago" && l.metodo && <small>{METODO[l.metodo] ?? l.metodo}</small>}
                    </td>
                    <td>
                      <span className={"hs-pn-st " + ST[l.status].cls}>{ST[l.status].t}</span>
                    </td>
                    <td className="nw">{dataHora(l.pago_em ?? l.criado_em)}</td>
                    <td>
                      {l.status === "aberto" && l.url && (
                        <div className="hs-pn-acts">
                          <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => copiar(l.url!)}>
                            Copiar
                          </button>
                          {ld && (
                            <a className="hs-pn-btn hs-pn-btn-sm" href={wpp(ld.whatsapp, msg(ld.nome, l.descricao, l.valor_centavos, l.url, l.gateway ?? "stripe"))} target="_blank" rel="noopener noreferrer">
                              WhatsApp
                            </a>
                          )}
                          <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => desativar(l)} aria-label="Desativar link">
                            Desativar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
});

export default LinksPagamento;
