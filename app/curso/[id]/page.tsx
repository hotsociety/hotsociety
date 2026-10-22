import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { supabase } from "../../_lib/supabase";
import { formatPreco, type Curso } from "../../_lib/cursos";
import "./curso.css";
import s from "./curso.styles";

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
  const c = curso.conteudo;
  const totalAulas = c?.modulos?.reduce((t, m) => t + (m.aulas ?? 0), 0) ?? 0;

  return (
    <main className={s.main}>
      <section className={s.hero}>
        <div
          className={`${s.cover} ${curso.capa_url ? s.coverImg : ""}`}
          aria-hidden="true"
          style={curso.capa_url ? { backgroundImage: `url(${curso.capa_url})` } : undefined}
        >
          {!curso.capa_url && <span>{curso.titulo.slice(0, 2).toUpperCase()}</span>}
        </div>

        <div className={s.info}>
          <p className={s.eyebrow}>Curso HOT SOCIETY</p>
          <h1 className={s.h1}>{curso.titulo}</h1>
          {curso.descricao && <p className={s.lead}>{curso.descricao}</p>}
          {c?.intro && <p className={s.desc}>{c.intro}</p>}
          {totalAulas > 0 && (
            <p className={s.stats}>
              <span>{totalAulas} aulas</span>
              <span>{c!.modulos!.length} módulos</span>
              <span>Acesso no celular e no PC</span>
            </p>
          )}
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

      {c?.modulos?.length ? (
        <section className={s.sec} aria-labelledby="conteudo-curso">
          <h2 id="conteudo-curso" className={s.h2}>
            O que você vai aprender
          </h2>
          <ol className={s.mods}>
            {c.modulos.map((m) => (
              <li key={m.t}>
                <div>
                  <b>{m.t}</b>
                  {m.d && <p>{m.d}</p>}
                </div>
                {m.aulas ? <span>{m.aulas} aulas</span> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {c?.para_quem?.length || c?.extras?.length ? (
        <section className={`${s.sec} ${s.duo}`}>
          {c.para_quem?.length ? (
            <div className={s.box}>
              <h2 className={s.h2}>Para quem é</h2>
              <ul className={s.perks}>
                {c.para_quem.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {c.extras?.length ? (
            <div className={s.box}>
              <h2 className={s.h2}>Além das aulas</h2>
              <ul className={s.perks}>
                {c.extras.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {c?.aviso && <p className={s.aviso}>{c.aviso}</p>}
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
