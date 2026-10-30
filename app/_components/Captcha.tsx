"use client";

import { useEffect, useRef, useState } from "react";

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
  const [falhou, setFalhou] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    cb.current = onToken;
  });

  useEffect(() => {
    if (!CAPTCHA_LIGADO || !caixa.current) return;
    let id: string | undefined;
    let vivo = true;
    cb.current(null);
    setFalhou(false);
    // Se em 20 s o quadro não responder (bloqueador, rede), mostra o aviso com "tentar de novo".
    const limite = setTimeout(() => vivo && setFalhou(true), 20000);
    carregarScript()
      .then(() => {
        const a = api();
        if (!vivo || !a || !caixa.current) return;
        caixa.current.innerHTML = "";
        id = a.render(caixa.current, {
          sitekey: SITE_KEY,
          theme: "dark",
          language: "pt-br",
          retry: "auto",
          "refresh-expired": "auto",
          callback: (t: string) => {
            clearTimeout(limite);
            setFalhou(false);
            cb.current(t);
          },
          "expired-callback": () => cb.current(null),
          "error-callback": () => {
            cb.current(null);
            if (vivo) setFalhou(true);
          },
        });
      })
      .catch(() => {
        cb.current(null);
        if (vivo) setFalhou(true);
      });
    return () => {
      vivo = false;
      clearTimeout(limite);
      const a = api();
      if (id && a?.remove) a.remove(id);
    };
  }, [versao, tentativa]);

  if (!CAPTCHA_LIGADO) return null;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div ref={caixa} style={{ minHeight: 65, display: "flex", justifyContent: "center" }} />
      {falhou && (
        <div role="alert" style={{ display: "grid", gap: 8, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(230,201,120,.45)", background: "rgba(201,162,78,.08)", fontSize: 13, lineHeight: 1.45 }}>
          <span>
            A verificação de segurança não carregou. Se você usa bloqueador de anúncios, VPN ou o navegador Brave, libere este site ou tente outra rede (por
            exemplo, os dados do celular).
          </span>
          <button
            type="button"
            onClick={() => {
              carregando = null;
              setTentativa((n) => n + 1);
            }}
            style={{ justifySelf: "start", padding: "8px 14px", borderRadius: 8, border: "1px solid #C9A24E", background: "transparent", color: "inherit", font: "700 13px/1 inherit", cursor: "pointer" }}
          >
            Recarregar verificação
          </button>
        </div>
      )}
    </div>
  );
}
