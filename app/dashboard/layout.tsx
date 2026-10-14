import type { Metadata } from "next";
import { Suspense } from "react";
import MemberShell from "../_components/membros/MemberShell";

export const metadata: Metadata = {
  title: { default: "Área de membros", template: "%s · Área de membros" },
  robots: { index: false, follow: false },
};

// Toda página dentro de /dashboard ganha o menu, a proteção de login
// e o usuário via useMembro().
export default function MembrosLayout({ children }: any) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-white">A carregar o painel...</div>}>
      <MemberShell>{children}</MemberShell>
    </Suspense>
  );
}