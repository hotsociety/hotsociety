// Parâmetros de rastreio dos anúncios (UTMify). Último clique: cada link com UTM substitui o anterior.
// Guardados só no navegador por 30 dias e enviados junto com o pedido.

export const CHAVES_UTM = ["src", "sck", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
export type Utm = Partial<Record<(typeof CHAVES_UTM)[number], string>>;

const KEY = "hs-utm";
const VALIDADE = 30 * 24 * 3600e3;

export function capturarUtm(search: string) {
  try {
    const q = new URLSearchParams(search);
    const u: Utm = {};
    for (const k of CHAVES_UTM) {
      const v = q.get(k)?.trim();
      if (v) u[k] = v.slice(0, 200);
    }
    if (Object.keys(u).length) localStorage.setItem(KEY, JSON.stringify({ u, em: Date.now() }));
  } catch {}
}

export function lerUtm(): Utm | undefined {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || "null") as { u: Utm; em: number } | null;
    if (j && Date.now() - j.em < VALIDADE) return j.u;
  } catch {}
  return undefined;
}

// No servidor: aceita só as chaves conhecidas, como texto curto.
export function limparUtm(x: unknown): Utm | null {
  if (!x || typeof x !== "object") return null;
  const u: Utm = {};
  for (const k of CHAVES_UTM) {
    const v = (x as Record<string, unknown>)[k];
    if (typeof v === "string" && v.trim()) u[k] = v.trim().slice(0, 200);
  }
  return Object.keys(u).length ? u : null;
}
