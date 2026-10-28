"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMembro } from "../../_components/membros/MemberContext";
import { supabase } from "../../_lib/supabase";
import "../../_components/membros/ui.css";
import ui from "../../_components/membros/ui.styles";

type Comp = { id: string; plataforma: string; periodo: string; valor_declarado: number | string; status: string; valor_aprovado: number | string | null; resposta: string | null; criado_em: string };

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DATA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
const TIPOS = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const MAX = 10 * 1024 * 1024;
const STATUS: Record<string, string> = { pendente: "Em análise", aprovado: "Aprovado", recusado: "Recusado" };

// "1.234,56" ou "1234.56" → 1234.56
function paraNumero(t: string) {
  const s = t.replace(/[^\d,.]/g, "");
  const n = s.includes(",") ? Number(s.replace(/\./g, "").replace(",", ".")) : Number(s);
  return Number.isFinite(n) ? n : NaN;
}

// Envio de comprovantes de faturamento. A equipe confere e soma ao faturamento verificado.
export default function Comprovantes() {
  const { user } = useMembro();
  const [lista, setLista] = useState<Comp[] | null>(null);
  const [plataforma, setPlataforma] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    const { data } = await supabase.rpc("meus_comprovantes");
    setLista((data ?? []) as Comp[]);
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);

  function escolher(fs: FileList | null) {
    setErro("");
    const novos = Array.from(fs ?? []);
    if (novos.some((f) => !TIPOS.includes(f.type))) return setErro("Envie PDF, PNG, JPG ou WEBP.");
    if (novos.some((f) => f.size > MAX)) return setErro("Cada arquivo pode ter até 10 MB.");
    setArquivos((a) => [...a, ...novos].slice(0, 5));
    if (input.current) input.current.value = "";
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const n = paraNumero(valor);
    if (!(n > 0)) return setErro("Digite o valor faturado no período.");
    if (arquivos.length === 0) return setErro("Anexe pelo menos um comprovante.");
    setEnviando(true);
    const caminhos: string[] = [];
    for (const f of arquivos) {
      const ext = f.type === "application/pdf" ? "pdf" : f.type.split("/")[1].replace("jpeg", "jpg");
      const caminho = `${user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error } = await supabase.storage.from("comprovantes").upload(caminho, f, { contentType: f.type, upsert: false });
      if (error) {
        setEnviando(false);
        return setErro("Não deu para enviar o arquivo " + f.name + ". Tente de novo.");
      }
      caminhos.push(caminho);
    }
    const { error } = await supabase.rpc("enviar_comprovante", { p: { plataforma, periodo, valor: n, obs, arquivos: caminhos } });
    setEnviando(false);
    if (error) return setErro(/limite/.test(error.message) ? "Você já tem 3 envios em análise. Aguarde a resposta." : "Não deu para registrar o envio. Tente de novo.");
    setOk(true);
    setPlataforma("");
    setPeriodo("");
    setValor("");
    setObs("");
    setArquivos([]);
    carregar();
  }

  return (
    <section className={ui.card} id="comprovantes" aria-labelledby="comp-h">
      <h2 id="comp-h" className={ui.h2}>
        Comprovar faturamento
      </h2>
      <p className={ui.muted}>
        Envie o extrato ou o relatório da plataforma onde você vende (Privacy, OnlyFans, Fansly, gateway…). A equipe confere em até 5 dias e soma o valor ao seu faturamento
        verificado. Pode cobrir o valor de nomes e CPFs de clientes.
      </p>

      {lista && lista.length > 0 && (
        <ul className={ui.list}>
          {lista.map((c) => (
            <li key={c.id} className={ui.row}>
              <span className={ui.rowMain}>
                <b>
                  {c.plataforma} · {c.periodo}
                </b>
                <small>
                  Enviado em {DATA.format(new Date(c.criado_em))} · declarado {BRL.format(Number(c.valor_declarado))}
                  {c.status === "aprovado" && c.valor_aprovado !== null && ` · aprovado ${BRL.format(Number(c.valor_aprovado))}`}
                  {c.resposta && ` · ${c.resposta}`}
                </small>
              </span>
              <span className={`${ui.badge} ${c.status === "aprovado" ? ui.badgeOk : c.status === "recusado" ? ui.badgeRed : ui.badgeGold}`}>{STATUS[c.status]}</span>
            </li>
          ))}
        </ul>
      )}

      {ok ? (
        <div style={{ display: "grid", gap: 12 }}>
          <p className={ui.okBox} role="status">
            Comprovantes enviados. A resposta aparece aqui.
          </p>
          <button type="button" className={ui.btnGhost} onClick={() => setOk(false)}>
            Enviar outro período
          </button>
        </div>
      ) : (
        <form onSubmit={enviar} style={{ display: "grid", gap: 14 }}>
          <div className={ui.grid2}>
            <label className={ui.field}>
              <span>Plataforma</span>
              <input className={ui.input} required minLength={2} maxLength={60} value={plataforma} onChange={(e) => setPlataforma(e.target.value)} placeholder="Ex.: Privacy" />
            </label>
            <label className={ui.field}>
              <span>Período</span>
              <input className={ui.input} required minLength={3} maxLength={60} value={periodo} onChange={(e) => setPeriodo(e.target.value)} placeholder="Ex.: setembro/2026" />
            </label>
            <label className={ui.field}>
              <span>Valor faturado no período (R$)</span>
              <input className={ui.input} required inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ex.: 4.350,00" />
            </label>
            <label className={ui.field}>
              <span>Observação (opcional)</span>
              <input className={ui.input} maxLength={500} value={obs} onChange={(e) => setObs(e.target.value)} />
            </label>
          </div>
          <div className={ui.field}>
            <span>Arquivos (até 5, PDF ou imagem, 10 MB cada)</span>
            <input ref={input} type="file" accept=".pdf,image/png,image/jpeg,image/webp" multiple onChange={(e) => escolher(e.target.files)} className={ui.input} style={{ paddingTop: 10 }} />
            {arquivos.length > 0 && (
              <ul className={ui.small} style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {arquivos.map((f, i) => (
                  <li key={i}>
                    {f.name}{" "}
                    <button type="button" onClick={() => setArquivos((a) => a.filter((_, j) => j !== i))} style={{ background: "none", border: 0, color: "var(--gold-t)", cursor: "pointer", textDecoration: "underline" }}>
                      remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {erro && (
            <p className={ui.muted} role="alert" style={{ color: "var(--erro-t)", margin: 0 }}>
              {erro}
            </p>
          )}
          <button type="submit" className={ui.btnGold} disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar para conferência"}
          </button>
        </form>
      )}
    </section>
  );
}
