"use client";

import "../../_components/membros/painel.css";
import { useEffect, useRef, useState } from "react";
import { toast } from "../../_components/membros/Toast";
import { m } from "../../_components/membros/proto";
import { FUNIL_ETAPAS, GANCHOS, JOGOS, QUIZ } from "../../_lib/demo";
import { supabase } from "../../_lib/supabase";

type Jogo = "quiz" | "hook" | "funil";
type Fim = { k: Jogo; pontos: number; max: number; xp: number | null };
type Linha = { pos: number; nome: string; pontos: number; eu: boolean };

export default function Games() {
  const [ranking, setRanking] = useState<Linha[] | null>(null);
  const [jogo, setJogo] = useState<Jogo | null>(null);
  const [rodada, setRodada] = useState(0); // muda para reiniciar o mesmo jogo
  const [fim, setFim] = useState<Fim | null>(null);
  const [hoje, setHoje] = useState(0);
  const [recorde, setRecorde] = useState<Partial<Record<Jogo, number>>>({});
  const palco = useRef<HTMLDivElement>(null);

  function comecar(k: Jogo) {
    setFim(null);
    setJogo(k);
    setRodada((r) => r + 1);
    setTimeout(() => palco.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 30);
  }

  function carregarRanking() {
    supabase.rpc("ranking_games").then(({ data, error }) => setRanking(error ? [] : ((data ?? []) as Linha[])));
  }
  useEffect(carregarRanking, []);

  async function terminar(k: Jogo, pontos: number, max: number) {
    setFim({ k, pontos, max, xp: null });
    setRecorde((r) => ({ ...r, [k]: Math.max(r[k] ?? 0, pontos) }));
    const { data, error } = await supabase.rpc("registrar_partida", { p_jogo: k, p_pontos: pontos });
    const xp = error ? 0 : ((data as { xp: number }).xp ?? 0);
    setFim({ k, pontos, max, xp });
    setHoje((h) => h + xp);
    if (xp) toast(`+${xp} XP · game`, true);
    carregarRanking();
  }

  return (
    <section className={m("view")} aria-label="Games">
      <div className={m("top")}>
        <div>
          <h1>Games</h1>
          <p className={m("sub")}>Aprenda jogando. Seu melhor resultado do dia em cada jogo vale XP.</p>
        </div>
        <div className={m("chips")}>
          <span className={m("chip gold")}>
            <i className={m("num")}>{hoje}</i> XP hoje nos games
          </span>
        </div>
      </div>

      {!jogo ? (
        <div className={m("gm-list")}>
          {JOGOS.map((g) => {
            const soon = "soon" in g && g.soon;
            return (
              <button
                key={g.k}
                type="button"
                className={m("gm-c" + (soon ? " soon" : ""))}
                aria-disabled={soon || undefined}
                onClick={() => (soon ? toast("Em breve") : comecar(g.k as Jogo))}
              >
                <span className={m("ic")}>{g.ic}</span>
                <b>{g.t}</b>
                <p>{g.d}</p>
                <div className={m("mt")}>
                  <span className={m("tag am")}>{g.xp}</span>
                  {!soon && recorde[g.k as Jogo] !== undefined && (
                    <span className={m("tag")}>Recorde: {recorde[g.k as Jogo]}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className={m("gm-stage")} ref={palco}>
          {fim ? (
            <div className={m("gm-end")}>
              <p className={m("eb")}>Fim de jogo</p>
              <span className={m("sc")}>
                {fim.pontos}/{fim.max}
              </span>
              <p className={m("sub")} style={{ margin: 0 }}>
                {fim.pontos === fim.max
                  ? "Perfeito. Você domina esse assunto."
                  : fim.pontos >= fim.max / 2
                    ? "Mandou bem. Revise o módulo e volte para bater o recorde."
                    : "Bora revisar as aulas e tentar de novo."}
              </p>
              {fim.xp !== null && (
                <p className={m("demo")} style={{ margin: 0, textAlign: "center" }}>
                  {fim.xp > 0 ? `+${fim.xp} XP` : "Sem XP novo: só conta o melhor resultado do dia em cada jogo."}
                </p>
              )}
              <div className={m("row")} style={{ justifyContent: "center" }}>
                <button type="button" className={m("btn btn-p")} onClick={() => comecar(fim.k)}>
                  Jogar de novo
                </button>
                <button type="button" className={m("btn btn-s")} onClick={() => setJogo(null)}>
                  Voltar aos games
                </button>
              </div>
            </div>
          ) : jogo === "quiz" ? (
            <Quiz key={rodada} onSair={() => setJogo(null)} onFim={(p) => terminar("quiz", p, QUIZ.length)} />
          ) : jogo === "hook" ? (
            <Gancho key={rodada} onSair={() => setJogo(null)} onFim={(p) => terminar("hook", p, GANCHOS.length)} />
          ) : (
            <Funil key={rodada} onSair={() => setJogo(null)} onFim={(p) => terminar("funil", p, FUNIL_ETAPAS.length)} />
          )}
        </div>
      )}

      <div className={m("card")}>
        <h2>Ranking dos games · últimos 7 dias</h2>
        {ranking === null ? (
          <p className={m("sub")}>Carregando…</p>
        ) : ranking.length === 0 ? (
          <p className={m("sub")}>Ninguém jogou esta semana ainda. Seja o primeiro do ranking.</p>
        ) : (
          <ol className={m("rank")}>
            {ranking.map((r) => (
              <li key={r.pos} className={r.eu ? m("me") : undefined}>
                <span className={m("p")}>{String(r.pos).padStart(2, "0")}</span>
                <span>{r.eu ? "Você" : r.nome}</span>
                <span className={m("mono")} style={{ fontSize: 12 }}>
                  {r.pontos} XP
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function Topo({ titulo, children, onSair }: { titulo: string; children: React.ReactNode; onSair: () => void }) {
  return (
    <div className={m("gm-top")}>
      <b>{titulo}</b>
      <div className={m("meta")}>
        {children}
        <button type="button" className={m("btn btn-g")} onClick={onSair}>
          Sair
        </button>
      </div>
    </div>
  );
}

function Explicacao({ ok, tempo, texto, ultima, onProxima }: { ok: boolean; tempo?: boolean; texto: string; ultima: boolean; onProxima: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => btn.current?.focus(), []);
  return (
    <div>
      <div className={m("gm-ex")}>
        {ok ? (
          <b style={{ color: "var(--ok)" }}>Certo. </b>
        ) : tempo ? (
          <b>Tempo esgotado. </b>
        ) : (
          <b style={{ color: "#ff8a8a" }}>Quase. </b>
        )}
        {texto}
      </div>
      <div className={m("row")} style={{ marginTop: 12 }}>
        <button ref={btn} type="button" className={m("btn btn-p")} onClick={onProxima}>
          {ultima ? "Ver resultado" : "Próxima"}
        </button>
      </div>
    </div>
  );
}

/* ---------- Quiz relâmpago: 15 s por pergunta ---------- */
const TEMPO = 15;
function Quiz({ onFim, onSair }: { onFim: (p: number) => void; onSair: () => void }) {
  const [i, setI] = useState(0);
  const [acertos, setAcertos] = useState(0);
  const [resp, setResp] = useState<number | null>(null); // -1 = tempo esgotado
  const barra = useRef<HTMLElement>(null);
  const [pergunta, opcoes, certa, porque] = QUIZ[i];

  useEffect(() => {
    if (resp !== null) return;
    const t0 = Date.now();
    const id = setInterval(() => {
      const resta = TEMPO - (Date.now() - t0) / 1000;
      if (barra.current) barra.current.style.width = Math.max(0, (resta / TEMPO) * 100) + "%";
      if (resta <= 0) {
        clearInterval(id);
        setResp(-1);
      }
    }, 100);
    return () => clearInterval(id);
  }, [i, resp]);

  function responder(k: number) {
    if (resp !== null) return;
    setResp(k);
    if (k === certa) setAcertos((a) => a + 1);
  }

  function proxima() {
    if (i < QUIZ.length - 1) {
      setI(i + 1);
      setResp(null);
    } else onFim(acertos);
  }

  return (
    <>
      <Topo titulo="Quiz relâmpago" onSair={onSair}>
        <span className={m("tag")}>
          {i + 1}/{QUIZ.length}
        </span>
        <span className={m("tag am")}>{acertos} acertos</span>
      </Topo>
      <div className={m("gm-time")}>
        <i ref={barra} style={{ width: resp === null ? "100%" : undefined }} />
      </div>
      <p className={m("gm-q")}>{pergunta}</p>
      <div className={m("gm-ops")}>
        {opcoes.map((o, k) => (
          <button
            key={k}
            type="button"
            disabled={resp !== null}
            className={resp !== null ? (k === certa ? m("right") : k === resp ? m("wrong") : undefined) : undefined}
            onClick={() => responder(k)}
          >
            {o}
          </button>
        ))}
      </div>
      {resp !== null && (
        <Explicacao ok={resp === certa} tempo={resp === -1} texto={porque} ultima={i === QUIZ.length - 1} onProxima={proxima} />
      )}
    </>
  );
}

/* ---------- Gancho ou mico ---------- */
function Gancho({ onFim, onSair }: { onFim: (p: number) => void; onSair: () => void }) {
  const [i, setI] = useState(0);
  const [acertos, setAcertos] = useState(0);
  const [resp, setResp] = useState<0 | 1 | null>(null);
  const [frase, certo, porque] = GANCHOS[i];

  function escolher(v: 0 | 1) {
    if (resp !== null) return;
    setResp(v);
    if (v === certo) setAcertos((a) => a + 1);
  }

  return (
    <>
      <Topo titulo="Gancho ou mico" onSair={onSair}>
        <span className={m("tag")}>
          {i + 1}/{GANCHOS.length}
        </span>
        <span className={m("tag am")}>{acertos} acertos</span>
      </Topo>
      <div className={m("gm-hook")}>{frase}</div>
      <div className={m("gm-yn")}>
        <button type="button" className={m("btn btn-p")} disabled={resp !== null} onClick={() => escolher(1)}>
          Gancho
        </button>
        <button type="button" className={m("btn btn-s")} disabled={resp !== null} onClick={() => escolher(0)}>
          Mico
        </button>
      </div>
      {resp !== null && (
        <Explicacao
          ok={resp === certo}
          texto={porque}
          ultima={i === GANCHOS.length - 1}
          onProxima={() => {
            if (i < GANCHOS.length - 1) {
              setI(i + 1);
              setResp(null);
            } else onFim(acertos);
          }}
        />
      )}
    </>
  );
}

/* ---------- Monte o funil ---------- */
function embaralhar<T>(a: T[]) {
  const c = [...a];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

function Funil({ onFim, onSair }: { onFim: (p: number) => void; onSair: () => void }) {
  const [ordem] = useState(() => embaralhar(FUNIL_ETAPAS));
  const [prox, setProx] = useState(0);
  const [erros, setErros] = useState(0);
  const [tremer, setTremer] = useState<{ s: string; n: number } | null>(null);
  const [seg, setSeg] = useState(0);

  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setSeg(Math.round((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  function tocar(s: string) {
    if (FUNIL_ETAPAS.indexOf(s) === prox) {
      const n = prox + 1;
      setProx(n);
      if (n === FUNIL_ETAPAS.length) onFim(Math.max(0, FUNIL_ETAPAS.length - erros));
    } else {
      setErros((e) => e + 1);
      setTremer((t) => ({ s, n: (t?.n ?? 0) + 1 }));
    }
  }

  return (
    <>
      <Topo titulo="Monte o funil" onSair={onSair}>
        <span className={m("tag")}>Erros: {erros}</span>
        <span className={m("tag am")}>{seg} s</span>
      </Topo>
      <p className={m("gm-q")} style={{ fontSize: 18 }}>
        Toque nas etapas na ordem do funil, da primeira à última.
      </p>
      <div className={m("gm-fn")}>
        {ordem.map((s) => {
          const pos = FUNIL_ETAPAS.indexOf(s);
          const feito = pos < prox;
          const erro = tremer?.s === s;
          return (
            <button
              key={erro ? `${s}-${tremer!.n}` : s}
              type="button"
              disabled={feito}
              className={feito ? m("ok") : erro ? m("no") : undefined}
              onClick={() => tocar(s)}
            >
              <i>{feito ? pos + 1 : ""}</i>
              {s}
            </button>
          );
        })}
      </div>
    </>
  );
}
