"use client";

import { useState } from "react";
import { Modal, toast } from "../../_components/membros/Toast";
import { m } from "../../_components/membros/proto";
import { IMG, PERFIL_DEMO, PRODUTOS, type Produto } from "../../_lib/demo";

const CATS = ["Tudo", "Digitais", "Ferramentas", "Mentoria", "Merch"] as const;
const brl = (v: number) => "R$ " + v.toLocaleString("pt-BR");
const num = (v: number) => v.toLocaleString("pt-BR");
const GFX_BG = "radial-gradient(90% 70% at 30% 20%,#2e2618,#0b0b0c 70%)";

export default function HotStore() {
  const [cat, setCat] = useState<(typeof CATS)[number]>("Tudo");
  const [carrinho, setCarrinho] = useState<string[]>([]);
  const [coins, setCoins] = useState(PERFIL_DEMO.coins);
  const [aberto, setAberto] = useState<null | "carrinho" | "aplicar">(null);

  function adicionar(p: Produto) {
    if (carrinho.includes(p.id)) return setAberto("carrinho");
    setCarrinho((c) => [...c, p.id]);
    toast("Adicionado ao carrinho");
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
          <button className={m("btn btn-s")} type="button" onClick={() => setAberto("carrinho")}>
            Carrinho <span className={m("st-n")}>{carrinho.length}</span>
          </button>
        </div>
      </div>

      <div className={m("st-feat")} style={{ backgroundImage: `url(${IMG.hero})` }}>
        <div className={m("in")}>
          <p className={m("eb")} style={{ color: "var(--red-t)" }}>
            Destaque · Dubai
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
          const no = carrinho.includes(p.id);
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
              </div>
              <div className={m("bd")}>
                <div>
                  <b>{p.t}</b>
                  <p>{p.d}</p>
                </div>
                <div className={m("pr")}>
                  <div>
                    {p.rs ? (
                      <span className={m("rs")}>{brl(p.rs)}</span>
                    ) : p.aplicacao ? (
                      <span className={m("rs")} style={{ fontSize: 15 }}>
                        Por aplicação
                      </span>
                    ) : null}
                    {p.coins && (
                      <div className={m("cc")}>
                        {p.soCoins ? "" : "ou "}
                        {num(p.coins)} coins
                      </div>
                    )}
                  </div>
                  {p.aplicacao ? (
                    <button type="button" className={m("btn btn-s")} onClick={() => setAberto("aplicar")}>
                      Aplicar
                    </button>
                  ) : (
                    <button type="button" className={m("btn " + (no ? "btn-s" : "btn-p"))} onClick={() => adicionar(p)}>
                      {no ? "No carrinho ✓" : "Adicionar"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className={m("demo")}>
        Cappu Coins são pontos de fidelidade: não têm valor em dinheiro, não podem ser sacados nem transferidos. Nenhuma
        compra é processada nesta versão.
      </p>

      {aberto === "carrinho" && (
        <Carrinho
          ids={carrinho}
          coins={coins}
          onRemover={(id) => setCarrinho((c) => c.filter((x) => x !== id))}
          onComprar={(gasto, ganho) => {
            setCoins((c) => c - gasto + ganho);
            setCarrinho([]);
          }}
          onClose={() => setAberto(null)}
        />
      )}
      {aberto === "aplicar" && <Aplicar onClose={() => setAberto(null)} />}
    </section>
  );
}

function Carrinho({
  ids,
  coins,
  onRemover,
  onComprar,
  onClose,
}: {
  ids: string[];
  coins: number;
  onRemover: (id: string) => void;
  onComprar: (gasto: number, ganho: number) => void;
  onClose: () => void;
}) {
  const [feito, setFeito] = useState<number | null>(null);
  const itens = ids.map((id) => PRODUTOS.find((p) => p.id === id)!).filter(Boolean);
  const total = itens.reduce((a, p) => a + (p.soCoins ? 0 : (p.rs ?? 0)), 0);
  const emCoins = itens.reduce((a, p) => a + (p.soCoins ? (p.coins ?? 0) : 0), 0);

  function finalizar() {
    if (emCoins > coins) return toast("Coins insuficientes para esse item");
    const ganho = Math.round(total * 2);
    onComprar(emCoins, ganho);
    setFeito(ganho);
  }

  if (feito !== null)
    return (
      <Modal
        title="Carrinho"
        onClose={onClose}
        foot={
          <>
            <span style={{ flex: 1 }} />
            <button type="button" className={m("btn btn-p")} onClick={onClose}>
              Fechar
            </button>
          </>
        }
      >
        <div className={m("gm-end")}>
          <span className={m("sc")} style={{ fontSize: 48 }}>
            ✓
          </span>
          <h3 className={m("stack")} style={{ fontSize: 30 }}>
            <span>Pedido</span>
            <span style={{ color: "var(--red-t)" }}>confirmado.</span>
          </h3>
          <p className={m("sub")} style={{ margin: 0 }}>
            Os digitais aparecem na Área de Membros. Você ganhou {num(feito)} Cappu Coins de fidelidade.
          </p>
          <p className={m("demo")} style={{ margin: 0 }}>
            Nenhuma cobrança foi feita nesta versão.
          </p>
        </div>
      </Modal>
    );

  return (
    <Modal
      title="Carrinho"
      onClose={onClose}
      foot={
        itens.length ? (
          <>
            <button type="button" className={m("btn btn-s")} onClick={onClose}>
              Continuar comprando
            </button>
            <span style={{ flex: 1 }} />
            <button type="button" className={m("btn btn-p")} onClick={finalizar}>
              Finalizar compra
            </button>
          </>
        ) : undefined
      }
    >
      {itens.length ? (
        <>
          {itens.map((p) => (
            <div key={p.id} className={m("st-ci")}>
              <span className={m("th")} style={p.img ? { backgroundImage: `url(${p.img})` } : undefined}>
                {p.img ? "" : p.gfx}
              </span>
              <div>
                <b>{p.t}</b>
                <small>{p.soCoins ? `${num(p.coins ?? 0)} coins` : brl(p.rs ?? 0)}</small>
              </div>
              <button type="button" aria-label="Remover" onClick={() => onRemover(p.id)}>
                ×
              </button>
            </div>
          ))}
          <div className={m("st-tot")}>
            <span>Total</span>
            <span>
              {brl(total)}
              {emCoins ? ` + ${num(emCoins)} coins` : ""}
            </span>
          </div>
          <div className={m("st-pay")}>
            <label>
              <input type="radio" name="stp" defaultChecked /> Pix
            </label>
            <label>
              <input type="radio" name="stp" /> Cartão
            </label>
          </div>
          <p className={m("demo")} style={{ margin: 0 }}>
            Itens com preço em coins usam seus pontos de fidelidade. Merch tem frete calculado no endereço.
          </p>
        </>
      ) : (
        <p className={m("sub")} style={{ textAlign: "center", padding: "20px 0" }}>
          Seu carrinho está vazio.
        </p>
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
            onClick={() => {
              if (!texto.trim()) return toast("Conta um pouco sobre você antes de enviar");
              onClose();
              toast("Aplicação enviada. Resposta em até 48 h");
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
