"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";
import Icon from "@/app/_components/membros/Icon";
import { useProgresso } from "@/app/_components/membros/Progresso";
import { toast } from "@/app/_components/membros/Toast";
import { useAulasInfo } from "@/app/_components/membros/useAulasInfo";
import { useMarcaDagua } from "@/app/_components/membros/useMarcaDagua";
import Discussao from "@/app/_components/membros/aula/Discussao";
import Notas from "@/app/_components/membros/aula/Notas";
import Trilha from "@/app/_components/membros/aula/Trilha";
import { IMG } from "@/app/_lib/demo";
import { proximaAula } from "@/app/_lib/progresso";
import { supabase } from "@/app/_lib/supabase";
import { comMarca, embedDoVideo, lerMaterial } from "@/app/_lib/video";

function ModuloContent() {
  const { modulo } = useParams<{ modulo: string }>();
  const { modulos } = useProgresso();
  const m = modulos.find((x) => x.slug === modulo);

  if (!m || m.status === "bloqueado") {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link href="/dashboard/aulas" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors">
          <Icon name="back" size={16} /> Voltar aos módulos
        </Link>
        <div className="bg-[#141416] border border-[#2e2e33] rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">{m ? "Módulo bloqueado" : "Módulo não encontrado"}</h1>
          <p className="text-zinc-400">{m?.trava ?? "Esse módulo não existe ou mudou de endereço."}</p>
        </div>
      </div>
    );
  }

  return <Player key={m.slug} slug={m.slug} />;
}

export default function ModuloPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-400">Carregando aula…</div>}>
      <ModuloContent />
    </Suspense>
  );
}

// Notas e aulas salvas do aluno (uma busca por visita à tela).
function useMeusExtras() {
  const [notas, setNotas] = useState<Map<string, string>>(new Map());
  const [salvas, setSalvas] = useState<Set<string>>(new Set());
  useEffect(() => {
    let vivo = true;
    (async () => {
      const [n, s] = await Promise.all([supabase.rpc("minhas_notas"), supabase.rpc("minhas_salvas")]);
      if (!vivo) return;
      if (!n.error) setNotas(new Map(((n.data ?? []) as { aula_id: string; texto: string }[]).map((x) => [x.aula_id, x.texto])));
      if (!s.error) setSalvas(new Set((s.data ?? []) as string[]));
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const salvarNota = useCallback(async (aulaId: string, texto: string) => {
    const { error } = await supabase.rpc("salvar_nota", { p_aula: aulaId, p_texto: texto });
    if (error) return false;
    setNotas((n) => {
      const novo = new Map(n);
      if (texto.trim()) novo.set(aulaId, texto.trim());
      else novo.delete(aulaId);
      return novo;
    });
    return true;
  }, []);

  const alternarSalva = useCallback(async (aulaId: string) => {
    const { data, error } = await supabase.rpc("alternar_salva", { p_aula: aulaId });
    if (error) {
      toast("Não deu para salvar agora.");
      return;
    }
    setSalvas((s) => {
      const novo = new Set(s);
      if (data) novo.add(aulaId);
      else novo.delete(aulaId);
      return novo;
    });
    toast(data ? "Aula salva. Ache em Salvas, na lista ao lado." : "Aula tirada das salvas.");
  }, []);

  return { notas, salvas, salvarNota, alternarSalva };
}

function Player({ slug }: { slug: string }) {
  const router = useRouter();
  const busca = useSearchParams();
  const { modulos, feitas, concluirAula } = useProgresso();
  const info = useAulasInfo();
  const marca = useMarcaDagua();
  const { notas, salvas, salvarNota, alternarSalva } = useMeusExtras();
  const m = modulos.find((x) => x.slug === slug)!;
  const idx = modulos.indexOf(m);

  const [atual, setAtual] = useState(() => {
    const pedida = Number(busca.get("aula"));
    return Number.isInteger(pedida) && pedida >= 1 && pedida <= m.aulas.length ? pedida - 1 : proximaAula(m, feitas);
  });
  const [aba, setAba] = useState<"aulas" | "notas">("aulas");
  const [salvando, setSalvando] = useState(false);

  const aula = m.aulas[atual];
  const concluida = feitas.has(aula.id);
  const extra = info?.get(aula.id);
  // Espera o passe da marca d'água antes de abrir o player (senão o vídeo carregaria duas vezes).
  const video = marca === undefined ? null : comMarca(embedDoVideo(extra?.video_url), marca);
  const material = lerMaterial(extra?.material);
  const pctModulo = Math.round((m.aulas.filter((a) => feitas.has(a.id)).length / m.aulas.length) * 100);

  // Próxima: segue no módulo; no fim, abre o próximo módulo liberado.
  const proxMod = modulos.slice(idx + 1).find((x) => x.status !== "bloqueado");
  const temProxima = atual < m.aulas.length - 1 || !!proxMod;
  const antMod = [...modulos.slice(0, idx)].reverse().find((x) => x.status !== "bloqueado");
  const temAnterior = atual > 0 || !!antMod;

  const ir = useCallback(
    (destino: string, i: number) => {
      if (destino === slug) {
        setAtual(i);
        window.history.replaceState(null, "", `/dashboard/aulas/${slug}?aula=${i + 1}`);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        router.push(`/dashboard/aulas/${destino}?aula=${i + 1}`);
      }
    },
    [router, slug],
  );

  function proxima() {
    if (atual < m.aulas.length - 1) ir(slug, atual + 1);
    else if (proxMod) ir(proxMod.slug, 0);
  }
  function anterior() {
    if (atual > 0) ir(slug, atual - 1);
    else if (antMod) ir(antMod.slug, antMod.aulas.length - 1);
  }

  async function concluir() {
    if (concluida) return proxima();
    setSalvando(true);
    try {
      await concluirAula(aula.id);
      toast("+40 XP · aula concluída", true);
      proxima();
    } catch {
      toast("Não deu para salvar agora. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  const salva = salvas.has(aula.id);

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto">
      <Link href="/dashboard/aulas" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-5 transition-colors">
        <Icon name="back" size={16} /> Voltar aos módulos
      </Link>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-8">
        <div className="space-y-6 min-w-0">
          <header className="space-y-3">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500 font-semibold">
              Hot Academy · Módulo {m.n}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{m.t}</h1>
            <div className="rounded-2xl border border-[#2e2e33] bg-gradient-to-r from-[#c9a24e]/[0.08] to-transparent px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#c9a24e]">Aula atual</p>
              <p className="mt-1 text-lg md:text-xl font-bold text-white leading-snug">
                Aula {String(atual + 1).padStart(2, "0")} · {aula.t}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                {atual + 1} de {m.aulas.length} no módulo{extra?.duracao && ` · ${extra.duracao}`}
                {concluida && <span className="ml-2 text-emerald-400 font-semibold">· Concluída</span>}
              </p>
            </div>
          </header>

          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-zinc-800 flex items-center justify-center">
            {video ? (
              <iframe
                key={aula.id}
                src={video}
                title={aula.t}
                className="absolute inset-0 w-full h-full bg-black border-0"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <>
                <Image src={m.img} alt="" fill className="object-cover opacity-40" sizes="(max-width: 1280px) 100vw, 900px" />
                <span className="relative z-10 bg-black/70 backdrop-blur-md px-4 py-2 rounded-lg text-sm text-zinc-200">
                  {info === null || (marca === undefined && embedDoVideo(extra?.video_url)) ? "Carregando vídeo…" : "Vídeo desta aula em breve"}
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => alternarSalva(aula.id)}
              aria-pressed={salva}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                salva ? "border-[#c9a24e]/60 bg-[#c9a24e]/10 text-[#d9b566]" : "border-zinc-700 text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Icon name="bookmark" size={16} /> {salva ? "Salva" : "Salvar"}
            </button>
            <button
              type="button"
              onClick={concluir}
              disabled={salvando || (concluida && !temProxima)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                concluida ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/20" : "bg-[#c9a24e] text-black hover:bg-[#d9b566]"
              }`}
            >
              <Icon name="check" size={16} /> {salvando ? "Salvando…" : concluida ? "Concluída" : "Marcar como concluída"}
            </button>
            <div className="flex gap-2.5 sm:ml-auto">
              <button
                type="button"
                onClick={anterior}
                disabled={!temAnterior}
                aria-label="Aula anterior"
                className="inline-flex items-center gap-1 px-3.5 py-2.5 rounded-xl border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-900 disabled:opacity-30"
              >
                <Icon name="back" size={16} />
              </button>
              <button
                type="button"
                onClick={proxima}
                disabled={!temProxima}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#c9a24e]/50 text-sm font-semibold text-[#d9b566] hover:bg-[#c9a24e]/10 disabled:opacity-30"
              >
                {atual === m.aulas.length - 1 && proxMod ? "Próximo módulo" : "Próxima aula"} <Icon name="next" size={16} />
              </button>
            </div>
          </div>

          {pctModulo === 100 && (
            <Link
              href={`/dashboard/certificado/${m.slug}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[#c9a24e]/40 bg-[#c9a24e]/[0.06] px-5 py-4 hover:bg-[#c9a24e]/10 transition-colors"
            >
              <span className="flex items-center gap-3 text-sm text-white">
                <Icon name="medal" size={20} /> Módulo concluído. Seu certificado está pronto.
              </span>
              <span className="text-sm font-semibold text-[#d9b566]">Emitir</span>
            </Link>
          )}

          <section className="flex items-center gap-4 rounded-2xl border border-[#2e2e33] bg-[#141416] p-4" aria-label="Professor">
            <span className="relative w-14 h-14 shrink-0 overflow-hidden rounded-full border-2 border-[#c9a24e]/60">
              <Image src={IMG.cappu} alt="" fill sizes="56px" className="object-cover" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#c9a24e]">Professor da aula</p>
              <p className="text-base font-bold text-white">Cappu</p>
              <p className="text-xs text-zinc-400 truncate">Fundador da Hot Academy · {m.desc}</p>
            </div>
            <Link href="/dashboard/cappuia" className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-700 text-sm text-white hover:bg-zinc-900">
              <Icon name="spark" size={16} /> Dúvida? CappuIA
            </Link>
          </section>

          {material.length > 0 && (
            <section className="rounded-2xl border border-[#2e2e33] bg-[#141416] p-5 space-y-3" aria-label="Materiais complementares">
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">Materiais complementares</h2>
                <p className="text-xs text-zinc-500 mt-1">PDFs, links e arquivos desta aula.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {material.map((x, k) =>
                  x.tipo === "link" ? (
                    <a
                      key={k}
                      href={x.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="flex items-center gap-3 rounded-xl border border-[#2e2e33] bg-[#0f0f11] px-3.5 py-3 hover:border-[#c9a24e]/50 transition-colors"
                    >
                      <span className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-[#d9b566] shrink-0">
                        <Icon name="link" size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-white truncate">{x.nome}</span>
                        <span className="block text-[11px] text-zinc-500 truncate">{new URL(x.url).hostname.replace(/^www\./, "")}</span>
                      </span>
                    </a>
                  ) : (
                    <p key={k} className="sm:col-span-2 text-sm text-zinc-300 leading-relaxed break-words">
                      {x.t}
                    </p>
                  ),
                )}
              </div>
            </section>
          )}

          <Discussao aulaId={aula.id} />
        </div>

        <aside className="xl:sticky xl:top-6 h-fit rounded-2xl border border-[#2e2e33] bg-[#111113] p-4 space-y-4">
          <div className="flex border-b border-[#2e2e33]" role="tablist">
            {(
              [
                ["aulas", "Aulas"],
                ["notas", "Minhas notas"],
              ] as const
            ).map(([k, t]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={aba === k}
                onClick={() => setAba(k)}
                className={`px-4 pb-3 -mb-px text-sm font-semibold border-b-2 transition-colors ${aba === k ? "border-[#c9a24e] text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
              >
                {t}
                {k === "notas" && notas.size > 0 && <span className="ml-1.5 text-[11px] text-zinc-500">{notas.size}</span>}
              </button>
            ))}
          </div>
          {aba === "aulas" ? (
            <Trilha modulos={modulos} feitas={feitas} info={info} salvas={salvas} notas={notas} slugAtual={slug} aulaAtual={aula.id} onEscolher={ir} />
          ) : (
            <Notas
              modulos={modulos}
              aulaId={aula.id}
              aulaTitulo={aula.t}
              notas={notas}
              onSalvar={salvarNota}
              onAbrir={(s, i) => {
                ir(s, i);
                setAba("notas");
              }}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
