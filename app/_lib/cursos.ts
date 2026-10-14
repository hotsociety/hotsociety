// Tipos e helpers da tabela `cursos` do Supabase.
export type Curso = {
  id: string | number;
  titulo: string;
  descricao?: string | null;
  preco?: number | null;
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatPreco(preco?: number | null) {
  return preco ? BRL.format(preco) : "Grátis";
}

// Evita redirecionamento para fora do site (?callback=https://...).
export function caminhoSeguro(valor: string | null | undefined, padrao = "/dashboard") {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//")) return padrao;
  return valor;
}
