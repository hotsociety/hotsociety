"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { supabase } from "../../../_lib/supabase";
import { useMembro } from "../MemberContext";
import {
  CATEGORIAS,
  COFRE_INICIAL,
  CORES,
  LIVES,
  MISSOES_HP,
  POSTS_HP,
  RESPOSTAS,
  RESPOSTA_PADRAO,
  SUGESTOES_IA,
  type Cor,
  type Nota,
} from "./dados";
import { h } from "./h";
import "./hotphone.css";

/* ================================================================
   HOTPHONE by Cappu
   - Presente de boas-vindas: aparece uma única vez, no primeiro acesso
     depois da compra (fica marcado no perfil do Supabase e no navegador).
   - Depois vira um celular no canto da tela: CappuIA, Cofre, Feed,
     Aulas, Missões, Lives e Ajustes.
   ================================================================ */

const SIMBOLO = "/brand/hs-simbolo.svg";
const LOGO = "/brand/hs-logo.svg";
const AV_IA = "/img/feed/cappuia.jpg";
const WALL = "/img/hero-neve.jpg";
const EVENTO = "hs-hotphone-abrir";

/** Abre o HOTPHONE de qualquer tela (ex.: card na Área de Membros). */
export function abrirHotphone() {
  window.dispatchEvent(new Event(EVENTO));
}

type Estado = {
  done: boolean;
  color: string;
  tip: boolean;
  cofre: Nota[] | null;
  miss: Record<string, boolean>;
  rem: Record<string, boolean>;
  liked: Record<number, boolean>;
};
const VAZIO: Estado = { done: false, color: "onix", tip: false, cofre: null, miss: {}, rem: {}, liked: {} };

function ler(chave: string): Estado {
  try {
    const s = JSON.parse(localStorage.getItem(chave) || "null");
    return s ? { ...VAZIO, ...s } : VAZIO;
  } catch {
    return VAZIO;
  }
}

const corDe = (k: string): Cor => CORES.find((c) => c.k === k) ?? CORES[0];
const varsCor = (c: Cor) => ({ "--pc": c.pc, "--pc2": c.pc2, "--pb": c.pb, "--pb2": c.pb2, "--pt": c.pt }) as CSSProperties;
const hhmm = () => new Date().toTimeString().slice(0, 5);
const dataTxt = () => new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
const reduzir = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useRelogio() {
  const [t, setT] = useState(hhmm);
  useEffect(() => {
    const id = setInterval(() => setT(hhmm()), 20000);
    return () => clearInterval(id);
  }, []);
  return t;
}

/* ---------- peças do aparelho ---------- */
function Frente({ w, children, style }: { w?: number; children?: ReactNode; style?: CSSProperties }) {
  return (
    <div className={h("hp")} style={{ ...(w ? ({ "--w": `${w}px` } as CSSProperties) : null), ...style }}>
      <div className={h("sc")}>
        <div className={h("isl")} />
        {children}
      </div>
    </div>
  );
}

function Verso({ w }: { w: number }) {
  return (
    <div className={h("hpback")} style={{ "--w": `${w}px` } as CSSProperties}>
      <div className={h("cam")}>
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className={h("mk")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SIMBOLO} alt="" width={56} height={56} />
        <b>HOTPHONE</b>
        <small>BY CAPPU</small>
      </div>
    </div>
  );
}

function TelaBloqueio() {
  const t = useRelogio();
  return (
    <div className={h("os")}>
      <div className={h("wall")} style={{ backgroundImage: `url(${WALL})` }} />
      <div className={h("sbar")}>
        <span>{t}</span>
        <span>5G ▮▮▮</span>
      </div>
      <div className={h("home")} style={{ justifyContent: "flex-start" }}>
        <div className={h("clock")}>
          <b>{t}</b>
          <small>{dataTxt()}</small>
        </div>
        <div className={h("wid")} style={{ marginTop: "auto" }}>
          <div className={h("r")}>
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AV_IA} alt="" style={{ width: 26, height: 26, borderRadius: 7 }} />
              <span>
                <b style={{ fontSize: 11 }}>CappuIA</b>
                <br />
                <span style={{ fontSize: 11, color: "#d9d6ce" }}>Bora montar sua primeira semana?</span>
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================ */

export default function HotPhone() {
  const { user, nome } = useMembro();
  const chave = `hotphone:${user.id}`;
  const meta = (user.user_metadata as { hotphone?: { done?: boolean; cor?: string } } | undefined)?.hotphone;

  const [S, setS] = useState<Estado>(() => {
    const local = ler(chave);
    return { ...local, done: local.done || !!meta?.done, color: meta?.cor ?? local.color };
  });
  const [aberto, setAberto] = useState(false);
  const [saindo, setSaindo] = useState(false); // animação de saída do presente

  useEffect(() => {
    try {
      localStorage.setItem(chave, JSON.stringify(S));
    } catch {}
  }, [chave, S]);

  useEffect(() => {
    const abrir = () => S.done && setAberto(true);
    window.addEventListener(EVENTO, abrir);
    return () => window.removeEventListener(EVENTO, abrir);
  }, [S.done]);

  const cor = corDe(S.color);
  const atualizar = (p: Partial<Estado>) => setS((s) => ({ ...s, ...p }));

  function salvarNoPerfil(done: boolean, k: string) {
    // melhor esforço: se falhar, o navegador já guardou
    supabase.auth.updateUser({ data: { hotphone: { done, cor: k } } }).catch(() => {});
  }

  function concluir() {
    setSaindo(true);
    setTimeout(
      () => {
        atualizar({ done: true });
        setSaindo(false);
        salvarNoPerfil(true, S.color);
      },
      reduzir() ? 0 : 500,
    );
  }

  return (
    <div className={h("hpw")} style={varsCor(cor)}>
      {!S.done && (
        <Presente
          primeiro={nome}
          cor={S.color}
          saindo={saindo}
          onCor={(k) => atualizar({ color: k })}
          onFim={concluir}
        />
      )}
      {S.done && (
        <div className={h("hpdock")} style={varsCor(cor)}>
          {aberto ? (
            <Celular
              S={S}
              nome={nome}
              atualizar={atualizar}
              onCor={(k) => {
                atualizar({ color: k });
                salvarNoPerfil(true, k);
              }}
              onRever={() => {
                setAberto(false);
                atualizar({ done: false });
              }}
              onFechar={() => setAberto(false)}
            />
          ) : (
            <>
              <button className={h("hpmini")} aria-label="Abrir o HOTPHONE" onClick={() => setAberto(true)}>
                <Frente w={78}>
                  <div
                    className={h("wall")}
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `#0A0A0B url(${WALL}) center 30%/cover`,
                      filter: "grayscale(1) brightness(.4)",
                    }}
                  />
                  <MiniHora />
                  <div className={h("ntf")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={AV_IA} alt="" />
                    CappuIA: bora?
                  </div>
                </Frente>
                <span className={h("bdg")}>2</span>
              </button>
              {!S.tip && (
                <div className={h("hptip")} role="status">
                  Seu <b>HOTPHONE</b> fica aqui. Toque para abrir a CappuIA, o cofre e o feed.
                  <button type="button" aria-label="Fechar dica" onClick={() => atualizar({ tip: true })}>
                    ×
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MiniHora() {
  const t = useRelogio();
  return (
    <div className={h("lock")}>
      <b>{t}</b>
      <small>HOTPHONE</small>
    </div>
  );
}

/* ================= presente de boas-vindas ================= */
const PASSOS = ["ticket", "gift", "cor", "abrir"] as const;

function Presente({
  primeiro,
  cor,
  saindo,
  onCor,
  onFim,
}: {
  primeiro: string;
  cor: string;
  saindo: boolean;
  onCor: (k: string) => void;
  onFim: () => void;
}) {
  const [passo, setPasso] = useState(0);
  const [frente, setFrente] = useState(false);
  const [ligado, setLigado] = useState(false);
  const k = PASSOS[passo];
  const fim = useRef(onFim);
  useEffect(() => {
    fim.current = onFim;
  });

  useEffect(() => {
    if (k !== "abrir") return;
    const r = reduzir();
    const a = setTimeout(() => setLigado(true), r ? 100 : 1900);
    const b = setTimeout(() => fim.current(), r ? 300 : 3200);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [k]);

  const proximo = () => setPasso((p) => Math.min(PASSOS.length - 1, p + 1));
  const c = corDe(cor);

  return (
    <div
      className={h("hpflow" + (k !== "ticket" ? " lit" : "") + (saindo ? " fade" : ""))}
      role="dialog"
      aria-modal="true"
      aria-label="Boas-vindas à HOT SOCIETY"
      style={varsCor(c)}
    >
      <div className={h("rays")} />
      <div className={h("glow")} />
      <div className={h("bar")}>
        {PASSOS.map((_, i) => (
          <i key={i} className={i <= passo ? h("on") : undefined} />
        ))}
      </div>
      <button className={h("skip")} type="button" onClick={onFim}>
        Pular
      </button>

      {k === "ticket" && (
        <div className={h("scene")} key="ticket">
          <p className={h("ok")}>✓ Passaporte ativado</p>
          <h2 className={h("stk")} style={{ fontSize: "clamp(32px,8.5vw,48px)" }}>
            <span className={h("s")}>Boa viagem,</span>
            <span className={h("gold")}>{primeiro}.</span>
          </h2>
          <div className={h("tk")}>
            <div className={h("h")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO} alt="HOT SOCIETY" style={{ width: 96, height: "auto" }} />
              <span>CARTÃO DE EMBARQUE</span>
            </div>
            <div className={h("b")}>
              <div className={h("rt")}>
                <div>
                  <small>Origem</small>
                  <b>ZERO</b>
                </div>
                <div className={h("ln")}>
                  <i />✈<i />
                </div>
                <div style={{ textAlign: "right" }}>
                  <small>Destino</small>
                  <b>DXB</b>
                </div>
              </div>
              <div className={h("kv")}>
                <div>
                  <small>Passageiro</small>
                  <b>{primeiro.toUpperCase()}</b>
                </div>
                <div>
                  <small>Escala</small>
                  <b>GRU</b>
                </div>
                <div>
                  <small>Voo</small>
                  <b>HS-001</b>
                </div>
              </div>
            </div>
          </div>
          <button className={h("pbtn")} style={{ width: "100%" }} type="button" onClick={proximo} autoFocus>
            Embarcar
          </button>
        </div>
      )}

      {k === "gift" && (
        <div className={h("scene")} key="gift">
          <p className={h("eb")} style={{ color: "#F1DC9A" }}>
            Presente de boas-vindas
          </p>
          <div className={h("gift shake")}>
            <div className={h("lid")}>
              <div className={h("bow")} />
            </div>
            <div className={h("base")} />
            <div className={h("seal")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SIMBOLO} alt="" width={44} height={44} />
            </div>
          </div>
          <h2 className={h("stk")} style={{ fontSize: "clamp(30px,8vw,46px)" }}>
            <span className={h("s")}>Parabéns, {primeiro}!</span>
            <span>Você ganhou seu</span>
            <span className={h("gold")}>HOTPHONE</span>
            <span className={h("s")} style={{ marginTop: ".3em", color: "#A9A69E" }}>
              by Cappu
            </span>
          </h2>
          <p style={{ margin: 0, color: "#D4D1C9", maxWidth: "34ch" }}>
            Um celular dentro da plataforma, sempre no canto da tela: a CappuIA, o seu cofre de anotações e o feed das aulas
            na palma da mão.
          </p>
          <button className={h("pbtn")} type="button" onClick={proximo} autoFocus>
            Escolher a cor
          </button>
        </div>
      )}

      {k === "cor" && (
        <div className={h("scene")} key="cor">
          <p className={h("eb")}>Escolha a cor do seu HOTPHONE</p>
          <div className={h("flipper")}>
            <div className={h("flip" + (frente ? " front" : ""))} style={{ width: 190, aspectRatio: "9/19.3" }}>
              <div className={h("bk")}>
                <Verso w={190} />
              </div>
              <div className={h("f")}>
                <Frente w={190}>
                  <TelaBloqueio />
                </Frente>
              </div>
            </div>
          </div>
          <h3 className={h("stk")} style={{ fontSize: 24 }}>
            {c.n}
          </h3>
          <div className={h("colors")} role="radiogroup" aria-label="Cores">
            {CORES.map((x) => (
              <button
                key={x.k}
                type="button"
                role="radio"
                aria-label={x.n}
                aria-checked={x.k === cor}
                aria-pressed={x.k === cor}
                onClick={() => onCor(x.k)}
              >
                <i style={{ background: x.sw }} />
              </button>
            ))}
          </div>
          <button className={h("sbtn")} type="button" onClick={() => setFrente((f) => !f)}>
            ↻ {frente ? "Ver o verso" : "Ver a frente"}
          </button>
          <button className={h("pbtn")} type="button" onClick={proximo}>
            Abrir meu HOTPHONE
          </button>
        </div>
      )}

      {k === "abrir" && (
        <div className={h("scene")} key="abrir">
          <div className={h("gift open")} style={{ height: 300, width: 240 }}>
            <div className={h("rise")}>
              <Frente w={150}>
                {ligado ? (
                  <TelaBloqueio />
                ) : (
                  <div className={h("os")}>
                    <div className={h("boot")}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={SIMBOLO} alt="" width={64} height={64} />
                      <b>HOTPHONE</b>
                      <small>Olá, {primeiro}</small>
                    </div>
                  </div>
                )}
              </Frente>
            </div>
            <div className={h("lid")}>
              <div className={h("bow")} />
            </div>
            <div className={h("base")} />
          </div>
          <h2 className={h("stk")} style={{ fontSize: "clamp(28px,7vw,40px)" }}>
            <span className={h("s")}>Ligando seu</span>
            <span className={h("gold")}>HOTPHONE…</span>
          </h2>
          <p style={{ margin: 0, color: "#A9A69E" }}>Ele vai ficar no cantinho da tela. É só tocar para abrir.</p>
        </div>
      )}
    </div>
  );
}

/* ================= o celular aberto ================= */
type App = "home" | "ia" | "cofre" | "feed" | "miss" | "lives" | "cfg";

const ICONES: Record<Exclude<App, "home"> | "aulas", { n: string; bg: string; svg?: ReactNode; badge?: number }> = {
  ia: { n: "CappuIA", bg: `url(${AV_IA}) center/cover`, badge: 1 },
  cofre: {
    n: "Cofre",
    bg: "linear-gradient(160deg,#F1DC9A,#C9A24E)",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#141416" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 8.5V7M12 17v-1.5M15.5 12H17M7 12h1.5" />
      </svg>
    ),
  },
  feed: {
    n: "Feed",
    bg: "#141416",
    badge: 1,
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#F1DC9A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.3" cy="6.7" r="1" fill="#F1DC9A" />
      </svg>
    ),
  },
  aulas: {
    n: "Aulas",
    bg: "linear-gradient(160deg,#2a2a2e,#0e0e10)",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#F4F2EC" strokeWidth="1.8" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M10 9.5v5l4.5-2.5L10 9.5Z" fill="#F4F2EC" />
      </svg>
    ),
  },
  miss: {
    n: "Missões",
    bg: "linear-gradient(160deg,#7fe0ad,#3f9e6c)",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#141416" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12.5 9 17.5 20 6.5" />
      </svg>
    ),
  },
  lives: {
    n: "Lives",
    bg: "linear-gradient(160deg,#d65050,#8E2424)",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="2.5" fill="#fff" />
        <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" />
      </svg>
    ),
  },
  cfg: {
    n: "Ajustes",
    bg: "linear-gradient(160deg,#4a4a52,#1b1b1e)",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#F4F2EC" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
      </svg>
    ),
  },
};

function Icone({ k, onClick, rotulo = true }: { k: keyof typeof ICONES; onClick: () => void; rotulo?: boolean }) {
  const a = ICONES[k];
  return (
    <button className={h("hpa")} type="button" onClick={onClick} aria-label={a.n}>
      <i style={{ background: a.bg, ...(k === "feed" ? { border: "1px solid #9C7A33" } : null) }}>{a.svg}</i>
      {rotulo && <span>{a.n}</span>}
      {rotulo && a.badge ? <em>{a.badge}</em> : null}
    </button>
  );
}

function Celular({
  S,
  nome,
  atualizar,
  onCor,
  onRever,
  onFechar,
}: {
  S: Estado;
  nome: string;
  atualizar: (p: Partial<Estado>) => void;
  onCor: (k: string) => void;
  onRever: () => void;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [app, setApp] = useState<App>("home");
  const [aviso, setAviso] = useState<{ t: string; id: number } | null>(null);
  const t = useRelogio();
  const minimizar = useRef<HTMLButtonElement>(null);
  const fechar = useRef(onFechar);
  useEffect(() => {
    fechar.current = onFechar;
  });

  useEffect(() => {
    minimizar.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar.current();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 1800);
    return () => clearTimeout(id);
  }, [aviso]);

  const toast = (x: string) => setAviso({ t: x, id: Date.now() });
  const irSite = (rota: string, msg: string) => {
    router.push(rota);
    toast(msg);
  };
  const cofre = S.cofre ?? COFRE_INICIAL;
  const salvarNota = (n: Omit<Nota, "id">) => atualizar({ cofre: [{ ...n, id: Date.now() }, ...cofre] });
  const xpHoje = MISSOES_HP.reduce((a, m) => a + (S.miss[m[0]] ? m[3] : 0), 0);
  const voltar = () => setApp("home");

  return (
    <div className={h("hpopen")} role="dialog" aria-label="HOTPHONE">
      <button ref={minimizar} className={h("min")} type="button" aria-label="Minimizar o HOTPHONE" onClick={onFechar}>
        –
      </button>
      <Frente>
        <div className={h("os")}>
          {app === "home" ? (
            <>
              <div className={h("wall")} style={{ backgroundImage: `url(${WALL})` }} />
              <div className={h("sbar")}>
                <span>{t}</span>
                <span>5G ▮▮▮</span>
              </div>
              <div className={h("home")}>
                <div className={h("clock")}>
                  <b>{t}</b>
                  <small>{dataTxt()}</small>
                </div>
                <div className={h("wid")}>
                  <div className={h("r")}>
                    <b>Rota GRU → SCL</b>
                    <span style={{ font: "700 11px/1 var(--f-m)", color: "#F1DC9A" }}>+{xpHoje} XP hoje</span>
                  </div>
                  <div className={h("pg")}>
                    <i style={{ width: `${12 + Math.min(60, xpHoje / 20)}%` }} />
                  </div>
                </div>
                <div className={h("apps")}>
                  <Icone k="ia" onClick={() => setApp("ia")} />
                  <Icone k="cofre" onClick={() => setApp("cofre")} />
                  <Icone k="feed" onClick={() => setApp("feed")} />
                  <Icone k="aulas" onClick={() => irSite("/dashboard/aulas", "Abrindo Módulos no site")} />
                  <Icone k="miss" onClick={() => setApp("miss")} />
                  <Icone k="lives" onClick={() => setApp("lives")} />
                </div>
                <div className={h("dock")}>
                  <Icone k="ia" rotulo={false} onClick={() => setApp("ia")} />
                  <Icone k="cofre" rotulo={false} onClick={() => setApp("cofre")} />
                  <Icone k="feed" rotulo={false} onClick={() => setApp("feed")} />
                  <Icone k="cfg" rotulo={false} onClick={() => setApp("cfg")} />
                </div>
              </div>
              <button className={h("hi")} type="button" aria-label="Início" />
            </>
          ) : (
            <Tela titulo={app} hora={t} onVoltar={voltar} onNova={app === "cofre" ? () => window.dispatchEvent(new Event("hs-cofre-nova")) : undefined}>
              {app === "ia" && <AppIA nome={nome} onSalvar={(x) => (salvarNota({ c: "Ideias", t: `Da CappuIA · ${new Date().toLocaleDateString("pt-BR")}`, x }), toast("Salvo no Cofre"))} onCompleta={() => irSite("/dashboard/cappuia", "Abrindo a CappuIA completa")} />}
              {app === "cofre" && <AppCofre notas={cofre} onMudar={(n) => atualizar({ cofre: n })} toast={toast} />}
              {app === "feed" && (
                <AppFeed
                  liked={S.liked}
                  onCurtir={(i, v) => atualizar({ liked: { ...S.liked, [i]: v } })}
                  onSalvar={(i) => (salvarNota({ c: "Links", t: POSTS_HP[i].sub, x: `${POSTS_HP[i].t}\n(Feed do HOTPHONE)` }), toast("Salvo no Cofre"))}
                  onIr={(r) => irSite(r, "Aberto no site")}
                  toast={toast}
                />
              )}
              {app === "miss" && (
                <AppMissoes
                  feitas={S.miss}
                  onFeita={(k, xp) => (atualizar({ miss: { ...S.miss, [k]: true } }), toast(`+${xp} XP`))}
                  onSite={() => irSite("/dashboard/missoes", "Abrindo Missões no site")}
                />
              )}
              {app === "lives" && (
                <AppLives
                  lembretes={S.rem}
                  onLembrar={(i) => {
                    const v = !S.rem[i];
                    atualizar({ rem: { ...S.rem, [i]: v } });
                    toast(v ? "Lembrete ativado" : "Lembrete removido");
                  }}
                />
              )}
              {app === "cfg" && (
                <AppAjustes
                  cor={S.color}
                  onCor={(k) => (onCor(k), toast(corDe(k).n))}
                  onMinimizar={onFechar}
                  onRever={onRever}
                  onZerar={() => (atualizar({ cofre: null }), toast("Cofre zerado"))}
                />
              )}
            </Tela>
          )}
          {aviso && (
            <div key={aviso.id} className={h("hptoast")} role="status">
              {aviso.t}
            </div>
          )}
        </div>
      </Frente>
    </div>
  );
}

const TITULOS: Record<Exclude<App, "home">, ReactNode> = {
  ia: (
    <>
      Cappu<span>IA</span>
    </>
  ),
  cofre: "Cofre",
  feed: "Feed",
  miss: "Missões",
  lives: "Lives",
  cfg: "Ajustes",
};

function Tela({
  titulo,
  hora,
  onVoltar,
  onNova,
  children,
}: {
  titulo: Exclude<App, "home">;
  hora: string;
  onVoltar: () => void;
  onNova?: () => void;
  children: ReactNode;
}) {
  return (
    <div className={h("scr2")}>
      <div className={h("sbar")}>
        <span>{hora}</span>
        <span>5G ▮▮▮</span>
      </div>
      <div className={h("ah")}>
        <button type="button" onClick={onVoltar} aria-label="Voltar">
          ‹ Início
        </button>
        <b>{TITULOS[titulo]}</b>
        {onNova && (
          <button type="button" onClick={onNova} aria-label="Nova anotação" style={{ fontSize: 22 }}>
            ＋
          </button>
        )}
      </div>
      {children}
      <button className={h("hi")} type="button" aria-label="Início" onClick={onVoltar} />
    </div>
  );
}

/* ---------- CappuIA ---------- */
type Msg = { u?: boolean; t: string; salvo?: boolean };
function responder(t: string) {
  return RESPOSTAS.find(([re]) => re.test(t))?.[1] ?? RESPOSTA_PADRAO;
}

function AppIA({ nome, onSalvar, onCompleta }: { nome: string; onSalvar: (x: string) => void; onCompleta: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { t: `Fala, ${nome}! Eu moro no seu HOTPHONE. Pergunta qualquer coisa das aulas. Se eu mandar algo útil, toque em "Salvar no Cofre".` },
  ]);
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = caixa.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length, ocupado]);

  function enviar(t: string) {
    t = t.trim();
    if (!t || ocupado) return;
    setMsgs((m) => [...m, { u: true, t }]);
    setOcupado(true);
    setTimeout(() => {
      setMsgs((m) => [...m, { t: responder(t) }]);
      setOcupado(false);
    }, 700);
  }

  return (
    <>
      <div className={h("ab")} ref={caixa}>
        <div className={h("hpmsgs")}>
          {msgs.map((m, i) => (
            <div key={i} className={h("bub " + (m.u ? "u" : "b"))}>
              {m.t}
              {!m.u && i > 0 && (
                <button
                  className={h("sv")}
                  type="button"
                  disabled={m.salvo}
                  onClick={() => {
                    onSalvar(m.t);
                    setMsgs((x) => x.map((y, k) => (k === i ? { ...y, salvo: true } : y)));
                  }}
                >
                  {m.salvo ? "✓ Salvo no Cofre" : "＋ Salvar no Cofre"}
                </button>
              )}
            </div>
          ))}
          {ocupado && <div className={h("bub b")}>…</div>}
          <button className={h("sv")} type="button" onClick={onCompleta} style={{ alignSelf: "flex-start" }}>
            Abrir a CappuIA completa ›
          </button>
        </div>
      </div>
      <div className={h("sug")}>
        {SUGESTOES_IA.map((s) => (
          <button key={s} type="button" onClick={() => enviar(s)}>
            {s}
          </button>
        ))}
      </div>
      <form
        className={h("cmp")}
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
          setTexto("");
        }}
      >
        <input placeholder="Mensagem…" aria-label="Mensagem" maxLength={500} value={texto} onChange={(e) => setTexto(e.target.value)} />
        <button aria-label="Enviar">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="currentColor" d="M3.4 20.4 21 12 3.4 3.6l-.1 6.5L15 12 3.3 13.9z" />
          </svg>
        </button>
      </form>
    </>
  );
}

/* ---------- Cofre ---------- */
function AppCofre({ notas, onMudar, toast }: { notas: Nota[]; onMudar: (n: Nota[]) => void; toast: (t: string) => void }) {
  const [cat, setCat] = useState<string>("Tudo");
  const [busca, setBusca] = useState("");
  const [modo, setModo] = useState<{ v: "lista" } | { v: "ver"; id: number } | { v: "form"; id?: number }>({ v: "lista" });
  const [confirmar, setConfirmar] = useState(false);

  useEffect(() => {
    const nova = () => setModo({ v: "form" });
    window.addEventListener("hs-cofre-nova", nova);
    return () => window.removeEventListener("hs-cofre-nova", nova);
  }, []);

  if (modo.v === "ver") {
    const n = notas.find((x) => x.id === modo.id);
    if (!n) return null;
    return (
      <div className={h("ab")}>
        <p className={h("note")} style={{ marginBottom: 6, color: "#D9B566" }}>
          {n.c}
        </p>
        <h3 className={h("stk")} style={{ fontSize: 20, margin: "0 0 10px" }}>
          {n.t}
        </h3>
        <pre>{n.x}</pre>
        <div style={{ display: "grid", gap: 8 }}>
          <button
            className={h("gb")}
            type="button"
            onClick={() =>
              navigator.clipboard.writeText(n.x).then(
                () => toast("Copiado"),
                () => toast("Selecione o texto para copiar"),
              )
            }
          >
            Copiar
          </button>
          <button className={h("ob")} type="button" onClick={() => setModo({ v: "form", id: n.id })}>
            Editar
          </button>
          <button
            className={h("ob red")}
            type="button"
            onClick={() => {
              if (!confirmar) return setConfirmar(true);
              onMudar(notas.filter((x) => x.id !== n.id));
              setConfirmar(false);
              setModo({ v: "lista" });
              toast("Apagado");
            }}
          >
            {confirmar ? "Toque de novo para apagar" : "Apagar"}
          </button>
          <button className={h("ob")} type="button" onClick={() => setModo({ v: "lista" })}>
            Voltar à lista
          </button>
        </div>
      </div>
    );
  }

  if (modo.v === "form") {
    const n = modo.id ? notas.find((x) => x.id === modo.id) : undefined;
    return <FormNota nota={n} catPadrao={cat === "Tudo" ? "Ideias" : cat} onCancelar={() => setModo({ v: "lista" })} onSalvar={(nova) => {
      onMudar(n ? notas.map((x) => (x.id === n.id ? { ...x, ...nova } : x)) : [{ ...nova, id: Date.now() }, ...notas]);
      toast("Salvo no Cofre");
      setModo({ v: "lista" });
    }} toast={toast} />;
  }

  const q = busca.toLowerCase();
  const lista = notas.filter((n) => (cat === "Tudo" || n.c === cat) && (!q || `${n.t} ${n.x}`.toLowerCase().includes(q)));
  return (
    <div className={h("ab")}>
      <input className={h("srch")} placeholder="Buscar no cofre" aria-label="Buscar no cofre" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <div className={h("hptabs")}>
        {CATEGORIAS.map((c) => (
          <button key={c} type="button" aria-pressed={c === cat} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      {lista.length ? (
        lista.map((n) => (
          <button key={n.id} className={h("it")} type="button" onClick={() => (setConfirmar(false), setModo({ v: "ver", id: n.id }))}>
            <em>{n.c}</em>
            <b>{n.t}</b>
            <small>{n.x}</small>
          </button>
        ))
      ) : (
        <p className={h("empty")}>Nada aqui ainda. Toque em ＋ para guardar prompts, metas, links e ideias.</p>
      )}
      <p className={h("note")}>Fica salvo neste navegador. Não guarde senhas nem documentos pessoais aqui.</p>
    </div>
  );
}

function FormNota({
  nota,
  catPadrao,
  onCancelar,
  onSalvar,
  toast,
}: {
  nota?: Nota;
  catPadrao: string;
  onCancelar: () => void;
  onSalvar: (n: Omit<Nota, "id">) => void;
  toast: (t: string) => void;
}) {
  const [t, setT] = useState(nota?.t ?? "");
  const [c, setC] = useState(nota?.c ?? catPadrao);
  const [x, setX] = useState(nota?.x ?? "");
  return (
    <div className={h("ab")}>
      <div className={h("fld")}>
        <label htmlFor="cft">Título</label>
        <input id="cft" maxLength={60} value={t} onChange={(e) => setT(e.target.value)} autoFocus />
      </div>
      <div className={h("fld")}>
        <label htmlFor="cfc">Pasta</label>
        <select id="cfc" value={c} onChange={(e) => setC(e.target.value)}>
          {CATEGORIAS.slice(1).map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </div>
      <div className={h("fld")}>
        <label htmlFor="cfx">Conteúdo</label>
        <textarea id="cfx" maxLength={2000} value={x} onChange={(e) => setX(e.target.value)} />
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <button
          className={h("gb")}
          type="button"
          onClick={() => (!t.trim() && !x.trim() ? toast("Escreva um título ou conteúdo") : onSalvar({ t: t.trim() || "Sem título", c, x: x.trim() }))}
        >
          Salvar no Cofre
        </button>
        <button className={h("ob")} type="button" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ---------- Feed ---------- */
function AppFeed({
  liked,
  onCurtir,
  onSalvar,
  onIr,
  toast,
}: {
  liked: Record<number, boolean>;
  onCurtir: (i: number, v: boolean) => void;
  onSalvar: (i: number) => void;
  onIr: (rota: string) => void;
  toast: (t: string) => void;
}) {
  const toques = useRef<Record<number, number>>({});
  const [coracao, setCoracao] = useState<Record<number, number>>({});
  const STR: [string, string][] = [
    ["/img/comandante.jpg", "Cappu"],
    ["/img/modulo-02.jpg", "Aula nova"],
    ["/img/feed/resultado.jpg", "Resultados"],
    ["/img/placas.jpg", "Placas"],
    ["/img/modulo-05.jpg", "Escala"],
  ];
  return (
    <div className={h("ab")}>
      <div className={h("strs")}>
        {STR.map(([img, n]) => (
          <button key={n} className={h("str")} type="button" onClick={() => toast("Stories completos no Feed do site")}>
            <i>
              <span style={{ backgroundImage: `url(${img})` }} />
            </i>
            {n}
          </button>
        ))}
      </div>
      {POSTS_HP.map((p, i) => (
        <article key={i} className={h("po")}>
          <div className={h("ph")}>
            <span style={{ background: `#0E0E10 url(${SIMBOLO}) center/70% no-repeat` }} />
            <div>
              <b>hotsociety</b>
              <small>{p.sub}</small>
            </div>
          </div>
          <div
            className={h("md")}
            style={{ backgroundImage: `url(${p.img})` }}
            onClick={() => {
              const agora = Date.now();
              if (agora - (toques.current[i] ?? 0) < 320) {
                onCurtir(i, true);
                setCoracao((c) => ({ ...c, [i]: (c[i] ?? 0) + 1 }));
              }
              toques.current[i] = agora;
            }}
          >
            <span className={h("tg")}>{p.sub.split(" · ")[0]}</span>
            {p.aula && (
              <span className={h("pl")}>
                <i>
                  <svg viewBox="0 0 24 24" width="22" height="22">
                    <path d="M8 5v14l11-7L8 5Z" fill="#F1DC9A" />
                  </svg>
                </i>
              </span>
            )}
            {coracao[i] ? (
              <span key={coracao[i]} className={h("hh go")}>
                <svg viewBox="0 0 24 24">
                  <path fill="#E6C978" d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z" />
                </svg>
              </span>
            ) : null}
          </div>
          <div className={h("ac")}>
            <button type="button" className={liked[i] ? h("on") : undefined} aria-label="Curtir" aria-pressed={!!liked[i]} onClick={() => onCurtir(i, !liked[i])}>
              <svg viewBox="0 0 24 24">
                <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z" />
              </svg>
            </button>
            <span className={h("sp")} />
            <button type="button" aria-label="Salvar no Cofre" onClick={() => onSalvar(i)}>
              <svg viewBox="0 0 24 24">
                <path d="M19 21.5 12 16.6l-7 4.9V4.2c0-.9.7-1.7 1.7-1.7h10.6c.9 0 1.7.8 1.7 1.7v17.3Z" />
              </svg>
            </button>
          </div>
          <p>
            <b>hotsociety</b>
            {p.t}
          </p>
          <button className={h("go")} type="button" onClick={() => onIr(p.ir)}>
            Abrir no site ›
          </button>
        </article>
      ))}
    </div>
  );
}

/* ---------- Missões ---------- */
function AppMissoes({ feitas, onFeita, onSite }: { feitas: Record<string, boolean>; onFeita: (k: string, xp: number) => void; onSite: () => void }) {
  return (
    <div className={h("ab")}>
      {MISSOES_HP.map(([k, t, tipo, xp]) => {
        const on = !!feitas[k];
        return (
          <button key={k} className={h("li" + (on ? " on" : ""))} type="button" onClick={() => !on && onFeita(k, xp)}>
            <i>{on ? "✓" : ""}</i>
            <span>
              <b>{t}</b>
              <small>{tipo}</small>
            </span>
            <em>+{xp}</em>
          </button>
        );
      })}
      <button className={h("ob")} type="button" onClick={onSite}>
        Ver todas no site
      </button>
    </div>
  );
}

/* ---------- Lives ---------- */
function AppLives({ lembretes, onLembrar }: { lembretes: Record<string, boolean>; onLembrar: (i: string) => void }) {
  return (
    <div className={h("ab")}>
      {LIVES.map(([q, t, quem], i) => {
        const on = !!lembretes[i];
        return (
          <div key={t} className={h("li")} style={{ gridTemplateColumns: "1fr auto", cursor: "default" }}>
            <span>
              <b>{t}</b>
              <small>
                {q} · {quem}
              </small>
            </span>
            <button
              className={h("ob")}
              type="button"
              onClick={() => onLembrar(String(i))}
              style={{ width: "auto", minHeight: 34, padding: "0 10px", fontSize: 12, ...(on ? { borderColor: "#D9B566", color: "#F1DC9A" } : null) }}
            >
              {on ? "Lembrete ✓" : "Lembrar"}
            </button>
          </div>
        );
      })}
      <p className={h("note")}>Avisamos no HOTPHONE e no e-mail 1 hora antes.</p>
    </div>
  );
}

/* ---------- Ajustes ---------- */
function AppAjustes({
  cor,
  onCor,
  onMinimizar,
  onRever,
  onZerar,
}: {
  cor: string;
  onCor: (k: string) => void;
  onMinimizar: () => void;
  onRever: () => void;
  onZerar: () => void;
}) {
  const [confirmar, setConfirmar] = useState(false);
  return (
    <div className={h("ab")}>
      <p className={h("note")} style={{ marginBottom: 8 }}>
        Cor do HOTPHONE
      </p>
      <div className={h("colors")} style={{ justifyContent: "flex-start", marginBottom: 14 }}>
        {CORES.map((c) => (
          <button key={c.k} type="button" aria-label={c.n} aria-pressed={c.k === cor} onClick={() => onCor(c.k)}>
            <i style={{ background: c.sw }} />
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <button className={h("ob")} type="button" onClick={onMinimizar}>
          Minimizar o HOTPHONE
        </button>
        <button className={h("ob")} type="button" onClick={onRever}>
          Rever a abertura do presente
        </button>
        <button
          className={h("ob red")}
          type="button"
          onClick={() => {
            if (!confirmar) return setConfirmar(true);
            onZerar();
            setConfirmar(false);
          }}
        >
          {confirmar ? "Toque de novo para confirmar" : "Apagar dados do Cofre"}
        </button>
      </div>
      <p className={h("note")} style={{ marginTop: 12 }}>
        HOTPHONE by Cappu · celular virtual da plataforma HOT SOCIETY.
      </p>
    </div>
  );
}
