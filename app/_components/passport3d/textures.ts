import * as THREE from 'three';
import { BRAND, ROUTE } from './config';
import type { PassportAssets, PassportFonts, PassportState } from './types';

export type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

export interface CanvasTex {
  tex: THREE.CanvasTexture;
  redraw: () => void;
}

export const TEX_W = 1024;
export const TEX_H = 1442;

export function makeCanvasTex(w: number, h: number, draw: Draw, anisotropy = 1): CanvasTex {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return {
    tex,
    redraw() {
      g.clearRect(0, 0, w, h);
      draw(g, w, h);
      tex.needsUpdate = true;
    },
  };
}

/* ───────── camadas de fundo (pesadas: geradas uma vez e reaproveitadas) ───────── */

function noise(g: CanvasRenderingContext2D, w: number, h: number, a: number) {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * a;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

function guilloche(g: CanvasRenderingContext2D, w: number, h: number, col: string) {
  g.strokeStyle = col;
  g.lineWidth = 1.2;
  for (let k = 0; k < 18; k++) {
    g.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const y = h * 0.5 + Math.sin(x / 70 + k * 0.6) * h * 0.36 * Math.cos(k * 0.3) + Math.sin(x / 23 + k) * 14;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
}

function layer(w: number, h: number, paint: Draw): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  paint(g, w, h);
  return c;
}

let leatherBg: HTMLCanvasElement | null = null;
let paperBg: HTMLCanvasElement | null = null;

function leather(): HTMLCanvasElement {
  return (leatherBg ??= layer(TEX_W, TEX_H, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#17181A');
    gr.addColorStop(1, '#08090A');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    noise(g, w, h, 16);
  }));
}

function paper(): HTMLCanvasElement {
  return (paperBg ??= layer(TEX_W, TEX_H, (g, w, h) => {
    const gb = g.createLinearGradient(0, 0, w, h);
    gb.addColorStop(0, '#F5F2EA');
    gb.addColorStop(0.5, '#EEE9DD');
    gb.addColorStop(1, '#E2DED4');
    g.fillStyle = gb;
    g.fillRect(0, 0, w, h);
    guilloche(g, w, h, 'rgba(176,138,52,.16)');
    guilloche(g, w, h * 0.6, 'rgba(20,23,28,.06)');
    guilloche(g, w * 0.8, h, 'rgba(176,138,52,.08)');
    noise(g, w, h, 6);
  }));
}

/* ───────── helpers de desenho ───────── */

function goldText(g: CanvasRenderingContext2D, txt: string, x: number, y: number, font: string) {
  g.font = font;
  const gg = g.createLinearGradient(0, y - 60, 0, y + 10);
  gg.addColorStop(0, BRAND.goldHi);
  gg.addColorStop(0.5, BRAND.gold);
  gg.addColorStop(1, BRAND.goldLow);
  g.fillStyle = gg;
  g.shadowColor = 'rgba(0,0,0,.45)';
  g.shadowBlur = 4;
  g.shadowOffsetY = 2;
  g.fillText(txt, x, y);
  g.shadowBlur = 0;
  g.shadowOffsetY = 0;
}

function emblem(g: CanvasRenderingContext2D, cx: number, cy: number, R: number, F: PassportFonts) {
  const gold = BRAND.gold;
  g.save();
  g.strokeStyle = gold;
  g.fillStyle = gold;
  g.lineWidth = 6;
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 2;
  g.beginPath();
  g.arc(cx, cy, R - 16, 0, Math.PI * 2);
  g.stroke();
  // globo
  g.beginPath();
  g.arc(cx, cy, R * 0.62, 0, Math.PI * 2);
  g.stroke();
  for (let k = -2; k <= 2; k++) {
    g.beginPath();
    g.ellipse(cx, cy, Math.abs(k) * R * 0.15, R * 0.62, 0, 0, Math.PI * 2);
    g.stroke();
  }
  for (let j = -2; j <= 2; j++) {
    const yy = cy + j * R * 0.22;
    const hw = Math.sqrt(Math.max(0, R * R * 0.3844 - (j * R * 0.22) ** 2));
    g.beginPath();
    g.moveTo(cx - hw, yy);
    g.lineTo(cx + hw, yy);
    g.stroke();
  }
  // "H" central
  g.fillStyle = '#0E0F11';
  g.fillRect(cx - R * 0.34, cy - R * 0.4, R * 0.68, R * 0.8);
  g.fillStyle = gold;
  g.fillRect(cx - R * 0.3, cy - R * 0.34, R * 0.13, R * 0.68);
  g.fillRect(cx + R * 0.17, cy - R * 0.34, R * 0.13, R * 0.68);
  g.fillRect(cx - R * 0.17, cy - R * 0.06, R * 0.34, R * 0.11);
  // texto circular
  const txt = 'HOT SOCIETY · PASSAPORTE · HOT SOCIETY · PASSAPORTE · ';
  g.font = `700 26px ${F.display}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const step = (Math.PI * 2) / txt.length;
  for (let i = 0; i < txt.length; i++) {
    const a = -Math.PI / 2 + i * step;
    g.save();
    g.translate(cx + Math.cos(a) * (R - 38), cy + Math.sin(a) * (R - 38));
    g.rotate(a + Math.PI / 2);
    g.fillText(txt[i], 0, 0);
    g.restore();
  }
  g.textBaseline = 'alphabetic';
  g.restore();
}

export function stampDraw(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rot: number,
  label: string,
  sub: string,
  F: PassportFonts,
) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.globalAlpha = 0.88;
  g.strokeStyle = BRAND.stamp;
  g.fillStyle = BRAND.stamp;
  g.lineWidth = 10;
  g.beginPath();
  g.roundRect(-r, -r * 0.55, r * 2, r * 1.1, 22);
  g.stroke();
  g.lineWidth = 3;
  g.strokeRect(-r + 16, -r * 0.55 + 16, r * 2 - 32, r * 1.1 - 32);
  g.textAlign = 'center';
  g.font = `900 ${Math.round(r * 0.42)}px ${F.display}`;
  g.fillText(label, 0, r * 0.08);
  g.font = `700 ${Math.round(r * 0.13)}px ${F.mono}`;
  g.fillText(sub, 0, r * 0.34);
  g.restore();
}

/* ───────── as 4 faces do passaporte ───────── */

export interface TexCtx {
  state: PassportState;
  fonts: PassportFonts;
  assets: PassportAssets;
}

export function drawCover(c: TexCtx): Draw {
  return (g, w, h) => {
    const { state: s, fonts: F, assets: A } = c;
    g.drawImage(leather(), 0, 0);
    g.textAlign = 'center';
    goldText(g, 'HOT SOCIETY', w / 2, h * 0.1, `800 64px ${F.display}`);
    g.fillStyle = BRAND.gold;
    g.font = `600 26px ${F.display}`;
    g.fillText('SOCIEDADE  DO  DIGITAL', w / 2, h * 0.1 + 44);
    emblem(g, w / 2, h * 0.335, 180, F);
    goldText(g, 'PASSAPORTE', w / 2, h * 0.55, `900 92px ${F.display}`);
    g.fillStyle = BRAND.gold;
    g.font = `600 28px ${F.display}`;
    g.fillText('PASSPORT  ·  PASAPORTE', w / 2, h * 0.55 + 50);

    // campo do nome na capa
    const bx = w * 0.1, by = h * 0.625, bw = w * 0.8, bh = h * 0.105;
    g.fillStyle = s.focus ? 'rgba(201,162,78,.10)' : 'rgba(201,162,78,.04)';
    g.fillRect(bx, by, bw, bh);
    g.strokeStyle = BRAND.gold;
    g.lineWidth = s.focus ? 5 : 3;
    g.setLineDash(s.typed ? [] : [14, 10]);
    g.strokeRect(bx, by, bw, bh);
    g.setLineDash([]);
    g.textAlign = 'left';
    g.fillStyle = BRAND.gold;
    g.font = `700 22px ${F.display}`;
    g.fillText('TITULAR  ·  HOLDER', bx + 28, by + 40);
    let tx = bx + 28;
    const ty = by + bh - 30;
    if (s.typed) {
      let fs = 56;
      g.font = `700 ${fs}px ${F.mono}`;
      while (g.measureText(s.name).width > bw - 80 && fs > 28) {
        fs -= 2;
        g.font = `700 ${fs}px ${F.mono}`;
      }
      goldText(g, s.name, tx, ty, `700 ${fs}px ${F.mono}`);
      tx += g.measureText(s.name).width + 8;
    } else if (!s.focus) {
      g.fillStyle = 'rgba(217,181,102,.55)';
      g.font = `600 34px ${F.display}`;
      g.fillText('TOQUE AQUI E ESCREVA SEU NOME', tx, ty - 6);
    }
    if (s.focus && s.caret) {
      g.fillStyle = BRAND.goldHi;
      g.fillRect(tx, ty - 50, 6, 58);
    }

    g.textAlign = 'center';
    g.fillStyle = BRAND.gold;
    g.fillRect(w * 0.3, h * 0.78, w * 0.4, 4);
    g.font = `600 24px ${F.display}`;
    g.fillText('EMBARQUE NO ZERO · DESEMBARQUE NO TOPO', w / 2, h * 0.825);
    if (A.wordmark) {
      const lw = w * 0.34, lh = (lw * 100) / 984.96;
      g.drawImage(A.wordmark, (w - lw) / 2, h * 0.87, lw, lh);
    }
  };
}

export function drawBack(c: TexCtx): Draw {
  return (g, w, h) => {
    const F = c.fonts;
    g.drawImage(leather(), 0, 0);
    g.textAlign = 'center';
    goldText(g, 'NÃO EXISTE', w / 2, h * 0.3, `900 70px ${F.display}`);
    goldText(g, 'NOBREZA', w / 2, h * 0.3 + 150, `900 150px ${F.display}`);
    goldText(g, 'NA POBREZA', w / 2, h * 0.3 + 240, `900 70px ${F.display}`);
  };
}

export function drawDataPage(c: TexCtx): Draw {
  return (g, w, h) => {
    const { state: s, fonts: F, assets: A } = c;
    g.drawImage(paper(), 0, 0);
    g.fillStyle = BRAND.ink;
    g.font = `700 30px ${F.display}`;
    g.textAlign = 'left';
    g.fillText('HOT SOCIETY', 70, 100);
    g.textAlign = 'right';
    g.font = `600 24px ${F.mono}`;
    g.fillText('PASSAPORTE · P', w - 70, 100);
    g.fillStyle = '#B8963F';
    g.fillRect(70, 124, w - 140, 6);

    // foto (silhueta do comandante)
    g.fillStyle = '#C9CFDB';
    g.fillRect(70, 180, 320, 420);
    g.fillStyle = BRAND.ink;
    g.beginPath();
    g.arc(230, 340, 92, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#E8ECF2';
    g.beginPath();
    g.roundRect(150, 312, 160, 52, 26);
    g.fill();
    g.fillStyle = BRAND.gold;
    g.fillRect(150, 336, 160, 6);
    g.fillStyle = BRAND.ink;
    g.beginPath();
    g.moveTo(90, 600);
    g.quadraticCurveTo(230, 420, 370, 600);
    g.fill();

    const field = (lbl: string, val: string, x: number, y: number, size = 40) => {
      g.textAlign = 'left';
      g.fillStyle = BRAND.inkMuted;
      g.font = `600 22px ${F.text}`;
      g.fillText(lbl, x, y);
      g.fillStyle = BRAND.ink;
      g.font = `700 ${size}px ${F.mono}`;
      g.fillText(val, x, y + size + 6);
    };
    const first = ROUTE[0], next = ROUTE[1], last = ROUTE[ROUTE.length - 1];
    field('TITULAR / HOLDER', s.name, 430, 210, s.name.length > 14 ? 34 : 44);
    field('Nº DO PASSAPORTE', s.num, 430, 330, 34);
    field('NACIONALIDADE', 'HOT SOCIETY', 430, 430, 34);
    field('DESTINO ATUAL', `${first.country} · ${first.code}`, 430, 530, 34);
    field('EMISSÃO', s.date, 70, 680, 34);
    field('PRÓXIMA ESCALA', `${next.code} · ${next.country}`, 430, 680, 34);
    field('DESTINO FINAL', `${last.code} · ${last.country}`, 70, 800, 34);

    // assinatura do Cappu
    if (A.comandante) {
      g.save();
      g.beginPath();
      g.arc(130, 970, 58, 0, Math.PI * 2);
      g.clip();
      g.filter = 'grayscale(1) contrast(1.2)';
      g.drawImage(A.comandante, 72, 912, 116, 116);
      g.restore();
    }
    g.strokeStyle = BRAND.gold;
    g.lineWidth = 4;
    g.beginPath();
    g.arc(130, 970, 60, 0, Math.PI * 2);
    g.stroke();
    g.textAlign = 'left';
    g.fillStyle = BRAND.inkMuted;
    g.font = `600 20px ${F.text}`;
    g.fillText('EMITIDO POR', 212, 935);
    g.fillStyle = BRAND.ink;
    g.font = `900 40px ${F.display}`;
    g.fillText('CAPPU', 212, 978);
    g.strokeStyle = BRAND.ink;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(212, 1020);
    g.bezierCurveTo(260, 980, 290, 1050, 330, 1010);
    g.bezierCurveTo(360, 985, 390, 1040, 440, 1005);
    g.stroke();
    g.fillStyle = BRAND.inkMuted;
    g.font = `600 18px ${F.text}`;
    g.fillText('COMANDANTE · HOT SOCIETY', 212, 1062);

    // MRZ
    const parts = s.name.split(' ');
    let mrz1 = ('P<HSY' + (parts.length > 1 ? parts[parts.length - 1] + '<<' + parts[0] : s.name + '<<')).replace(/ /g, '<');
    mrz1 = mrz1.padEnd(44, '<').slice(0, 44);
    const mrz2 = (s.num.replace(/-/g, '') + '<0BRA<<<<' + last.code).padEnd(42, '<').slice(0, 42) + '04';
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.fillRect(40, h - 230, w - 80, 170);
    g.fillStyle = '#2F3236';
    g.font = `500 34px ${F.mono}`;
    g.textAlign = 'left';
    g.fillText(mrz1, 60, h - 160);
    g.fillText(mrz2, 60, h - 100);

    if (s.stamped) {
      stampDraw(g, w * 0.68, h * 0.624, 165, -0.22, first.country, 'EMITIDO · ' + s.date, F);
    } else {
      g.save();
      g.setLineDash([14, 10]);
      g.strokeStyle = 'rgba(184,48,48,.45)';
      g.lineWidth = 4;
      g.strokeRect(w * 0.68 - 170, h * 0.624 - 95, 340, 190);
      g.setLineDash([]);
      g.fillStyle = 'rgba(184,48,48,.55)';
      g.font = `700 26px ${F.mono}`;
      g.textAlign = 'center';
      g.fillText('AGUARDANDO CARIMBO', w * 0.68, h * 0.624 + 10);
      g.restore();
    }
  };
}

export function drawVisaPage(c: TexCtx): Draw {
  return (g, w, h) => {
    const { state: s, fonts: F } = c;
    g.drawImage(paper(), 0, 0);
    g.fillStyle = BRAND.ink;
    g.textAlign = 'left';
    g.font = `900 64px ${F.display}`;
    g.fillText('VISTOS', 70, 140);
    g.font = `600 24px ${F.mono}`;
    g.fillStyle = BRAND.inkMuted;
    g.fillText('ROTA HOT SOCIETY', 70, 184);
    // grade 2 colunas; com 4 destinos fica 2×2. O último (Mônaco) é o topo da rota.
    const rows = Math.ceil(ROUTE.length / 2);
    const rowY = (row: number) => h * (rows <= 2 ? 0.31 + row * 0.33 : 0.27 + row * 0.235);
    ROUTE.forEach((r, i) => {
      const x = w * (i % 2 ? 0.72 : 0.3);
      const y = rowY(Math.floor(i / 2));
      const top = i === ROUTE.length - 1;
      if (i === 0 && s.stamped) {
        stampDraw(g, x, y, 125, 0.12, r.code, r.country, F);
        return;
      }
      g.save();
      if (top) {
        // destino final: aro dourado duplo, sem tracejado
        g.strokeStyle = '#B8963F';
        g.lineWidth = 6;
        g.beginPath();
        g.arc(x, y, 124, 0, Math.PI * 2);
        g.stroke();
        g.lineWidth = 2;
        g.beginPath();
        g.arc(x, y, 110, 0, Math.PI * 2);
        g.stroke();
      } else {
        g.setLineDash([12, 10]);
        g.strokeStyle = 'rgba(20,23,28,.35)';
        g.lineWidth = 4;
        g.beginPath();
        g.arc(x, y, 118, 0, Math.PI * 2);
        g.stroke();
      }
      g.restore();
      g.textAlign = 'center';
      g.fillStyle = top ? '#8E6F2B' : 'rgba(20,23,28,.55)';
      g.font = `900 54px ${F.display}`;
      g.fillText(r.code, x, y - (top ? 6 : -8));
      g.font = `700 19px ${F.mono}`;
      g.fillText(r.country, x, y + (top ? 28 : 44));
      if (top) {
        g.font = `800 19px ${F.display}`;
        g.fillText(r.goal.toUpperCase(), x, y + 56);
        g.font = `700 13px ${F.mono}`;
        g.fillText('+ MENTORIA HIGH TICKET', x, y + 78);
      } else g.fillText(r.goal, x, y + 68);
    });
    g.fillStyle = '#B8963F';
    g.fillRect(0, (rowY(0) + rowY(1)) / 2 - 4, w, 8);
    g.fillStyle = BRAND.inkMuted;
    g.font = `600 20px ${F.text}`;
    g.textAlign = 'center';
    g.fillText('O país se conquista. Ninguém compra Mônaco.', w / 2, h - 70);
  };
}

/** Partícula redonda suave (neve, explosão, terra do globo). */
export function dotTexture(): THREE.CanvasTexture {
  return makeCanvasTex(64, 64, (g) => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.4, 'rgba(255,255,255,.6)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
  }).tex;
}
