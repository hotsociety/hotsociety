"use client";

import "../../_components/membros/painel.css";
import { useProgresso } from "../../_components/membros/Progresso";
import { useEffect, useState } from "react";
import { Modal, toast } from "../../_components/membros/Toast";
import { m } from "../../_components/membros/proto";
import { postApi } from "../../_lib/api";
import { IMG, PRODUTOS, type Produto } from "../../_lib/demo";
import { supabase } from "../../_lib/supabase";
import Icon from "../../_components/membros/Icon";

const CATS = ["Tudo", "Digitais", "Ferramentas", "Mentoria", "Merch"] as const;
const brl = (v: number) => "R$ " + v.toLocaleString("pt-BR");
const num = (v: number) => v.toLocaleString("pt-BR");
const GFX_BG = "radial-gradient(90% 70% at 30% 20%,#2e2618,#0b0b0c 70%)";
const FISICOS = ["mo", "bn"];
type Resgate = { id: string; protocolo: string; item_id: string; titulo: string; coins: number; status: string; rastreio: string | null; criado_em: string };
const ST_RESGATE: Record<string, string> = { recebido: "Separando", enviado: "Enviado", entregue: "Entregue", cancelado: "Cancelado (coins devolvidas)" };

export default function HotStore() {
  const [cat, setCat] = useState<(typeof CATS)[number]>("Tudo");
  const { perfil } = useProgresso();
  const [coins, setCoins] = useState(perfil.coins);
  const [aberto, setAberto] = useState<null | "aplicar">(null);
  const [resgatar, setResgatar] = useState<Produto | null>(null);
  const [resgates, setResgates] = useState<Resgate[]>([]);
  const [avisados, setAvisados] = useState<Record<string, boolean>>({});

  function carregar() {
    supabase.rpc("meus_resgates").then(({ data }) => setResgates((data ?? []) as Resgate[]));
  }
  useEffect(carregar, []);

  async function avisar(p: Produto) {
    const r = await postApi("/api/suporte", {
      acao: "abrir",
      tema: "Hot Store",
      assunto: `Interesse: ${p.t}`,
      texto: `Quero comprar "${p.t}" quando estiver disponível.`,
    });
    if (r.erro) return toast(r.erro);
    setAvisados((a) => ({ ...a, [p.id]: true }));
    toast("Anotado! Avisamos você pelo Suporte.");
  }

  const lista = PRODUTOS.filter((p) => cat === "Tudo" || p.cat === cat);

  return (
    <section className={m("view")} aria-label="Hot Store">
      <div className={m("top")}>
        <div>
          <h1>Hot Store</h1>
          <p className={m("sub")}>Ferramentas, mentorias e o merch da Society.</p>
        </div>
        <div className={m("chips")}>
          <span className={m("chip coin")}>
            <i className={m("num")}>{num(coins)}</i> Cappu Coins
          </span>
        </div>
      </div>

      <div className={m("st-feat")} style={{ backgroundImage: `url(${IMG.hero})` }}>
        <div className={m("in")}>
          <p className={m("eb")} style={{ color: "var(--red-t)" }}>
            Destaque · Mônaco
          </p>
          <h2 className={m("stack")}>
            <span className={m("s")}>Mentoria</span>
            <span>High</span>
            <span style={{ color: "var(--red-t)" }}>Ticket.</span>
          </h2>
          <p className={m("sub")} style={{ margin: 0 }}>
            Acompanhamento direto com o Cappu, turma pequena, por aplicação.
          </p>
          <div className={m("row")}>
            <button className={m("btn btn-p")} type="button" onClick={() => setAberto("aplicar")}>
              Aplicar agora
            </button>
          </div>
        </div>
      </div>

      <div className={m("seg")} role="group" aria-label="Categorias" style={{ justifySelf: "start" }}>
        {CATS.map((c) => (
          <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>

      <div className={m("st-grid")}>
        {lista.map((p) => {
          const temHp = p.id === "hp" && resgates.some((r) => r.item_id === "hp" && r.status !== "cancelado");
          return (
            <div key={p.id} className={m("st-p")}>
              <div
                className={m("cv" + (p.img ? " ph" : ""))}
                style={p.img ? { backgroundImage: `url(${p.img})` } : { background: GFX_BG }}
              >
                {p.gfx && (
                  <>
                    <span className={m("gx")}>{p.gfx}</span>
                    <span className={m("rl")} />
                  </>
                )}
                {p.tag && <span className={m("tag am tg")}>{p.tag}</span>}
                {p.breve && (
                  <span className={m("lk")}>
                    <Icon name="lock" size={30} />
                    Em breve
                  </span>
                )}
              </div>
              <div className={m("bd")}>
                <div>
                  <b>{p.t}</b>
                  <p>{p.d}</p>
                </div>
                <div className={m("pr")}>
                  <div>
                    {p.rs && !p.coins ? (
                      <span className={m("rs")} style={{ fontSize: 15 }}>
                        Em breve · {brl(p.rs)}
                      </span>
                    ) : p.aplicacao ? (
                      <span className={m("rs")} style={{ fontSize: 15 }}>
                        Por aplicação
                      </span>
                    ) : null}
                    {p.coins && (
                      <div className={m("cc")}>
                        {num(p.coins)} coins
                      </div>
                    )}
                  </div>
                  {p.aplicacao ? (
                    <button type="button" className={m("btn btn-s")} onClick={() => setAberto("aplicar")}>
                      Aplicar
                    </button>
                  ) : p.breve ? (
                    <button type="button" className={m("btn btn-s")} disabled style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Icon name="lock" size={15} /> Em breve
                    </button>
                  ) : p.coins ? (
                    <button type="button" className={m("btn btn-p")} disabled={temHp} onClick={() => setResgatar(p)}>
                      {temHp ? "Já é seu ✓" : "Resgatar"}
                    </button>
                  ) : (
                    <button type="button" className={m("btn btn-s")} disabled={avisados[p.id]} onClick={() => avisar(p)}>
                      {avisados[p.id] ? "Anotado ✓" : "Avise-me"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {resgates.length > 0 && (
        <div className="hs-st-res">
          <h3>Meus resgates</h3>
          {resgates.map((r) => (
            <div key={r.id}>
              <span>
                <b>{r.titulo}</b>
                <small>
                  {r.protocolo} · {num(r.coins)} coins
                  {r.rastreio && ` · rastreio ${r.rastreio}`}
                </small>
              </span>
              <em>{ST_RESGATE[r.status] ?? r.status}</em>
            </div>
          ))}
        </div>
      )}

      <p className={m("demo")}>
        Cappu Coins são pontos de fidelidade que você ganha nas aulas e missões. Não têm valor em dinheiro, não podem ser sacados nem transferidos. Os
        produtos com preço em reais chegam em breve: toque em &ldquo;Avise-me&rdquo; para ser avisado.
      </p>

      {resgatar && (
        <Resgatar
          p={resgatar}
          coins={coins}
          onClose={() => setResgatar(null)}
          onFeito={(saldo) => {
            setCoins(saldo);
            carregar();
          }}
        />
      )}
      {aberto === "aplicar" && <Aplicar onClose={() => setAberto(null)} />}
    </section>
  );
}

function Resgatar({ p, coins, onClose, onFeito }: { p: Produto; coins: number; onClose: () => void; onFeito: (saldo: number) => void }) {
  const fisico = FISICOS.includes(p.id);
  const custo = p.coins ?? 0;
  const [tam, setTam] = useState(p.id === "mo" ? "M" : "Único");
  const [end, setEnd] = useState({ cep: "", endereco: "", cidade_uf: "", whatsapp: "" });
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState<string | null>(null);
  const falta = custo - coins;

  async function confirmar() {
    if (fisico && (end.cep.replace(/\D/g, "").length !== 8 || end.endereco.trim().length < 5 || end.cidade_uf.trim().length < 3))
      return toast("Preencha CEP, endereço e cidade.");
    setEnviando(true);
    const { data, error } = await supabase.rpc("resgatar_item", {
      p_item: p.id,
      p_tamanho: fisico ? tam : null,
      p_endereco: fisico ? { ...end, cep: end.cep.replace(/\D/g, ""), whatsapp: end.whatsapp.replace(/\D/g, "") } : null,
    });
    setEnviando(false);
    if (error) return toast(/insuficientes/.test(error.message) ? "Coins insuficientes." : /já tem/.test(error.message) ? "Você já tem este item." : "Não deu para resgatar agora.");
    const r = data as { protocolo: string; saldo: number };
    setFeito(r.protocolo);
    onFeito(r.saldo);
  }

  return (
    <Modal
      title={`Resgatar · ${p.t}`}
      onClose={onClose}
      foot={
        <>
          <span style={{ flex: 1 }} />
          {feito ? (
            <button type="button" className={m("btn btn-p")} onClick={onClose}>
              Fechar
            </button>
          ) : (
            <button type="button" className={m("btn btn-p")} onClick={confirmar} disabled={enviando || falta > 0}>
              {falta > 0 ? `Faltam ${num(falta)} coins` : enviando ? "Resgatando…" : `Resgatar por ${num(custo)} coins`}
            </button>
          )}
        </>
      }
    >
      {feito ? (
        <div className={m("gm-end")}>
          <span className={m("sc")} style={{ fontSize: 48 }}>
            ✓
          </span>
          <h3 className={m("stack")} style={{ fontSize: 30 }}>
            <span>Resgate</span>
            <span style={{ color: "var(--red-t)" }}>confirmado.</span>
          </h3>
          <p className={m("sub")} style={{ margin: 0 }}>
            Protocolo {feito}.{" "}
            {fisico ? "Enviamos em até 20 dias úteis, frete por nossa conta. O rastreio aparece em Meus resgates." : "A cor já está liberada nos Ajustes do seu HOTPHONE (recarregue a página)."}
          </p>
        </div>
      ) : (
        <>
          <p className={m("sub")} style={{ margin: 0 }}>
            Você tem {num(coins)} coins. Este item custa {num(custo)}.
          </p>
          {fisico && (
            <div className="hs-pn-form">
              {p.id === "mo" && (
                <label className="hs-pn-fld">
                  Tamanho
                  <select className="hs-pn-sel" value={tam} onChange={(e) => setTam(e.target.value)}>
                    {["P", "M", "G", "GG"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
              )}
              <div className="hs-pn-form2">
                <label className="hs-pn-fld">
                  CEP
                  <input className="hs-pn-in" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={end.cep} onChange={(e) => setEnd({ ...end, cep: e.target.value })} />
                </label>
                <label className="hs-pn-fld">
                  WhatsApp (para a entrega)
                  <input className="hs-pn-in" inputMode="tel" autoComplete="tel" value={end.whatsapp} onChange={(e) => setEnd({ ...end, whatsapp: e.target.value })} />
                </label>
              </div>
              <label className="hs-pn-fld">
                Endereço, número e complemento
                <input className="hs-pn-in" autoComplete="street-address" maxLength={160} value={end.endereco} onChange={(e) => setEnd({ ...end, endereco: e.target.value })} />
              </label>
              <label className="hs-pn-fld">
                Cidade / UF
                <input className="hs-pn-in" maxLength={80} value={end.cidade_uf} onChange={(e) => setEnd({ ...end, cidade_uf: e.target.value })} />
              </label>
            </div>
          )}
          <p className={m("demo")} style={{ margin: 0 }}>
            As coins saem do seu saldo na hora. Se o resgate for cancelado, elas voltam.
          </p>
        </>
      )}
    </Modal>
  );
}

function Aplicar({ onClose }: { onClose: () => void }) {
  const [texto, setTexto] = useState("");
  return (
    <Modal
      title="Aplicação · Mentoria High Ticket"
      onClose={onClose}
      foot={
        <>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className={m("btn btn-p")}
            onClick={async () => {
              if (texto.trim().length < 20) return toast("Conta um pouco mais sobre você antes de enviar");
              const r = await postApi<{ protocolo: string }>("/api/suporte", { acao: "abrir", tema: "Mentoria", assunto: "Aplicação · Mentoria High Ticket", texto: texto.trim() });
              if (r.erro) return toast(r.erro);
              onClose();
              toast(`Aplicação enviada · ${r.protocolo}`);
            }}
          >
            Enviar aplicação
          </button>
        </>
      }
    >
      <p className={m("sub")} style={{ margin: 0 }}>
        Conta rapidinho onde você está. O time responde em até 48 h.
      </p>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        aria-label="Sua aplicação"
        placeholder="Hoje eu faturo… minha maior trava é…"
        maxLength={600}
      />
    </Modal>
  );
}
