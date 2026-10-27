import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import FormAplicacao from "../_components/FormAplicacao";
import "./mentoria.css";

export const metadata: Metadata = {
  title: "Mentoria High Ticket · Aplicação",
  description: "Aplique para a Mentoria High Ticket com o Cappu: encontros ao vivo, calls individuais e chat direto com o mentor. Entrada por aplicação.",
};

// Página pública de aplicação. O que é enviado vai para o Painel → Mentoria como "lead plataforma".
export default function MentoriaPublica() {
  return (
    <main className="hs-mtp">
      <header className="hs-mtp-top">
        <Link href="/" aria-label="HOT SOCIETY">
          <Image src="/brand/hs-logo.svg" alt="HOT SOCIETY" width={1253} height={170} priority />
        </Link>
        <Link href="/login" className="hs-mtp-entrar">
          Entrar
        </Link>
      </header>
      <section className="hs-mtp-in">
        <div className="hs-mtp-txt">
          <p className="hs-mtp-eb">Mentoria High Ticket · Mônaco</p>
          <h1>
            Acesso direto
            <br />
            ao <span>Cappu</span>
          </h1>
          <p>Encontros ao vivo em grupo, calls individuais e chat direto com o mentor. Entrada por aplicação: leva 2 minutos.</p>
          <ul>
            <li>Análise da sua operação</li>
            <li>Hotseats com o seu funil</li>
            <li>Chat da turma e canal privado com o mentor</li>
          </ul>
          <p className="hs-mtp-nota">A equipe analisa cada aplicação e chama no WhatsApp em até 48 h úteis. Valor sob consulta.</p>
        </div>
        <div className="hs-mtp-card">
          <h2>Aplicar para a mentoria</h2>
          <FormAplicacao />
        </div>
      </section>
    </main>
  );
}
