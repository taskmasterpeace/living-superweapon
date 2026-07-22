// Living Superweapon — Fighter: articulated figure, stats, physics, flight, combat, ability state.
import * as THREE from 'three';
import { clamp, damp, TAU, lerp } from '../core/util.js';
import { ARENA } from './world.js';
import { Ragdoll } from './ragdoll.js';

let _fid = 1;
// flight tuning — levitation model: hold to rise, release to HOVER, descend key to sink.
const FLY_RISE = 30, FLY_SINK = 26, FLY_TAKEOFF = 15, FLY_HOVER_BOB = 3.2;

// per-hero silhouette flourishes (all mounted on driven meshes so the ragdoll carries them).
const BUILDS = {
  sol: { pauldron: 1, gaunt: 1 }, kano: { band: 1, gaunt: 1 }, vega: { pauldron: 1, gaunt: 1, collar: 1 },
  aurum: { collar: 1, gaunt: 1 }, nova: { helmet: 1, visor: 1, pauldron: 1 }, rime: { crest: 1, collar: 1 },
  volt: { crest: 1, gaunt: 1 }, warden: { helmet: 1, visor: 1, pauldron: 2, gaunt: 1 }, hive: { crest: 1, pauldron: 1 },
  pyre: { crest: 1, gaunt: 1 }, torch: { crest: 1 }, apex: { crest: 1, pauldron: 1 },
  specter: { helmet: 1, visor: 1, collar: 1 }, vanguard: { helmet: 1, visor: 1, pauldron: 2, gaunt: 1 },
};

function figure(def) {
  const c = def.colors || def;
  const b = BUILDS[def.id] || {};
  const g = new THREE.Group();
  const skin = c.skin || '#e8c39a';
  const suit = new THREE.MeshStandardMaterial({ color: c.primary, roughness: 0.48, metalness: 0.18, emissive: c.primary, emissiveIntensity: 0.05 });
  const suit2 = new THREE.MeshStandardMaterial({ color: c.secondary, roughness: 0.5, metalness: 0.25 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });
  const glow = new THREE.MeshStandardMaterial({ color: c.accent, emissive: c.accent, emissiveIntensity: 1.6, roughness: 0.4 });
  const armor = new THREE.MeshStandardMaterial({ color: c.secondary, roughness: 0.34, metalness: 0.62 });
  const visorMat = new THREE.MeshStandardMaterial({ color: c.accent, emissive: c.accent, emissiveIntensity: 2.0, roughness: 0.3, metalness: 0.2 });

  // soft contact shadow (grounds the figure; repositioned every frame)
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(3.0, 24), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.34, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.05; shadow.renderOrder = 1; g.add(shadow);

  // torso (chest taper) + neck + collar
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 2.2, 6, 12), suit);
  torso.position.y = 5.2; torso.castShadow = true; g.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 1.0, 10), skinMat);
  neck.position.set(0, 2.0, 0); torso.add(neck);
  if (b.collar) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.02, 1.2, 14, 1, true, -1.05, 2.1), armor);
    col.material.side = THREE.DoubleSide; col.position.set(0, 1.9, -0.15); torso.add(col);
  }
  // chest emblem
  const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.8, 16), glow);
  emblem.position.set(0, 5.7, 1.5); g.add(emblem);
  // pelvis + glowing belt
  const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(1.3, 0.8, 4, 10), suit2);
  pelvis.position.y = 3.2; pelvis.castShadow = true; g.add(pelvis);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(1.24, 0.16, 8, 16), glow.clone());
  belt.material.emissiveIntensity = 0.5; belt.rotation.x = Math.PI / 2; belt.position.y = 0.35; pelvis.add(belt);

  // head + jaw
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 14), skinMat);
  head.position.y = 8.0; head.castShadow = true; g.add(head);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.86, 12, 10), skinMat);
  jaw.position.set(0, -0.42, 0.32); jaw.scale.set(1, 0.72, 0.92); head.add(jaw);
  // hair/cowl (child of g; ragdoll pins it to the head)
  const cowl = new THREE.Mesh(new THREE.SphereGeometry(1.22, 16, 12, 0, TAU, 0, Math.PI * 0.62), suit2);
  cowl.position.y = 8.15; g.add(cowl);
  if (b.helmet) { cowl.visible = false; const hel = new THREE.Mesh(new THREE.SphereGeometry(1.3, 18, 12, 0, TAU, 0, Math.PI * 0.66), armor); hel.position.y = 0.1; head.add(hel); }
  if (b.crest) {                                   // fin / flame / antenna
    const cr = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.8, 4), glow.clone()); cr.material.emissiveIntensity = 0.85; cr.position.set(0, 1.15, -0.1); head.add(cr);
    const cr2 = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.2, 4), cr.material); cr2.position.set(0, 0.9, -0.7); head.add(cr2);
  }
  if (b.band) { const bd = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.14, 8, 18), new THREE.MeshStandardMaterial({ color: c.secondary, roughness: 0.55, metalness: 0.2 })); bd.rotation.x = Math.PI / 2; bd.position.y = 0.32; head.add(bd); }
  if (b.visor) { const vis = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.42, 0.42), visorMat); vis.position.set(0, 0.12, 0.92); head.add(vis); }
  // eyes (children of head; hidden behind a visor)
  const eyeGeo = new THREE.SphereGeometry(0.2, 8, 8);
  const eyeMat = new THREE.MeshBasicMaterial({ color: c.accent });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.42, 0.05, 1.0); head.add(eyeL);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat); eyeR.position.set(0.42, 0.05, 1.0); head.add(eyeR);
  if (b.visor) { eyeL.visible = false; eyeR.visible = false; }

  // arms — pivot groups; children[0]=upper,[1]=fore,[2]=fist (indices are a ragdoll contract).
  const mkArm = (side) => {
    const pivot = new THREE.Group(); pivot.position.set(side * 1.7, 6.6, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 1.5, 4, 8), suit);
    upper.position.y = -1.05; upper.castShadow = true; pivot.add(upper);
    const delt = new THREE.Mesh(new THREE.SphereGeometry(0.66, 10, 8), suit); delt.position.y = 0.35; upper.add(delt);   // deltoid cap
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 1.5, 4, 8), skinMat);
    fore.position.y = -2.85; pivot.add(fore);
    const fist = new THREE.Mesh(new THREE.IcosahedronGeometry(0.66, 0), glow.clone());   // faceted glove
    fist.material.emissiveIntensity = 0.0; fist.position.y = -3.85; pivot.add(fist);
    if (b.pauldron) {
      const pa = new THREE.Mesh(new THREE.SphereGeometry(0.98, 12, 10, 0, TAU, 0, Math.PI * 0.62), armor); pa.scale.set(1.15, 0.8, 1.15); pa.position.y = 0.55; upper.add(pa);
      if (b.pauldron > 1) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.75, 6), armor); sp.position.set(side * 0.55, 0.95, 0); sp.rotation.z = -side * 0.5; upper.add(sp); }
    }
    if (b.gaunt) { const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.5, 1.05, 10), armor); gl.position.y = -0.15; fore.add(gl); const band = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.1, 6, 12), glow.clone()); band.material.emissiveIntensity = 0.6; band.rotation.x = Math.PI / 2; band.position.y = 0.55; fore.add(band); }
    g.add(pivot);
    return pivot;
  };
  const armL = mkArm(-1), armR = mkArm(1);

  // legs — two-bone with a KNEE. pivot(hip) → [thigh, knee]; knee → [shin, kneecap, boot].
  // Parts exposed on pivot.userData so the ragdoll drives thigh (hip→knee), shin (knee→ankle) & boot by name.
  // _animate swings the hip (pivot.rotation.x) and flexes the knee (knee.rotation.x) for a real gait.
  const mkLeg = (side) => {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.7, 3.0, 0);          // hip joint
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.56, 1.5, 4, 8), suit2);
    thigh.position.y = -0.95; thigh.castShadow = true; pivot.add(thigh);              // hip → knee
    const hipCap = new THREE.Mesh(new THREE.SphereGeometry(0.62, 10, 8), suit2); hipCap.position.y = 0.85; thigh.add(hipCap);
    const knee = new THREE.Group(); knee.position.y = -1.9; pivot.add(knee);          // knee joint
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.3, 4, 8), suit2);
    shin.position.y = -0.85; shin.castShadow = true; knee.add(shin);                  // knee → ankle
    const kneeCap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), suit2); kneeCap.position.y = 0.05; knee.add(kneeCap);
    const boot = new THREE.Mesh(new THREE.CapsuleGeometry(0.58, 0.7, 4, 8), glow.clone());
    boot.material.emissiveIntensity = 0.3; boot.position.set(0, -1.85, 0.2); knee.add(boot);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), boot.material); toe.position.set(0, -0.15, 0.62); toe.scale.set(1, 0.7, 1.35); boot.add(toe);
    pivot.userData = { thigh, knee, shin, boot };
    g.add(pivot); return pivot;
  };
  const legL = mkLeg(-1), legR = mkLeg(1);

  // cape (optional)
  let cape = null;
  if (c.cape) {
    cape = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.2, 1, 4), new THREE.MeshStandardMaterial({ color: c.cape, roughness: 0.6, side: THREE.DoubleSide, metalness: 0.1 }));
    cape.position.set(0, 5.0, -1.4); cape.castShadow = true; g.add(cape);
  }

  // aura (additive shell, scales with power)
  const aura = new THREE.Mesh(new THREE.SphereGeometry(3.4, 20, 16), new THREE.MeshBasicMaterial({ color: c.accent, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  aura.position.y = 5.0; aura.scale.set(1, 1.7, 1); g.add(aura);

  return { g, torso, head, pelvis, cowl, emblem, aura, cape, armL, armR, legL, legR, eyeL, eyeR, shadow, mats: { suit, suit2, glow } };
}

export class Fighter {
  constructor(def, opts = {}) {
    this.id = _fid++;
    this.def = def;
    this.name = def.name;
    this.team = opts.team ?? 1;
    this.isPlayer = !!opts.isPlayer;
    this.isDummy = !!opts.dummy;

    this.parts = figure(def);
    this.obj = this.parts.g;
    this.pos = this.obj.position;
    this.pos.set(opts.x || 0, 0, opts.z || 0);
    this.spawn = this.pos.clone();
    this.vel = new THREE.Vector3();
    this.facing = 0;            // radians around Y (body orientation)
    this.aim = new THREE.Vector3(1, 0, 0); // world dir on XZ (facing)
    this.aim3 = new THREE.Vector3(1, 0, 0); // full 3D attack direction (adjusts up/down for height)

    this.maxHp = def.hp || 100; this.hp = this.maxHp;
    this.maxKi = def.ki || 100; this.ki = this.maxKi * 0.5;
    this.speed = def.speed || 30;
    this.radius = 2.2;

    this.state = 'idle';       // idle|move|cast|hit|ko|charge
    this.stateT = 0;
    this.hitstop = 0;
    this.hitFlash = 0;
    this.castPose = 0;         // 0..1 arms-forward blend
    this.punchPose = 0;
    this.koT = 0;
    this.invuln = 0;
    this.powerBuff = 1;        // damage/speed multiplier (levelMult × active transform)
    this.buffT = 0; this.buffName = '';
    // --- progression / scoring (gamified combat) ---
    this.level = 1; this.xp = 0; this.xpNext = 100; this.levelMult = 1;
    this.score = 0; this.kills = 0; this.streak = 0;
    this.lastHitBy = null; this.lastHitT = 99; this.lastKillT = 99;
    this.flyHeld = false;       // ascend intent (SPACE / pad ✕ held)
    this.descendHeld = false;   // descend intent (Ctrl / pad held)
    this.flying = false;        // levitation mode — gravity suspended, you hover
    this._flyPrev = false;      // rising-edge detector for take-off
    this.onBlock = false;
    this.animT = Math.random() * 10;

    // per-slot ability runtime state
    this.slots = {};
    for (const k in def.abilities) this.slots[k] = { def: def.abilities[k], cd: 0, charging: false, chargeT: 0, active: null, sustainT: 0 };
    this.globalCast = 0; // small global cast lockout

    // --- melee trifecta state (Strike / Guard / Grab) ---
    this.guarding = false; this.guardMeter = 1; this.staggerT = 0; this._blocked = 0;
    this.grabbing = null; this.grabbedBy = null; this.grabState = null; this.grabT = 0; this.grabMode = '';
    this.strikeIdx = 0; this.strikeActive = 0; this.strikeCd = 0; this.comboWin = 0; this.strikeHit = null;
    this.phase = false;                 // energy-intangible
    this.poseStrike = 0; this.poseGuard = 0; this.poseGrab = 0;
    // AI reaction state (must start at 0, not undefined — guard/counter logic compares <= 0)
    this._forceBeamT = 0; this._forceBeam = null; this._forceBeamActive = false; this._counterCd = 0; this._meleeCd = 0; this._guardT = 0;
    // per-character trifecta traits
    this.thorns = def.thorns || 0;                                   // damages whoever holds you
    this.canPhase = !!def.phase;                                     // can spend energy to go intangible
    this.grabHeal = def.grabHeal || 0;                              // lifesteal on your throws
    this.teleEscape = def.teleEscape || Object.values(def.abilities || {}).some(a => a.type === 'teleport'); // blinks out of grabs
  }

  get grounded() { return (this.pos.y <= 0.01 || this.onBlock) && !this.flying; }
  get alive() { return this.state !== 'ko'; }

  faceDir(dx, dz) { if (dx * dx + dz * dz > 1e-4) { this.facing = Math.atan2(dx, dz); this.aim.set(dx, 0, dz).normalize(); } }
  center(out = new THREE.Vector3()) { return out.set(this.pos.x, this.pos.y + 5.2, this.pos.z); }

  muzzle(out = new THREE.Vector3(), fwd = 3.4, h = 5.8) {
    return out.set(this.pos.x + this.aim.x * fwd, this.pos.y + h, this.pos.z + this.aim.z * fwd);
  }

  takeDamage(amount, opts = {}) {
    if (this.state === 'ko' || this.invuln > 0) return 0;
    // energy-intangible: strikes/projectiles pass through
    if (this.phase && !opts.unblockable && !opts.trueDamage) {
      const g = this._game;
      if (g && Math.random() < 0.6) g.particles.burst(this.pos.x, this.pos.y + 5, this.pos.z, { count: 3, speed: 8, life: 0.3, size: 2.2, color: [this.def.colors.accent, '#fff'] });
      return 0;
    }
    // GUARD beats STRIKE: block frontal, non-grab damage
    if (this.guarding && this.staggerT <= 0 && !opts.unblockable && opts.src) {
      const dx = opts.src.pos.x - this.pos.x, dz = opts.src.pos.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
      if ((dx / d) * this.aim.x + (dz / d) * this.aim.z > -0.15) {   // attacker in front arc
        amount *= opts.strike ? 0.12 : opts.dot ? 0.5 : 0.42;
        this.guardMeter = clamp(this.guardMeter - (opts.strike ? 0.14 : opts.dot ? 0.012 : 0.22), 0, 1);
        const pb = opts.dot ? 0.8 : 5;                                // beams shove gently while blocked
        this.vel.x += (dx / d) * pb; this.vel.z += (dz / d) * pb;
        this.hitstop = Math.max(this.hitstop, opts.dot ? 0 : 0.03); this._blocked = 0.16;
        this.hp = clamp(this.hp - amount, 0, this.maxHp);
        if (this.guardMeter <= 0.001) { this.guarding = false; this.staggerT = 0.7; this.state = 'hit'; this.stateT = 0; } // guard break
        if (this._game) this._game.onHit(this, amount, opts, true);
        return amount;
      }
    }
    if (opts.src && opts.src !== this) { this.lastHitBy = opts.src; this.lastHitT = 0; }   // for kill attribution
    // getting hit cancels your own grab attempt (STRIKE beats GRAB)
    if (this.grabState === 'startup') { this.grabState = null; this.grabT = 0; }
    if (this.grabbing && this._game) this._game.melee.release(this);

    this.hp = clamp(this.hp - amount, 0, this.maxHp);
    this.ki = clamp(this.ki + amount * 0.4, 0, this.maxKi); // build ki when hurt
    this.hitFlash = 1; this.hitstop = Math.max(this.hitstop, opts.hitstop || 0.04);
    if (opts.kb) this.vel.add(opts.kb);
    if (opts.launch) this.vel.y += opts.launch;
    this.state = 'hit'; this.stateT = 0;
    if (this.hp <= 0) this._ko();
    if (this._game) this._game.onHit(this, amount, opts, false);
    return amount;
  }

  _ko() {
    this.state = 'ko'; this.koT = 0; this.flyHeld = false; this.flying = false; this.descendHeld = false;
    this.guarding = false; this.phase = false; this.strikeActive = 0;
    if (this._game && (this.grabbing || this.grabbedBy)) this._game.melee.release(this.grabbing ? this : this.grabbedBy);
    for (const k in this.slots) { this.slots[k].charging = false; this.slots[k].active = null; }
    // become a ragdoll — carry the killing blow's knockback (+ a small pop) into the sim as launch
    if (this.canPhase) { for (const m of [this.parts.mats.suit, this.parts.mats.suit2]) { m.transparent = false; m.opacity = 1; } }
    this.ragdoll = new Ragdoll(this, this.vel.clone().add(new THREE.Vector3(0, 12, 0)));
    this.vel.set(0, 0, 0);
  }

  heal(a) { this.hp = clamp(this.hp + a, 0, this.maxHp); }
  spendKi(a) { if (this.ki < a) return false; this.ki -= a; return true; }

  update(dt, game) {
    this.animT += dt;
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
    if (this.buffT > 0) { this.buffT -= dt; if (this.buffT <= 0) { this.powerBuff = this.levelMult; this.buffName = ''; } }
    this.lastHitT += dt; this.lastKillT += dt;
    if (this._landT > 0) this._landT -= dt; if (this._liftFx > 0) this._liftFx -= dt;
    if (this._chill > 0) { this._chill -= dt; if (this._chill <= 0) this.speed = this.def.speed || 30; }
    if (this.invuln > 0) this.invuln -= dt;
    for (const k in this.slots) if (this.slots[k].cd > 0) this.slots[k].cd -= dt;
    // melee timers
    if (this.strikeCd > 0) this.strikeCd -= dt;
    if (this.comboWin > 0) this.comboWin -= dt;
    if (this.staggerT > 0) this.staggerT -= dt;
    if (this._blocked > 0) this._blocked -= dt;
    this.guardMeter = clamp(this.guardMeter + (this.guarding ? 0 : 0.55) * dt, 0, 1);
    if (game && game.melee) game.melee.update(this, dt);
    this.poseStrike = damp(this.poseStrike, this.strikeActive > 0 ? 1 : 0, 18, dt);
    this.poseGuard = damp(this.poseGuard, this.guarding ? 1 : 0, 14, dt);
    this.poseGrab = damp(this.poseGrab, (this.grabState || this.grabbing) ? 1 : 0, 16, dt);

    if (this.state === 'ko') {
      this._updateKO(dt, game);
      if (this.ragdoll) { this.ragdoll.step(dt, game); this.ragdoll.apply(this); this._sync(); return; }
      this._physics(dt, game); this._animate(dt); this._sync(); return;
    }

    // ki regen (slower while casting/charging; guarding safely doubles as a charge stance)
    const anyCharge = Object.values(this.slots).some(s => s.charging || s.sustainT > 0);
    this.ki = clamp(this.ki + (anyCharge ? 3 : 9) * dt, 0, this.maxKi);        // ki is a budget — beams drain it
    if (this.guarding && this._blocked <= 0) this.ki = clamp(this.ki + 22 * dt, 0, this.maxKi); // guard to recover it

    if (this.hitstop > 0) { this.hitstop -= dt; this._animate(dt); this._sync(); return; }

    this._physics(dt, game);

    if (this.state === 'hit' && (this.stateT += dt) > 0.22) this.state = 'idle';
    this.castPose = damp(this.castPose, (this.state === 'cast' || anyCharge) ? 1 : 0, 12, dt);
    this.punchPose = damp(this.punchPose, 0, 10, dt);
    if (this.state === 'cast' && (this.stateT += dt) > 0.28) this.state = 'idle';

    this._animate(dt);
    this._sync();
  }

  _updateKO(dt, game) {
    this.koT += dt;
    if (this.koT > (this.isDummy ? 2.2 : 3.4)) {
      if (this.noRespawn) { this._remove = true; return; }   // survival/wave enemies stay dead
      // put the figure hierarchy back exactly, then respawn
      if (this.ragdoll) { this.ragdoll.restore(); this.ragdoll = null; }
      this.hp = this.maxHp; this.ki = this.maxKi * 0.4;
      this.state = 'idle'; this.invuln = 1.4; this.vel.set(0, 0, 0);
      if (this.isDummy) this.pos.copy(this.spawn);
      else { this.pos.set(this.spawn.x, 0, this.spawn.z); }
      game.vfx.flash(this.pos.clone().setY(5), this.def.colors.accent, 8, 0.4);
    }
  }

  _physics(dt, game) {
    // --- flight / levitation ---
    if (this.state !== 'ko') {
      // rising edge of the ascend intent → take off into levitation
      if (this.flyHeld && !this._flyPrev && !this.flying) {
        this.flying = true;
        if (this.pos.y < 1.5) this.vel.y = FLY_TAKEOFF;      // pop off the ground so even a tap lifts into a hover
        this._liftFx = 0.25;
        if (game && game.audio) { try { game.audio.zap(560); } catch (e) {} }
      }
      // releasing ascend while aloft → stop climbing and settle here (no long coast up)
      if (!this.flyHeld && this._flyPrev && this.flying) this.vel.y = clamp(this.vel.y, -FLY_SINK, 5);
      this._flyPrev = this.flyHeld;

      if (this.flying) {
        let target, rate;
        if (this.flyHeld) { target = FLY_RISE; rate = 7; }                 // ascend
        else if (this.descendHeld) { target = -FLY_SINK; rate = 7; }       // descend
        else { target = Math.sin(this.animT * 2.3) * FLY_HOVER_BOB; rate = 5; }  // hover: gentle levitation bob
        this.vel.y = damp(this.vel.y, target, rate, dt);
      } else if (this.pos.y > 0 || this.vel.y > 0) {
        this.vel.y -= 60 * dt;                               // gravity — jumps & knockback arcs
      }
    }
    // horizontal drag
    const dragF = Math.exp(-6 * dt);
    this.vel.x *= dragF; this.vel.z *= dragF;
    this.vel.y = clamp(this.vel.y, -160, 70);       // never let launches/lift escape

    this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt; this.pos.z += this.vel.z * dt;
    if (this.pos.y <= 0) {
      const impact = this.vel.y;
      this.pos.y = 0; if (this.vel.y < 0) this.vel.y = 0;
      if (this.flying && !this.flyHeld) this.flying = false;    // descended onto the ground → land, stop levitating
      if (impact < -30 && this.state !== 'ko') this._landT = Math.min(0.26, -impact * 0.006);   // knee-crouch on a hard landing
    }
    if (this.pos.y > 85) { this.pos.y = 85; if (this.vel.y > 0) this.vel.y = 0; }  // flight/knockback ceiling

    // arena bounds
    const b = ARENA - 4;
    this.pos.x = clamp(this.pos.x, -b, b); this.pos.z = clamp(this.pos.z, -b, b);

    // Box3 (AABB) collision vs cover — walls block you, and you can stand on their tops
    this.onBlock = false;
    for (const c of game.world.cover) {
      const hx = (c.hx ?? c.r) + this.radius, hz = (c.hz ?? c.r) + this.radius, top = c.top ?? c.h;
      const dx = this.pos.x - c.x, dz = this.pos.z - c.z;
      const ox = hx - Math.abs(dx), oz = hz - Math.abs(dz);
      if (ox <= 0 || oz <= 0) continue;                    // no horizontal overlap
      // land on top — hovering fighters can perch on a block when they sink onto it
      if (this.pos.y >= top - 2.5 && this.vel.y <= 2 && !this.flyHeld && (!this.flying || this.descendHeld)) {
        this.pos.y = top; if (this.vel.y < 0) this.vel.y = 0; this.onBlock = true; this.flying = false;
      } else if (this.pos.y < top - 0.5) {
        const spd = Math.hypot(this.vel.x, this.vel.z);
        if (ox < oz) { this.pos.x += Math.sign(dx || 1) * ox; this.vel.x *= -0.3; }   // push out + bounce
        else { this.pos.z += Math.sign(dz || 1) * oz; this.vel.z *= -0.3; }
        // slammed into a wall hard enough → crack it
        if (spd > 34 && c.hp != null && this._game) { this._game.damageBlock(c, spd * 0.55, { x: this.pos.x, y: this.pos.y + 4, z: this.pos.z }); this.hitstop = Math.max(this.hitstop, 0.04); }
      }
    }
  }

  move(dir, dt, sprint = 1) {
    if (this.state === 'ko' || this.hitstop > 0 || this.grabbedBy || this.grabState === 'clinch' || this.staggerT > 0) return;
    let s = this.speed * this.powerBuff * sprint;
    if (this.guarding) s *= 0.34;               // guarding slows you
    if (this.strikeActive > 0) s *= 0.5;
    this.vel.x += dir.x * s * dt * 9;
    this.vel.z += dir.z * s * dt * 9;
    const mx = s; const h = Math.hypot(this.vel.x, this.vel.z);
    if (h > mx) { this.vel.x = this.vel.x / h * mx; this.vel.z = this.vel.z / h * mx; }
    if (dir.x || dir.z) { if (this.state === 'idle' || this.state === 'move') this.state = 'move'; }
    else if (this.state === 'move') this.state = 'idle';
  }

  _animate(dt) {
    const p = this.parts; const moving = Math.hypot(this.vel.x, this.vel.z) > 4;
    // face
    this.obj.rotation.y = damp(this.obj.rotation.y, this.facing, 14, dt);
    // idle bob / breathe (+ landing crouch dips the upper body)
    const bob = Math.sin(this.animT * 3.2) * 0.12;
    const land = clamp(this._landT || 0, 0, 1);
    p.torso.position.y = 5.2 + bob + (this.pos.y > 0 ? 0.3 : 0) - land * 1.1;
    p.head.position.y = 8.0 + bob - land * 1.1;
    // run cycle — hips swing, KNEES flex on the back-lift; blends to a trailing pose in flight
    const mv = moving ? 1 : 0;
    const rc = Math.sin(this.animT * 12) * (moving ? 0.7 : 0.05);
    this._flyPose = damp(this._flyPose || 0, this.flying ? 1 : 0, 7, dt);
    const fp = this._flyPose, kneeBase = 0.14;
    let hipL = rc, hipR = -rc;
    let kneeL = kneeBase + clamp(rc, 0, 1) * 1.5 * mv;   // knee bends as that leg lifts behind
    let kneeR = kneeBase + clamp(-rc, 0, 1) * 1.5 * mv;
    hipL = lerp(hipL, 0.44, fp); hipR = lerp(hipR, 0.44, fp);   // flight: thighs trail
    kneeL = lerp(kneeL, 0.95, fp); kneeR = lerp(kneeR, 0.95, fp); // flight: knees tuck
    kneeL += land * 0.9; kneeR += land * 0.9;                    // landing crouch
    hipL -= land * 0.5; hipR -= land * 0.5;
    p.legL.rotation.x = hipL; p.legR.rotation.x = hipR;
    p.legL.userData.knee.rotation.x = kneeL; p.legR.userData.knee.rotation.x = kneeR;
    // arms: blend between run-swing, cast-forward, punch
    const cast = this.castPose, punch = this.punchPose;
    const swing = -rc * 0.8;
    const armFwd = -Math.PI * 0.5; // point forward
    p.armL.rotation.x = lerp(swing, armFwd, Math.max(cast, punch));
    p.armR.rotation.x = lerp(-swing, armFwd, Math.max(cast, punch));
    p.armL.rotation.z = lerp(0, 0.25, cast);
    p.armR.rotation.z = lerp(0, -0.25, cast);
    // --- melee poses (override) ---
    const gS = this.poseStrike, gG = this.poseGuard, gR = this.poseGrab;
    if (gS > 0.02) {
      const thr = -Math.PI * 0.66 * gS;
      if (this.strikeIdx === 2) { p.legR.rotation.x = lerp(p.legR.rotation.x, -1.25 * gS, 0.7); p.legR.userData.knee.rotation.x = lerp(p.legR.userData.knee.rotation.x, 0.1, gS); p.armR.rotation.x += thr * 0.3; }   // kick snaps the knee straight
      else { (this.strikeIdx % 2 === 0 ? p.armR : p.armL).rotation.x = thr; }
    }
    if (gG > 0.02) {
      p.armL.rotation.x = lerp(p.armL.rotation.x, -1.9, gG); p.armR.rotation.x = lerp(p.armR.rotation.x, -1.9, gG);
      p.armL.rotation.z = lerp(p.armL.rotation.z, 0.6, gG); p.armR.rotation.z = lerp(p.armR.rotation.z, -0.6, gG);
    }
    if (gR > 0.02) {
      p.armL.rotation.x = lerp(p.armL.rotation.x, -1.5, gR); p.armR.rotation.x = lerp(p.armR.rotation.x, -1.5, gR);
      p.armL.rotation.z = lerp(p.armL.rotation.z, 0.22, gR); p.armR.rotation.z = lerp(p.armR.rotation.z, -0.22, gR);
    }
    // phase-intangibility: go ghostly
    if (this.canPhase) {
      const ph = this.phase ? 0.32 : 1;
      for (const m of [p.mats.suit, p.mats.suit2]) { m.transparent = true; m.opacity = damp(m.opacity, ph, 12, dt); }
    }
    // fists glow while casting/charging
    const anyCharge = Object.values(this.slots).some(s => s.charging || s.sustainT > 0);
    const fi = anyCharge ? 2.2 : (cast > 0.3 ? 1.2 : 0);
    p.armL.children[2].material.emissiveIntensity = damp(p.armL.children[2].material.emissiveIntensity, fi, 10, dt);
    p.armR.children[2].material.emissiveIntensity = p.armL.children[2].material.emissiveIntensity;
    // flight lean — tilt forward into a cruise, a gentle superhero float while hovering
    p.g.rotation.x = damp(p.g.rotation.x, this.flying ? (moving ? 0.42 : 0.12) : 0, 8, dt);
    // cape sway
    if (p.cape) { p.cape.rotation.x = -0.3 + Math.sin(this.animT * 4) * 0.1 - Math.min(0.6, Math.hypot(this.vel.x, this.vel.z) * 0.02); }
    // aura from ki%/charge/buff
    const auraP = clamp((this.ki / this.maxKi) * 0.25 + (anyCharge ? 0.5 : 0) + (this.powerBuff > 1 ? 0.5 : 0), 0, 1);
    p.aura.material.opacity = damp(p.aura.material.opacity, auraP * 0.5, 8, dt);
    p.aura.scale.set(1 + Math.sin(this.animT * 8) * 0.04, 1.7 + auraP * 0.5, 1 + Math.sin(this.animT * 8) * 0.04);
    // contact shadow — pinned to the ground, shrinks & fades as the fighter climbs
    if (p.shadow) {
      p.shadow.position.set(0, 0.06 - this.pos.y, 0);
      const alt = clamp(1 - this.pos.y / 42, 0.08, 1);
      p.shadow.material.opacity = 0.36 * alt;
      p.shadow.scale.setScalar(clamp(1 - this.pos.y * 0.006, 0.4, 1));
    }
    // hit flash
    const hf = this.hitFlash;
    p.mats.suit.emissiveIntensity = 0.05 + hf * 2;
    p.mats.suit.emissive.setRGB(0.05 + hf, 0.05 + hf * 0.3, 0.05);
    if (hf <= 0) p.mats.suit.emissive.set(this.def.colors.primary);
  }

  _sync() { /* obj.position is this.pos (same ref); nothing extra */ }
}
