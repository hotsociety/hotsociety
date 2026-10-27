"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import type { Modulo } from "../../../_lib/demo";
import { capaDoVideo, type AulaInfo } from "../../../_lib/video";

type Props = {
  modulos: Modulo[];
  feitas: ReadonlySet<string>;
  info: Map<string, AulaInfo> | null;
  salvas: ReadonlySet<string>;
  notas: ReadonlyMap<string, string>;
  slugAtual: string;
  aulaAtual: string;
  onEscolher: (slug: string, i: number) => void;
};

// Lista da trilha inteira: todos os módulos, sanfonados, com capa, duração e progresso.
export default function Trilha({ modulos, feitas, info, salvas, notas, slugAtual, aulaAtual, onEscolher }: Props) {
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set([slugAtual]));
  const [soSalvas, setSoSalvas] = useState(false);
  const atualRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setAbertos((a) => (a.has(slugAtual) ? a : new Set([...a, slugAtual])));
  }, [slugAtual]);

  useEffect(() => {
    atualRef.current?.scrollIntoView({ block: "nearest" });
  }, [aulaAtual]);

  const total = modulos.reduce((s, m) => s + m.aulas.length, 0);
  const feitasTotal = modulos.reduce((s, m) => s + m.aulas.filter((a) => feitas.has(a.id)).length, 0);
  const pct = total ? Math.round((feitasTotal / total) * 100) : 0;

  function alternar(slug: string) {
    setAbertos((a) => {
      const n = new Set(a);
      if (n.has(slug)) n.delete(slug);
      else n.add(slug);
      return n;
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">
            <b className="text-white font-semibold">{total}</b> vídeos na trilha · {feitasTotal} vistos
          </span>
          <span className="font-mono font-bold text-[#d9b566]">{pct}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full bg-[#c9a24e] transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <button type="button" onClick={() => setAbertos(new Set(modulos.map((m) => m.slug)))} className="px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500">
          Expandir tudo
        </button>
        <button type="button" onClick={() => setAbertos(new Set())} className="px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500">
          Recolher tudo
        </button>
        <button
          type="button"
          aria-pressed={soSalvas}
          onClick={() => setSoSalvas((v) => !v)}
          className={`ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-full border ${soSalvas ? "bg-[#c9a24e] border-[#c9a24e] text-black font-semibold" : "border-zinc-700 text-zinc-300 hover:text-white"}`}
        >
          <Icon name="bookmark" size={13} /> Salvas {salvas.size > 0 && `(${salvas.size})`}
        </button>
      </div>

      <div className="space-y-3 max-h-[calc(100dvh-280px)] min-h-[300px] overflow-y-auto pr-1 -mr-1 [scrollbar-width:thin] [scrollbar-color:#3f3f46_transparent]">
        {modulos.map((m) => {
          const travado = m.status === "bloqueado";
          const lista = m.aulas.map((a, i) => ({ a, i })).filter(({ a }) => !soSalvas || salvas.has(a.id));
          if (soSalvas && lista.length === 0) return null;
          const n = m.aulas.filter((a) => feitas.has(a.id)).length;
          const aberto = soSalvas || abertos.has(m.slug);
          return (
            <div key={m.slug} className={`rounded-2xl border ${m.slug === slugAtual ? "border-[#c9a24e]/30 bg-[#17171a]" : "border-[#2e2e33] bg-[#141416]"}`}>
              <button type="button" onClick={() => alternar(m.slug)} aria-expanded={aberto} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <span className="text-[10px] font-mono font-bold text-[#c9a24e] w-7 shrink-0">M{m.n}</span>
                <span className="flex-1 min-w-0 text-sm font-semibold text-white truncate">{m.t.split(" · ")[0]}</span>
                {travado ? (
                  <Icon name="lock" size={14} />
                ) : (
                  <span className={`text-[11px] font-mono ${n === m.aulas.length ? "text-emerald-400" : "text-zinc-500"}`}>
                    {n}/{m.aulas.length}
                  </span>
                )}
                <span className={`text-zinc-500 transition-transform ${aberto ? "rotate-180" : ""}`}>
                  <Icon name="chev" size={14} />
                </span>
              </button>
              {aberto && (
                <ol className="border-t border-[#232327]">
                  {lista.map(({ a, i }) => {
                    const ok = feitas.has(a.id);
                    const atual = a.id === aulaAtual;
                    const dados = info?.get(a.id);
                    const capa = capaDoVideo(dados?.video_url) ?? m.img;
                    return (
                      <li key={a.id}>
                        <button
                          ref={atual ? atualRef : undefined}
                          type="button"
                          disabled={travado}
                          aria-current={atual ? "true" : undefined}
                          onClick={() => onEscolher(m.slug, i)}
                          className={`group w-full flex gap-3 px-3 py-2.5 text-left transition-colors disabled:opacity-50 ${
                            atual ? "bg-[#c9a24e]/10 shadow-[inset_3px_0_0_#c9a24e]" : "hover:bg-white/[0.03]"
                          }`}
                        >
                          <span className="relative w-24 aspect-video shrink-0 overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={capa} alt="" loading="lazy" className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${ok && !atual ? "opacity-50" : ""}`} />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                              {ok ? (
                                <span className="w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center">
                                  <Icon name="check" size={13} />
                                </span>
                              ) : (
                                <span className="w-6 h-6 rounded-full bg-black/60 border border-white/40 text-white flex items-center justify-center">
                                  <Icon name="play" size={11} />
                                </span>
                              )}
                            </span>
                            {dados?.duracao && <span className="absolute right-1 bottom-1 rounded bg-black/75 px-1 text-[10px] font-mono text-white">{dados.duracao}</span>}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[11px] font-mono text-zinc-500">Aula {String(i + 1).padStart(2, "0")}</span>
                            <span className={`block text-[13px] leading-snug line-clamp-2 ${atual ? "text-white font-semibold" : ok ? "text-zinc-400" : "text-zinc-200"}`}>{a.t}</span>
                            <span className="mt-1 flex items-center gap-2 text-[11px]">
                              {atual && <span className="text-[#d9b566] font-semibold">Tocando agora</span>}
                              {salvas.has(a.id) && (
                                <span className="text-[#d9b566]" title="Salva">
                                  <Icon name="bookmark" size={11} />
                                </span>
                              )}
                              {notas.has(a.id) && (
                                <span className="text-zinc-400" title="Tem nota">
                                  <Icon name="note" size={11} />
                                </span>
                              )}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          );
        })}
        {soSalvas && salvas.size === 0 && <p className="text-sm text-zinc-500 px-1">Você ainda não salvou nenhuma aula. Use o botão Salvar embaixo do vídeo.</p>}
      </div>
    </div>
  );
}
