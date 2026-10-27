// SÓ SERVIDOR. Avisa a equipe por e-mail a cada venda paga, reembolso ou contestação.
// Destino: AVISO_VENDAS_EMAIL na Vercel (pode ter vários, separados por vírgula); sem ela, vai para o e-mail padrão abaixo.
import { enviarEmail, esc, moldura, SITE_URL } from "./email";
import { nomeProduto, type Pedido } from "./pagamentos";
import { comissaoCentavos } from "./utmify";

const PADRAO = "hotacademy0@gmail.com";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hora = (iso?: string | null) =>
  new Date(iso || Date.now()).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

const TIPOS: Partial<Record<Pedido["status"], { emoji: string; titulo: string }>> = {
  pago: { emoji: "💰", titulo: "Venda paga" },
  reembolsado: { emoji: "↩️", titulo: "Reembolso" },
  chargeback: { emoji: "⚠️", titulo: "Contestação (chargeback)" },
};

export async function avisarVenda(p: Pedido) {
  const t = TIPOS[p.status];
  if (!t) return;
  const para = (process.env.AVISO_VENDAS_EMAIL || PADRAO).split(",").map((x) => x.trim()).filter(Boolean);
  const parte = comissaoCentavos(p);
  const u = p.utm ?? {};
  const origem = [u.utm_source, u.utm_campaign, u.utm_content].filter(Boolean).join(" · ");
  const linhas: [string, string][] = [
    ["Cliente", `${p.nome || "—"} (${p.email})`],
    ["Produto", nomeProduto(p)],
    ["Forma", p.metodo === "cartao" ? "Cartão" : "Pix"],
    ["Valor", brl(p.valor_centavos)],
    ["Sua parte", `${brl(parte)}${p.metodo === "cartao" ? " (cartão: repasse manual)" : " (no seu Pix)"}`],
    ...(p.cupom ? ([["Cupom", p.cupom]] as [string, string][]) : []),
    ["Origem", origem || "sem UTM (direto ou orgânico)"],
    ["Quando", hora(p.status === "pago" ? p.pago_em : null)],
  ];
  const corpo = `<table style="border-collapse:collapse;width:100%;font-size:14px">${linhas
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:#666;width:110px">${k}</td><td style="padding:6px 0"><b>${esc(v)}</b></td></tr>`)
    .join("")}</table>`;
  await enviarEmail({
    para,
    assunto: `${t.emoji} ${t.titulo} · ${brl(p.valor_centavos)} · ${nomeProduto(p)}`,
    html: moldura(`${t.emoji} ${t.titulo}`, corpo, { t: "Abrir o painel de vendas", href: `${SITE_URL}/dashboard/painel/vendas` }),
    chave: `aviso-${p.id}-${p.status}`,
  }).catch((e) => console.error("aviso de venda:", (e as Error).message));
}
