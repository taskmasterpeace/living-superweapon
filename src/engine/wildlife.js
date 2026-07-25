// THRESHOLD — THE LIVING STREET. Birds over the rooftops and litter blowing along the kerb.
//
// This layer only WATCHES the city — nothing in gameplay reads it, nothing collides with it, and
// it never allocates during a match. The whole system is TWO instanced draws and two fixed-size
// pools of typed arrays, built ONCE in the World constructor and re-seeded (never rebuilt) when
// the city changes, exactly like the crowd. That is the entire optimisation story: a bird costs
// one matrix write per frame and nothing else.
//
// ⚠ It is ticked from world.render(), NOT from game.update — the ATLAS map tool has a World and
// no Game, and the streets should be alive in the tool as well as in a match.
//
// The birds are not decoration. They ROOST at night, they PERCH on real rooftops taken from the
// city's own cover boxes, and they break for the sky when game.noise() reports something loud
// nearby — the same broadcast the AI hears. A flock scattering off a roof is usually the first
// thing that tells you a fight has started two blocks away.
import * as THREE from 'three';

const BIRDS = 64, LITTER = 40;
const FLY = 0, PERCH = 1, FLEE = 2;

const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3();

// A bird seen from a city street is a silhouette, not a model: two swept triangles meeting at the
// body. Squashing the instance in Y drops the wingtips, which reads as a wingbeat from any real
// distance and costs nothing but the matrix we were already writing.
function birdGeo() {
  const g = new THREE.BufferGeometry();
  const v = new Float32Array([
    0, 0, 0.30,  -1.15, 0.42, -0.30,  -0.42, 0, -0.42,      // left wing
    0, 0, 0.30,   0.42, 0, -0.42,      1.15, 0.42, -0.30,   // right wing
  ]);
  g.setAttribute('position', new THREE.BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

export class Wildlife {
  constructor(scene) {
    this.scene = scene;
    this.enabled = true;
    this.arena = 240;
    this.roofs = [];                       // [x, y, z] perch points taken from the city's cover
    this.night = 0;                        // 0 day … 1 night — drives roosting
    this.wind = 0.35;

    // ---- birds: one draw ----
    const bm = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, metalness: 0,
                                                side: THREE.DoubleSide });
    this.birds = new THREE.InstancedMesh(birdGeo(), bm, BIRDS);
    this.birds.frustumCulled = false; this.birds.castShadow = false; this.birds.receiveShadow = false;
    this.birds.renderOrder = 3;
    const col = new THREE.Color();
    // city birds: pigeon greys, crow black, the odd gull. No purple.
    const PLUME = ['#2b2723', '#3d3831', '#57514733', '#6b6459', '#8e877a', '#c9c2b4'];
    for (let i = 0; i < BIRDS; i++) this.birds.setColorAt(i, col.set(PLUME[i % PLUME.length]).offsetHSL(0, 0, (Math.random() - 0.5) * 0.06));

    this.bx = new Float32Array(BIRDS); this.by = new Float32Array(BIRDS); this.bz = new Float32Array(BIRDS);
    this.vx = new Float32Array(BIRDS); this.vy = new Float32Array(BIRDS); this.vz = new Float32Array(BIRDS);
    this.flap = new Float32Array(BIRDS); this.flock = new Uint8Array(BIRDS);
    this.bst = new Uint8Array(BIRDS); this.bt = new Float32Array(BIRDS);
    this.scale = new Float32Array(BIRDS);

    // flock anchors — each wheels around its own drifting point, which is what makes a sky read as
    // several groups of birds rather than one cloud of independent dots
    this.FL = 4;
    this.fx = new Float32Array(this.FL); this.fz = new Float32Array(this.FL);
    this.fy = new Float32Array(this.FL); this.fa = new Float32Array(this.FL);

    // ---- litter: one draw ----
    const lg = new THREE.PlaneGeometry(1, 1.35);
    const lm = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, metalness: 0,
                                                side: THREE.DoubleSide });
    this.litter = new THREE.InstancedMesh(lg, lm, LITTER);
    this.litter.frustumCulled = false; this.litter.castShadow = false; this.litter.receiveShadow = false;
    const LIT = ['#cfc7b2', '#b9ae93', '#8e9a6a', '#a8895c', '#d8d3c4'];   // paper, leaves, grit
    for (let i = 0; i < LITTER; i++) this.litter.setColorAt(i, col.set(LIT[i % LIT.length]));
    this.lx = new Float32Array(LITTER); this.ly = new Float32Array(LITTER); this.lz = new Float32Array(LITTER);
    this.lvx = new Float32Array(LITTER); this.lvz = new Float32Array(LITTER);
    this.lr = new Float32Array(LITTER); this.lspin = new Float32Array(LITTER); this.lsz = new Float32Array(LITTER);

    this.nBirds = BIRDS; this.nLitter = LITTER;     // live counts — the quality tier trims these
    scene.add(this.birds); scene.add(this.litter);
    this.setCity(240, null, null);
  }

  // Re-seed for a new city. NEVER reallocates — this is why a city rebuild does not churn memory.
  setCity(arena, cover, world) {
    this.arena = arena || 240;
    this.world = world || this.world;
    this.roofs.length = 0;
    if (cover) {
      for (const c of cover) {
        if (!c || c.destroyed || c.top == null) continue;
        if (c.top < 14) continue;                         // a kerb is not a perch
        this.roofs.push(c.x, c.top + 0.6, c.z);
        if (this.roofs.length >= 240 * 3) break;          // plenty; keeps the pick cheap
      }
    }
    const A = this.arena;
    for (let f = 0; f < this.FL; f++) this._reflock(f);
    for (let i = 0; i < BIRDS; i++) {
      this.flock[i] = i % this.FL;
      // ⚠ sized for READABILITY, not for zoology. At 1u ≈ 0.19m a true-scale gull is under a metre
      // and disappears against a grey city from any useful camera; these read as birds at the
      // isometric match camera AND from the map tool's wide shot, which is the whole point of them.
      this.scale[i] = 2.4 + Math.random() * 1.6;
      this._launch(i, (Math.random() * 2 - 1) * A * 0.8, 60 + Math.random() * 90, (Math.random() * 2 - 1) * A * 0.8);
      if (Math.random() < 0.35) this._perch(i);
    }
    for (let i = 0; i < LITTER; i++) this._reseedLitter(i, true);
    this._writeAll();
  }

  setQuality(tier) {
    // the adaptive tier trims the flock before it trims anything the player is aiming at
    this.nBirds = tier <= 0 ? 18 : tier === 1 ? 40 : BIRDS;
    this.nLitter = tier <= 0 ? 0 : tier === 1 ? 22 : LITTER;
    this._writeAll();                              // park the hidden ones out of sight
  }

  _reflock(f) {
    const A = this.arena;
    this.fx[f] = (Math.random() * 2 - 1) * A * 0.66;
    this.fz[f] = (Math.random() * 2 - 1) * A * 0.66;
    // just above the roofline — city birds wheel around the buildings, not in the stratosphere,
    // and that is also the band where they read against something instead of against empty sky
    this.fy[f] = 52 + Math.random() * 78;
    this.fa[f] = Math.random() * Math.PI * 2;
  }

  _launch(i, x, y, z) {
    this.bx[i] = x; this.by[i] = y; this.bz[i] = z;
    const a = Math.random() * Math.PI * 2;
    this.vx[i] = Math.cos(a) * 22; this.vy[i] = 0; this.vz[i] = Math.sin(a) * 22;
    this.bst[i] = FLY; this.bt[i] = 2 + Math.random() * 8;
    this.flap[i] = Math.random() * 6.28;
  }

  _perch(i) {
    const n = this.roofs.length / 3 | 0;
    if (!n) return;
    const k = (Math.random() * n | 0) * 3;
    this.bx[i] = this.roofs[k] + (Math.random() - 0.5) * 9;
    this.by[i] = this.roofs[k + 1];
    this.bz[i] = this.roofs[k + 2] + (Math.random() - 0.5) * 9;
    this.vx[i] = this.vy[i] = this.vz[i] = 0;
    this.bst[i] = PERCH; this.bt[i] = 4 + Math.random() * 22;
  }

  _reseedLitter(i, anywhere) {
    const A = this.arena;
    this.lx[i] = (Math.random() * 2 - 1) * A * 0.92;
    this.lz[i] = (Math.random() * 2 - 1) * A * 0.92;
    this.ly[i] = 0.3 + Math.random() * 1.4;
    const a = Math.random() * Math.PI * 2, s = 6 + Math.random() * 12;
    this.lvx[i] = Math.cos(a) * s; this.lvz[i] = Math.sin(a) * s;
    this.lr[i] = Math.random() * 6.28; this.lspin[i] = (Math.random() - 0.5) * 5;
    this.lsz[i] = 0.7 + Math.random() * 1.5;
    if (!anywhere) this.ly[i] = 0.3;
  }

  // THE BREAK FOR THE SKY. Hooked to game.noise(), so anything the AI can hear scatters the birds:
  // explosions, heavy hits, a KO. Perched birds bolt; flying ones bank away and climb.
  scare(x, z, r = 90) {
    if (!this.enabled) return;
    const r2 = r * r;
    for (let i = 0; i < this.nBirds; i++) {
      const dx = this.bx[i] - x, dz = this.bz[i] - z;
      const d2 = dx * dx + dz * dz;
      if (d2 > r2) continue;
      const d = Math.max(4, Math.sqrt(d2));
      this.bst[i] = FLEE; this.bt[i] = 2.5 + Math.random() * 2.5;
      this.vx[i] = dx / d * 46; this.vz[i] = dz / d * 46; this.vy[i] = 16 + Math.random() * 16;
    }
  }

  update(dt) {
    if (!this.enabled || dt <= 0) return;
    const d = Math.min(dt, 0.05);
    const A = this.arena, W = this.world;
    // roosting: at night most of the flock is on a roof and the sky empties out
    if (W && W.dayT !== undefined) {
      const t = W.dayT % 1;
      this.night = (t < 0.22 || t > 0.80) ? 1 : (t < 0.30 || t > 0.72) ? 0.5 : 0;
    }

    for (let f = 0; f < this.FL; f++) {
      this.fa[f] += d * 0.12;
      if ((this.fx[f] = this.fx[f]) !== this.fx[f]) this._reflock(f);   // NaN guard, the cheap way
    }

    for (let i = 0; i < this.nBirds; i++) {
      const st = this.bst[i];
      this.bt[i] -= d;
      if (st === PERCH) {
        this.flap[i] = 0;
        // a roosting bird stays put; a daytime bird gets restless
        if (this.bt[i] <= 0) {
          if (this.night > 0.5 && Math.random() < 0.85) this.bt[i] = 6 + Math.random() * 14;
          else { this._launch(i, this.bx[i], this.by[i] + 1.5, this.bz[i]); this.vy[i] = 14; }
        }
      } else {
        const f = this.flock[i];
        let tx, ty, tz;
        if (st === FLEE) {
          tx = this.bx[i] + this.vx[i]; ty = 130 + (i % 7) * 9; tz = this.bz[i] + this.vz[i];
          if (this.bt[i] <= 0) { this.bst[i] = FLY; this.bt[i] = 4 + Math.random() * 8; }
        } else {
          // wheel around the flock anchor — a slow circle, each bird on its own phase
          const ph = this.fa[f] + (i / this.nBirds) * 6.28;
          const rad = 42 + (i % 5) * 11;
          tx = this.fx[f] + Math.cos(ph) * rad;
          tz = this.fz[f] + Math.sin(ph) * rad;
          ty = this.fy[f] + Math.sin(ph * 1.7) * 12;
          if (this.bt[i] <= 0) {
            this.bt[i] = 5 + Math.random() * 10;
            if (this.night > 0.5 && this.roofs.length && Math.random() < 0.5) { this._perch(i); continue; }
            if (Math.random() < 0.25) this._reflock(f);
            else if (this.roofs.length && Math.random() < 0.18) { this._perch(i); continue; }
          }
        }
        // steer (no boids pass — one lerp toward the target is indistinguishable at this scale)
        const ax = tx - this.bx[i], ay = ty - this.by[i], az = tz - this.bz[i];
        const k = st === FLEE ? 2.6 : 1.15;
        this.vx[i] += ax * k * d; this.vy[i] += ay * k * d * 0.8; this.vz[i] += az * k * d;
        const sp = Math.hypot(this.vx[i], this.vy[i], this.vz[i]);
        const max = st === FLEE ? 64 : 34;
        if (sp > max) { const m = max / sp; this.vx[i] *= m; this.vy[i] *= m; this.vz[i] *= m; }
        this.bx[i] += this.vx[i] * d; this.by[i] += this.vy[i] * d; this.bz[i] += this.vz[i] * d;
        if (this.by[i] < 24) { this.by[i] = 24; this.vy[i] = Math.abs(this.vy[i]); }
        if (this.by[i] > 300) { this.by[i] = 300; this.vy[i] = -Math.abs(this.vy[i]) * 0.5; }
        // a bird that leaves the map turns around rather than vanishing
        if (Math.abs(this.bx[i]) > A * 1.25 || Math.abs(this.bz[i]) > A * 1.25) this._reflock(this.flock[i]);
        this.flap[i] += d * (st === FLEE ? 26 : 15);
      }
    }

    // ---- litter: skitters downwind, tumbling, and never leaves the map ----
    const wob = this.wind;
    for (let i = 0; i < this.nLitter; i++) {
      this.lx[i] += this.lvx[i] * d * wob; this.lz[i] += this.lvz[i] * d * wob;
      this.lr[i] += this.lspin[i] * d;
      // little hops so it reads as blowing rather than sliding
      this.ly[i] = 0.35 + Math.abs(Math.sin(this.lr[i] * 0.7)) * 1.5;
      if (Math.abs(this.lx[i]) > A * 0.95 || Math.abs(this.lz[i]) > A * 0.95) this._reseedLitter(i, false);
    }
    this._writeAll();
  }

  _writeAll() {
    const W = this.world, gy = (x, z) => (W && W.heightAt ? W.heightAt(x, z) : 0);
    for (let i = 0; i < BIRDS; i++) {
      if (i >= this.nBirds) { _m4.makeScale(0, 0, 0); this.birds.setMatrixAt(i, _m4); continue; }
      const flying = this.bst[i] !== PERCH;
      const yaw = Math.atan2(this.vx[i], this.vz[i]);
      // the wingbeat: squash Y. Perched birds sit folded.
      const beat = flying ? (0.35 + Math.abs(Math.sin(this.flap[i])) * 1.5) : 0.22;
      const s = this.scale[i];
      _e.set(0, yaw, flying ? Math.sin(this.flap[i] * 0.5) * 0.18 : 0);
      _q.setFromEuler(_e);
      _p.set(this.bx[i], this.by[i], this.bz[i]);
      _s.set(s, s * beat, s);
      _m4.compose(_p, _q, _s);
      this.birds.setMatrixAt(i, _m4);
    }
    this.birds.instanceMatrix.needsUpdate = true;
    if (this.birds.instanceColor) this.birds.instanceColor.needsUpdate = true;

    for (let i = 0; i < LITTER; i++) {
      if (i >= this.nLitter) { _m4.makeScale(0, 0, 0); this.litter.setMatrixAt(i, _m4); continue; }
      _e.set(-Math.PI / 2 + Math.sin(this.lr[i]) * 0.7, this.lr[i], 0);
      _q.setFromEuler(_e);
      _p.set(this.lx[i], gy(this.lx[i], this.lz[i]) + this.ly[i], this.lz[i]);
      const s = this.lsz[i];
      _s.set(s, s, s);
      _m4.compose(_p, _q, _s);
      this.litter.setMatrixAt(i, _m4);
    }
    this.litter.instanceMatrix.needsUpdate = true;
    if (this.litter.instanceColor) this.litter.instanceColor.needsUpdate = true;
  }

  dispose() {
    for (const m of [this.birds, this.litter]) {
      if (!m) continue;
      this.scene.remove(m);
      m.geometry.dispose(); m.material.dispose(); m.dispose();
    }
    this.birds = this.litter = null;
  }
}
