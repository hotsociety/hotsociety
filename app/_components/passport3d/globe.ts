import * as THREE from 'three';
import { BRAND, ROUTE } from './config';
import { LAND } from './land';
import { makeCanvasTex } from './textures';
import type { PassportFonts } from './types';

const GR = 0.72; // raio do globo

function ll(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const th = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}

function inPoly(x: number, y: number, p: [number, number][]): boolean {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i];
    const [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function arcPoints(a: { lat: number; lon: number }, b: { lat: number; lon: number }): THREE.Vector3[] {
  const A = ll(a.lat, a.lon, 1).normalize();
  const B = ll(b.lat, b.lon, 1).normalize();
  const om = A.angleTo(B);
  const pts: THREE.Vector3[] = [];
  for (let s = 0; s <= 80; s++) {
    const t = s / 80;
    const v = A.clone()
      .multiplyScalar(Math.sin((1 - t) * om) / Math.sin(om))
      .add(B.clone().multiplyScalar(Math.sin(t * om) / Math.sin(om)));
    v.normalize().multiplyScalar(GR * (1.01 + Math.sin(Math.PI * t) * (0.06 + 0.16 * Math.min(1, om))));
    pts.push(v);
  }
  return pts;
}

const angWrap = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

function makePlane(): THREE.Group {
  const plane = new THREE.Group();
  const pm = new THREE.MeshStandardMaterial({ color: 0xf2f4f7, roughness: 0.35, metalness: 0.2 });
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.006, 0.085, 10), pm);
  fus.rotation.x = Math.PI / 2;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.022, 10), pm);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 0.053;
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.003, 0.022), pm);
  wing.position.z = 0.004;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.003, 0.012), pm);
  tail.position.z = -0.036;
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.02, 0.014), new THREE.MeshBasicMaterial({ color: 0xd9b566 }));
  fin.position.set(0, 0.01, -0.036);
  plane.add(fus, nose, wing, tail, fin);
  plane.scale.setScalar(1.25);
  return plane;
}

interface City {
  dot: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  lab: THREE.Sprite;
  p: THREE.Vector3;
  on: boolean;
}

/** Globo com a rota GRU → … → DXB: arcos dourados, avião voando e órbita final. */
export class Globe {
  readonly group = new THREE.Group();
  private spinG = new THREE.Group();
  private cities: City[];
  private arcs: { curve: THREE.CatmullRomCurve3; geo: THREE.TubeGeometry; n: number }[] = [];
  private plane = makePlane();
  private orbitPlane: THREE.Group;
  private trail: THREE.Points;
  private trailPos: Float32Array;
  private trailI = 0;
  private flyT = 0;
  private readonly seg: number;
  private readonly reduce: boolean;
  private tmpQ = new THREE.Quaternion();

  constructor(opts: { reduce: boolean; dot: THREE.Texture; fonts: PassportFonts; anisotropy: number }) {
    const { reduce, dot, fonts: F } = opts;
    this.reduce = reduce;
    this.seg = reduce ? 0.5 : 1.6;
    this.group.visible = false;
    this.group.add(this.spinG);
    const spinG = this.spinG;

    spinG.add(new THREE.Mesh(new THREE.SphereGeometry(GR, 64, 48), new THREE.MeshStandardMaterial({ color: 0x161a21, roughness: 0.55, metalness: 0.15 })));

    // atmosfera
    this.group.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(GR * 1.1, 64, 48),
        new THREE.ShaderMaterial({
          transparent: true,
          side: THREE.BackSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          vertexShader: 'varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
          fragmentShader: 'varying vec3 vN;void main(){float i=pow(max(0.0,0.72-dot(vN,vec3(0.0,0.0,1.0))),3.0);gl_FragColor=vec4(0.62,0.72,0.86,1.0)*i*0.9;}',
        }),
      ),
    );

    // meridianos e paralelos
    const gratM = new THREE.LineBasicMaterial({ color: 0x3a404a, transparent: true, opacity: 0.55 });
    for (let la = -60; la <= 60; la += 30) {
      const pts: THREE.Vector3[] = [];
      for (let lo = -180; lo <= 180; lo += 6) pts.push(ll(la, lo, GR * 1.001));
      spinG.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gratM));
    }
    for (let lo = -180; lo < 180; lo += 30) {
      const pts: THREE.Vector3[] = [];
      for (let la = -90; la <= 90; la += 5) pts.push(ll(la, lo, GR * 1.001));
      spinG.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gratM));
    }

    // continentes em pontos (distribuição de Fibonacci)
    const N = reduce ? 6000 : 11000;
    const land: number[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const yy = 1 - (2 * (i + 0.5)) / N;
      const rr = Math.sqrt(1 - yy * yy);
      const th = i * golden;
      const vx = Math.cos(th) * rr, vz = Math.sin(th) * rr;
      const lat = (Math.asin(yy) * 180) / Math.PI;
      let lon = (Math.atan2(vz, -vx) * 180) / Math.PI - 180;
      if (lon < -180) lon += 360;
      for (const poly of LAND) {
        if (inPoly(lon, lat, poly)) {
          const p = ll(lat, lon, GR * 1.004);
          land.push(p.x, p.y, p.z);
          break;
        }
      }
    }
    const landG = new THREE.BufferGeometry();
    landG.setAttribute('position', new THREE.Float32BufferAttribute(land, 3));
    spinG.add(new THREE.Points(landG, new THREE.PointsMaterial({ size: 0.02, map: dot, transparent: true, depthWrite: false, color: 0xd5dbe5, opacity: 1 })));

    // cidades
    this.cities = ROUTE.map((c) => {
      const p = ll(c.lat, c.lon, GR * 1.006);
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), new THREE.MeshBasicMaterial({ color: 0x6a707b }));
      d.position.copy(p);
      spinG.add(d);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.03, 0.038, 32),
        new THREE.MeshBasicMaterial({ color: 0xd9b566, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.position.copy(p);
      ring.lookAt(p.clone().multiplyScalar(2));
      spinG.add(ring);
      const lt = makeCanvasTex(
        320,
        110,
        (g, w) => {
          g.fillStyle = 'rgba(12,15,19,.88)';
          g.fillRect(0, 10, w, 90);
          g.fillStyle = BRAND.gold;
          g.fillRect(0, 10, 8, 90);
          g.fillStyle = BRAND.snow;
          g.font = `800 46px ${F.display}`;
          g.textAlign = 'left';
          g.fillText(c.code, 26, 62);
          g.fillStyle = '#A3A9B4';
          g.font = `600 22px ${F.mono}`;
          g.fillText(c.country, 26, 90);
        },
        opts.anisotropy,
      );
      const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: lt.tex, transparent: true, depthWrite: false, depthTest: true, opacity: 0 }));
      lab.scale.set(0.26, 0.09, 1);
      lab.position.copy(ll(c.lat, c.lon, GR * 1.18));
      spinG.add(lab);
      return { dot: d, ring, lab, p, on: false };
    });

    // arcos de voo
    for (let i = 0; i < ROUTE.length - 1; i++) {
      const curve = new THREE.CatmullRomCurve3(arcPoints(ROUTE[i], ROUTE[i + 1]));
      const geo = new THREE.TubeGeometry(curve, 160, 0.0065, 6, false);
      geo.setDrawRange(0, 0);
      spinG.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xd9b566 })));
      this.arcs.push({ curve, geo, n: geo.index ? geo.index.count : 0 });
    }

    this.plane.visible = false;
    spinG.add(this.plane);
    this.orbitPlane = this.plane.clone();
    this.orbitPlane.visible = false;
    this.group.add(this.orbitPlane);

    const trailN = 60;
    this.trailPos = new Float32Array(trailN * 3);
    const trailG = new THREE.BufferGeometry();
    trailG.setAttribute('position', new THREE.BufferAttribute(this.trailPos, 3));
    this.trail = new THREE.Points(trailG, new THREE.PointsMaterial({ size: 0.02, map: dot, transparent: true, depthWrite: false, color: 0xd9b566, opacity: 0.7 }));
    this.trail.visible = false;
    this.group.add(this.trail);

    this.group.rotation.x = 0.18;
    this.reset();
  }

  reset() {
    this.flyT = 0;
    this.arcs.forEach((a) => a.geo.setDrawRange(0, 0));
    this.cities.forEach((c) => (c.on = false));
    this.plane.visible = false;
    this.orbitPlane.visible = false;
    this.trail.visible = false;
    const gru = ll(ROUTE[0].lat, ROUTE[0].lon, 1);
    this.spinG.rotation.y = Math.atan2(-gru.x, gru.z);
  }

  /**
   * @param flying   true quando a rota está ativa e o globo já cresceu o suficiente
   * @param firstLit acende a cidade de origem
   */
  update(dt: number, T: number, flying: boolean, firstLit: boolean) {
    const { spinG, arcs, cities, seg, reduce } = this;
    const NA = arcs.length;
    if (flying) this.flyT += dt;
    cities[0].on = firstLit;

    if (this.flyT < seg * NA) {
      const k = Math.min(NA - 1, Math.floor(this.flyT / seg));
      const u = Math.min(1, (this.flyT - k * seg) / seg);
      const ue = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      arcs.forEach((a, i) => {
        const f = i < k ? 1 : i === k ? ue : 0;
        const cnt = Math.floor(a.n * f);
        a.geo.setDrawRange(0, cnt - (cnt % 3));
      });
      for (let ci = 1; ci <= NA; ci++) cities[ci].on = ci <= k || (ci === k + 1 && u >= 0.999);
      const cp = arcs[k].curve.getPointAt(Math.min(0.999, ue));
      const np = arcs[k].curve.getPointAt(Math.min(1, ue + 0.01));
      this.plane.visible = this.flyT > 0;
      this.plane.position.copy(cp);
      this.plane.up.copy(cp).normalize().applyQuaternion(spinG.getWorldQuaternion(this.tmpQ));
      this.plane.lookAt(spinG.localToWorld(np.clone()));
      this.orbitPlane.visible = false;
      this.trail.visible = false;
      const tgt = Math.atan2(-cp.x, cp.z);
      spinG.rotation.y += angWrap(tgt - spinG.rotation.y) * Math.min(1, dt * 2.4);
    } else {
      arcs.forEach((a) => a.geo.setDrawRange(0, a.n - (a.n % 3)));
      cities.forEach((c) => (c.on = true));
      this.plane.visible = false;
      this.orbitPlane.visible = true;
      this.trail.visible = true;
      const oa = (this.flyT - seg * NA) * (reduce ? 0.3 : 0.9);
      const R = GR * 1.32, ti = 0.42;
      const orb = (a: number) => new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R * Math.sin(ti), Math.sin(a) * R * Math.cos(ti));
      const op = orb(oa), on = orb(oa + 0.05);
      this.orbitPlane.position.copy(op);
      this.orbitPlane.up.set(0, 1, 0).applyQuaternion(this.group.getWorldQuaternion(this.tmpQ));
      this.orbitPlane.lookAt(this.group.localToWorld(on.clone()));
      const tp = this.trailPos;
      tp[this.trailI * 3] = op.x;
      tp[this.trailI * 3 + 1] = op.y;
      tp[this.trailI * 3 + 2] = op.z;
      this.trailI = (this.trailI + 1) % (tp.length / 3);
      (this.trail.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      spinG.rotation.y += dt * (reduce ? 0.05 : 0.18);
    }

    const wp = new THREE.Vector3();
    cities.forEach((c, i) => {
      c.dot.material.color.setHex(c.on ? 0xd9b566 : 0x6a707b);
      c.ring.material.opacity = c.on ? 0.85 : 0;
      c.ring.scale.setScalar(c.on && !reduce ? 1 + 0.35 * Math.sin(T * 4 + i) : 1);
      wp.copy(c.p).applyQuaternion(spinG.quaternion).applyQuaternion(this.group.quaternion);
      const front = wp.z > 0.05;
      const m = c.lab.material as THREE.SpriteMaterial;
      m.opacity += ((c.on && front ? 1 : 0) - m.opacity) * Math.min(1, dt * 6);
    });
  }
}
