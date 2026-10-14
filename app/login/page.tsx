"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../_lib/supabase";
import { CHECKOUT, PRICE } from "../_lib/site";
import { caminhoSeguro } from "../_lib/cursos";
import "./login.css";
import s from "./login.styles";

type Modo = "entrar" | "criar" | "esqueci";
type Aviso = { tipo: "erro" | "ok"; texto: string } | null;

// useSearchParams precisa de <Suspense> em volta.
export default function LoginPage() {
  return (
    <Suspense fallback={<div className={s.loading}>Carregando…</div>}>
      <Login />
    </Suspense>
  );
}

function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const plano = params.get("plano");
  const planoValido = plano === "mensal" || plano === "anual" ? plano : null;
  const checkoutExterno = planoValido && CHECKOUT[planoValido].startsWith("http") ? CHECKOUT[planoValido] : null;
  const destino = caminhoSeguro(params.get("callback"), "/dashboard");

  const [modo, setModo] = useState<Modo>(planoValido ? "criar" : "entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [carregando, setCarregando] = useState(false);
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);

  function seguir() {
    if (checkoutExterno) window.location.href = checkoutExterno;
    else router.push(destino);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    setCarregando(true);

    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) setAviso({ tipo: "erro", texto: traduzir(error.message) });
      else seguir();
    }

    if (modo === "criar") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { emailRedirectTo: `${window.location.origin}${destino}` },
      });
      if (error) setAviso({ tipo: "erro", texto: traduzir(error.message) });
      else if (data.session) seguir();
      else setAviso({ tipo: "ok", texto: "Conta criada. Confirme o e-mail que enviamos para liberar o acesso." });
    }

    if (modo === "esqueci") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) setAviso({ tipo: "erro", texto: traduzir(error.message) });
      else setAviso({ tipo: "ok", texto: "Se esse e-mail tiver conta, você vai receber o link para criar uma nova senha." });
    }

    setCarregando(false);
  }

  async function entrarComGoogle() {
    setAviso(null);
    setCarregandoGoogle(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${destino}` },
    });
    if (error) {
      setAviso({ tipo: "erro", texto: "Não deu para entrar com o Google: " + traduzir(error.message) });
      setCarregandoGoogle(false);
    }
  }

  const ocupado = carregando || carregandoGoogle;
  const titulo =
    modo === "entrar" ? ["Bem-vindo de volta,", "passageiro."] : modo === "criar" ? ["Crie seu", "passaporte."] : ["Perdeu o", "bilhete?"];

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

          {planoValido && (
            <p className={s.plan}>
              Plano escolhido: <b>{planoValido === "anual" ? `Anual · R$ ${PRICE.anual}` : `Mensal · R$ ${PRICE.mensal}`}</b>
            </p>
          )}

          <h1 className={s.title}>
            <span>{titulo[0]}</span>
            <span className={s.gold}>{titulo[1]}</span>
          </h1>

          {modo !== "esqueci" && (
            <div className={s.tabs} role="tablist" aria-label="Acesso">
              <button type="button" role="tab" aria-selected={modo === "entrar"} onClick={() => { setModo("entrar"); setAviso(null); }}>
                Entrar
              </button>
              <button type="button" role="tab" aria-selected={modo === "criar"} onClick={() => { setModo("criar"); setAviso(null); }}>
                Criar conta
              </button>
            </div>
          )}

          <form className={s.form} onSubmit={onSubmit} noValidate>
            <label className={s.field}>
              <span>E-mail</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                required
              />
            </label>

            {modo !== "esqueci" && (
              <label className={s.field}>
                <span>Senha</span>
                <div className={s.pass}>
                  <input
                    type={verSenha ? "text" : "password"}
                    autoComplete={modo === "criar" ? "new-password" : "current-password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder={modo === "criar" ? "Mínimo 6 caracteres" : "Sua senha"}
                    minLength={6}
                    required
                  />
                  <button type="button" onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? "Esconder senha" : "Mostrar senha"}>
                    {verSenha ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </label>
            )}

            {aviso && (
              <p className={aviso.tipo === "erro" ? s.err : s.ok} role={aviso.tipo === "erro" ? "alert" : "status"}>
                {aviso.texto}
              </p>
            )}

            <button
              type="submit"
              className={s.primary}
              disabled={ocupado || !email || (modo !== "esqueci" && senha.length < 6)}
            >
              {carregando ? "Aguarde…" : modo === "entrar" ? "Embarcar" : modo === "criar" ? "Criar conta" : "Enviar link"}
            </button>

            {modo === "entrar" && (
              <button type="button" className={s.textBtn} onClick={() => { setModo("esqueci"); setAviso(null); }}>
                Esqueci a senha
              </button>
            )}
            {modo === "esqueci" && (
              <button type="button" className={s.textBtn} onClick={() => { setModo("entrar"); setAviso(null); }}>
                ‹ Voltar para o login
              </button>
            )}
          </form>

          {modo !== "esqueci" && (
            <>
              <div className={s.divider}>
                <span>ou continue com</span>
              </div>
              <button type="button" className={s.google} onClick={entrarComGoogle} disabled={ocupado}>
                {carregandoGoogle ? (
                  "Redirecionando…"
                ) : (
                  <>
                    <svg viewBox="0 0 488 512" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                      />
                    </svg>
                    Google
                  </>
                )}
              </button>
            </>
          )}

          <p className={s.legal}>
            Ao continuar você confirma ter 18 anos ou mais e aceita os <Link href="/termos">Termos</Link> e a{" "}
            <Link href="/privacidade">Privacidade</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}

function traduzir(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (m.includes("already registered")) return "Esse e-mail já tem conta. Use Entrar.";
  if (m.includes("password should be")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("rate limit")) return "Muitas tentativas. Espere um pouco e tente de novo.";
  return msg;
}
