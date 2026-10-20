import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import Certificado, { type Cert } from "../../_components/Certificado";
import { supabase } from "../../_lib/supabase";

export const metadata: Metadata = { title: "Verificar certificado", robots: { index: false } };

type Params = Promise<{ codigo: string }>;

// Página pública: qualquer pessoa confere se um certificado é verdadeiro pelo código.
export default function VerificarPage({ params }: { params: Params }) {
  return (
    <main style={{ minHeight: "100dvh", background: "#0b0b0c", color: "#ECEAE4", display: "grid", alignContent: "center", gap: 20, padding: "32px 16px" }}>
      <Suspense fallback={<p style={{ textAlign: "center" }}>Conferindo…</p>}>
        <Resultado params={params} />
      </Suspense>
      <p style={{ textAlign: "center", margin: 0 }}>
        <Link href="/" style={{ color: "#D9B566" }}>
          hotsociety.com.br
        </Link>
      </p>
    </main>
  );
}

async function Resultado({ params }: { params: Params }) {
  const { codigo } = await params;
  const limpo = codigo.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  const { data } = limpo ? await supabase.rpc("verificar_certificado", { p_codigo: limpo }) : { data: null };
  const c = data as Omit<Cert, "codigo"> | null;
  if (!c) {
    return (
      <div style={{ textAlign: "center", display: "grid", gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>Certificado não encontrado</h1>
        <p style={{ margin: 0, color: "#a9a69e" }}>Confira o código impresso no certificado.</p>
      </div>
    );
  }
  return (
    <>
      <p style={{ textAlign: "center", margin: 0, color: "#5bc98f", fontWeight: 700 }}>✓ Certificado verdadeiro, emitido pela HOT SOCIETY</p>
      <Certificado c={{ ...c, codigo: limpo }} />
    </>
  );
}
