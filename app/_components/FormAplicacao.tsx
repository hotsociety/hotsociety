"use client";

import "./form-aplicacao.css";
import { useState } from "react";
import { APLICACAO_VAZIA, ESCOLHAS, mascaraWpp, validarAplicacao, type Aplicacao } from "../_lib/aplicacao";
import { supabase } from "../_lib/supabase";

// Formulário de aplicação da Mentoria High Ticket (mesmas perguntas do site do Cappu).
// Vai para o Painel → Mentoria com o comentário "lead plataforma".
export default function FormAplicacao({ onEnviado, compacto }: { onEnviado?: () => void; compacto?: boolean }) {
  const [f, setF] = useState<Aplicacao>(APLICACAO_VAZIA);
  const [isca, setIsca] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const mudar = <K extends keyof Aplicacao>(k: K, v: Aplicacao[K]) => setF((x) => ({ ...x, [k]: v }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const v = validarAplicacao({ ...f });
    if (!v.ok) return setErro(v.erro);
    for (const q of ESCOLHAS) if (!f[q.campo]) return setErro(`Responda: ${q.t}`);
    setEnviando(true);
    try {
      const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const token = data.session?.access_token;
      const r = await fetch("/api/mentoria/aplicacao", {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ...f, site: isca }),
        cache: "no-store",
      });
      const j = (await r.json().catch(() => ({}))) as { erro?: string };
      if (!r.ok) return setErro(j.erro ?? "Não deu para enviar agora. Tente de novo.");
      setOk(true);
      onEnviado?.();
    } catch {
      setErro("Sem conexão. Confira a internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  if (ok) {
    return (
      <div className="hs-apl-ok" role="status">
        <b>Aplicação enviada ✓</b>
        <p>A equipe do Cappu analisa e chama você no WhatsApp em até 48 h úteis.</p>
      </div>
    );
  }

  return (
    <form className={"hs-apl" + (compacto ? " compacto" : "")} onSubmit={enviar} noValidate>
      <div className="hs-apl-g2">
        <label className="hs-apl-fld">
          Nome
          <input value={f.nome} onChange={(e) => mudar("nome", e.target.value)} placeholder="Seu nome" autoComplete="name" maxLength={80} required />
        </label>
        <label className="hs-apl-fld">
          Instagram
          <input value={f.ig} onChange={(e) => mudar("ig", e.target.value)} placeholder="@seuperfil" autoCapitalize="none" maxLength={60} required />
        </label>
        <label className="hs-apl-fld">
          WhatsApp com DDD
          <input value={mascaraWpp(f.wpp)} onChange={(e) => mudar("wpp", e.target.value.replace(/\D/g, ""))} placeholder="(11) 99999-9999" inputMode="tel" autoComplete="tel-national" required />
        </label>
        <label className="hs-apl-fld">
          Hoje você trabalha com o quê?
          <input value={f.trabalho} onChange={(e) => mudar("trabalho", e.target.value)} placeholder="Ex.: CLT no comércio, autônomo, já opero no digital…" maxLength={200} required />
        </label>
      </div>

      {ESCOLHAS.slice(0, 2).map((q) => (
        <Escolha key={q.campo} q={q} valor={f[q.campo]} onChange={(v) => mudar(q.campo, v)} />
      ))}

      <label className="hs-apl-fld">
        Qual a sua maior trava hoje?
        <textarea value={f.trava} onChange={(e) => mudar("trava", e.target.value)} placeholder="O que mais te impede de crescer agora?" maxLength={1500} required />
      </label>

      {ESCOLHAS.slice(2).map((q) => (
        <Escolha key={q.campo} q={q} valor={f[q.campo]} onChange={(v) => mudar(q.campo, v)} />
      ))}

      {/* Campo-isca para robôs (escondido de pessoas) */}
      <input className="hs-apl-isca" tabIndex={-1} autoComplete="off" aria-hidden="true" value={isca} onChange={(e) => setIsca(e.target.value)} name="site" />

      <label className="hs-apl-check">
        <input type="checkbox" checked={f.maior} onChange={(e) => mudar("maior", e.target.checked)} /> Confirmo que tenho 18 anos ou mais.
      </label>

      {erro && (
        <p className="hs-apl-erro" role="alert">
          {erro}
        </p>
      )}
      <button type="submit" className="hs-apl-btn" disabled={enviando}>
        {enviando ? "Enviando…" : "Enviar aplicação"}
      </button>
    </form>
  );
}

function Escolha({ q, valor, onChange }: { q: (typeof ESCOLHAS)[number]; valor: string; onChange: (v: string) => void }) {
  return (
    <fieldset className="hs-apl-esc">
      <legend>{q.t}</legend>
      <div>
        {q.opcoes.map((o) => (
          <label key={o} className={valor === o ? "on" : ""}>
            <input type="radio" name={q.campo} value={o} checked={valor === o} onChange={() => onChange(o)} />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
