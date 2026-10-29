"use client";

// Página Ranking: pódio do top 3, lista até o 20º, sua posição e quanto falta para subir.
// Dados: função ranking_completo do banco (XP da temporada; equipe fica fora).
import { useEffect, useState } from "react";
import { ROUTE } from "../../../_lib/site";
import { nivelDe, diasParaFimDoMes } from "../../../_lib/progresso";
import { supabase } from "../../../_lib/supabase";
import { Insignia, InsigniasNome } from "../insignias/Insignia";
import "./ranking.css";

type Linha = { pos: number; nome: string; avatar: string | null; escala: number; xp: number; eu: boolean; insignias: string[] | null; total: number };

const NUM = new Intl.NumberFormat("pt-BR");
const BANDEIRA = ["br", "cl", "pt", "ae", "us", "mc"];
const MES = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "America/Sao_Paulo" });

function iniciais(n: string) {
  const p = n.replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/);
  return ((p[0]?.[0] ?? "?") + (p[1]?.[0] ?? p[0]?.[1] ?? "")).toUpperCase();
}
function cor(n: string) {
  let h = 0;
  for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 38% 34%)`;
}

function Avatar({ l, grande }: { l: Linha; grande?: boolean }) {
  const cls = "hs-rk-av" + (grande ? " g" : "");
  if (l.avatar)
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={cls} src={l.avatar} alt="" loading="lazy" />;
  return (
    <span className={cls} style={{ background: cor(l.nome) }} aria-hidden>
      {iniciais(l.nome)}
    </span>
  );
}

function Rota({ escala }: { escala: number }) {
  const r = ROUTE[escala] ?? ROUTE[0];
  return (
    <span className="hs-rk-rota" title={`Rota: ${r.country}`}>
      <Insignia id={BANDEIRA[escala] ?? "br"} tamanho={12} titulo={r.country} />
      {r.code}
    </span>
  );
}

// Coroa em pixel art para o 1º lugar.
function Coroa() {
  const px = ["k.k.k.k", "kokokok", "koooook", "kotoook", "kkkkkkk"];
  const c: Record<string, string> = { k: "#17140f", o: "#e0b84a", t: "#c63a31" };
  return (
    <svg className="hs-rk-coroa" viewBox="0 0 7 5" width={42} height={30} shapeRendering="crispEdges" aria-hidden>
      {px.flatMap((l, y) => [...l].map((ch, x) => (ch === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={c[ch]} />)))}
    </svg>
  );
}

export default function RankingTemporada() {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [fim, setFim] = useState("");
  const [mes, setMes] = useState("");
  const [tudo, setTudo] = useState(false);

  useEffect(() => {
    let vivo = true;
    setFim(diasParaFimDoMes(new Date()));
    setMes(MES.format(new Date()));
    supabase.rpc("ranking_completo").then(({ data, error }) => {
      if (vivo) setLinhas(error ? [] : ((data ?? []) as Linha[]));
    });
    return () => {
      vivo = false;
    };
  }, []);

  const cab = (
    <header className="hs-rk-cab">
      <div>
        <p className="hs-rk-eyebrow">Temporada de {mes || "…"}</p>
        <h2 className="hs-rk-tit">Ranking da temporada</h2>
      </div>
      <div className="hs-rk-chips">
        {linhas?.[0]?.total ? <span className="hs-rk-chip">{NUM.format(linhas[0].total)} passageiros</span> : null}
        {fim && <span className="hs-rk-chip ouro">Fecha {fim === "hoje" ? "hoje" : `em ${fim}`}</span>}
      </div>
    </header>
  );

  if (linhas === null)
    return (
      <section className="hs-rk" aria-busy>
        {cab}
        <div className="hs-rk-esq" />
      </section>
    );
  if (linhas.length === 0)
    return (
      <section className="hs-rk">
        {cab}
        <p className="hs-rk-vazio">O ranking aparece assim que os primeiros alunos ganharem XP.</p>
      </section>
    );

  const lider = Math.max(1, linhas[0]?.xp ?? 1);
  const eu = linhas.find((l) => l.eu) ?? null;
  const acima = eu ? linhas.find((l) => l.pos === eu.pos - 1) ?? null : null;
  const top = linhas.filter((l) => l.pos <= 3);
  const resto = linhas.filter((l) => l.pos > 3 && (l.pos <= (tudo ? 20 : 10) || (l.eu && l.pos <= 20)));
  const temMais = linhas.some((l) => l.pos > 10 && l.pos <= 20);
  const fora = linhas.filter((l) => l.pos > 20);
  const podio = [top[1], top[0], top[2]].filter(Boolean) as Linha[];

  return (
    <section className="hs-rk" aria-labelledby="hs-rk-tit">
      {cab}

      {eu ? (
        <div className="hs-rk-eu">
          <div className="hs-rk-eu-pos">
            <small>Sua posição</small>
            <b>#{eu.pos}</b>
          </div>
          <div className="hs-rk-eu-info">
            <p>
              {eu.pos === 1 ? (
                <>Você lidera a temporada. Segura o topo até o fechamento.</>
              ) : acima ? (
                <>
                  Faltam <b>{NUM.format(Math.max(1, acima.xp - eu.xp + 1))} XP</b> para passar {acima.nome} (#{acima.pos}).
                </>
              ) : null}
            </p>
            {acima && (
              <span className="hs-rk-barra">
                <i style={{ width: `${Math.min(100, Math.round((eu.xp / Math.max(1, acima.xp + 1)) * 100))}%` }} />
              </span>
            )}
          </div>
          <div className="hs-rk-eu-xp">
            <b>{NUM.format(eu.xp)}</b>
            <small>XP · nível {nivelDe(eu.xp).nivel}</small>
          </div>
        </div>
      ) : (
        <p className="hs-rk-nota">Contas da equipe não entram no ranking: ele é só dos alunos.</p>
      )}

      <ol className="hs-rk-podio" aria-label="Pódio">
        {podio.map((l) => (
          <li key={l.pos} className={`p${l.pos}` + (l.eu ? " eu" : "")}>
            <div className="hs-rk-pessoa">
              {l.pos === 1 && <Coroa />}
              <Avatar l={l} grande />
              <b className="hs-rk-pnome">{l.eu ? "Você" : l.nome}</b>
              <InsigniasNome ids={l.insignias} tamanho={16} />
              <span className="hs-rk-pxp">{NUM.format(l.xp)} XP</span>
              <small className="hs-rk-pniv">
                Nível {nivelDe(l.xp).nivel} · <Rota escala={l.escala} />
              </small>
            </div>
            <div className="hs-rk-degrau">
              <span>{l.pos}</span>
            </div>
          </li>
        ))}
      </ol>

      {resto.length > 0 && (
        <ol className="hs-rk-lista" start={4}>
          {resto.map((l) => (
            <Item key={l.pos} l={l} lider={lider} />
          ))}
          {fora.length > 0 && (
            <>
              <li className="hs-rk-sep" aria-hidden>
                ···
              </li>
              {fora.map((l) => (
                <Item key={l.pos} l={l} lider={lider} />
              ))}
            </>
          )}
        </ol>
      )}

      {temMais && (
        <button type="button" className="hs-rk-mais" onClick={() => setTudo((v) => !v)}>
          {tudo ? "Mostrar só o top 10" : "Ver até o 20º lugar"}
        </button>
      )}

      <p className="hs-rk-rodape">Ordenado por XP. Em caso de empate, fica na frente quem entrou primeiro.</p>
    </section>
  );
}

function Item({ l, lider }: { l: Linha; lider: number }) {
  return (
    <li className={"hs-rk-item" + (l.eu ? " eu" : "")}>
      <span className="hs-rk-n">{String(l.pos).padStart(2, "0")}</span>
      <Avatar l={l} />
      <span className="hs-rk-quem">
        <b>
          {l.eu ? "Você" : l.nome}
          <InsigniasNome ids={l.insignias} tamanho={14} />
        </b>
        <small>
          Nível {nivelDe(l.xp).nivel} · <Rota escala={l.escala} />
        </small>
      </span>
      <span className="hs-rk-barra" aria-hidden>
        <i style={{ width: `${l.xp > 0 ? Math.max(3, Math.round((l.xp / lider) * 100)) : 0}%` }} />
      </span>
      <span className="hs-rk-xp">
        {NUM.format(l.xp)} <small>XP</small>
      </span>
    </li>
  );
}
