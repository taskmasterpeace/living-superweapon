import {beginPersonThrowPose,advancePersonThrowPose} from './person-throw-pose.js';
import {zombieArmsDisabled,zombieCannotGrab} from './zombie-locational-damage.js';
import {grabLesson,meleeLessonScheme} from './combat-lesson-controls.js';
import {personThrowLaunch,THROW_WINDOW} from './person-throw-trajectory.js';
import {meleeEntryTarget} from './melee-entry-target.js';
import {meleeApproach} from '../data/melee-approaches.js';
import {meleeWeaponFor} from './weapon-grip.js';
import {snapshotWeaponSurface,weaponContactSweeps} from './melee-weapon-contact.js';
// WAR WORLD: ASCENDANTS — melee trifecta: Strike (beats Grab) · Grab (beats Guard) · Guard (beats Strike).
// Per-character variants: teleport-escape & energy-intangibility break front grabs; thorns hurt the holder;
// grabHeal lifesteals throws. Back-grabs (from behind, OR during the victim's RECOVERY) are guaranteed and hit harder.
// Charged melee: hold strike to wind up — tap jab · straight · HAYMAKER (crushes guards, see chargeRelease).
//
// ⚠ THE THREE-PHASE STATE MACHINE (aaa-02-ground.md §4.1). A strike is startup → active → recover.
// The HITBOX is live only during `active`. `startup` is a real wind-up a jab can beat; `recover` is the
// punish window `data/martial.js`'s clinch table was authored around (grabbing you there gets your BACK).
// `f.mstate` / `f.mId` / `f.mKind` are the truth; `f.strikeActive` is a DERIVED shim (> 0 for the whole
// committed window, so the twelve existing readers of it behave as before — pose, move penalty, busy
// checks, the state ring). ⚠ It is CLAMPED at 0 and is 0 the instant a strike ends.
//
// ⚠ THE THESIS, ONE LINE: BFP momentum in the air, JKA measured swing on the ground — `swingMult`
// selects by `onFoot` (aaa-02-ground.md §4.6). When `!onFoot` it is EXACTLY `momentumMult`, so the air
// game and the city (where `onFoot` is not yet set) are byte-identical. Blocked hits take neither.
import { liftCapacityOf, bodyWeight } from './entity.js';
import {naniteContact,snapshotNaniteContactFrame} from './nanite-forearms.js';
import { rankOf } from '../data/scale.js';
import { STRIKES, STEP_IMPULSE, styleOf, hasStrike, blockStateOf, guardArcOf, clinchWindow } from '../data/martial.js';
import * as THREE from 'three';
import { fistContact } from './melee-pose.js';
import { sweepSplitObstacle } from './projectile-contact.js';
import {resolveAbilityMeleeContact} from './ability-melee-contact.js';
import {constrainRushBodies} from './ability-rush-body.js';
import {fighterPathFraction} from './fighter-environment-contact.js';
import {isTransportingPerson,beginPersonCarry,advancePersonCarry,personSetdownPoint,friendlyPickupTarget} from './person-carry.js';

const _v = new THREE.Vector3();
const INPUT_BUFFER = .18;
const strengthOf = f => Math.max(1, Math.min(10, Number.isFinite(f.def.strength) ? f.def.strength : 5));
// Weight is shared by damage, displacement and presentation. A large fist must
// move its opponent, not merely print a larger number. Momentum remains separate.
export function punchWeight(f, heavy=false) {
  const s=strengthOf(f)-5;
  // STR 10 anchors the established launch envelope. Multiplying beyond it made
  // standing heavies uncatchable by teleport-intercept and changed city carry.
  return {damage:1+s*(heavy?.085:.045),push:.5+strengthOf(f)*.05,stop:1+s*.035};
}

// MOMENTUM MELEE (manual §10): below 12 u/s a jab is a jab; above, damage and knockback climb
// together on an ease-in curve to ×2.5 at ~58 u/s (full tier-3 cruise). One number, read once,
// sampled BEFORE the lunge impulse so the engine's own forward hop can never fake momentum.
export function momentumMult(f) {
  const k = Math.min(1, Math.max(0, ((f._momSpd || 0) - 12) / 46));
  return 1 + 1.5 * k * k;
}

// THE MEASURED SWING (aaa-02-ground.md §4.6). On the ground the body stands still and the FIST is the
// thing moving, so the air's body-|vel| model is wrong there — JKA measures blade-base travel instead.
// `f._handSpd` is the fist's world speed, computed in the poser (entity.js `_animate`, a RIDER to the
// footing/animation lane). Until that lands, `_handSpd` is undefined → k = 0 → ×1.0, which is the
// correct neutral for a standing punch, so shipping this early is safe.
// ⚠ HAND_REF / HAND_SPAN ARE MEASURED, NOT GUESSED — `src/bench/ground.js handSpeedTable()`, driven
// over all 52 fighters in-page (2026-07-28). The spec's estimate of 24 wu/s was ~5× too low: the
// poser SNAPS the arm to the punch pose, so the fist's world speed is dominated by that scripted
// swing (plus the step-in lunge), not by a slow arm ramp. Measured peak fist speed:
//   jab   p50 127.8  p95 143.6      cross  p50 120.6  p95 325.5(*)      haymaker p50 129.5  p95 148.0
//   (*) the cross p95 is an outlier tail from a few kits' animations; the jab is the clean reference.
// HAND_REF is the jab p50 (a median swing → ×1.0); HAND_SPAN reaches the haymaker p95 (a committed
// swing → ×2.2). ⚠ FINDING (reported to the ground lane): fist speed barely varies with PLAYER ACTION
// because the arm pose is scripted, not physics — so the JKA "measured swing" model has limited
// dynamic range on the ground, and the honest ground reward remains the step-in/momentum. handMult is
// also DORMANT until the footing lane sets `onFoot`, so this calibration ships at zero risk today.
export const HAND_REF = 128;     // wu/s — measured jab p50 (a median swing is the neutral ×1.0)
export const HAND_SPAN = 20;     // wu/s — measured haymaker p95 − jab p50 (full ×2.2 at ~148 wu/s)
export function handMult(f) {
  const k = Math.min(1, Math.max(0, ((f._handSpd || 0) - HAND_REF) / HAND_SPAN));
  return 1 + 1.2 * k * k;        // ×1.0 → ×2.2 at HAND_REF + HAND_SPAN
}
// ⚠ EXACTLY momentumMult when !onFoot (the air/city path is unchanged); handMult only on foot.
export function swingMult(f) {
  return f && f.onFoot ? handMult(f) : momentumMult(f);
}

export class MeleeSystem {
  _swingKind(f) {
    if (f._swingK) return f._swingK;                      // cached per fighter
    let k = 'fist';
    if (f.def.strikeSound) k = f.def.strikeSound;         // explicit override
    else if (Object.values(f.def.abilities || {}).some(a => a && a.dmgClass === 'slash')) k = 'blade';  // claws/blades shing
    else if (f.def.metal || (f.strength || 5) >= 9) k = 'blunt';   // heavy displaced air
    return (f._swingK = k);
  }
  constructor(game) { this.game = game; }

  // Take one synchronous snapshot AFTER control/teleports, BEFORE physics. A
  // fast victim and fist must cover the same interval, regardless of entity order.
  // No history survives a frame, so a portal/blink between frames is not a sweep.
  beginContactFrame() {
    for(const f of this.game.entities)constrainRushBodies(f);
    const frame=this._contactFrame={targets:new Map(),fists:new Map(),queue:new Set()};
    if(!this.game.entities.some(f=>f._meleeMotion||f._clinchPunch||f._meleeBuffer||f._abilityMeleePose?.physicalContact))return;
    for(const f of this.game.entities) {
      if(!f.alive||!f.parts?.rig)continue;
      f.obj.updateMatrixWorld(true);
      const parts={};for(const key of ['torso','head','pelvis']){const part=f.parts[key];if(part)parts[key]={part,matrix:part.matrixWorld.clone()};}
      frame.targets.set(f,{position:f.pos.clone(),parts,nanites:f._nanites?snapshotNaniteContactFrame(f):null});
      if(f._meleeMotion||f._clinchPunch||f._abilityMeleePose?.physicalContact)frame.fists.set(f,{
        rig:f.parts.rig,
        left:f.parts.armL.children[2].getWorldPosition(new THREE.Vector3()),
        right:f.parts.armR.children[2].getWorldPosition(new THREE.Vector3()),
        weapon:snapshotWeaponSurface(f._meleeMotion?.weapon||f._abilityMeleePose?.weapon),
      });
    }
  }
  endContactFrame() {
    const frame=this._contactFrame;this._contactFrame=null;
    if(frame)for(const f of frame.queue)this._resolveContact(f,frame);
    for(const f of this.game.entities)constrainRushBodies(f);
  }

  canAct(f) { return !zombieArmsDisabled(f) && f.alive && f.hitstop <= 0 && f.staggerT <= 0 && f.stunT <= 0 && !(f.frozenT > 0) && !(f.sleepT>0) && !(f.downedT>0) && !f.grabbedBy && f.grabState !== 'clinch' && !f.hanging; }
  clearInput(f) { f._meleeBuffer=null; f._meleeQueuedHeld=false; f.meleeCharge=0; f._clinchThrowBuffer=0; }
  _canClinch(f, allowHitstop=false) { return f.alive && f.grabbing?.alive && f.grabState==='clinch' && (allowHitstop||f.hitstop<=0) && f.staggerT<=0 && f.stunT<=0 && !(f.frozenT>0) && !(f.sleepT>0) && !(f.downedT>0) && !f._clinchFinisher; }

  // A hard interrupt cancels an active/recover swing. ⚠ NOT hitstop — the attacker's OWN hit-freeze
  // must not cancel their active window (only a wind-up is cancelled by being hit; that is `canAct`).
  _hardInterrupt(f) { return !f.alive || f.staggerT > 0 || f.stunT > 0 || f.frozenT > 0 || f.grabbedBy || f.grabState === 'clinch' || f.hanging; }

  // -- the phase-machine primitives -----------------------------------------------------------------
  _commitRemaining(f) {
    if (!f.mstate) return 0;
    const pace = (f.def && f.def.meleePace) || 1;
    const S = STRIKES[f.mId]; if (!S) return 0;
    if (f.mstate === 'startup') return Math.max(0, f.mT) + (S.active + S.recover) / pace;
    if (f.mstate === 'active')  return Math.max(0, f.mT) + S.recover / pace;
    return Math.max(0, f.mT);   // recover
  }
  _endStrike(f, keepInput=false) { this.game.ms?.threatLab?.meleeTrial?.strikeEnded(f,{interrupted:this._hardInterrupt(f)}); f.mstate = null; f.mId = null; f.mKind = null; f.mHay = false; f.strikeActive = 0; f._meleeMotion = null; if(!keepInput)this.clearInput(f); }

  _beginStrike(f, id, kind, p01 = 1, hay = false) {
    f._meleeBlocked=false;
    const g = this.game, pace = (f.def && f.def.meleePace) || 1, S = STRIKES[id];
    f.mId = id; f.mKind = kind; f.mHay = hay; f.mP = p01;
    f.mstate = 'startup'; f.mT = S.startup / pace;
    f.strikeHit = new Set();
    f.strikeActive = this._commitRemaining(f);
    f.state = 'cast'; f.stateT = 0;f._castPoseRanged=false;
    if (kind === 'heavy') f.punchPose = 1;
    // MOMENTUM (manual §10): read the speed you BROUGHT to the punch — before the lunge fakes one
    f._momSpd = Math.hypot(f.vel.x, f.vel.y, f.vel.z);
    f._momDive = !!(f.flying && (f.descendHeld || f.vel.y < -14));
    if(f._openSky&&f.parts.rig) {
      const preferredSide=kind==='heavy'||id==='cross'||f.strikeIdx%2===0?1:-1;
      const equipped=meleeWeaponFor(f,preferredSide),side=equipped?.side??preferredSide;
      const arm=side===1?f.parts.armR:f.parts.armL;
      const entry=meleeEntryTarget(g,f,meleeApproach(f.def,f.airborne).range);
      const point=entry?entry.center(new THREE.Vector3()):f.hasAimWorld?f.aimWorld.clone():f.center(new THREE.Vector3()).addScaledVector(f.aim3,S.reach);
      if(entry){
        // Commit once. Moving targets get observed lead; a still grounded target
        // gets a bounded straight-ahead step budget for starting ordinary retreat.
        // Neither case changes direction after a dodge.
        const lead=entry.vel.clone();if(!f.airborne)lead.y=0;
        // A retreat already underway accelerates toward ordinary gait speed during windup.
        if(!f.airborne&&lead.length()>1)lead.setLength(Math.max(lead.length(),entry.speed||0));
        const reserve=!f.airborne&&lead.length()<=1&&point.distanceTo(f.center(new THREE.Vector3()))>9;
        if(reserve){
          lead.copy(point).sub(f.center(new THREE.Vector3())).setY(0).normalize().multiplyScalar(Math.min(48,entry.speed||0));
        }
        lead.clampLength(0,48);
        const profile=meleeApproach(f.def,f.airborne),gap=point.distanceTo(f.center(new THREE.Vector3()));
        const arrival=Math.max((S.startup+S.active*.5)/pace,Math.max(0,gap-3.8)/Math.max(1,profile.speed-lead.length()));
        lead.multiplyScalar(Math.min(reserve?.25:.6,arrival));
        const origin=f.center(new THREE.Vector3()),range=meleeApproach(f.def,f.airborne).range;
        point.add(lead);const offset=point.clone().sub(origin);const budget=range+lead.length();if(offset.length()>budget)point.copy(origin).add(offset.setLength(budget));
      }
      f._meleeMotion={side,weapon:equipped?.weapon??null,point,target:entry,previous:arm.children[2].getWorldPosition(new THREE.Vector3()),current:new THREE.Vector3(),impact:new THREE.Vector3(),dt:0};
      f._meleeMotion.weaponPrevious=snapshotWeaponSurface(equipped?.weapon);
    }
    // ⚠ THE STEP-IN SELLS THE REACH (the short-arms problem). `step` is a DISTANCE in data/martial.js;
    // STEP_IMPULSE converts it to the velocity impulse. jab 2.0×8 = the 16 that was hard-coded here.
    let lunge = S.step * STEP_IMPULSE;
    if(f._meleeMotion) {
      // The old 36u/s power impulse crossed a nearby victim during its .34s
      // wind-up. Budget the added step to the approach, without erasing any
      // player-earned momentum. Full 3D approach follows the committed aim.
      const approach=f._meleeMotion.point.clone().sub(f.center(new THREE.Vector3()));
      const profile=meleeApproach(f.def,f.airborne),distance=approach.length();
      const admitted=!!f._meleeMotion.target||distance<=profile.range;
      const eligible=admitted&&distance>3.8;
      if(eligible)f.mT=Math.max(f.mT,(distance-3.8)/profile.speed-S.active*.5/pace);
      f._meleeMotion.startupDuration=f.mT;f.strikeActive=this._commitRemaining(f);
      lunge=Math.min(eligible?profile.speed:lunge,Math.max(0,distance-3.8)/(f.mT+S.active*.5/pace));
      if(!f.airborne)approach.y=0;
      f._meleeMotion.step=approach.clone().normalize().multiplyScalar(lunge);
      f._meleeMotion.approachOrigin=f.pos.clone();f._meleeMotion.approachEnabled=admitted;
      f._meleeMotion.approachDistance=eligible?Math.max(0,(f.flying?approach.length():Math.hypot(approach.x,approach.z))-3.8):0;
      if(eligible&&!f.airborne&&profile.arc>0&&distance>9){f.vel.y=Math.max(f.vel.y,profile.arc);f.burstT=Math.max(f.burstT,f.mT+S.active/pace);}
      f._meleeMotion.family=profile.family;
      f.vel.add(f._meleeMotion.step);
    } else { f.vel.x += f.aim.x * lunge; f.vel.z += f.aim.z * lunge; }
    g.ms?.threatLab?.meleeTrial?.strikeStarted(f);
    if (kind === 'heavy') {
      g.audio.swing(hay ? 'blunt' : this._swingKind(f), f.pos);
      if (hay) { if (f.def.yells) g.heroYell(f, 0.9); else g.audio.grunt(f.def.voicePitch || 1, f.pos); }   // the battle shout
    } else {
      g.audio.swing(this._swingKind(f), f.pos);
      g.trail(f, f.def.colors.accent);
    }
  }

  strike(f) {
    // 3c: CARRYING COSTS YOU YOUR HANDS. No punch, no block, while holding a car.
    if (f._carry) return;
    if (!this.canAct(f) || f.grabbing || f.guarding || f.mstate || f.meleeCharge > 0) return;
    if (f.strikeCd > 0 && f.comboWin <= 0) return;
    const pace = (f.def && f.def.meleePace) || 1;
    const canJab = hasStrike(f.def, 'jab'), canCross = hasStrike(f.def, 'cross');
    // ⚠ A PURE SLAMMER (powergrap: `power` only) has NO light attack — every press is a slam.
    if (!canJab && !canCross) { if (hasStrike(f.def, 'power')) this._beginHeavy(f, 'power', 0.5, true); return; }
    f.strikeIdx = f.comboWin > 0 ? (f.strikeIdx + 1) % 3 : 0;
    // the third beat is the CROSS; ⚠ gate on the STYLE — a wrestler (jab only) can never throw a cross
    let id = (f.strikeIdx === 2 && canCross) ? 'cross' : 'jab';
    if (id === 'jab' && !canJab) id = 'cross';        // (no jab-less-but-cross style exists today; safe)
    f.strikeCd = (f.strikeIdx === 2 ? 0.5 : 0.3) / pace;
    f.comboWin = 0;
    this._beginStrike(f, id, 'light');
  }

  // --- charged melee (Street Fighter hold): tap = jab combo · short hold = straight · long hold = HAYMAKER.
  // def.meleeTiers: 3 (default, all three) · 2 (jab + haymaker only) · 1 (taps too — pure jab character).
  chargeStart(f) {
    if(f._personCarry?.friendly)return;
    if(this._canClinch(f)) { if(!(f._clinchStrikeCd>0))f.meleeCharge=.001; return; }
    if (this._hardInterrupt(f) || f._carry || f.guarding || f.grabState || f.meleeCharge > 0) return;
    // A held input waits for recovery; it never charges invisibly behind a swing.
    if(f.mstate || f.hitstop>0 || (f.strikeCd>0 && f.comboWin<=0)) { f._meleeQueuedHeld=true; f._meleeBuffer=null; return; }
    f.meleeCharge = 0.001; f.state = 'cast'; f.stateT = 0;f._castPoseRanged=false;
  }
  chargeUpdate(f, dt) {
    if (f.meleeCharge <= 0) return;
    if (!this.canAct(f) && !this._canClinch(f)) { f.meleeCharge = 0; return; }
    f.meleeCharge = Math.min(1.3, f.meleeCharge + dt * ((f.sheet && f.sheet.chargeRate) || 1));   // Brawlers wind up faster
    const g = this.game;
    if (f.meleeCharge > 0.3 && Math.random() < f.meleeCharge * 0.5) {
      const m = f.muzzle(_v, 2.2, 5.6);
      g.particles.spawn({ x: m.x, y: m.y, z: m.z, vx: (Math.random() * 2 - 1) * 6, vy: 4, vz: (Math.random() * 2 - 1) * 6, life: 0.25, size: 1.8 + f.meleeCharge * 1.6, color: [f.def.colors.accent, '#fff'], drag: 2, shrink: true });
    }
    if (f.meleeCharge >= 1.29 && Math.random() < 0.2) g.world.shake(0.12);   // fully charged — rumbling
  }
  chargeRelease(f) {
    if(f._meleeQueuedHeld) { f._meleeQueuedHeld=false; f._meleeBuffer=INPUT_BUFFER; return; }
    const t = f.meleeCharge; f.meleeCharge = 0;
    if(t>0 && this._canClinch(f)) {
      if(t>=.55)f._clinchFinisher={t:0,duration:.28};
      else this._bodyBlow(f);
      return;
    }
    if (t <= 0 || !this.canAct(f)) return;
    const tiers = f.def.meleeTiers ?? 3;
    const canJab = hasStrike(f.def, 'jab'), canCross = hasStrike(f.def, 'cross'), canPower = hasStrike(f.def, 'power');
    if (t < 0.18 || tiers === 1) {                                                      // TAP → jab combo
      if (canJab || canCross) return this.strike(f);
      if (canPower) return this._beginHeavy(f, 'power', 0.5, true);                      // pure slammer: a tap is a slam
      return;
    }
    if (t < 0.55 && tiers >= 3) {                                                        // STRAIGHT (a cross)
      if (canCross) return this._beginHeavy(f, 'cross', 0.45, false);
      if (canJab) return this.strike(f);
      if (canPower) return this._beginHeavy(f, 'power', 0.5, true);
      return;
    }
    // HAYMAKER (a power) — fall to the heaviest strike the style actually has
    if (canPower) return this._beginHeavy(f, 'power', Math.min(1, t), true);
    if (canCross) return this._beginHeavy(f, 'cross', 0.45, false);
    if (canJab) return this.strike(f);
  }
  _beginHeavy(f, id, p01, hay) { f.strikeCd = hay ? 0.7 : 0.45; this._beginStrike(f, id, 'heavy', p01, hay); }

  // does `foe` block `atk`'s melee hit? ⚠ Reads blockStateOf — a fighter mid-power-startup ('no')
  // takes FULL damage; a plain held guard ('wide') behaves exactly as before.
  _blocks(foe, atk) {
    const st = blockStateOf(foe);
    if (st === 'no' || st === 'none') return false;
    if (foe.def.guardType === 'barrier') return true;
    return this._front(foe, atk);
  }
  _front(foe, atk) {
    const dx = atk.pos.x - foe.pos.x, dz = atk.pos.z - foe.pos.z, d = Math.hypot(dx, dz) || 1;
    const dot = (dx / d) * foe.aim.x + (dz / d) * foe.aim.z;
    return dot > guardArcOf(foe);          // sheet-derived arc ladder (was a hard-coded −0.15)
  }

  _counter(f, foe, blocked) {
    if(blocked)return 1;
    const kind=foe.mstate==='recover'?'PUNISH':foe.mstate==='startup'||foe.meleeCharge>0||foe.grabState==='startup'?'COUNTER':null;
    if(!kind)return 1;
    this.game.hud?.damageNumber(foe.pos,kind,'#ffe0a0',true);
    return kind==='PUNISH'?1.2:1.15;
  }

  // -- the active-window resolvers (fire only while mstate === 'active') ---------------------------
  _resolveLight(f, contact) {
    const g = this.game;
    // the third beat of the combo is the CROSS — shorter than the jabs that set it up
    const foe = contact || g.coneFoe(f, f.strikeIdx === 2 ? STRIKES.cross.reach : STRIKES.jab.reach, 0.75);
    if (!(foe && f.strikeHit && !f.strikeHit.has(foe.id))) return;
    f.strikeHit.add(foe.id);
    // A jab-only style still needs the shared spacing finisher in PowerWorld.
    const fin = f.strikeIdx === 2 && (f._openSky || f.mId === 'cross');
    // MOMENTUM (air) / MEASURED SWING (ground): an arriving punch is a different animal. BLOCKED hits
    // stay at BASE — the multiplier raises the reward, never what a raised guard has to eat.
    const mom = swingMult(f), dive = f._momDive && (f._momSpd || 0) > 20;
    const blocked = this._blocks(foe, f);
    const weight=punchWeight(f),counter=this._counter(f,foe,blocked);
    const kbs = blocked ? 1 : mom;
    const dmg = (fin ? 17 : 8) * kbs * weight.damage * counter * f.powerBuff * ((f.sheet && f.sheet.jabMult) || 1)
      * (1 - 0.08 * ((f._wounds && f._wounds.arm) || 0));   // a wounded arm hits softer (manual §18)
    const hs = (fin ? .12 : .065) * weight.stop;
    const local=contact?f._meleeMotion.naniteContact:null;
    const imp = local?local.point.clone():contact ? f._meleeMotion.impact.clone() : foe.pos.clone().add(f.pos).multiplyScalar(0.5).add(new THREE.Vector3(0,5.7,0));
    const damageOpts={ src: f, naniteContact:local,strike: true, meleeMove:'light',finisher:fin, contactFx: !!contact, hitstop: hs,
      dmgClass: this._swingKind(f) === 'blade' ? 'slash' : undefined,   // claw/blade kits jab with STEEL — wounds (manual §12)
      kb: { x: f.aim.x * (fin ? 20 : 8) * kbs * weight.push, y: (fin ? 8 : 2) * kbs, z: f.aim.z * (fin ? 20 : 8) * kbs * weight.push },
      launch: dive && !blocked ? -(34 + (f._momSpd || 0) * 0.45) : 0 };   // DIVE PUNCH
    foe.takeDamage(dmg,damageOpts);
    f.hitstop = Math.max(f.hitstop, hs * (fin ? 0.9 : 0.6));      // attacker freezes too — meaty impact
    if (blocked) {
      if (contact) g.vfx.contact(imp, damageOpts.naniteResult?.integrity>0?local.normal:f.aim3, {color:damageOpts.naniteResult?.integrity>0?'#bdc2b8':(foe._guardUpT ?? 99)<.22?'#ffd24a':'#bfe0ff',power:(foe._guardUpT ?? 99)<.22?1.3:.55});
      else g.vfx.impactStar(imp, 7, '#bfe0ff', 0.16);
      g.world.shake(0.35); g.audio.zap(520, imp); f.strikeCd = Math.max(f.strikeCd, 0.5); f.hitstop = Math.max(f.hitstop, 0.09);
    }   // jab blocked → punishable
    else {
      const fp = (0.6 + 0.4 * mom) * weight.stop;
      g.vfx.impact(imp, f.aim3, { color: f.def.colors.accent, power: (fin ? 1.7 : 0.65) * fp });
      g.world.shake((fin ? 1.5 : 0.6) * fp); g.audio.meleeHit((fin ? 1.3 : 0.65) * fp, imp, strengthOf(f)>=8);
      if (fin || mom > 1.55) { g.world.punch(0.8); g.slowmo(0.14, 0.36); }
      if (dive) {   // the launcher lands: arrival ring under the victim
        g.vfx.ring(foe.pos.clone().setY(Math.max(0.4, foe.pos.y - 4)), { color: '#ffffff', r0: 1, r1: 9, life: 0.3, flat: true });
        g.audio.meleeHit(1.2, imp, true);
      }
    }
    f._meleeBlocked=blocked;
    if(blocked)f.comboWin=0;
    else if (f.strikeIdx<2) f.comboWin = 0.42;
  }

  _resolveHeavy(f, contact) {
    if (f.strikeHit && f.strikeHit.size) return;   // one connect per swing
    const g = this.game;
    // ⚠ THE INVERSION. The power punch reaches LEAST — 7u against the jab's 11u. This one number is the design.
    const foe = contact || g.coneFoe(f, STRIKES.power.reach, 0.8);
    if (!foe) return;
    f.strikeHit.add(foe.id);
    const hay = f.mHay, p = f.mP,weight=punchWeight(f,true);
    const mom = swingMult(f), dive = f._momDive && (f._momSpd || 0) > 20;
    const dmg = (hay ? 20 + p * 14 : 13) * weight.damage * f.powerBuff * (hay ? 1 : ((f.sheet && f.sheet.jabMult) || 1))
      * (1 - 0.08 * ((f._wounds && f._wounds.arm) || 0));   // the cradled arm (manual §18)
    const blocked = this._blocks(foe, f);
    const counter=this._counter(f,foe,blocked);
    const local=contact?f._meleeMotion.naniteContact:null;
    const imp = local?local.point.clone():contact ? f._meleeMotion.impact.clone() : foe.pos.clone().add(f.pos).multiplyScalar(0.5).add(new THREE.Vector3(0,5.7,0));
    if (blocked && hay) {
      // GUARD CRUSH — the blocker stumbles back wide open; the crowd goes wild
      if(foe._openSky||g.modeId==='powerworld'){
        // A crush wins the next opening; it cannot bypass a funded energy block.
        foe.takeDamage(dmg*.35,{src:f,strike:true,guardCrush:true,meleeMove:'crush',contactFx:!!contact,hitstop:.12*weight.stop});
      }else{
      foe.guarding = false; foe.staggerT = 0.85; foe.guardBreakT = 0.85; foe.guardMeter = Math.max(0, foe.guardMeter - 0.55);
      foe.state = 'hit'; foe.stateT = 0;
      foe.takeDamage(dmg * 0.35, { src: f, meleeMove:'crush', contactFx: !!contact, unblockable: true, hitstop: .12*weight.stop, kb: { x: f.aim.x * 46*weight.push, y: 8, z: f.aim.z * 46*weight.push } });
      }
      f.hitstop=Math.max(f.hitstop,.1*weight.stop);
      if (contact) g.vfx.contact(imp, f.aim3, {color:'#ffd24a',power:2.4});
      else { g.vfx.impactStar(imp, 12, '#ffd24a', 0.24); g.vfx.ring(imp, { color: '#ffd24a', r0: 1, r1: 12, life: 0.3 }); }
      g.world.shake(1.6); g.world.punch(0.7); g.audio.meleeHit(1.3, imp, true); g.slowmo(0.14, 0.4);
      if (g.hud) { g.hud.damageNumber(foe.pos, 'GUARD CRUSH', '#ffd24a', true); g.hud.flashScreen('#ffd24a', 0.12); }
    } else if (blocked) {
      const damageOpts={src:f,naniteContact:local,strike:true,contactFx:!!contact,hitstop:.07};
      foe.takeDamage(dmg,damageOpts);     // straights get blocked like strikes
      f.strikeCd = Math.max(f.strikeCd, 0.5); f.hitstop = Math.max(f.hitstop, 0.1);   // punishable — counter window
      if (contact) g.vfx.contact(imp,damageOpts.naniteResult?.integrity>0?local.normal:f.aim3,{color:damageOpts.naniteResult?.integrity>0?'#bdc2b8':(foe._guardUpT ?? 99)<.22?'#ffd24a':'#bfe0ff',power:1.3});
      else g.vfx.impactStar(imp, 8, '#bfe0ff', 0.18);
      g.audio.impact(0.7, imp); g.world.shake(0.5);
    } else {
      const fp = (0.6 + 0.4 * mom)*weight.stop;
      foe.takeDamage(dmg * mom * counter, { src: f, naniteContact:local,strike: true, meleeMove:'heavy', contactFx: !!contact, heavy: hay, haymaker: hay,
        hitstop: (hay ? .18 : .1)*weight.stop,
        dmgClass: this._swingKind(f) === 'blade' ? 'slash' : undefined,
        kb: { x: f.aim.x * (hay ? 54 : 26) * mom*weight.push, y: (hay ? 6 : 3) * mom, z: f.aim.z * (hay ? 54 : 26) * mom*weight.push },
        launch: dive ? -(36 + (f._momSpd || 0) * 0.45) : (hay ? 16 : 6) * mom });   // dive haymaker = meteor drop
      f.hitstop = Math.max(f.hitstop, (hay ? .17 : .09)*weight.stop);
      g.vfx.impact(imp, f.aim3, { color: f.def.colors.accent, power: (hay ? 2 : 1.1) * fp });
      g.world.shake((hay ? 2.6 : 1.15) * fp); g.audio.meleeHit((hay ? 1.8 : 1.0) * fp, imp, hay);
      if (hay || mom > 1.55) { g.world.punch(0.9); g.slowmo(0.16, 0.34); }
      if (dive) { g.vfx.ring(foe.pos.clone().setY(Math.max(0.4, foe.pos.y - 4)), { color: '#ffffff', r0: 1, r1: 10, life: 0.3, flat: true }); g.audio.boom(0.5, imp); }
    }
  }

  guard(f, on) {
    // 3c: CARRYING COSTS YOU YOUR HANDS. You cannot punch or block while holding a car.
    if (f._carry || f.hanging || f.frozenT>0 || f.stunT>0 || f.sleepT>0 || f.downedT>0) on = false;
    // Hitstop must NOT drop a held guard — every blocked hit applies hitstop to the blocker, so
    // gating on canAct() made a fast combo strip the guard after the first block ("can't hold down
    // block"). Stagger, grabs, and your own attacks (a strike in progress) still drop it.
    if (on && (!f.alive || f.staggerT > 0 || f.grabbedBy || f.grabState || f.grabbing || f.mstate)) { f.guarding = false; return; }
    if(on)this.clearInput(f);
    if (on && !f.guarding) f._guardUpT = 0;   // rising edge — the PARRY window starts here
    f.guarding = !!on && f.alive;
  }

  canBeginGrab(f){return !zombieCannotGrab(f)&&this.canAct(f)&&!f._carry&&!f.grabbing&&!f.grabState&&!f.mstate&&!f.guarding&&f.strikeCd<=0&&!(f.sleepT>0)&&!(f.downedT>0);}
  grabTarget(f){
    const g=this.game,reach=STRIKES.grab.reach+(styleOf(f.def).grabBonus||0),hostile=g.coneFoe(f,reach,.95);
    if(!hostile){const ally=friendlyPickupTarget(f,g,reach);return ally&&bodyWeight(ally.def)<=liftCapacityOf(f.def)?{fighter:ally,friendly:true}:null;}
    return (hostile._regrabUntil||0)<=(g.time||0)&&!hostile.phase&&hostile.invuln<=0&&!hostile.grabbedBy&&hostile.alive&&fighterPathFraction({radius:0,sizeScale:1},g.world,f.center(new THREE.Vector3()),hostile.center(new THREE.Vector3()))===1?{fighter:hostile,friendly:false}:null;
  }
  grab(f) {
    if(isTransportingPerson(f)&&this._canClinch(f)){f._personCarry.whirling=!f._personCarry.friendly;f._personCarry.throwArmed=true;return;}
    // A late throw input survives the body blow's contact pause/recovery. It
    // never cancels that animation, adds hold time, or survives a broken grab.
    if(this._canClinch(f,true)&&f._clinchPunch&&f._clinchPunch.t>=.3-INPUT_BUFFER){f._clinchThrowBuffer=INPUT_BUFFER;return;}
    if (this._canClinch(f) && !f._clinchPunch) { this._throw(f); return; }
    if (!this.canBeginGrab(f)) return;
    this.clearInput(f);
    f.grabState = 'startup'; f.grabT = STRIKES.grab.startup; f.state = 'cast'; f.stateT = 0;f._castPoseRanged=false;
    this.game.audio.swing('fist',f.pos);
  }

  release(f) {
    if (!f) return;
    const grabber=f.grabbedBy,holder=grabber||f;
    const carried=holder._personCarry?.victim;
    if(carried&&holder._personCarry.friendly){carried._friendlyLanding=true;carried.launchT=0;carried._thrownT=0;carried._thrownBy=null;}
    const departing=holder.grabbing;if(departing&&this.game.modeId==='powerworld')departing._regrabUntil=(this.game.time||0)+.65;
    if(carried?.grabbedBy===holder){carried.grabbedBy=null;if(carried.state==='hit')carried.state='idle';}
    holder._personCarry=null;
    this.clearInput(holder);holder._clinchFinisher=null;holder._clinchPunch=null;holder._clinchStrikeCd=0;
    holder._victimEscape=false;holder._clinchAimT=0;
    if (f.grabbing) { const v = f.grabbing; if (v) { v.grabbedBy = null; if (v.state === 'hit') v.state = 'idle'; } f.grabbing = null; }
    if (grabber) { const h = grabber; if (h) { h.grabbing = null; h.grabState = null; h.grabT=0; } f.grabbedBy = null; }
    f.grabState = null; f.grabT = 0; f._victimEscape = false;
  }

  liftPerson(f){
    if(isTransportingPerson(f))return false;
    if(!this._canClinch(f)||f._clinchPunch||f._clinchFinisher||f._carry||f.phase)return false;
    const ratio=bodyWeight(f.grabbing.def)/liftCapacityOf(f.def);
    if(ratio>1)return false;
    beginPersonCarry(f,f.grabbing,ratio);
    // One extension from the original contact; activation cannot restart it.
    const spent=Math.max(f._clinchElapsed||0,(f._clinchMax||4)-f.grabT);
    f.grabT=Math.max(0,Math.min(8,(f._clinchMax||4)*2)-spent);
    this.game.hud?.feed?.('CARRY · move / flight · hold E: aim throw · release: throw · tap E: release','#ffd24a');
    return true;
  }

  setdownPerson(f){
    const point=personSetdownPoint(f,this.game);if(!point)return false;
    const v=f.grabbing;this.release(f);v.pos.copy(point);v.vel.set(0,0,0);
    v.flying=false;v.flyHeld=false;v.gliding=false;v.launchT=0;v._thrownT=0;v._thrownBy=null;v._sync();return true;
  }

  releaseGrab(f){if(isTransportingPerson(f)&&f._personCarry.throwArmed)this._throw(f);}

  _throw(holder) {
    const g = this.game, v = holder.grabbing;
    if(holder._personCarry?.friendly){if(!this.setdownPerson(holder))this.release(holder);return;}
    if (!v) { this.release(holder); return; }
    const {back,transport,direction:dir,damage:dmg,velocity}=personThrowLaunch(holder,v);
    beginPersonThrowPose(holder);
    this.release(holder);holder.strikeCd=Math.max(holder.strikeCd,.35);
    v.state = 'idle';
    // AUTHORED velocity, not kb-scaled — the dotted preview integrates exactly this launch state.
    v.vel.copy(velocity);
    v._personThrow=transport?{owner:holder,impacted:false}:null;
    v.flying = false; v.flyHeld = false; v.gliding = false;
    v.launchT = THROW_WINDOW; v._thrownT = THROW_WINDOW; v._thrownBy = holder; if (v._thrownHit) v._thrownHit.clear();
    // A fatal throw must seed its ragdoll from this launch, not the former held velocity.
    v.takeDamage(dmg, { src: holder, strike: true, meleeMove:'throw', unblockable: true, hitstop: 0 });
    if (holder.grabHeal) holder.heal(dmg * holder.grabHeal);
    holder.hitstop = Math.max(holder.hitstop, 0.08);
    g.vfx.impact(v.pos.clone().setY(v.pos.y + 5.6), { x: dir.x, z: dir.z }, { color: holder.def.colors.accent, power: back ? 1.9 : 1.4 });
    g.world.shake(back ? 1.7 : 1.2); g.world.punch(0.72); g.audio.meleeHit(back ? 1.4 : 1.1, v.pos, true);
    g.heroYell(holder, 1.0);
    g.slowmo(0.1, 0.42); if (g.hud) g.hud.flashScreen('#fff', 0.14);
  }

  _bodyBlow(f) {
    if(f._personCarry?.friendly)return;
    if(f._clinchStrikeCd>0 || f._clinchPunch)return;
    f._clinchStrikeCd=.42;
    f.grabT=Math.max(0,f.grabT-.16); // Every extra blow risks losing the hold.
    f._clinchPunch={t:0,hit:false,previous:f._openSky&&f.parts.rig?f.parts.armR.children[2].getWorldPosition(new THREE.Vector3()):null};
    this.game.audio.swing(this._swingKind(f),f.pos);
  }

  _clinchImpact(f,contact) {
    const v=f.grabbing,g=this.game,weight=punchWeight(f);
    if(!v?.alive)return;
    const damage=(5+strengthOf(f)*.55)*f.powerBuff;
    const point=contact||v.center(new THREE.Vector3());
    v.takeDamage(damage,{src:f,strike:true,meleeMove:'body',unblockable:true,contactFx:true,hitstop:.045*weight.stop});
    f.hitstop=Math.max(f.hitstop,.035*weight.stop);
    if(f.grabHeal)f.heal(damage*f.grabHeal);
    g.vfx.impact(point,f.aim3,{color:f.def.colors.accent,power:.55*weight.stop});
    g.audio.meleeHit(.65*weight.stop,point,strengthOf(f)>=8);g.world.shake(.45*weight.stop);
  }

  _slamFinish(f) {
    if(f._personCarry?.friendly)return;
    const v=f.grabbing,g=this.game;if(!v)return;
    const str=strengthOf(f),back=f.grabMode==='back';
    const wr=Math.max(.45,Math.min(1.2,.75+.15*Math.log2(liftCapacityOf(f.def)/Math.max(.05,bodyWeight(v.def)))));
    const damage=(14+str*1.4)*(back?1.2:1)*f.powerBuff;
    this.release(f);f.strikeCd=Math.max(f.strikeCd,.55);
    // No terrain effect here: the actual ground/roof collision owns the crater,
    // impact and slam damage. An aerial finisher must visibly fall to that surface.
    v.vel.set(f.aim.x*14*wr,-(55+str*5)*wr,f.aim.z*14*wr);
    v.flying=false;v.flyHeld=false;v.gliding=false;
    v.launchT=2;v._thrownT=2;v._thrownBy=f;v._thrownHit?.clear();
    v.takeDamage(damage,{src:f,strike:true,meleeMove:'slam-release',heavy:true,unblockable:true,contactFx:true,hitstop:0});
    if(f.grabHeal)f.heal(damage*f.grabHeal);
    f.hitstop=Math.max(f.hitstop,.09);f.punchPose=1;
    g.audio.meleeHit(1.4,v.pos,true);g.world.shake(1);g.heroYell(f,1);
    g.hud?.damageNumber(v.pos,'DRIVE DOWN','#ffe0a0',true);
  }

  // Power World resolves only after the current physics and rig pose are available.
  // Timers and pose share the same active interval; no stale pre-animation cone hit.
  resolveContact(f) {
    if(this._contactFrame){this._contactFrame.queue.add(f);return;}
    this._resolveContact(f);
  }

  _resolveContact(f,frame=null) {
    resolveAbilityMeleeContact(f,this.game,frame);
    const history=frame?.fists.get(f),sameRig=history?.rig===f.parts.rig;
    const oldPart=(other,key)=>{if(history&&!sameRig)return null;const old=frame?.targets.get(other)?.parts[key];return old?.part===other.parts?.[key]?old.matrix:null;};
    const punch=f._clinchPunch,v=f.grabbing;
    if(punch?.previous && v) {
      const current=f.parts.armR.children[2].getWorldPosition(new THREE.Vector3());
      if(punch.t>=.1 && punch.t<=.23 && !punch.hit) {
        const point=new THREE.Vector3();
        const from=history?(sameRig?history.right:current):punch.previous;
        for(const key of ['torso','pelvis'])if(fistContact(from,current,v.parts[key],.42,point,oldPart(v,key))<Infinity) {
          punch.hit=true;this._clinchImpact(f,point);break;
        }
      }
      punch.previous.copy(current);
    }
    const m=f._meleeMotion;if(!m||!f.mstate)return;
    // Another fighter may have interrupted this one after its update queued the
    // segment. Match update()'s cancellation contract before advancing recovery.
    if(this._hardInterrupt(f)){this._endStrike(f);return;}
    const arm=m.side===1?f.parts.armR:f.parts.armL;
    const current=arm.children[2].getWorldPosition(m.current);
    const from=history?(sameRig?history[m.side===1?'right':'left']:current):m.previous;
    const weaponSweep=m.weapon?.parent===arm.children[2]?weaponContactSweeps(m.weapon,history?(sameRig?history.weapon:null):m.weaponPrevious):null;
    const sweeps=m.weapon?(weaponSweep?.sweeps||[]):[{from,to:current,radius:.42}];
    if(f.mstate==='active'&&!f.strikeHit.size) {
      let first=Infinity,foe=null,surfaceHit=null;m.naniteContact=null;
      const point=new THREE.Vector3();
      for(const sweep of sweeps){
      const {from,to:current,radius}=sweep;
      for(const other of this.game.entities) {
        if(!this.game.isFoe(f,other)||!other.alive||other.invuln>0)continue;
        // Authored reach remains an outer bound, never a substitute for contact.
        const end=other.pos.clone().sub(f.pos),a0=frame?.targets.get(f)?.position,b0=frame?.targets.get(other)?.position;
        const start=a0&&b0?b0.clone().sub(a0):end;
        const delta=end.clone().sub(start),t=delta.lengthSq()?THREE.MathUtils.clamp(-start.dot(delta)/delta.lengthSq(),0,1):0;
        // Broad phase includes the target body radius; the fist sweep below still proves contact.
        if(start.clone().addScaledVector(delta,t).length()>STRIKES[f.mId].reach+(other.radius||0))continue;
        for(const key of ['torso','head','pelvis']) {
          const t=fistContact(from,current,other.parts?.[key],radius,point,oldPart(other,key));
          if(t<first){first=t;foe=other;m.impact.copy(point);m.naniteContact=null;}
        }
        const local={},previous=history&&sameRig?frame?.targets.get(other)?.nanites:null;
        if(naniteContact(other,from,current,radius,local,previous)&&local.t<first){
          const cover={};if(!sweepSplitObstacle(this.game.world||{},from,local.naniteContact.point,0,cover,false)){
            first=local.t;foe=other;m.impact.copy(from).lerp(current,local.t);m.naniteContact=local.naniteContact;
          }
        }
      }
      const obstacle={};
      if(sweepSplitObstacle(this.game.world||{},from,current,radius,obstacle,false,radius)&&obstacle.t<=first&&(m.weapon||obstacle.target?.onConstructHit||obstacle.target?.frontlineVehicle||obstacle.target?.frontlineAircraft)){
        first=obstacle.t;foe=null;m.naniteContact=null;
        surfaceHit={obstacle,impact:from.clone().lerp(current,obstacle.t)};
      }
      }
      if(surfaceHit&&surfaceHit.obstacle.t<=first){
        const {obstacle,impact}=surfaceHit;
        const construct=obstacle.target?.construct;
        const origin=frame?.targets.get(f)?.position?.clone().lerp(f.pos,obstacle.t)||f.pos;
        if(impact.distanceTo(origin)<=STRIKES[f.mId].reach){
          // Consume the same swing before a synchronous ki collapse can remove
          // the proxy. Objects never enter guard/counter/Fighter resolution.
          f.strikeHit.add(construct||obstacle.target);m.impact.copy(impact);foe=null;m.naniteContact=null;
          const wound=1-.08*(f._wounds?.arm||0),jab=f.sheet?.jabMult||1,mom=swingMult(f);
          const heavy=f.mKind!=='light',weight=punchWeight(f,heavy),fin=f.strikeIdx===2&&f.mId==='cross';
          const damage=(heavy?(f.mHay?20+f.mP*14:13)*(f.mHay?1:jab):(fin?17:8)*jab)*weight.damage*f.powerBuff*wound*mom;
          if(construct)construct.receiveHit(damage,{src:f,pos:impact,lane:'melee'});
          else {if(obstacle.target?.onConstructHit||obstacle.target?.frontlineVehicle||obstacle.target?.frontlineAircraft)this.game.damageBlock(obstacle.target,damage,impact,f);this.game.vfx?.contact(impact,f.aim3,{color:'#ffd18a',power:heavy?1.5:.7});}
          f.hitstop=Math.max(f.hitstop,(heavy?(f.mHay?.17:.09):(fin?.108:.039))*weight.stop);
          this.game.audio.meleeHit(heavy?1.3:.65,impact,heavy);
          if(!heavy&&f.strikeIdx<2)f.comboWin=.42;
        }
      }
      if(foe){if(f.mKind==='light')this._resolveLight(f,foe);else this._resolveHeavy(f,foe);}
    }
    m.weaponPrevious=weaponSweep?.snapshot??null;
    m.previous.copy(current);
    if(f.mstate==='active') {
      f.mT-=m.dt;m.dt=0;
      if(f.mT<=0) {
        if(f.mKind==='light'&&f.strikeIdx<2&&f.comboWin<=0&&!f._meleeBlocked)f.comboWin=.32;
        f.mstate='recover';f.mT+=STRIKES[f.mId].recover/(f.def.meleePace||1);
      }
      f.strikeActive=this._commitRemaining(f);
    }
  }

  update(f, dt) {
    advancePersonThrowPose(f,dt);
    const g = this.game;
    if(this._hardInterrupt(f) && f.grabState!=='clinch')this.clearInput(f);
    f._clinchStrikeCd=Math.max(0,(f._clinchStrikeCd||0)-dt);
    if (f.guarding) f._guardUpT = (f._guardUpT ?? 99) + dt;   // how long the shield has been up (parry clock)
    this.chargeUpdate(f, dt);

    // --- THE STRIKE PHASE MACHINE (startup → active → recover) ------------------------------------
    if (f.mstate) {
      if(f._meleeMotion)f._meleeMotion.dt=0;
      const pace = (f.def && f.def.meleePace) || 1;
      const S = STRIKES[f.mId];
      if (f.mstate === 'startup') {
        if (!this.canAct(f)) { this._endStrike(f); }        // ⚠ A HIT BEATS THE WIND-UP (gate b, the whole risk model)
        else { f.mT -= dt; if (f.mT <= 0) { f.mstate = 'active'; f.mT += S.active / pace; } }
      } else if (f.mstate === 'active') {
        if (this._hardInterrupt(f)) this._endStrike(f);
        else {
          if(f._meleeMotion)f._meleeMotion.dt=dt;
          else if (f.mKind === 'light') this._resolveLight(f); else this._resolveHeavy(f);
          if (f.mstate === 'active' && !f._meleeMotion) {                      // (a resolve can end the strike)
            f.mT -= dt;
            if (f.mT <= 0) {
              // the whiff-continue window (was set when a light strike ended without a combo already open)
              if (f.mKind === 'light' && f.strikeIdx < 2 && f.comboWin <= 0 && !f._meleeBlocked) f.comboWin = 0.32;
              f.mstate = 'recover'; f.mT += S.recover / pace;
            }
          }
        }
      } else {   // recover — the punish window
        if (this._hardInterrupt(f)) this._endStrike(f);
        else { f.mT -= dt; if (f.mT <= 0) this._endStrike(f,true); }
      }
      f.strikeActive = this._commitRemaining(f);
    } else if (f.strikeActive) {
      f.strikeActive = 0;   // ⚠ the negative-truthy trap: a spent timer must read exactly 0
    }
    if(this.canAct(f) && !f.mstate && !f.grabState && !f.guarding && !f._carry && (f.strikeCd<=0 || f.comboWin>0)) {
      if(f._meleeQueuedHeld) { f._meleeQueuedHeld=false;this.chargeStart(f); }
      else if(f._meleeBuffer>0) { f._meleeBuffer=null;this.strike(f); }
    }
    if(f._meleeBuffer>0){f._meleeBuffer-=dt;if(f._meleeBuffer<=0)f._meleeBuffer=null;}

    // --- grab state machine ---
    if (f.grabState === 'startup') {
      if(!this.canAct(f)){this.release(f);return;}
      f.grabT -= dt;
      if (f.grabT <= 0) {
        // ⚠ a WRESTLER closes from further out — the style's whole identity is getting inside
        const candidate=this.grabTarget(f),hostile=candidate&&!candidate.friendly?candidate.fighter:null,ally=candidate?.friendly?candidate.fighter:null;
        if(ally){
          this._endStrike(ally);ally.guarding=false;ally.meleeCharge=0;
          f.grabbing=ally;ally.grabbedBy=f;f.grabState='clinch';f.grabMode='friendly';f.grabT=8;f._clinchMax=8;
          f._victimEscape=false;f._clinchPunch=null;f._clinchFinisher=null;
          ally.launchT=0;ally._thrownT=0;ally._thrownBy=null;ally.vel.set(0,0,0);
          beginPersonCarry(f,ally,bodyWeight(ally.def)/liftCapacityOf(f.def));f._personCarry.friendly=true;
          g.hud?.feed?.('TEAMMATE CARRIED · move/fly · E: release safely · attacks cannot hurt your passenger','#ffd24a');
          return;
        }
        const foe=hostile;
        if (foe) {
          const bx = f.pos.x - foe.pos.x, bz = f.pos.z - foe.pos.z, bd = Math.hypot(bx, bz) || 1;
          const geoBehind = (bx / bd) * foe.aim.x + (bz / bd) * foe.aim.z < -0.2;
          // ⚠ THE VULNERABILITY RULE (martial.js §THE CLINCH): grabbing them during their RECOVERY
          // frames gets you their BACK, even from the front. This is what recovery frames were for.
          const behind = geoBehind || foe.mstate === 'recover';
          f.grabMode = behind ? 'back' : 'front';
          if(foe.grabbing)this.release(foe);
          this._endStrike(foe);
          f.grabbing = foe; foe.grabbedBy = f; foe.grabState = null; foe.guarding = false;
          foe.state = 'hit'; foe.stateT = 0;
          // THE AIMED THROW (manual §11): the clinch is a STRUGGLE WINDOW. ⚠ Reconciled onto
          // clinchWindow() — the squared-rank ratio × style resist × condition (ruling R-C). The
          // linear strength-difference formula that shipped is retired; this one pays off the rank
          // ladder and the medical layer, and can never disagree with the codex.
          f.grabState = 'clinch';
          if (g.disarm) g.disarm(foe, f);   // GEAR (manual §16): a landed grab STRIPS the weapon
          const w = foe._wounds ? (foe._wounds.arm + foe._wounds.leg + foe._wounds.torso) : 0;
          const cw = clinchWindow(f, foe, { attackerRank: rankOf(f.def), victimRank: rankOf(foe.def), wounds: w });
          f.grabT = Math.min(4, Math.max(0.2, cw.seconds * (behind ? 1.25 : 1)));   // a back clinch holds longer
          f._clinchMax = f.grabT;
          g.ms?.threatLab?.meleeTrial?.grabContact(f,foe);
          f._clinchElapsed=0;f._clinchEscapeAt=f.grabT*.5;
          f._clinchFinisher=null;f._clinchPunch=null;f._clinchStrikeCd=0;
          if (g.isHuman(f) && g.hud) g.hud.feed(g.modeId==='powerworld'?grabLesson(meleeLessonScheme(g)):'CLINCH — tap strike: body blow · hold strike: drive down · grab again: aimed throw', '#ff8a3a');
          f._victimEscape = !behind && ((foe.teleEscape && foe.ki > 14) || foe.canPhase);
          if(!g.audio.soundLibrary?.native?.('grab',{pos:foe.pos}))g.audio.hit(150);
          g.world.shake(0.5);
          g.vfx.ring(foe.pos.clone().setY(foe.pos.y + 5), { color: f.def.colors.accent, r0: 1, r1: 7, life: 0.3 });
        } else { f.grabState = null; f.strikeCd = 0.35; }
      }
    } else if (f.grabState === 'clinch') {
      const v = f.grabbing;
      if (!v || !v.alive || !f.alive || zombieCannotGrab(f) || f.staggerT>0 || f.stunT>0 || f.frozenT>0 || f.sleepT>0 || f.downedT>0) { this.release(f); return; }
      if(f._personCarry?.friendly){if(v.team!==f.team||!advancePersonCarry(f,g,dt))this.release(f);return;}
      f.grabT -= dt;
      f._clinchElapsed=(f._clinchElapsed||0)+dt;
      // Keep the grip inside actual arm reach. Root-space wobble fed back through
      // hard-lock facing and made the pair orbit; struggle belongs to the pose.
      const hoist=f._clinchFinisher?Math.sin(Math.min(1,f._clinchFinisher.t/f._clinchFinisher.duration)*Math.PI*.5)*3.5:0;
      if(isTransportingPerson(f)){
        if(!advancePersonCarry(f,g,dt)){this.release(f);return;}
      }else{v.pos.x = f.pos.x + f.aim.x * 3.3; v.pos.z = f.pos.z + f.aim.z * 3.3; v.pos.y = f.pos.y+hoist;}
      v.vel.set(0, 0, 0); v.state = 'hit'; v.stateT = 0; v.faceDir(-f.aim.x, -f.aim.z);
      if (Math.random() < dt * 7) g.particles.burst(v.pos.x, v.pos.y + 5.5, v.pos.z, { count: 2, speed: 9, life: 0.25, size: 1.6, color: ['#fff', v.def.colors.accent], drag: 2 });
      // thorns: being held hurts the holder
      if (v.thorns) {
        f.takeDamage(v.thorns * dt, { src: v, trueDamage: true, clinchThorns:true, hitstop:0 });
        if(f.grabbing!==v)return;
        if (Math.random() < 0.35) g.particles.burst(f.pos.x, f.pos.y + 5.5, f.pos.z, { count: 2, speed: 12, life: 0.3, size: 2.2, color: [v.def.colors.accent, '#fff'] });
      }
      // front-grab escape (teleport / phase) at the midpoint
      if (f._victimEscape && (isTransportingPerson(f)?f._clinchElapsed>=f._clinchEscapeAt:f.grabT <= (f._clinchMax || 0.4) * 0.5)) {
        f._victimEscape = false;
        // Admission was sampled at contact. Recheck the actual escape at its
        // commitment point: lost teleport energy cannot invent a phase trait.
        const teleport=v.teleEscape && v.ki > 14;
        if(teleport || v.canPhase){
          if (teleport) { v.ki -= 14; g.afterimage(v); v.pos.x -= f.aim.x * 22; v.pos.z -= f.aim.z * 22; v.invuln = 0.35; g.audio.teleport(); }
          else { v.invuln = 0.4; }
          g.vfx.flash(v.pos.clone().setY(v.pos.y + 5), v.def.colors.accent, 6, 0.2);
          this.release(f);v.state='idle';
          return;
        }
      }
      if (f.grabT <= 0) {this._breakFree(f);return;}
      if(f._clinchPunch) {
        const punch=f._clinchPunch;punch.t+=dt;
        if(punch.t>=.12&&!punch.hit&&!punch.previous){punch.hit=true;this._clinchImpact(f);}
        if(punch.t>=.3)f._clinchPunch=null;
      }
      if(f._clinchThrowBuffer>0){
        if(!f._clinchPunch&&this._canClinch(f)){this._throw(f);return;}
        f._clinchThrowBuffer=Math.max(0,f._clinchThrowBuffer-dt);
      }
      if(f._clinchFinisher) {
        f._clinchFinisher.t+=dt;
        if(f._clinchFinisher.t>=f._clinchFinisher.duration)this._slamFinish(f);
      }
    }
  }

  // The struggle window closed: the victim tears loose, shoves the holder off, and the moment is over.
  _breakFree(holder) {
    const g = this.game, v = holder.grabbing;
    if (!v) { this.release(holder); return; }
    this.release(holder);
    const dx = holder.pos.x - v.pos.x, dz = holder.pos.z - v.pos.z, d = Math.hypot(dx, dz) || 1;
    holder.vel.x += (dx / d) * 30; holder.vel.z += (dz / d) * 30;
    holder.staggerT = Math.max(holder.staggerT, 0.32);
    v.invuln = Math.max(v.invuln, 0.4); v.state = 'idle';
    g.vfx.ring(v.pos.clone().setY(v.pos.y + 5.2), { color: '#ffffff', r0: 1, r1: 8, life: 0.28 });
    g.audio.swing('fist', v.pos); g.audio.grunt(v.def.voicePitch || 1, v.pos);
    if (g.hud && (g.isHuman(holder) || g.isHuman(v))) g.hud.damageNumber(v.pos, 'BROKE FREE', '#ffffff', true);
  }
}
