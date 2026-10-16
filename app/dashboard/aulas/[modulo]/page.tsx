"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, Suspense } from "react";
import Icon from "@/app/_components/membros/Icon";
import { useProgresso } from "@/app/_components/membros/Progresso";
import { toast } from "@/app/_components/membros/Toast";
import { proximaAula } from "@/app/_lib/progresso";

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
    <Suspense fallback={<div className="p-8 text-center text-zinc-400">A carregar módulo...</div>}>
      <ModuloContent />
    </Suspense>
  );
}

function Player({ slug }: { slug: string }) {
  const { modulos, feitas, concluirAula } = useProgresso();
  const m = modulos.find((x) => x.slug === slug)!;
  const [atual, setAtual] = useState(() => proximaAula(m, feitas));
  const aula = m.aulas[atual];
  const concluida = feitas.has(aula.id);
  const pct = Math.round((m.aulas.filter((a) => feitas.has(a.id)).length / m.aulas.length) * 100);

  async function concluir() {
    if (!concluida) {
      try {
        await concluirAula(aula.id);
        toast("+40 XP · aula concluída", true);
      } catch {
        toast("Não deu para salvar agora. Tente de novo.");
        return;
      }
    }
    if (atual < m.aulas.length - 1) setAtual(atual + 1);
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <Link href="/dashboard/aulas" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors">
        <Icon name="back" size={16} /> Voltar aos módulos
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group">
            <Image src={m.img} alt="" fill className="object-cover opacity-60 group-hover:opacity-80 transition-opacity" sizes="(max-width: 1024px) 100vw, 700px" />
            <button type="button" className="absolute z-10 w-16 h-16 rounded-full bg-[#c9a24e] text-black flex items-center justify-center shadow-lg hover:scale-105 transition-transform" aria-label={`Assistir ${aula.t}`}>
              <Icon name="play" size={30} />
            </button>
            <span className="absolute bottom-4 left-4 z-10 bg-black/70 backdrop-blur-md px-3 py-1 rounded-md text-xs font-mono text-zinc-200">
              Aula {String(atual + 1).padStart(2, "0")} · {aula.dur}
            </span>
          </div>

          <header className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-[#c9a24e] font-semibold">
              Mod {m.n} · {m.t}
            </p>
            <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight">
              {aula.t}
            </h1>
            <p className="text-zinc-400 text-sm md:text-base">{m.desc}</p>
          </header>

          <div className="flex flex-wrap gap-4 pt-2">
            <button type="button" className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#c9a24e] text-black font-semibold hover:bg-[#d9b566] transition-colors disabled:opacity-50" onClick={concluir} disabled={concluida && atual === m.aulas.length - 1}>
              <Icon name="check" size={18} /> {concluida ? "Aula concluída" : "Concluir aula"}
            </button>
            <Link href="/dashboard/cappuia" className="flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-medium hover:bg-zinc-800 transition-colors">
              <Icon name="spark" size={18} /> Perguntar à CappuIA
            </Link>
          </div>

          <p className="text-xs text-zinc-500 italic">
            O vídeo entra aqui. Coloque a URL de cada aula (Vimeo, Panda, YouTube não listado) no campo da aula quando a tabela de aulas existir no Supabase.
          </p>
        </div>

        <aside className="bg-[#141416] border border-[#2e2e33] rounded-2xl p-6 h-fit space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Aulas do módulo</h2>
            <span className="bg-[#c9a24e]/20 text-[#c9a24e] text-xs font-mono px-2.5 py-1 rounded-full font-bold">{pct}%</span>
          </div>
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div className="bg-[#c9a24e] h-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <ol className="space-y-2">
            {m.aulas.map((a, i) => {
              const ok = feitas.has(a.id);
              const isActive = i === atual;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      isActive ? "bg-zinc-800/80 border border-[#c9a24e]/40 text-white" : "hover:bg-zinc-900 text-zinc-400"
                    } ${ok ? "text-zinc-300" : ""}`}
                    aria-current={isActive}
                    onClick={() => setAtual(i)}
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono shrink-0 ${ok ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-300"}`}>
                      {ok ? <Icon name="check" size={14} /> : String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 text-sm font-medium truncate">
                      {a.t}
                    </span>
                    <span className="text-xs font-mono text-zinc-500">{a.dur}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </div>
  );
}