// Living Superweapon — verlet ragdoll. On KO a fighter's articulated figure becomes a
// physics skeleton: point-masses at the joints, distance constraints for the bones, gravity,
// ground + cover collision. Each bone drives one of the figure's existing capsule meshes.
//
// Integration trick: the arm/leg meshes normally live under pivot Groups. During ragdoll we
// zero those pivots (identity transform) so the child capsules share the root group's local
// space — then, with the root group's rotation forced to 0, a mesh's LOCAL transform equals its
// WORLD transform minus the group origin. So we can drive every limb in world space with no
// reparenting, and restore the exact original transforms on respawn.
import * as THREE from 'three';
import { clamp } from '../core/util.js';
import { ARENA } from './world.js';

const GRAV = -62;            // matches world gravity so it feels of-a-piece
const DAMP = 0.986;          // air damping on verlet velocity
const ITER = 12;             // constraint relaxation iterations / step
const GROUND_FRICTION = 0.42;
// per-joint ground clearance so the body rests ON its volume, not sunk through the floor
const GROUND_R = { chest: 1.25, pelvis: 1.15, head: 0.95, shL: 0.7, shR: 0.7, hiL: 0.75, hiR: 0.75 };
const DEFAULT_R = 0.5;

// skeleton definition — rest positions are local to the feet (origin), standing, +Y up.
// name → [x, y, z, inverse-mass].  Heavier core (small invMass) makes limbs whip around it.
const REST = {
  head:  [0.0, 8.05, 0.15, 1.0],
  chest: [0.0, 5.95, 0.0, 0.72],
  pelvis:[0.0, 3.40, 0.0, 0.78],
  shL:   [-1.7, 6.60, 0.0, 0.85], shR: [1.7, 6.60, 0.0, 0.85],
  elL:   [-2.0, 4.85, 0.1, 1.1],  elR: [2.0, 4.85, 0.1, 1.1],
  haL:   [-2.15, 3.05, 0.2, 1.35],haR: [2.15, 3.05, 0.2, 1.35],
  hiL:   [-0.75, 3.05, 0.0, 0.8], hiR: [0.75, 3.05, 0.0, 0.8],
  kneeL: [-0.78, 1.55, 0.05, 0.95], kneeR: [0.78, 1.55, 0.05, 0.95],
  ftL:   [-0.8, 0.55, 0.2, 1.2],  ftR: [0.8, 0.55, 0.2, 1.2],
};
// constraints: [a, b, stiffness]  (stiffness 1 = rigid bone, <1 = soft brace)
const BONES = [
  ['head', 'chest', 1], ['chest', 'pelvis', 1],
  ['chest', 'shL', 1], ['chest', 'shR', 1], ['shL', 'shR', 0.6],   // collar + shoulder brace
  ['shL', 'elL', 1], ['elL', 'haL', 1], ['shR', 'elR', 1], ['elR', 'haR', 1],
  ['pelvis', 'hiL', 1], ['pelvis', 'hiR', 1], ['hiL', 'hiR', 0.7],
  ['hiL', 'kneeL', 1], ['kneeL', 'ftL', 1], ['hiR', 'kneeR', 1], ['kneeR', 'ftR', 1],   // thigh + shin (knee bends)
  ['chest', 'hiL', 0.34], ['chest', 'hiR', 0.34],                  // torso rigidity (soft — lets it sag flat, no arched-back prop)
  ['head', 'shL', 0.28], ['head', 'shR', 0.28],                    // keep the neck from folding flat
];

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _m = new THREE.Vector3();
const _dir = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion();

export class Ragdoll {
  constructor(fighter, impulse) {
    this.f = fighter;
    const p = fighter.parts;
    // meshes we drive, and their pivots (zeroed so children live in group-local space, then restored)
    this.pivots = [p.armL, p.armR, p.legL, p.legR, p.legL.userData.knee, p.legR.userData.knee].filter(Boolean);
    this.driven = [p.torso, p.head, p.pelvis, p.emblem, p.cowl, p.shadow,
      p.armL.children[0], p.armL.children[1], p.armL.children[2],
      p.armR.children[0], p.armR.children[1], p.armR.children[2],
      p.legL.userData.thigh, p.legL.userData.shin, p.legL.userData.boot,
      p.legR.userData.thigh, p.legR.userData.shin, p.legR.userData.boot].filter(Boolean);
    // snapshot originals for a perfect restore
    this._snap = this.driven.map(m => ({ m, p: m.position.clone(), q: m.quaternion.clone(), s: m.scale.clone() }));
    this._pivotSnap = this.pivots.map(v => ({ v, p: v.position.clone(), r: v.rotation.clone() }));

    // build particles in world space from the rest pose at the fighter's current feet
    const o = fighter.pos;                       // world feet
    this.P = {};
    const com = new THREE.Vector3();
    let n = 0;
    for (const k in REST) {
      const r = REST[k];
      const pos = new THREE.Vector3(o.x + r[0], o.y + r[1], o.z + r[2]);
      this.P[k] = { pos, prev: pos.clone(), w: r[3] };
      com.add(pos); n++;
    }
    com.multiplyScalar(1 / n);

    // launch: base knockback + upward pop + a somersault spin in the launch direction
    const base = impulse ? impulse.clone() : new THREE.Vector3();
    base.y = clamp(base.y, -4, 20) + 7;
    base.x = clamp(base.x, -60, 60); base.z = clamp(base.z, -60, 60);
    const horiz = new THREE.Vector3(base.x, 0, base.z);
    const spinAxis = new THREE.Vector3().crossVectors(_up, horiz).normalize(); // tumble forward
    const spin = clamp(horiz.length() * 0.05, 0.4, 4.2);
    const dt0 = 1 / 60;
    for (const k in this.P) {
      const pt = this.P[k];
      _a.subVectors(pt.pos, com);                         // r from COM
      _b.crossVectors(spinAxis, _a).multiplyScalar(spin); // angular contribution
      const vx = base.x + _b.x + (Math.random() - 0.5) * 5;
      const vy = base.y + _b.y + (Math.random() - 0.5) * 4;
      const vz = base.z + _b.z + (Math.random() - 0.5) * 5;
      pt.prev.set(pt.pos.x - vx * dt0, pt.pos.y - vy * dt0, pt.pos.z - vz * dt0);
    }
    // precompute rest lengths
    this.rest = BONES.map(([a, b, s]) => {
      const ra = REST[a], rb = REST[b];
      return Math.hypot(ra[0] - rb[0], ra[1] - rb[1], ra[2] - rb[2]);
    });
    this.asleep = false; this._still = 0;
    // WEIGHT: strong/heavy fighters fall harder and hit the ground like they mean it
    this._impacted = false;
    this.gravMul = 0.88 + (fighter.strength ?? 5) * 0.032;   // STR 1 ≈ 0.91× · STR 10 ≈ 1.2×

    // hide the aura shell while ragdolling (it would float, unanchored)
    if (p.aura) p.aura.material.opacity = 0;
  }

  step(dt, game) {
    if (this.asleep) return;
    dt = clamp(dt, 1 / 140, 1 / 45);
    const dt2 = dt * dt;
    let energy = 0;
    // integrate
    for (const k in this.P) {
      const pt = this.P[k];
      const vx = (pt.pos.x - pt.prev.x) * DAMP, vy = (pt.pos.y - pt.prev.y) * DAMP, vz = (pt.pos.z - pt.prev.z) * DAMP;
      pt.prev.copy(pt.pos);
      pt.pos.x += vx; pt.pos.y += vy + GRAV * this.gravMul * dt2 * pt.w; pt.pos.z += vz;
      energy += vx * vx + vy * vy + vz * vz;
    }
    // satisfy constraints
    for (let it = 0; it < ITER; it++) {
      for (let i = 0; i < BONES.length; i++) {
        const [ka, kb, stiff] = BONES[i];
        const A = this.P[ka], B = this.P[kb];
        _dir.subVectors(B.pos, A.pos);
        const d = _dir.length() || 1e-4;
        const diff = ((d - this.rest[i]) / d) * stiff;
        const wsum = A.w + B.w;
        const fa = (B.w / wsum) * diff, fb = (A.w / wsum) * diff;
        A.pos.x += _dir.x * fa; A.pos.y += _dir.y * fa; A.pos.z += _dir.z * fa;
        B.pos.x -= _dir.x * fb; B.pos.y -= _dir.y * fb; B.pos.z -= _dir.z * fb;
      }
      this._collide(game);
    }
    // sleep when it settles (holds the final pose, frees the CPU)
    if (energy < 0.03) { if ((this._still += dt) > 0.45) this.asleep = true; } else this._still = 0;
  }

  _collide(game) {
    const bound = ARENA - 3;
    const cover = game && game.world ? game.world.cover : null;
    for (const k in this.P) {
      const pt = this.P[k], r = GROUND_R[k] || DEFAULT_R;
      // ground
      if (pt.pos.y < r) {
        // first hard core-impact BREAKS the ground — crater/dust scaled by the fighter's strength
        const drop = pt.prev.y - pt.pos.y;
        if (!this._impacted && drop > 0.5 && (k === 'chest' || k === 'pelvis' || k === 'head')) {
          this._impacted = true;
          if (game && game.onRagdollImpact) game.onRagdollImpact(this.f, drop * 60, pt.pos);
        }
        pt.pos.y = r;
        pt.prev.x += (pt.pos.x - pt.prev.x) * GROUND_FRICTION;   // friction: bleed horizontal speed
        pt.prev.z += (pt.pos.z - pt.prev.z) * GROUND_FRICTION;
        if (pt.prev.y < pt.pos.y) pt.prev.y = pt.pos.y;          // no downward rebound through floor
      }
      // arena walls
      pt.pos.x = clamp(pt.pos.x, -bound, bound);
      pt.pos.z = clamp(pt.pos.z, -bound, bound);
      // cover blocks — rest on top or get shoved out the nearest face (lets bodies drape over cover)
      if (cover) for (let i = 0; i < cover.length; i++) {
        const c = cover[i];
        const hx = (c.hx ?? c.r), hz = (c.hz ?? c.r), top = (c.top ?? c.h);
        const dx = pt.pos.x - c.x, dz = pt.pos.z - c.z;
        if (Math.abs(dx) > hx + r || Math.abs(dz) > hz + r || pt.pos.y > top + r) continue;
        if (pt.pos.y > top - 0.6) { pt.pos.y = top + r; if (pt.prev.y < pt.pos.y) pt.prev.y = pt.pos.y; continue; }
        const ox = hx + r - Math.abs(dx), oz = hz + r - Math.abs(dz);
        if (ox < oz) pt.pos.x += Math.sign(dx || 1) * ox; else pt.pos.z += Math.sign(dz || 1) * oz;
      }
    }
  }

  // drive the figure meshes from the settled/animating skeleton
  apply(f) {
    const P = this.P, g = f.parts.g, o = f.pos;
    g.rotation.set(0, 0, 0);
    // logical body position follows the pelvis (camera / targeting / vfx read f.pos)
    o.x = P.pelvis.pos.x; o.z = P.pelvis.pos.z; o.y = 0;
    // zero the limb pivots so their child capsules live in group-local (= world - o) space
    for (const v of this.pivots) { v.position.set(0, 0, 0); v.rotation.set(0, 0, 0); v.scale.set(1, 1, 1); }

    const cap = (mesh, ka, kb) => this._orient(mesh, P[ka].pos, P[kb].pos, o);
    const pin = (mesh, ka) => { const p = P[ka].pos; mesh.position.set(p.x - o.x, p.y - o.y, p.z - o.z); };

    cap(f.parts.torso, 'chest', 'pelvis');
    cap(f.parts.pelvis, 'pelvis', 'hiL');           // small — just needs a plausible tilt
    f.parts.pelvis.position.set(P.pelvis.pos.x - o.x, P.pelvis.pos.y - o.y - 0.2, P.pelvis.pos.z - o.z);
    pin(f.parts.head, 'head'); this._face(f.parts.head, P.head.pos, P.chest.pos);
    // details ride the head / chest (eyes/jaw/helmet are children of head → carried automatically)
    pin(f.parts.cowl, 'head');
    if (f.parts.emblem) { const c = P.chest.pos; f.parts.emblem.position.set(c.x - o.x, c.y - o.y, c.z - o.z); }
    // arms (upper + fore + fist), legs (thigh + shin + boot — bends at the knee)
    const aL = f.parts.armL.children, aR = f.parts.armR.children, uL = f.parts.legL.userData, uR = f.parts.legR.userData;
    cap(aL[0], 'shL', 'elL'); cap(aL[1], 'elL', 'haL'); pin(aL[2], 'haL');
    cap(aR[0], 'shR', 'elR'); cap(aR[1], 'elR', 'haR'); pin(aR[2], 'haR');
    cap(uL.thigh, 'hiL', 'kneeL'); cap(uL.shin, 'kneeL', 'ftL'); pin(uL.boot, 'ftL');
    cap(uR.thigh, 'hiR', 'kneeR'); cap(uR.shin, 'kneeR', 'ftR'); pin(uR.boot, 'ftR');
    // contact shadow under the wreck
    if (f.parts.shadow) { f.parts.shadow.position.set(P.pelvis.pos.x - o.x, 0.06, P.pelvis.pos.z - o.z); f.parts.shadow.scale.setScalar(1.15); }
  }

  // place a capsule (local +Y axis) so it spans a→b, centred, in group-local space
  _orient(mesh, a, b, o) {
    _m.addVectors(a, b).multiplyScalar(0.5);
    mesh.position.set(_m.x - o.x, _m.y - o.y, _m.z - o.z);
    _dir.subVectors(a, b);
    const len = _dir.length() || 1e-4; _dir.multiplyScalar(1 / len);
    _q.setFromUnitVectors(_up, _dir);
    mesh.quaternion.copy(_q);
  }

  _face(mesh, a, chest) {
    _dir.subVectors(a, chest); if (_dir.lengthSq() < 1e-4) return;
    _dir.normalize(); _q.setFromUnitVectors(_up, _dir); mesh.quaternion.copy(_q);
  }

  // put the figure hierarchy back exactly as it was, for respawn
  restore() {
    for (const s of this._snap) { s.m.position.copy(s.p); s.m.quaternion.copy(s.q); s.m.scale.copy(s.s); }
    for (const s of this._pivotSnap) { s.v.position.copy(s.p); s.v.rotation.copy(s.r); }
    this.f.parts.g.rotation.set(0, 0, 0);
  }
}
