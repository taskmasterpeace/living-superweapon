// Living Superweapon — 3D additive particle system (single Points buffer, CPU sim).
import * as THREE from 'three';
import { rand, TAU } from '../core/util.js';

const VERT = `
attribute float aSize;
attribute vec3 aColor;
attribute float aAlpha;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = aColor; vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (300.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d);
  if (r > 0.25) discard;
  float a = smoothstep(0.25, 0.0, r);
  gl_FragColor = vec4(vColor, a * vAlpha);
}`;

export class Particles3D {
  constructor(scene, max = 6000) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    // sim data
    this.vx = new Float32Array(max); this.vy = new Float32Array(max); this.vz = new Float32Array(max);
    this.life = new Float32Array(max); this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max);
    this.size0 = new Float32Array(max); this.shrink = new Uint8Array(max);
    this._c = new THREE.Color();

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, 0);
    this.geo = geo;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  spawn(o) {
    let i;
    if (this.n < this.max) i = this.n++;
    else i = (Math.random() * this.max) | 0; // recycle
    const i3 = i * 3;
    this.pos[i3] = o.x; this.pos[i3 + 1] = o.y; this.pos[i3 + 2] = o.z;
    this._c.set(o.color || '#fff');
    this.col[i3] = this._c.r; this.col[i3 + 1] = this._c.g; this.col[i3 + 2] = this._c.b;
    this.vx[i] = o.vx || 0; this.vy[i] = o.vy || 0; this.vz[i] = o.vz || 0;
    this.life[i] = this.maxLife[i] = o.life || 0.5;
    this.grav[i] = o.grav || 0; this.drag[i] = o.drag == null ? 1.6 : o.drag;
    this.size[i] = this.size0[i] = o.size || 2.4;
    this.shrink[i] = o.shrink === false ? 0 : 1;
    this.alpha[i] = 1;
  }

  // radial / directional burst
  burst(x, y, z, opt = {}) {
    const n = opt.count || 14, spd = opt.speed || 22;
    const dir = opt.dir; // {x,z} on ground, optional
    for (let i = 0; i < n; i++) {
      let vx, vy, vz;
      if (dir) {
        const a = Math.atan2(dir.z, dir.x) + rand(-(opt.spread || 0.5), (opt.spread || 0.5));
        const s = spd * rand(0.4, 1);
        vx = Math.cos(a) * s; vz = Math.sin(a) * s; vy = (opt.up || 0) + rand(0, opt.upSpread || 6);
      } else {
        const a = rand(0, TAU), p = Math.acos(rand(-1, 1)); const s = spd * rand(0.35, 1);
        vx = Math.sin(p) * Math.cos(a) * s; vz = Math.sin(p) * Math.sin(a) * s; vy = Math.cos(p) * s * 0.7 + (opt.up || 0);
      }
      this.spawn({
        x, y, z, vx, vy, vz,
        life: (opt.life || 0.5) * rand(0.6, 1.15),
        size: (opt.size || 2.6) * rand(0.6, 1.3),
        color: Array.isArray(opt.color) ? opt.color[(Math.random() * opt.color.length) | 0] : (opt.color || '#fff'),
        grav: opt.grav || 0, drag: opt.drag == null ? 1.6 : opt.drag, shrink: opt.shrink,
      });
    }
  }

  update(dt) {
    const n = this.n;
    let alive = 0, high = 0;                       // high = last live slot + 1, so `n` can shrink back down
    for (let i = 0; i < n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const i3 = i * 3;
      if (this.life[i] <= 0) { this.alpha[i] = 0; this.size[i] = 0; continue; }
      alive++; high = i + 1;
      const dragF = Math.exp(-this.drag[i] * dt);
      this.vx[i] *= dragF; this.vz[i] *= dragF; this.vy[i] *= dragF;
      this.vy[i] -= this.grav[i] * dt;
      this.pos[i3] += this.vx[i] * dt; this.pos[i3 + 1] += this.vy[i] * dt; this.pos[i3 + 2] += this.vz[i] * dt;
      if (this.pos[i3 + 1] < 0) { this.pos[i3 + 1] = 0; this.vy[i] *= -0.3; this.vx[i] *= 0.7; this.vz[i] *= 0.7; }
      const t = this.life[i] / this.maxLife[i];
      this.alpha[i] = t;
      this.size[i] = this.shrink[i] ? this.size0[i] * t : this.size0[i];
    }
    if (alive === 0) this.n = 0;                   // pool fully idle → next spawns start at slot 0
    else if (high < this.n * 0.5) this.n = high;   // the live tail ended early → reclaim the dead top half
    this.geo.setDrawRange(0, this.n);
    if (this.n === 0) return;                      // nothing to upload
    for (const key of ['position', 'aColor', 'aSize', 'aAlpha']) {
      const at = this.geo.attributes[key];
      at.clearUpdateRanges();
      at.addUpdateRange(0, this.n * at.itemSize);  // upload only the used slots, not all 48k floats
      at.needsUpdate = true;
    }
  }
}
