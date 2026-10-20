/**
 * HOT SOCIETY · Passaporte 3D — configuração.
 * Preços e links de checkout vêm de app/_lib/site.ts (fonte única com a seção de planos).
 */
import { CHECKOUT, PRICE } from "../../_lib/site";

export const BRAND = {
  breu: "#0C0F13",
  gold: "#C9A24E",
  goldLight: "#D9B566",
  goldHi: "#F1DC9A",
  goldLow: "#9C7A33",
  stamp: "#B83030", // vermelho só nos carimbos
  ink: "#14171C",
  inkMuted: "#5E6470",
  snow: "#F2F4F7",
} as const;

export const SLOGAN = { a: "Embarque no zero.", b: "Desembarque no topo." } as const;

export interface RouteStop {
  code: string;
  country: string;
  lat: number;
  lon: number;
  goal: string;
}

/** Rota do passaporte: Brasil (início) → Mônaco (R$ 1 milhão + Mentoria High Ticket, o topo). */
export const ROUTE: RouteStop[] = [
  { code: "GRU", country: "BRASIL", lat: -23.43, lon: -46.47, goal: "início" },
  { code: "SCL", country: "CHILE", lat: -33.39, lon: -70.79, goal: "R$ 10 mil" },
  { code: "LIS", country: "PORTUGAL", lat: 38.77, lon: -9.13, goal: "R$ 50 mil" },
  { code: "DXB", country: "DUBAI", lat: 25.25, lon: 55.36, goal: "R$ 100 mil" },
  { code: "JFK", country: "NOVA YORK", lat: 40.64, lon: -73.78, goal: "R$ 500 mil" },
  { code: "MCM", country: "MÔNACO", lat: 43.73, lon: 7.42, goal: "R$ 1 milhão" },
];

export type PlanId = "anual" | "mensal";

export const PLANS: Record<PlanId, { label: string; price: number; per: string; checkout: string }> = {
  anual: { label: "Anual", price: PRICE.anual, per: "/ano", checkout: CHECKOUT.anual },
  mensal: { label: "Mensal", price: PRICE.mensal, per: "/mês", checkout: CHECKOUT.mensal },
};

export const ASSETS = {
  hero: "/img/hero-neve.jpg",
  comandante: "/img/comandante.jpg",
  wordmark: "/brand/hs-wordmark-gold.svg",
} as const;

export const NAME_MAX = 24;
/** Mesma chave do passaporte 2D antigo: quem já digitou o nome não perde. */
export const STORAGE_KEY = "hs-nome";
