"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import "../../home.css";
import s from "../../home.styles";

const LINKS = [
  { href: "#rota", label: "Rota" },
  { href: "#por-dentro", label: "Por dentro" },
  { href: "#modulos", label: "Módulos" },
  { href: "#cursos", label: "Cursos" },
  { href: "#planos", label: "Planos" },
  { href: "#faq", label: "Dúvidas" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onResize = () => window.innerWidth > 1024 && setOpen(false);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className={`${s.header} ${solid || open ? s.headerSolid : ""}`}>
      <div className={s.headerIn}>
        <Link href="/" className={s.brand} aria-label="HOT SOCIETY, início">
          <Image src="/brand/hs-logo.svg" alt="HOT SOCIETY" width={1253} height={170} preload />
        </Link>

        <nav className={s.nav} aria-label="Seções">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className={s.headerActions}>
          <Link href="/login" className={s.linkLogin}>
            Entrar
          </Link>
          <a href="#planos" className={`${s.btn} ${s.btnGold} ${s.btnSm} ${s.hideXs}`}>
            Emitir passaporte
          </a>
          <button
            type="button"
            className={s.burger}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            aria-controls="menu-mobile"
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <div id="menu-mobile" className={`${s.mobileMenu} ${open ? s.mobileMenuOpen : ""}`} hidden={!open}>
        <nav aria-label="Menu">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className={s.mobileMenuCtas}>
          <a href="#planos" className={`${s.btn} ${s.btnGold}`} onClick={() => setOpen(false)}>
            Emitir meu passaporte
          </a>
          <Link href="/login" className={`${s.btn} ${s.btnGhost}`} onClick={() => setOpen(false)}>
            Já sou membro · Entrar
          </Link>
        </div>
      </div>
    </header>
  );
}
