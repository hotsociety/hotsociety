// Desenha uma insígnia em pixel art (SVG). Altura = tamanho; veículos são mais largos (24 ou 32 × 16).
import { insignia } from "../../../_lib/insignias";
import { PALETA, SPRITES } from "./sprites";
import "./insignias.css";

// Junta pixels vizinhos da mesma cor numa linha (menos <rect>).
const cache = new Map<string, { x: number; y: number; w: number; c: string }[]>();
function retangulos(id: string) {
  const pronto = cache.get(id);
  if (pronto) return pronto;
  const out: { x: number; y: number; w: number; c: string }[] = [];
  (SPRITES[id] ?? []).forEach((linha, y) => {
    let x = 0;
    while (x < linha.length) {
      const ch = linha[x];
      if (ch === ".") {
        x++;
        continue;
      }
      let x2 = x;
      while (x2 < linha.length && linha[x2] === ch) x2++;
      out.push({ x, y, w: x2 - x, c: PALETA[ch] ?? "#000" });
      x = x2;
    }
  });
  cache.set(id, out);
  return out;
}

export function Insignia({ id, tamanho = 16, bloqueada = false, titulo }: { id: string; tamanho?: number; bloqueada?: boolean; titulo?: string }) {
  const meta = insignia(id);
  if (!meta || !SPRITES[id]) return null;
  const rotulo = titulo ?? `${meta.nome} · ${meta.regra}`;
  const larg = SPRITES[id][0]?.length ?? 16;
  return (
    <svg
      className={"hs-ins" + (bloqueada ? " off" : "")}
      viewBox={`0 0 ${larg} 16`}
      width={(tamanho * larg) / 16}
      height={tamanho}
      shapeRendering="crispEdges"
      role="img"
      aria-label={rotulo}
    >
      <title>{rotulo}</title>
      {retangulos(id).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </svg>
  );
}

// Fileira ao lado do nome: a maior de cada categoria (até 3).
export function InsigniasNome({ ids, tamanho = 16 }: { ids?: string[] | null; tamanho?: number }) {
  if (!ids?.length) return null;
  return (
    <span className="hs-ins-nome">
      {ids.slice(0, 3).map((id) => (
        <Insignia key={id} id={id} tamanho={tamanho} />
      ))}
    </span>
  );
}
