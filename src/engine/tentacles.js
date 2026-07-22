// Living Superweapon — procedural verlet tentacles. A chain of point-masses swings from an anchor
// on the fighter; idle they sway with noise, in "reach" mode the tip is pulled hard at a target.
// Rendered as tapered spheres (shared geometry) added to the SCENE (world space), so the owning
// Fighter must call dispose() when it leaves play.
import * as THREE from 'three';
import { clamp, TAU } from '../core/util.js';

const SEG_GEO = new THREE.SphereGeometry(1, 10, 8);

export class Tentacle {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.n = opts.segs || 9;
    this.segLen = opts.segLen || 1.6;
    this.baseR = opts.radius || 0.55;
    this.phase = Math.random() * TAU;          // desync idle sway between tentacles
    this.side = opts.side || { x: 1, z: 0 };   // idle rest direction (local-ish)
    this.target = null;                        // Vector3-like → reach mode
    this.pts = [];
    for (let i = 0; i <= this.n; i++) this.pts.push({ x: 0, y: 6, z: 0, px: 0, py: 6, pz: 0 });
    this.mat = new THREE.MeshStandardMaterial({ color: opts.color || '#0f6f7f', emissive: opts.color2 || opts.color || '#4affd4', emissiveIntensity: 0.35, roughness: 0.55, metalness: 0.1 });
    this.tipMat = new THREE.MeshStandardMaterial({ color: opts.color2 || '#4affd4', emissive: opts.color2 || '#4affd4', emissiveIntensity: 1.6, roughness: 0.4 });
    this.meshes = [];
    for (let i = 1; i <= this.n; i++) {
      const m = new THREE.Mesh(SEG_GEO, i === this.n ? this.tipMat : this.mat);
      const t = i / this.n;
      m.scale.setScalar(this.baseR * (1.15 - t * 0.75) * (i === this.n ? 1.5 : 1));
      scene.add(m); this.meshes.push(m);
    }
    this.dead = false;
  }

  // anchor: world Vector3 of the root. time: game clock for sway.
  update(dt, anchor, time) {
    const p = this.pts, sub = clamp(dt, 0.001, 0.033);
    // pin root
    p[0].x = anchor.x; p[0].y = anchor.y; p[0].z = anchor.z;
    const reach = this.target;
    for (let i = 1; i <= this.n; i++) {
      const q = p[i];
      const vx = (q.x - q.px) * 0.94, vy = (q.y - q.py) * 0.94, vz = (q.z - q.pz) * 0.94; // damped verlet
      q.px = q.x; q.py = q.y; q.pz = q.z;
      q.x += vx; q.y += vy; q.z += vz;
      const t = i / this.n;
      if (reach) {
        // pull every point toward the line anchor→target, tip hardest
        const k = 26 * t * sub;
        q.x += (reach.x - q.x) * k * t; q.y += (reach.y - q.y) * k * t; q.z += (reach.z - q.z) * k * t;
      } else {
        // idle: slight gravity + layered sine sway out to the rest side
        q.y -= 14 * t * sub;
        const s = Math.sin(time * 1.7 + this.phase + i * 0.55) * 0.9 + Math.sin(time * 3.1 + this.phase * 2 + i) * 0.35;
        q.x += (this.side.x * (2.2 + s) * t) * sub * 8;
        q.z += (this.side.z * (2.2 + s) * t) * sub * 8;
        q.y += Math.cos(time * 2.2 + this.phase + i * 0.7) * t * sub * 6;
      }
      if (q.y < 0.3) q.y = 0.3;   // don't sink into the floor
    }
    // distance constraints (2 passes keeps it ropey but stable)
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < this.n; i++) {
        const a = p[i], b = p[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        const d = Math.hypot(dx, dy, dz) || 1e-5, diff = (d - this.segLen) / d;
        const wa = i === 0 ? 0 : 0.5, wb = i === 0 ? 1 : 0.5;
        a.x += dx * diff * wa; a.y += dy * diff * wa; a.z += dz * diff * wa;
        b.x -= dx * diff * wb; b.y -= dy * diff * wb; b.z -= dz * diff * wb;
      }
    }
    for (let i = 1; i <= this.n; i++) this.meshes[i - 1].position.set(p[i].x, p[i].y, p[i].z);
  }

  dispose() {
    if (this.dead) return; this.dead = true;
    for (const m of this.meshes) this.scene.remove(m);
    this.mat.dispose(); this.tipMat.dispose();
  }
}

// Build a fighter's tentacle set from def.tentacles = { count, segs, segLen, color, color2 }.
export function buildTentacles(scene, def) {
  const cfg = def.tentacles; if (!cfg) return null;
  const out = [];
  const n = cfg.count || 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + 0.6;
    out.push(new Tentacle(scene, {
      segs: cfg.segs || 9, segLen: cfg.segLen || 1.6, radius: cfg.radius || 0.55,
      color: cfg.color || def.colors.secondary, color2: cfg.color2 || def.colors.accent,
      side: { x: Math.cos(a), z: Math.sin(a) },
    }));
  }
  return out;
}
