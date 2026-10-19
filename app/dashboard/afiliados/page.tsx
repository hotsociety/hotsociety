"use client";

import AvisoExemplo from "../../_components/membros/AvisoExemplo";
import "../../_components/membros/painel.css";
import { useMemo, useState } from "react";
import { useMembro } from "../../_components/membros/MemberContext";
import { Modal, toast } from "../../_components/membros/Toast";
import { m } from "../../_components/membros/proto";
import {
  AFILIADO_DEMO,
  CLIQUES_ORIGEM,
  COMISSAO_MES,
  IMG,
  NIVEIS_AFILIADO,
  VENDAS_AFILIADO,
  type VendaAfiliado,
} from "../../_lib/demo";
import { PRICE } from "../../_lib/site";

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
  const { nome } = useMembro();
  const [demo, setDemo] = useState(true);
  const [slug, setSlug] = useState(nome.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24) || "seulink");
  const [origem, setOrigem] = useState("");
  const [meses, setMeses] = useState(6);
  const [filtro, setFiltro] = useState<"all" | VendaAfiliado["status"]>("all");
  const [modal, setModal] = useState<null | "saque" | "qr">(null);

  const nivel = demo ? AFILIADO_DEMO.nivel : 0;
  const T = NIVEIS_AFILIADO[nivel];
  const N = NIVEIS_AFILIADO[nivel + 1];
  const S = demo
    ? AFILIADO_DEMO
    : { disponivel: 0, proximo: "—", cliques: 0, cadastros: 0, vendas: 0, ativos: 0, recorrente: 0, nivel: 0 };

  // comissão de cada venda pelo preço atual dos planos e pela taxa do nível
  const comissao = (v: VendaAfiliado) =>
    v.status === "reemb" ? 0 : ((v.plano === "Anual" ? PRICE.anual : PRICE.mensal) * (v.tipo === "1ª venda" ? T.p1 : T.pr)) / 100;
  const vendas = demo ? VENDAS_AFILIADO : [];
  const emGarantia = vendas.filter((v) => v.status === "garantia").reduce((a, v) => a + comissao(v), 0);
  const link = `hotsociety.com.br/r/${slug || "seulink"}${origem ? `?o=${origem}` : ""}`;

  const KIT: [string, string, string, string][] = [
    [IMG.hero, "Story 1", "Embarque no zero.", `Eu tava travado no digital até entrar na HOT SOCIETY. Aula, ferramenta, comunidade e a CappuIA tirando dúvida 24h.\n\nSe quiser conhecer, o link tá aqui: ${link}`],
    [IMG.m2, "Story 2", "Modelo IA do zero.", `Aprendi a criar uma modelo IA do jeito certo: persona, conteúdo identificado como IA, sem rosto real.\n\nQuem quiser entrar: ${link}`],
    [IMG.placas, "Feed", "Placa 10K.", `Na Society, faturamento verificado vira placa física. A minha meta tá na parede.\n\nResultado depende do seu trabalho, não é promessa. Link: ${link}`],
  ];

  return (
    <section className={m("view")} aria-label="Afiliados">
      <AvisoExemplo>Programa em breve. Vendas, cliques e comissões abaixo são simulações, não valores reais.</AvisoExemplo>
      <div className={m("top")}>
        <div>
          <h1>Portal do Afiliado</h1>
          <p className={m("sub")}>Indique a Society e ganhe na primeira venda e em toda renovação.</p>
        </div>
        <div className={m("chips")}>
          <label className={m("af-sw")}>
            <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} /> <span>Dados de exemplo</span>
          </label>
        </div>
      </div>

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
              disabled={S.disponivel < 50}
              title={S.disponivel < 50 ? "Saque mínimo de R$ 50" : undefined}
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
              <small>Próximo pagamento</small>
              <b>{S.proximo}</b>
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
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24))}
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
            ["Cliques", S.cliques.toLocaleString("pt-BR"), demo ? "+18% vs mês passado" : "—", true],
            ["Cadastros", String(S.cadastros), demo ? "chegaram ao checkout" : "—", false],
            ["Vendas", String(S.vendas), demo ? "+6 este mês" : "—", true],
            ["Conversão", (S.cliques ? (S.vendas / S.cliques) * 100 : 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%", "clique → venda", false],
            ["Assinantes ativos", String(S.ativos), demo ? "pagando renovação" : "—", false],
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
          <Barras meses={meses} dados={demo ? COMISSAO_MES.slice(-meses) : []} />
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
            {demo ? (
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
            {CLIQUES_ORIGEM.map(([o, n]) => {
              const v = demo ? n : 0;
              return (
                <div key={o} className={m("o")}>
                  <div className={m("split")}>
                    <span>{o}</span>
                    <b>{v.toLocaleString("pt-BR")}</b>
                  </div>
                  <div className={m("prog")}>
                    <i style={{ width: `${(v / CLIQUES_ORIGEM[0][1]) * 100}%` }} />
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
                      {v.data}
                    </td>
                    <td>{v.cliente}</td>
                    <td>{v.plano}</td>
                    <td style={{ color: "var(--muted)" }}>{v.tipo}</td>
                    <td>
                      <span className={m("stp " + v.status)}>{STATUS[v.status]}</span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>
                      {v.status === "reemb" ? (
                        <span style={{ color: "var(--muted2)", textDecoration: "line-through" }}>
                          {brl(((v.plano === "Anual" ? PRICE.anual : PRICE.mensal) * T.p1) / 100)}
                        </span>
                      ) : (
                        brl(comissao(v))
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

      {modal === "saque" && <Saque valor={S.disponivel} onClose={() => setModal(null)} />}
      {modal === "qr" && (
        <Modal title="QR code do seu link" onClose={() => setModal(null)}>
          <div className={m("qrbox")}>
            <QrFake />
            <span className={m("mono")} style={{ fontSize: 12, color: "var(--muted)" }}>
              {link}
            </span>
            <p className={m("demo")} style={{ margin: 0 }}>
              Na versão final o QR é gerado com o seu link real.
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

  const topo = Math.ceil(Math.max(...dados) / 1000) * 1000;
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
                    {i > 0 && ` · ${v >= dados[i - 1] ? "+" : ""}${Math.round(((v - dados[i - 1]) / dados[i - 1]) * 100)}% vs mês anterior`}
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

function Saque({ valor, onClose }: { valor: number; onClose: () => void }) {
  const [chave, setChave] = useState("");
  const [ok, setOk] = useState(false);
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
            <button
              className={m("btn btn-p")}
              type="button"
              onClick={() => (chave.trim().length < 5 ? toast("Informe uma chave Pix válida") : setOk(true))}
            >
              Confirmar saque
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
            <span style={{ font: "600 13px/1 var(--f-t)" }}>Chave Pix (CPF, e-mail ou celular)</span>
            <input
              value={chave}
              onChange={(e) => setChave(e.target.value)}
              placeholder="sua chave Pix"
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
          <p className={m("demo")} style={{ margin: 0 }}>
            Pagamento em até 2 dias úteis na chave informada. Nesta versão nada é transferido.
          </p>
        </>
      )}
    </Modal>
  );
}

function QrFake() {
  const celulas = useMemo(() => {
    const out: boolean[] = [];
    let seed = 23;
    for (let i = 0; i < 625; i++) {
      const r = i % 25;
      const c = (i / 25) | 0;
      seed = (seed * 9301 + 49297) % 233280;
      const canto = (x: number, y: number) => r >= x && r < x + 7 && c >= y && c < y + 7;
      if (canto(0, 0) || canto(18, 0) || canto(0, 18)) {
        const x = r < 7 ? r : r - 18;
        const y = c < 7 ? c : c - 18;
        out.push(x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4));
      } else out.push(seed % 2 === 1);
    }
    return out;
  }, []);
  return (
    <div className={m("q")} aria-label="QR code de exemplo">
      {celulas.map((k, i) => (
        <i key={i} className={k ? m("k") : undefined} />
      ))}
    </div>
  );
}
