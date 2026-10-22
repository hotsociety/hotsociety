import Link from "next/link";
import { supabase } from "../../_lib/supabase";
import { formatPreco, type Curso } from "../../_lib/cursos";
import "./catalog.css";
import s from "./catalog.styles";

// Server Component: busca os cursos no Supabase. Use dentro de <Suspense>.
export default async function CourseGrid() {
  const { data, error } = await supabase.from("cursos").select("*");

  if (error) {
    console.error("Erro ao buscar cursos:", error);
  }

  const cursos = (data ?? []) as Curso[];

  if (cursos.length === 0) {
    return (
      <div className={s.empty}>
        <p>Nenhum curso publicado ainda.</p>
        <small>Cadastre na tabela <code>cursos</code> do Supabase e eles aparecem aqui.</small>
      </div>
    );
  }

  return (
    <div className={s.grid}>
      {cursos.map((curso) => (
        <article key={curso.id} className={s.card}>
          <div
            className={curso.capa_url ? `${s.cover} hs-cat-cover-img` : s.cover}
            aria-hidden="true"
            style={curso.capa_url ? { backgroundImage: `url(${curso.capa_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          >
            {!curso.capa_url && <span>{curso.titulo.slice(0, 2).toUpperCase()}</span>}
          </div>
          <div className={s.body}>
            <h3>{curso.titulo}</h3>
            {curso.descricao && <p>{curso.descricao}</p>}
            <div className={s.foot}>
              <strong>{formatPreco(curso.preco)}</strong>
              <Link href={`/curso/${curso.id}`} className={s.link}>
                Ver curso
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function CourseGridSkeleton() {
  return (
    <div className={s.grid} aria-busy="true" aria-label="Carregando cursos">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`${s.card} ${s.skeleton}`} />
      ))}
    </div>
  );
}
