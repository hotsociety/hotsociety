"use client";

import "../../_components/membros/painel.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, toast } from "../../_components/membros/Toast";
import { m } from "../../_components/membros/proto";
import { IMG, NIVEIS_AFILIADO } from "../../_lib/demo";
import { qrSvgPath } from "../../_lib/qrcode";
import { PRICE } from "../../_lib/site";
import { supabase } from "../../_lib/supabase";

type VendaAfiliado = { data: string; cliente: string; plano: string; tipo: "primeira" | "renovacao"; status: "pago" | "garantia" | "reemb"; valor: number };
type Dados = {
  codigo: string;
  nivel: { nivel: number; p1: number; pr: number; vendas: number };
  cliques: number;
  origens: Record<"ig" | "wa" | "tt" | "yt" | "direto", number>;
  cadastros: number;
  vendas: number;
  ativos: number;
  disponivel: number;
  em_garantia: number;
  recorrente: number;
  saque_pendente: boolean;
  meses: number[];
  vendas_lista: VendaAfiliado[];
};
const ORIGENS: [keyof Dados["origens"], string][] = [
  ["ig", "Instagram"],
  ["wa", "WhatsApp"],
  ["tt", "TikTok"],
  ["yt", "YouTube"],
  ["direto", "Link direto"],
];
const DATA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });

const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const brl = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl0 = (v: number) => "R$ " + Math.round(v).toLocaleString("pt-BR");
const STATUS: Record<VendaAfiliado["status"], string> = { pago: "Paga", garantia: "Em garantia", reemb: "Reembolsada" };

async function copiar(texto: string, aviso = "Copiado") {
  try {
    await navigator.clipboard.writeText(texto);
    toast(aviso);
  } catch {
    toast("Selecione e copie manualmente");
  }
}

const Wa = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.5-4.2a8.5 8.5 0 1 1 15.5-4.7Z" />
    <path d="M9 8.5c0 3 2.5 6.5 6.5 6.5l1-1.5-2-1-1 .8c-1-.5-2-1.5-2.5-2.5l.8-1-1-2L9 8.5Z" fill="currentColor" stroke="none" />
  </svg>
);
const Ig = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.3" cy="6.7" r="1" fill="currentColor" />
  </svg>
);
const Qr = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <path d="M14 14h3v3M21 14v7h-7" />
  </svg>
);

export default function Afiliados() {
  const [d, setD] = useState<Dados | null>(null);
  const [erro, setErro] = useState(false);
  const [slug, setSlug] = useState("");
  const [salvandoSlug, setSalvandoSlug] = useState(false);
  const [origem, setOrigem] = useState("");
  const [meses, setMeses] = useState(6);
  const [filtro, setFiltro] = useState<"all" | VendaAfiliado["status"]>("all");
  const [modal, setModal] = useState<null | "saque" | "qr">(null);

  const carregar = useCallback(() => {
    supabase.rpc("meu_afiliado").then(({ data, error }) => {
      if (error) return setErro(true);
      const x = data as Dados;
      setD(x);
      setSlug(x.codigo);
    });
  }, []);
  useEffect(carregar, [carregar]);

  const nivel = d?.nivel.nivel ?? 0;
  const T = NIVEIS_AFILIADO[nivel];
  const N = NIVEIS_AFILIADO[nivel + 1];
  const S = d ?? { disponivel: 0, cliques: 0, cadastros: 0, vendas: 0, ativos: 0, recorrente: 0, em_garantia: 0, saque_pendente: false };
  const vendas = d?.vendas_lista ?? [];
  const emGarantia = d?.em_garantia ?? 0;
  const codigo = d?.codigo ?? "…";
  const link = `hotsociety.com.br/r/${codigo}${origem ? `?o=${origem}` : ""}`;
  const proximo = d?.saque_pendente ? "Em análise" : "Ao pedir";

  async function salvarSlug() {
    if (!d || slug === d.codigo) return;
    if (!/^[a-z0-9-]{3,24}$/.test(slug)) return toast("Use de 3 a 24 letras, números ou hífen");
    setSalvandoSlug(true);
    const { data, error } = await supabase.rpc("mudar_codigo_afiliado", { p_codigo: slug });
    setSalvandoSlug(false);
    if (error) {
      setSlug(d.codigo);
      return toast(/uso|reservado|letras/.test(error.message) ? error.message.charAt(0).toUpperCase() + error.message.slice(1) : "Não deu para trocar o link");
    }
    setD({ ...d, codigo: data as string });
    toast("Link atualizado. O link antigo parou de funcionar.");
  }

  const KIT: [string, string, string, string][] = [
    [IMG.hero, "Story 1", "Embarque no zero.", `Eu tava travado no digital até entrar na HOT SOCIETY. Aula, ferramenta, comunidade e a CappuIA tirando dúvida 24h.\n\nSe quiser conhecer, o link tá aqui: ${link}`],
    [IMG.m2, "Story 2", "Modelo IA do zero.", `Aprendi a criar uma modelo IA do jeito certo: persona, conteúdo identificado como IA, sem rosto real.\n\nQuem quiser entrar: ${link}`],
    [IMG.placas, "Feed", "Placa 10K.", `Na Society, faturamento verificado vira placa física. A minha meta tá na parede.\n\nResultado depende do seu trabalho, não é promessa. Link: ${link}`],
  ];

  return (
    <section className={m("view")} aria-label="Afiliados">
      <div className={m("top")}>
        <div>
          <h1>Portal do Afiliado</h1>
          <p className={m("sub")}>Indique a Society e ganhe na primeira venda e em toda renovação.</p>
        </div>
      </div>
      {erro && (
        <div className={m("card")}>
          <p className={m("sub")} style={{ margin: 0 }}>
            Não deu para carregar seus dados de afiliado agora. Atualize a página em instantes.
          </p>
        </div>
      )}

      <div className={m("af-top")}>
        <div className={m("af-bal")}>
          <div className={m("row1")}>
            <div>
              <p className={m("eb")} style={{ color: "var(--red-t)" }}>
                Disponível para saque
              </p>
              <div className={m("v")}>{brl(S.disponivel)}</div>
            </div>
            <button
              className={m("btn btn-p")}
              type="button"
              disabled={S.disponivel < 50 || S.saque_pendente}
              title={S.saque_pendente ? "Você já tem um saque em análise" : S.disponivel < 50 ? "Saque mínimo de R$ 50" : undefined}
              onClick={() => setModal("saque")}
            >
              Sacar via Pix
            </button>
          </div>
          <div className={m("sm")}>
            <div>
              <small>Em garantia (libera em 7 dias)</small>
              <b>{brl(emGarantia)}</b>
            </div>
            <div>
              <small>Comissão recorrente por mês</small>
              <b>{brl(S.recorrente)}</b>
            </div>
            <div>
              <small>Saque</small>
              <b>{proximo}</b>
            </div>
          </div>
          {S.disponivel < 50 && (
            <p className={m("sub")} style={{ margin: 0 }}>
              Comece a indicar para acumular saldo. Saque a partir de R$ 50.
            </p>
          )}
        </div>

        <div className={m("af-tier card")}>
          <h2 style={{ margin: 0 }}>Seu nível de afiliado</h2>
          <div className={m("lv")}>
            <span className={m("bd")}>{T.b}</span>
            <div>
              <b>{T.n}</b>
              <small>
                {T.p1}% na 1ª venda · {T.pr}% na renovação
              </small>
            </div>
          </div>
          <div className={m("af-steps")}>
            {NIVEIS_AFILIADO.map((t, i) => (
              <div key={t.n} className={i <= nivel ? m("on") : undefined}>
                <i />
                {t.n}
              </div>
            ))}
          </div>
          <p className={m("sub")} style={{ margin: 0, fontSize: 13 }}>
            {N ? (
              <>
                Faltam <b style={{ color: "var(--neve)" }}>{N.min - S.vendas} vendas</b> para {N.n}: {N.p1}% na 1ª venda.
              </>
            ) : (
              "Nível máximo. Você é Comandante."
            )}
          </p>
        </div>
      </div>

      <div className={m("af-link card")}>
        <div className={m("split")}>
          <h2 style={{ margin: 0 }}>Seu link</h2>
          <div className={m("af-slug")}>
            <label htmlFor="af-sl">hotsociety.com.br/r/</label>
            <input
              id="af-sl"
              value={slug}
              maxLength={24}
              aria-label="Personalizar link"
              disabled={!d || salvandoSlug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24))}
              onBlur={salvarSlug}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
          </div>
        </div>
        <div className={m("lr")}>
          <div className={m("url")}>
            🔗 <span>{link}</span>
          </div>
          <button
            className={m("ib")}
            type="button"
            aria-label="Copiar mensagem para o WhatsApp"
            style={{ color: "#5BC98F" }}
            onClick={() => copiar(`Conhece a HOT SOCIETY? Entra pelo meu link: https://${link}`, "Mensagem copiada")}
          >
            <Wa />
          </button>
          <button
            className={m("ib")}
            type="button"
            aria-label="Copiar para o Instagram"
            onClick={() => copiar(`https://${link}`, "Link copiado: cole no seu story com o adesivo de link")}
          >
            <Ig />
          </button>
          <button className={m("ib")} type="button" aria-label="QR code" onClick={() => setModal("qr")}>
            <Qr />
          </button>
          <button className={m("btn btn-p")} type="button" onClick={() => copiar(`https://${link}`, "Link copiado")}>
            Copiar link
          </button>
        </div>
        <div className={m("chips2")}>
          <span>Link por origem:</span>
          {[
            ["", "Geral"],
            ["ig", "Instagram"],
            ["wa", "WhatsApp"],
            ["tt", "TikTok"],
            ["yt", "YouTube"],
          ].map(([k, t]) => (
            <button key={k} type="button" aria-pressed={origem === k} onClick={() => setOrigem(k)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className={m("af-kpis")}>
        {(
          [
            ["Cliques", S.cliques.toLocaleString("pt-BR"), "1 por pessoa por dia", false],
            ["Cadastros", String(S.cadastros), "entraram pelo seu link", false],
            ["Vendas", String(S.vendas), "primeiras vendas", false],
            ["Conversão", (S.cliques ? (S.vendas / S.cliques) * 100 : 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%", "clique → venda", false],
            ["Assinantes ativos", String(S.ativos), "pagando hoje", false],
          ] as [string, string, string, boolean][]
        ).map(([t, v, e, up]) => (
          <div key={t} className={m("af-k")}>
            <small>{t}</small>
            <b>{v}</b>
            <em className={up ? m("up") : undefined}>{e}</em>
          </div>
        ))}
      </div>

      <div className={m("af-grid")}>
        <div className={m("card af-chart")}>
          <div className={m("split")} style={{ marginBottom: 14 }}>
            <h2 style={{ margin: 0 }}>Comissão por mês</h2>
            <div className={m("seg")} role="group" aria-label="Período">
              {[3, 6, 12].map((n) => (
                <button key={n} type="button" aria-pressed={meses === n} onClick={() => setMeses(n)}>
                  {n} meses
                </button>
              ))}
            </div>
          </div>
          <Barras meses={meses} dados={d && d.meses.some((v) => v > 0) ? d.meses.slice(-meses).map(Number) : []} />
        </div>
        <div className={m("card")}>
          <h2>Você ganha</h2>
          <div className={m("af-plans")}>
            {(
              [
                ["Mensal", PRICE.mensal, "/mês"],
                ["Anual", PRICE.anual, "/ano"],
              ] as [string, number, string][]
            ).map(([n, p, per]) => (
              <div key={n} className={m("pc")}>
                <div className={m("split")}>
                  <b>Plano {n}</b>
                  <small>
                    {brl0(p)}
                    {per}
                  </small>
                </div>
                <div className={m("two")}>
                  <div>
                    <small>1ª venda · {T.p1}%</small>
                    <b className={m("g")}>{brl((p * T.p1) / 100)}</b>
                  </div>
                  <div>
                    <small>Renovação · {T.pr}%</small>
                    <b>{brl((p * T.pr) / 100)}</b>
                  </div>
                </div>
              </div>
            ))}
            <p className={m("note")}>Porcentagens do seu nível atual. Subiu de nível, as próximas vendas já entram com a nova taxa.</p>
          </div>
        </div>
      </div>

      <div className={m("af-grid")}>
        <div className={m("card")}>
          <h2>Funil do seu link</h2>
          <div className={m("af-funnel")}>
            {(
              [
                ["Cliques", S.cliques],
                ["Cadastros", S.cadastros],
                ["Vendas", S.vendas],
              ] as [string, number][]
            ).map(([t, v]) => (
              <div key={t} className={m("st")}>
                <span>{t}</span>
                <div className={m("br")} style={{ width: `${Math.max(1, (v / Math.max(1, S.cliques)) * 100)}%` }} />
                <b>{v.toLocaleString("pt-BR")}</b>
              </div>
            ))}
            {S.cliques > 0 && S.cadastros > 0 ? (
              <div className={m("cv")}>
                {((S.cadastros / S.cliques) * 100).toFixed(1).replace(".", ",")}% dos cliques viram cadastro ·{" "}
                {((S.vendas / S.cadastros) * 100).toFixed(1).replace(".", ",")}% dos cadastros compram
              </div>
            ) : (
              <p className={m("sub")} style={{ margin: 0 }}>
                Compartilhe o link para começar a ver o funil.
              </p>
            )}
          </div>
        </div>
        <div className={m("card")}>
          <h2>Cliques por origem</h2>
          <div className={m("af-orig")}>
            {ORIGENS.map(([k, o]) => {
              const v = d?.origens[k] ?? 0;
              const max = Math.max(1, ...ORIGENS.map(([x]) => d?.origens[x] ?? 0));
              return (
                <div key={o} className={m("o")}>
                  <div className={m("split")}>
                    <span>{o}</span>
                    <b>{v.toLocaleString("pt-BR")}</b>
                  </div>
                  <div className={m("prog")}>
                    <i style={{ width: `${(v / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={m("card")}>
        <div className={m("split")} style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Vendas</h2>
          <div className={m("seg")} role="group" aria-label="Filtro de vendas">
            {(
              [
                ["all", "Todas"],
                ["pago", "Pagas"],
                ["garantia", "Em garantia"],
                ["reemb", "Reembolsadas"],
              ] as [typeof filtro, string][]
            ).map(([k, t]) => (
              <button key={k} type="button" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className={m("tblwrap")}>
          <table className={m("lb af-tbl")}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Plano</th>
                <th>Tipo</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Comissão</th>
              </tr>
            </thead>
            <tbody>
              {vendas
                .filter((v) => filtro === "all" || v.status === filtro)
                .map((v) => (
                  <tr key={v.data + v.cliente}>
                    <td className={m("mono")} style={{ fontSize: 12 }}>
                      {DATA.format(new Date(v.data))}
                    </td>
                    <td>{v.cliente}</td>
                    <td>{v.plano === "anual" ? "Anual" : "Mensal"}</td>
                    <td style={{ color: "var(--muted)" }}>{v.tipo === "primeira" ? "1ª venda" : "Renovação"}</td>
                    <td>
                      <span className={m("stp " + v.status)}>{STATUS[v.status]}</span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>
                      {v.status === "reemb" ? (
                        <span style={{ color: "var(--muted2)", textDecoration: "line-through" }}>{brl(Number(v.valor))}</span>
                      ) : (
                        brl(Number(v.valor))
                      )}
                    </td>
                  </tr>
                ))}
              {!vendas.filter((v) => filtro === "all" || v.status === filtro).length && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>
                    Nenhuma venda {filtro === "all" ? "ainda" : "nesse filtro"}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={m("card")}>
        <h2>Kit de divulgação</h2>
        <div className={m("af-kit")}>
          {KIT.map(([img, tag, titulo, legenda]) => {
            const p = titulo.split(" ");
            return (
              <div key={tag} className={m("it")}>
                <div className={m("cv")} style={{ backgroundImage: `url(${img})` }}>
                  <span className={m("tag")} style={{ position: "absolute", top: 10, left: 10 }}>
                    {tag}
                  </span>
                  <b>
                    {p.slice(0, -1).join(" ")}
                    <span>{p.slice(-1)}</span>
                  </b>
                </div>
                <pre>{legenda}</pre>
                <button className={m("btn btn-s")} type="button" onClick={() => copiar(legenda, "Legenda copiada")}>
                  Copiar legenda
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className={m("card af-rules")}>
        <h2>Regras do programa</h2>
        <ul>
          <li>Comissão liberada após os 7 dias de garantia do cliente. Reembolso cancela a comissão.</li>
          <li>Cookie de 30 dias, vale o último clique.</li>
          <li>Saque via Pix a partir de R$ 50, pago em até 2 dias úteis.</li>
          <li>Proibido prometer ganho, usar print que não é seu, fazer spam ou anunciar usando a marca HOT SOCIETY sem autorização.</li>
          <li>Autoindicação não gera comissão.</li>
        </ul>
      </div>

      {modal === "saque" && (
        <Saque
          valor={Number(S.disponivel)}
          onClose={() => setModal(null)}
          onFeito={() => {
            carregar();
          }}
        />
      )}
      {modal === "qr" && (
        <Modal title="QR code do seu link" onClose={() => setModal(null)}>
          <div className={m("qrbox")}>
            <QrLink texto={`https://${link}`} />
            <span className={m("mono")} style={{ fontSize: 12, color: "var(--muted)" }}>
              {link}
            </span>
            <p className={m("sub")} style={{ margin: 0, fontSize: 13 }}>
              Tire um print e use em stories, flyers ou no seu perfil.
            </p>
          </div>
        </Modal>
      )}
    </section>
  );
}

/* ---------- gráfico de barras da comissão ---------- */
function Barras({ meses, dados }: { meses: number; dados: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const rotulos = useMemo(() => {
    const now = new Date();
    return Array.from({ length: meses }, (_, k) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (meses - 1 - k), 1);
      return MES[d.getMonth()];
    });
  }, [meses]);

  if (!dados.length)
    return (
      <div className={m("af-bars")}>
        <div />
        <div className={m("af-empty")}>
          Sem comissão registrada ainda.
          <br />
          Copie seu link e mande para 3 pessoas hoje.
        </div>
      </div>
    );

  const topo = Math.max(100, Math.ceil(Math.max(...dados) / 100) * 100);
  const ticks = [0, topo / 2, topo];
  const pos = (t: number) => `calc(${t / topo} * (100% - 22px) + 22px)`;

  return (
    <div className={m("af-bars")}>
      <div className={m("ax")}>
        {ticks.map((t) => (
          <span key={t} style={{ bottom: pos(t) }}>
            {t >= 1000 ? `${t / 1000}k` : t}
          </span>
        ))}
      </div>
      <div className={m("pl")}>
        {ticks.map((t) => (
          <div key={t} className={m("gl")} style={{ bottom: pos(t) }} />
        ))}
        <div className={m("cols")}>
          {dados.map((v, i) => {
            const ultimo = i === dados.length - 1;
            const h = (v / topo) * 100;
            return (
              <div
                key={i}
                className={m("col")}
                tabIndex={0}
                aria-label={`${rotulos[i]}: ${brl(v)}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                <i style={{ height: `${h}%` }} />
                {ultimo && (
                  <span className={m("vl")} style={{ bottom: `${h}%` }}>
                    {brl0(v)}
                  </span>
                )}
                <span className={m("lb")}>{rotulos[i]}</span>
                {hover === i && (
                  <div className={m("tip")} style={{ left: "50%", bottom: `${h}%`, transform: "translate(-50%,-14px)" }}>
                    <b>{brl(v)}</b>
                    {rotulos[i]}
                    {i > 0 && dados[i - 1] > 0 && ` · ${v >= dados[i - 1] ? "+" : ""}${Math.round(((v - dados[i - 1]) / dados[i - 1]) * 100)}% vs mês anterior`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Saque({ valor, onClose, onFeito }: { valor: number; onClose: () => void; onFeito: () => void }) {
  const [chave, setChave] = useState("");
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function pedir() {
    if (chave.trim().length < 5) return toast("Informe uma chave Pix válida");
    setEnviando(true);
    const { error } = await supabase.rpc("pedir_saque_afiliado", { p_valor: valor, p_chave: chave.trim() });
    setEnviando(false);
    if (error) return toast(/mínimo|insuficiente|análise/.test(error.message) ? error.message.charAt(0).toUpperCase() + error.message.slice(1) : "Não deu para pedir o saque");
    setOk(true);
    onFeito();
  }

  return (
    <Modal
      title="Sacar via Pix"
      onClose={onClose}
      foot={
        <>
          <span style={{ flex: 1 }} />
          {ok ? (
            <button className={m("btn btn-p")} type="button" onClick={onClose}>
              Fechar
            </button>
          ) : (
            <button className={m("btn btn-p")} type="button" disabled={enviando} onClick={pedir}>
              {enviando ? "Enviando…" : "Confirmar saque"}
            </button>
          )}
        </>
      }
    >
      {ok ? (
        <div style={{ textAlign: "center", display: "grid", gap: 10, padding: "10px 0" }}>
          <b style={{ font: "900 44px/1 var(--f-d)", color: "var(--ok)" }}>✓</b>
          <b style={{ font: "900 22px/1 var(--f-d)", textTransform: "uppercase" }}>Saque solicitado</b>
          <span className={m("sub")} style={{ margin: 0 }}>
            {brl(valor)} para a chave informada, em até 2 dias úteis.
          </span>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gap: 6 }}>
            <span className={m("sub")} style={{ margin: 0 }}>
              Valor disponível
            </span>
            <b style={{ font: "900 34px/1 var(--f-d)" }}>{brl(valor)}</b>
          </div>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ font: "600 13px/1 var(--f-t)" }}>Chave Pix (CPF, e-mail, celular ou aleatória)</span>
            <input
              value={chave}
              onChange={(e) => setChave(e.target.value)}
              placeholder="sua chave Pix"
              maxLength={120}
              style={{
                minHeight: 46,
                borderRadius: 8,
                border: "1px solid var(--line2)",
                background: "var(--s2)",
                color: "var(--neve)",
                padding: "0 12px",
                fontSize: 15,
              }}
            />
          </label>
          <p className={m("sub")} style={{ margin: 0, fontSize: 13 }}>
            O valor todo disponível vai para análise e é pago em até 2 dias úteis nessa chave. A chave precisa estar no seu nome.
          </p>
        </>
      )}
    </Modal>
  );
}

function QrLink({ texto }: { texto: string }) {
  const qr = useMemo(() => qrSvgPath(texto), [texto]);
  return (
    <svg viewBox={`0 0 ${qr.tamanho} ${qr.tamanho}`} role="img" aria-label="QR code do seu link" shapeRendering="crispEdges" style={{ width: 220, height: 220, borderRadius: 12 }}>
      <rect width={qr.tamanho} height={qr.tamanho} fill="#fff" />
      <path d={qr.d} fill="#000" />
    </svg>
  );
}
