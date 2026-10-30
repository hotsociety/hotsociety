"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "../../_components/membros/Toast";
import {
  CATALOGO,
  CHATS,
  FUNIS,
  GANCHOS,
  PERSONAS,
  QUIZ,
  gerarContas,
  misturarOpcoes,
  embaralhar,
  sortear,
  type InfoJogo,
  type JogoId,
  type Pergunta,
} from "../../_lib/games";
import { supabase } from "../../_lib/supabase";
import "./games.css";

type Resumo = { partidas: number; limite: number; hoje: Partial<Record<JogoId, number>>; recorde: Partial<Record<JogoId, number>> };
type Linha = { pos: number; nome: string; avatar: string | null; pontos: number; jogos: number; eu: boolean };
type Erro = { q: string; certa: string; porque: string };
type Fim = { k: JogoId; pontos: number; max: number; xp: number | null; limite?: boolean; erros: Erro[]; recordeAntes: number };
type Placar = (pontos: number, erros: Erro[]) => void;

const CATS = ["Todos", "Conhecimento", "Conteúdo", "Vendas", "Números"] as const;
const info = (k: JogoId) => CATALOGO.find((j) => j.k === k)!;
const jogoDoDia = () => {
  const d = new Date();
  const n = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  return CATALOGO[n % CATALOGO.length];
};

export default function Games() {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [ranking, setRanking] = useState<Linha[] | null>(null);
  const [jogo, setJogo] = useState<JogoId | null>(null);
  const [rodada, setRodada] = useState(0);
  const [fim, setFim] = useState<Fim | null>(null);
  const [cat, setCat] = useState<(typeof CATS)[number]>("Todos");
  const topo = useRef<HTMLDivElement>(null);
  const doDia = useMemo(jogoDoDia, []);

  function carregar() {
    supabase.rpc("meus_games").then(({ data }) => data && setResumo(data as Resumo));
    supabase.rpc("ranking_games").then(({ data, error }) => setRanking(error ? [] : ((data ?? []) as Linha[])));
  }
  useEffect(carregar, []);

  const subir = () => setTimeout(() => topo.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 30);

  function comecar(k: JogoId) {
    setFim(null);
    setJogo(k);
    setRodada((r) => r + 1);
    subir();
  }
  function sair() {
    setJogo(null);
    setFim(null);
    subir();
  }

  async function terminar(k: JogoId, pontos: number, erros: Erro[]) {
    const max = info(k).max;
    const recordeAntes = resumo?.recorde[k] ?? 0;
    setFim({ k, pontos, max, xp: null, erros, recordeAntes });
    const { data, error } = await supabase.rpc("registrar_partida", { p_jogo: k, p_pontos: pontos });
    const r = (data ?? {}) as { xp?: number; limite?: boolean };
    const xp = error ? 0 : (r.xp ?? 0);
    setFim({ k, pontos, max, xp, limite: r.limite, erros, recordeAntes });
    if (xp) toast(`+${xp} XP · ${info(k).t}`, true);
    carregar();
  }

  const xpHoje = resumo ? Object.values(resumo.hoje).reduce((a, p) => a + (p ?? 0) * 10, 0) : 0;
  const xpMax = CATALOGO.reduce((a, j) => a + j.max * 10, 0);
  const perfeitos = resumo ? CATALOGO.filter((j) => (resumo.hoje[j.k] ?? 0) >= j.max).length : 0;
  const lista = CATALOGO.filter((j) => cat === "Todos" || j.cat === cat);

  return (
    <section className="hs-gm" aria-label="Games" ref={topo}>
      {!jogo ? (
        <>
          <header className="hs-gm-hero hs-escuro">
            <div className="hs-gm-hero-tx">
              <p className="hs-gm-eb">Arena HOT SOCIETY</p>
              <h1>
                Games<span>.</span>
              </h1>
              <p className="hs-gm-sub">Aprenda jogando. O melhor resultado do dia em cada jogo vira XP para o ranking da temporada.</p>
              <button type="button" className="hs-gm-dia" onClick={() => comecar(doDia.k)} style={{ "--c": doDia.cor } as React.CSSProperties}>
                <span className="ic" aria-hidden>
                  {doDia.ic}
                </span>
                <span className="tx">
                  <small>Jogo do dia</small>
                  <b>{doDia.t}</b>
                </span>
                <span className="go">Jogar ▸</span>
              </button>
            </div>
            <ul className="hs-gm-stats" aria-label="Seu dia nos games">
              <li className="xp">
                <Anel v={xpHoje} max={xpMax} />
                <span>
                  <b>{xpHoje}</b>
                  <small>de {xpMax} XP hoje</small>
                </span>
              </li>
              <li>
                <b>
                  {resumo?.partidas ?? 0}
                  <em>/{resumo?.limite ?? 20}</em>
                </b>
                <small>partidas hoje</small>
              </li>
              <li>
                <b>
                  {perfeitos}
                  <em>/{CATALOGO.length}</em>
                </b>
                <small>gabaritados hoje</small>
              </li>
            </ul>
          </header>

          <div className="hs-gm-filtro" role="tablist" aria-label="Categorias">
            {CATS.map((c) => (
              <button key={c} type="button" role="tab" aria-selected={cat === c} onClick={() => setCat(c)}>
                {c}
              </button>
            ))}
          </div>

          <div className="hs-gm-grade">
            {lista.map((j) => (
              <CartaoJogo key={j.k} j={j} hoje={resumo?.hoje[j.k]} recorde={resumo?.recorde[j.k]} dia={j.k === doDia.k} onJogar={() => comecar(j.k)} />
            ))}
          </div>

          <Ranking linhas={ranking} />
        </>
      ) : (
        <div className="hs-gm-palco" style={{ "--c": info(jogo).cor } as React.CSSProperties}>
          {fim ? (
            <FimDeJogo fim={fim} onDeNovo={() => comecar(fim.k)} onSair={sair} />
          ) : (
            <Partida key={rodada} k={jogo} onSair={sair} onFim={(p, e) => terminar(jogo, p, e)} />
          )}
        </div>
      )}
    </section>
  );
}

/* ---------------- Hub ---------------- */

function Anel({ v, max }: { v: number; max: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg className="hs-gm-anel" viewBox="0 0 52 52" aria-hidden>
      <circle cx="26" cy="26" r={r} />
      <circle cx="26" cy="26" r={r} style={{ strokeDasharray: c, strokeDashoffset: c * (1 - Math.min(1, v / Math.max(1, max))) }} />
    </svg>
  );
}

function CartaoJogo({ j, hoje, recorde, dia, onJogar }: { j: InfoJogo; hoje?: number; recorde?: number; dia: boolean; onJogar: () => void }) {
  const feito = (hoje ?? 0) >= j.max;
  return (
    <button type="button" className={"hs-gm-card" + (feito ? " feito" : "")} style={{ "--c": j.cor } as React.CSSProperties} onClick={onJogar}>
      <span className="hs-gm-card-art" aria-hidden>
        <span className="em">{j.ic}</span>
      </span>
      <span className="hs-gm-card-tags">
        <em>{j.cat}</em>
        {j.novo && <em className="novo">Novo</em>}
        {dia && <em className="dia">Jogo do dia</em>}
        {feito && <em className="ok">✓ Gabaritado</em>}
      </span>
      <b className="hs-gm-card-t">{j.t}</b>
      <span className="hs-gm-card-d">{j.d}</span>
      <span className="hs-gm-card-pg" aria-label={`Hoje: ${hoje ?? 0} de ${j.max}`}>
        {Array.from({ length: j.max }, (_, i) => (
          <i key={i} className={i < (hoje ?? 0) ? "on" : undefined} />
        ))}
      </span>
      <span className="hs-gm-card-rod">
        <span>⏱ {j.dur}</span>
        <span>até {j.max * 10} XP</span>
        {recorde !== undefined && <span>🏆 {recorde}/{j.max}</span>}
        <span className="go">{hoje ? "Jogar de novo" : "Jogar"} ▸</span>
      </span>
    </button>
  );
}

function iniciais(n: string) {
  return n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
function Foto({ l }: { l: Linha }) {
  if (l.avatar)
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="hs-gm-av" src={l.avatar} alt="" loading="lazy" />;
  let h = 0;
  for (const ch of l.nome) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return (
    <span className="hs-gm-av" style={{ background: `hsl(${h} 38% 34%)` }} aria-hidden>
      {iniciais(l.nome)}
    </span>
  );
}

function Ranking({ linhas }: { linhas: Linha[] | null }) {
  const top = linhas?.filter((l) => l.pos <= 3) ?? [];
  const resto = linhas?.filter((l) => l.pos > 3) ?? [];
  const podio = [top.find((l) => l.pos === 2), top.find((l) => l.pos === 1), top.find((l) => l.pos === 3)];
  const max = Math.max(1, ...(linhas ?? []).map((l) => l.pontos));
  return (
    <div className="hs-gm-rank">
      <div className="hs-gm-rank-cab">
        <div>
          <p className="hs-gm-eb">Ranking dos games</p>
          <h2>Últimos 7 dias</h2>
        </div>
        <small>Soma do melhor resultado de cada jogo, por dia</small>
      </div>
      {linhas === null ? (
        <p className="hs-gm-vazio">Carregando…</p>
      ) : linhas.length === 0 ? (
        <div className="hs-gm-vazio">
          <span aria-hidden>🏆</span>
          <b>O pódio está vazio</b>
          <p>Ninguém pontuou esta semana ainda. Jogue uma partida e entre no topo.</p>
        </div>
      ) : (
        <>
          <ol className="hs-gm-podio">
            {podio.map((l, i) =>
              l ? (
                <li key={l.pos} className={"p" + l.pos + (l.eu ? " eu" : "")}>
                  <span className="cor" aria-hidden>
                    {l.pos === 1 ? "👑" : ""}
                  </span>
                  <Foto l={l} />
                  <b>{l.eu ? "Você" : l.nome}</b>
                  <small>{l.pontos} XP</small>
                  <span className="base">{l.pos}</span>
                </li>
              ) : (
                <li key={"v" + i} className="vago" aria-hidden />
              ),
            )}
          </ol>
          {resto.length > 0 && (
            <ol className="hs-gm-lista">
              {resto.map((l) => (
                <li key={l.pos} className={l.eu ? "eu" : undefined}>
                  <span className="n">{String(l.pos).padStart(2, "0")}</span>
                  <Foto l={l} />
                  <span className="nm">
                    <b>{l.eu ? "Você" : l.nome}</b>
                    <small>
                      {l.jogos} {l.jogos === 1 ? "jogo" : "jogos"}
                    </small>
                  </span>
                  <span className="br" aria-hidden>
                    <i style={{ width: `${(l.pontos / max) * 100}%` }} />
                  </span>
                  <span className="xp">{l.pontos} XP</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- Partida ---------------- */

function Partida({ k, onFim, onSair }: { k: JogoId; onFim: Placar; onSair: () => void }) {
  if (k === "hook") return <Gancho onFim={onFim} onSair={onSair} />;
  if (k === "funil") return <MonteFunil onFim={onFim} onSair={onSair} />;
  const cfg = {
    quiz: { banco: () => sortear(QUIZ).map(misturarOpcoes), tempo: 15, modo: "quiz" as const },
    persona: { banco: () => sortear(PERSONAS).map(misturarOpcoes), tempo: 0, modo: "persona" as const },
    chat: { banco: () => sortear(CHATS).map(misturarOpcoes), tempo: 0, modo: "chat" as const },
    conta: { banco: gerarContas, tempo: 20, modo: "conta" as const },
  }[k];
  return <Escolha k={k} gerar={cfg.banco} tempo={cfg.tempo} modo={cfg.modo} onFim={onFim} onSair={onSair} />;
}

function Topo({ k, i, total, marcas, onSair, children }: { k: JogoId; i: number; total: number; marcas: (boolean | null)[]; onSair: () => void; children?: React.ReactNode }) {
  const j = info(k);
  return (
    <div className="hs-gm-topo">
      <button type="button" className="hs-gm-sair" onClick={onSair} aria-label="Sair do jogo">
        ✕
      </button>
      <span className="hs-gm-topo-t">
        <span aria-hidden>{j.ic}</span>
        <b>{j.t}</b>
      </span>
      <span className="hs-gm-pips" aria-label={`Rodada ${Math.min(i + 1, total)} de ${total}`}>
        {Array.from({ length: total }, (_, n) => (
          <i key={n} className={marcas[n] === true ? "ok" : marcas[n] === false ? "no" : n === i ? "at" : undefined} />
        ))}
      </span>
      {children}
    </div>
  );
}

function Feedback({ ok, tempo, texto, ultima, onProxima }: { ok: boolean; tempo?: boolean; texto: string; ultima: boolean; onProxima: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => btn.current?.focus({ preventScroll: true }), []);
  return (
    <div className={"hs-gm-fb " + (ok ? "ok" : "no")} role="status">
      <span className="ic" aria-hidden>
        {ok ? "✓" : tempo ? "⏱" : "✕"}
      </span>
      <p>
        <b>{ok ? pick(["Na mosca.", "Isso aí.", "Certíssimo.", "Mandou bem."]) : tempo ? "Tempo esgotado." : "Não foi dessa vez."}</b> {texto}
      </p>
      <button ref={btn} type="button" className="hs-gm-btn p" onClick={onProxima}>
        {ultima ? "Ver resultado" : "Próxima"} <kbd>Enter</kbd>
      </button>
    </div>
  );
}
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/* Quiz, Persona, Objeção na DM e Calcula o caixa: múltipla escolha com apresentações diferentes. */
function Escolha({
  k,
  gerar,
  tempo,
  modo,
  onFim,
  onSair,
}: {
  k: JogoId;
  gerar: () => Pergunta[];
  tempo: number;
  modo: "quiz" | "persona" | "chat" | "conta";
  onFim: Placar;
  onSair: () => void;
}) {
  const [perguntas] = useState(gerar);
  const [i, setI] = useState(0);
  const [resp, setResp] = useState<number | null>(null); // -1 = tempo esgotado
  const [marcas, setMarcas] = useState<(boolean | null)[]>(() => perguntas.map(() => null));
  const [erros, setErros] = useState<Erro[]>([]);
  const [combo, setCombo] = useState(0);
  const barra = useRef<HTMLElement>(null);
  const p = perguntas[i];
  const ultima = i === perguntas.length - 1;
  const acertos = marcas.filter(Boolean).length;

  useEffect(() => {
    if (!tempo || resp !== null) return;
    const t0 = Date.now();
    const id = setInterval(() => {
      const resta = tempo - (Date.now() - t0) / 1000;
      if (barra.current) {
        barra.current.style.width = Math.max(0, (resta / tempo) * 100) + "%";
        barra.current.dataset.urg = resta < 5 ? "1" : "";
      }
      if (resta <= 0) {
        clearInterval(id);
        responder(-1);
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, resp, tempo]);

  function responder(n: number) {
    if (resp !== null) return;
    setResp(n);
    const ok = n === p.certa;
    setMarcas((m) => m.map((v, x) => (x === i ? ok : v)));
    setCombo((c) => (ok ? c + 1 : 0));
    if (!ok) setErros((e) => [...e, { q: p.q, certa: p.ops[p.certa], porque: p.porque }]);
  }

  function proxima() {
    if (!ultima) {
      setI(i + 1);
      setResp(null);
    } else onFim(marcas.filter(Boolean).length, erros);
  }

  // Teclado: 1–4 escolhe, Enter avança.
  useEffect(() => {
    const ouvir = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const n = Number(e.key) - 1;
      if (resp === null && n >= 0 && n < p.ops.length) responder(n);
    };
    window.addEventListener("keydown", ouvir);
    return () => window.removeEventListener("keydown", ouvir);
  });

  const opcoes = (
    <div className={"hs-gm-ops " + modo}>
      {p.ops.map((o, n) => (
        <button
          key={n}
          type="button"
          disabled={resp !== null}
          className={resp !== null ? (n === p.certa ? "certa" : n === resp ? "errada" : "apagada") : undefined}
          onClick={() => responder(n)}
        >
          <kbd>{n + 1}</kbd>
          <span>{o}</span>
        </button>
      ))}
    </div>
  );

  return (
    <>
      <Topo k={k} i={i} total={perguntas.length} marcas={marcas} onSair={onSair}>
        <span className="hs-gm-placar">
          <b>{acertos}</b> pts{combo >= 2 && <em>🔥 {combo} seguidas</em>}
        </span>
      </Topo>
      {tempo > 0 && (
        <div className="hs-gm-tempo">
          <i ref={barra} key={i} style={{ width: resp === null ? "100%" : undefined }} />
        </div>
      )}

      {modo === "chat" ? (
        <div className="hs-gm-chat" key={i}>
          <div className="hs-gm-chat-cab">
            <span className="av" aria-hidden>
              {String.fromCharCode(65 + ((i * 7) % 26))}
            </span>
            <span>
              <b>Lead #{1000 + i * 137}</b>
              <small>online agora</small>
            </span>
          </div>
          <div className="hs-gm-chat-msgs">
            <p className="ele">{p.q}</p>
            {resp === null ? <p className="digitando" aria-label="Escolha a resposta">•••</p> : resp >= 0 && <p className="eu">{p.ops[resp]}</p>}
          </div>
          <p className="hs-gm-dica">Qual resposta você manda?</p>
          {opcoes}
        </div>
      ) : (
        <div className={"hs-gm-q " + modo} key={i}>
          {p.ctx && <span className="ctx">{modo === "persona" ? "Briefing · " : ""}{p.ctx}</span>}
          <p>{p.q}</p>
          {opcoes}
        </div>
      )}

      {resp !== null && <Feedback ok={resp === p.certa} tempo={resp === -1} texto={p.porque} ultima={ultima} onProxima={proxima} />}
    </>
  );
}

/* Gancho ou mico: cartão no centro, ← mico / gancho →. */
function Gancho({ onFim, onSair }: { onFim: Placar; onSair: () => void }) {
  const [frases] = useState(() => sortear(GANCHOS));
  const [i, setI] = useState(0);
  const [resp, setResp] = useState<boolean | null>(null);
  const [marcas, setMarcas] = useState<(boolean | null)[]>(() => frases.map(() => null));
  const [erros, setErros] = useState<Erro[]>([]);
  const g = frases[i];
  const ultima = i === frases.length - 1;

  function escolher(v: boolean) {
    if (resp !== null) return;
    setResp(v);
    const ok = v === g.ok;
    setMarcas((m) => m.map((x, n) => (n === i ? ok : x)));
    if (!ok) setErros((e) => [...e, { q: `“${g.f}”`, certa: g.ok ? "Gancho" : "Mico", porque: g.porque }]);
  }

  useEffect(() => {
    const ouvir = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") escolher(false);
      if (e.key === "ArrowRight") escolher(true);
    };
    window.addEventListener("keydown", ouvir);
    return () => window.removeEventListener("keydown", ouvir);
  });

  return (
    <>
      <Topo k="hook" i={i} total={frases.length} marcas={marcas} onSair={onSair}>
        <span className="hs-gm-placar">
          <b>{marcas.filter(Boolean).length}</b> pts
        </span>
      </Topo>
      <div className="hs-gm-hookpilha">
        <span className="atras" aria-hidden />
        <span className="atras b" aria-hidden />
        <div key={i} className={"hs-gm-hook" + (resp === null ? "" : resp ? " dir" : " esq")}>
          <small>Reels · primeiros 2 segundos</small>
          <p>“{g.f}”</p>
          {resp !== null && <span className={"selo " + (resp === g.ok ? "ok" : "no")}>{g.ok ? "GANCHO" : "MICO"}</span>}
        </div>
      </div>
      <div className="hs-gm-yn">
        <button type="button" className="mico" disabled={resp !== null} onClick={() => escolher(false)}>
          <kbd>←</kbd> 🙈 Mico
        </button>
        <button type="button" className="gancho" disabled={resp !== null} onClick={() => escolher(true)}>
          🎣 Gancho <kbd>→</kbd>
        </button>
      </div>
      {resp !== null && (
        <Feedback
          ok={resp === g.ok}
          texto={g.porque}
          ultima={ultima}
          onProxima={() => {
            if (!ultima) {
              setI(i + 1);
              setResp(null);
            } else onFim(marcas.filter(Boolean).length, erros);
          }}
        />
      )}
    </>
  );
}

/* Monte o funil: toque nas etapas na ordem. Cada erro tira um ponto. */
function MonteFunil({ onFim, onSair }: { onFim: Placar; onSair: () => void }) {
  const [f] = useState(() => FUNIS[Math.floor(Math.random() * FUNIS.length)]);
  const [ordem] = useState(() => embaralhar(f.etapas));
  const [prox, setProx] = useState(0);
  const [erros, setErros] = useState(0);
  const [tremer, setTremer] = useState<{ s: string; n: number } | null>(null);
  const [seg, setSeg] = useState(0);
  const [pronto, setPronto] = useState(false);
  const total = f.etapas.length;
  const pontos = Math.max(0, total - erros);

  useEffect(() => {
    if (pronto) return;
    const t0 = Date.now();
    const id = setInterval(() => setSeg(Math.floor((Date.now() - t0) / 1000)), 250);
    return () => clearInterval(id);
  }, [pronto]);

  function tocar(s: string) {
    if (pronto) return;
    if (f.etapas.indexOf(s) === prox) {
      const n = prox + 1;
      setProx(n);
      if (n === total) setPronto(true);
    } else {
      setErros((e) => e + 1);
      setTremer((t) => ({ s, n: (t?.n ?? 0) + 1 }));
    }
  }

  const marcas = f.etapas.map((_, n) => (n < prox ? true : null));

  return (
    <>
      <Topo k="funil" i={prox} total={total} marcas={marcas} onSair={onSair}>
        <span className="hs-gm-placar">
          <b>{pontos}</b> pts · {erros} {erros === 1 ? "erro" : "erros"} · {seg}s
        </span>
      </Topo>
      <div className="hs-gm-q">
        <span className="ctx">{f.t}</span>
        <p>Toque nas etapas na ordem, da primeira à última.</p>
      </div>
      <div className="hs-gm-funil">
        <ol className="hs-gm-funil-alvo" aria-label="Seu funil">
          {f.etapas.map((s, n) => (
            <li key={s} className={n < prox ? "on" : undefined} style={{ "--w": `${100 - n * 11}%` } as React.CSSProperties}>
              <i>{n + 1}</i>
              <span>{n < prox ? s : "…"}</span>
            </li>
          ))}
        </ol>
        <div className="hs-gm-funil-pecas">
          {ordem.map((s) => {
            const feito = f.etapas.indexOf(s) < prox;
            const erro = tremer?.s === s;
            return (
              <button key={erro ? `${s}-${tremer!.n}` : s} type="button" disabled={feito || pronto} className={feito ? "usada" : erro ? "no" : undefined} onClick={() => tocar(s)}>
                {s}
              </button>
            );
          })}
        </div>
      </div>
      {pronto && (
        <Feedback
          ok={erros === 0}
          texto={erros === 0 ? `Funil montado sem erro em ${seg} segundos.` : `Funil montado com ${erros} ${erros === 1 ? "erro" : "erros"}. A ordem certa ficou acima: decore e tente zerar.`}
          ultima
          onProxima={() => onFim(pontos, erros ? [{ q: f.t, certa: f.etapas.join(" → "), porque: "Cada etapa prepara a próxima: atenção, interesse, confiança e só então a venda." }] : [])}
        />
      )}
    </>
  );
}

/* ---------------- Fim de jogo ---------------- */

function FimDeJogo({ fim, onDeNovo, onSair }: { fim: Fim; onDeNovo: () => void; onSair: () => void }) {
  const j = info(fim.k);
  const pct = fim.pontos / fim.max;
  const estrelas = pct === 1 ? 3 : pct >= 0.66 ? 2 : pct >= 0.33 ? 1 : 0;
  const recorde = fim.pontos > fim.recordeAntes;
  const frase = pct === 1 ? "Gabaritou. Você domina esse assunto." : pct >= 0.5 ? "Mandou bem. Revise os erros e volte para gabaritar." : "Bora revisar as aulas e tentar de novo.";
  return (
    <div className="hs-gm-fim">
      {pct === 1 && <Confete />}
      <p className="hs-gm-eb">
        {j.ic} {j.t}
      </p>
      <div className="hs-gm-estrelas" aria-label={`${estrelas} de 3 estrelas`}>
        {[0, 1, 2].map((n) => (
          <span key={n} className={n < estrelas ? "on" : undefined} style={{ animationDelay: `${0.15 + n * 0.18}s` }}>
            ★
          </span>
        ))}
      </div>
      <div className="hs-gm-nota">
        {fim.pontos}
        <small>/{fim.max}</small>
      </div>
      <p className="hs-gm-frase">{frase}</p>
      <div className="hs-gm-selos">
        <span className={"xp" + (fim.xp ? " on" : "")}>
          {fim.xp === null ? "Salvando…" : fim.limite ? "Limite de 20 partidas hoje" : fim.xp > 0 ? `+${fim.xp} XP` : "Sem XP novo hoje"}
        </span>
        {recorde && fim.pontos > 0 && <span className="rec">🏆 Novo recorde</span>}
      </div>
      {fim.xp === 0 && !fim.limite && <p className="hs-gm-nota-xp">Só conta o melhor resultado do dia em cada jogo. Supere {fim.max > fim.pontos ? "sua melhor marca" : "o seu dia"} em outro jogo.</p>}

      {fim.erros.length > 0 && (
        <details className="hs-gm-rev">
          <summary>
            Revisar {fim.erros.length} {fim.erros.length === 1 ? "erro" : "erros"}
          </summary>
          <ul>
            {fim.erros.map((e, n) => (
              <li key={n}>
                <b>{e.q}</b>
                <span>
                  Resposta: <em>{e.certa}</em>
                </span>
                <small>{e.porque}</small>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="hs-gm-fim-acoes">
        <button type="button" className="hs-gm-btn p" onClick={onDeNovo} autoFocus>
          Jogar de novo
        </button>
        <button type="button" className="hs-gm-btn s" onClick={onSair}>
          Todos os games
        </button>
      </div>
    </div>
  );
}

function Confete() {
  const [pecas] = useState(() =>
    Array.from({ length: 36 }, (_, n) => ({
      l: Math.random() * 100,
      d: Math.random() * 0.6,
      t: 1.6 + Math.random() * 1.2,
      c: ["#F1DC9A", "#C9A24E", "#fff", "#E0714F", "#3ECF72"][n % 5],
      r: Math.random() * 360,
    })),
  );
  return (
    <span className="hs-gm-confete" aria-hidden>
      {pecas.map((p, n) => (
        <i key={n} style={{ left: `${p.l}%`, background: p.c, animationDelay: `${p.d}s`, animationDuration: `${p.t}s`, transform: `rotate(${p.r}deg)` }} />
      ))}
    </span>
  );
}
