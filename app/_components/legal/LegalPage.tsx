import Image from "next/image";
import Link from "next/link";
import "./legal.css";
import s from "./legal.styles";

export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className={s.page}>
      <div className={s.inner}>
        <Link href="/" className={s.back} aria-label="Voltar para o início">
          <Image src="/brand/hs-logo.svg" alt="HOT SOCIETY" width={1253} height={170} />
        </Link>
        <h1 className={s.title}>{title}</h1>
        <p className={s.meta}>Atualizado em {updated}</p>
        <p className={s.draft}>
          Modelo inicial. Revise com um advogado antes de publicar e complete os dados da empresa.
        </p>
        <article className={s.body}>{children}</article>
      </div>
    </main>
  );
}
