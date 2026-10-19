"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Certificado, { type Cert } from "../../../_components/Certificado";
import { useMembro } from "../../../_components/membros/MemberContext";
import { useProgresso } from "../../../_components/membros/Progresso";
import "../../../_components/membros/ui.css";
import ui from "../../../_components/membros/ui.styles";
import { supabase } from "../../../_lib/supabase";

function Conteudo() {
  const { modulo } = useParams<{ modulo: string }>();
  const { modulos } = useProgresso();
  const { user } = useMembro();
  const m = modulos.find((x) => x.slug === modulo);
  const [cert, setCert] = useState<Cert | null | undefined>(undefined);
  const [nome, setNome] = useState(((user.user_metadata as { full_name?: string } | undefined)?.full_name ?? "").trim());
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    supabase.rpc("meus_certificados").then(({ data }) => {
      setCert(((data ?? []) as (Cert & { modulo: string })[]).find((c) => c.modulo === modulo) ?? null);
    });
  }, [modulo]);

  async function emitir(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (nome.trim().split(/\s+/).length < 2) return setErro("Digite seu nome completo, como deve sair no certificado.");
    setEnviando(true);
    const { data, error } = await supabase.rpc("emitir_certificado", { p_modulo: modulo, p_nome: nome.trim() });
    setEnviando(false);
    if (error) return setErro(/conclua/.test(error.message) ? "Conclua todas as aulas do módulo para emitir." : "Não deu para emitir agora. Tente de novo.");
    setCert(data as Cert);
  }

  if (!m) return <p className={ui.muted}>Módulo não encontrado.</p>;
  const completo = m.feitas >= m.aulas.length;

  return (
    <div className={ui.page}>
      <header className={ui.head}>
        <p className={ui.eyebrow}>Certificado</p>
        <h1 className={ui.h1}>
          Módulo {m.n} · <span className={ui.gold}>{m.t}</span>
        </h1>
      </header>

      {cert === undefined ? (
        <p className={ui.muted}>Carregando…</p>
      ) : cert ? (
        <>
          <Certificado c={cert} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className={ui.btnGold} onClick={() => window.print()}>
              Baixar em PDF / imprimir
            </button>
            <Link href={`/certificado/${cert.codigo}`} className={ui.btnGhost} target="_blank">
              Link público de verificação
            </Link>
          </div>
          <p className={ui.small}>Na janela de impressão, escolha &ldquo;Salvar como PDF&rdquo; e orientação paisagem.</p>
        </>
      ) : !completo ? (
        <section className={ui.card}>
          <p className={ui.muted}>
            Faltam {m.aulas.length - m.feitas} de {m.aulas.length} aulas para liberar o certificado deste módulo.
          </p>
          <Link href={`/dashboard/aulas/${m.slug}`} className={ui.btnGold}>
            Continuar as aulas
          </Link>
        </section>
      ) : (
        <form className={ui.card} onSubmit={emitir}>
          <h2 className={ui.h2}>Seu nome no certificado</h2>
          <p className={ui.muted}>Confira com atenção: depois de emitido, o nome não muda.</p>
          <label className={ui.field}>
            <span>Nome completo</span>
            <input className={ui.input} value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} autoComplete="name" required />
          </label>
          {erro && (
            <p className={ui.muted} role="alert" style={{ color: "#ff9b9b", margin: 0 }}>
              {erro}
            </p>
          )}
          <button type="submit" className={ui.btnGold} disabled={enviando}>
            {enviando ? "Emitindo…" : "Emitir certificado"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function CertificadoPage() {
  return (
    <Suspense fallback={null}>
      <Conteudo />
    </Suspense>
  );
}
