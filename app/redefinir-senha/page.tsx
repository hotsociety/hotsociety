"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../_lib/supabase";
import "../login/login.css";
import s from "../login/login.styles";

type Estado = "verificando" | "pronto" | "invalido" | "feito";

// Página aberta pelo link do e-mail "Esqueci a senha".
// O Supabase devolve o aluno aqui já com uma sessão de recuperação;
// ele escolhe a senha nova e segue para a área de membros.
export default function RedefinirSenha() {
  const [estado, setEstado] = useState<Estado>("verificando");
  const [motivo, setMotivo] = useState("");
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [ver, setVer] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vivo = true;
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.slice(1));
    const falha = hash.get("error_description") || url.searchParams.get("error_description");
    const codigoErro = hash.get("error_code") || url.searchParams.get("error_code");

    function limparEndereco() {
      // Tira os códigos do link da barra de endereço (não ficam no histórico).
      window.history.replaceState(null, "", "/redefinir-senha");
    }

    if (falha) {
      setMotivo(codigoErro === "otp_expired" ? "Esse link expirou ou já foi usado." : "Esse link não é válido.");
      setEstado("invalido");
      limparEndereco();
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (!vivo) return;
      if (evento === "PASSWORD_RECOVERY" || (sessao && evento === "SIGNED_IN")) {
        setEstado("pronto");
        limparEndereco();
      }
    });

    (async () => {
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!vivo) return;
        if (error) {
          setMotivo("Esse link expirou ou já foi usado.");
          setEstado("invalido");
          limparEndereco();
          return;
        }
      }
      const { data } = await supabase.auth.getSession();
      if (!vivo) return;
      if (data.session) {
        setEstado("pronto");
        limparEndereco();
      } else {
        // Dá um tempinho para o Supabase ler o link; se não vier sessão, o link não serve.
        setTimeout(() => {
          if (!vivo) return;
          setMotivo("Abra esta página pelo link que chegou no seu e-mail.");
          setEstado((e) => (e === "verificando" ? "invalido" : e));
        }, 2500);
      }
    })();

    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== confirma) return setErro("As duas senhas não são iguais.");
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setSalvando(false);
      return setErro(traduzir(error.message));
    }
    // Por segurança, desconecta a conta em outros aparelhos.
    await supabase.auth.signOut({ scope: "others" }).catch(() => {});
    setSalvando(false);
    setEstado("feito");
  }

  return (
    <main className={s.page}>
      <aside className={s.visual} aria-hidden="true">
        <Image src="/img/hero-neve.jpg" alt="" fill preload sizes="(max-width: 1024px) 100vw, 50vw" className={s.visualImg} />
        <span className={s.goldLine} />
        <div className={s.visualText}>
          <span>Embarque no zero.</span>
          <strong>Desembarque no topo.</strong>
        </div>
      </aside>

      <section className={s.panel}>
        <div className={s.box}>
          <Link href="/" className={s.logo} aria-label="HOT SOCIETY, voltar ao início">
            <Image src="/brand/hs-logo.svg" alt="HOT SOCIETY" width={1253} height={170} />
          </Link>

          <h1 className={s.title}>
            <span>{estado === "feito" ? "Senha nova," : "Crie sua"}</span>
            <span className={s.gold}>{estado === "feito" ? "tudo certo." : "senha nova."}</span>
          </h1>

          {estado === "verificando" && <p className={s.ok}>Conferindo o link do seu e-mail…</p>}

          {estado === "invalido" && (
            <div className={s.form}>
              <p className={s.err} role="alert">
                {motivo} Peça um link novo: cada link vale uma vez e por pouco tempo.
              </p>
              <Link href="/login?esqueci=1" className={s.primary} style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>
                Pedir link novo
              </Link>
            </div>
          )}

          {estado === "pronto" && (
            <form className={s.form} onSubmit={salvar} noValidate>
              <label className={s.field}>
                <span>Senha nova</span>
                <div className={s.pass}>
                  <input
                    type={ver ? "text" : "password"}
                    autoComplete="new-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                    required
                    autoFocus
                  />
                  <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? "Esconder senha" : "Mostrar senha"}>
                    {ver ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </label>
              <label className={s.field}>
                <span>Repita a senha nova</span>
                <div className={s.pass}>
                  <input
                    type={ver ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirma}
                    onChange={(e) => setConfirma(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
              </label>
              {erro && (
                <p className={s.err} role="alert">
                  {erro}
                </p>
              )}
              <button type="submit" className={s.primary} disabled={salvando || senha.length < 8 || !confirma}>
                {salvando ? "Salvando…" : "Salvar senha nova"}
              </button>
            </form>
          )}

          {estado === "feito" && (
            <div className={s.form}>
              <p className={s.ok} role="status">
                Senha trocada. Você já está conectado neste aparelho e foi desconectado dos outros.
              </p>
              <Link href="/dashboard" className={s.primary} style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>
                Ir para a área de membros
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function traduzir(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("different from the old")) return "A senha nova precisa ser diferente da antiga.";
  if (m.includes("password should be")) return "A senha precisa ter pelo menos 8 caracteres, com letras e números.";
  if (m.includes("weak") || m.includes("pwned") || m.includes("easy to guess")) return "Essa senha já apareceu em vazamentos na internet. Escolha outra.";
  if (m.includes("session") || m.includes("jwt") || m.includes("expired")) return "O link expirou. Peça um link novo na tela de login.";
  if (m.includes("reauthentication")) return "Por segurança, peça um link novo na tela de login e tente de novo.";
  return msg;
}
