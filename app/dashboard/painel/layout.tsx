import type { Metadata } from "next";
import PainelShell from "./PainelShell";

export const metadata: Metadata = { title: "Painel da equipe" };

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return <PainelShell>{children}</PainelShell>;
}
