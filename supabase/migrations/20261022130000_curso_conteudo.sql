-- Página de venda do curso: texto de apresentação, módulos, para quem é e extras (jsonb).
alter table public.cursos add column if not exists conteudo jsonb;
