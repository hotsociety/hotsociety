import * as THREE from 'three';
import { Globe } from './globe';
import { TEX_H, TEX_W, drawBack, drawCover, drawDataPage, drawVisaPage, dotTexture, makeCanvasTex, type CanvasTex, type TexCtx } from './textures';
import type { EngineCallbacks, PassportAssets, PassportFonts, PassportState, Phase } from './types';
import { clamp01, easeInOutCubic as ease, easeOutBack } from './utils';

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  fonts: PassportFonts;
  state: PassportState;
  assets: PassportAssets;
  reduceMotion: boolean;
  callbacks?: EngineCallbacks;
}

// dimensões do passaporte em unidades de cena
const W = 1.25, H = 1.76, TH = 0.022;
// three r155+ usa luzes físicas; ×π reproduz a intensidade do protótipo (r128)
const PI = Math.PI;

/**
 * Cena 3D do Passaporte HOT SOCIETY (Three.js puro, sem React).
 * Fluxo: fechado → abrir → carimbar → rota no globo → onRouteReady (checkout).
 */
export class PassportEngine {
  phase: Phase = 'closed';

  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  private camBase = new THREE.Vector3(0, 0.1, 5.4);
  private cb: EngineCallbacks;
  private reduce: boolean;
  private ctx: TexCtx;

  private book = new THREE.Group();
  private holder = new THREE.Group();
  private hinge = new THREE.Group();
  private bookBase = new THREE.Vector3();
  private cover!: THREE.Mesh;
  private pages!: THREE.Mesh;
  private back!: THREE.Mesh;
  private shine!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private goldLight = new THREE.PointLight(0xc9a24e, 0, 4, 1);
  private stampObj = new THREE.Group();
  private stampTarget = new THREE.Vector3(W * 0.16, -H * 0.1, 0.06);

  private texCover: CanvasTex;
  private texData: CanvasTex;
  private texVisa: CanvasTex;
  private texBack: CanvasTex;

  private snow!: THREE.Points;
  private snowPos!: Float32Array;
  private snowVel!: Float32Array;
  private burst!: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private burstPos!: Float32Array;
  private burstVel: [number, number, number][] = [];
  private burstT = -1;
  private globe: Globe;

  // animação
  private openT = 0;
  private openTarget = 0;
  private routeT = 0;
  private routeTarget = 0;
  private stampT = -1;
  private shake = 0;
  private coShift = 0;
  private checkoutOpen = false;
  private narrow = false;
  private T = 0;
  private last = 0;
  private raf = 0;
  private running = true;
  private routeTimer: ReturnType<typeof setTimeout> | undefined;
  private caretTimer: ReturnType<typeof setInterval> | undefined;

  // entrada
  private pointer = { x: 0, y: 0 };
  private tilt = { x: 0, y: 0 };
  private dragging = false;
  private dragX = 0;
  private spin = 0;
  private spinV = 0;
  private downAt: { x: number; y: number } | null = null;
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private ro: ResizeObserver;
  private disposers: (() => void)[] = [];

  constructor(o: EngineOptions) {
    this.canvas = o.canvas;
    this.cb = o.callbacks ?? {};
    this.reduce = o.reduceMotion;
    this.ctx = { state: o.state, fonts: o.fonts, assets: o.assets };

    const r = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setClearColor(0x000000, 0);
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;
    const aniso = r.capabilities.getMaxAnisotropy();

    const scene = this.scene;
    scene.fog = new THREE.Fog(0x0c0f13, 9, 26);
    this.camera.position.copy(this.camBase);

    // luzes
    scene.add(new THREE.AmbientLight(0x9aa3b4, 0.45 * PI));
    const key = new THREE.DirectionalLight(0xdfe7f5, 1.15 * PI);
    key.position.set(-3, 4, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xbfd2ea, 0.6 * PI);
    rim.position.set(3, 2, -3);
    scene.add(rim);
    this.goldLight.position.set(0.9, 0, 0.8);
    scene.add(this.goldLight);

    // chão invisível que só recebe sombra
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.35 }));
    floor.rotation.x = -PI / 2;
    floor.position.y = -1.55;
    floor.receiveShadow = true;
    scene.add(floor);

    // texturas
    this.texCover = makeCanvasTex(TEX_W, TEX_H, drawCover(this.ctx), aniso);
    this.texData = makeCanvasTex(TEX_W, TEX_H, drawDataPage(this.ctx), aniso);
    this.texVisa = makeCanvasTex(TEX_W, TEX_H, drawVisaPage(this.ctx), aniso);
    this.texBack = makeCanvasTex(TEX_W, TEX_H, drawBack(this.ctx), aniso);

    this.buildBook();
    this.buildStamp();
    const dot = dotTexture();
    this.buildParticles(dot);
    this.globe = new Globe({ reduce: this.reduce, dot, fonts: o.fonts, anisotropy: aniso });
    scene.add(this.globe.group);

    this.bindInput();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(o.canvas);
    this.resize();
    this.start();
  }

  /* ───────────── construção ───────────── */

  private buildBook() {
    const edge = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.75 });
    const pageEdge = new THREE.MeshStandardMaterial({ color: 0xe6e9ee, roughness: 0.95 });
    const coverMat = new THREE.MeshStandardMaterial({ map: this.texCover.tex, roughness: 0.62, metalness: 0.12 });
    const dataMat = new THREE.MeshStandardMaterial({ map: this.texData.tex, roughness: 0.85 });
    const visaMat = new THREE.MeshStandardMaterial({ map: this.texVisa.tex, roughness: 0.85 });
    const backMat = new THREE.MeshStandardMaterial({ map: this.texBack.tex, roughness: 0.62, metalness: 0.12 });

    this.scene.add(this.book);
    this.book.add(this.holder);

    // ordem das faces do Box: +x, -x, +y, -y, +z (frente), -z (verso)
    this.back = new THREE.Mesh(new THREE.BoxGeometry(W, H, TH), [edge, edge, edge, edge, edge, backMat]);
    this.back.position.z = -0.05;
    this.back.castShadow = true;
    this.holder.add(this.back);

    this.pages = new THREE.Mesh(new THREE.BoxGeometry(W - 0.04, H - 0.04, 0.07), [pageEdge, pageEdge, pageEdge, pageEdge, dataMat, pageEdge]);
    this.pages.position.set(0.01, 0, -0.005);
    this.pages.castShadow = true;
    this.holder.add(this.pages);

    // capa com dobradiça na lombada (x = -W/2)
    this.hinge.position.set(-W / 2, 0, 0.04);
    this.holder.add(this.hinge);
    this.cover = new THREE.Mesh(new THREE.BoxGeometry(W, H, TH), [edge, edge, edge, edge, coverMat, visaMat]);
    this.cover.position.x = W / 2;
    this.cover.castShadow = true;
    this.hinge.add(this.cover);

    // brilho que varre o filete dourado da capa
    this.shine = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xffe3a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.shine.position.set(0, (0.5 - 0.78 - 2 / TEX_H) * H, TH / 2 + 0.002);
    this.cover.add(this.shine);
  }

  private buildStamp() {
    const s = this.stampObj;
    const rubber = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 40), new THREE.MeshStandardMaterial({ color: 0xb83030, roughness: 0.6 }));
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.4, metalness: 0.3 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.14, 40), bodyMat);
    body.position.y = 0.095;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.12, 20), bodyMat);
    neck.position.y = 0.2;
    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.11, 32, 20), new THREE.MeshStandardMaterial({ color: 0x1b1f25, roughness: 0.3, metalness: 0.4 }));
    handle.position.y = 0.27;
    s.add(rubber, body, neck, handle);
    s.rotation.x = PI / 2;
    s.visible = false;
    s.traverse((ob) => {
      if ((ob as THREE.Mesh).isMesh) ob.castShadow = true;
    });
    this.holder.add(s);
  }

  private buildParticles(dot: THREE.Texture) {
    const SN = this.reduce ? 160 : 520;
    this.snowPos = new Float32Array(SN * 3);
    this.snowVel = new Float32Array(SN);
    for (let i = 0; i < SN; i++) {
      this.snowPos[i * 3] = (Math.random() - 0.5) * 12;
      this.snowPos[i * 3 + 1] = Math.random() * 8 - 3;
      this.snowPos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1;
      this.snowVel[i] = 0.15 + Math.random() * 0.35;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(this.snowPos, 3));
    this.snow = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.045, map: dot, transparent: true, depthWrite: false, opacity: 0.85, color: 0xe8ecf2 }));
    this.scene.add(this.snow);

    const BN = 140;
    this.burstPos = new Float32Array(BN * 3);
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(this.burstPos, 3));
    this.burst = new THREE.Points(bg, new THREE.PointsMaterial({ size: 0.05, map: dot, transparent: true, depthWrite: false, opacity: 0, color: 0xffffff }));
    this.holder.add(this.burst);
  }

  /* ───────────── API pública (chamada pela UI React) ───────────── */

  /** Redesenha capa/página de dados depois que a UI muda o estado (nome, foco). */
  refreshCover() {
    this.texCover.redraw();
  }
  refreshPages() {
    this.texData.redraw();
    this.texVisa.redraw();
  }
  refreshAll() {
    this.texCover.redraw();
    this.texData.redraw();
    this.texVisa.redraw();
    this.texBack.redraw();
  }

  /** Liga/desliga o cursor piscando no campo de nome da capa. */
  setFocus(focus: boolean) {
    const s = this.ctx.state;
    s.focus = focus;
    s.caret = focus;
    clearInterval(this.caretTimer);
    if (focus) {
      this.spin = 0;
      this.spinV = 0;
      this.caretTimer = setInterval(() => {
        s.caret = !s.caret;
        this.texCover.redraw();
      }, 530);
    }
    this.texCover.redraw();
  }

  open() {
    if (this.phase !== 'closed') return;
    this.openTarget = 1;
    this.setPhase('open');
  }

  stamp() {
    if (this.phase !== 'open') return;
    this.stampT = 0;
    this.stampObj.visible = true;
    this.setPhase('stamped');
  }

  /** Avisa o 3D que o checkout abriu/fechou (no desktop o passaporte desliza para a esquerda). */
  setCheckoutOpen(open: boolean) {
    this.checkoutOpen = open;
  }

  reset() {
    clearTimeout(this.routeTimer);
    this.openTarget = 0;
    this.routeTarget = 0;
    this.routeT = 0;
    this.stampT = -1;
    this.stampObj.visible = false;
    this.ctx.state.stamped = false;
    this.refreshPages();
    this.globe.reset();
    this.setPhase('closed');
  }

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.routeTimer);
    clearInterval(this.caretTimer);
    this.ro.disconnect();
    this.disposers.forEach((d) => d());
    this.scene.traverse((ob) => {
      const m = ob as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
      mats.forEach((mat) => {
        Object.values(mat).forEach((v) => {
          if (v instanceof THREE.Texture) v.dispose();
        });
        mat.dispose();
      });
    });
    this.renderer.dispose();
  }

  /* ───────────── interno ───────────── */

  private setPhase(p: Phase) {
    this.phase = p;
    this.cb.onPhase?.(p);
  }

  private doRoute() {
    if (this.phase !== 'stamped') return;
    this.globe.reset();
    this.routeTarget = 1;
    this.setPhase('route');
    this.routeTimer = setTimeout(() => this.cb.onRouteReady?.(), this.reduce ? 200 : 1900);
  }

  private bindInput() {
    const c = this.canvas;
    const rel = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 };
    };
    const move = (e: PointerEvent) => {
      const p = rel(e);
      this.pointer.x = p.x;
      this.pointer.y = p.y;
      if (this.dragging) {
        const dx = e.clientX - this.dragX;
        this.dragX = e.clientX;
        this.spinV = dx * 0.006;
        this.spin += this.spinV;
      }
    };
    const down = (e: PointerEvent) => {
      this.dragging = true;
      this.dragX = e.clientX;
      this.downAt = { x: e.clientX, y: e.clientY };
      c.style.cursor = 'grabbing';
    };
    const up = (e: PointerEvent) => {
      c.style.cursor = 'grab';
      this.dragging = false;
      const d = this.downAt;
      this.downAt = null;
      if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) >= 6 || e.target !== c) return;
      const p = rel(e);
      this.ndc.set(p.x, p.y);
      this.ray.setFromCamera(this.ndc, this.camera);
      if (this.ray.intersectObjects([this.cover, this.pages, this.back], false).length) this.cb.onBookTap?.(this.phase);
    };
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    this.disposers.push(() => {
      c.removeEventListener('pointermove', move);
      c.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
    });
  }

  private resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.narrow = w < 700;
    this.camBase.set(0, this.narrow ? 0.9 : 0.1, this.narrow ? (w / h < 0.6 ? 9.2 : 7.6) : 5.4);
    this.camera.position.copy(this.camBase);
    this.camera.updateProjectionMatrix();
    this.bookBase.set(this.narrow ? 0 : 0.55, this.narrow ? 0.6 : 0, 0);
    this.book.position.copy(this.bookBase);
  }

  /**
   * O loop nunca para sozinho (o navegador já pausa rAF em aba oculta);
   * quando o palco sai da tela (usuário rolou a home), só pulamos o trabalho do frame.
   */
  private start() {
    if (!this.running || this.raf) return;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min((now - this.last) / 1000, 0.05);
      this.last = now;
      if (!this.onScreen()) return;
      this.tick(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private onScreen(): boolean {
    const r = this.canvas.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
  }

  private tick(dt: number) {
    const reduce = this.reduce;
    this.T += dt;
    const T = this.T;

    // abrir a capa
    this.openT += (this.openTarget - this.openT) * Math.min(1, dt * (reduce ? 20 : 3.2));
    const oe = ease(clamp01(this.openT));
    this.hinge.rotation.y = -oe * PI * 0.97;
    this.holder.position.x = oe * W * 0.5;
    this.coShift += ((this.checkoutOpen && !this.narrow ? 1 : 0) - this.coShift) * Math.min(1, dt * 3);
    this.book.position.x = this.bookBase.x - this.coShift * 1.45;

    // flutuar + inclinar com o mouse + girar arrastando
    const fl = reduce ? 0 : Math.sin(T * 1.1) * 0.05;
    this.tilt.x += (this.pointer.y * 0.18 - this.tilt.x) * dt * 3;
    this.tilt.y += (this.pointer.x * 0.32 - this.tilt.y) * dt * 3;
    if (!this.dragging) {
      this.spinV *= 0.92;
      this.spin += this.spinV;
      this.spin *= 0.985;
    }
    if (this.phase === 'route') this.spin = Math.max(-0.55, Math.min(0.55, this.spin));
    this.book.rotation.x = -this.tilt.x + (this.phase === 'route' ? -0.08 * this.routeT : 0) + (reduce ? 0 : Math.sin(T * 0.7) * 0.02);
    this.book.rotation.y = this.tilt.y + this.spin + (this.phase === 'closed' && !reduce ? Math.sin(T * 0.5) * 0.18 - 0.25 : 0) * (1 - oe);
    this.holder.position.y = fl;

    // brilho na capa
    const sw = (T % 4) / 1.2;
    this.shine.material.opacity = sw < 1 ? Math.sin(sw * PI) * 0.9 * (1 - oe) : 0;
    this.shine.position.x = -W * 0.36 + sw * W * 0.86;
    this.goldLight.intensity = (0.6 * (1 - oe) + 0.25) * PI;

    this.tickStamp(dt);

    // tremida da câmera no impacto do carimbo
    if (this.shake > 0.001) {
      this.camera.position.set(this.camBase.x + (Math.random() - 0.5) * this.shake, this.camBase.y + (Math.random() - 0.5) * this.shake, this.camBase.z);
      this.shake *= 0.86;
    } else this.camera.position.copy(this.camBase);

    // rota: passaporte desce, globo sobe
    this.routeT += (this.routeTarget - this.routeT) * Math.min(1, dt * (reduce ? 20 : 2.2));
    const re = ease(Math.min(1, this.routeT));
    this.camera.lookAt(this.book.position.x * 0.6, this.bookBase.y * 0.4 + 0.32 * re, 0);
    this.book.position.y = this.bookBase.y - 0.55 * re;
    this.book.scale.setScalar(1 - 0.2 * re);
    const g = this.globe.group;
    g.visible = this.routeTarget > 0 || this.routeT > 0.02;
    if (g.visible) {
      g.scale.setScalar(Math.max(0.0001, easeOutBack(Math.min(1, this.routeT * 1.1))));
      g.position.set(this.book.position.x, this.bookBase.y + 1.12, -0.9);
      this.globe.update(dt, T, this.phase === 'route' && this.routeT > 0.55, this.routeT > 0.4);
    }

    // neve
    const sp = this.snowPos, sv = this.snowVel;
    for (let i = 0; i < sv.length; i++) {
      sp[i * 3 + 1] -= sv[i] * dt;
      sp[i * 3] += Math.sin(T + i) * 0.002;
      if (sp[i * 3 + 1] < -3) sp[i * 3 + 1] = 5;
    }
    (this.snow.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  }

  private tickStamp(dt: number) {
    const s = this.stampObj, tg = this.stampTarget;
    if (this.stampT >= 0) {
      this.stampT += dt * (this.reduce ? 3 : 1.25);
      const st = this.stampT;
      // impacto: dispara uma vez, mesmo que um frame lento pule a janela 0.70–0.72
      if (st >= 0.7 && !this.ctx.state.stamped) this.impact();
      if (st < 0.55) {
        const up = new THREE.Vector3(tg.x + 0.25, tg.y + 0.5, 1.4);
        s.position.lerpVectors(up, new THREE.Vector3(tg.x, tg.y, 0.32), ease(st / 0.55));
      } else if (st < 0.7) {
        const b = (st - 0.55) / 0.15;
        s.position.set(tg.x, tg.y, 0.32 - b * b * 0.26);
      } else if (st < 0.72) {
        s.position.set(tg.x, tg.y, 0.06);
      } else if (st < 1.4) {
        const c = ease((st - 0.72) / 0.68);
        s.position.set(tg.x + c * 0.3, tg.y + c * 0.4, 0.06 + c * 1.5);
      } else {
        s.visible = false;
        this.stampT = -1;
        this.doRoute();
      }
      s.rotation.z = Math.sin(st * 3) * 0.1;
    }

    if (this.burstT >= 0) {
      this.burstT += dt;
      const bp = this.burstPos;
      this.burst.material.opacity = Math.max(0, 1 - this.burstT / 1.1);
      this.burstVel.forEach((v, q) => {
        bp[q * 3] += v[0] * dt;
        bp[q * 3 + 1] += v[1] * dt - this.burstT * dt * 1.2;
        bp[q * 3 + 2] += v[2] * dt;
      });
      (this.burst.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      if (this.burstT > 1.2) this.burstT = -1;
    }
  }

  private impact() {
    this.ctx.state.stamped = true;
    this.refreshPages();
    this.shake = this.reduce ? 0 : 0.09;
    this.burstT = 0;
    const tg = this.stampTarget, bp = this.burstPos;
    this.burstVel = [];
    for (let q = 0; q < bp.length / 3; q++) {
      bp[q * 3] = tg.x;
      bp[q * 3 + 1] = tg.y;
      bp[q * 3 + 2] = 0.06;
      const an = Math.random() * PI * 2, sp = 0.6 + Math.random() * 1.6;
      this.burstVel.push([Math.cos(an) * sp, Math.sin(an) * sp, 0.4 + Math.random() * 1.2]);
    }
    (this.burst.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}
