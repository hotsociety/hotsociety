// Tipos e helpers da tabela `cursos` do Supabase.
export type Curso = {
  id: string | number;
  titulo: string;
  descricao?: string | null;
  preco?: number | null;
  capa_url?: string | null;
  conteudo?: ConteudoCurso | null;
};

// Página de venda do curso (coluna `conteudo` em jsonb). Tudo opcional.
export type ConteudoCurso = {
  intro?: string;
  modulos?: { t: string; d?: string; aulas?: number }[];
  para_quem?: string[];
  extras?: string[];
  aviso?: string;
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatPreco(preco?: number | null) {
  return preco ? BRL.format(preco) : "Grátis";
}

// Evita redirecionamento para fora do site (?callback=https://...).
// Aceita só caminhos internos como "/dashboard/aulas". Barra invertida e
// caracteres invisíveis ficam de fora porque o navegador trata "/" + barra invertida como outro site.
export function caminhoSeguro(valor: string | null | undefined, padrao = "/dashboard") {
  if (!valor || valor.length > 300) return padrao;
  if (!valor.startsWith("/") || valor.startsWith("//") || /[\\\s\u0000-\u001f]/.test(valor)) return padrao;
  return valor;
}
