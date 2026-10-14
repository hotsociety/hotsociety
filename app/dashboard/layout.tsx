import type { Metadata } from "next";
import { Suspense } from "react";
import MemberShell from "../_components/membros/MemberShell";

export const metadata: Metadata = {
  title: { default: "Área de membros", template: "%s · Área de membros" },
  robots: { index: false, follow: false },
};

// Esta linha diz à Vercel para não tentar compilar o dashboard estaticamente
export const dynamic = "force-dynamic";

export default function MembrosLayout({ children }: any) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-white">A carregar o painel...</div>}>
      <MemberShell>{children}</MemberShell>
    </Suspense>
  );
}