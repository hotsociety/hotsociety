import type { Metadata } from "next";
import { Suspense } from "react";
import MemberShell from "../_components/membros/MemberShell";

export const metadata: Metadata = {
  title: { default: "Área de membros", template: "%s · Área de membros" },
  robots: { index: false, follow: false },
};

export default function MembrosLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-white">A carregar painel...</div>}>
      <MemberShell>{children}</MemberShell>
    </Suspense>
  );
}