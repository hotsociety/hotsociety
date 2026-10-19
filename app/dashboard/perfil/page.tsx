"use client";

import { useProgresso } from "../../_components/membros/Progresso";
import { useState } from "react";
import Icon from "../../_components/membros/Icon";
import { useMembro } from "../../_components/membros/MemberContext";
import { supabase } from "../../_lib/supabase";
import MeusDados from "./MeusDados";
import MinhasCompras from "./MinhasCompras";
import "../../_components/membros/ui.css";
import ui from "../../_components/membros/ui.styles";
import "./perfil.css";
import s from "./perfil.styles";

type Aviso = { tipo: "ok" | "erro"; t: string } | null;

export default function Perfil() {
  const { perfil } = useProgresso();
  const { user, nome, iniciais, sair } = useMembro();
  const meta = user.user_metadata as { full_name?: string } | undefined;
  const [nomeCompleto, setNomeCompleto] = useState(meta?.full_name ?? "");
  const [senha, setSenha] = useState("");
  const [aviso, setAviso] = useState<Aviso>(null);
  const [salvando, setSalvando] = useState(false);

  // Esses dois formulários já salvam de verdade no Supabase Auth.
  async function salvarNome(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: nomeCompleto.trim() } });
    setAviso(error ? { tipo: "erro", t: "Não deu para salvar o nome. Tente de novo." } : { tipo: "ok", t: "Nome atualizado." });
    setSalvando(false);
  }

  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setAviso(error ? { tipo: "erro", t: "Não deu para trocar a senha: " + error.message } : { tipo: "ok", t: "Senha alterada." });
    if (!error) setSenha("");
    setSalvando(false);
  }

  return (
    <div className={ui.page}>
      <header className={ui.head}>
        <p className={ui.eyebrow}>Perfil</p>
        <h1 className={ui.h1}>
          Minha <span className={ui.gold}>conta.</span>
        </h1>
      </header>

      <section className={`${ui.card} ${s.pass}`}>
        <span className={s.avatar}>{iniciais}</span>
        <div className={s.passInfo}>
          <small>Passaporte {perfil.passaporte}</small>
          <b>{nome}</b>
          <span>{user.email}</span>
        </div>
      </section>

      {aviso && (
        <p className={aviso.tipo === "ok" ? ui.okBox : s.err} role={aviso.tipo === "ok" ? "status" : "alert"}>
          {aviso.t}
        </p>
      )}

      <div className={ui.grid2}>
        <form className={ui.card} onSubmit={salvarNome}>
          <h2 className={ui.h2}>Seus dados</h2>
          <label className={ui.field}>
            <span>Nome completo</span>
            <input className={ui.input} value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} placeholder="Como quer ser chamado" />
          </label>
          <label className={ui.field}>
            <span>E-mail</span>
            <input className={ui.input} value={user.email ?? ""} disabled />
          </label>
          <button type="submit" className={ui.btnGold} disabled={salvando || !nomeCompleto.trim()}>
            Salvar
          </button>
        </form>

        <form className={ui.card} onSubmit={trocarSenha}>
          <h2 className={ui.h2}>Segurança</h2>
          <label className={ui.field}>
            <span>Nova senha</span>
            <input
              className={ui.input}
              type="password"
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              minLength={8}
            />
          </label>
          <button type="submit" className={ui.btnGhost} disabled={salvando || senha.length < 8}>
            Trocar senha
          </button>
        </form>
      </div>

      <MinhasCompras />

      <MeusDados />

      <button type="button" className={`${ui.btnGhost} ${s.out}`} onClick={sair}>
        <Icon name="out" size={18} /> Sair da conta
      </button>
    </div>
  );
}
