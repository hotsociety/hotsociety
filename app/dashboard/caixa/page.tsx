"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "../../_components/membros/Toast";
import { m } from "../../_components/membros/proto";
import { IMG, JOGADAS, PLANO_7_DIAS } from "../../_lib/demo";

const brl0 = (v: number) => "R$ " + Math.round(v).toLocaleString("pt-BR");
const ORIGENS = ["Pré-venda", "Reativação", "Oferta 48h", "Upgrade anual", "Afiliação", "Serviço", "Outro"];

type Entrada = { id: number; v: number; o: string; d: string };
type Calc = { meta: number; ticket: number; conv: number; dias: number };

async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast("Roteiro copiado");
  } catch {
    toast("Selecione e copie manualmente");
  }
}

export default function LevantarCaixa() {
  const router = useRouter();
  const [c, setC] = useState<Calc>({ meta: 5000, ticket: 97, conv: 2, dias: 7 });
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [valor, setValor] = useState("");
  const [origem, setOrigem] = useState(ORIGENS[0]);
  const [filtro, setFiltro] = useState<"all" | "48h" | "zero">("all");
  const [feito, setFeito] = useState<Record<string, boolean>>({});

  const vendas = Math.ceil(c.meta / Math.max(1, c.ticket));
  const leads = Math.ceil((vendas / Math.max(0.1, c.conv)) * 100);
  const porDia = Math.ceil(leads / Math.max(1, c.dias));
  const vendasDia = Math.ceil(vendas / Math.max(1, c.dias));

  const total = entradas.reduce((a, e) => a + e.v, 0);
  const pct = Math.min(100, (total / c.meta) * 100);

  function registrar(e: React.FormEvent) {
    e.preventDefault();
    const v = parseFloat(valor);
    if (!(v > 0)) return toast("Informe um valor");
    const antes = total;
    setEntradas((x) => [...x, { id: Date.now(), v, o: origem, d: new Date().toLocaleDateString("pt-BR") }]);
    setValor("");
    toast("Entrada registrada");
    if (antes < c.meta && antes + v >= c.meta) setTimeout(() => toast("Meta batida! Hora de reinvestir no tráfego.", true), 900);
  }

  const totalTarefas = PLANO_7_DIAS.length * 3;
  const feitas = Object.values(feito).filter(Boolean).length;
  const pctPlano = Math.round((feitas / totalTarefas) * 100);

  const jogadas = JOGADAS.map((j, i) => ({ j, i })).filter(({ j }) => filtro === "all" || (filtro === "48h" ? j.prazo !== "7 dias" : true));

  return (
    <section className={m("view")} aria-label="Levantar Caixa">
      <div className={m("lc-hero")} style={{ backgroundImage: `url(${IMG.hero})` }}>
        <div className={m("in")}>
          <p className={m("eb")} style={{ color: "var(--red-t)" }}>
            Plano de 7 dias
          </p>
          <h1 className={m("stack")}>
            <span className={m("s")}>Precisa de grana pra rodar?</span>
            <span>Levantar</span>
            <span style={{ color: "var(--red-t)" }}>caixa.</span>
          </h1>
          <p className={m("sub")} style={{ margin: 0, maxWidth: "56ch" }}>
            Defina a meta, escolha as jogadas e registre cada entrada até bater. Caixa primeiro, escala depois.
          </p>
        </div>
      </div>

      <div className={m("lc-grid")}>
        <div className={m("card")}>
          <h2>Calculadora da meta</h2>
          <div className={m("lc-calc")}>
            <div className={m("lc-in")}>
              {(
                [
                  ["meta", "Meta (R$)", 100],
                  ["ticket", "Ticket médio (R$)", 1],
                  ["conv", "Conversão (%)", 0.1],
                  ["dias", "Prazo (dias)", 1],
                ] as [keyof Calc, string, number][]
              ).map(([k, t, step]) => (
                <label key={k}>
                  {t}
                  <input
                    type="number"
                    inputMode="decimal"
                    min={step}
                    step={step}
                    defaultValue={c[k]}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (v > 0) setC((x) => ({ ...x, [k]: v }));
                    }}
                  />
                </label>
              ))}
            </div>
            <div className={m("lc-out")}>
              <div className={m("hl")}>
                <small>Vendas necessárias</small>
                <b>{vendas.toLocaleString("pt-BR")}</b>
              </div>
              <div>
                <small>Vendas por dia</small>
                <b>{vendasDia.toLocaleString("pt-BR")}</b>
              </div>
              <div>
                <small>Pessoas no link</small>
                <b>{leads.toLocaleString("pt-BR")}</b>
              </div>
              <div>
                <small>Pessoas por dia</small>
                <b>{porDia.toLocaleString("pt-BR")}</b>
              </div>
            </div>
            <p>
              Para {brl0(c.meta)} em {c.dias} dias com ticket de {brl0(c.ticket)}, você precisa levar cerca de{" "}
              {porDia.toLocaleString("pt-BR")} pessoas por dia até a oferta. Se isso parecer muito, suba o ticket ou combine
              jogadas.
            </p>
          </div>
        </div>

        <div className={m("card")}>
          <h2>Seu caixa</h2>
          <div className={m("lc-reg")}>
            <div className={m("lc-big")}>
              {brl0(total)}
              <small>de {brl0(c.meta)}</small>
            </div>
            <div className={m("prog")}>
              <i style={{ width: `${pct}%`, background: "linear-gradient(90deg,#9C7A33,#F1DC9A)" }} />
            </div>
            <span className={m("mono")} style={{ fontSize: 12, color: "var(--muted)" }}>
              {pct.toFixed(0)}% da meta{total >= c.meta ? " · META BATIDA" : ""}
            </span>
            <form className={m("lc-add")} onSubmit={registrar}>
              <input
                type="number"
                inputMode="decimal"
                min="1"
                step="0.01"
                placeholder="Valor (R$)"
                aria-label="Valor"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
              <select aria-label="Origem" value={origem} onChange={(e) => setOrigem(e.target.value)}>
                {ORIGENS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              <button className={m("btn btn-p")} type="submit">
                Registrar
              </button>
            </form>
            <ul className={m("lc-log")}>
              {[...entradas].reverse().map((e) => (
                <li key={e.id}>
                  <span>
                    {e.o}
                    <small>{e.d}</small>
                  </span>
                  <b>+{brl0(e.v)}</b>
                  <button type="button" aria-label="Apagar" onClick={() => setEntradas((x) => x.filter((y) => y.id !== e.id))}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
            {!entradas.length && (
              <p className={m("sub")} style={{ margin: 0, fontSize: 13 }}>
                Registre cada venda que entrar. A barra mostra quanto falta.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className={m("split")}>
        <h2 className={m("lc-h")}>Jogadas para levantar caixa</h2>
        <div className={m("seg")} role="group" aria-label="Filtro">
          {(
            [
              ["all", "Todas"],
              ["48h", "Em até 48 h"],
              ["zero", "Sem investimento"],
            ] as [typeof filtro, string][]
          ).map(([k, t]) => (
            <button key={k} type="button" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className={m("lc-plays")}>
        {jogadas.map(({ j, i }) => (
          <article key={j.t} className={m("lc-p")}>
            <div className={m("hd")}>
              <span className={m("n")}>{String(i + 1).padStart(2, "0")}</span>
              <div>
                <b className={m("t")}>{j.t}</b>
                <div className={m("tg")}>
                  <span className={m("tag am")}>Caixa em {j.prazo}</span>
                  <span className={m("tag ok")}>Sem investimento</span>
                </div>
              </div>
            </div>
            <p>{j.d}</p>
            <ol>
              {j.passos.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <details>
              <summary>Ver roteiro de mensagem ›</summary>
              <pre>{j.roteiro}</pre>
              <div className={m("row")}>
                <button className={m("btn btn-s")} type="button" style={{ minHeight: 38 }} onClick={() => copiar(j.roteiro)}>
                  Copiar roteiro
                </button>
                {j.afiliados && (
                  <button className={m("btn btn-p")} type="button" style={{ minHeight: 38 }} onClick={() => router.push("/dashboard/afiliados")}>
                    Abrir Afiliados
                  </button>
                )}
              </div>
            </details>
          </article>
        ))}
      </div>

      <div className={m("card")}>
        <div className={m("split")} style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Plano de 7 dias</h2>
          <span className={m("mono")} style={{ fontSize: 12, color: "var(--muted)" }}>
            {pctPlano}% do plano
          </span>
        </div>
        <div className={m("prog")} style={{ marginBottom: 14 }}>
          <i style={{ width: `${pctPlano}%` }} />
        </div>
        <div className={m("lc-days")}>
          {PLANO_7_DIAS.map(([dia, ...tarefas], i) => {
            const tudo = tarefas.every((_, j) => feito[`${i}-${j}`]);
            return (
              <div key={dia} className={m("lc-d" + (tudo ? " done" : ""))}>
                <span className={m("dh")}>{dia}</span>
                {tarefas.map((t, j) => {
                  const k = `${i}-${j}`;
                  return (
                    <label key={k}>
                      <input type="checkbox" checked={!!feito[k]} onChange={(e) => setFeito((f) => ({ ...f, [k]: e.target.checked }))} />
                      <span>{t}</span>
                    </label>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <p className={m("demo")}>
        Os valores são metas que você define, não promessa de ganho. Prazo de oferta tem que ser real e cumprido: nada de
        escassez falsa.
      </p>
    </section>
  );
}
