"use client";

import { useEffect, useRef } from "react";

// Captcha do login (o mesmo que estiver ligado no Supabase → Authentication → Attack Protection).
// Variáveis na Vercel (são públicas, podem ficar no navegador):
//   NEXT_PUBLIC_CAPTCHA_PROVIDER = "turnstile" (Cloudflare) ou "hcaptcha"
//   NEXT_PUBLIC_CAPTCHA_SITE_KEY = a "site key" do provedor
// Sem a site key, nada aparece e o login segue como antes.

const PROVEDOR = process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER === "hcaptcha" ? "hcaptcha" : "turnstile";
const SITE_KEY = process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY || "";
export const CAPTCHA_LIGADO = SITE_KEY.length > 0;

const SCRIPT = {
  turnstile: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
  hcaptcha: "https://js.hcaptcha.com/1/api.js?render=explicit&hl=pt-BR",
};

type Api = {
  render: (el: HTMLElement, o: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove?: (id: string) => void;
};

function api(): Api | undefined {
  const w = window as unknown as { turnstile?: Api; hcaptcha?: Api };
  return PROVEDOR === "hcaptcha" ? w.hcaptcha : w.turnstile;
}

let carregando: Promise<void> | null = null;
function carregarScript() {
  if (api()) return Promise.resolve();
  if (!carregando) {
    carregando = new Promise((ok, erro) => {
      const s = document.createElement("script");
      s.src = SCRIPT[PROVEDOR];
      s.async = true;
      s.onload = () => ok();
      s.onerror = () => {
        carregando = null;
        erro(new Error("captcha não carregou"));
      };
      document.head.appendChild(s);
    });
  }
  return carregando;
}

/** Mostra o captcha e devolve o token por onToken (null quando expira). `versao` muda → recomeça. */
export default function Captcha({ onToken, versao }: { onToken: (t: string | null) => void; versao: number }) {
  const caixa = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  useEffect(() => {
    cb.current = onToken;
  });

  useEffect(() => {
    if (!CAPTCHA_LIGADO || !caixa.current) return;
    let id: string | undefined;
    let vivo = true;
    cb.current(null);
    carregarScript()
      .then(() => {
        const a = api();
        if (!vivo || !a || !caixa.current) return;
        caixa.current.innerHTML = "";
        id = a.render(caixa.current, {
          sitekey: SITE_KEY,
          theme: "dark",
          language: "pt-br",
          callback: (t: string) => cb.current(t),
          "expired-callback": () => cb.current(null),
          "error-callback": () => cb.current(null),
        });
      })
      .catch(() => cb.current(null));
    return () => {
      vivo = false;
      const a = api();
      if (id && a?.remove) a.remove(id);
    };
  }, [versao]);

  if (!CAPTCHA_LIGADO) return null;
  return <div ref={caixa} style={{ minHeight: 65, display: "flex", justifyContent: "center" }} />;
}
