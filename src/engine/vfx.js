// Living Superweapon — transient 3D effects: explosions, shockwaves, lightning, rings, flashes, scorch.
import * as THREE from 'three';
import { rand, TAU, lerp } from '../core/util.js';

const addMat = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });

export class VFX {
  constructor(world, particles) {
    this.world = world; this.scene = world.scene; this.P = particles;
    this.fx = [];
    this.lightPool = [];
    this.scorches = [];
    this._sphere = new THREE.SphereGeometry(1, 16, 12);
    this._ring = new THREE.RingGeometry(0.86, 1, 48);
    this._decalGeo = new THREE.CircleGeometry(1, 32);
  }

  _add(o) { this.fx.push(o); return o; }

  borrowLight(color, intensity, dist) {
    let l = this.lightPool.pop();
    if (!l) { l = new THREE.PointLight(0xffffff, 1, 100); this.scene.add(l); }
    l.color.set(color); l.intensity = intensity; l.distance = dist; l.visible = true;
    return l;
  }
  returnLight(l) { l.visible = false; l.intensity = 0; this.lightPool.push(l); }

  flash(pos, color = '#fff', size = 6, life = 0.18) {
    const m = new THREE.Mesh(this._sphere, addMat(color, 1));
    m.position.copy(pos); m.scale.setScalar(size * 0.4); this.scene.add(m);
    const l = this.borrowLight(color, 6, size * 6);
    l.position.copy(pos);
    let t = 0;
    this._add({
      update: (dt) => {
        t += dt; const k = t / life;
        m.scale.setScalar(size * (0.4 + k * 0.9));
        m.material.opacity = Math.max(0, 0.85 * (1 - k));
        l.intensity = Math.max(0, 6 * (1 - k));
        return k >= 1;
      },
      dispose: () => { this.scene.remove(m); m.material.dispose(); this.returnLight(l); },
    });
  }

  // Big energy explosion: flash + fireball + smoke + light + sparks (+ optional scorch)
  explode(pos, opt = {}) {
    const color = opt.color || '#ffd15a', color2 = opt.color2 || '#ff5a2a';
    const radius = opt.radius || 12, power = opt.power || 1;
    this.flash(pos, '#ffffff', radius * 0.3, 0.14);
    // fireball shell
    const shell = new THREE.Mesh(this._sphere, addMat(color, 0.8));
    shell.position.copy(pos); shell.scale.setScalar(radius * 0.3); this.scene.add(shell);
    const l = this.borrowLight(color, 10 * power, radius * 8); l.position.copy(pos);
    let t = 0; const life = 0.5 + power * 0.15;
    const c1 = new THREE.Color(color), c2 = new THREE.Color(color2);   // once per explosion, not per frame
    this._add({
      update: (dt) => {
        t += dt; const k = t / life;
        shell.scale.setScalar(radius * (0.3 + k * 1.1));
        shell.material.opacity = Math.max(0, 0.9 * (1 - k));
        shell.material.color.lerpColors(c1, c2, k);
        l.intensity = Math.max(0, 10 * power * (1 - k * k));
        return k >= 1;
      },
      dispose: () => { this.scene.remove(shell); shell.material.dispose(); this.returnLight(l); },
    });
    // sparks + embers + smoke
    this.P.burst(pos.x, pos.y, pos.z, { count: 26 + power * 14, speed: 20 + power * 10, life: 0.6, size: 2.6, color: ['#ffffff', color, color2], up: 4, grav: 10, drag: 1.3 });
    this.P.burst(pos.x, pos.y, pos.z, { count: 10, speed: 7, life: 1.1, size: 4.5, color: ['#20222c', '#15161d'], up: 6, grav: -3, drag: 1.1 });
    if (opt.scorch !== false && pos.y < 4) this.scorch(pos, radius * 0.6, color2);
    this.world.shake(0.6 + power * 0.7);
  }

  // Ground shockwave: expanding flat ring + energy dome + dust + lightning skirt.
  shockwave(pos, opt = {}) {
    const color = opt.color || '#7fe0ff', power = opt.power || 1, maxR = opt.radius || 28;
    // flat ring
    const ring = new THREE.Mesh(this._ring, addMat(color, 0.9));
    ring.rotation.x = -Math.PI / 2; ring.position.set(pos.x, 0.3, pos.z); ring.scale.setScalar(2); this.scene.add(ring);
    // second ring (delayed)
    const ring2 = new THREE.Mesh(this._ring, addMat('#ffffff', 0.7));
    ring2.rotation.x = -Math.PI / 2; ring2.position.set(pos.x, 0.35, pos.z); ring2.scale.setScalar(1); this.scene.add(ring2);
    // dome
    const dome = new THREE.Mesh(this._sphere, addMat(color, 0.24));
    dome.position.set(pos.x, 0, pos.z); dome.scale.setScalar(3); this.scene.add(dome);
    let t = 0; const life = 0.5 + power * 0.14;
    this._add({
      update: (dt) => {
        t += dt; const k = t / life; const e = 1 - Math.pow(1 - k, 2);
        ring.scale.setScalar(2 + e * maxR); ring.material.opacity = 0.9 * (1 - k);
        ring2.scale.setScalar(1 + Math.max(0, (k - 0.12)) * maxR * 1.15); ring2.material.opacity = 0.7 * (1 - k);
        dome.scale.set(3 + e * maxR, 3 + e * maxR * 0.5, 3 + e * maxR); dome.material.opacity = 0.32 * (1 - k);
        return k >= 1;
      },
      dispose: () => { [ring, ring2, dome].forEach(m => { this.scene.remove(m); m.material.dispose(); }); },
    });
    // dust ring particles
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * TAU;
      this.P.spawn({ x: pos.x + Math.cos(a) * 3, y: 0.5, z: pos.z + Math.sin(a) * 3, vx: Math.cos(a) * (16 + power * 8), vz: Math.sin(a) * (16 + power * 8), vy: rand(2, 8), life: 0.7, size: 5, color: ['#4a4a55', color], grav: 6, drag: 1.5 });
    }
    this.lightning(pos, { color, count: 4 + (power * 3 | 0), radius: maxR * 0.7, height: 10 + power * 8 });
    this.world.shake(0.8 + power);
  }

  // Branching lightning bolts from a point, flicker briefly.
  lightning(pos, opt = {}) {
    const color = opt.color || '#bfefff', count = opt.count || 5, radius = opt.radius || 20, height = opt.height || 16;
    // one fixed-size buffer per strike, refilled in place on each flicker (no per-flicker allocations)
    const arr = new Float32Array((count * 5 + 3 * 6) * 6);
    let w = 0;
    const bolt = (x0, y0, z0, x1, y1, z1, segs) => {
      let px = x0, py = y0, pz = z0;
      for (let s = 1; s <= segs; s++) {
        const t = s / segs;
        const nx = lerp(x0, x1, t) + rand(-2, 2), ny = lerp(y0, y1, t) + rand(-1.5, 1.5), nz = lerp(z0, z1, t) + rand(-2, 2);
        arr[w++] = px; arr[w++] = py; arr[w++] = pz; arr[w++] = nx; arr[w++] = ny; arr[w++] = nz;
        px = nx; py = ny; pz = nz;
      }
    };
    const build = () => {
      w = 0;
      for (let i = 0; i < count; i++) {
        const a = rand(0, TAU), r = rand(radius * 0.3, radius);
        bolt(pos.x, pos.y + 0.5, pos.z, pos.x + Math.cos(a) * r, pos.y + rand(0, 3), pos.z + Math.sin(a) * r, 5);
      }
      // upward strikes
      for (let i = 0; i < 3; i++) bolt(pos.x + rand(-4, 4), pos.y, pos.z + rand(-4, 4), pos.x + rand(-6, 6), pos.y + height, pos.z + rand(-6, 6), 6);
    };
    build();
    const geo = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(arr, 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', attr);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const seg = new THREE.LineSegments(geo, mat); this.scene.add(seg);
    const l = this.borrowLight(color, 6, radius * 3); l.position.copy(pos); l.position.y += 3;
    let t = 0; const life = 0.26; let flick = 0;
    this._add({
      update: (dt) => {
        t += dt; flick += dt;
        if (flick > 0.04) { flick = 0; build(); attr.needsUpdate = true; }
        mat.opacity = Math.max(0, 1 - t / life);
        l.intensity = Math.max(0, 6 * (1 - t / life));
        return t >= life;
      },
      dispose: () => { this.scene.remove(seg); geo.dispose(); mat.dispose(); this.returnLight(l); },
    });
  }

  // generic expanding ring (air / hit)
  ring(pos, opt = {}) {
    const color = opt.color || '#fff', r0 = opt.r0 || 1, r1 = opt.r1 || 10, life = opt.life || 0.35, y = opt.y == null ? pos.y : opt.y, flat = opt.flat;
    const m = new THREE.Mesh(this._ring, addMat(color, opt.opacity == null ? 0.9 : opt.opacity));
    if (flat) m.rotation.x = -Math.PI / 2; else m.lookAt && (m.quaternion.copy(this.world.camera.quaternion));
    m.position.set(pos.x, y, pos.z); m.scale.setScalar(r0); this.scene.add(m);
    let t = 0;
    this._add({
      update: (dt) => { t += dt; const k = t / life; m.scale.setScalar(lerp(r0, r1, 1 - Math.pow(1 - k, 2))); m.material.opacity *= (1 - dt / life * 1.05); return k >= 1; },
      dispose: () => { this.scene.remove(m); m.material.dispose(); },
    });
  }

  // Dark scorch decal on the ground that lingers then fades.
  scorch(pos, radius = 8, tint = '#000') {
    const mat = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.55, depthWrite: false });
    mat.color.multiplyScalar(0.2);
    const m = new THREE.Mesh(this._decalGeo, mat);
    m.rotation.x = -Math.PI / 2; m.position.set(pos.x, 0.06 + this.scorches.length * 0.002, pos.z); m.scale.setScalar(radius);
    this.scene.add(m); this.scorches.push(m);
    if (this.world.flattenGrass) this.world.flattenGrass(pos.x, pos.z, radius);   // burned ground = burned grass
    if (this.scorches.length > 40) { const old = this.scorches.shift(); this.scene.remove(old); old.material.dispose(); }
  }

  _impactTex() {
    if (this._itex) return this._itex;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'); x.translate(64, 64);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 44); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, 44, 0, TAU); x.fill();
    x.fillStyle = '#fff'; const spikes = 9; x.beginPath();
    for (let i = 0; i < spikes * 2; i++) { const a = i / (spikes * 2) * TAU; const r = (i % 2 === 0) ? 62 : 20; x[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    x.closePath(); x.fill();
    this._itex = new THREE.CanvasTexture(c); return this._itex;
  }

  // comic-style impact star (billboard, draws over everything)
  impactStar(pos, size, color = '#fff', life = 0.2) {
    const mat = new THREE.SpriteMaterial({ map: this._impactTex(), color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, rotation: rand(0, TAU) });
    const s = new THREE.Sprite(mat); s.position.copy(pos); s.scale.setScalar(size * 0.3); this.scene.add(s);
    let t = 0; const spin = rand(-3, 3);
    this._add({ update: (dt) => { t += dt; const k = t / life; s.scale.setScalar(size * (0.3 + easeOut(k) * 0.9)); mat.opacity = Math.max(0, 1 - k * k); mat.rotation += spin * dt; return k >= 1; }, dispose: () => { this.scene.remove(s); mat.dispose(); } });
  }

  // VIOLENT melee impact: white star + colored star + spray + shards + ring + shake
  impact(pos, dir, opt = {}) {
    const color = opt.color || '#ffffff', power = opt.power || 1;
    this.impactStar(pos, 7 + power * 6, '#ffffff', 0.16);
    if (power > 0.9) this.impactStar(pos, 5 + power * 5, color, 0.24);
    this.flash(pos, '#ffffff', 3 + power * 3, 0.09);
    const d = dir ? { x: dir.x, z: dir.z } : null;
    this.P.burst(pos.x, pos.y, pos.z, { count: 10 + (power * 10 | 0), speed: 30 + power * 20, life: 0.4, size: 2.8, color: ['#fff', color], dir: d, spread: 0.55, up: power * 4, grav: 9, drag: 2.2 });
    this.P.burst(pos.x, pos.y, pos.z, { count: 5 + (power * 4 | 0), speed: 16 + power * 10, life: 0.55, size: 3.6, color: [color, '#fff'], up: 6, grav: 11, drag: 1.5, shrink: false });
    this.ring(pos, { color: '#fff', r0: 1, r1: 5 + power * 5, life: 0.2, opacity: 0.9 });
    this.world.shake(0.4 + power);
  }

  clearScorches() { for (const m of this.scorches) { this.scene.remove(m); m.material.dispose(); } this.scorches.length = 0; }

  update(dt) {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      if (this.fx[i].update(dt)) { this.fx[i].dispose(); this.fx.splice(i, 1); }
    }
  }
}
function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
