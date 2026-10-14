const M3 = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

/** Nome no padrão de passaporte: sem acento, maiúsculo, só letras e espaço. */
export function cleanName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hash5(s: string): string {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return String(h).padStart(5, '0');
}

/** Número "visual" do passaporte (o número oficial deve vir do Supabase após a compra). */
/** Funções puras: nunca leem o relógio (o Next 16 com cacheComponents bloqueia isso no prerender). */
export function passportNumber(name: string, year: number): string {
  return `HS-${String(year).slice(-2)}-${hash5(name)}`;
}

export function passportDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} ${M3[d.getMonth()]} ${d.getFullYear()}`;
}

export function brDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function brl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: n % 1 ? 2 : 0 });
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
