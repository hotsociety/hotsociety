"use client";

import Image from "next/image";
import { useId, useState, useSyncExternalStore } from "react";
import s from "../../page.module.css";

const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function clean(v: string) {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z ]/g, "")
    .replace(/\s+/g, " ")
    .trimStart()
    .slice(0, 22);
}

const noop = () => () => {};

function todayLabel() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

function savedName() {
  try {
    return localStorage.getItem("hs-nome") ?? "";
  } catch {
    return "";
  }
}

export default function PassportPreview() {
  const id = useId();
  const [typed, setTyped] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  // Lidos só no navegador, sem efeito colateral: no servidor ficam vazios.
  const date = useSyncExternalStore(noop, todayLabel, () => "");
  const stored = useSyncExternalStore(noop, savedName, () => "");
  const name = typed ?? stored;

  const shown = clean(name).trim() || "SEU NOME";

  function onChange(v: string) {
    setTyped(v);
    try {
      localStorage.setItem("hs-nome", v);
    } catch {}
  }

  return (
    <div className={s.passWrap}>
      <div className={`${s.pass} ${open ? s.passOpen : ""}`}>
        <div className={s.passPage} aria-hidden={!open}>
          <div className={s.passHd}>
            <span>HOT SOCIETY</span>
            <span>PASSAPORTE · P</span>
          </div>
          <div className={s.passWho}>
            <div className={s.passPhoto} aria-hidden="true">
              <svg viewBox="0 0 100 120">
                <circle cx="50" cy="44" r="24" fill="#141416" />
                <rect x="27" y="36" width="46" height="14" rx="7" fill="#EDEAE2" />
                <rect x="27" y="42" width="46" height="3" fill="#C9A24E" />
                <path d="M6 120c4-32 22-46 44-46s40 14 44 46Z" fill="#141416" />
              </svg>
            </div>
            <dl>
              <dt>Titular</dt>
              <dd>{shown}</dd>
              <dt>Destino atual</dt>
              <dd>BRASIL · GRU</dd>
              <dt>Emissão</dt>
              <dd suppressHydrationWarning>{date || "—"}</dd>
            </dl>
          </div>
          <div className={s.passStamp}>
            <span>BRASIL</span>
            <small>EMBARQUE</small>
          </div>
          <div className={s.passMrz}>P&lt;HSY&lt;{shown.replace(/ /g, "<")}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
        </div>
        <div className={s.passCover}>
          <span className={s.passCoverTop}>HOT SOCIETY</span>
          <Image src="/brand/hs-simbolo.svg" alt="" width={200} height={200} className={s.passEmblem} />
          <span className={s.passCoverTitle}>PASSAPORTE</span>
          <span className={s.passCoverName}>{shown}</span>
        </div>
      </div>

      <form
        className={s.passForm}
        onSubmit={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        <label htmlFor={id}>Escreva seu nome no passaporte</label>
        <div className={s.passRow}>
          <input
            id={id}
            value={name}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Seu nome"
            autoComplete="given-name"
            maxLength={24}
          />
          <button type="submit" className={`${s.btn} ${s.btnGold}`}>
            {open ? "Aberto ✓" : "Abrir"}
          </button>
        </div>
        {open && (
          <a href="#planos" className={s.passNext}>
            Passaporte carimbado. Agora é só ativar ›
          </a>
        )}
      </form>
    </div>
  );
}
