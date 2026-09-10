// WAR WORLD: ASCENDANTS — ability engine. Data-driven power types dispatched per input slot.
import { moodMult } from './psyche.js';
import { VOICES } from '../data/armory.js';
import { spawnDuplicates, possess, setElastic, tkGrab, tkThrow, reshape, consumeSlot, mimicKit, summonMount, domeAt, setVisionMode } from './systems2.js';
import { setSize, setInvisible, beginRegen, banish } from './systems.js';
import { visOf } from '../data/visual.js';
import * as THREE from 'three';
import { clamp, rand, TAU, lerp } from '../core/util.js';
import { ChargeGather } from './charge-gather.js';
import {remoteAttack} from './remote-control.js';
import {slotUnlocked,unlockLevel} from '../data/progression.js';
import {TELEPORT_TIERS} from '../data/teleport-tuning.js';
import {teleportDestination} from './teleport-destination.js';
import {handEmissionPosition,volleyPattern,volleySides,attackEntryCost} from './hand-emission.js';
import {firearmEmitter} from './weapon-emission.js';
import {firearmAmmo,emptyFirearm,cancelFirearmReload} from './firearm-ammo.js';
import {energyShellMaterial} from './energy-burst-material.js';
import {conflictingHandSlot} from './cast-channels.js';
import {constructForSlot,resolveConstructPolicy} from './construct-policy.js';
import {naniteUseReason} from './nanite-pose.js';
import {toggleNanite} from './nanite-state.js';
import {beginAbilityMeleePose,cancelAbilityMeleePose} from './ability-melee-pose.js';
import {applyAbilityMeleeHit} from './ability-melee-hit.js';
import {beginWebSnare,clearWebSnare} from './web-snare.js';
import {attackIdentity} from '../data/attack-tuning.js';
import {forearmOccupied} from './weapon-emission.js';
import {findWebZipAnchor,beginWebZip} from './web-zip.js';
import {clearRush,rushInterrupted,rushTargetValid,findRushTarget,rushLanding} from './rush-safety.js';
import {usesThrowAction,beginThrowAction,cancelThrowAction} from './throwable-action.js';
import {firearmLife} from './firearm-aim.js';
export {remoteAttack} from './remote-control.js';

const _v = new THREE.Vector3();

const ORB_GEO = new THREE.SphereGeometry(1, 16, 12);                       // shared — orbs come and go constantly
const ORB_CORE_MAT = new THREE.MeshBasicMaterial({ color: '#fff' });
export const PAYLOAD_COLORS = { poison: '#8fe08a', flame: '#ff7a2a', explosive: '#ffd24a', gas: '#9a4ae0' };

function ready(c, def, st) { return st.cd <= 0 && c.ki >= (def.cost || 0) && c.hitstop <= 0 && c.staggerT <= 0 && c.stunT <= 0; }   // staggered/stunned fighters cast NOTHING
function cooldown(c, def, st) { st.cd = ((def.cd || 0) * ((c.sheet && c.sheet.cdMult) || 1)) * moodMult(c, 'cd', 1); }
function pay(c, def, st) { c.ki -= (def.cost || 0); cooldown(c, def, st); }   // INTELLECT + Tactician shave cooldowns
function beginPaidCharge(c, def, st, g) {
  // Pay entry before building charge. Billing it on release allowed charge drain
  // to spend the same energy twice and launch with a negative ki pool.
  const cost=def.cost || 0;
  if(!c.spendKi(cost))return;
  if(def.type==='charge')st._poseWritten=true;
  st._chargeEntryCost=c.energyInfinite?0:cost;
  st._chargeInvestedKi=cost; // equivalent configured investment also counts for an infinite core
  st.charging=true;st.chargeT=0;st.sfx=g.audio.charge(c.pos);
}
function finishPaidCharge(c, def, st) { st._chargeEntryCost=0;st._chargeInvestedKi=0;cooldown(c,def,st); }
function chargeOrb(c, st, color) {
  if (!st.orb) {
    const spherical=st.def.type==='charge';
    const core = new THREE.Mesh(ORB_GEO, spherical?new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.55,roughness:.28,metalness:.08}):ORB_CORE_MAT);
    const glow = new THREE.Mesh(ORB_GEO, spherical?energyShellMaterial(color,.72):new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(1.6);
    if(spherical){core.scale.setScalar(.55);glow.scale.setScalar(1);}
    if(st.def.type==='beam') {
      // Concentrated emitter, not an opaque ball over the whole caster. The parent
      // still grows with charge; broad blast/spirit-orb silhouettes are unchanged.
      core.scale.setScalar(.27);glow.scale.setScalar(.85);
      glow.material.blending=THREE.NormalBlending;glow.material.opacity=.3;
    }
    st.orb = new THREE.Group(); st.orb.add(core, glow);
    if(st.def.type==='beam'||spherical) { st.gather=new ChargeGather(color,c.def?.effects?.charge);st.orb.add(st.gather); }
    c._game.scene.add(st.orb);
  }
  return st.orb;
}
function killOrb(c, st) {
  st._chargeFx=null;
  if (st.orb) {
    if(st.orb.children[0].material!==ORB_CORE_MAT)st.orb.children[0].material.dispose();
    c._game.scene.remove(st.orb);st.orb.children[1].material.dispose();
    st.gather?.dispose();st.gather=null;st.orb=null;
  }
}
// KO / despawn mid-generation: silence + remove whatever the slot machines left behind.
// Without this, an interrupted charge's hum has no stop scheduled and rings FOREVER
// (the stuck-tone bug); the audio watchdog (audio.sweep) is the backstop for paths we miss.
// Focus can disappear while simulation is paused, before a release edge gets
// consumed. Cancel preparations explicitly; committed remote shots remain owned.
export function cancelHeldSlot(c,key) {
  c._game?.projectiles?.retirePendingNaniteShots?.(c,key);
  const st=c.slots[key];if(!st)return;
  st._handsBusy=false;
  st._handsRetry=false;
  const existingCd=st.cd||0;
    if(st.building){st.building=false;st.fed=0;cooldown(c,st.def,st);}
    if(st.def.type==='growingorb'&&st.active?.charging&&!st.active.launched){
      st.active._dispose(c._game);st.active=null;cooldown(c,st.def,st);
    }
    if(st.charging||st.drawing){
      killOrb(c,st);st.charging=false;st.drawing=false;st.chargeT=0;st.drawT=0;
      st._chargeEntryCost=0;st._chargeInvestedKi=0;cooldown(c,st.def,st);
      st._poseUntil=-1;
      if(c._rangedPose?.slot===key)c._rangedPose=null;
    }
    if(st.sfx){st.sfx.stop();st.sfx=null;}
    if(st._loop){st._loop.stop();st._loop=null;}
    if(st.def.type==='beam'&&st.active&&(!st.def.remoteDetonate||st.active.pendingLaunch)){st.active.end();st.active=null;cooldown(c,st.def,st);}
  st.cd=Math.max(existingCd,st.cd||0);
  if(st.def.type==='bow')c._bowDrawT=0;
  if(c.state==='charge'&&!Object.values(c.slots).some(s=>s.charging||s.building||s.drawing||s.active?.charging))c.state='idle';
}
export function cancelHeldAttacks(c) {
  cancelThrowAction(c);
  cancelFirearmReload(c);
  for(const key of Object.keys(c.slots))cancelHeldSlot(c,key);
  c._bowDrawT=0;
}
export function clearSlotFx(c) {
  cancelThrowAction(c);
  cancelFirearmReload(c);
  clearWebSnare(c);
  c.releaseHang?.();
  cancelAbilityMeleePose(c);
  c._game?.projectiles?.retirePendingNaniteShots?.(c);
  for (const k in c.slots) {
    const s = c.slots[k];
    if(s.def.type==='rush')clearRush(s);
    if(s.def.type==='melee'){s.t=0;s.hit?.clear();}
    s._handsBusy=false;
    s._handsRetry=false;
    if (s.sfx) { s.sfx.stop(); s.sfx = null; }
    if (s.victim) releaseMind(s, c._game);   // the CONTROLLER died/despawned mid-leash — the will snaps back
    killOrb(c, s);
    s._chargeEntryCost=0; // interrupted preparation is spent, never refunded later
    s._chargeInvestedKi=0;
    s.remoteShot=null;
    if(s.def.remoteDetonate && s.def.type==='beam' && s.active){s.active.end();s.active=null;}
  }
}
// Mind control ends — expiry, victim death, or the controller going down (clearSlotFx).
// One release path so the team restore can never drift between them.
function releaseMind(st, g) {
  const v = st.victim; if (!v) return; st.victim = null;
  v.team = st.oldTeam; v._controlled = false; v._oldTeam = undefined;
  if (v.ai) v.ai.belief = null;              // waking up — no idea where anyone went
  if (g && g.vfx) g.vfx.ring(v.pos.clone().setY(v.pos.y + 9), { color: '#c9cfd9', r0: 6, r1: 1, life: 0.3 });
}
// out of ki while holding a charge/sustain → make the failure LOUD and readable (never a silent freeze)
function drained(c, g) { if (g && g.onDrained) g.onDrained(c); }

// Each type: run(c, def, st, g, inp)  — inp = { pressed, held, released, dt }
const clamp01 = (v) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);

export const TYPES = {
  naniteShield(c,def,st,g,inp){
    const key=Object.keys(c.slots).find(k=>c.slots[k]===st),m=c._nanites?.modules.get(key),view=c.parts.nanites?.get(key);
    if(!inp.pressed||!ready(c,def,st)||!m||m.retired||!m.unlocked||m.sourceKey!==attackIdentity(def)||!view||forearmOccupied(view.arm)||c._carry)return;
    toggleNanite(c._nanites,key);cooldown(c,def,st);
  },

  // Rushing fist — "flies fist forward"
  melee(c, def, st, g, inp) {
    if (st.t > 0) {
      st.t -= inp.dt;
      const contact=c._abilityMeleePose?.physicalContact&&c._abilityMeleePose.slot===st;
      if(contact)c._abilityMeleePose.contactPending=true;
      // Losing/cancelling a physical pose must never reinstate the old cone.
      const foe = def.contact==='fist'&&c._openSky?null:g.coneFoe(c, def.range || 11, def.arc || 0.7);
      if (foe && !st.hit.has(foe.id)) {
        applyAbilityMeleeHit(c,def,st,g,foe);
      }
    }
    if (inp.pressed && ready(c, def, st)) {
      pay(c, def, st); st.t = def.active || 0.24; st.hit = new Set(); c.punchPose = 1; c.state = 'cast'; c.stateT = 0;c._castPoseRanged=false;
      beginAbilityMeleePose(c,st);
      c.vel.x += c.aim.x * (def.lunge || 46); c.vel.z += c.aim.z * (def.lunge || 46);
      if (def.fly) { c.vel.y += 8; }
      c.invuln = Math.max(c.invuln, 0.12);
      g.audio.zap(680); g.trail(c, def.color || c.def.colors.accent);
    }
  },

  // Teleporting multi-hit combo. AN ACTIVE GUARD REJECTS IT: the first contact against a raised
  // guard (any angle — you're blocking the flurry, not a direction) bounces the rusher off,
  // ends the combo, and opens the punish window. Rushing a blocker is now a MISTAKE.
  rush(c, def, st, g, inp) {
    if(rushInterrupted(c)){clearRush(st);return;}
    if(c.hitstop>0)return;
    if (st.combo > 0) {
      if(!rushTargetValid(c,st.foe,def,g)){clearRush(st);return;}
      st.timer -= inp.dt;
      if (st.timer <= 0 && st.foe && st.foe.alive) {
        st.timer = def.interval || 0.1;
        const f = st.foe,destination=rushLanding(c,f,st.combo,g);
        if(!destination){clearRush(st);return;}
        c.pos.copy(destination);c.vel.set(0,0,0);
        c.faceDir(f.pos.x - c.pos.x, f.pos.z - c.pos.z); c.invuln = 0.12; c.punchPose = 1;
        if (f.guarding && f.staggerT <= 0) {
          // REJECTED — chip lands, the flurry does not
          f.takeDamage((def.damage || 9) * 0.12 * c.powerBuff, { src: c, unblockable: true, hitstop: 0.04 });
          f.guardMeter = Math.max(0, f.guardMeter - 0.08);
          clearRush(st);
          g.onBlockedStrike(c, f, { stagger: 0.55, push: 46 });
        } else {
          const last = st.combo === 1;
          f.takeDamage((last ? (def.finisher || 30) : (def.damage || 9)) * c.powerBuff, { src: c, strike: true, dmgClass: def.dmgClass, kb: _v.copy(c.aim).setLength(last ? 60 : 6).setY(0), launch: last ? 20 : 2, hitstop: last ? 0.1 : 0.03 });
          const impact=f.center(new THREE.Vector3());
          g.vfx.impact(impact,c.aim3||c.aim,{color:def.color||c.def.colors.accent,power:last?1.2:.65});
          g.trail(c, def.color || c.def.colors.accent); g.audio.hit(260 + st.combo * 20,impact);
          if (last) {
            g.world.shake(1.2); g.world.punch(0.8);
            if(f.pos.y<3)g.vfx.shockwave(f.pos.clone().setY(0.2), { color: def.color, radius: 26, power: 1.2 });
            else g.vfx.ring(impact,{color:def.color,r0:1,r1:12,life:.24});
          }
          g.world.shake(0.3);
          st.combo--;
          if(st.combo<=0)clearRush(st);
        }
      } else if (!st.foe || !st.foe.alive) clearRush(st);
    }
    if (inp.pressed && ready(c, def, st)) {
      if(Object.values(c.slots).some(s=>s.combo>0))return;
      const foe = findRushTarget(c, def, g);
      if (foe) { pay(c, def, st);clearWebSnare(c); st.foe = foe; st.combo = def.hits || 6; st.timer = 0; c.state = 'cast';c._castPoseRanged=false; g.audio.zap(900); }
    }
  },

  // Single ki blast / homing bolt
  projectile(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) {
      const launch=(m,throwMesh=null)=>{
      const velocity=throwMesh?c.aim3.clone():def.grav?c.aim.clone().setY(.5):c.aim3.clone();
      if(throwMesh)velocity.y+=.5;
      const shot=g.projectiles.spawnProjectile(c, { vis: visOf(def),
        collisionPriority:def.collisionPriority,
        pos: m, vel: velocity.setLength(def.speed || 70),throwMesh,launchFlash:throwMesh?false:undefined,
        radius: def.radius || 1.4, damage: def.damage || 14, blast: def.blast || 5, power: def.power || 1,
        homing: def.homing || 0, color: def.color, color2: def.color2, grav: def.grav || 0, shock: def.shock,
        arrow: def.arrow, payload: def.payload, blind: def.blind, boomerang: def.boomerang, range: def.range,
        card: def.card, disc: def.disc, bounces: def.bounces, pumpkin: def.pumpkin,
        blade: def.blade, canister: def.canister,      // thrown steel / shells read as objects, not orbs
        dtype: def.dtype, siphon: def.siphon,          // the damage TYPE rides the shot
        splitCount:def.remoteDetonate?def.splitCount:0,splitSpread:def.splitSpread,splitSpeed:def.splitSpeed,splitHoming:def.splitHoming,
      });
      if(def.remoteDetonate)st.remoteShot=shot;
      if(throwMesh)return;
      if (def.dtype === 'magic') g.audio.zap(760, c.pos); else g.audio.kiRelease(0.32, c.pos);
      g.muzzleFlash(c, def.color);
      };
      if(usesThrowAction(c,def)){
        if(beginThrowAction(c,st,launch))pay(c,def,st);
        return;
      }
      st._poseWritten=true;
      pay(c, def, st); c.punchPose = 1; c.state = 'cast'; c.stateT = 0;c._castPoseRanged=true;
      launch(c.muzzle(_v.clone(),3.6,5.8));
    }
  },

  // Actual anatomical hand emissions; paired fire pays for both shots atomically.
  volley(c, def, st, g, inp) {
    const cost=attackEntryCost(def);
    if (inp.held && c.ki < cost) { if (!st._dry) { st._dry = true; drained(c, g); } }
    else if (!inp.held) st._dry = false;
    if (inp.held && st.cd <= 0 && c.ki >= cost) {
      st._poseWritten=true;
      c.ki -= cost; st.cd = def.interval || 0.08;
      c.state = 'cast'; c.stateT = 0; c.punchPose = 1;c._castPoseRanged=true;
      const handShots=st.handShots ||= {};
      for(const side of volleySides(def,st)){
      handShots[side]=c.animT||0;
      const m = handEmissionPosition(c,side,new THREE.Vector3());
      const spread = (def.spread || 0.09) * ((c.sheet && c.sheet.spreadMult) || 1);
      // Authoring/replay can own the gameplay spread stream independently of
      // cosmetic particles. Normal matches retain the existing random draw.
      const spreadDraw=typeof g.attackRandom==='function'?-spread+g.attackRandom()*(2*spread):rand(-spread,spread);
      const a = Math.atan2(c.aim3.z, c.aim3.x) + spreadDraw;
      g.projectiles.spawnProjectile(c, { vis: visOf(def),
        collisionPriority:def.collisionPriority,
        handOrigin:side,
        launchTarget:c.hasAimWorld?c.aimWorld:null,launchSpread:spreadDraw,
        pos: m, vel: new THREE.Vector3(Math.cos(a)*Math.hypot(c.aim3.x,c.aim3.z), c.aim3.y, Math.sin(a)*Math.hypot(c.aim3.x,c.aim3.z)).setLength(def.speed || 105),
        radius: def.radius || 0.8, damage: def.damage || 6, blast: def.blast || 3.4, power: 0.5, color: def.color, color2: def.color2,
        arrow: def.arrow, payload: def.payload, blind: def.blind, blade: def.blade,
        grav: def.grav, card: def.card, ground: def.grav > 0,
        homing: def.homing, bounces: def.bounces,
      });
      }
      g.audio.blast(560 + rand(-40, 40), 0.08);
    }
  },

  // Wave Cannon-hose / heat-beam / violet beam (traveling tip, optional charge)
  beam(c, def, st, g, inp) {
    // finish if the live beam self-terminated (ran out of ki)
    if (st.active && st.active.dead) { st.active = null; st.cd = def.cd || 0; }
    if (inp.pressed && ready(c, def, st) && !st.active && !st.charging) {
      if (def.charge) beginPaidCharge(c, def, st, g);
      else if(c.spendKi(def.cost||0)) { st.active = g.spawnBeamFor(c, def, 1, def.cost||0); cooldown(c,def,st); }
    }
    if (st.charging) {
      const dry = inp.held && st.chargeT < (def.maxCharge || 1.6) && !c.spendKi((def.kiChargePerSec || 14) * inp.dt);
      if (inp.held && !dry && st.chargeT < (def.maxCharge || 1.6)) {
        st._chargeInvestedKi+=(def.kiChargePerSec || 14)*inp.dt;
        st.chargeT += inp.dt; c.state = 'charge';
        const orb = chargeOrb(c, st, def.color); const m = c.muzzle(_v.clone(), 3.6, 5.8);
        orb.position.copy(m); orb.scale.setScalar(0.6 + st.chargeT * 1.6);
        if (st.sfx) st.sfx.ramp(st.chargeT / (def.maxCharge || 1.6));
        st.gather.update(st.chargeT,st.chargeT/(def.maxCharge||1.6));
      } else if (inp.released || st.chargeT >= (def.maxCharge || 1.6) || dry) {
        // ran dry mid-charge → fire at whatever you paid for (never a frozen orb), with a clear cue
        if (dry) drained(c, g);
        const p = 1 + (st.chargeT / (def.maxCharge || 1.6)) * (def.chargePower || 1.4);
        killOrb(c, st); if (st.sfx) { st.sfx.stop(); st.sfx = null; }
        st.charging = false; st.active = g.spawnBeamFor(c, def, p, st._chargeInvestedKi); finishPaidCharge(c, def, st);
        // The beam owns release feedback: a preparing emitter has not fired.
        return; // don't let this same-frame release also end the beam
      }
    }
    if (st.active && inp.released && !def.remoteDetonate) { st.active.end(); st.active = null; st.cd = def.cd || 0; }
  },

  // Wide breath cone — cold (slow) or force (push)
  cone(c, def, st, g, inp) {
    if (inp.held && c.ki < (def.kiPerSec || 18) * inp.dt) { if (!st._dry) { st._dry = true; drained(c, g); } if (st._loop) { st._loop.stop(); st._loop = null; } }
    else if (!inp.held) st._dry = false;
    if (inp.held && c.ki >= (def.kiPerSec || 18) * inp.dt) {
      c.ki -= (def.kiPerSec || 18) * inp.dt; c.state = 'cast'; c.stateT = 0;c._castPoseRanged=false;
      c.vel.x *= 0.7; c.vel.z *= 0.7;
      const range = def.range || 34, arc = def.arc || 1.05;
      const m = c.muzzle(_v.clone(), 3.0, 6.2);
      for (const f of g.entities) {
        if (!g.isFoe(c, f)) continue;
        const dx = f.pos.x - c.pos.x, dz = f.pos.z - c.pos.z; const d = Math.hypot(dx, dz);
        if (d > range || d < 0.1) continue;
        const dot = (dx / d) * c.aim.x + (dz / d) * c.aim.z;
        if (dot < Math.cos(arc)) continue;
        f.takeDamage((def.dps || 26) * c.powerBuff * inp.dt, { src: c, dot: true, hitstop: 0, dtype: def.dtype || (def.cold ? 'cold' : 'energy') });
        if (def.cold) {
          f.vel.x *= 0.86; f.vel.z *= 0.86; f._chill = 0.5; f.speed = Math.max(8, (f.def.speed || 30) * 0.55);
          f.addFrost((def.frost || 0.5) * inp.dt, c);   // sustained cold ENCASES you in ice (strength breaks out)
        }
        if (def.gasDot) f.addDot({ dps: def.gasDot.dps || 6, dur: def.gasDot.dur || 2.2, color: def.gasDot.color || def.color, kind: def.gasDot.kind || 'gas', corrode: def.gasDot.corrode, src: c });
        if (def.kiDrain) { const dr = def.kiDrain * inp.dt; f.ki = Math.max(0, f.ki - dr); c.ki = clamp(c.ki + dr * 0.6, 0, c.maxKi); }   // JAWAH: eats their sound/energy
        else { const pushr = (def.push || 40) * inp.dt * 8; f.vel.x += (dx / d) * pushr; f.vel.z += (dz / d) * pushr; if (def.lift) f.vel.y = Math.min(f.vel.y + def.lift * inp.dt * 24, 22); }
      }
      // GROUND SPIKES (brief T2.8): cracks race forward along the ground, THEN the spikes come
      // up in sequence — real, temporary cover you can hide behind, made of whatever the ground
      // is. They are registered as destructible cover and swept when the duration ends.
      if (def.spikes) {
        st._spkT = (st._spkT || 0) - inp.dt;
        if (st._spkT <= 0) {
          st._spkT = def.spikes.interval || 0.12;
          const step = (st._spkN = (st._spkN || 0) + 1);
          const d0 = Math.min(range, 8 + step * (def.spikes.step || 7));
          if (d0 <= range) {
            const sx = c.pos.x + c.aim.x * d0, sz = c.pos.z + c.aim.z * d0;
            g.raiseSpike(sx, sz, def.spikes, c);
          } else st._spkN = 0;
        }
      }
      // MAGNET PULL (brief T2.12): metal only. A wooden tree does not care about a magnet, and
      // that contrast is the whole read — it is magnetism, not telekinesis.
      if (def.magnet) {
        const pull = (def.magnet.force || 60) * inp.dt;
        for (const list of [g.world.cars || [], g.world.planes || []]) {
          for (const o of list) {
            if (o.dead || o.carried) continue;
            const dx = c.pos.x - o.x, dz = c.pos.z - o.z, d = Math.hypot(dx, dz);
            if (d > range || d < 3) continue;
            const dot = (-dx / d) * c.aim.x + (-dz / d) * c.aim.z;
            if (dot < Math.cos(arc)) continue;
            o.x += (dx / d) * pull; o.z += (dz / d) * pull;
            if (o.mesh) o.mesh.position.set(o.x, o.mesh.position.y, o.z);
            else if (o.meshes) for (const mm of o.meshes) mm.position.x += (dx / d) * pull, mm.position.z += (dz / d) * pull;
            if (Math.random() < 0.2) g.particles.spawn({ x: o.x, y: 3, z: o.z, vx: (dx / d) * 8, vy: 1, vz: (dz / d) * 8, life: 0.3, size: 1.4, color: ['#bfe9ff', '#8fb0d0'], drag: 0.6 });
          }
        }
      }
      // mist particles — SONIC cones are TRANSPARENT PRESSURE instead (brief Tier1 #5): the force
      // is visible through compression rings and dragged street dust, never a glowing energy cone.
      if (def.sonic) {
        st._ringT = (st._ringT || 0) - inp.dt;
        if (st._ringT <= 0) {
          st._ringT = 0.09;
          const rd = 6 + Math.random() * (range - 8);
          g.vfx.ring(new THREE.Vector3(c.pos.x + c.aim.x * rd, m.y + rand(-1.5, 1.5), c.pos.z + c.aim.z * rd),
            { color: '#e8e2d4', r0: 1 + rd * 0.05, r1: 2.8 + rd * 0.14, life: 0.22 });
        }
        for (let i = 0; i < 2; i++) {
          const a2 = Math.atan2(c.aim.z, c.aim.x) + rand(-arc, arc);
          g.particles.spawn({ x: c.pos.x + Math.cos(a2) * rand(4, range * 0.8), y: 0.6 + Math.random() * 2.2, z: c.pos.z + Math.sin(a2) * rand(4, range * 0.8), vx: Math.cos(a2) * 26, vz: Math.sin(a2) * 26, vy: rand(1, 4), life: 0.4, size: 2.6, color: ['#8a8577', '#6a655a'], drag: 1.6, shrink: true });
        }
      } else for (let i = 0; i < 4; i++) {
        const a = Math.atan2(c.aim.z, c.aim.x) + rand(-arc, arc);
        g.particles.spawn({ x: m.x, y: m.y + rand(-1, 1), z: m.z, vx: Math.cos(a) * range * 1.6, vz: Math.sin(a) * range * 1.6, vy: rand(-2, 2), life: 0.5, size: def.cold ? 5 : 4, color: def.color, drag: 1.4, shrink: true });
      }
      // THE CONE VOICE — a sustained loop keyed to the element, started on the first held frame and
      // faded on release (not cut). fire ROARS, gas HISSES, cold CRACKLES, acid SIZZLES.
      if (!st._loop) {
        const kind = def.sonic ? 'ice' : def.cold ? 'ice' : def.gasDot ? 'gas' : (def.dtype === 'acid') ? 'acid' : def.kiDrain ? 'gas' : 'fire';   // SONIC = rushing air, not element roar (manual §20)
        st._loop = g.audio.sustain ? g.audio.sustain(kind, c.pos) : null;
      }
      if (st._loop) st._loop.set(0.7 + (def.dps || 26) / 60, c.pos);
    } else if (st._loop) { st._loop.stop(); st._loop = null; }   // released / ran dry → fade out
  },

  // Nova Burst — charge scales size/damage/radius; ground impact => shockwave + lightning
  charge(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st) && !st.charging) beginPaidCharge(c, def, st, g);
    if (st.charging) {
      const dry = inp.held && !c.spendKi((def.kiPerSec || 12) * inp.dt);
      if (dry) drained(c, g);                                  // out of ki → hurl what you built up, loudly
      if (inp.held && !dry) {
        st.chargeT = Math.min(def.maxCharge || 2.2, st.chargeT + inp.dt); c.state = 'charge';
        const c01 = st.chargeT / (def.maxCharge || 2.2);
        const orb = chargeOrb(c, st, def.color); const m = c.muzzle(_v.clone(), def.chest ? 1.2 : 3.4 + c01 * 2, def.chest ? 5.4 : 5.8);
        st._chargeRadius=(def.minR||1.3)+c01*((def.maxR||5)-(def.minR||1.3));
        orb.position.copy(m); orb.scale.setScalar(st._chargeRadius);
        if (st.sfx) st.sfx.ramp(c01);
        st._chargeFx=c01; // consumed once, after the final pose and hit-reaction carrier
        st.gather?.update(st.chargeT,c01);
        if (c01 > 0.6 && Math.random() < c01 * 0.4) g.world.shake(0.15 * c01);
      } else if (inp.released || (!inp.held) || dry) {
        // ⚠ `st.chargeT` is undefined if a release arrives without a charge ever having started
        // (a stray released-edge, a netplay echo, a scripted test). `undefined / n` is NaN, and
        // `NaN < 0.12` is FALSE — so the fizzle-guard below let NaN straight through into damage,
        // scale and audio. Clamp it to a real number first.
        const c01 = Math.max(0, Math.min(1, (st.chargeT || 0) / (def.maxCharge || 2.2)));
        st.charging = false; if (st.sfx) { st.sfx.stop(); st.sfx = null; }
        const orbPos = st.orb ? st.orb.position.clone() : c.muzzle(new THREE.Vector3());
        killOrb(c, st);
        if (c01 < 0.12) {
          // No projectile formed: return the entry fee, not charge energy already spent.
          c.ki=Math.min(c.maxKi,c.ki+(st._chargeEntryCost || 0));st._chargeEntryCost=0;
          st.cd = 0.2; return;
        }
        finishPaidCharge(c, def, st);
        st._poseWritten=true;
        const power = 1 + c01 * (def.chargePower || 3);
        const naniteSlot=def.naniteForm==='cannon'?Object.keys(c.slots).find(k=>c.slots[k]===st):null;
        const shot=g.projectiles.spawnProjectile(c, { vis: visOf(def),
          collisionPriority:def.collisionPriority,
          powerOrigin:{...(naniteSlot?{naniteForm:'cannon',slot:naniteSlot,epoch:c._nanites.modules.get(naniteSlot).epoch}:{}),faceOrigin:def.faceOrigin,chest:def.chest,castStyle:def.castStyle,castHand:def.castHand,charge:def.charge,radius:lerp(def.minR||1.3,def.maxR||5,c01)},
          naniteRelease:def.naniteForm==='cannon'?{sound:.5+c01*1.1,punch:.85-c01*.15,shake:.6+c01}:null,
          launchTarget:c.hasAimWorld?c.aimWorld:null,
          launchFlash:{color:def.color,size:8+c01*8,life:.2},
          pos: orbPos, vel: c.aim3.clone().setLength(lerp(def.speedMax || 70, def.speedMin || 42, c01)),
          radius: lerp(def.minR || 1.3, def.maxR || 5, c01), damage: lerp(def.dmgMin || 20, def.dmgMax || 70, c01),
          blast: lerp(8, def.maxBlast || 26, c01), power, color: def.color, color2: def.color2, shock: true, ground: true,
          splitCount:def.remoteDetonate?def.splitCount:0,splitSpread:def.splitSpread,splitSpeed:def.splitSpeed,splitHoming:def.splitHoming,
        });
        if(def.remoteDetonate)st.remoteShot=shot;
        if(def.naniteForm!=='cannon'){g.audio.kiRelease(0.5 + c01 * 1.1, c.pos); g.world.punch(0.85 - c01 * 0.15); g.world.shake(0.6 + c01);}
      }
    }
  },

  // Star Sphere — grow overhead, then hurl
  growingorb(c, def, st, g, inp) {
    if (st.active && st.active.dead) { st.active = null; st.cd = def.cd || 0; if (st.sfx) { st.sfx.stop(); st.sfx = null; } }
    if (inp.pressed && ready(c, def, st) && !st.active) {
      pay(c, def, st); st.active = g.projectiles.spawnGrowingOrb(c, { minR: def.minR || 4, maxR: def.maxR || 18, growRate: def.growRate || 8, kiPerSec: def.kiPerSec || 16, color: def.color, color2: def.color2 });
      st.sfx = g.audio.charge(c.pos);
    }
    if (st.active) {
      if (st.sfx) st.sfx.ramp(st.active.charge01);
      if (inp.released) { st.active.launch(); if (st.sfx) { st.sfx.stop(); st.sfx = null; } st.active = null; g.audio.kiRelease(1.4, c.pos); g.world.shake(0.5); }
    }
  },

  // Blink to aim point
  teleport(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) {
      pay(c, def, st);
      // ⚠ INTERCEPT FIRST. If you have just launched someone and they are still in the air, this
      // teleport chases them instead of going to the cursor — that is the ESF combo, and putting it
      // here means the two delivery lanes share one implementation (see `game.intercept`).
      if (g.intercept && g.intercept(c)) return;
      g.afterimage(c); g.vfx.flash(c.pos.clone().setY(5), def.color || c.def.colors.accent, 6, 0.22); g.audio.teleport();
      const ox = c.pos.x, oz = c.pos.z;   // SMOKE VANISH: the departure point IS the smoke bomb
      const range = def.range || 42; const target = g.aimPoint;
      const dx = target.x - c.pos.x, dz = target.z - c.pos.z; const d = Math.hypot(dx, dz) || 1;
      const dd = Math.min(range, d);
      c.pos.x += (dx / d) * dd; c.pos.z += (dz / d) * dd;
      c.vel.multiplyScalar(0.2); c.invuln = 0.28; c.faceDir(dx, dz);
      g.afterimage(c); g.vfx.flash(c.pos.clone().setY(5), def.color || c.def.colors.accent, 7, 0.28);
      g.particles.burst(c.pos.x, 5, c.pos.z, { count: 18, speed: 24, life: 0.4, size: 2.6, color: ['#fff', def.color || c.def.colors.accent] });
      if (def.blind && g.addSmoke) g.addSmoke(ox, oz, def.blind.r || 14, def.blind.dur || 2.6, c);
    }
  },

  // Energy-intangibility: hold to phase through strikes & projectiles (drains ki)
  // PHASE also carries PHASE WALK (brief T2.17): `def.walk` lets the intangible body cross
  // INTERIOR walls, which ordinary phase does not — the body reads as glass, not smoke,
  // because smoke is already Shadow Step's language.
  phase(c, def, st, g, inp) {
    if (inp.held && c.spendKi((def.kiPerSec || 16) * inp.dt)) {
      if (!c.phase) { c.phase = true; c._phaseWalk = !!def.walk; g.audio.teleport(); g.vfx.ring(c.pos.clone().setY(5), { color: def.color || c.def.colors.accent, r0: 2, r1: 8, life: 0.3 });
        st._loop = g.audio.sustain ? g.audio.sustain('phase', c.pos) : null; }   // the otherworldly hum
      if (st._loop) st._loop.set(1, c.pos);
      if (Math.random() < 0.25) g.particles.burst(c.pos.x, c.pos.y + 5, c.pos.z, { count: 2, speed: 6, life: 0.4, size: 2.2, color: [def.color || c.def.colors.accent, '#fff'] });
    } else if (c.phase) { c.phase = false; g.audio.zap(240); if (st._loop) { st._loop.stop(); st._loop = null; } if (inp.held) drained(c, g); }   // slipped back in — hum fades
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
      if (def.decoy) g.spawnDecoy(c, def.dur || 5);   // DECOY HOLOGRAM (brief T2.9)
      else g.summon(c, def);
      g.vfx.flash(c.pos.clone().setY(5), def.color, 8, 0.3); g.audio.power(true);
      g.vfx.ring(c.pos.clone().setY(1), { color: def.color, r0: 2, r1: 18, life: 0.4, flat: true, y: 0.4 });
    }
  },

  // Controllable construct (fist / hammer / wall / turret)
  construct(c, def, st, g, inp) {
    const policy=resolveConstructPolicy(def);
    if(def.construct==='tank'||policy.mode!=='timed'){
      if(c.alive===false||c.hitstop>0||c.staggerT>0||c.stunT>0||c.frozenT>0||c.grabbedBy||c.grabbing||c.grabState||c.sleepT>0||c.downedT>0)return;
      if(st.active?.dead)st.active=null;
      if(inp.pressed){
        if(st.active){st.active._dispose(g,'dismissed');return;}
        if(ready(c,def,st)){
          const active=g.spawnConstruct(c,def,st);
          if(active){pay(c,def,st);st.active=active;g.audio.power(true);}
        }
      }
      return; // Release/focus cancellation is never a resource dismissal.
    }
    if (st.active && st.active.dead) st.active = null;
    if (inp.pressed && ready(c, def, st)) {
      if (st.active) { st.active.trigger(); }
      else { pay(c, def, st); st.active = g.spawnConstruct(c, def); g.audio.power(true); }
    }
    if (inp.released && st.active && def.holdTrigger) st.active.trigger();
  },

  // Transform / power-up ("sunlight", "final flash" state, use-all-energy)
  // BUFF also carries three Tier-2 lanes now, all as data on the same type:
  //   · siphonAura {r, dps}  — VAMPIRIC AURA (T2.7): drains everyone near you, heals you
  //   · hpPerSec             — ADRENALINE SURGE (T2.14): power bought with blood
  //   · riposte {dmg}        — COUNTER STANCE (T2.18): the next melee hit is answered
  buff(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) {
      pay(c, def, st);
      // the three Tier-2 buff lanes ride the same activation
      if (def.siphonAura) c._siphon = { r: def.siphonAura.r || 22, dps: def.siphonAura.dps || 9, t: def.dur || 6, color: def.color || '#8a1d24' };
      if (def.hpPerSec) c._bloodBuff = { hps: def.hpPerSec, t: def.dur || 6 };
      if (def.riposte) c._riposte = { t: def.riposte.window || def.dur || 2.2, dmg: def.riposte.dmg || 26, used: false };
      if (def.spendAll) { c.ki = 0; }
      if (def.reveal) c._revealT = def.dur || 8;   // Its Voice: every camera is her eye — fog hides nothing
      c.powerBuff = def.mult || 1.6; c.buffT = def.dur || 10;
      if (def.heal) c.heal(def.heal);
      c.invuln = Math.max(c.invuln, def.invuln || 0.6);   // "invincible" heroes pass big invuln windows
      g.vfx.explode(c.pos.clone().setY(5), { color: def.color, color2: def.color2 || '#fff', radius: 14, power: 1.4, scorch: false });
      g.vfx.shockwave(c.pos.clone().setY(0.2), { color: def.color, radius: 40, power: 1.4 });
      g.vfx.ring(c.pos.clone().setY(3), { color: def.color, r0: 2, r1: 30, life: 0.6, flat: true, y: 0.5 });
      g.world.punch(0.72); g.world.shake(1.4); g.audio.power(true); g.audio.boom(0.7, c.pos);
      if (c.def.yells) { c._yellCd = 0; g.heroYell(c, 1.4); }   // the transformation ROAR
      // rising aura pillar
      for (let i = 0; i < 40; i++) g.particles.spawn({ x: c.pos.x + rand(-3, 3), y: rand(0, 6), z: c.pos.z + rand(-3, 3), vx: rand(-3, 3), vy: rand(20, 40), vz: rand(-3, 3), life: 1.0, size: 3.4, color: [def.color, def.color2 || '#fff'], drag: 0.6 });
    }
  },

  // Tentacle grab-slam: lash out, seize a foe, drag them in, then HURL them into geometry —
  // the slam-damage physics (entity._slam) does the wall/ground crunch on arrival.
  tentacle(c, def, st, g, inp) {
    if(def.web){
      if(inp.pressed&&ready(c,def,st)&&beginWebSnare(c,def,st,g))pay(c,def,st);
      return;
    }
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
        c.state = 'cast'; c.stateT = 0;c._castPoseRanged=false; g.audio.zap(240);
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
        // ⚠ CLAMP THE FRACTION AT SOURCE (the same law charge's `c01` learned): a release with
        // no accumulated draw, or a caller that forgot `dt`, must never produce NaN — a NaN
        // draw becomes setLength(NaN), an arrow at a NaN position, and a dead frame.
        st.drawT = clamp01(st.drawT + (Number.isFinite(inp.dt) ? inp.dt : 0) / (def.drawTime || 0.85));
        c._bowDrawT = st.drawT;                       // drives the draw pose (bow arm out, hand to cheek)
        c.state = 'charge'; c.stateT = 0;
        c.vel.x *= 0.8; c.vel.z *= 0.8;
        if (!st._loop) st._loop = g.audio.sustain ? g.audio.sustain('bow', c.pos) : null;   // string tension creak
        if (st._loop) st._loop.set(st.drawT, c.pos);
        if (Math.random() < 0.15) g.particles.spawn({ x: c.pos.x, y: c.pos.y + 5.8, z: c.pos.z, vx: 0, vy: 2, vz: 0, life: 0.2, size: 1.2, color: '#fff', drag: 2, shrink: true });
      }
      if (inp.released || (!inp.held && st.drawT > 0)) {
        const t = clamp01(st.drawT); st.drawing = false; c._bowDrawT = 0;
        pay(c, def, st);
        const payloads = def.payloads || ['explosive', 'flame', 'poison'];
        const payload = payloads[c._quiverIdx % payloads.length];
        const m = c.muzzle(_v.clone(), 3.8, 5.9);
        g.projectiles.spawnProjectile(c, { vis: visOf(def),
          pos: m, vel: c.aim3.clone().setLength(lerp(90, def.speedMax || 210, t)),
          radius: 0.7, damage: lerp(def.dmgMin || 7, def.dmgMax || 26, t), blast: payload === 'explosive' ? (def.blast || 11) : 1.2,
          power: payload === 'explosive' ? 1.1 : 0.4, arrow: true, payload, life: 2.2,
          color: PAYLOAD_COLORS[payload] || '#d8d2c4', color2: '#fff', shock: payload === 'explosive',
        });
        if (st._loop) { st._loop.stop(); st._loop = null; }   // release the tension
        g.audio.bowLoose(t, c.pos);                            // a real twang, draw-scaled
      }
    }
  },

  // ---- TIER THREE (docs/POWERS_BRIEF.md Part Five): each type drives an ENGINE SYSTEM, so
  // one registration here unlocks the whole family for every future kit.

  // 1 · WEATHER COMMAND — rain, wind, cloud and lightning, arriving GRADUALLY
  weather(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) {
      pay(c, def, st);
      g.weather.command({ rain: def.rain ?? 0.8, wind: def.wind ?? 0.6, cloud: def.cloud ?? 0.7, storm: def.storm ?? 0.5, dur: def.dur || 14, src: c });
      g.vfx.ring(c.pos.clone().setY(9), { color: def.color || '#9fd0ff', r0: 2, r1: 22, life: 0.6 });
      g.audio.blast(140, 0.5, c.pos);
      if (g.hud) g.hud.announce('WEATHER', 'the sky answers', def.color || '#9fd0ff');
    }
  },

  // 2 · SIZE CHANGE — grow or shrink; mass, reach, speed and impact all move together
  size(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) {
      pay(c, def, st);
      const to = c.sizeScale && Math.abs(c.sizeScale - (def.scale || 1.9)) < 0.01 ? 1 : (def.scale || 1.9);
      setSize(c, to, to === 1 ? 0 : (def.dur || 10), g);
    }
  },

  // 3 · TIME DILATION FIELD — a local time-scale bubble; the caster is exempt
  timefield(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) {
      pay(c, def, st);
      const p = c.pos.clone().add(c.aim3.clone().setLength(def.range || 26));
      g.timeFields.add(p, def.radius || 22, def.dur || 5, def.scale || 0.35, c);
    }
  },

  // 7 · INVISIBILITY — a render state AND a perception layer (movement gives you away)
  invisible(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) { pay(c, def, st); setInvisible(c, def.dur || 8, g); }
  },

  // 17 · REGENERATION FACTOR — a KO becomes a downed window unless they finish you
  regen(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) {
      pay(c, def, st);
      c._regenReady = { window: def.window || 4, hp: def.hp || 0.45 };
      g.vfx.ring(c.pos.clone().setY(1), { color: '#8fe08a', r0: 1, r1: 8, life: 0.4, flat: true, y: 0.5 });
      if (g.hud && g.isHuman(c)) g.hud.feed('REGENERATION primed — a knockdown is not the end', '#8fe08a');
    }
  },

  // 18 · BANISHMENT — a pocket dimension for a fixed period, with a return scar
  banish(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) {
      const foe = g.nearestFoe(c, c.pos, def.range || 60);
      if (foe && foe.alive && !foe.isDecoy) { pay(c, def, st); banish(foe, def.dur || 5, g, c); }
    }
  },

  // 19 · GRAVITY INVERSION ZONE — the ceiling becomes the floor
  gravity(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) {
      pay(c, def, st);
      const p = c.pos.clone().add(c.aim3.clone().setLength(def.range || 30));
      g.gravityZones.add(p, def.radius || 26, def.dur || 6, def.mult ?? -0.55, c);
    }
  },

  // 4 · DUPLICATES — real AI copies on ONE shared health pool
  duplicate(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) { pay(c, def, st); spawnDuplicates(c, def.count || 2, def.dur || 12, g); }
  },

  // 5 · POSSESSION — control transfer into another body (never a human, never a badge)
  possess(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) {
      const foe = g.nearestFoe(c, c.pos, def.range || 40);
      if (foe && possess(c, foe, def.dur || 10, g)) pay(c, def, st);
    }
  },

  // 6 · ELASTICITY — stretch: reach grows while you swing, and snaps back after
  elastic(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) { pay(c, def, st); setElastic(c, def.reach || 2.2, def.dur || 10, g); }
  },

  // 9 · TELEKINESIS — grab anything (a body first, then a prop), hold it, throw it
  telekinesis(c, def, st, g, inp) {
    // ⚠ THE RELEASE IS NOT A CAST. Gating the throw behind `ready()` meant the grab's own
    // cooldown locked you into holding the body forever — you could pick someone up and never
    // put them down. Letting go is always allowed.
    if (inp.pressed && c._tk) { tkThrow(c, g, def.power || 96); return; }
    if (inp.pressed && ready(c, def, st) && tkGrab(c, g, def.range || 70)) pay(c, def, st);
  },

  // 11 · TERRAIN RESHAPING — raise a wall, cut a trench, push up a ramp
  reshape(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) {
      pay(c, def, st);
      const p = c.pos.clone().add(c.aim3.clone().setLength(def.range || 22));
      reshape(g, def.shape || 'wall', p, c.aim3.clone(), def);
    }
  },

  // 12 · SYMBIOTE CONSUME — steal ONE slot for the rest of the match
  consume(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) {
      const foe = g.nearestFoe(c, c.pos, def.range || 26);
      if (foe && foe.alive && !foe.isDecoy) { pay(c, def, st); consumeSlot(c, foe, g); }
    }
  },

  // 13 · POWER MIMICRY — copy the whole kit, temporarily
  mimic(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) {
      const foe = g.nearestFoe(c, c.pos, def.range || 60);
      if (foe && foe.alive && !foe.isDecoy) { pay(c, def, st); mimicKit(c, foe, def.dur || 14, g); }
    }
  },

  // 14 · SUMMON RIDEABLE — a mount with its own speed and entrance
  mount(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) { pay(c, def, st); summonMount(c, def, g); }
  },

  // 15 · ENERGY SHIELD BUBBLE — hostile fire flattens, allied fire leaves
  dome(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) {
      pay(c, def, st);
      domeAt(g, c.pos.clone().setY(c.pos.y + 2), def.radius || 22, def.dur || 8, c);
    }
  },

  // 16 · X-RAY / THERMAL SENSE — two modes, two visual grammars
  vision(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) { pay(c, def, st); setVisionMode(c, def.mode || 'thermal', def.dur || 10, g); }
  },

  // 8 · WALL-CRAWLING is a STATE, not a cast — `def.wallCrawl` on the hero drives it, and this
  // slot simply toggles the climb intent so a player can choose to go up.
  wallcrawl(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st)) { pay(c, def, st); c.def.wallCrawl = true; c._climb = 1; }
    if (inp.released) c._climb = 0;
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

  // Physical magazines opt in; energy weapons retain their existing ki supply.
  rifle(c, def, st, g, inp) {
    const ammo=firearmAmmo(st),cost=def.cost??(ammo?0:2);
    if(c._firearmReload)return;
    if(ammo&&inp.held&&ammo.loaded<=0){emptyFirearm(c,st,g);return;}
    // Trigger ownership lasts across a slow weapon's cooldown. Recoil/cost and
    // handShots still occur only on emission, not every held input frame.
    if(inp.held&&c.ki>=cost)st._poseUntil=c.animT+.18;
    if (inp.held && c.ki < cost) { if (!st._dry) { st._dry = true; drained(c, g); } }
    else if (!inp.held) st._dry = false;
    if (inp.held && st.cd <= 0 && c.ki >= cost) {
      st._poseWritten=true;
      c.ki -= cost;if(ammo)ammo.loaded--;st.cd = def.interval || 0.09;
      c.state = 'cast'; c.stateT = 0; c.punchPose = 1;c._castPoseRanged=true;
      const emitter=firearmEmitter(c,def),m=emitter.socket?emitter.socket.getWorldPosition(_v.clone()):c.muzzle(_v.clone());
      (st.handShots ||= {})[emitter.side]=c.animT;
      // WEAPON CLASS — the same slot type, three different guns. `weapon` on the ability def:
      //   shotgun · a fan of pellets, brutal in your face, useless across the street
      //   pistol  · one accurate, heavy shot on a slow trigger
      //   rifle   · fast, small, tight (the default auto-fire)
      const cls = def.weapon || (def.interval && def.interval < 0.2 ? 'rifle' : 'pistol');
      // SNIPER STANCE (brief T2.15): holding still locks the posture — slower trigger, far
      // tighter group, longer reach. The strongest element is STILLNESS, so it only engages
      // when the shooter has actually stopped moving.
      const stance = def.stance && Math.hypot(c.vel.x, c.vel.z) < 6;
      if (def.stance) {
        c._sniperT = stance ? Math.min(1, (c._sniperT || 0) + inp.dt / (def.stance.settle || 0.5)) : 0;
        if (stance && c._sniperT >= 1 && Math.random() < 0.04) g.vfx.flash(c.muzzle(_v.clone(), 4.4, 5.9), '#eaffff', 1.2, 0.1);   // the lens glint
      }
      const aimed = def.stance && c._sniperT >= 1;
      const SP = { shotgun: 0.17, pistol: 0.02, rifle: 0.045 };
      let spread = (def.spread ?? SP[cls] ?? 0.045) * ((c.sheet && c.sheet.spreadMult) || 1);   // Marksman tightens the group
      if (aimed) spread *= def.stance.spreadMult ?? 0.18;
      const pellets = cls === 'shotgun' ? (def.pellets || 8) : 1;
      const random=g.attackRandom||Math.random;
      for (let i = 0; i < pellets; i++) {
        const yaw=(random()*2-1)*spread,pitch=(random()*2-1)*spread*.7;
        const velocity=c.aim3.clone().applyAxisAngle(THREE.Object3D.DEFAULT_UP,-yaw);velocity.y+=pitch;
        g.projectiles.spawnProjectile(c, { vis: visOf(def),
          pos:m,vel:velocity.setLength((def.speed||170)*(cls==='shotgun'?.85+random()*.15:1)),
          emitterSocket:emitter.socket,emitterDef:def,handOrigin:emitter.side,
          launchTarget:c.hasAimWorld?c.aimWorld:null,launchSpread:yaw,launchPitch:pitch,
          launchFlash:i===0?{color:'#ffcf6a',scale:cls==='shotgun'?.9:.55}:false,
          radius: def.radius || 0.55, damage: def.damage || 5, blast: def.blast ?? 2.2, power: 0.35,
          color: def.color, color2: def.color2, life: firearmLife({...def,weapon:cls}) * (aimed ? (def.stance.rangeMult ?? 1.8) : 1),
          bullet: true, ballistic: true, weapon: cls, bounces: def.bounces,
        });
      }
      if (aimed) st.cd = (def.interval || 0.5) * (def.stance.rateMult ?? 2.4);   // a settled shot is a SLOW shot
      const kick = def.recoil ?? (cls === 'shotgun' ? 6.5 : cls === 'pistol' ? 3 : 1.6);
      c.vel.x -= c.aim.x * kick; c.vel.z -= c.aim.z * kick;
      // ⚠ THE WEAPON'S OWN VOICE, not a guess from three classes. `def.voice` is a profile from
      // data/armory.js; without one we fall back to the class so every existing kit is unchanged.
      const vc = def.voice ? VOICES[def.voice] : null;
      g.audio.gunshot(cls === 'shotgun' ? 1.5 : cls === 'pistol' ? 1.25 : 0.8, c.pos, vc);   // a CRACK, not a zap
      // ⚠ EVERY SHOT IS HEARD, and the suppressed ones are heard LESS. Writing this as
      // `if (def.quiet) g.noise(...)` was backwards and nearly shipped: gunfire did not broadcast
      // at all before this (only the HIT did), so gating on `quiet` would have made a suppressed
      // PDW the only weapon in the game a bot could hear being fired. The broadcast is what bots
      // actually hear (the honesty law) — so it has to run for everything, scaled by the report.
      g.noise(c.pos, def.quiet ?? (cls === 'shotgun' ? 1.1 : cls === 'pistol' ? 0.8 : 0.9), c);
    }
  },

  // THE MARLETTA (King Stefanos) — charge a serene glowing face; release it and it DRIFTS after its
  // target, arrives... hangs there for a heartbeat... then detonates a massive delayed shockwave.
  // Size, damage, and blast all scale with how much energy he pours into her.
  facebomb(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st) && !st.charging) { st.charging = true; st.chargeT = 0; st.sfx = g.audio.charge(c.pos); }
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
        g.projectiles.spawnProjectile(c, { vis: visOf(def),
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

  // SUPERNOVA — hold to gather, and it takes EVERYTHING: the whole ki tank feeds one omnidirectional
  // detonation centered on your own body (works exactly the same at altitude). Then you are EMPTY —
  // drainedT opens, and if you have Overdrive, your fists are the comeback plan.
  nova(c, def, st, g, inp) {
    if (inp.pressed && ready(c, def, st) && !st.building) {
      st.building = true; st.fed = 0; st.sfx = g.audio.charge(c.pos);
      if (c.def.yells) { c._yellCd = 0; g.heroYell(c, 1.2); }
    }
    if (st.building) {
      const pull = (def.feedRate || 55) * inp.dt;
      const fed = Math.min(c.ki, pull);
      c.ki -= fed; st.fed += fed;
      c.state = 'charge'; c.stateT = 0;
      c.vel.x *= 0.86; c.vel.z *= 0.86;
      g.chargeGather(c, def.color || '#ff6a1a', c.pos.clone().setY(c.pos.y + 5.5), 1 + st.fed * 0.02);
      if (st.sfx) st.sfx.ramp(Math.min(1, st.fed / (def.maxFeed || 120)));
      if (Math.random() < 0.3) g.world.shake(0.12 + st.fed * 0.002);
      const done = c.ki <= 0.5 || st.fed >= (def.maxFeed || 120);
      if (inp.released || done) {
        st.building = false; if (st.sfx) { st.sfx.stop(); st.sfx = null; }
        const k = st.fed / (def.maxFeed || 120);                       // 0..1 of a full tank
        if (st.fed < 12) {                                             // barely lit — a readable fizzle, never a silent nothing
          st.cd = 0.5;
          g.vfx.ring(c.pos.clone().setY(c.pos.y + 5), { color: '#8b8577', r0: 3, r1: 0.5, life: 0.25 });
          g.audio.kiRelease(0.15, c.pos);
          return;
        }
        pay(c, def, st);
        const p = c.pos.clone().setY(c.pos.y + 5);
        const radius = (def.minRadius || 16) + k * ((def.maxRadius || 44) - (def.minRadius || 16));
        const dmg = (def.dmgMin || 30) + k * ((def.dmgMax || 95) - (def.dmgMin || 30));
        if (def.groundslam) {
          // GROUND SLAM (brief Tier1 #6): the body hitting the ground IS the center — cracks race,
          // heavy debris lifts, dust expands, and the final visual is a CRATER, not a glowing circle.
          if (c.pos.y > 3) c.vel.y = Math.min(c.vel.y, -50);   // airborne cast drives the body DOWN
          const gy = Math.max(0.2, (c.groundY || 0) + 0.2);
          g.world.crater(c.pos.x, c.pos.z, 5 + k * 6, 1 + k * 1.3);
          g.vfx.shockwave(c.pos.clone().setY(gy), { color: '#c9bfa9', radius: radius * 1.5, power: 1.4 + k });
          g.particles.burst(c.pos.x, 1.2, c.pos.z, { count: 26 + Math.round(k * 22), speed: 22 + k * 18, life: 0.8, size: 3.6, color: ['#6a655a', '#8a8577', '#3a3f47'], up: 14 + k * 10, grav: 26, drag: 1.3 });
        } else {
          g.vfx.explode(p, { color: def.color || '#ff6a1a', color2: '#ffffff', radius: radius * 0.7, power: 1.6 + k * 1.4, scorch: c.pos.y < 4 });
          g.vfx.shockwave(c.pos.clone().setY(Math.max(0.2, c.pos.y * 0.1)), { color: def.color || '#ff6a1a', radius: radius * 1.6, power: 1.5 + k });
          g.vfx.lightning(p, { color: '#fff', count: 6, radius: radius * 0.6, height: 16 });
        }
        // BLADE CYCLONE (brief T2.11) rides the same nova: slash class + a lingering cut, and
        // the halo is serrated metal spiralling inward rather than an energy sphere.
        g.areaDamage(c, p, radius, dmg, 1.6 + k, { dtype: def.dtype, freeze: def.freeze, dot: def.dot, dmgClass: def.dmgClass });   // FROST NOVA: the ring ENCASES (manual §19)
        if (def.cyclone) {
          for (const f of g.entities) {
            if (!f.alive || f === c || !g.isFoe(c, f)) continue;
            const dx = f.pos.x - p.x, dz = f.pos.z - p.z;
            if (dx * dx + dz * dz > radius * radius) continue;
            f.addDot({ dps: def.cyclone.dps || 9, dur: def.cyclone.dur || 1, color: '#ffdcdc', kind: 'slash', src: c });
          }
          for (let i = 0; i < 10; i++) {
            const a2 = Math.random() * Math.PI * 2, rr = radius * (0.5 + Math.random() * 0.5);
            g.particles.spawn({ x: p.x + Math.cos(a2) * rr, y: p.y + rand(0, 6), z: p.z + Math.sin(a2) * rr,
              vx: -Math.cos(a2) * rr * 0.9, vy: 1, vz: -Math.sin(a2) * rr * 0.9, life: 0.3, size: 1.5, color: ['#dfe3e6', '#9aa0a8'], drag: 0.5 });
          }
        }
        c.ki = 0; if (g.onDrained) { c.drainedT = 0; g.onDrained(c); }  // the price: bone dry
        g.slowmo(0.22, 0.4); g.world.punch(0.6); g.world.shake(2.2 + k); g.audio.boom(1.4, c.pos);
        if (g.hud && g.isHuman(c)) g.hud.flashScreen(def.color || '#ff6a1a', 0.2);
      }
    }
  },

  // MIND CONTROL — seize a foe and their will folds: they fight for YOU for a while.
  // Minds only: bots yes, humans never, badges never (police fixation and the wanted ladder
  // must not be puppeteered — see COMBAT_MANUAL §control states). The victim's KOs never book
  // Elo, and modes count them on their ORIGINAL side, so domination turns fights, not brackets.
  mindcontrol(c, def, st, g, inp) {
    if (st.victim) {                                     // maintain the leash
      const v = st.victim;
      st.t -= inp.dt;
      if (!v.alive || st.t <= 0) releaseMind(st, g);
      else if (Math.random() < 0.2) {
        g.particles.spawn({ x: v.pos.x, y: v.pos.y + 9.5, z: v.pos.z, vx: 0, vy: 3, vz: 0, life: 0.4, size: 1.8, color: [def.color || '#7fd4ff', '#fff'], drag: 1, shrink: true });
      }
    }
    if (inp.pressed && ready(c, def, st) && !st.victim) {
      const foe = g.coneFoe(c, def.range || 42, def.arc || 0.7);
      if (foe && foe.ai && !foe._controlled && !foe.def.police && !foe.isDummy && foe.invuln <= 0) {   // minds only — humans keep theirs, badges answer to the law
        pay(c, def, st);
        st.victim = foe; st.oldTeam = foe.team; st.t = def.dur || 6;
        foe.team = c.team; foe._controlled = true; foe._oldTeam = st.oldTeam;
        foe.ai._mem = 0; foe.ai.belief = null; foe.ai._patrol = null;  // the mind is wiped, same as a flashbang
        g.vfx.ring(foe.pos.clone().setY(foe.pos.y + 9), { color: def.color || '#7fd4ff', r0: 1, r1: 6, life: 0.4 });
        g.audio.teleport(); g.audio.zap(180, foe.pos);
        if (g.hud) g.hud.damageNumber(foe.pos, 'DOMINATED', def.color || '#7fd4ff', true);
      } else if (g.isHuman(c) && g.hud) g.hud.feed('No mind in reach', '#8b8577');
    }
  },

  // GRAPNEL LINE — fire at a building face. The top QUARTER of the face = zip up and MANTLE the
  // roof (the four-deck ladder's BUILDING deck takes over). Lower = zip and LEDGE-HANG: one hand
  // holds the wall, so only oneHand-flagged weapons fire (see runSlot); jump climbs off, descend
  // drops, a solid hit knocks you loose. Pressing again mid-line or mid-hang lets go. The reel
  // suspends the deck servo exactly like knockback does — the line owns the axis while it's taut.
  // GRAPPLE also carries GRAPPLE SLAM (brief T2.19): with `def.reel`, the line hooks an
  // ENEMY instead of a building and drags THEM to YOU — the inverse of the mantle, and a
  // heavier cable so the two never read the same.
  grapple(c, def, st, g, inp) {
    if(def.zip){
      if(!inp.pressed)return;
      if(c._grapple||c.hanging){c.releaseHang();return;}
      if(!ready(c,def,st))return;
      const anchor=findWebZipAnchor(c,g.world,def.range||150);
      if(!anchor){st.cd=.25;if(g.isHuman(c))g.hud?.feed?.('NO WEB ANCHOR — aim at a solid wall or roof',def.color||'#eaffff');return;}
      pay(c,def,st);clearWebSnare(c);cancelHeldAttacks(c);beginWebZip(c,anchor,def);g.audio?.zap?.(760,c.pos);
      g.vfx?.ring?.(new THREE.Vector3(anchor.x,anchor.y,anchor.z),{color:def.color||'#eaffff',r0:.5,r1:3.5,life:.3});return;
    }
    if (def.reel && inp.pressed && ready(c, def, st)) {
      const foe = g.nearestFoe(c, c.pos, def.range || 90);
      if (foe && foe.alive && !foe.isDecoy && g.canSee(c, foe)) {
        pay(c, def, st);
        const dx = c.pos.x - foe.pos.x, dz = c.pos.z - foe.pos.z, d = Math.hypot(dx, dz) || 1;
        foe.vel.x = (dx / d) * (def.reel.speed || 78);
        foe.vel.z = (dz / d) * (def.reel.speed || 78);
        foe.vel.y = 14;
        foe.burstT = Math.max(foe.burstT || 0, 0.5);
        foe.launchT = 1.1; foe.lastHitBy = c; foe._lastHitT = g.time;
        foe.takeDamage(def.reel.dmg || 12, { src: c, strike: true, dtype: 'physical', hitstop: 0.08 });
        g.vfx.ring(foe.pos.clone().setY(4), { color: def.color || '#c9c2b4', r0: 5, r1: 1, life: 0.25 });
        g.audio.swing('blunt', c.pos); g.audio.hit(240, foe.pos);
        if (g.hud) g.hud.damageNumber(foe.pos, 'HOOKED', '#ffd24a', true);
        return;
      }
    }
    if (!inp.pressed) return;
    if (c.hanging || c._grapple) { if (c.releaseHang) c.releaseHang(); return; }
    if (!ready(c, def, st)) return;
    const R = def.range || 95;
    const ox = c.pos.x, oy = c.pos.y + 5.2, oz = c.pos.z;
    let rx = (c.aim3 && c.aim3.x != null) ? c.aim3.x : c.aim.x;
    let ry = (c.aim3 && c.aim3.y != null) ? c.aim3.y : 0.3;
    let rz = (c.aim3 && c.aim3.z != null) ? c.aim3.z : c.aim.z;
    ry = Math.max(ry, 0.12);                                       // a grapnel is thrown UP, never flat
    const dl = Math.hypot(rx, ry, rz) || 1; rx /= dl; ry /= dl; rz /= dl;
    let best = null;
    for (const cov of g.world.cover) {
      if (cov.destroyed) continue;
      const hx = cov.hx ?? cov.r, hz = cov.hz ?? cov.r, top = cov.top ?? cov.h;
      let tmin = 0.5, tmax = R, dead = false;
      for (const [p0, d, mn, mx] of [[ox, rx, cov.x - hx, cov.x + hx], [oz, rz, cov.z - hz, cov.z + hz]]) {
        if (Math.abs(d) < 1e-6) { if (p0 < mn || p0 > mx) { dead = true; break; } continue; }
        let t1 = (mn - p0) / d, t2 = (mx - p0) / d;
        if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
        tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
        if (tmin > tmax) { dead = true; break; }
      }
      if (dead || tmin > R) continue;
      const hy = oy + ry * tmin;
      const base = g.world.heightAt ? g.world.heightAt(cov.x, cov.z) : 0;
      if (hy > top + 1 || hy < base + 2) continue;                 // sailed over the roof / into the dirt
      if (!best || tmin < best.t) best = { t: tmin, x: ox + rx * tmin, y: hy, z: oz + rz * tmin, top, base };
    }
    if (!best) {
      st.cd = 0.35;
      if (g.isHuman(c) && g.hud) g.hud.feed('No anchor — aim the line at a building face', '#8b8577');
      g.audio.zap(220, c.pos);
      return;
    }
    pay(c, def, st);
    // the ruling: top quarter of the FACE mantles; anything lower hangs
    const mantle = best.y > best.top - (best.top - best.base) * 0.25;
    c._grapple = { x: best.x, y: best.y, z: best.z, top: best.top, mantle, t: 0 };
    g.audio.zap(760, c.pos);
    g.vfx.ring(c.pos.clone().set(best.x, best.y, best.z), { color: def.color || '#ffd24a', r0: 0.5, r1: 3.5, life: 0.3 });
  },

  // Proximity mines — plant up to `max` at your aim; they arm, blink, and erase whoever steps close.
  mine(c, def, st, g, inp) {
    st.list = st.list || [];
    for (let i = st.list.length - 1; i >= 0; i--) {
      const m = st.list[i];
      m.arm -= inp.dt; m.life -= inp.dt;
      m.mesh.children[1].material.opacity = m.arm > 0 ? 0.25 : 0.45 + Math.sin(g.time * 9) * 0.35;   // armed = blinking
      const foe = m.arm <= 0 ? g.overlapFoe(c, m.pos, def.trigger || 7) : null;
      if (foe || m.life <= 0) {
        if (foe) {
          g.vfx.explode(m.pos.clone().setY(0.6), { color: def.color || '#ff5a4a', color2: '#ffd97a', radius: def.blast || 12, power: 1.3 });
          g.areaDamage(c, m.pos.clone().setY(1), (def.blast || 12) * ((c.sheet && c.sheet.blastMult) || 1), def.damage || 24, 1.3, { dtype: def.dtype, dot: def.dot, freeze: def.freeze });
          g.audio.boom(0.8, m.pos);
        } else g.vfx.flash(m.pos.clone().setY(1), def.color || '#ff5a4a', 3, 0.2);   // timed out — fizzle
        g.scene.remove(m.mesh); m.mesh.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose(); });
        st.list.splice(i, 1);
      }
    }
    if (inp.pressed && ready(c, def, st)) {
      pay(c, def, st);
      let px = g.aimPoint.x, pz = g.aimPoint.z;
      if (!c.isPlayer) { px = c.pos.x + c.aim.x * 16; pz = c.pos.z + c.aim.z * 16; }
      const dx = px - c.pos.x, dz = pz - c.pos.z, d = Math.hypot(dx, dz) || 1, rng = def.range || 55;
      if (d > rng) { px = c.pos.x + dx / d * rng; pz = c.pos.z + dz / d * rng; }
      // A MINE IS HARDWARE, not a spell: a squat machined casing at true 1:1 scale (~0.5m across)
      // with a ribbed collar, three ground spikes and ONE small indicator LED. No additive glow —
      // bloom belongs to ki. The LED blinks via opacity (children[1] — the arm loop drives it).
      const grp = new THREE.Group();
      const steel = new THREE.MeshStandardMaterial({ color: '#3a4048', roughness: 0.45, metalness: 0.85 });
      const casing = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 1.1, 10), steel);
      casing.position.y = 0.6; casing.castShadow = true; grp.add(casing);
      const led = new THREE.Mesh(ORB_GEO, new THREE.MeshStandardMaterial({ color: def.color || '#ff5a4a', emissive: def.color || '#ff5a4a', emissiveIntensity: 1.4, transparent: true, opacity: 0.3, roughness: 0.3 }));
      led.scale.setScalar(0.34); led.position.y = 1.35; grp.add(led);          // index 1 — the blinker
      const collar = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.22, 6, 14), new THREE.MeshStandardMaterial({ color: '#22262c', roughness: 0.6, metalness: 0.7 }));
      collar.rotation.x = Math.PI / 2; collar.position.y = 1.0; grp.add(collar);
      for (let s = 0; s < 3; s++) {                                            // spikes bite the pavement
        const a = (s / 3) * Math.PI * 2;
        const leg = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.3, 5), steel);
        leg.position.set(Math.cos(a) * 2.1, 0.2, Math.sin(a) * 2.1); leg.rotation.x = Math.PI; grp.add(leg);
      }
      grp.position.set(px, 0, pz); g.scene.add(grp);
      st.list.push({ pos: new THREE.Vector3(px, 0.5, pz), mesh: grp, arm: def.armT || 0.6, life: def.duration || 18 });
      if (st.list.length > (def.max || 3)) { const old = st.list.shift(); g.scene.remove(old.mesh); old.mesh.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose(); }); }
      g.audio.zap(360, c.pos);
    }
  },

  // Life drain — a held siphon: the nearest foe in your arc withers while you knit back together.
  lifedrain(c, def, st, g, inp) {
    if (inp.held && c.ki < (def.kiPerSec || 14) * inp.dt) { if (!st._dry) { st._dry = true; drained(c, g); } if (st._loop) { st._loop.stop(); st._loop = null; } }
    else if (!inp.held) st._dry = false;
    if (inp.held && c.spendKi((def.kiPerSec || 14) * inp.dt)) {
      c.state = 'cast'; c.stateT = 0;c._castPoseRanged=false;
      // THE SIPHON VOICE — a downward pull that swells when it finds a victim, fades on release.
      if (!st._loop) st._loop = g.audio.sustain ? g.audio.sustain('drain', c.pos) : null;
      const foe = g.coneFoe(c, def.range || 26, def.arc || 0.9);
      if (st._loop) st._loop.set(foe && !foe.phase ? 1.3 : 0.5, c.pos);
      if (foe && !foe.phase) {
        const dealt = foe.takeDamage((def.dps || 22) * c.powerBuff * inp.dt, { src: c, dot: true, hitstop: 0 });
        if (dealt > 0) c.heal(dealt * (def.ratio || 0.6));
        if (Math.random() < 0.5) {
          const t = Math.random();
          g.particles.spawn({
            x: foe.pos.x + (c.pos.x - foe.pos.x) * t, y: 5 + Math.sin(t * 6) * 1.5, z: foe.pos.z + (c.pos.z - foe.pos.z) * t,
            vx: (c.pos.x - foe.pos.x) * 0.8, vy: 2, vz: (c.pos.z - foe.pos.z) * 0.8,
            life: 0.35, size: 2, color: [def.color || '#9dff5a', '#fff'], drag: 0.5, shrink: true,
          });
        }
      }
    } else if (st._loop) { st._loop.stop(); st._loop = null; }   // not held → fade out
  },

  // Meteor storm from the sky at the aim point (artillery ult)
  meteor(c, def, st, g, inp) {
    if (st.count > 0) {
      st.timer -= inp.dt;
      if (st.timer <= 0) {
        st.timer = def.interval || 0.22; st.count--;
        const tx = st.tx + rand(-(def.spread || 26), def.spread || 26), tz = st.tz + rand(-(def.spread || 26), def.spread || 26);
        g.projectiles.spawnProjectile(c, { vis: visOf(def),
          pos: new THREE.Vector3(tx + rand(-6, 6), 90, tz + rand(-6, 6)),
          vel: new THREE.Vector3(rand(-4, 4), -60, rand(-4, 4)), grav: 40,
          radius: def.radius || 3, damage: def.damage || 34, blast: def.blast || 18, power: 1.5,
          color: def.color, color2: def.color2, shock: true, ground: true,
        });
        g.audio.blast(1500 + rand(-150, 150), 0.05);   // the thin incoming hiss — you hear the sky falling (manual §20)
      }
    }
    if (inp.pressed && ready(c, def, st)) {
      pay(c, def, st); st.count = def.count || 10; st.timer = 0; st.tx = g.aimPoint.x; st.tz = g.aimPoint.z;
      c.state = 'cast';c._castPoseRanged=false; g.audio.power(true); g.world.shake(0.6);
      g.vfx.ring(new THREE.Vector3(st.tx, 0.4, st.tz), { color: def.color, r0: 4, r1: def.spread * 2 || 40, life: 0.8, flat: true, y: 0.4 });
    }
  },
};

export function runSlot(c, key, inp, g) {
  const st = c.slots[key]; if (!st) return;
  if(c._throwAction&&(inp.pressed||inp.held)&&!remoteAttack(c,st))return;
  if(c._firearmReload&&(inp.pressed||inp.held))return;
  st._handsBusy=false;
  // An all-false frame can mean combat/input suppression, not a physical key-up.
  if(inp.pressed||inp.released)st._handsRetry=false;
  // PURE BOXING (engine/boxingring.js): no powers, no guns, no gadgets — fists and the trifecta,
  // which is the one thing that does NOT come through here. ⚠ It is a flag on the FIGHTER, not a
  // check on the mode, so nothing in the ability layer has to know a boxing ring exists and any
  // future rule set can borrow it. The gate is here because this is the single door every ability
  // in the game goes through — a per-ability check would be 22 places to forget one.
  if (c.noPowers) {
    if (inp.pressed && g && g.isHuman(c) && g.hud) { g.hud.feed('PURE BOXING — fists only', '#8b8577'); if (g.hud.kiDenied) g.hud.kiDenied(key); }
    return;
  }
  // TIME IS NEVER UNDEFINED. Every held/charged type integrates `inp.dt`; a caller that omits
  // it (a test harness, a replay, a net frame) would inject NaN into a dozen accumulators.
  if (!Number.isFinite(inp.dt)) inp.dt = (g && g.dt) || 1 / 60;
  // LEDGE-HANG: one hand is holding the building — only oneHand-flagged abilities fire up there.
  if (c.hanging && (!st.def.oneHand || st.def.type==='volley'&&!['left','right'].includes(volleyPattern(st.def)))) {
    // A tagged forearm cannot retain paid preparation behind this legacy early
    // return and fire when the player later drops with the trigger released.
    if(st.def.naniteForm==='cannon'){
      cancelHeldSlot(c,key);st._naniteDenied='occupied';st._naniteRetry=!!inp.held&&!inp.released;
    }
    if (inp.pressed && g && g.isHuman(c) && g.hud) g.hud.feed('One hand on the wall — that needs both', '#8b8577');
    return;
  }
  // DISARMED (manual §16): a landed grab strips the hands — gear-tagged slots are DEAD for the
  // window. Powers are what you ARE; those keep firing. The trifecta earns its keep.
  if (c._disarmT > 0 && st.def.gear) {
    if (inp.pressed && g && g.isHuman(c) && g.hud) { g.hud.feed('DISARMED — your hands are empty', '#ff8a6a'); if (g.hud.kiDenied) g.hud.kiDenied(key); }
    return;
  }
  const remote=remoteAttack(c,st);
  if(inp.pressed && remote){
    // This is control of energy already paid for, not another launch. Cooldown
    // and an empty ki pool must not swallow the detonation or flash a false denial.
    if(c.alive!==false && !(c.hitstop>0 || c.staggerT>0 || c.stunT>0 || c.frozenT>0 || c.grabbedBy)){
      remote.detonate(g);st.remoteShot=null;
      if(st.def.type==='beam')st.active=null;
      cooldown(c,st.def,st);
    }
    return;
  }
  // pressing an ability you can't afford → tell the player WHY nothing happened
  if (!slotUnlocked(c,key)) {
    if (inp.pressed && g.isHuman?.(c)) g.hud?.feed(`${st.def.name || 'Attack'} unlocks at level ${unlockLevel(c.def,key)}`, '#d9b86b');
    return;
  }
  if(st.def.naniteForm==='cannon'){
    if(inp.pressed||inp.released)st._naniteRetry=false;
    const reason=naniteUseReason(c,key);st._naniteDenied=reason;
    if(reason){
      if(st.charging)cancelHeldSlot(c,key);
      if(inp.pressed||inp.held)st._naniteRetry=!inp.released;
      if(inp.pressed&&g.isHuman?.(c))g.hud?.feed(reason==='occupied'?'Forearm occupied':reason==='obstructed'?'Muzzle obstructed':`Cannon ${reason}`,'#d9b86b');
      return;
    }
    if(st._naniteRetry&&!inp.pressed&&!inp.released)return;
  }
  // A real hand cannot gather or launch two incompatible powers at once. The
  // first action owns it through sustain/preparation and its short recovery.
  // Releases and remote control above always pass; a denied press is not queued.
  const conflict=(inp.pressed||inp.held)&&conflictingHandSlot(c,st);
  if(st._handsRetry&&!inp.pressed&&!inp.released){st._handsBusy=!!conflict;return;}
  if(conflict){
    st._handsBusy=true;
    st._handsRetry=!inp.released;
    if(inp.pressed&&g.isHuman?.(c))g.hud?.feed('Hands occupied — release the current hand attack first','#d9b86b');
    if(!inp.released)return;
    // Bots/replays can deliver a tap as pressed+released in one command. Honor
    // its release cleanup, not the conflicting new press hidden in that tap.
    inp={...inp,pressed:false,held:false};
  }
  const ownedConstruct=st.def.type==='construct'?constructForSlot(g,c,st):null;
  if (inp.pressed && !ownedConstruct && (st.def.cost || 0) > c.ki && st.cd <= 0 && g.onNoKi) g.onNoKi(c, key);
  // stamp real input on the slot — held types (cones/phase/lifedrain) leave no cd/sustain
  // trace, so this is what the tutorial (and any future telemetry) watches
  if (inp.pressed || inp.held) { (c._slotUse || (c._slotUse = {}))[key] = true; if (inp.pressed) c._lastSlot = key; }   // _lastSlot feeds the mastery counter
  st._poseWritten=false;
  const fn = TYPES[st.def.type]; if (fn) fn(c, st.def, st, g, inp);
  // Cast-writing handlers stamp their pose ownership explicitly. Resource-only
  // actions (buffs, teleports, etc.) must not steal a lingering ranged recovery.
  // Actual successful firing, not merely held input or a cooldown denial.
  // Used only by visual gait/aim layers; no effect on weapon timing or damage.
  if(st._poseWritten){
    st._poseUntil=c.animT+.24;
    c._rangedPose={slot:key,until:st._poseUntil};
  }
}

// ---------- double-tap evade — per-hero movement tech (data: def.evade = {kind,...}) ----------
// kinds: dash (burst + i-frames) · blink (short teleport) · sprint (speed surge while it lasts)
//        slide (long low-friction skate) · phase (dash while intangible)
export const EVADE_DEFAULTS = {
  dash: { name: 'Evade Dash', cost: 5, cd: 0.7, power: 105, iframes: 0.22 },
  blink: TELEPORT_TIERS.blink,
  sprint: { name: 'Sprint', cost: 6, cd: 2.2, mult: 1.65, dur: 1.5 },
  slide: { name: 'Slide', cost: 4, cd: 0.9, power: 125, slideT: 0.55, iframes: 0.2 },
  phase: { name: 'Phase Slip', cost: 7, cd: 1.1, power: 95, iframes: 0.45 },
  leap: { name: 'Leap', cost: 5, cd: 1.1, up: 46, fwd: 66 },
};

export function performEvade(c, dir, g) {
  const ev = c.def.evade;
  if (!ev || c.evadeCd > 0 || c.grabbedBy || c.grabbing || c.grabState || c.staggerT > 0 || c.hitstop > 0 || c.frozenT > 0 || c.stunT > 0 || c.sleepT > 0 || c.downedT > 0 || c.state === 'ko') return false;
  const d = { kind: 'dash', ...EVADE_DEFAULTS[ev.kind || 'dash'], ...ev };
  const dl = Math.hypot(dir?.x, dir?.z);
  if(!Number.isFinite(dl)||dl<0.001)return false;
  const dx=dir.x/dl,dz=dir.z/dl;
  // Air evasions use a brief lateral impulse, not a ground slide/leap animation.
  // Preserve forward momentum so double-tapping sideways can juke mid-swoop.
  if (c._openSky && c.flying && !c.onFoot && ['dash','slide','sprint','leap'].includes(d.kind)) {
    d.kind='dash';d.power=d.power??92;d.iframes=d.iframes??.18;
  }
  if (c.ki < (d.cost || 0)) { if (g.onNoKi) g.onNoKi(c, 'evade'); return false; }
  const destination=d.kind==='blink'?teleportDestination(c,dir,d.range??22,g.world):null;
  if(d.kind==='blink'&&!destination)return false;
  c.ki -= d.cost || 0; c.evadeCd = (d.cd || 0.7) * ((c.sheet && c.sheet.evadeCdMult) || 1);   // AGILITY + Acrobat recover faster
  const color = d.color || c.def.colors.accent;
  switch (d.kind) {
    case 'blink': {
      g.afterimage(c); g.vfx.flash(c.pos.clone().setY(c.pos.y+5), color, 5, 0.18); g.audio.teleport(c.pos);
      c.pos.set(destination.x,destination.y,destination.z);
      if(!(c._openSky&&c.flying&&!c.onFoot))c.vel.multiplyScalar(0.25);
      c.invuln = Math.max(c.invuln, d.iframes ?? 0.3);
      g.afterimage(c); g.vfx.flash(c.pos.clone().setY(c.pos.y+5), color, 6, 0.2);
      g.particles.burst(c.pos.x, c.pos.y+5, c.pos.z, { count: 14, speed: 22, life: 0.35, size: 2.4, color: ['#fff', color] });
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



