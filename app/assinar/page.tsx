"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../_lib/supabase";
import { DADOS_EMPRESA, PRICE, SITE } from "../_lib/site";
import { qrSvgPath } from "../_lib/qrcode";
import { lerUtm } from "../_lib/utm";
import { ITENS_PAGOS, itemPago } from "../_lib/loja";
import "../login/login.css";
import s from "../login/login.styles";
import "./assinar.css";

type Plano = "mensal" | "anual";
type Pedido = { id: string; plano: Plano | "loja"; item?: string | null; metodo?: "pix" | "cartao"; valor: number; status: string; br_code: string | null; checkout_url?: string | null; expira_em: string | null };
type Etapa = "carregando" | "form" | "pix" | "cartao" | "pago" | "expirado";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const PLANOS: Record<Plano, { t: string; s: string; preco: number }> = {
  anual: { t: "Anual", s: "12 meses · melhor preço", preco: PRICE.anual },
  mensal: { t: "Mensal", s: "30 dias", preco: PRICE.mensal },
};

export default function AssinarPage() {
  return (
    <Suspense fallback={<div className={s.loading}>Carregando…</div>}>
      <Assinar />
    </Suspense>
  );
}

function mascaraCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function mascaraTel(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

function Assinar() {
  const router = useRouter();
  const params = useSearchParams();
  const inicial: Plano = params.get("plano") === "mensal" ? "mensal" : "anual";
  // Compra de item da Hot Store (ex.: /assinar?item=cs): mesmo checkout, sem escolha de plano nem cupom.
  const item = itemPago(params.get("item"));
  const loja = item ? ITENS_PAGOS[item] : null;

  const [etapa, setEtapa] = useState<Etapa>("carregando");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [plano, setPlano] = useState<Plano>(inicial);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [tel, setTel] = useState("");
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [agora, setAgora] = useState(0);
  const [jaAtivo, setJaAtivo] = useState<string | null>(null);
  const [cupomTxt, setCupomTxt] = useState(() => (params.get("cupom") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20));
  const [cupom, setCupom] = useState<{ codigo: string; desconto: number; plano: Plano } | null>(null);
  const [cupomErro, setCupomErro] = useState("");
  const [abrirCupom, setAbrirCupom] = useState(() => !!params.get("cupom"));
  const [metodo, setMetodo] = useState<"pix" | "cartao">("pix");
  const [temCartao, setTemCartao] = useState(false);
  const voltaPedido = useRef(params.get("pedido"));

  // Precisa estar logado: o pagamento fica ligado à conta. Roda uma vez só.
  const rota = useRef(router);
  useEffect(() => {
    const router = rota.current;
    let vivo = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!vivo) return;
      if (!session) {
        const volta = item ? `/assinar?item=${item}` : `/assinar?plano=${inicial}`;
        router.replace(`/login?plano=${inicial}&callback=${encodeURIComponent(volta)}`);
        return;
      }
      setToken(session.access_token);
      setEmail(session.user.email ?? "");
      const meta = session.user.user_metadata as { full_name?: string; name?: string };
      setNome(meta?.full_name || meta?.name || "");
      const { data } = await supabase.rpc("meu_acesso");
      const a = data as { ativo?: boolean; cargo?: string | null; valido_ate?: string | null } | null;
      if (vivo && a?.ativo && !a.cargo && !item) setJaAtivo(a.valido_ate ?? "sem prazo");
      fetch("/api/pagamentos/pix", { cache: "no-store" })
        .then((r) => r.json())
        .then((c: { cartao?: boolean }) => vivo && setTemCartao(!!c.cartao))
        .catch(() => {});
      // Voltou da página do cartão: confere o pedido.
      const volta = voltaPedido.current;
      if (vivo && volta && /^[0-9a-f-]{36}$/i.test(volta)) {
        setPedido({ id: volta, plano: inicial, metodo: "cartao", valor: 0, status: "pendente", br_code: null, expira_em: null });
        setEtapa("cartao");
        return;
      }
      if (vivo) setEtapa("form");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => sess && setToken(sess.access_token));
    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, [inicial, item]);

  // Relógio para o tempo do Pix.
  useEffect(() => {
    if (etapa !== "pix") return;
    setAgora(Date.now());
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [etapa]);

  const conferir = useCallback(async () => {
    if (!pedido) return;
    const r = await fetch(`/api/pagamentos/pix?id=${pedido.id}`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!r.ok) return;
    const p = (await r.json()) as Pedido;
    setPedido(p);
    if (p.status === "pago") setEtapa("pago");
    else if (p.status !== "pendente") setEtapa("expirado");
  }, [pedido, token]);

  // Enquanto o Pix (ou a volta do cartão) está na tela, confere o pagamento a cada 5 segundos.
  useEffect(() => {
    if (etapa !== "pix" && etapa !== "cartao") return;
    if (etapa === "cartao") conferir();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") conferir();
    }, 5000);
    return () => clearInterval(t);
  }, [etapa, conferir]);

  const restante = pedido?.expira_em ? Math.max(0, new Date(pedido.expira_em).getTime() - agora) : 0;
  useEffect(() => {
    if (etapa === "pix" && agora > 0 && pedido?.expira_em && restante === 0) setEtapa("expirado");
  }, [etapa, agora, restante, pedido]);

  const qr = useMemo(() => (pedido?.br_code ? qrSvgPath(pedido.br_code) : null), [pedido]);

  async function gerar(e?: React.FormEvent) {
    e?.preventDefault();
    setErro("");
    const n = nome.trim().replace(/\s+/g, " ");
    if (n.split(" ").length < 2) return setErro("Digite seu nome completo, como no CPF.");
    if (cpf.replace(/\D/g, "").length !== 11) return setErro("Digite os 11 números do CPF.");
    if (!aceite) return setErro("Para continuar, confirme que tem 18 anos ou mais e aceita os termos.");
    setEnviando(true);
    try {
      const r = await fetch("/api/pagamentos/pix", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(
          item
            ? { item, metodo, nome: n, cpf, telefone: tel, aceite, utm: lerUtm() }
            : { plano, metodo, nome: n, cpf, telefone: tel, aceite, cupom: cupom?.plano === plano ? cupom.codigo : undefined, utm: lerUtm() },
        ),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setErro((j as { erro?: string }).erro || "Não deu para gerar o pagamento. Tente de novo.");
      const p = j as Pedido;
      setPedido(p);
      if (p.status === "pago") return setEtapa("pago");
      if (p.metodo === "cartao" && p.checkout_url && /^https:\/\//.test(p.checkout_url)) {
        window.location.href = p.checkout_url; // página segura do gateway (o número do cartão não passa pelo nosso site)
        return;
      }
      setEtapa("pix");
    } catch {
      setErro("Sem conexão. Confira sua internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  async function copiar() {
    if (!pedido?.br_code) return;
    try {
      await navigator.clipboard.writeText(pedido.br_code);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setErro("Não deu para copiar. Selecione o código e copie na mão.");
    }
  }

  // Cupom vindo do link (?cupom=CODIGO): confere sozinho quando o formulário abre e quando troca o plano.
  useEffect(() => {
    if (!item && etapa === "form" && abrirCupom && cupomTxt && (!cupom || cupom.plano !== plano)) aplicarCupom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa, plano]);

  async function aplicarCupom() {
    setCupomErro("");
    const codigo = cupomTxt.trim();
    if (!codigo) return;
    const { data } = await supabase.rpc("conferir_cupom", { p_codigo: codigo, p_plano: plano });
    const r = data as { ok: boolean; codigo?: string; desconto?: number } | null;
    if (!r?.ok) {
      setCupom(null);
      return setCupomErro("Cupom inválido, vencido ou não vale para este plano.");
    }
    setCupom({ codigo: r.codigo!, desconto: r.desconto!, plano });
  }
  const precoCom = (k: Plano) => (cupom && cupom.plano === k ? Math.round(PLANOS[k].preco * (100 - cupom.desconto)) / 100 : PLANOS[k].preco);
  const precoFinal = loja ? loja.preco : precoCom(plano);
  const nomePedido = (p: Pedido) => (p.plano === "loja" ? (loja?.titulo ?? "Hot Store") : PLANOS[p.plano].t);

  const mm = String(Math.floor(restante / 60000)).padStart(2, "0");
  const ss = String(Math.floor((restante % 60000) / 1000)).padStart(2, "0");

  return (
    <main className={s.page}>
      <aside className={s.visual} aria-hidden="true">
        <Image src="/img/hero-neve.jpg" alt="" fill preload sizes="(max-width: 1024px) 100vw, 50vw" className={s.visualImg} />
        <span className={s.goldLine} />
        <div className={s.visualText}>
          <span>Embarque no zero.</span>
          <strong>Desembarque no topo.</strong>
        </div>
      </aside>

      <section className={s.panel}>
        <div className={s.box}>
          <Link href="/" className={s.logo} aria-label="HOT SOCIETY, voltar ao início">
            <Image src="/brand/hs-logo.svg" alt="HOT SOCIETY" width={1253} height={170} />
          </Link>

          {etapa === "carregando" && <p className={s.ok}>Carregando…</p>}

          {etapa === "form" && (
            <>
              <h1 className={s.title}>
                <span>{loja ? "Finalize sua" : "Emita seu"}</span>
                <span className={s.gold}>{loja ? "compra." : "passaporte."}</span>
              </h1>
              {jaAtivo && (
                <p className={s.ok}>
                  Seu acesso já está ativo{jaAtivo !== "sem prazo" ? ` até ${new Date(jaAtivo).toLocaleDateString("pt-BR")}` : ""}. Pagando agora, o tempo novo
                  soma ao que você já tem.
                </p>
              )}
              <form className={s.form} onSubmit={gerar} noValidate>
                {loja ? (
                  <div className="hs-as-planos">
                    <div className="hs-as-plano" aria-checked="true" role="radio">
                      <b>{loja.titulo}</b>
                      <small>Hot Store · fica no seu Inventário</small>
                      <strong>{BRL.format(loja.preco)}</strong>
                    </div>
                  </div>
                ) : (
                <div className="hs-as-planos" role="radiogroup" aria-label="Plano">
                  {(Object.keys(PLANOS) as Plano[]).map((k) => (
                    <button key={k} type="button" role="radio" aria-checked={plano === k} className="hs-as-plano" onClick={() => setPlano(k)}>
                      <b>{PLANOS[k].t}</b>
                      <small>{PLANOS[k].s}</small>
                      <strong>
                        {precoCom(k) !== PLANOS[k].preco && <s style={{ opacity: 0.55, fontSize: 13, marginRight: 6 }}>{BRL.format(PLANOS[k].preco)}</s>}
                        {BRL.format(precoCom(k))}
                      </strong>
                    </button>
                  ))}
                </div>
                )}
                <label className={s.field}>
                  <span>Nome completo</span>
                  <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" maxLength={120} required />
                </label>
                <label className={s.field}>
                  <span>CPF</span>
                  <input value={cpf} onChange={(e) => setCpf(mascaraCpf(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" required />
                </label>
                <label className={s.field}>
                  <span>Celular (opcional)</span>
                  <input value={tel} onChange={(e) => setTel(mascaraTel(e.target.value))} inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" />
                </label>
                {loja ? null : abrirCupom ? (
                  <div className="hs-as-cupom">
                    <input
                      value={cupomTxt}
                      onChange={(e) => {
                        setCupomTxt(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20));
                        setCupom(null);
                      }}
                      placeholder="CUPOM"
                      aria-label="Cupom de desconto"
                      autoCapitalize="characters"
                    />
                    <button type="button" onClick={aplicarCupom} disabled={!cupomTxt}>
                      Aplicar
                    </button>
                  </div>
                ) : (
                  <button type="button" className="hs-as-link" onClick={() => setAbrirCupom(true)}>
                    Tenho um cupom
                  </button>
                )}
                {cupom && cupom.plano === plano && <p className={s.ok}>Cupom {cupom.codigo} aplicado: {cupom.desconto}% de desconto.</p>}
                {cupom && cupom.plano !== plano && <p className="hs-as-conta">O cupom {cupom.codigo} foi conferido para o outro plano. Toque em Aplicar de novo.</p>}
                {cupomErro && (
                  <p className={s.err} role="alert">
                    {cupomErro}
                  </p>
                )}
                <p className="hs-as-conta">
                  {loja ? "A compra fica registrada na conta" : "O acesso será liberado na conta"} <b>{email}</b>.
                </p>
                <label className="hs-as-aceite">
                  <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
                  <span>
                    Tenho 18 anos ou mais e li os{" "}
                    <a href="/termos" target="_blank" rel="noopener">
                      Termos de uso
                    </a>{" "}
                    e a{" "}
                    <a href="/privacidade" target="_blank" rel="noopener">
                      Política de privacidade
                    </a>
                    .{loja ? " Sei que posso pedir reembolso integral em até 7 dias." : " Sei que não há renovação automática e que posso pedir reembolso integral em até 7 dias."}
                  </span>
                </label>
                {temCartao && (
                  <div className="hs-as-planos" role="radiogroup" aria-label="Forma de pagamento">
                    <button type="button" role="radio" aria-checked={metodo === "pix"} className="hs-as-plano" onClick={() => setMetodo("pix")}>
                      <b>Pix</b>
                      <small>Aprovação na hora</small>
                    </button>
                    <button type="button" role="radio" aria-checked={metodo === "cartao"} className="hs-as-plano" onClick={() => setMetodo("cartao")}>
                      <b>Cartão</b>
                      <small>Em até 12x</small>
                    </button>
                  </div>
                )}
                {erro && (
                  <p className={s.err} role="alert">
                    {erro}
                  </p>
                )}
                <button type="submit" className={s.primary} disabled={enviando}>
                  {enviando
                    ? metodo === "cartao"
                      ? "Abrindo pagamento…"
                      : "Gerando Pix…"
                    : metodo === "cartao"
                      ? `Pagar ${BRL.format(precoFinal)} no cartão`
                      : `Pagar ${BRL.format(precoFinal)} com Pix`}
                </button>
                {metodo === "cartao" && <p className="hs-as-conta">Você vai para a página segura de pagamento e escolhe as parcelas lá. O número do cartão não passa pelo nosso site.</p>}
                <p className="hs-as-selos">
                  <span>🔒 Pagamento seguro e criptografado</span>
                  <span>↩ Garantia de 7 dias</span>
                </p>
                <p className="hs-as-vendedor">
                  Vendido por {DADOS_EMPRESA} · {SITE.supportEmail}
                </p>
              </form>
            </>
          )}

          {etapa === "pix" && pedido && qr && (
            <>
              <h1 className={s.title}>
                <span>Pague com</span>
                <span className={s.gold}>Pix.</span>
              </h1>
              <div className={s.form}>
                <p className="hs-as-resumo">
                  {nomePedido(pedido)} · <b>{BRL.format(pedido.valor)}</b>
                </p>
                <div className="hs-as-qr">
                  <svg viewBox={`0 0 ${qr.tamanho} ${qr.tamanho}`} role="img" aria-label="QR Code do Pix" shapeRendering="crispEdges">
                    <rect width={qr.tamanho} height={qr.tamanho} fill="#fff" />
                    <path d={qr.d} fill="#000" />
                  </svg>
                </div>
                <p className="hs-as-passos">Abra o app do seu banco, escolha <b>Pix → Ler QR Code</b> ou use o código abaixo.</p>
                <div className="hs-as-copia">
                  <input readOnly value={pedido.br_code ?? ""} aria-label="Pix copia e cola" onFocus={(e) => e.currentTarget.select()} />
                  <button type="button" onClick={copiar}>
                    {copiado ? "Copiado ✓" : "Copiar"}
                  </button>
                </div>
                <p className="hs-as-espera" role="status">
                  <i aria-hidden="true" /> Aguardando o pagamento… expira em {mm}:{ss}
                </p>
                <button type="button" className={s.textBtn} onClick={conferir}>
                  Já paguei, conferir agora
                </button>
                {erro && (
                  <p className={s.err} role="alert">
                    {erro}
                  </p>
                )}
              </div>
            </>
          )}

          {etapa === "cartao" && (
            <>
              <h1 className={s.title}>
                <span>Conferindo seu</span>
                <span className={s.gold}>pagamento.</span>
              </h1>
              <div className={s.form}>
                <p className="hs-as-espera" role="status">
                  <i aria-hidden="true" /> Aguardando a confirmação do cartão…
                </p>
                <p className="hs-as-passos">Costuma levar alguns segundos. Pode deixar esta página aberta.</p>
                <button type="button" className={s.textBtn} onClick={conferir}>
                  Conferir agora
                </button>
                <button type="button" className={s.textBtn} onClick={() => setEtapa("form")}>
                  Voltar e escolher outra forma de pagamento
                </button>
              </div>
            </>
          )}

          {etapa === "pago" && (
            <>
              <h1 className={s.title}>
                <span>Pagamento</span>
                <span className={s.gold}>aprovado.</span>
              </h1>
              <div className={s.form}>
                <p className={s.ok} role="status">
                  {loja ? "Sua compra já está no seu Inventário. É por lá que você agenda a call." : "Seu passaporte está ativo. Boa viagem!"}
                </p>
                <a href={loja ? "/dashboard/inventario" : "/dashboard"} className={s.primary} style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>
                  {loja ? "Abrir meu Inventário" : "Entrar na área de membros"}
                </a>
              </div>
            </>
          )}

          {etapa === "expirado" && (
            <>
              <h1 className={s.title}>
                <span>{pedido?.metodo === "cartao" ? "Pagamento" : "Esse Pix"}</span>
                <span className={s.gold}>{pedido?.metodo === "cartao" ? "não concluído." : "expirou."}</span>
              </h1>
              <div className={s.form}>
                <p className={s.err}>
                  {pedido?.metodo === "cartao"
                    ? "O cartão não foi aprovado ou a página expirou. Tente de novo ou pague com Pix."
                    : "O código vale 1 hora. Se você já pagou, aguarde alguns minutos e confira de novo; senão, gere um novo."}
                </p>
                <button type="button" className={s.primary} onClick={() => setEtapa("form")}>
                  Tentar de novo
                </button>
                <button type="button" className={s.textBtn} onClick={conferir}>
                  Já paguei, conferir de novo
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
