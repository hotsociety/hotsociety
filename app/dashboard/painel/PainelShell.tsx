"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NOME_CARGO, PODE, useMembro, type Cargo } from "../../_components/membros/MemberContext";
import { m } from "../../_components/membros/proto";
import "../../_components/membros/painel.css";

type Aba = { href: string; t: string; pode: (c: Cargo | null) => boolean };

export const ABAS: Aba[] = [
  { href: "/dashboard/painel", t: "Visão geral", pode: PODE.verValores },
  { href: "/dashboard/painel/vendas", t: "Vendas", pode: PODE.verPainel },
  { href: "/dashboard/painel/alunos", t: "Alunos e acesso", pode: PODE.verPainel },
  { href: "/dashboard/painel/chamados", t: "Chamados", pode: PODE.verPainel },
  { href: "/dashboard/painel/placas", t: "Placas", pode: PODE.verPlacas },
  { href: "/dashboard/painel/aulas", t: "Aulas", pode: PODE.editarAulas },
  { href: "/dashboard/painel/equipe", t: "Equipe e cargos", pode: PODE.darCargo },
  { href: "/dashboard/painel/historico", t: "Histórico", pode: PODE.verHistorico },
];

// Moldura do painel: título, cargo, abas e bloqueio para quem não tem cargo.
// O banco confere o cargo de novo em cada consulta e cada botão.
export default function PainelShell({ children }: { children: ReactNode }) {
  const { cargo } = useMembro();
  const pathname = usePathname();

  if (!PODE.verPainel(cargo)) {
    return (
      <section className={m("view")} aria-label="Painel da equipe">
        <div className={m("card")}>
          <h1 style={{ margin: "0 0 8px" }}>Área restrita</h1>
          <p className={m("sub")}>Esta parte é só para a equipe da HOT SOCIETY. Se você faz parte do time, peça a um Admin para liberar o seu cargo.</p>
        </div>
      </section>
    );
  }

  const abas = ABAS.filter((a) => a.pode(cargo));
  const permitida = ABAS.find((a) => a.href === pathname)?.pode(cargo) ?? true;

  return (
    <section className={m("view")} aria-label="Painel da equipe">
      <div className={m("top")}>
        <div>
          <h1>Painel da equipe</h1>
          <p className={m("sub")}>Vendas, acessos, chamados e conteúdo. Toda ação fica registrada.</p>
        </div>
        <span className="hs-pn-role">{NOME_CARGO[cargo!]}</span>
      </div>
      <nav className="hs-pn-tabs" aria-label="Seções do painel">
        {abas.map((a) => (
          <Link key={a.href} href={a.href} aria-current={pathname === a.href ? "page" : undefined}>
            {a.t}
          </Link>
        ))}
      </nav>
      {permitida ? (
        children
      ) : (
        <div className={m("card")}>
          <p className={m("sub")}>Seu cargo ({NOME_CARGO[cargo!]}) não abre esta seção.</p>
        </div>
      )}
    </section>
  );
}
