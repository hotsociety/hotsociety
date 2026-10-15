"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { m } from "./proto";

type Item = { id: number; t: string; xp: boolean };

/** Mostra um aviso rápido na base da tela. xp = true usa o fundo dourado. */
export function toast(t: string, xp = false) {
  window.dispatchEvent(new CustomEvent("hs-toast", { detail: { t, xp } }));
}

/** Fica montado uma vez no MemberShell. */
export default function Toaster() {
  const [item, setItem] = useState<Item | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ t: string; xp: boolean }>).detail;
      setItem({ id: Date.now(), t: d.t, xp: d.xp });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setItem(null), 2000);
    };
    window.addEventListener("hs-toast", on);
    return () => {
      window.removeEventListener("hs-toast", on);
      clearTimeout(timer.current);
    };
  }, []);

  if (!item) return null;
  return (
    <div key={item.id} role="status" className={m("hs-toast" + (item.xp ? " xp" : ""))}>
      {item.t}
    </div>
  );
}

/** Janela sobreposta (comentários, nova publicação). Fecha no Esc, no × ou clicando fora. */
export function Modal({
  title,
  onClose,
  children,
  foot,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  foot?: ReactNode;
}) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const kd = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    document.addEventListener("keydown", kd);
    return () => document.removeEventListener("keydown", kd);
  }, []);

  return (
    <div
      className={m("mx")}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={m("pn")}>
        <div className={m("hd")}>
          <b>{title}</b>
          <button type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <div className={m("bd")}>{children}</div>
        {foot && <div className={m("ft")}>{foot}</div>}
      </div>
    </div>
  );
}
