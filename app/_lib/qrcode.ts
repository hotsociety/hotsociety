// Gerador de QR Code (padrão ISO/IEC 18004), modo byte, correção de erro nível M.
// Usado para mostrar o Pix "copia e cola" como QR. Sem dependências externas.

const ECC_POR_BLOCO = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
const BLOCOS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];

function modulosDeDados(v: number) {
  let r = (16 * v + 128) * v + 64;
  if (v >= 2) {
    const n = Math.floor(v / 7) + 2;
    r -= (25 * n - 10) * n - 55;
    if (v >= 7) r -= 36;
  }
  return r;
}
const palavrasDeDados = (v: number) => Math.floor(modulosDeDados(v) / 8) - ECC_POR_BLOCO[v] * BLOCOS[v];

// ---- Reed-Solomon em GF(256) ----
function mult(x: number, y: number) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}
function divisor(grau: number) {
  const r = new Array<number>(grau).fill(0);
  r[grau - 1] = 1;
  let raiz = 1;
  for (let i = 0; i < grau; i++) {
    for (let j = 0; j < r.length; j++) {
      r[j] = mult(r[j], raiz);
      if (j + 1 < r.length) r[j] ^= r[j + 1];
    }
    raiz = mult(raiz, 0x02);
  }
  return r;
}
function resto(dados: number[], div: number[]) {
  const r = new Array<number>(div.length).fill(0);
  for (const b of dados) {
    const f = b ^ (r.shift() as number);
    r.push(0);
    div.forEach((c, i) => (r[i] ^= mult(c, f)));
  }
  return r;
}

function posicoesAlinhamento(v: number) {
  if (v === 1) return [];
  const n = Math.floor(v / 7) + 2;
  const passo = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2;
  const r = [6];
  for (let p = v * 4 + 10; r.length < n; p -= passo) r.splice(1, 0, p);
  return r;
}

const MASCARAS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** Devolve a matriz do QR (true = quadradinho escuro). */
export function qrMatriz(texto: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(texto));

  // Escolhe a menor versão que cabe.
  let v = 1;
  for (; v <= 40; v++) {
    const bitsContagem = v <= 9 ? 8 : 16;
    if (4 + bitsContagem + bytes.length * 8 <= palavrasDeDados(v) * 8) break;
  }
  if (v > 40) throw new Error("texto grande demais para QR");

  // Monta os bits: modo byte (0100), tamanho, dados, terminador e preenchimento.
  const bits: number[] = [];
  const poe = (val: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  poe(0b0100, 4);
  poe(bytes.length, v <= 9 ? 8 : 16);
  bytes.forEach((b) => poe(b, 8));
  const cap = palavrasDeDados(v) * 8;
  poe(0, Math.min(4, cap - bits.length));
  poe(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) poe(pad, 8);
  const dados: number[] = [];
  for (let i = 0; i < bits.length; i += 8) dados.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));

  // Divide em blocos, calcula correção e intercala.
  const nb = BLOCOS[v];
  const ecc = ECC_POR_BLOCO[v];
  const brutos = Math.floor(modulosDeDados(v) / 8);
  const curtos = nb - (brutos % nb);
  const tamCurto = Math.floor(brutos / nb);
  const div = divisor(ecc);
  const blocos: number[][] = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const d = dados.slice(k, k + tamCurto - ecc + (i < curtos ? 0 : 1));
    k += d.length;
    const e = resto(d, div);
    if (i < curtos) d.push(0);
    blocos.push(d.concat(e));
  }
  const final: number[] = [];
  for (let i = 0; i < blocos[0].length; i++)
    blocos.forEach((b, j) => {
      if (i !== tamCurto - ecc || j >= curtos) final.push(b[i]);
    });

  // Desenha os padrões fixos.
  const n = v * 4 + 17;
  const m: boolean[][] = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const fixo: boolean[][] = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const pinta = (x: number, y: number, escuro: boolean) => {
    m[y][x] = escuro;
    fixo[y][x] = true;
  };
  for (let i = 0; i < n; i++) {
    pinta(6, i, i % 2 === 0);
    pinta(i, 6, i % 2 === 0);
  }
  const localizador = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < n && y >= 0 && y < n) pinta(x, y, d !== 2 && d !== 4);
      }
  };
  localizador(3, 3);
  localizador(n - 4, 3);
  localizador(3, n - 4);
  const al = posicoesAlinhamento(v);
  al.forEach((ay, i) =>
    al.forEach((ax, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) pinta(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }),
  );
  const formato = (mascara: number) => {
    const d = (0 << 3) | mascara; // nível M = 00
    let r = d;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((d << 10) | r) ^ 0x5412;
    const bit = (i: number) => ((b >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) pinta(8, i, bit(i));
    pinta(8, 7, bit(6));
    pinta(8, 8, bit(7));
    pinta(7, 8, bit(8));
    for (let i = 9; i < 15; i++) pinta(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) pinta(n - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) pinta(8, n - 15 + i, bit(i));
    pinta(8, n - 8, true);
  };
  formato(0);
  if (v >= 7) {
    let r = v;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const b = (v << 12) | r;
    for (let i = 0; i < 18; i++) {
      const bit = ((b >>> i) & 1) !== 0;
      const a = n - 11 + (i % 3);
      const c = Math.floor(i / 3);
      pinta(a, c, bit);
      pinta(c, a, bit);
    }
  }

  // Coloca os dados em zigue-zague.
  let i = 0;
  for (let dir = n - 1; dir >= 1; dir -= 2) {
    if (dir === 6) dir = 5;
    for (let vert = 0; vert < n; vert++)
      for (let j = 0; j < 2; j++) {
        const x = dir - j;
        const subindo = ((dir + 1) & 2) === 0;
        const y = subindo ? n - 1 - vert : vert;
        if (!fixo[y][x] && i < final.length * 8) {
          m[y][x] = ((final[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
          i++;
        }
      }
  }

  // Testa as 8 máscaras e fica com a de menor penalidade.
  const aplica = (k: number) => {
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!fixo[y][x] && MASCARAS[k](x, y)) m[y][x] = !m[y][x];
  };
  let melhor = 0;
  let menor = Infinity;
  for (let k = 0; k < 8; k++) {
    aplica(k);
    formato(k);
    const p = penalidade(m);
    if (p < menor) {
      menor = p;
      melhor = k;
    }
    aplica(k);
  }
  aplica(melhor);
  formato(melhor);
  return m;
}

function penalidade(m: boolean[][]) {
  const n = m.length;
  let p = 0;
  const linha = (get: (i: number, j: number) => boolean) => {
    for (let i = 0; i < n; i++) {
      let run = 1;
      for (let j = 1; j <= n; j++) {
        if (j < n && get(i, j) === get(i, j - 1)) run++;
        else {
          if (run >= 5) p += run - 2;
          run = 1;
        }
      }
      for (let j = 0; j + 6 < n; j++) {
        const pad = [1, 0, 1, 1, 1, 0, 1].every((b, k) => get(i, j + k) === (b === 1));
        if (!pad) continue;
        const antes = j >= 4 && [1, 2, 3, 4].every((k) => !get(i, j - k));
        const depois = j + 10 < n && [7, 8, 9, 10].every((k) => !get(i, j + k));
        if (antes || depois) p += 40;
      }
    }
  };
  linha((i, j) => m[i][j]);
  linha((i, j) => m[j][i]);
  let escuros = 0;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (m[y][x]) escuros++;
      if (x < n - 1 && y < n - 1 && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
    }
  const total = n * n;
  p += (Math.ceil(Math.abs(escuros * 20 - total * 10) / total) - 1) * 10;
  return p;
}

/** Caminho SVG (um "d") com os quadradinhos escuros, já com a margem de 4 módulos. */
export function qrSvgPath(texto: string) {
  const m = qrMatriz(texto);
  const borda = 4;
  let d = "";
  m.forEach((linha, y) =>
    linha.forEach((escuro, x) => {
      if (escuro) d += `M${x + borda} ${y + borda}h1v1h-1z`;
    }),
  );
  return { d, tamanho: m.length + borda * 2 };
}
