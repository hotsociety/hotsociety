// Itens da Hot Store vendidos em reais (pagos pelo mesmo checkout das assinaturas).
// O preço vale pelo que está aqui no servidor: o navegador só manda o id do item.
// Para vender um item novo: coloque aqui e tire o "breve" dele em PRODUTOS (_lib/demo.ts).

export const ITENS_PAGOS = {
  cs: { titulo: "Consultoria 1:1 · call de 60 min", preco: 497 },
  ar: { titulo: "Arsenal do Cappu + Networking", preco: 87 }, // entrega: convite do Discord (ARSENAL_CONVITE)
} as const;

export type ItemPago = keyof typeof ITENS_PAGOS;

export function itemPago(id: unknown): ItemPago | null {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(ITENS_PAGOS, id) ? (id as ItemPago) : null;
}
