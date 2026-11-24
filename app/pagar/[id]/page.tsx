"use client";

// Link de pagamento da mentoria pela Appmax (gerado em Painel → Mentoria → Links de pagamento).
// Pix com QR Code aqui mesmo ou cartão em até 12x sem juros, tokenizado no navegador pelo script da Appmax.

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DADOS_EMPRESA, SITE } from "../../_lib/site";
import { qrSvgPath } from "../../_lib/qrcode";
import { soDigitos, useAppmax, type ConfigAppmax } from "../../_lib/appmaxJs";
import "../../login/login.css";
import s from "../../login/login.styles";
import "../../assinar/assinar.css";

type Info = { descricao: string; valor: number; status: "aberto" | "pago" | "fechado"; primeiroNome: string | null; appmax?: ConfigAppmax & { cartao: boolean } };
type Etapa = "carregando" | "form" | "pix" | "analise" | "pago" | "fechado" | "erro";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const FORM_CARTAO = "hs-appmax-cartao";

function mascaraCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function mascaraTel(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

export default function PagarMentoria() {
  const { id } = useParams<{ id: string }>();
  const [info, setInfo] = useState<Info | null>(null);
  const [etapa, setEtapa] = useState<Etapa>("carregando");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [tel, setTel] = useState("");
  const [metodo, setMetodo] = useState<"pix" | "cartao">("pix");
  const [parcelas, setParcelas] = useState(1);
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pix, setPix] = useState<{ pedido: string; br_code: string; expira_em: string | null } | null>(null);
  const [pedido, setPedido] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [agora, setAgora] = useState(0);

  const config = useMemo(() => (info?.appmax ? { script: info.appmax.script, externalId: info.appmax.externalId, parcelas: info.appmax.parcelas } : null), [info]);
  const appmax = useAppmax(config);
  const temCartao = !!info?.appmax?.cartao;
  const maxParcelas = Math.max(1, info?.appmax?.parcelas ?? 1);
  const parcelasOk = Math.min(Math.max(1, parcelas), maxParcelas);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/mentoria/pagar?id=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, j: (await r.json().catch(() => ({}))) as Info & { erro?: string } }))
      .then(({ ok, j }) => {
        if (!vivo) return;
        if (!ok) return setEtapa("erro");
        setInfo(j);
        setEtapa(j.status === "pago" ? "pago" : j.status === "aberto" ? "form" : "fechado");
      })
      .catch(() => vivo && setEtapa("erro"));
    return () => {
      vivo = false;
    };
  }, [id]);

  const conferir = useCallback(async () => {
    if (!pedido) return;
    const r = await fetch(`/api/mentoria/pagar?id=${encodeURIComponent(id)}&pedido=${pedido}`, { cache: "no-store" }).catch(() => null);
    const j = r?.ok ? ((await r.json()) as Info & { tentativa?: string }) : null;
    if (!j) return;
    if (j.status === "pago") setEtapa("pago");
    else if (j.tentativa === "recusado") {
      setEtapa("form");
      setErro("Cartão não aprovado. Tente outro cartão ou pague com Pix.");
    } else if (j.tentativa === "expirado") {
      setEtapa("form");
      setErro("O Pix expirou. Gere um novo.");
    }
  }, [id, pedido]);

  // Pix na tela ou cartão em análise: confere a cada 5 segundos.
  useEffect(() => {
    if (etapa !== "pix" && etapa !== "analise") return;
    const t = setInterval(() => document.visibilityState === "visible" && conferir(), 5000);
    return () => clearInterval(t);
  }, [etapa, conferir]);

  useEffect(() => {
    if (etapa !== "pix") return;
    setAgora(Date.now());
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [etapa]);

  const qr = useMemo(() => (pix?.br_code ? qrSvgPath(pix.br_code) : null), [pix]);
  const restante = pix?.expira_em ? Math.max(0, new Date(pix.expira_em).getTime() - agora) : 0;
  const mm = String(Math.floor(restante / 60000)).padStart(2, "0");
  const ss = String(Math.floor((restante % 60000) / 1000)).padStart(2, "0");

  async function pagar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const n = nome.trim().replace(/\s+/g, " ");
    if (n.split(" ").length < 2) return setErro("Digite seu nome completo, como no CPF.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setErro("Digite um e-mail válido. É nele que chega o seu acesso.");
    if (cpf.replace(/\D/g, "").length !== 11) return setErro("Digite os 11 números do CPF.");
    if (tel.replace(/\D/g, "").length < 10) return setErro("Digite seu celular com DDD.");
    if (!aceite) return setErro("Para continuar, confirme que tem 18 anos ou mais e aceita os termos.");

    let cartao: { token: string; titular: string; parcelas: number } | undefined;
    if (metodo === "cartao") {
      const f = document.getElementById(FORM_CARTAO) as HTMLFormElement | null;
      const d = f ? new FormData(f) : null;
      const numero = String(d?.get("card-number") ?? "").replace(/\D/g, "");
      const titular = String(d?.get("card-holder-name") ?? "").trim().replace(/\s+/g, " ");
      const mes = Number(d?.get("exp-month") ?? 0);
      const ano = String(d?.get("exp-year") ?? "").replace(/\D/g, "");
      const cvv = String(d?.get("cvv") ?? "").replace(/\D/g, "");
      if (numero.length < 13 || numero.length > 19) return setErro("Confira o número do cartão.");
      if (titular.split(" ").length < 2) return setErro("Digite o nome como está impresso no cartão.");
      if (!(mes >= 1 && mes <= 12) || (ano.length !== 2 && ano.length !== 4)) return setErro("Confira a validade do cartão (mês e ano).");
      if (cvv.length < 3) return setErro("Confira o CVV, os 3 ou 4 números no verso do cartão.");
      if (!f || !appmax.pronto) return setErro("O pagamento com cartão ainda está carregando. Espere alguns segundos e tente de novo.");
      setEnviando(true);
      try {
        cartao = { token: await appmax.tokenizar(f), titular, parcelas: parcelasOk };
      } catch {
        setEnviando(false);
        return setErro("Não deu para validar o cartão. Confira os dados e tente de novo.");
      }
    }

    setEnviando(true);
    try {
      const r = await fetch("/api/mentoria/pagar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, nome: n, email: email.trim().toLowerCase(), cpf, telefone: tel, metodo, ip: appmax.ip.current || undefined, cartao }),
      });
      const j = (await r.json().catch(() => ({}))) as Info & { erro?: string; pedido?: string; br_code?: string | null; expira_em?: string | null };
      if (!r.ok) return setErro(j.erro || "Não deu para gerar o pagamento. Tente de novo.");
      if (j.status === "pago") return setEtapa("pago");
      setPedido(j.pedido ?? null);
      if (j.br_code && j.pedido) {
        setPix({ pedido: j.pedido, br_code: j.br_code, expira_em: j.expira_em ?? null });
        return setEtapa("pix");
      }
      setEtapa("analise");
    } catch {
      setErro("Sem conexão. Confira sua internet e tente de novo.");
    } finally {
      setEnviando(false);
      const cvv = document.querySelector<HTMLInputElement>(`input[form="${FORM_CARTAO}"][name="cvv"]`);
      if (cvv) cvv.value = "";
    }
  }

  async function copiar() {
    if (!pix?.br_code) return;
    try {
      await navigator.clipboard.writeText(pix.br_code);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setErro("Não deu para copiar. Selecione o código e copie na mão.");
    }
  }

  const valor = info ? BRL.format(info.valor) : "";

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

          {(etapa === "erro" || etapa === "fechado") && (
            <>
              <h1 className={s.title}>
                <span>Link</span>
                <span className={s.gold}>{etapa === "erro" ? "não encontrado." : "encerrado."}</span>
              </h1>
              <p className={s.err}>Este link de pagamento não está ativo. Fale com a equipe HOT SOCIETY para receber um novo.</p>
            </>
          )}

          {etapa === "form" && info && (
            <>
              <h1 className={s.title}>
                <span>{info.primeiroNome ? `${info.primeiroNome}, garanta` : "Garanta"}</span>
                <span className={s.gold}>sua vaga.</span>
              </h1>
              <form className={s.form} onSubmit={pagar} noValidate>
                <div className="hs-as-planos">
                  <div className="hs-as-plano" aria-checked="true" role="radio">
                    <b>{info.descricao}</b>
                    <small>Pagamento único</small>
                    <strong>{valor}</strong>
                  </div>
                </div>
                <label className={s.field}>
                  <span>E-mail (seu acesso chega aqui)</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" autoCapitalize="off" maxLength={120} />
                </label>
                <label className={s.field}>
                  <span>Nome completo</span>
                  <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" maxLength={120} />
                </label>
                <label className={s.field}>
                  <span>CPF</span>
                  <input value={cpf} onChange={(e) => setCpf(mascaraCpf(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" />
                </label>
                <label className={s.field}>
                  <span>Celular com DDD</span>
                  <input value={tel} onChange={(e) => setTel(mascaraTel(e.target.value))} inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" />
                </label>
                {temCartao && (
                  <div className="hs-as-planos" role="radiogroup" aria-label="Forma de pagamento">
                    <button type="button" role="radio" aria-checked={metodo === "pix"} className="hs-as-plano" onClick={() => setMetodo("pix")}>
                      <b>Pix</b>
                      <small>Aprovação na hora</small>
                    </button>
                    <button type="button" role="radio" aria-checked={metodo === "cartao"} className="hs-as-plano" onClick={() => setMetodo("cartao")}>
                      <b>Cartão</b>
                      <small>{maxParcelas > 1 ? `Em até ${maxParcelas}x sem juros` : "À vista"}</small>
                    </button>
                  </div>
                )}
                {metodo === "cartao" && (
                  <div className="hs-as-cartao">
                    <label className={s.field}>
                      <span>Número do cartão</span>
                      <input form={FORM_CARTAO} name="card-number" inputMode="numeric" autoComplete="cc-number" maxLength={19} placeholder="Só os números" onInput={soDigitos} />
                    </label>
                    <label className={s.field}>
                      <span>Nome impresso no cartão</span>
                      <input form={FORM_CARTAO} name="card-holder-name" autoComplete="cc-name" maxLength={80} autoCapitalize="characters" />
                    </label>
                    <div className="hs-as-cartao-linha">
                      <label className={s.field}>
                        <span>Mês</span>
                        <input form={FORM_CARTAO} name="exp-month" inputMode="numeric" autoComplete="cc-exp-month" maxLength={2} placeholder="MM" onInput={soDigitos} />
                      </label>
                      <label className={s.field}>
                        <span>Ano</span>
                        <input form={FORM_CARTAO} name="exp-year" inputMode="numeric" autoComplete="cc-exp-year" maxLength={4} placeholder="AAAA" onInput={soDigitos} />
                      </label>
                      <label className={s.field}>
                        <span>CVV</span>
                        <input form={FORM_CARTAO} name="cvv" inputMode="numeric" autoComplete="cc-csc" maxLength={4} placeholder="123" onInput={soDigitos} />
                      </label>
                    </div>
                    <label className={s.field}>
                      <span>Parcelas</span>
                      <select value={parcelasOk} onChange={(e) => setParcelas(Number(e.target.value))}>
                        {Array.from({ length: maxParcelas }, (_, i) => i + 1).map((k) => (
                          <option key={k} value={k}>
                            {k === 1 ? `1x de ${valor} (à vista)` : `${k}x de ${BRL.format(Math.floor((info.valor * 100) / k) / 100)} sem juros`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="hs-as-conta">Os dados do cartão vão criptografados direto para a Appmax, que processa o pagamento. Eles não passam pelo nosso servidor.</p>
                  </div>
                )}
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
                    .
                  </span>
                </label>
                {erro && (
                  <p className={s.err} role="alert">
                    {erro}
                  </p>
                )}
                <button type="submit" className={s.primary} disabled={enviando}>
                  {enviando ? (metodo === "cartao" ? "Processando o cartão…" : "Gerando Pix…") : metodo === "cartao" ? `Pagar ${valor} no cartão` : `Pagar ${valor} com Pix`}
                </button>
                <p className="hs-as-selos">
                  <span>🔒 Pagamento seguro e criptografado</span>
                </p>
                <p className="hs-as-vendedor">
                  Vendido por {DADOS_EMPRESA} · {SITE.supportEmail}
                </p>
              </form>
            </>
          )}

          {etapa === "pix" && pix && qr && (
            <>
              <h1 className={s.title}>
                <span>Pague com</span>
                <span className={s.gold}>Pix.</span>
              </h1>
              <div className={s.form}>
                <p className="hs-as-resumo">
                  {info?.descricao} · <b>{valor}</b>
                </p>
                <div className="hs-as-qr">
                  <svg viewBox={`0 0 ${qr.tamanho} ${qr.tamanho}`} role="img" aria-label="QR Code do Pix" shapeRendering="crispEdges">
                    <rect width={qr.tamanho} height={qr.tamanho} fill="#fff" />
                    <path d={qr.d} fill="#000" />
                  </svg>
                </div>
                <p className="hs-as-passos">Abra o app do seu banco, escolha <b>Pix → Ler QR Code</b> ou use o código abaixo.</p>
                <div className="hs-as-copia">
                  <input readOnly value={pix.br_code} aria-label="Pix copia e cola" onFocus={(e) => e.currentTarget.select()} />
                  <button type="button" onClick={copiar}>
                    {copiado ? "Copiado ✓" : "Copiar"}
                  </button>
                </div>
                <p className="hs-as-espera" role="status">
                  <i aria-hidden="true" /> Aguardando o pagamento…{pix.expira_em ? ` expira em ${mm}:${ss}` : ""}
                </p>
                <button type="button" className={s.textBtn} onClick={conferir}>
                  Já paguei, conferir agora
                </button>
                {erro && <p className={s.err}>{erro}</p>}
              </div>
            </>
          )}

          {etapa === "analise" && (
            <>
              <h1 className={s.title}>
                <span>Conferindo seu</span>
                <span className={s.gold}>pagamento.</span>
              </h1>
              <div className={s.form}>
                <p className="hs-as-espera" role="status">
                  <i aria-hidden="true" /> Cartão em análise de segurança…
                </p>
                <p className="hs-as-passos">A análise costuma levar poucos minutos. Quando aprovar, você recebe o acesso por e-mail. Pode fechar esta página.</p>
                <button type="button" className={s.textBtn} onClick={conferir}>
                  Conferir agora
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
                  Sua vaga está garantida. O acesso chega no seu e-mail e a equipe HOT SOCIETY fala com você no WhatsApp.
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Formulários que o script da Appmax procura no init: precisam existir antes e não podem sair da página. */}
      {config && (
        <>
          <form data-appmax-customer="" hidden aria-hidden="true" />
          <form id={FORM_CARTAO} data-appmax-checkout="" hidden aria-hidden="true" onSubmit={(e) => e.preventDefault()} />
        </>
      )}
    </main>
  );
}
