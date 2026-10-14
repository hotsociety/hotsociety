import { createClient } from "@supabase/supabase-js";

// Cliente do Supabase usado pelo site. Lê as chaves do .env.local
// (no computador) ou das Environment Variables da Vercel (no ar).
// Se faltar alguma variável, o build não quebra: o catálogo só aparece vazio.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://faltando-env.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "faltando-env";

export const supabase = createClient(url, anonKey);
