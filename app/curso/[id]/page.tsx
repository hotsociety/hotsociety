import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { supabase } from "../../_lib/supabase";
import { formatPreco, type Curso } from "../../_lib/cursos";
import s from "./curso.module.css";

type Params = Promise<{ id: string }>;

// Mesmo padrão do projeto original: a página só monta a casca e
// passa a Promise de params para um filho dentro de <Suspense>.
export default function CursoPage({ params }: { params: Params }) {
  return (
    <div className={s.shell}>
      <header className={s.top}>
        <div className={s.topIn}>
          <Link href="/#cursos" className={s.back}>
            ‹ Voltar aos cursos
          </Link>
          <Link href="/" className={s.logo} aria-label="HOT SOCIETY, início">
            <Image src="/brand/hs-logo.svg" alt="HOT SOCIETY" width={1253} height={170} />
          </Link>
        </div>
      </header>

      <Suspense fallback={<CursoSkeleton />}>
        <DetalhesDoCurso promessaParams={params} />
      </Suspense>
    </div>
  );
}

async function DetalhesDoCurso({ promessaParams }: { promessaParams: Params }) {
  const { id } = await promessaParams;

  const { data, error } = await supabase.from("cursos").select("*").eq("id", id).single();
  const curso = data as Curso | null;

  if (error || !curso) {
    return (
      <main className={s.main}>
        <div className={s.notFound}>
          <Image src="/brand/hs-simbolo.svg" alt="" width={64} height={64} />
          <h1>Curso não encontrado</h1>
          <p>Esse destino não existe ou saiu do ar.</p>
          <Link href="/#cursos" className={s.btnGhost}>
            Ver todos os cursos
          </Link>
        </div>
      </main>
    );
  }

  const comprar = `/login?callback=/curso/${curso.id}`;

  return (
    <main className={s.main}>
      <section className={s.hero}>
        <div className={s.cover} aria-hidden="true">
          <span>{curso.titulo.slice(0, 2).toUpperCase()}</span>
        </div>

        <div className={s.info}>
          <p className={s.eyebrow}>Curso HOT SOCIETY</p>
          <h1 className={s.h1}>{curso.titulo}</h1>
          {curso.descricao && <p className={s.desc}>{curso.descricao}</p>}
        </div>

        <aside className={s.buy} aria-label="Comprar curso">
          <span className={s.priceLabel}>Investimento</span>
          <strong className={s.price}>{formatPreco(curso.preco)}</strong>
          <Link href={comprar} className={s.btnGold}>
            Comprar agora
          </Link>
          <ul className={s.perks}>
            <li>Acesso imediato após a confirmação</li>
            <li>Garantia de 7 dias</li>
            <li>Aulas no celular, tablet e PC</li>
          </ul>
          <p className={s.member}>
            Já é membro? <Link href="/dashboard">Abrir minha área</Link>
          </p>
        </aside>
      </section>
    </main>
  );
}

function CursoSkeleton() {
  return (
    <main className={s.main} aria-busy="true">
      <section className={s.hero}>
        <div className={`${s.cover} ${s.sk}`} />
        <div className={s.info}>
          <div className={s.sk} style={{ height: 14, width: 120 }} />
          <div className={s.sk} style={{ height: 40, width: "80%" }} />
          <div className={s.sk} style={{ height: 70 }} />
        </div>
        <div className={`${s.buy} ${s.sk}`} style={{ minHeight: 240 }} />
      </section>
    </main>
  );
}
