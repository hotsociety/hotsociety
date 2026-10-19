"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMembro } from "../../_components/membros/MemberContext";
import { useProgresso } from "../../_components/membros/Progresso";
import { Modal, toast } from "../../_components/membros/Toast";
import { m } from "../../_components/membros/proto";
import { CANAIS } from "../../_lib/demo";
import { supabase } from "../../_lib/supabase";

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
const Verificado = () => (
  <svg className={m("vf")} viewBox="0 0 24 24" aria-label="equipe HOT SOCIETY">
    <path
      fill="#C9A24E"
      d="m12 1.5 2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3 3.2.1L12 1.5Z"
    />
    <path d="m7.8 12.2 2.8 2.8 5.6-5.8" fill="none" stroke="#141416" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SIMBOLO = "/brand/hs-simbolo.svg";

type Post = {
  id: string;
  autor: string;
  eu: boolean;
  equipe: boolean;
  tipo: "texto" | "resultado" | "duvida";
  texto: string;
  imagem: string | null;
  criado_em: string;
  curtidas: number;
  curti: boolean;
  comentarios: number;
};

const TIPO: Record<Post["tipo"], string> = { texto: "", resultado: "Resultado", duvida: "Dúvida" };
const TIPOS_IMG = ["image/png", "image/jpeg", "image/webp"];

export function iniciais(n: string) {
  return n
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
}

export function quando(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 7 * 86400) return `há ${Math.floor(s / 86400)} d`;
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function Av({ nome, equipe, size }: { nome: string; equipe?: boolean; size?: number }) {
  const st = size ? { width: size, height: size } : undefined;
  if (equipe) return <span className={m("av")} style={{ ...st, background: `#0E0E10 url(${SIMBOLO}) center/78% no-repeat` }} />;
  return (
    <span className={m("av")} style={st}>
      {iniciais(nome)}
    </span>
  );
}

// Links temporários das fotos (pasta privada; só quem tem acesso vê).
async function assinarFotos(caminhos: string[]) {
  if (!caminhos.length) return {};
  const { data } = await supabase.storage.from("feed").createSignedUrls(caminhos, 3600);
  return Object.fromEntries((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
}

/* ================================================================== */

export default function ParaVoce({ onCanais }: { onCanais: () => void }) {
  const { nome, cargo } = useMembro();
  const { nivel } = useProgresso();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [fotos, setFotos] = useState<Record<string, string>>({});
  const [fim, setFim] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [comentarios, setComentarios] = useState<Post | null>(null);
  const [novo, setNovo] = useState<null | Post["tipo"]>(null);
  const [menu, setMenu] = useState<string | null>(null);

  const carregar = useCallback(async (antes?: string) => {
    setCarregando(true);
    const { data, error } = await supabase.rpc("feed_posts", { p_antes: antes ?? null, p_limite: 20 });
    setCarregando(false);
    if (error) {
      if (!antes) setPosts([]);
      return toast("Não deu para carregar o feed.");
    }
    const lista = (data ?? []) as Post[];
    setFim(lista.length < 20);
    setPosts((p) => (antes && p ? [...p, ...lista] : lista));
    const novas = await assinarFotos(lista.map((x) => x.imagem).filter((x): x is string => !!x));
    setFotos((f) => ({ ...f, ...novas }));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function curtir(p: Post) {
    setPosts((l) => l?.map((x) => (x.id === p.id ? { ...x, curti: !x.curti, curtidas: x.curtidas + (x.curti ? -1 : 1) } : x)) ?? l);
    const { error } = await supabase.rpc("curtir_post", { p_post: p.id });
    if (error) {
      setPosts((l) => l?.map((x) => (x.id === p.id ? p : x)) ?? l);
      toast("Não deu para curtir agora.");
    }
  }

  async function apagar(p: Post) {
    setMenu(null);
    const { error } = await supabase.rpc("apagar_conteudo", { p_tipo: "post", p_ref: p.id });
    if (error) return toast("Não deu para apagar.");
    setPosts((l) => l?.filter((x) => x.id !== p.id) ?? l);
    toast(p.eu ? "Publicação apagada" : "Publicação removida (moderação)");
  }

  async function denunciar(p: Post) {
    setMenu(null);
    const { error } = await supabase.rpc("denunciar", { p_tipo: "post", p_ref: p.id, p_motivo: null });
    toast(error ? "Não deu para enviar a denúncia." : "Denúncia enviada. A equipe vai olhar.");
  }

  return (
    <div className={m("ig")}>
      <div className={m("ig-main")}>
        {/* compor */}
        <div className={m("ig-comp")}>
          <Av nome={nome} />
          <button className={m("in")} type="button" onClick={() => setNovo("texto")}>
            Compartilhe uma vitória, dúvida ou bastidor…
          </button>
          <div className={m("qa")}>
            <button type="button" onClick={() => setNovo("resultado")}>
              Resultado
            </button>
            <button type="button" onClick={() => setNovo("duvida")}>
              Dúvida
            </button>
          </div>
        </div>

        {/* posts */}
        <div style={{ display: "grid", gap: 16 }}>
          {posts === null && <p className={m("sub")}>Carregando o feed…</p>}
          {posts?.length === 0 && (
            <div className={m("ig-end")}>
              <span style={{ width: 44, height: 44, background: `url(${SIMBOLO}) center/contain no-repeat` }} />
              <b>O feed está esperando o primeiro post.</b>
              <span>Conte quem você é, poste uma dúvida ou mostre um resultado.</span>
            </div>
          )}
          {posts?.map((p) => (
            <article key={p.id} className={m("igp")}>
              <div className={m("hd")}>
                <Av nome={p.autor} equipe={p.equipe} />
                <div className={m("who")}>
                  <b>{p.equipe ? `${p.autor} · Equipe` : p.autor}</b>
                  {p.equipe && <Verificado />}
                  <small>
                    {TIPO[p.tipo] ? `${TIPO[p.tipo]} · ` : ""}
                    {quando(p.criado_em)}
                  </small>
                </div>
                <div style={{ position: "relative" }}>
                  <button type="button" className={m("fl")} style={{ color: "var(--muted)" }} aria-label="Mais opções" aria-expanded={menu === p.id} onClick={() => setMenu(menu === p.id ? null : p.id)}>
                    ⋯
                  </button>
                  {menu === p.id && (
                    <div className="hs-fd-menu" role="menu">
                      {(p.eu || cargo) && (
                        <button type="button" role="menuitem" onClick={() => apagar(p)}>
                          {p.eu ? "Apagar publicação" : "Remover (moderação)"}
                        </button>
                      )}
                      {!p.eu && (
                        <button type="button" role="menuitem" onClick={() => denunciar(p)}>
                          Denunciar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {p.imagem && fotos[p.imagem] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fotos[p.imagem]} alt="" className="hs-fd-img" loading="lazy" />
              )}

              <div className={m("ac")}>
                <button type="button" className={p.curti ? m("on") : undefined} aria-label="Curtir" aria-pressed={p.curti} onClick={() => curtir(p)}>
                  <Heart />
                </button>
                <button type="button" aria-label="Comentar" onClick={() => setComentarios(p)}>
                  <Comment />
                </button>
              </div>

              <div className={m("bd")}>
                {p.curtidas > 0 && (
                  <span className={m("lk")}>
                    {p.curtidas.toLocaleString("pt-BR")} {p.curtidas === 1 ? "curtida" : "curtidas"}
                  </span>
                )}
                <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  <b>{p.autor}</b>
                  {p.texto}
                </p>
                {p.comentarios > 0 && (
                  <button type="button" className={m("more")} onClick={() => setComentarios(p)}>
                    Ver {p.comentarios === 1 ? "1 comentário" : `os ${p.comentarios} comentários`}
                  </button>
                )}
              </div>
            </article>
          ))}
          {posts && posts.length > 0 && !fim && (
            <button type="button" className={m("btn btn-s")} disabled={carregando} onClick={() => carregar(posts[posts.length - 1].criado_em)}>
              {carregando ? "Carregando…" : "Ver mais"}
            </button>
          )}
          {posts && posts.length > 0 && fim && (
            <div className={m("ig-end")}>
              <span style={{ width: 44, height: 44, background: `url(${SIMBOLO}) center/contain no-repeat` }} />
              <b>Você está em dia.</b>
              <span>Volte mais tarde ou puxe assunto nos canais.</span>
            </div>
          )}
        </div>
      </div>

      {/* lateral */}
      <aside className={m("ig-rail")} aria-label="Atalhos">
        <div className={m("igr")}>
          <Av nome={nome} size={48} />
          <div>
            <b>{nome}</b>
            <small>Nível {nivel}</small>
          </div>
          <button type="button" onClick={() => router.push("/dashboard/perfil")}>
            Perfil
          </button>
        </div>
        <h3>Canais da comunidade</h3>
        <div className={m("chs")}>
          {CANAIS.map((c) => (
            <button key={c.id} type="button" onClick={onCanais}>
              # {c.nome}
            </button>
          ))}
        </div>
        <p className={m("ft")}>HOT SOCIETY · +18 · Respeito sempre · Nada de conteúdo explícito no feed</p>
      </aside>

      {comentarios && (
        <Comentarios
          post={comentarios}
          onClose={() => setComentarios(null)}
          onMudou={(n) => setPosts((l) => l?.map((x) => (x.id === comentarios.id ? { ...x, comentarios: n } : x)) ?? l)}
        />
      )}
      {novo && (
        <NovoPost
          tipo={novo}
          onClose={() => setNovo(null)}
          onPublicado={() => {
            setNovo(null);
            toast("Publicado no feed");
            carregar();
          }}
        />
      )}
    </div>
  );
}

/* ---------- comentários ---------- */
type Coment = { id: number; autor: string; eu: boolean; equipe: boolean; texto: string; criado_em: string };

function Comentarios({ post, onClose, onMudou }: { post: Post; onClose: () => void; onMudou: (n: number) => void }) {
  const { cargo } = useMembro();
  const [lista, setLista] = useState<Coment[] | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const caixa = useRef<HTMLInputElement>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    const { data } = await supabase.rpc("comentarios_post", { p_post: post.id });
    setLista((data ?? []) as Coment[]);
  }, [post.id]);

  useEffect(() => {
    carregar();
    caixa.current?.focus();
  }, [carregar]);
  useEffect(() => {
    if (lista) onMudou(lista.length);
    fimRef.current?.scrollIntoView({ block: "end" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista?.length]);

  async function publicar() {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    const { error } = await supabase.rpc("comentar_post", { p_post: post.id, p_texto: t });
    setEnviando(false);
    if (error) return toast(/limite/.test(error.message) ? "Muitos comentários seguidos. Espere um pouco." : "Não deu para comentar.");
    setTexto("");
    carregar();
  }

  async function acao(c: Coment) {
    if (c.eu || cargo) {
      const { error } = await supabase.rpc("apagar_conteudo", { p_tipo: "comentario", p_ref: String(c.id) });
      if (!error) carregar();
      toast(error ? "Não deu para apagar." : "Comentário apagado");
    } else {
      const { error } = await supabase.rpc("denunciar", { p_tipo: "comentario", p_ref: String(c.id), p_motivo: null });
      toast(error ? "Não deu para denunciar." : "Denúncia enviada");
    }
  }

  return (
    <Modal
      title="Comentários"
      onClose={onClose}
      foot={
        <>
          <input
            ref={caixa}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && publicar()}
            placeholder="Escreva um comentário…"
            aria-label="Comentário"
            maxLength={1000}
          />
          <button type="button" className={m("btn btn-p")} style={{ minHeight: 40 }} onClick={publicar} disabled={enviando || !texto.trim()}>
            Publicar
          </button>
        </>
      }
    >
      {lista === null && <p className={m("sub")}>Carregando…</p>}
      {lista?.length === 0 && <p className={m("sub")}>Nenhum comentário ainda. Seja o primeiro.</p>}
      {lista?.map((c) => (
        <div key={c.id} className={m("igc")}>
          <Av nome={c.autor} equipe={c.equipe} />
          <div style={{ overflowWrap: "anywhere" }}>
            <b>{c.equipe ? `${c.autor} · Equipe` : c.autor}</b>
            {c.equipe && <Verificado />} {c.texto}
            <small>{quando(c.criado_em)}</small>
          </div>
          <button type="button" className={m("lk")} style={{ fontSize: 11, width: "auto" }} onClick={() => acao(c)}>
            {c.eu || cargo ? "Apagar" : "Denunciar"}
          </button>
        </div>
      ))}
      <div ref={fimRef} />
    </Modal>
  );
}

/* ---------- nova publicação ---------- */
function NovoPost({ tipo, onClose, onPublicado }: { tipo: Post["tipo"]; onClose: () => void; onPublicado: () => void }) {
  const { user } = useMembro();
  const [t, setT] = useState<Post["tipo"]>(tipo);
  const [texto, setTexto] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!foto) return setPrevia(null);
    const u = URL.createObjectURL(foto);
    setPrevia(u);
    return () => URL.revokeObjectURL(u);
  }, [foto]);

  function escolher(f: File | undefined) {
    if (!f) return;
    if (!TIPOS_IMG.includes(f.type)) return toast("Use foto PNG, JPG ou WEBP.");
    if (f.size > 5 * 1024 * 1024) return toast("A foto pode ter até 5 MB.");
    setFoto(f);
  }

  async function publicar() {
    const x = texto.trim();
    if (!x) return toast("Escreva alguma coisa antes de publicar.");
    setEnviando(true);
    let caminho: string | null = null;
    if (foto) {
      const ext = foto.type.split("/")[1].replace("jpeg", "jpg");
      caminho = `${user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error } = await supabase.storage.from("feed").upload(caminho, foto, { contentType: foto.type, upsert: false });
      if (error) {
        setEnviando(false);
        return toast("Não deu para enviar a foto.");
      }
    }
    const { error } = await supabase.rpc("publicar_post", { p_tipo: t, p_texto: x, p_imagem: caminho });
    setEnviando(false);
    if (error) return toast(/limite/.test(error.message) ? "Você já publicou bastante hoje. Volte amanhã." : "Não deu para publicar.");
    onPublicado();
  }

  return (
    <Modal
      title="Nova publicação"
      onClose={onClose}
      foot={
        <>
          <span style={{ flex: 1 }} />
          <button type="button" className={m("btn btn-p")} onClick={publicar} disabled={enviando}>
            {enviando ? "Publicando…" : "Publicar"}
          </button>
        </>
      }
    >
      <div className={m("seg")} role="group" aria-label="Tipo de publicação" style={{ justifySelf: "start" }}>
        {(["texto", "resultado", "duvida"] as const).map((k) => (
          <button key={k} type="button" aria-pressed={t === k} onClick={() => setT(k)}>
            {k === "texto" ? "Post" : TIPO[k]}
          </button>
        ))}
      </div>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        aria-label="Texto da publicação"
        placeholder={t === "resultado" ? "Conte o resultado (só seu e real)…" : t === "duvida" ? "Qual é a dúvida? Diga o módulo e a aula." : "O que você quer compartilhar?"}
        maxLength={2000}
        autoFocus
      />
      {previa && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previa} alt="Prévia da foto" className="hs-fd-img" style={{ borderRadius: 10 }} />
      )}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label className={m("btn btn-s")} style={{ cursor: "pointer" }}>
          {foto ? "Trocar foto" : "Adicionar foto"}
          <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => escolher(e.target.files?.[0])} />
        </label>
        {foto && (
          <button type="button" className={m("btn btn-s")} onClick={() => setFoto(null)}>
            Tirar foto
          </button>
        )}
      </div>
      <p className={m("demo")} style={{ margin: 0 }}>
        Sem nudez, sem dados de clientes e sem rosto de pessoa real sem autorização. Print de resultado: cubra nomes e valores de terceiros.
      </p>
    </Modal>
  );
}
