// WAR WORLD: ASCENDANTS — verlet ragdoll. On KO a fighter's articulated figure becomes a
// physics skeleton: point-masses at the joints, distance constraints for the bones, gravity,
// ground + cover collision. Each bone drives one of the figure's existing capsule meshes.
//
// Integration trick: the arm/leg meshes normally live under pivot Groups. During ragdoll we
// zero those pivots (identity transform) so the child capsules share the root group's local
// space — then, with the root group's rotation forced to 0, a mesh's LOCAL transform equals its
// WORLD transform minus the group origin. So we can drive every limb in world space with no
// reparenting, and restore the exact original transforms on respawn.
import * as THREE from 'three';
import { updateLimbSurfaces } from './hero-limb-surface.js';
import { syncHeadCover } from './hero-rig.js';
import { RagdollCorePose } from './ragdoll-core-pose.js';
import { RagdollLimbPose } from './ragdoll-limb-pose.js';
import { RagdollCape } from './ragdoll-cape.js';
import { RagdollCoreContact } from './ragdoll-core-contact.js';
import { RagdollNeckLimit } from './ragdoll-neck-limit.js';
import { RagdollArmSeam } from './ragdoll-arm-seam.js';
import { clamp } from '../core/util.js';
import { ARENA as ARENA_FALLBACK } from './world.js';   // ⚠ review item 7: the FROZEN flagship value.
// It is a last-resort default ONLY — every live read must go through world.ARENA, which is
// per-city. A bare import silently clamps a Mega City back to the flagship's 240.

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
  constructor(fighter, impulse, { downward = false, restorePose = [] } = {}) {
    this.f = fighter;
    const p = fighter.parts;
    // meshes we drive, and their pivots (zeroed so children live in group-local space, then restored)
    this.pivots = [p.body, p.armL, p.armR, p.legL, p.legR, p.legL.userData.knee, p.legR.userData.knee].filter(Boolean);
    this.driven = [p.torso, p.head, p.pelvis, p.cowl, p.shadow,
      p.armL.children[0], p.armL.children[1], p.armL.children[2],
      p.armR.children[0], p.armR.children[1], p.armR.children[2],
      p.legL.userData.thigh, p.legL.userData.shin, p.legL.userData.boot,
      p.legR.userData.thigh, p.legR.userData.shin, p.legR.userData.boot,
      // ⚠ THE KNEECAPS. They are parented to the knee GROUP, which this class zeroes so that its
      // children can be driven in world space — so a kneecap left out of `driven` is stranded at the
      // corpse's ground origin while its own shin lies somewhere else. The rule, worth writing down:
      // anything parented to a joint group is either DRIVEN here or re-parented onto a driven mesh.
      p.legL.userData.kneeCap, p.legR.userData.kneeCap].filter(Boolean);
    // snapshot originals for a perfect restore
    this._snap = this.driven.map(m => ({ m, p: m.position.clone(), q: m.quaternion.clone(), s: m.scale.clone() }));
    this._pivotSnap = this.pivots.map(v => ({ v, p: v.position.clone(), r: v.rotation.clone(), s:v.scale.clone() }));
    // Seed physics from the displayed pose below, but retire temporary visual
    // carriers on respawn. Never pop out of a falling pose before taking the KO.
    for(const base of restorePose){
      const mesh=this._snap.find(s=>s.m===base.node);if(mesh){mesh.p.copy(base.position);mesh.q.copy(base.quaternion);}
      const pivot=this._pivotSnap.find(s=>s.v===base.node);if(pivot){pivot.p.copy(base.position);pivot.r.setFromQuaternion(base.quaternion,pivot.r.order);}
    }

    // Seed from the actual articulated pose, including body pitch and frame proportions.
    // A cruising KO must not pop upright or collapse every archetype onto one small skeleton.
    fighter.obj.updateMatrixWorld(true);
    const joints = p.rig ? {
      head:p.head.getWorldPosition(new THREE.Vector3()),chest:p.torso.getWorldPosition(new THREE.Vector3()),
      pelvis:p.pelvis.getWorldPosition(new THREE.Vector3()),
      shL:p.armL.getWorldPosition(new THREE.Vector3()),shR:p.armR.getWorldPosition(new THREE.Vector3()),
      elL:p.armL.localToWorld(new THREE.Vector3(0,-p.armL.userData.upperLength,0)),
      elR:p.armR.localToWorld(new THREE.Vector3(0,-p.armR.userData.upperLength,0)),
      haL:p.armL.children[2].getWorldPosition(new THREE.Vector3()),haR:p.armR.children[2].getWorldPosition(new THREE.Vector3()),
      hiL:p.legL.getWorldPosition(new THREE.Vector3()),hiR:p.legR.getWorldPosition(new THREE.Vector3()),
      kneeL:p.legL.userData.knee.getWorldPosition(new THREE.Vector3()),kneeR:p.legR.userData.knee.getWorldPosition(new THREE.Vector3()),
      ftL:p.legL.userData.boot.getWorldPosition(new THREE.Vector3()),ftR:p.legR.userData.boot.getWorldPosition(new THREE.Vector3())
    } : null;
    const o = fighter.pos;                       // world feet
    this.P = {};
    const com = new THREE.Vector3();
    let n = 0;
    for (const k in REST) {
      const r = REST[k];
      const pos = joints?.[k] || new THREE.Vector3(o.x + r[0], o.y + r[1], o.z + r[2]);
      this.P[k] = { pos, prev: pos.clone(), w: r[3] };
      com.add(pos); n++;
    }
    com.multiplyScalar(1 / n);
    this.corePose=joints?new RagdollCorePose(p,this.P):null;
    this.limbPose=joints?new RagdollLimbPose(p,this.P):null;
    this.coreContact=this.corePose?new RagdollCoreContact(p,this.corePose,GROUND_R):null;
    this.neckLimit=this.corePose?new RagdollNeckLimit(this.corePose,p):null;
    this.armSeam=p.cape&&this.limbPose?new RagdollArmSeam(this.corePose,this.limbPose,p):null;

    // launch: base knockback + upward pop + a somersault spin in the launch direction
    const base = impulse ? impulse.clone() : new THREE.Vector3();
    // Directed finishers keep their downward drive; ordinary KOs retain the small pop.
    base.y = downward ? clamp(base.y, -160, -30) : clamp(base.y, -4, 20) + 7;
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
    this.capePose=p.cape?.userData.rest?new RagdollCape(p,_a.subVectors(this.P.chest.pos,this.P.chest.prev).multiplyScalar(60)):null;
    this._clothDt=0;this._clothWorld=null;
    // precompute rest lengths
    this.rest = BONES.map(([a, b, s]) => {
      if (joints) return joints[a].distanceTo(joints[b]);
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
    this._clothDt+=clamp(dt,0,.05);this._clothWorld=game?.world;
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
      this.neckLimit?.solve();this.armSeam?.solve();
      this._collide(game);
    }
    // Final contact must see the completed joint orientation. Correcting just
    // one anchor can rotate a different core mesh back through an earlier wall.
    this.neckLimit?.solve();this.armSeam?.solve();
    this.coreContact?.settleIsland(game?.world);
    // sleep when it settles (holds the final pose, frees the CPU)
    if (energy < 0.03) { if ((this._still += dt) > 0.45) this.asleep = true; } else this._still = 0;
  }

  _collide(game) {
    const bound = (game && game.world ? game.world.ARENA : ARENA_FALLBACK) - 3;
    const cover = game && game.world ? game.world.cover : null;
    const hAt = (game && game.world && game.world.heightAt) ? (x, z) => game.world.heightAt(x, z) : null;
    const wAt = (game && game.world && game.world.waterAt) ? (x, z) => game.world.waterAt(x, z) : null;
    for (const k in this.P) {
      const pt = this.P[k], r = GROUND_R[k] || DEFAULT_R, groundRadius=this.coreContact?.floorRadius(k)??r;
      // WATER — a body going in splashes ONCE (core points only) and drags below the surface,
      // then settles on the real seabed like any other ground.
      // ⚠ the trigger is CROSSING THE SURFACE (y≈0.34) while falling, not reaching a depth — on
      // the flagship the bed is y=0 and a chest RESTS at its own 1.25 radius, so a depth test
      // could never fire there. The drop gate keeps a settled, bobbing body from re-splashing.
      if (wAt && pt.pos.y < 1.5 && wAt(pt.pos.x, pt.pos.z)) {
        if (!this._splashed && (k === 'chest' || k === 'pelvis' || k === 'head') && (pt.prev.y - pt.pos.y) > 0.35) {
          this._splashed = true;
          if (game && game.splash) game.splash({ x: pt.pos.x, y: 0.4, z: pt.pos.z }, 1.3);
        }
        if (pt.pos.y < 1.0) {                            // water drag — all axes, gentle
          pt.prev.x += (pt.pos.x - pt.prev.x) * 0.16;
          pt.prev.y += (pt.pos.y - pt.prev.y) * 0.2;
          pt.prev.z += (pt.pos.z - pt.prev.z) * 0.16;
        }
      }
      // ground — the TERRAIN, so bodies settle into quarry pits and craters instead of on thin air
      const gy = hAt ? hAt(pt.pos.x, pt.pos.z) : 0;
      if (pt.pos.y < gy + groundRadius) {
        // first hard core-impact BREAKS the ground — crater/dust scaled by the fighter's strength
        const drop = pt.prev.y - pt.pos.y;
        if (!this._impacted && drop > 0.5 && (k === 'chest' || k === 'pelvis' || k === 'head')) {
          this._impacted = true;
          if (game && game.onRagdollImpact) game.onRagdollImpact(this.f, drop * 60, pt.pos);
        }
        pt.pos.y = gy + groundRadius;
        pt.prev.x += (pt.pos.x - pt.prev.x) * GROUND_FRICTION;   // friction: bleed horizontal speed
        pt.prev.z += (pt.pos.z - pt.prev.z) * GROUND_FRICTION;
        if (pt.prev.y < pt.pos.y) pt.prev.y = pt.pos.y;          // no downward rebound through floor
      }
      // arena walls
      pt.pos.x = clamp(pt.pos.x, -bound, bound);
      pt.pos.z = clamp(pt.pos.z, -bound, bound);
      // interior walls — a KO'd body inside a bungalow stays in its room (gated by footprint)
      const inter = game && game.world && game.world.interiors;
      if (inter) for (const it of inter) {
        if (Math.abs(pt.pos.x - it.x) > it.hx + r || Math.abs(pt.pos.z - it.z) > it.hz + r) continue;
        if (pt.pos.y > it.top + r) continue;
        for (const wl of it.walls) {
          const dx2 = pt.pos.x - wl.x, dz2 = pt.pos.z - wl.z;
          if (Math.abs(dx2) > wl.hx + r || Math.abs(dz2) > wl.hz + r) continue;
          const ox2 = wl.hx + r - Math.abs(dx2), oz2 = wl.hz + r - Math.abs(dz2);
          if (ox2 < oz2) pt.pos.x += Math.sign(dx2 || 1) * ox2; else pt.pos.z += Math.sign(dz2 || 1) * oz2;
        }
      }
      // cover blocks — rest on top or get shoved out the nearest face (lets bodies drape over cover)
      if (cover?.length && !this.coreContact?.coverContact(k,pt,cover)) for (let i = 0; i < cover.length; i++) {
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
    o.x = P.pelvis.pos.x; o.z = P.pelvis.pos.z; o.y = 0;   // group stays at sea level; limbs carry world Y
    // zero the limb pivots so their child capsules live in group-local (= world - o) space
    for (const v of this.pivots) { v.position.set(0, 0, 0); v.rotation.set(0, 0, 0); v.scale.set(1, 1, 1); }

    const cap = (mesh, ka, kb) => this._orient(mesh, P[ka].pos, P[kb].pos, o);
    const pin = (mesh, ka) => { const p = P[ka].pos; mesh.position.set(p.x - o.x, p.y - o.y, p.z - o.z); };

    if(this.corePose)this.corePose.apply();
    else{
      cap(f.parts.torso, 'chest', 'pelvis');
      cap(f.parts.pelvis, 'pelvis', 'hiL');
      f.parts.pelvis.position.set(P.pelvis.pos.x - o.x, P.pelvis.pos.y - o.y - 0.2, P.pelvis.pos.z - o.z);
      pin(f.parts.head, 'head'); this._face(f.parts.head, P.head.pos, P.chest.pos);
    }
    // details ride the head / chest (eyes/jaw/helmet are children of head → carried automatically)
    syncHeadCover(f.parts);
    // Insignia and costume panels are torso children, including during tumble.
    // arms (upper + fore + fist), legs (thigh + shin + boot — bends at the knee)
    const aL = f.parts.armL.children, aR = f.parts.armR.children, uL = f.parts.legL.userData, uR = f.parts.legR.userData;
    if(this.limbPose)this.limbPose.apply();
    else{
      cap(aL[0], 'shL', 'elL'); cap(aL[1], 'elL', 'haL'); pin(aL[2], 'haL');
      cap(aR[0], 'shR', 'elR'); cap(aR[1], 'elR', 'haR'); pin(aR[2], 'haR');
      cap(uL.thigh, 'hiL', 'kneeL'); cap(uL.shin, 'kneeL', 'ftL'); pin(uL.boot, 'ftL');
      cap(uR.thigh, 'hiR', 'kneeR'); cap(uR.shin, 'kneeR', 'ftR'); pin(uR.boot, 'ftR');
    }
    // contact shadow under the wreck
    if (f.parts.shadow) { f.parts.shadow.position.set(P.pelvis.pos.x - o.x, 0.06, P.pelvis.pos.z - o.z); f.parts.shadow.scale.setScalar(1.15); }
    updateLimbSurfaces(f.parts);
    this.capePose?.update(this._clothDt,this._clothWorld);this._clothDt=0;
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
    for (const s of this._pivotSnap) { s.v.position.copy(s.p); s.v.rotation.copy(s.r); s.v.scale.copy(s.s); }
    this.f.parts.g.rotation.set(0, 0, 0);
    syncHeadCover(this.f.parts);
    updateLimbSurfaces(this.f.parts,true);
    this.capePose?.restore();
  }
}
