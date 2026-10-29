"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "../Icon";
import { toast } from "../Toast";
import { supabase } from "../../../_lib/supabase";
import { InsigniasNome } from "../insignias/Insignia";

type Comentario = {
  id: number;
  pai: number | null;
  autor: string;
  avatar: string | null;
  eu: boolean;
  equipe: boolean;
  texto: string;
  criado_em: string;
  votos: number;
  votei: boolean;
  insignias?: string[] | null;
};

function quando(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "há 1 dia" : `há ${d} dias`;
}

function Avatar({ c }: { c: Comentario }) {
  const ini = c.autor
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  if (c.avatar && c.avatar.startsWith("https://")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={c.avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 border border-zinc-700" />;
  }
  return (
    <span
      className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold border ${
        c.equipe ? "bg-[#c9a24e]/15 text-[#d9b566] border-[#c9a24e]/40" : "bg-zinc-800 text-zinc-300 border-zinc-700"
      }`}
    >
      {ini || "?"}
    </span>
  );
}

function Caixa({ onEnviar, placeholder, autoFocus, onCancelar }: { onEnviar: (t: string) => Promise<boolean>; placeholder: string; autoFocus?: boolean; onCancelar?: () => void }) {
  const [t, setT] = useState("");
  const [indo, setIndo] = useState(false);
  async function enviar() {
    if (!t.trim() || indo) return;
    setIndo(true);
    const ok = await onEnviar(t);
    setIndo(false);
    if (ok) setT("");
  }
  return (
    <div className="space-y-2">
      <textarea
        value={t}
        onChange={(e) => setT(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) enviar();
        }}
        maxLength={2000}
        rows={onCancelar ? 2 : 3}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="w-full resize-y rounded-2xl bg-[#0f0f11] border border-[#2e2e33] focus:border-[#c9a24e]/60 outline-none px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-zinc-500">{t.length > 1800 ? `${2000 - t.length} caracteres` : "Ctrl + Enter envia"}</span>
        <div className="flex gap-2">
          {onCancelar && (
            <button type="button" onClick={onCancelar} className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white">
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={enviar}
            disabled={!t.trim() || indo}
            className="px-5 py-2 rounded-xl bg-[#c9a24e] text-black text-sm font-semibold hover:bg-[#d9b566] disabled:opacity-40 transition-colors"
          >
            {indo ? "Enviando…" : onCancelar ? "Responder" : "Comentar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Discussao({ aulaId }: { aulaId: string }) {
  const [lista, setLista] = useState<Comentario[] | null>(null);
  const [respondendo, setRespondendo] = useState<number | null>(null);
  const [ordem, setOrdem] = useState<"novos" | "top">("novos");

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc("aula_comentarios_lista", { p_aula: aulaId });
    if (error) return setLista([]);
    setLista((data ?? []) as Comentario[]);
  }, [aulaId]);

  useEffect(() => {
    setLista(null);
    setRespondendo(null);
    carregar();
  }, [carregar]);

  const { raizes, filhos } = useMemo(() => {
    const todos = lista ?? [];
    const f = new Map<number, Comentario[]>();
    for (const c of todos) if (c.pai) f.set(c.pai, [...(f.get(c.pai) ?? []), c]);
    for (const v of f.values()) v.sort((a, b) => a.criado_em.localeCompare(b.criado_em));
    const r = todos.filter((c) => !c.pai);
    if (ordem === "top") r.sort((a, b) => b.votos - a.votos || b.criado_em.localeCompare(a.criado_em));
    return { raizes: r, filhos: f };
  }, [lista, ordem]);

  async function comentar(texto: string, pai: number | null) {
    const { error } = await supabase.rpc("aula_comentar", { p_aula: aulaId, p_texto: texto, p_pai: pai });
    if (error) {
      toast(error.message.includes("devagar") || error.message.includes("limite") ? "Calma: muitos comentários seguidos." : "Não deu para comentar agora.");
      return false;
    }
    setRespondendo(null);
    await carregar();
    return true;
  }

  async function votar(c: Comentario) {
    setLista((l) => l?.map((x) => (x.id === c.id ? { ...x, votei: !x.votei, votos: x.votos + (x.votei ? -1 : 1) } : x)) ?? l);
    const { data, error } = await supabase.rpc("aula_votar", { p_id: c.id });
    if (error) return carregar();
    setLista((l) => l?.map((x) => (x.id === c.id ? { ...x, votos: data as number } : x)) ?? l);
  }

  async function apagar(c: Comentario) {
    const { error } = await supabase.rpc("aula_apagar_comentario", { p_id: c.id });
    if (error) return toast("Não deu para apagar agora.");
    setLista((l) => l?.filter((x) => x.id !== c.id && x.pai !== c.id) ?? l);
  }

  // Função (não componente) para a caixa de resposta não remontar a cada voto.
  function item(c: Comentario, resposta = false) {
    const subs = filhos.get(c.id) ?? [];
    return (
      <li key={c.id} className={resposta ? "pt-4" : "py-5 border-b border-[#232327] last:border-0"}>
        <div className="flex gap-3">
          <Avatar c={c} />
          <div className="flex-1 min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="font-semibold text-white">{c.autor}</span>
              <InsigniasNome ids={c.insignias} />
              {c.equipe && <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#c9a24e]/15 text-[#d9b566]">Equipe</span>}
              {c.eu && <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">Você</span>}
              <span className="text-xs text-zinc-500">{quando(c.criado_em)}</span>
            </p>
            <p className="mt-1 text-sm text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">{c.texto}</p>
            <div className="mt-2 flex items-center gap-4 text-xs">
              <button
                type="button"
                onClick={() => votar(c)}
                aria-pressed={c.votei}
                className={`inline-flex items-center gap-1 transition-colors ${c.votei ? "text-[#d9b566]" : "text-zinc-500 hover:text-white"}`}
              >
                <Icon name="up" size={14} /> {c.votos}
              </button>
              {!resposta && (
                <button type="button" onClick={() => setRespondendo(respondendo === c.id ? null : c.id)} className="inline-flex items-center gap-1 text-zinc-500 hover:text-white">
                  <Icon name="reply" size={14} /> Responder
                </button>
              )}
              {c.eu && (
                <button type="button" onClick={() => apagar(c)} className="inline-flex items-center gap-1 text-zinc-500 hover:text-red-400">
                  <Icon name="trash" size={14} /> Apagar
                </button>
              )}
            </div>
            {respondendo === c.id && (
              <div className="mt-3">
                <Caixa autoFocus placeholder={`Responder ${c.autor}…`} onEnviar={(t) => comentar(t, c.id)} onCancelar={() => setRespondendo(null)} />
              </div>
            )}
            {subs.length > 0 && (
              <ul className="mt-1 pl-4 border-l border-[#2e2e33]">
                {subs.map((s) => item(s, true))}
              </ul>
            )}
          </div>
        </div>
      </li>
    );
  }

  const total = lista?.length ?? 0;
  return (
    <section aria-label="Discussão da aula" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-white">
          <Icon name="chat" size={18} /> Discussão da aula
          <span className="text-sm font-normal text-zinc-500">
            · {lista === null ? "…" : `${total} ${total === 1 ? "comentário" : "comentários"}`}
          </span>
        </h2>
        {raizes.length > 1 && (
          <div className="flex rounded-lg bg-zinc-900 border border-zinc-800 p-0.5 text-xs">
            {(["novos", "top"] as const).map((o) => (
              <button key={o} type="button" aria-pressed={ordem === o} onClick={() => setOrdem(o)} className={`px-2.5 py-1 rounded-md ${ordem === o ? "bg-zinc-700 text-white" : "text-zinc-400"}`}>
                {o === "novos" ? "Recentes" : "Mais votados"}
              </button>
            ))}
          </div>
        )}
      </div>
      <Caixa placeholder="Escreva um comentário, uma dúvida ou o seu resultado com esta aula…" onEnviar={(t) => comentar(t, null)} />
      {lista === null ? (
        <p className="text-sm text-zinc-500">Carregando comentários…</p>
      ) : raizes.length === 0 ? (
        <p className="text-sm text-zinc-500 py-4">Ninguém comentou ainda. Seja o primeiro a puxar a conversa.</p>
      ) : (
        <ul>
          {raizes.map((c) => item(c))}
        </ul>
      )}
    </section>
  );
}
