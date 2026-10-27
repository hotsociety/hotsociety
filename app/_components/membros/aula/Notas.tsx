"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import type { Modulo } from "../../../_lib/demo";

type Props = {
  modulos: Modulo[];
  aulaId: string;
  aulaTitulo: string;
  notas: ReadonlyMap<string, string>;
  onSalvar: (aulaId: string, texto: string) => Promise<boolean>;
  onAbrir: (slug: string, i: number) => void;
};

// Notas pessoais por aula. Salva sozinho enquanto o aluno digita.
export default function Notas({ modulos, aulaId, aulaTitulo, notas, onSalvar, onAbrir }: Props) {
  const [texto, setTexto] = useState(notas.get(aulaId) ?? "");
  const [estado, setEstado] = useState<"" | "salvando" | "salvo" | "erro">("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimo = useRef(notas.get(aulaId) ?? "");

  useEffect(() => {
    const t = notas.get(aulaId) ?? "";
    setTexto(t);
    ultimo.current = t;
    setEstado("");
    // Troca de aula: só recarrega o texto da nova aula.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aulaId]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function mudar(v: string) {
    setTexto(v);
    setEstado("");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (v.trim() === ultimo.current.trim()) return;
      setEstado("salvando");
      const ok = await onSalvar(aulaId, v);
      if (ok) ultimo.current = v;
      setEstado(ok ? "salvo" : "erro");
    }, 900);
  }

  const lugar = new Map<string, { slug: string; i: number; t: string; mod: string }>();
  for (const m of modulos) m.aulas.forEach((a, i) => lugar.set(a.id, { slug: m.slug, i, t: a.t, mod: m.n }));
  const outras = [...notas.entries()].filter(([id]) => id !== aulaId && lugar.has(id));

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs text-zinc-500">
          Nota desta aula · <span className="text-zinc-300">{aulaTitulo}</span>
        </p>
        <textarea
          value={texto}
          onChange={(e) => mudar(e.target.value)}
          maxLength={5000}
          rows={8}
          placeholder="Anote o que vai aplicar, prompts, links, ideias… Só você vê."
          className="w-full resize-y rounded-2xl bg-[#0f0f11] border border-[#2e2e33] focus:border-[#c9a24e]/60 outline-none px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500"
        />
        <p className="text-[11px] h-4 text-zinc-500" aria-live="polite">
          {estado === "salvando" ? "Salvando…" : estado === "salvo" ? "Salvo ✓" : estado === "erro" ? "Não deu para salvar. Continue digitando que tentamos de novo." : "Salva sozinho enquanto você digita."}
        </p>
      </div>

      {outras.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Suas outras notas</p>
          <ul className="space-y-2 max-h-[40dvh] overflow-y-auto pr-1">
            {outras.map(([id, t]) => {
              const l = lugar.get(id)!;
              return (
                <li key={id}>
                  <button type="button" onClick={() => onAbrir(l.slug, l.i)} className="w-full text-left rounded-xl border border-[#2e2e33] bg-[#141416] hover:border-zinc-600 p-3 transition-colors">
                    <span className="flex items-center gap-2 text-[11px] font-mono text-[#c9a24e]">
                      <Icon name="note" size={12} /> M{l.mod} · Aula {String(l.i + 1).padStart(2, "0")}
                    </span>
                    <span className="block mt-1 text-xs font-semibold text-white truncate">{l.t}</span>
                    <span className="block mt-1 text-xs text-zinc-400 line-clamp-2 whitespace-pre-wrap">{t}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
