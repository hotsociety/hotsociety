"use client";

import { useProgresso } from "../../_components/membros/Progresso";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMembro } from "../../_components/membros/MemberContext";
import { Modal, toast } from "../../_components/membros/Toast";
import { m } from "../../_components/membros/proto";
import {
  CARROSSEL,
  COMENTARIOS,
  ENQUETE,
  IMG,
  POSTS,
  STORIES,
  SUGESTOES,
  type Post,
  type Story,
} from "../../_lib/demo";

/* ---------- ícones ---------- */
const Heart = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z" />
  </svg>
);
const Comment = () => (
  <svg viewBox="0 0 24 24">
    <path d="M20.5 11.5a8.5 8.5 0 0 1-12.4 7.5L3.5 20.5l1.6-4.3A8.5 8.5 0 1 1 20.5 11.5Z" />
  </svg>
);
const Send = () => (
  <svg viewBox="0 0 24 24">
    <path d="M21.5 3 10.2 14.3M21.5 3l-7 18.5-4.3-7.2L3 10l18.5-7Z" />
  </svg>
);
const Save = () => (
  <svg viewBox="0 0 24 24">
    <path d="M19 21.5 12 16.6l-7 4.9V4.2c0-.9.7-1.7 1.7-1.7h10.6c.9 0 1.7.8 1.7 1.7v17.3Z" />
  </svg>
);
const Play = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
    <path d="M8 5v14l11-7L8 5Z" fill="#F1DC9A" />
  </svg>
);
const Verificado = () => (
  <svg className={m("vf")} viewBox="0 0 24 24" aria-label="verificado">
    <path
      fill="#C9A24E"
      d="m12 1.5 2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3 3.2.1L12 1.5Z"
    />
    <path d="m7.8 12.2 2.8 2.8 5.6-5.8" fill="none" stroke="#141416" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const BigHeart = () => (
  <svg viewBox="0 0 24 24">
    <defs>
      <linearGradient id="hs-hg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFF3C4" />
        <stop offset="1" stopColor="#9C7A33" />
      </linearGradient>
    </defs>
    <path
      fill="url(#hs-hg)"
      d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z"
    />
  </svg>
);

const SIMBOLO = "/brand/hs-simbolo.svg";

function iniciais(n: string) {
  return n
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
}

function Av({ u, size }: { u: string; size?: number }) {
  const st = size ? { width: size, height: size } : undefined;
  if (u === "hotsociety")
    return <span className={m("av")} style={{ ...st, background: `#0E0E10 url(${SIMBOLO}) center/78% no-repeat` }} />;
  if (u === "capputin0") return <span className={m("av")} style={{ ...st, backgroundImage: `url(${IMG.cappu})` }} />;
  if (u === "cappuia") return <span className={m("av")} style={{ ...st, backgroundImage: `url(${IMG.cappuia})` }} />;
  return (
    <span className={m("av")} style={st}>
      {iniciais(u)}
    </span>
  );
}

const fmt = (n: number) => n.toLocaleString("pt-BR");

/* ================================================================== */

export default function ParaVoce({ onCanais }: { onCanais: () => void }) {
  const { nivel } = useProgresso();
  const router = useRouter();
  const { nome } = useMembro();
  const handle = nome.toLowerCase().replace(/\s+/g, ".");

  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [follow, setFollow] = useState<Record<string, boolean>>({});
  const [voto, setVoto] = useState<string | null>(null);
  const [visto, setVisto] = useState<Record<string, boolean>>({});
  const [missoes, setMissoes] = useState<Record<string, boolean>>({});
  const [meus, setMeus] = useState<Post[]>([]);
  const [pop, setPop] = useState<Record<string, number>>({});
  const [car, setCar] = useState(0);
  const [comentarios, setComentarios] = useState<string | null>(null);
  const [novo, setNovo] = useState<null | "txt" | "foto" | "res" | "poll">(null);
  const [story, setStory] = useState<string | null>(null);
  const toques = useRef<Record<string, number>>({});

  function ganhar(xp: number, porque: string) {
    toast(`+${xp} XP · ${porque}`, true);
  }

  function curtir(id: string, forcar = false) {
    setLiked((l) => ({ ...l, [id]: forcar ? true : !l[id] }));
    setPop((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));
  }

  function tocarMidia(p: Post) {
    const agora = Date.now();
    const ult = toques.current[p.id] ?? 0;
    if (agora - ult < 320) {
      toques.current[p.id] = 0;
      curtir(p.id, true);
      return;
    }
    toques.current[p.id] = agora;
    if (p.abrir) {
      const destino = p.abrir;
      setTimeout(() => {
        if (toques.current[p.id] === agora) router.push(destino);
      }, 340);
    }
  }

  function aceitar(id: string, xp: number) {
    if (missoes[id]) return toast("Missão já aceita");
    setMissoes((x) => ({ ...x, [id]: true }));
    ganhar(xp, "missão aceita");
  }

  function acaoStory(acao: string) {
    setStory(null);
    if (acao.startsWith("/")) return router.push(acao);
    if (acao === "missao") return aceitar("story", 150);
    if (acao === "lembrar") return toast("Vamos te lembrar 1 h antes");
    if (acao === "postar") return toast("Story postado: carimbo do Brasil");
  }

  const posts = [...meus, ...POSTS];

  return (
    <div className={m("ig")}>
      <div className={m("ig-main")}>
        {/* stories */}
        <div className={m("ig-stories")} role="list">
          <button type="button" className={m("igs add")} onClick={() => setStory("me")} role="listitem">
            <span className={m("rg")}>
              <span>{iniciais(nome)}</span>
            </span>
            <small>Seu story</small>
          </button>
          {STORIES.map((s) => (
            <button
              key={s.k}
              type="button"
              role="listitem"
              className={m("igs" + (visto[s.k] ? " seen" : ""))}
              onClick={() => setStory(s.k)}
            >
              <span className={m("rg")}>
                {s.simbolo ? (
                  <span style={{ background: `#0E0E10 url(${SIMBOLO}) center/70% no-repeat` }} />
                ) : (
                  <span style={{ backgroundImage: `url(${s.img})` }} />
                )}
                {s.aoVivo && <em className={m("lv")}>AO VIVO</em>}
              </span>
              <small>{s.nome}</small>
            </button>
          ))}
        </div>

        {/* compor */}
        <div className={m("ig-comp")}>
          <Av u={handle} />
          <button className={m("in")} type="button" onClick={() => setNovo("txt")}>
            Compartilhe uma vitória, dúvida ou bastidor…
          </button>
          <div className={m("qa")}>
            <button type="button" onClick={() => setNovo("foto")}>
              Foto
            </button>
            <button type="button" onClick={() => setNovo("res")}>
              Resultado
            </button>
            <button type="button" onClick={() => setNovo("poll")}>
              Enquete
            </button>
          </div>
        </div>

        {/* posts */}
        <div style={{ display: "grid", gap: 16 }}>
          {posts.map((p) => {
            const on = !!liked[p.id];
            const sv = !!saved[p.id];
            return (
              <article key={p.id} className={m("igp")}>
                <div className={m("hd")}>
                  <Av u={p.u} />
                  <div className={m("who")}>
                    <b>{p.u}</b>
                    {p.verificado && <Verificado />}
                    <small>{p.sub}</small>
                  </div>
                  {p.seguir ? (
                    <button
                      type="button"
                      className={m("fl")}
                      onClick={() => setFollow((f) => ({ ...f, [p.u]: !f[p.u] }))}
                    >
                      {follow[p.u] ? "Seguindo" : "Seguir"}
                    </button>
                  ) : (
                    <button type="button" className={m("fl")} style={{ color: "var(--muted)" }} aria-label="Mais opções">
                      ⋯
                    </button>
                  )}
                </div>

                {p.tipo === "enquete" ? (
                  <>
                    <div className={m("bd")} style={{ paddingTop: 2 }}>
                      <p style={{ fontSize: 15 }}>
                        <b>{p.u}</b>
                        {ENQUETE.pergunta}
                      </p>
                    </div>
                    <div className={m("poll")}>
                      {ENQUETE.opcoes.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          aria-pressed={voto === o.id}
                          onClick={() => {
                            if (voto) return;
                            setVoto(o.id);
                            ganhar(20, "voto na enquete");
                          }}
                        >
                          <i style={{ width: voto ? `${o.pct}%` : 0 }} />
                          <span>{o.t}</span>
                          <span className={m("mono")} style={{ opacity: voto ? 1 : 0 }}>
                            {o.pct}%
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <Midia p={p} pop={pop[p.id]} car={car} setCar={setCar} onTap={() => tocarMidia(p)} />
                )}

                <div className={m("ac")}>
                  <button
                    key={`lk-${pop[p.id] ?? 0}`}
                    type="button"
                    className={(on ? m("on") : "") + (pop[p.id] ? " " + m("pop") : "")}
                    aria-label="Curtir"
                    aria-pressed={on}
                    onClick={() => curtir(p.id)}
                  >
                    <Heart />
                  </button>
                  <button type="button" aria-label="Comentar" onClick={() => setComentarios(p.id)}>
                    <Comment />
                  </button>
                  <button type="button" aria-label="Compartilhar" onClick={() => toast("Link copiado")}>
                    <Send />
                  </button>
                  {p.tipo === "carrossel" && (
                    <span className={m("dots")}>
                      {CARROSSEL.map((_, k) => (
                        <i key={k} className={k === car ? m("on") : undefined} />
                      ))}
                    </span>
                  )}
                  <span className={m("sp")} />
                  <button
                    type="button"
                    className={sv ? m("on") : undefined}
                    aria-label="Salvar"
                    aria-pressed={sv}
                    onClick={() => {
                      setSaved((s) => ({ ...s, [p.id]: !s[p.id] }));
                      toast(sv ? "Removido dos salvos" : "Salvo na sua coleção");
                    }}
                  >
                    <Save />
                  </button>
                </div>

                <div className={m("bd")}>
                  <span className={m("lk")}>{fmt(p.likes + (on ? 1 : 0))} curtidas</span>
                  {p.legenda && (
                    <p>
                      <b>{p.u}</b>
                      {p.legenda}
                    </p>
                  )}
                  {p.com > 0 && (
                    <button type="button" className={m("more")} onClick={() => setComentarios(p.id)}>
                      Ver todos os {p.com} comentários
                    </button>
                  )}
                  <span className={m("tm")}>{p.quando}</span>
                </div>

                {p.tipo === "missao" && (
                  <div className={m("cta")}>
                    <button type="button" className={m("btn btn-p")} disabled={!!missoes[p.id]} onClick={() => aceitar(p.id, 150)}>
                      {missoes[p.id] ? "Missão aceita ✓" : "Aceitar missão · +150 XP"}
                    </button>
                  </div>
                )}
                {p.cta && (
                  <div className={m("cta")}>
                    <button type="button" className={m("btn btn-s")} onClick={() => router.push(p.cta![1])}>
                      {p.cta[0]}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
          <div className={m("ig-end")}>
            <span style={{ width: 44, height: 44, background: `url(${SIMBOLO}) center/contain no-repeat` }} />
            <b>Você está em dia.</b>
            <span>Aula nova amanhã às 9h e live na quinta.</span>
          </div>
        </div>
      </div>

      {/* lateral */}
      <aside className={m("ig-rail")} aria-label="Sugestões">
        <div className={m("igr")}>
          <Av u={handle} size={48} />
          <div>
            <b>{handle}</b>
            <small>
              {nome} · Nível {nivel}
            </small>
          </div>
          <button type="button" onClick={() => router.push("/dashboard/perfil")}>
            Perfil
          </button>
        </div>
        <h3>
          Sugestões para você <span style={{ color: "var(--neve)", fontSize: 12.5 }}>Ver tudo</span>
        </h3>
        <div className={m("sg")}>
          {SUGESTOES.map(([u, d]) => (
            <div key={u} className={m("igr")}>
              <Av u={u} size={36} />
              <div>
                <b>{u}</b>
                <small>{d}</small>
              </div>
              <button type="button" onClick={() => setFollow((f) => ({ ...f, [u]: !f[u] }))}>
                {follow[u] ? "Seguindo" : "Seguir"}
              </button>
            </div>
          ))}
        </div>
        <h3>Canais da comunidade</h3>
        <div className={m("chs")}>
          {["# geral", "# dúvidas", "# resultados", "# modelo-ia", "# modelo-real", "# tráfego"].map((c) => (
            <button key={c} type="button" onClick={onCanais}>
              {c}
            </button>
          ))}
        </div>
        <p className={m("ft")}>HOT SOCIETY · +18 · Regras da comunidade · Termos · Privacidade</p>
      </aside>

      {comentarios && (
        <Comentarios
          handle={handle}
          onClose={() => setComentarios(null)}
          onPrimeiro={() => ganhar(10, "comentário")}
        />
      )}
      {novo && (
        <NovoPost
          tipo={novo}
          onClose={() => setNovo(null)}
          onPublicar={(p) => {
            const primeiro = meus.length === 0;
            setMeus((x) => [{ ...p, u: handle }, ...x]);
            setNovo(null);
            toast("Publicado no feed");
            if (primeiro) setTimeout(() => ganhar(30, "primeira publicação"), 900);
          }}
        />
      )}
      {story && (
        <StoryViewer
          key={story}
          k={story}
          handle={handle}
          onVisto={(k) => setVisto((v) => ({ ...v, [k]: true }))}
          onTrocar={setStory}
          onAcao={acaoStory}
          onClose={() => setStory(null)}
        />
      )}
    </div>
  );
}

/* ---------- mídia de cada post ---------- */
function Midia({
  p,
  pop,
  car,
  setCar,
  onTap,
}: {
  p: Post;
  pop?: number;
  car: number;
  setCar: (n: number) => void;
  onTap: () => void;
}) {
  const coracao = pop ? (
    <span key={pop} className={m("hh go")}>
      <BigHeart />
    </span>
  ) : null;

  if (p.tipo === "aula")
    return (
      <div className={m("md")} style={{ backgroundImage: `url(${p.img})` }} onClick={onTap}>
        <span className={m("tg")}>{p.tag}</span>
        <span className={m("pl")}>
          <i>
            <Play />
          </i>
        </span>
        <span className={m("du")}>{p.dur}</span>
        {coracao}
      </div>
    );
  if (p.tipo === "img")
    return (
      <div className={m("md" + (p.quadrado ? " sq" : ""))} style={{ backgroundImage: `url(${p.img})` }} onClick={onTap}>
        {p.tag && <span className={m("tg")}>{p.tag}</span>}
        {coracao}
      </div>
    );
  if (p.tipo === "carrossel")
    return (
      <div className={m("md")} onClick={onTap}>
        <span className={m("cn")}>
          {car + 1}/{CARROSSEL.length}
        </span>
        <div
          className={m("car")}
          onScroll={(e) => {
            const el = e.currentTarget;
            setCar(Math.round(el.scrollLeft / el.clientWidth));
          }}
        >
          {CARROSSEL.map((s, i) => (
            <div key={i} className={m("sl")}>
              <span className={m("n")}>{s.n}</span>
              <h3>{s.h}</h3>
              {s.code ? <code>{s.code}</code> : <p>{s.p}</p>}
            </div>
          ))}
        </div>
        {coracao}
      </div>
    );
  if (p.tipo === "missao")
    return (
      <div className={m("md sq txt")} onClick={onTap}>
        <span className={m("tg")} style={{ position: "static", justifySelf: "start" }}>
          +150 XP
        </span>
        <h3>
          <span style={{ color: "var(--neve)", fontSize: ".5em", display: "block" }}>Missão do dia</span>
          Poste 3 conteúdos <span>no orgânico.</span>
        </h3>
        <p>Use o roteiro do módulo 4 e mande o print no # resultados.</p>
        {coracao}
      </div>
    );
  if (p.tipo === "frase")
    return (
      <div className={m("md sq txt")} onClick={onTap}>
        <h3>
          Não existe <span>nobreza</span> na pobreza.
        </h3>
        <p>Segunda-feira. Abre o módulo, faz a missão, posta. Disciplina paga mais que motivação.</p>
        {coracao}
      </div>
    );
  if (p.tipo === "texto")
    return (
      <div className={m("md sq txt")} onClick={onTap}>
        <h3 style={{ fontSize: "clamp(20px,3.4vw,28px)", textTransform: "none", fontStretch: "100%" }}>{p.texto}</h3>
        {coracao}
      </div>
    );
  return null;
}

/* ---------- comentários ---------- */
function Comentarios({ handle, onClose, onPrimeiro }: { handle: string; onClose: () => void; onPrimeiro: () => void }) {
  const [lista, setLista] = useState(COMENTARIOS);
  const [texto, setTexto] = useState("");
  const [curtidos, setCurtidos] = useState<Record<number, boolean>>({});
  const caixa = useRef<HTMLInputElement>(null);
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    caixa.current?.focus();
  }, []);
  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [lista.length]);

  function publicar() {
    const t = texto.trim();
    if (!t) return;
    if (lista.length === COMENTARIOS.length) onPrimeiro();
    setLista((l) => [...l, [handle, t, "agora"]]);
    setTexto("");
  }

  return (
    <Modal
      title="Comentários"
      onClose={onClose}
      foot={
        <>
          <Av u={handle} />
          <input
            ref={caixa}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && publicar()}
            placeholder={`Comente como ${handle}…`}
            aria-label="Comentário"
            maxLength={220}
          />
          <button type="button" className={m("btn btn-p")} style={{ minHeight: 40 }} onClick={publicar}>
            Publicar
          </button>
        </>
      }
    >
      {lista.map(([u, t, q], i) => (
        <div key={i} className={m("igc")}>
          <Av u={u} />
          <div>
            <b>{u}</b>
            {u === "capputin0" && <Verificado />} {t}
            <small>{q} · Responder</small>
          </div>
          <button
            type="button"
            className={m("lk" + (curtidos[i] ? " on" : ""))}
            aria-label="Curtir comentário"
            onClick={() => setCurtidos((c) => ({ ...c, [i]: !c[i] }))}
          >
            ♥
          </button>
        </div>
      ))}
      <div ref={fim} />
    </Modal>
  );
}

/* ---------- nova publicação ---------- */
const OPCOES_IMG = [IMG.resultado, IMG.chile, IMG.placas, IMG.m2, IMG.m4, IMG.hero, IMG.teleferico, IMG.cappu];

function NovoPost({
  tipo,
  onClose,
  onPublicar,
}: {
  tipo: "txt" | "foto" | "res" | "poll";
  onClose: () => void;
  onPublicar: (p: Post) => void;
}) {
  const [texto, setTexto] = useState("");
  const [img, setImg] = useState<string | null>(tipo === "res" ? IMG.resultado : tipo === "foto" ? IMG.hero : null);
  const campo = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    campo.current?.focus();
  }, []);

  function publicar() {
    const t = texto.trim();
    if (!t && !img) return toast("Escreva algo ou escolha uma imagem");
    const base = { id: "u" + Date.now(), u: "", sub: tipo === "res" ? "# resultados" : "Agora", likes: 0, com: 0, quando: "agora" };
    onPublicar(
      img
        ? { ...base, tipo: "img", img, legenda: t || undefined, tag: tipo === "res" ? "Resultado" : undefined }
        : { ...base, tipo: "texto", texto: t },
    );
  }

  return (
    <Modal
      title={tipo === "poll" ? "Nova enquete" : "Nova publicação"}
      onClose={onClose}
      foot={
        <>
          <span style={{ flex: 1 }} />
          <button type="button" className={m("btn btn-p")} onClick={publicar}>
            Publicar
          </button>
        </>
      }
    >
      <textarea
        ref={campo}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={400}
        aria-label="Texto da publicação"
        placeholder={
          tipo === "res"
            ? "Conte o resultado e o que você fez para chegar nele…"
            : tipo === "poll"
              ? "Escreva a pergunta da enquete…"
              : "Compartilhe uma vitória, dúvida ou bastidor…"
        }
      />
      {tipo === "poll" ? (
        <p className={m("demo")} style={{ margin: 0 }}>
          As opções Sim / Não entram automaticamente.
        </p>
      ) : (
        <div>
          <p className={m("eb")} style={{ marginBottom: 8 }}>
            Imagem (opcional)
          </p>
          <div className={m("pick")}>
            {OPCOES_IMG.map((src) => (
              <button
                key={src}
                type="button"
                aria-pressed={img === src}
                aria-label="Escolher imagem"
                style={{ backgroundImage: `url(${src})` }}
                onClick={() => setImg((x) => (x === src ? null : src))}
              />
            ))}
          </div>
        </div>
      )}
      <p className={m("demo")} style={{ margin: 0 }}>
        Print de resultado precisa ser seu e real. Nada de conteúdo explícito.
      </p>
    </Modal>
  );
}

/* ---------- stories em tela cheia ---------- */
const ORDEM = STORIES.map((s) => s.k);
const DURACAO = 5000;

function StoryViewer({
  k,
  handle,
  onVisto,
  onTrocar,
  onAcao,
  onClose,
}: {
  k: string;
  handle: string;
  onVisto: (k: string) => void;
  onTrocar: (k: string) => void;
  onAcao: (a: string) => void;
  onClose: () => void;
}) {
  const meu: Story = {
    k: "me",
    nome: "Seu story",
    autor: handle,
    quando: "",
    slides: [
      {
        h: "Seu",
        dest: "story",
        p: "Poste seu carimbo, sua placa ou sua missão concluída. Some em 24 h.",
        acao: ["Postar carimbo do Brasil", "postar"],
      },
    ],
  };
  const d = k === "me" ? meu : STORIES.find((s) => s.k === k)!;
  const [i, setI] = useState(0);
  const barra = useRef<HTMLElement>(null);
  const pausado = useRef(false);
  const inicio = useRef(0);
  const s = d.slides[i];

  const avancar = useRef<() => void>(() => {});
  useEffect(() => {
    avancar.current = () => {
      if (i < d.slides.length - 1) setI(i + 1);
      else {
        const o = ORDEM.indexOf(k);
        if (o >= 0 && o < ORDEM.length - 1) onTrocar(ORDEM[o + 1]);
        else onClose();
      }
    };
  });

  useEffect(() => {
    onVisto(k);
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    inicio.current = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      if (pausado.current) inicio.current = now - Number(barra.current?.dataset.p ?? 0) * DURACAO;
      const p = (now - inicio.current) / DURACAO;
      if (barra.current) {
        barra.current.style.width = Math.min(100, p * 100) + "%";
        barra.current.dataset.p = String(p);
      }
      if (p >= 1 && !pausado.current) return avancar.current();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [i, k]);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") avancar.current();
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    document.addEventListener("keydown", kd);
    return () => document.removeEventListener("keydown", kd);
  }, [onClose]);

  const avatar = d.autor === "capputin0" ? IMG.cappu : d.autor === "cappuia" ? IMG.cappuia : null;

  return (
    <div className={m("sv")} role="dialog" aria-modal="true" aria-label="Story" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={m("fr" + (s.img ? "" : " tx"))} style={s.img ? { backgroundImage: `url(${s.img})` } : undefined}>
        {s.img && <div className={m("ve")} />}
        <div className={m("bars")}>
          {d.slides.map((_, j) => (
            <i key={j}>
              <b ref={j === i ? barra : undefined} style={{ width: j < i ? "100%" : 0 }} />
            </i>
          ))}
        </div>
        <div className={m("who")}>
          <span
            className={m("a")}
            style={avatar ? { backgroundImage: `url(${avatar})` } : { background: `#0E0E10 url(${SIMBOLO}) center/70% no-repeat` }}
          />
          <b>{d.autor}</b>
          <small>{d.quando}</small>
          <button type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <button className={m("tl")} type="button" aria-label="Anterior" onClick={() => (i > 0 ? setI(i - 1) : (inicio.current = performance.now()))} />
        <button className={m("tr")} type="button" aria-label="Próximo" onClick={() => avancar.current()} />
        <div className={m("ct")}>
          <h3>
            {s.h} {s.dest && <span>{s.dest}</span>}
          </h3>
          <p>{s.p}</p>
          {s.acao && (
            <button type="button" className={m("sk")} onClick={() => onAcao(s.acao![1])}>
              {s.acao[0]} ›
            </button>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const inp = e.currentTarget.querySelector("input")!;
            if (inp.value.trim()) toast("Resposta enviada");
            inp.value = "";
            pausado.current = false;
          }}
        >
          <input
            placeholder={`Responder a ${d.autor}…`}
            aria-label="Responder"
            onFocus={() => (pausado.current = true)}
            onBlur={() => (pausado.current = false)}
          />
        </form>
      </div>
    </div>
  );
}
