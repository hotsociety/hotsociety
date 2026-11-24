"use client";

// Script da Appmax no navegador (appmax.min.js): coleta o IP do comprador e tokeniza o cartão.
// O número do cartão e o CVV vão direto para a Appmax; o nosso servidor recebe só o token.
// Uso: useAppmax(config) + <FormulariosAppmax id="…" /> sempre montado na página, e os campos do cartão
// com form="<id>" e os nomes card-number, card-holder-name, exp-month, exp-year e cvv.

import { useEffect, useRef, useState } from "react";

export type AppmaxErro = { code?: string; message?: string; stage?: string } | string;
declare global {
  interface Window {
    AppmaxScripts?: {
      init: (opcoes: {
        externalId?: string;
        onIp?: (d: { ip: string }) => void;
        onTokenize?: (d: { token: string }) => void;
        onSuccess?: (d: unknown) => void;
        onError?: (e: AppmaxErro) => void;
      }) => void;
    };
  }
}

export type ConfigAppmax = { script: string; externalId: string | null; parcelas: number };

export const lerToken = (d: unknown) =>
  typeof d === "string" ? d : d && typeof d === "object" && typeof (d as { token?: unknown }).token === "string" ? (d as { token: string }).token : null;

// Campo do cartão: só números (o script da Appmax lê o valor como está).
export const soDigitos = (e: React.FormEvent<HTMLInputElement>) => {
  const el = e.currentTarget;
  const v = el.value.replace(/\D/g, "");
  if (v !== el.value) el.value = v;
};

export function useAppmax(config: ConfigAppmax | null) {
  const [pronto, setPronto] = useState(false);
  const iniciado = useRef(false);
  const ip = useRef("");
  const espera = useRef<{ ok: (t: string) => void; falha: (e: unknown) => void } | null>(null);

  useEffect(() => {
    if (!config) return;
    let vivo = true;
    const iniciar = () => {
      if (!vivo || !window.AppmaxScripts || iniciado.current) return;
      iniciado.current = true;
      try {
        window.AppmaxScripts.init({
          ...(config.externalId ? { externalId: config.externalId } : {}),
          onIp: (d) => {
            if (d?.ip) ip.current = d.ip;
          },
          onTokenize: (d) => {
            const t = lerToken(d);
            if (t) espera.current?.ok(t);
          },
          onSuccess: (d) => {
            const x = d && typeof d === "object" ? (d as { ip?: unknown }).ip : null;
            if (typeof x === "string") ip.current = x;
            else {
              const t = lerToken(d);
              if (t) espera.current?.ok(t);
            }
          },
          onError: (e) => {
            console.error("Appmax:", e);
            espera.current?.falha(e);
          },
        });
        setPronto(true);
      } catch (e) {
        console.error("Appmax init:", e);
      }
    };
    let sc = document.querySelector<HTMLScriptElement>("script[data-hs-appmax]");
    if (window.AppmaxScripts) iniciar();
    else {
      if (!sc) {
        sc = document.createElement("script");
        sc.src = config.script;
        sc.async = true;
        sc.dataset.hsAppmax = "1";
        document.body.appendChild(sc);
      }
      sc.addEventListener("load", iniciar);
    }
    return () => {
      vivo = false;
      sc?.removeEventListener("load", iniciar);
    };
  }, [config]);

  // Envia o formulário do cartão: o script da Appmax intercepta, tokeniza e devolve o token.
  function tokenizar(form: HTMLFormElement): Promise<string> {
    return new Promise<string>((ok, falha) => {
      const t = setTimeout(() => {
        espera.current = null;
        falha(new Error("tempo esgotado"));
      }, 30_000);
      espera.current = {
        ok: (x) => {
          clearTimeout(t);
          espera.current = null;
          ok(x);
        },
        falha: (x) => {
          clearTimeout(t);
          espera.current = null;
          falha(x);
        },
      };
      form.requestSubmit();
    });
  }

  return { pronto: pronto && typeof window !== "undefined" && !!window.AppmaxScripts, ip, tokenizar };
}
