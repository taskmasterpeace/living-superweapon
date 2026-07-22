// Living Superweapon — ability engine. Data-driven power types dispatched per input slot.
import * as THREE from 'three';
import { clamp, rand, TAU, lerp } from '../core/util.js';

const _v = new THREE.Vector3();

const ORB_GEO = new THREE.SphereGeometry(1, 16, 12);                       // shared — orbs come and go constantly
const ORB_CORE_MAT = new THREE.MeshBasicMaterial({ color: '#fff' });
export const PAYLOAD_COLORS = { poison: '#8fe08a', flame: '#ff7a2a', explosive: '#ffd24a', gas: '#9a4ae0' };

function ready(c, def, st) { return st.cd <= 0 && c.ki >= (def.cost || 0) && c.hitstop <= 0; }
function pay(c, def, st) { c.ki -= (def.cost || 0); st.cd = def.cd || 0; }
function chargeOrb(c, st, color) {
  if (!st.orb) {
    const core = new THREE.Mesh(ORB_GEO, ORB_CORE_MAT);
    const glow = new THREE.Mesh(ORB_GEO, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(1.6);
    st.orb = new THREE.Group(); st.orb.add(core, glow); c._game.scene.add(st.orb);
  }
  return st.orb;
}
function killOrb(c, st) { if (st.orb) { c._game.scene.remove(st.orb); st.orb.children[1].material.dispose(); st.orb = null; } }
// out of ki while holding a charge/sustain → make the failure LOUD and readable (never a silent freeze)
function drained(c, g) { if (g && g.onDrained) g.onDrained(c); }

// Each type: run(c, def, st, g, inp)  — inp = { pressed, held, released, dt }
export const TYPES = {

  // Rushing fist — "flies fist forward"
  melee(c, def, st, g, inp) {
    if (st.t > 0) {
      st.t -= inp.dt;
      const foe = g.coneFoe(c, def.range || 11, def.arc || 0.7);
      if (foe && !st.hit.has(foe.id)) {
        st.hit.add(foe.id);
        const blocked = foe.guarding && foe.staggerT <= 0;
        foe.takeDamage((def.damage || 20) * c.powerBuff, { src: c, strike: true, dmgClass: def.dmgClass, kb: _v.copy(c.aim).setLength(def.knock || 40).setY(0), launch: def.launch || 12, hitstop: 0.13 });
        c.hitstop = Math.max(c.hitstop, 0.08);          // attacker freeze for weight
        const imp = foe.pos.clone().set((c.pos.x + foe.pos.x) / 2, 5.7, (c.pos.z + foe.pos.z) / 2);
        if (blocked) { g.vfx.impactStar(imp, 7, '#bfe0ff', 0.16); g.world.shake(0.4); g.audio.zap(520); }
        else {
          g.vfx.impact(imp, { x: c.aim.x, z: c.aim.z }, { color: def.color || c.def.colors.accent, power: 1.6 });
          g.world.shake(1.4); g.world.punch(0.72); g.audio.impact(1.2); g.audio.boom(0.3);
          g.slowmo(0.1, 0.45); if (g.hud) g.hud.flashScreen('#fff', 0.14);
        }
      }
    }
    if (inp.pressed && ready(c, def, st)) {
      pay(c, def, st); st.t = def.active || 0.24; st.hit = new Set(); c.punchPose = 1; c.state = 'cast'; c.stateT = 0;
      c.vel.x += c.aim.x * (def.lunge || 46); c.vel.z += c.aim.z * (def.lunge || 46);
      if (def.fly) { c.vel.y += 8; }
      c.invuln = Math.max(c.invuln, 0.12);
      g.audio.zap(680); g.trail(c, def.color || c.def.colors.accent);
    }
  },

  // Teleporting multi-hit combo
  rush(c, def, st, g, inp) {
    if (st.combo > 0) {
      st.timer -= inp.dt;
      if (st.timer <= 0 && st.foe && st.foe.alive) {
        st.timer = def.interval || 0.1;
        const f = st.foe; const side = (st.combo % 2 === 0) ? 1 : -1;
        const off = _v.set(-c.aim.z * side, 0, c.aim.x * side).multiplyScalar(6);
        c.pos.set(f.pos.x - c.aim.x * 6 + off.x, f.pos.y, f.pos.z - c.aim.z * 6 + off.z);
        c.faceDir(f.pos.x - c.pos.x, f.pos.z - c.pos.z); c.invuln = 0.12; c.punchPose = 1;
        const last = st.combo === 1;
        f.takeDamage((last ? (def.finisher || 30) : (def.damage || 9)) * c.powerBuff, { kb: _v.copy(c.aim).setLength(last ? 60 : 6).setY(0), launch: last ? 20 : 2, hitstop: last ? 0.1 : 0.03 });
        g.vfx.flash(f.pos.clone().setY(5.5), def.color || c.def.colors.accent, last ? 8 : 4, 0.12);
        g.trail(c, def.color || c.def.colors.accent); g.audio.hit(260 + st.combo * 20);
        if (last) { g.world.shake(1.2); g.world.punch(0.8); g.vfx.shockwave(f.pos.clone().setY(0.2), { color: def.color, radius: 26, power: 1.2 }); }
        g.world.shake(0.3);
        st.combo--;
      } else if (!st.foe || !st.foe.alive) st.combo = 0;
    }
    if (inp.pressed && ready(c, def, st)) {
      const foe = g.nearestFoe(c, c.pos, def.range || 70);
      if (foe) { pay(c, def, st); st.foe = foe; st.combo = def.hits || 6; st.timer = 0; c.state = 'cast'; g.audio.zap(900); }
    }
  },

  // Single ki blast / homing bolt
  projectile(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) {
      pay(c, def, st); c.punchPose = 1; c.state = 'cast'; c.stateT = 0;
      const m = c.muzzle(_v.clone(), 3.6, 5.8);
      g.projectiles.spawnProjectile(c, {
        pos: m, vel: (def.grav ? c.aim.clone().setY(0.5) : c.aim3.clone()).setLength(def.speed || 70),
        radius: def.radius || 1.4, damage: def.damage || 14, blast: def.blast || 5, power: def.power || 1,
        homing: def.homing || 0, color: def.color, color2: def.color2, grav: def.grav || 0, shock: def.shock,
      });
      g.audio.blast(460, 0.14); g.muzzleFlash(c, def.color);
    }
  },

  // Rapid alternating-hand volley (Vegeta bakuhatsu)
  volley(c, def, st, g, inp) {
    if (inp.held && c.ki < (def.cost || 3)) { if (!st._dry) { st._dry = true; drained(c, g); } }
    else if (!inp.held) st._dry = false;
    if (inp.held && st.cd <= 0 && c.ki >= (def.cost || 3)) {
      c.ki -= (def.cost || 3); st.cd = def.interval || 0.08; st.side = (st.side || 1) * -1;
      c.state = 'cast'; c.stateT = 0; c.punchPose = 1;
      const off = _v.set(-c.aim.z * st.side, 0, c.aim.x * st.side).multiplyScalar(1.8);
      const m = c.muzzle(new THREE.Vector3(), 3.4, 5.8).add(off);
      const spread = def.spread || 0.09;
      const a = Math.atan2(c.aim3.z, c.aim3.x) + rand(-spread, spread);
      g.projectiles.spawnProjectile(c, {
        pos: m, vel: new THREE.Vector3(Math.cos(a), c.aim3.y, Math.sin(a)).setLength(def.speed || 105),
        radius: def.radius || 0.8, damage: def.damage || 6, blast: def.blast || 3.4, power: 0.5, color: def.color, color2: def.color2,
        arrow: def.arrow, payload: def.payload,
      });
      g.audio.blast(560 + rand(-40, 40), 0.08); g.muzzleFlash(c, def.color, 0.6, off);
    }
  },

  // Kamehameha-hose / heat-beam / galick beam (traveling tip, optional charge)
  beam(c, def, st, g, inp) {
    // finish if the live beam self-terminated (ran out of ki)
    if (st.active && st.active.dead) { st.active = null; st.cd = def.cd || 0; }
    if (inp.pressed && ready(c, def, st) && !st.active && !st.charging) {
      if (def.charge) { st.charging = true; st.chargeT = 0; st.sfx = g.audio.charge(); }
      else { st.active = g.spawnBeamFor(c, def, 1); pay(c, def, st); }
    }
    if (st.charging) {
      const dry = inp.held && st.chargeT < (def.maxCharge || 1.6) && !c.spendKi((def.kiChargePerSec || 14) * inp.dt);
      if (inp.held && !dry && st.chargeT < (def.maxCharge || 1.6)) {
        st.chargeT += inp.dt; c.state = 'charge';
        const orb = chargeOrb(c, st, def.color2 || def.color); const m = c.muzzle(_v.clone(), 3.6, 5.8);
        orb.position.copy(m); orb.scale.setScalar(0.6 + st.chargeT * 1.6);
        if (st.sfx) st.sfx.ramp(st.chargeT / (def.maxCharge || 1.6));
        g.chargeGather(c, def.color, m, 0.5 + st.chargeT);
      } else if (inp.released || st.chargeT >= (def.maxCharge || 1.6) || dry) {
        // ran dry mid-charge → fire at whatever you paid for (never a frozen orb), with a clear cue
        if (dry) drained(c, g);
        const p = 1 + (st.chargeT / (def.maxCharge || 1.6)) * (def.chargePower || 1.4);
        killOrb(c, st); if (st.sfx) { st.sfx.stop(); st.sfx = null; }
        st.charging = false; st.active = g.spawnBeamFor(c, def, p); pay(c, def, st);
        g.world.punch(0.9); g.world.shake(0.8);
        return; // don't let this same-frame release also end the beam
      }
    }
    if (st.active && inp.released) { st.active.end(); st.active = null; st.cd = def.cd || 0; }
  },

  // Wide breath cone — cold (slow) or force (push)
  cone(c, def, st, g, inp) {
    if (inp.held && c.ki < (def.kiPerSec || 18) * inp.dt) { if (!st._dry) { st._dry = true; drained(c, g); } }
    else if (!inp.held) st._dry = false;
    if (inp.held && c.ki >= (def.kiPerSec || 18) * inp.dt) {
      c.ki -= (def.kiPerSec || 18) * inp.dt; c.state = 'cast'; c.stateT = 0;
      c.vel.x *= 0.7; c.vel.z *= 0.7;
      const range = def.range || 34, arc = def.arc || 1.05;
      const m = c.muzzle(_v.clone(), 3.0, 6.2);
      for (const f of g.entities) {
        if (!g.isFoe(c, f)) continue;
        const dx = f.pos.x - c.pos.x, dz = f.pos.z - c.pos.z; const d = Math.hypot(dx, dz);
        if (d > range || d < 0.1) continue;
        const dot = (dx / d) * c.aim.x + (dz / d) * c.aim.z;
        if (dot < Math.cos(arc)) continue;
        f.takeDamage((def.dps || 26) * c.powerBuff * inp.dt, { src: c, dot: true, hitstop: 0 });
        if (def.cold) {
          f.vel.x *= 0.86; f.vel.z *= 0.86; f._chill = 0.5; f.speed = Math.max(8, (f.def.speed || 30) * 0.55);
          f.addFrost((def.frost || 0.5) * inp.dt, c);   // sustained cold ENCASES you in ice (strength breaks out)
        }
        if (def.gasDot) f.addDot({ dps: def.gasDot.dps || 6, dur: def.gasDot.dur || 2.2, color: def.gasDot.color || def.color, kind: def.gasDot.kind || 'gas', src: c });
        else { const pushr = (def.push || 40) * inp.dt * 8; f.vel.x += (dx / d) * pushr; f.vel.z += (dz / d) * pushr; if (def.lift) f.vel.y = Math.min(f.vel.y + def.lift * inp.dt * 24, 22); }
      }
      // mist particles
      for (let i = 0; i < 4; i++) {
        const a = Math.atan2(c.aim.z, c.aim.x) + rand(-arc, arc);
        g.particles.spawn({ x: m.x, y: m.y + rand(-1, 1), z: m.z, vx: Math.cos(a) * range * 1.6, vz: Math.sin(a) * range * 1.6, vy: rand(-2, 2), life: 0.5, size: def.cold ? 5 : 4, color: def.color, drag: 1.4, shrink: true });
      }
      if (Math.random() < 0.2) (def.cold ? g.audio.zap(300) : g.audio.blast(200, 0.1));
    }
  },

  // Big Bang — charge scales size/damage/radius; ground impact => shockwave + lightning
  charge(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st) && !st.charging) { st.charging = true; st.chargeT = 0; st.sfx = g.audio.charge(); }
    if (st.charging) {
      const dry = inp.held && !c.spendKi((def.kiPerSec || 12) * inp.dt);
      if (dry) drained(c, g);                                  // out of ki → hurl what you built up, loudly
      if (inp.held && !dry) {
        st.chargeT = Math.min(def.maxCharge || 2.2, st.chargeT + inp.dt); c.state = 'charge';
        c.vel.x *= 0.85; c.vel.z *= 0.85;
        const c01 = st.chargeT / (def.maxCharge || 2.2);
        const orb = chargeOrb(c, st, def.color); const m = c.muzzle(_v.clone(), 3.4 + c01 * 2, 5.8);
        orb.position.copy(m); orb.scale.setScalar((def.minR || 1.3) + c01 * ((def.maxR || 5) - (def.minR || 1.3)));
        if (st.sfx) st.sfx.ramp(c01);
        g.chargeGather(c, def.color, m, 0.6 + c01 * 1.6);
        if (c01 > 0.6 && Math.random() < c01 * 0.4) g.world.shake(0.15 * c01);
        if (c01 >= 1 && Math.random() < 0.3) g.vfx.lightning(m, { color: def.color, count: 2, radius: 8, height: 6 });
      } else if (inp.released || (!inp.held) || dry) {
        const c01 = st.chargeT / (def.maxCharge || 2.2);
        st.charging = false; if (st.sfx) { st.sfx.stop(); st.sfx = null; }
        const orbPos = st.orb ? st.orb.position.clone() : c.muzzle(new THREE.Vector3());
        killOrb(c, st);
        if (c01 < 0.12) { st.cd = 0.2; return; } // fizzle, refund
        pay(c, def, st);
        const power = 1 + c01 * (def.chargePower || 3);
        g.projectiles.spawnProjectile(c, {
          pos: orbPos, vel: c.aim3.clone().setLength(lerp(def.speedMax || 70, def.speedMin || 42, c01)),
          radius: lerp(def.minR || 1.3, def.maxR || 5, c01), damage: lerp(def.dmgMin || 20, def.dmgMax || 70, c01),
          blast: lerp(8, def.maxBlast || 26, c01), power, color: def.color, color2: def.color2, shock: true, ground: true,
        });
        g.audio.blast(300, 0.2 + c01 * 0.2); g.world.punch(0.85 - c01 * 0.15); g.world.shake(0.6 + c01);
        g.vfx.flash(orbPos, def.color, 8 + c01 * 8, 0.2);
      }
    }
  },

  // Spirit Bomb — grow overhead, then hurl
  spiritbomb(c, def, st, g, inp) {
    if (st.active && st.active.dead) st.active = null;
    if (inp.pressed && ready(c, def, st) && !st.active) {
      pay(c, def, st); st.active = g.projectiles.spawnSpiritBomb(c, { minR: def.minR || 4, maxR: def.maxR || 18, growRate: def.growRate || 8, kiPerSec: def.kiPerSec || 16, color: def.color, color2: def.color2 });
      st.sfx = g.audio.charge();
    }
    if (st.active) {
      if (st.sfx) st.sfx.ramp(st.active.charge01);
      if (inp.released) { st.active.launch(); if (st.sfx) { st.sfx.stop(); st.sfx = null; } st.active = null; g.audio.blast(260, 0.3); g.world.shake(0.5); }
    }
  },

  // Blink to aim point
  teleport(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) {
      pay(c, def, st);
      g.afterimage(c); g.vfx.flash(c.pos.clone().setY(5), def.color || c.def.colors.accent, 6, 0.22); g.audio.teleport();
      const range = def.range || 42; const target = g.aimPoint;
      const dx = target.x - c.pos.x, dz = target.z - c.pos.z; const d = Math.hypot(dx, dz) || 1;
      const dd = Math.min(range, d);
      c.pos.x += (dx / d) * dd; c.pos.z += (dz / d) * dd;
      c.vel.multiplyScalar(0.2); c.invuln = 0.28; c.faceDir(dx, dz);
      g.afterimage(c); g.vfx.flash(c.pos.clone().setY(5), def.color || c.def.colors.accent, 7, 0.28);
      g.particles.burst(c.pos.x, 5, c.pos.z, { count: 18, speed: 24, life: 0.4, size: 2.6, color: ['#fff', def.color || c.def.colors.accent] });
    }
  },

  // Energy-intangibility: hold to phase through strikes & projectiles (drains ki)
  phase(c, def, st, g, inp) {
    if (inp.held && c.spendKi((def.kiPerSec || 16) * inp.dt)) {
      if (!c.phase) { c.phase = true; g.audio.teleport(); g.vfx.ring(c.pos.clone().setY(5), { color: def.color || c.def.colors.accent, r0: 2, r1: 8, life: 0.3 }); }
      if (Math.random() < 0.25) g.particles.burst(c.pos.x, c.pos.y + 5, c.pos.z, { count: 2, speed: 6, life: 0.4, size: 2.2, color: [def.color || c.def.colors.accent, '#fff'] });
    } else if (c.phase) { c.phase = false; g.audio.zap(240); if (inp.held) drained(c, g); }   // ki ran out mid-phase
  },

  // Quick mobility dash (i-frames)
  dash(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) {
      pay(c, def, st);
      const dir = (c.moveDir && (c.moveDir.x || c.moveDir.z)) ? c.moveDir : c.aim;
      c.vel.x += dir.x * (def.power || 90); c.vel.z += dir.z * (def.power || 90);
      c.burstT = 0.3;                                 // let the impulse carry — move() won't clamp it away
      c.invuln = def.iframes || 0.22; g.afterimage(c); g.audio.zap(500); g.trail(c, def.color || c.def.colors.accent);
    }
  },

  // Summon allied minions
  summon(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) {
      pay(c, def, st);
      g.summon(c, def);
      g.vfx.flash(c.pos.clone().setY(5), def.color, 8, 0.3); g.audio.power(true);
      g.vfx.ring(c.pos.clone().setY(1), { color: def.color, r0: 2, r1: 18, life: 0.4, flat: true, y: 0.4 });
    }
  },

  // Controllable construct (fist / hammer / wall / turret)
  construct(c, def, st, g, inp) {
    if (st.active && st.active.dead) st.active = null;
    if (inp.pressed && ready(c, def, st)) {
      if (st.active) { st.active.trigger(); }
      else { pay(c, def, st); st.active = g.spawnConstruct(c, def); g.audio.power(true); }
    }
    if (inp.released && st.active && def.holdTrigger) st.active.trigger();
  },

  // Transform / power-up ("sunlight", "final flash" state, use-all-energy)
  buff(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) {
      pay(c, def, st);
      if (def.spendAll) { c.ki = 0; }
      if (def.reveal) c._revealT = def.dur || 8;   // Its Voice: every camera is her eye — fog hides nothing
      c.powerBuff = def.mult || 1.6; c.buffT = def.dur || 10;
      if (def.heal) c.heal(def.heal);
      c.invuln = Math.max(c.invuln, def.invuln || 0.6);   // "invincible" heroes pass big invuln windows
      g.vfx.explode(c.pos.clone().setY(5), { color: def.color, color2: def.color2 || '#fff', radius: 14, power: 1.4, scorch: false });
      g.vfx.shockwave(c.pos.clone().setY(0.2), { color: def.color, radius: 40, power: 1.4 });
      g.vfx.ring(c.pos.clone().setY(3), { color: def.color, r0: 2, r1: 30, life: 0.6, flat: true, y: 0.5 });
      g.world.punch(0.72); g.world.shake(1.4); g.audio.power(true); g.audio.boom(0.7);
      // rising aura pillar
      for (let i = 0; i < 40; i++) g.particles.spawn({ x: c.pos.x + rand(-3, 3), y: rand(0, 6), z: c.pos.z + rand(-3, 3), vx: rand(-3, 3), vy: rand(20, 40), vz: rand(-3, 3), life: 1.0, size: 3.4, color: [def.color, def.color2 || '#fff'], drag: 0.6 });
    }
  },

  // Tentacle grab-slam: lash out, seize a foe, drag them in, then HURL them into geometry —
  // the slam-damage physics (entity._slam) does the wall/ground crunch on arrival.
  tentacle(c, def, st, g, inp) {
    const range = def.range || 34;
    const letGo = () => { if (c.tentacles) for (const t of c.tentacles) t.target = null; st.phase = null; st.foe = null; };
    if (st.phase === 'reach') {
      st.t -= inp.dt;
      if (c.tentacles && st.foe) { st.foe.center(st.pt); for (const t of c.tentacles) t.target = st.pt; }
      if (st.t <= 0) {
        const foe = st.foe;
        if (foe && foe.alive && !foe.phase && foe.invuln <= 0 && !foe.grabbedBy && c.alive &&
            Math.hypot(foe.pos.x - c.pos.x, foe.pos.z - c.pos.z) < range + 10) {
          st.phase = 'hold'; st.t = def.holdT || 0.55; st.esc = foe.teleEscape && foe.ki > 14;
          foe.grabbedBy = c; foe.state = 'hit'; foe.stateT = 0; foe.vel.set(0, 0, 0);
          g.audio.hit(140); g.world.shake(0.5);
          g.vfx.ring(foe.pos.clone().setY(5), { color: def.color || c.def.colors.accent, r0: 1, r1: 8, life: 0.3 });
        } else letGo();
      }
    } else if (st.phase === 'hold') {
      const foe = st.foe;
      if (!foe || !foe.alive || foe.grabbedBy !== c || !c.alive) { if (foe && foe.grabbedBy === c) foe.grabbedBy = null; letGo(); return; }
      st.t -= inp.dt;
      // constrict: drag the victim toward the kraken
      const hx = c.pos.x + c.aim.x * 7 - foe.pos.x, hz = c.pos.z + c.aim.z * 7 - foe.pos.z;
      foe.pos.x += hx * 6 * inp.dt; foe.pos.z += hz * 6 * inp.dt;
      foe.vel.set(0, 0, 0); foe.state = 'hit'; foe.stateT = 0;
      foe.center(st.pt); if (c.tentacles) for (const t of c.tentacles) t.target = st.pt;
      if (foe.thorns) c.takeDamage(foe.thorns * inp.dt, { src: foe, trueDamage: true });
      // blink-capable heroes rip free at the midpoint (same rule as front melee grabs)
      if (st.esc && st.t <= (def.holdT || 0.55) * 0.5) {
        st.esc = false; foe.ki -= 14; g.afterimage(foe);
        foe.pos.x -= c.aim.x * 24; foe.pos.z -= c.aim.z * 24; foe.invuln = 0.4; foe.grabbedBy = null;
        g.audio.teleport(); g.vfx.flash(foe.pos.clone().setY(5), foe.def.colors.accent, 6, 0.2);
        letGo(); return;
      }
      if (st.t <= 0) {
        foe.grabbedBy = null; foe.state = 'idle';
        // hurl at the nearest cover block within 60 — else skyward so they crater on the way down
        let tx = null, tz = null, bd = 60;
        for (const cv of g.world.cover) { const d = Math.hypot(cv.x - foe.pos.x, cv.z - foe.pos.z); if (d < bd && d > 6) { bd = d; tx = cv.x; tz = cv.z; } }
        const spd = def.throwSpeed || 88;
        let kb;
        if (tx != null) { const d = Math.hypot(tx - foe.pos.x, tz - foe.pos.z) || 1; kb = { x: (tx - foe.pos.x) / d * spd, y: 10, z: (tz - foe.pos.z) / d * spd }; }
        else kb = { x: c.aim.x * spd * 0.7, y: 30, z: c.aim.z * spd * 0.7 };
        foe.takeDamage((def.damage || 14) * c.powerBuff, { src: c, unblockable: true, hitstop: 0.12, kb });
        if (c.grabHeal) c.heal((def.damage || 14) * c.grabHeal);
        g.vfx.impact(foe.pos.clone().setY(5.6), { x: kb.x, z: kb.z }, { color: def.color || c.def.colors.accent, power: 1.7 });
        g.world.shake(1.4); g.world.punch(0.72); g.audio.impact(1.3); g.slowmo(0.1, 0.45);
        letGo();
      }
    }
    if (inp.pressed && ready(c, def, st) && !st.phase) {
      const foe = g.coneFoe(c, range, def.arc || 1.1) || g.nearestFoe(c, c.pos, range * 0.7);
      if (foe) {
        pay(c, def, st);
        st.phase = 'reach'; st.t = def.reachT || 0.22; st.foe = foe; st.pt = st.pt || new THREE.Vector3(); foe.center(st.pt);
        c.state = 'cast'; c.stateT = 0; g.audio.zap(240);
      }
    }
  },

  // Dimensional doors (think Portal): first press opens the ORANGE door at your aim,
  // second press opens the BLUE door — fighters and projectiles that touch one exit the other.
  portal(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) { pay(c, def, st); g.placePortal(c, def); }
  },

  // Bow — hold to DRAW (damage/speed scale with draw), release to loose an arrow.
  // The arrow's payload comes from the caster's quiver selection (poison / flame / explosive).
  bow(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st) && !st.drawing) { st.drawing = true; st.drawT = 0; }
    if (st.drawing) {
      if (inp.held) {
        st.drawT = Math.min(1, st.drawT + inp.dt / (def.drawTime || 0.85));
        c._bowDrawT = st.drawT;                       // drives the draw pose (bow arm out, hand to cheek)
        c.state = 'charge'; c.stateT = 0;
        c.vel.x *= 0.8; c.vel.z *= 0.8;
        if (Math.random() < 0.15) g.particles.spawn({ x: c.pos.x, y: c.pos.y + 5.8, z: c.pos.z, vx: 0, vy: 2, vz: 0, life: 0.2, size: 1.2, color: '#fff', drag: 2, shrink: true });
      }
      if (inp.released || (!inp.held && st.drawT > 0)) {
        const t = st.drawT; st.drawing = false; c._bowDrawT = 0;
        pay(c, def, st);
        const payloads = def.payloads || ['explosive', 'flame', 'poison'];
        const payload = payloads[c._quiverIdx % payloads.length];
        const m = c.muzzle(_v.clone(), 3.8, 5.9);
        g.projectiles.spawnProjectile(c, {
          pos: m, vel: c.aim3.clone().setLength(lerp(90, def.speedMax || 210, t)),
          radius: 0.7, damage: lerp(def.dmgMin || 7, def.dmgMax || 26, t), blast: payload === 'explosive' ? (def.blast || 11) : 1.2,
          power: payload === 'explosive' ? 1.1 : 0.4, arrow: true, payload, life: 2.2,
          color: PAYLOAD_COLORS[payload] || '#d8d2c4', color2: '#fff', shock: payload === 'explosive',
        });
        g.audio.zap(880); g.audio.blast(300, 0.06);
      }
    }
  },

  // Quiver — cycle the arrow payload. Free, instant; the kit widget shows what's nocked.
  quiver(c, def, st, g, inp) {
    if (inp.pressed && st.cd <= 0) {
      st.cd = 0.25;
      const payloads = def.payloads || ['explosive', 'flame', 'poison'];
      c._quiverIdx = (c._quiverIdx + 1) % payloads.length;
      const mode = payloads[c._quiverIdx];
      g.vfx.ring(c.pos.clone().setY(5.5), { color: PAYLOAD_COLORS[mode] || '#fff', r0: 1, r1: 5, life: 0.25 });
      g.audio.zap(640);
      if (g.isHuman(c) && g.hud) g.hud.feed('Arrows: ' + mode.toUpperCase(), PAYLOAD_COLORS[mode]);
    }
  },

  // Pulse rifle / firearm — held auto-fire tracers with spread + recoil (ammo = ki)
  rifle(c, def, st, g, inp) {
    if (inp.held && c.ki < (def.cost || 2)) { if (!st._dry) { st._dry = true; drained(c, g); } }
    else if (!inp.held) st._dry = false;
    if (inp.held && st.cd <= 0 && c.ki >= (def.cost || 2)) {
      c.ki -= (def.cost || 2); st.cd = def.interval || 0.09;
      c.state = 'cast'; c.stateT = 0; c.punchPose = 1;
      const m = c.muzzle(_v.clone(), 4.4, 5.7);
      const spread = def.spread || 0.045;
      const a = Math.atan2(c.aim3.z, c.aim3.x) + rand(-spread, spread);
      g.projectiles.spawnProjectile(c, {
        pos: m, vel: new THREE.Vector3(Math.cos(a), c.aim3.y + rand(-spread, spread), Math.sin(a)).setLength(def.speed || 170),
        radius: def.radius || 0.55, damage: def.damage || 5, blast: def.blast || 2.2, power: 0.35,
        color: def.color, color2: def.color2, life: 1.4,
      });
      c.vel.x -= c.aim.x * (def.recoil || 1.6); c.vel.z -= c.aim.z * (def.recoil || 1.6);   // kick
      g.audio.blast(720 + rand(-60, 60), 0.05); g.muzzleFlash(c, def.color, 0.5);
    }
  },

  // THE MARLETTA (King Stefanos) — charge a serene glowing face; release it and it DRIFTS after its
  // target, arrives... hangs there for a heartbeat... then detonates a massive delayed shockwave.
  // Size, damage, and blast all scale with how much energy he pours into her.
  facebomb(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st) && !st.charging) { st.charging = true; st.chargeT = 0; st.sfx = g.audio.charge(); }
    if (st.charging) {
      const dry = inp.held && !c.spendKi((def.kiPerSec || 13) * inp.dt);
      if (dry) drained(c, g);
      if (inp.held && !dry) {
        st.chargeT = Math.min(def.maxCharge || 2.2, st.chargeT + inp.dt); c.state = 'charge';
        c.vel.x *= 0.85; c.vel.z *= 0.85;
        const c01 = st.chargeT / (def.maxCharge || 2.2);
        const orb = chargeOrb(c, st, def.color || '#ffe8c0'); const m = c.muzzle(_v.clone(), 3.6, 6.4);
        orb.position.copy(m); orb.scale.setScalar(1 + c01 * 2.6);
        if (st.sfx) st.sfx.ramp(c01);
        g.chargeGather(c, def.color || '#ffe8c0', m, 0.6 + c01 * 1.5);
      } else if (inp.released || (!inp.held) || dry) {
        const c01 = st.chargeT / (def.maxCharge || 2.2);
        st.charging = false; if (st.sfx) { st.sfx.stop(); st.sfx = null; }
        const from = st.orb ? st.orb.position.clone() : c.muzzle(new THREE.Vector3());
        killOrb(c, st);
        if (c01 < 0.1) { st.cd = 0.3; return; }        // barely formed — she fades
        pay(c, def, st);
        g.projectiles.spawnProjectile(c, {
          pos: from, vel: c.aim3.clone().setLength(def.speed || 34),
          radius: (def.minR || 2) + c01 * ((def.maxR || 5.5) - (def.minR || 2)),
          damage: (def.dmgMin || 28) + c01 * ((def.dmgMax || 80) - (def.dmgMin || 28)),
          blast: (def.blastMin || 16) + c01 * ((def.blastMax || 34) - (def.blastMin || 16)),
          power: 1.4 + c01 * 1.2, homing: def.homing || 2.2, life: 7,
          face: true, armDelay: def.armDelay || 0.6, shock: true, ground: true,
          color: def.color || '#ffe8c0', color2: '#ffffff',
        });
        g.audio.blast(180, 0.25); g.world.punch(0.88); g.vfx.flash(from, def.color || '#ffe8c0', 8 + c01 * 8, 0.25);
      }
    }
  },

  // Meteor storm from the sky at the aim point (artillery ult)
  meteor(c, def, st, g, inp) {
    if (st.count > 0) {
      st.timer -= inp.dt;
      if (st.timer <= 0) {
        st.timer = def.interval || 0.22; st.count--;
        const tx = st.tx + rand(-(def.spread || 26), def.spread || 26), tz = st.tz + rand(-(def.spread || 26), def.spread || 26);
        g.projectiles.spawnProjectile(c, {
          pos: new THREE.Vector3(tx + rand(-6, 6), 90, tz + rand(-6, 6)),
          vel: new THREE.Vector3(rand(-4, 4), -60, rand(-4, 4)), grav: 40,
          radius: def.radius || 3, damage: def.damage || 34, blast: def.blast || 18, power: 1.5,
          color: def.color, color2: def.color2, shock: true, ground: true,
        });
      }
    }
    if (inp.pressed && ready(c, def, st)) {
      pay(c, def, st); st.count = def.count || 10; st.timer = 0; st.tx = g.aimPoint.x; st.tz = g.aimPoint.z;
      c.state = 'cast'; g.audio.power(true); g.world.shake(0.6);
      g.vfx.ring(new THREE.Vector3(st.tx, 0.4, st.tz), { color: def.color, r0: 4, r1: def.spread * 2 || 40, life: 0.8, flat: true, y: 0.4 });
    }
  },
};

export function runSlot(c, key, inp, g) {
  const st = c.slots[key]; if (!st) return;
  // pressing an ability you can't afford → tell the player WHY nothing happened
  if (inp.pressed && (st.def.cost || 0) > c.ki && st.cd <= 0 && g.onNoKi) g.onNoKi(c, key);
  const fn = TYPES[st.def.type]; if (fn) fn(c, st.def, st, g, inp);
}

// ---------- double-tap evade — per-hero movement tech (data: def.evade = {kind,...}) ----------
// kinds: dash (burst + i-frames) · blink (short teleport) · sprint (speed surge while it lasts)
//        slide (long low-friction skate) · phase (dash while intangible)
export const EVADE_DEFAULTS = {
  dash: { name: 'Evade Dash', cost: 5, cd: 0.7, power: 105, iframes: 0.22 },
  blink: { name: 'Blink', cost: 8, cd: 1.0, range: 22, iframes: 0.3 },
  sprint: { name: 'Sprint', cost: 6, cd: 2.2, mult: 1.65, dur: 1.5 },
  slide: { name: 'Slide', cost: 4, cd: 0.9, power: 125, slideT: 0.55, iframes: 0.2 },
  phase: { name: 'Phase Slip', cost: 7, cd: 1.1, power: 95, iframes: 0.45 },
  leap: { name: 'Leap', cost: 5, cd: 1.1, up: 46, fwd: 66 },
};

export function performEvade(c, dir, g) {
  const ev = c.def.evade; if (!ev || c.evadeCd > 0 || c.grabbedBy || c.staggerT > 0 || c.state === 'ko') return false;
  const d = { ...EVADE_DEFAULTS[ev.kind || 'dash'], ...ev };
  if (c.ki < (d.cost || 0)) { if (g.onNoKi) g.onNoKi(c, 'evade'); return false; }
  c.ki -= d.cost || 0; c.evadeCd = d.cd || 0.7;
  const color = d.color || c.def.colors.accent;
  const dl = Math.hypot(dir.x, dir.z) || 1; const dx = dir.x / dl, dz = dir.z / dl;
  switch (d.kind) {
    case 'blink': {
      g.afterimage(c); g.vfx.flash(c.pos.clone().setY(5), color, 5, 0.18); g.audio.teleport();
      c.pos.x += dx * (d.range || 22); c.pos.z += dz * (d.range || 22);
      c.vel.multiplyScalar(0.25); c.invuln = Math.max(c.invuln, d.iframes || 0.3);
      g.afterimage(c); g.vfx.flash(c.pos.clone().setY(5), color, 6, 0.2);
      g.particles.burst(c.pos.x, 5, c.pos.z, { count: 14, speed: 22, life: 0.35, size: 2.4, color: ['#fff', color] });
      break;
    }
    case 'sprint':
      c.sprintT = d.dur || 1.5; c.sprintMult = d.mult || 1.65;
      c._sprintThrough = !!d.through; c._sprintLightning = !!d.lightning;   // VOLT: ghost through cover, lightning wake
      g.audio.zap(620); g.trail(c, color); g.afterimage(c);
      break;
    case 'leap':
      c.vel.y += d.up || 36; c.vel.x += dx * (d.fwd || 58); c.vel.z += dz * (d.fwd || 58);
      c.burstT = 0.55;
      g.audio.zap(380); g.vfx.ring(c.pos.clone().setY(0.4), { color, r0: 1, r1: 9, life: 0.3, flat: true, y: 0.4 });
      break;
    case 'slide':
      c.vel.x += dx * (d.power || 125); c.vel.z += dz * (d.power || 125);
      c._slideT = d.slideT || 0.55; c.invuln = Math.max(c.invuln, d.iframes || 0.2);
      g.audio.zap(440); g.trail(c, color);
      break;
    case 'phase':
      c.vel.x += dx * (d.power || 95); c.vel.z += dz * (d.power || 95);
      c.burstT = 0.32; c.invuln = Math.max(c.invuln, d.iframes || 0.45);
      g.afterimage(c); g.afterimage(c); g.audio.teleport(); g.trail(c, color);
      break;
    default: // dash
      c.vel.x += dx * (d.power || 105); c.vel.z += dz * (d.power || 105);
      c.burstT = 0.3; c.invuln = Math.max(c.invuln, d.iframes || 0.22);
      g.afterimage(c); g.audio.zap(500); g.trail(c, color);
  }
  return true;
}

export function abilityLabel(def) { return def.name; }
