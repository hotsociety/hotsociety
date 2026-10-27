"use client";

import "../../_components/membros/painel.css";
import { useProgresso } from "../../_components/membros/Progresso";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal, toast } from "../../_components/membros/Toast";
import { m } from "../../_components/membros/proto";
import { postApi } from "../../_lib/api";
import { PRODUTOS, type Produto } from "../../_lib/demo";
import { ITENS_PAGOS, itemPago } from "../../_lib/loja";
import { supabase } from "../../_lib/supabase";
import Icon from "../../_components/membros/Icon";

const CATS = ["Tudo", "Digitais", "Ferramentas", "Mentoria", "Merch"] as const;
const brl = (v: number) => "R$ " + v.toLocaleString("pt-BR");
const num = (v: number) => v.toLocaleString("pt-BR");
const GFX_BG = "radial-gradient(90% 70% at 30% 20%,#2e2618,#0b0b0c 70%)";
const FISICOS = ["mo", "bn"];
type Resgate = { id: string; protocolo: string; item_id: string; titulo: string; coins: number; status: string; rastreio: string | null; criado_em: string };
const CALL = PRODUTOS.find((p) => p.id === "cs");

export default function HotStore() {
  const router = useRouter();
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
  // Itens à venda primeiro.
  lista.sort((a, b) => Number(!!b.compra) - Number(!!a.compra));
  const comprar = (p: Produto) => {
    const id = itemPago(p.id);
    if (id) router.push(`/assinar?item=${id}`);
  };

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
          <Link href="/dashboard/inventario" className={m("btn btn-s")} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="box" size={15} /> Meu inventário
          </Link>
        </div>
      </div>

      {CALL && (
        <div className={m("st-feat")} style={{ backgroundImage: `url(${CALL.img})` }}>
          <div className={m("in")}>
            <p className={m("eb")} style={{ color: "var(--red-t)" }}>
              Disponível agora
            </p>
            <h2 className={m("stack")}>
              <span className={m("s")}>Consultoria</span>
              <span>1:1 com</span>
              <span style={{ color: "var(--red-t)" }}>o time.</span>
            </h2>
            <p className={m("sub")} style={{ margin: 0 }}>
              Uma call de 60 minutos para destravar a sua operação. Depois do pagamento, você agenda pelo Inventário.
            </p>
            <div className={m("row")}>
              <button className={m("btn btn-p")} type="button" onClick={() => comprar(CALL)}>
                Comprar · {brl(ITENS_PAGOS.cs.preco)}
              </button>
            </div>
          </div>
        </div>
      )}

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
                    {p.compra && itemPago(p.id) ? (
                      <span className={m("rs")}>{brl(ITENS_PAGOS[itemPago(p.id)!].preco)}</span>
                    ) : p.breve ? (
                      <span className={m("rs")} style={{ fontSize: 15 }}>
                        Em breve
                      </span>
                    ) : p.rs && !p.coins ? (
                      <span className={m("rs")} style={{ fontSize: 15 }}>
                        Em breve · {brl(p.rs)}
                      </span>
                    ) : p.aplicacao ? (
                      <span className={m("rs")} style={{ fontSize: 15 }}>
                        Por aplicação
                      </span>
                    ) : null}
                    {p.coins && !p.breve && (
                      <div className={m("cc")}>
                        {num(p.coins)} coins
                      </div>
                    )}
                  </div>
                  {p.breve ? (
                    <button type="button" className={m("btn btn-s")} disabled style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Icon name="lock" size={15} /> Em breve
                    </button>
                  ) : p.compra ? (
                    <button type="button" className={m("btn btn-p")} onClick={() => comprar(p)}>
                      Comprar
                    </button>
                  ) : p.aplicacao ? (
                    <button type="button" className={m("btn btn-s")} onClick={() => setAberto("aplicar")}>
                      Aplicar
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

      <p className={m("demo")}>
        Tudo o que você compra ou resgata aqui fica em <Link href="/dashboard/inventario">Meu inventário</Link>. Cappu Coins são pontos de fidelidade que
        você ganha nas aulas e missões: não têm valor em dinheiro, não podem ser sacados nem transferidos. Os itens com cadeado chegam em breve.
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
            {fisico ? "Enviamos em até 20 dias úteis, frete por nossa conta. O rastreio aparece no seu Inventário." : "A cor já está liberada nos Ajustes do seu HOTPHONE (recarregue a página)."}
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
