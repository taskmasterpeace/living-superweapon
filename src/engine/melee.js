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
import { rankOf } from '../data/scale.js';
import { STRIKES, STEP_IMPULSE, styleOf, hasStrike, blockStateOf, guardArcOf, clinchWindow } from '../data/martial.js';
import * as THREE from 'three';

const _v = new THREE.Vector3();

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

  canAct(f) { return f.alive && f.hitstop <= 0 && f.staggerT <= 0 && f.stunT <= 0 && !f.grabbedBy && f.grabState !== 'clinch' && !f.hanging; }   // one hand on the wall = no trifecta

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
  _endStrike(f) { f.mstate = null; f.mId = null; f.mKind = null; f.mHay = false; f.strikeActive = 0; }

  _beginStrike(f, id, kind, p01 = 1, hay = false) {
    const g = this.game, pace = (f.def && f.def.meleePace) || 1, S = STRIKES[id];
    f.mId = id; f.mKind = kind; f.mHay = hay; f.mP = p01;
    f.mstate = 'startup'; f.mT = S.startup / pace;
    f.strikeHit = new Set();
    f.strikeActive = this._commitRemaining(f);
    f.state = 'cast'; f.stateT = 0;
    if (kind === 'heavy') f.punchPose = 1;
    // MOMENTUM (manual §10): read the speed you BROUGHT to the punch — before the lunge fakes one
    f._momSpd = Math.hypot(f.vel.x, f.vel.y, f.vel.z);
    f._momDive = !!(f.flying && (f.descendHeld || f.vel.y < -14));
    // ⚠ THE STEP-IN SELLS THE REACH (the short-arms problem). `step` is a DISTANCE in data/martial.js;
    // STEP_IMPULSE converts it to the velocity impulse. jab 2.0×8 = the 16 that was hard-coded here.
    const lunge = S.step * STEP_IMPULSE;
    f.vel.x += f.aim.x * lunge; f.vel.z += f.aim.z * lunge;
    if (kind === 'heavy') {
      f.invuln = Math.max(f.invuln, hay ? 0.1 : 0.05);
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
    if (!this.canAct(f) || f.grabbing || f.guarding || f.mstate || f.grabState || f.meleeCharge > 0) return;
    f.meleeCharge = 0.001; f.state = 'cast'; f.stateT = 0;
  }
  chargeUpdate(f, dt) {
    if (f.meleeCharge <= 0) return;
    if (!this.canAct(f)) { f.meleeCharge = 0; return; }        // hit out of the wind-up (STRIKE beats charge too)
    f.meleeCharge = Math.min(1.3, f.meleeCharge + dt * ((f.sheet && f.sheet.chargeRate) || 1));   // Brawlers wind up faster
    const g = this.game;
    if (f.meleeCharge > 0.3 && Math.random() < f.meleeCharge * 0.5) {
      const m = f.muzzle(_v, 2.2, 5.6);
      g.particles.spawn({ x: m.x, y: m.y, z: m.z, vx: (Math.random() * 2 - 1) * 6, vy: 4, vz: (Math.random() * 2 - 1) * 6, life: 0.25, size: 1.8 + f.meleeCharge * 1.6, color: [f.def.colors.accent, '#fff'], drag: 2, shrink: true });
    }
    if (f.meleeCharge >= 1.29 && Math.random() < 0.2) g.world.shake(0.12);   // fully charged — rumbling
  }
  chargeRelease(f) {
    const t = f.meleeCharge; f.meleeCharge = 0;
    if (t <= 0 || !this.canAct(f)) return;
    const tiers = f.def.meleeTiers ?? 3;
    const canJab = hasStrike(f.def, 'jab'), canCross = hasStrike(f.def, 'cross'), canPower = hasStrike(f.def, 'power');
    if (t < 0.18 || tiers === 1) {                                                      // TAP → jab combo
      if (canJab || canCross) { f.strikeCd = 0; return this.strike(f); }
      if (canPower) return this._beginHeavy(f, 'power', 0.5, true);                      // pure slammer: a tap is a slam
      return;
    }
    if (t < 0.55 && tiers >= 3) {                                                        // STRAIGHT (a cross)
      if (canCross) return this._beginHeavy(f, 'cross', 0.45, false);
      if (canJab) { f.strikeCd = 0; return this.strike(f); }                             // no cross → a jab
      if (canPower) return this._beginHeavy(f, 'power', 0.5, true);
      return;
    }
    // HAYMAKER (a power) — fall to the heaviest strike the style actually has
    if (canPower) return this._beginHeavy(f, 'power', Math.min(1, t), true);
    if (canCross) return this._beginHeavy(f, 'cross', 0.45, false);
    if (canJab) { f.strikeCd = 0; return this.strike(f); }
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

  // -- the active-window resolvers (fire only while mstate === 'active') ---------------------------
  _resolveLight(f) {
    const g = this.game;
    // the third beat of the combo is the CROSS — shorter than the jabs that set it up
    const foe = g.coneFoe(f, f.strikeIdx === 2 ? STRIKES.cross.reach : STRIKES.jab.reach, 0.75);
    if (!(foe && f.strikeHit && !f.strikeHit.has(foe.id))) return;
    f.strikeHit.add(foe.id);
    const fin = f.strikeIdx === 2;
    // MOMENTUM (air) / MEASURED SWING (ground): an arriving punch is a different animal. BLOCKED hits
    // stay at BASE — the multiplier raises the reward, never what a raised guard has to eat.
    const mom = swingMult(f), dive = f._momDive && (f._momSpd || 0) > 20;
    const blocked = this._blocks(foe, f);
    const kbs = blocked ? 1 : mom;
    const dmg = (fin ? 17 : 8) * kbs * f.powerBuff * ((f.sheet && f.sheet.jabMult) || 1)
      * (1 - 0.08 * ((f._wounds && f._wounds.arm) || 0));   // a wounded arm hits softer (manual §18)
    const hs = fin ? 0.14 : 0.07;
    foe.takeDamage(dmg, { src: f, strike: true, hitstop: hs,
      dmgClass: this._swingKind(f) === 'blade' ? 'slash' : undefined,   // claw/blade kits jab with STEEL — wounds (manual §12)
      kb: { x: f.aim.x * (fin ? 14 : 8) * kbs, y: (fin ? 30 : 2) * kbs, z: f.aim.z * (fin ? 14 : 8) * kbs },
      launch: dive && !blocked ? -(34 + (f._momSpd || 0) * 0.45) : 0 });   // DIVE PUNCH
    f.hitstop = Math.max(f.hitstop, hs * (fin ? 0.9 : 0.6));      // attacker freezes too — meaty impact
    const imp = foe.pos.clone().set((f.pos.x + foe.pos.x) / 2, 5.7, (f.pos.z + foe.pos.z) / 2);
    if (blocked) { g.vfx.impactStar(imp, 7, '#bfe0ff', 0.16); g.world.shake(0.35); g.audio.zap(520, imp); f.strikeCd = Math.max(f.strikeCd, 0.5); f.hitstop = Math.max(f.hitstop, 0.09); }   // jab blocked → punishable
    else {
      const fp = 0.6 + 0.4 * mom;   // the impact star and the hit sound ride the SAME number
      g.vfx.impact(imp, { x: f.aim.x, z: f.aim.z }, { color: f.def.colors.accent, power: (fin ? 1.7 : 0.65) * fp });
      g.world.shake((fin ? 1.5 : 0.6) * fp); g.audio.impact((fin ? 1.3 : 0.65) * fp, imp);
      if (fin || mom > 1.55) { g.world.punch(0.8); g.slowmo(0.14, 0.36); }
      if (dive) {   // the launcher lands: arrival ring under the victim
        g.vfx.ring(foe.pos.clone().setY(Math.max(0.4, foe.pos.y - 4)), { color: '#ffffff', r0: 1, r1: 9, life: 0.3, flat: true, y: 0.4 });
        g.audio.meleeHit(1.2, imp, true);
      }
    }
    if (!fin) f.comboWin = 0.42;
  }

  _resolveHeavy(f) {
    if (f.strikeHit && f.strikeHit.size) return;   // one connect per swing
    const g = this.game;
    // ⚠ THE INVERSION. The power punch reaches LEAST — 7u against the jab's 11u. This one number is the design.
    const foe = g.coneFoe(f, STRIKES.power.reach, 0.8);
    if (!foe) return;
    f.strikeHit.add(foe.id);
    const str = f.def.strength ?? 5, hay = f.mHay, p = f.mP;
    const mom = swingMult(f), dive = f._momDive && (f._momSpd || 0) > 20;
    const dmg = (hay ? 20 + p * 14 : 13) * (0.85 + str * 0.03) * f.powerBuff * (hay ? 1 : ((f.sheet && f.sheet.jabMult) || 1))
      * (1 - 0.08 * ((f._wounds && f._wounds.arm) || 0));   // the cradled arm (manual §18)
    const blocked = this._blocks(foe, f);
    const imp = foe.pos.clone().set((f.pos.x + foe.pos.x) / 2, 5.7, (f.pos.z + foe.pos.z) / 2);
    if (blocked && hay) {
      // GUARD CRUSH — the blocker stumbles back wide open; the crowd goes wild
      foe.guarding = false; foe.staggerT = 0.85; foe.guardMeter = Math.max(0, foe.guardMeter - 0.55);
      foe.state = 'hit'; foe.stateT = 0;
      foe.takeDamage(dmg * 0.35, { src: f, unblockable: true, hitstop: 0.12, kb: { x: f.aim.x * 46, y: 8, z: f.aim.z * 46 } });
      g.vfx.impactStar(imp, 12, '#ffd24a', 0.24); g.vfx.ring(imp, { color: '#ffd24a', r0: 1, r1: 12, life: 0.3 });
      g.world.shake(1.6); g.world.punch(0.7); g.audio.meleeHit(1.3, imp, true); g.slowmo(0.14, 0.4);
      if (g.hud) { g.hud.damageNumber(foe.pos, 'GUARD CRUSH', '#ffd24a', true); g.hud.flashScreen('#ffd24a', 0.12); }
    } else if (blocked) {
      foe.takeDamage(dmg, { src: f, strike: true, hitstop: 0.07 });     // straights get blocked like strikes
      f.strikeCd = Math.max(f.strikeCd, 0.5); f.hitstop = Math.max(f.hitstop, 0.1);   // punishable — counter window
      g.vfx.impactStar(imp, 8, '#bfe0ff', 0.18);
      g.audio.impact(0.7, imp); g.world.shake(0.5);
    } else {
      const fp = 0.6 + 0.4 * mom;   // star + sound ride the same momentum number
      foe.takeDamage(dmg * mom, { src: f, strike: true, heavy: hay, haymaker: hay,
        hitstop: hay ? 0.20 : 0.12,
        dmgClass: this._swingKind(f) === 'blade' ? 'slash' : undefined,
        kb: { x: f.aim.x * (hay ? 54 : 26) * mom, y: (hay ? 6 : 3) * mom, z: f.aim.z * (hay ? 54 : 26) * mom },
        launch: dive ? -(36 + (f._momSpd || 0) * 0.45) : (hay ? 16 : 6) * mom });   // dive haymaker = meteor drop
      f.hitstop = Math.max(f.hitstop, hay ? 0.19 : 0.10);
      g.vfx.impact(imp, { x: f.aim.x, z: f.aim.z }, { color: f.def.colors.accent, power: (hay ? 2 : 1.1) * fp });
      g.world.shake((hay ? 2.6 : 1.15) * fp); g.audio.meleeHit((hay ? 1.8 : 1.0) * fp, imp, hay);
      if (hay || mom > 1.55) { g.world.punch(0.9); g.slowmo(0.16, 0.34); }
      if (dive) { g.vfx.ring(foe.pos.clone().setY(Math.max(0.4, foe.pos.y - 4)), { color: '#ffffff', r0: 1, r1: 10, life: 0.3, flat: true, y: 0.4 }); g.audio.boom(0.5, imp); }
    }
  }

  guard(f, on) {
    // 3c: CARRYING COSTS YOU YOUR HANDS. You cannot punch or block while holding a car.
    if (f._carry) return;
    if (f.hanging) on = false;                      // can't brace hanging off a ledge
    // Hitstop must NOT drop a held guard — every blocked hit applies hitstop to the blocker, so
    // gating on canAct() made a fast combo strip the guard after the first block ("can't hold down
    // block"). Stagger, grabs, and your own attacks (a strike in progress) still drop it.
    if (on && (!f.alive || f.staggerT > 0 || f.grabbedBy || f.grabState || f.grabbing || f.mstate)) { f.guarding = false; return; }
    if (on && !f.guarding) f._guardUpT = 0;   // rising edge — the PARRY window starts here
    f.guarding = !!on && f.alive;
  }

  grab(f) {
    if (f.grabState === 'clinch' && f.grabbing) { this._throw(f); return; }   // second press = THE AIMED THROW (manual §11)
    if (!this.canAct(f) || f.grabbing || f.grabState || f.mstate || f.guarding) return;
    f.grabState = 'startup'; f.grabT = 0.14; f.state = 'cast'; f.stateT = 0;
    this.game.audio.zap(300);
  }

  release(f) {
    if (!f) return;
    if (f.grabbing) { const v = f.grabbing; if (v) { v.grabbedBy = null; if (v.state === 'hit') v.state = 'idle'; } f.grabbing = null; }
    if (f.grabbedBy) { const h = f.grabbedBy; if (h) { h.grabbing = null; h.grabState = null; } f.grabbedBy = null; }
    f.grabState = null; f.grabT = 0; f._victimEscape = false;
  }

  _throw(holder) {
    const g = this.game, v = holder.grabbing;
    if (!v) { this.release(holder); return; }
    const back = holder.grabMode === 'back';
    const str = holder.def.strength ?? 5;
    const dmg = (back ? 16 : 10) * holder.powerBuff;
    // PERSON VS PERSON BATTLES WEIGHT (manual §21): strength against body weight — ratio-logged so the
    // extremes stay playable.
    const wr = Math.max(0.45, Math.min(1.2, 0.75 + 0.15 * Math.log2(liftCapacityOf(holder.def) / Math.max(0.05, bodyWeight(v.def)))));
    const spd = ((back ? 60 : 48) + str * 4.6) * wr;              // STRENGTH scales the hurl, WEIGHT resists it
    const dir = _v.copy(holder.aim3); if (dir.lengthSq() < 0.01) dir.set(holder.aim.x, 0, holder.aim.z);
    dir.normalize();
    v.grabbedBy = null; holder.grabbing = null; holder.grabState = null; holder.grabT = 0;
    v.state = 'idle';
    v.takeDamage(dmg, { src: holder, strike: true, unblockable: true, hitstop: 0 });   // strike-flagged → feeds Overdrive; hitstop 0 so the body flies NOW
    if (holder.grabHeal) holder.heal(dmg * holder.grabHeal);
    // AUTHORED velocity, not kb-scaled — the dotted preview integrates exactly this launch state.
    v.vel.set(dir.x * spd, (dir.y + 0.22) * spd, dir.z * spd);   // flatter loft than props — a body is a bowling ball, not a mortar shell
    v.flying = false; v.flyHeld = false; v.gliding = false;
    v.launchT = 1.35; v._thrownT = 1.35; v._thrownBy = holder; if (v._thrownHit) v._thrownHit.clear();
    holder.hitstop = Math.max(holder.hitstop, 0.08);
    g.vfx.impact(v.pos.clone().setY(5.6), { x: dir.x, z: dir.z }, { color: holder.def.colors.accent, power: back ? 1.9 : 1.4 });
    g.world.shake(back ? 1.7 : 1.2); g.world.punch(0.72); g.audio.meleeHit(back ? 1.4 : 1.1, v.pos, true);
    g.heroYell(holder, 1.0);
    g.slowmo(0.1, 0.42); if (g.hud) g.hud.flashScreen('#fff', 0.14);
  }

  update(f, dt) {
    const g = this.game;
    if (f.guarding) f._guardUpT = (f._guardUpT ?? 99) + dt;   // how long the shield has been up (parry clock)
    this.chargeUpdate(f, dt);

    // --- THE STRIKE PHASE MACHINE (startup → active → recover) ------------------------------------
    if (f.mstate) {
      const pace = (f.def && f.def.meleePace) || 1;
      const S = STRIKES[f.mId];
      if (f.mstate === 'startup') {
        if (!this.canAct(f)) { this._endStrike(f); }        // ⚠ A HIT BEATS THE WIND-UP (gate b, the whole risk model)
        else { f.mT -= dt; if (f.mT <= 0) { f.mstate = 'active'; f.mT += S.active / pace; } }
      } else if (f.mstate === 'active') {
        if (this._hardInterrupt(f)) this._endStrike(f);
        else {
          if (f.mKind === 'light') this._resolveLight(f); else this._resolveHeavy(f);
          if (f.mstate === 'active') {                      // (a resolve can end the strike)
            f.mT -= dt;
            if (f.mT <= 0) {
              // the whiff-continue window (was set when a light strike ended without a combo already open)
              if (f.mKind === 'light' && f.strikeIdx < 2 && f.comboWin <= 0) f.comboWin = 0.32;
              f.mstate = 'recover'; f.mT += S.recover / pace;
            }
          }
        }
      } else {   // recover — the punish window
        if (this._hardInterrupt(f)) this._endStrike(f);
        else { f.mT -= dt; if (f.mT <= 0) this._endStrike(f); }
      }
      f.strikeActive = this._commitRemaining(f);
    } else if (f.strikeActive) {
      f.strikeActive = 0;   // ⚠ the negative-truthy trap: a spent timer must read exactly 0
    }

    // --- grab state machine ---
    if (f.grabState === 'startup') {
      f.grabT -= dt;
      if (f.grabT <= 0) {
        // ⚠ a WRESTLER closes from further out — the style's whole identity is getting inside
        const foe = g.coneFoe(f, STRIKES.grab.reach + ((styleOf(f.def).grabBonus) || 0), 0.95);
        if (foe && !foe.phase && foe.invuln <= 0 && !foe.grabbedBy && foe.alive) {
          const bx = f.pos.x - foe.pos.x, bz = f.pos.z - foe.pos.z, bd = Math.hypot(bx, bz) || 1;
          const geoBehind = (bx / bd) * foe.aim.x + (bz / bd) * foe.aim.z < -0.2;
          // ⚠ THE VULNERABILITY RULE (martial.js §THE CLINCH): grabbing them during their RECOVERY
          // frames gets you their BACK, even from the front. This is what recovery frames were for.
          const behind = geoBehind || foe.mstate === 'recover';
          f.grabMode = behind ? 'back' : 'front';
          f.grabbing = foe; foe.grabbedBy = f; foe.grabState = null; foe.strikeActive = 0; foe.mstate = null; foe.mId = null; foe.guarding = false;
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
          if (g.isHuman(f) && g.hud) g.hud.feed('CLINCH — aim, then G again to HURL them', '#ff8a3a');
          f._victimEscape = !behind && ((foe.teleEscape && foe.ki > 14) || foe.canPhase);
          g.audio.hit(150); g.world.shake(0.5);
          g.vfx.ring(foe.pos.clone().setY(5), { color: f.def.colors.accent, r0: 1, r1: 7, life: 0.3 });
        } else { f.grabState = null; f.strikeCd = 0.35; }
      }
    } else if (f.grabState === 'clinch') {
      const v = f.grabbing;
      if (!v || !v.alive) { this.release(f); return; }
      f.grabT -= dt;
      // pin the victim in front of the holder — THRASHING laterally against the hold (the tell)
      const wob = Math.sin(((f._clinchMax || 0.4) - f.grabT) * 11) * Math.min(1.5, 0.4 + (v.def.strength ?? 5) * 0.1);
      v.pos.x = f.pos.x + f.aim.x * 4.4 - f.aim.z * wob; v.pos.z = f.pos.z + f.aim.z * 4.4 + f.aim.x * wob; v.pos.y = f.pos.y;
      v.vel.set(0, 0, 0); v.state = 'hit'; v.stateT = 0; v.faceDir(-f.aim.x, -f.aim.z);
      if (Math.random() < dt * 7) g.particles.burst(v.pos.x, v.pos.y + 5.5, v.pos.z, { count: 2, speed: 9, life: 0.25, size: 1.6, color: ['#fff', v.def.colors.accent], drag: 2 });
      // thorns: being held hurts the holder
      if (v.thorns) {
        f.takeDamage(v.thorns * dt, { src: v, trueDamage: true });
        if (Math.random() < 0.35) g.particles.burst(f.pos.x, 5.5, f.pos.z, { count: 2, speed: 12, life: 0.3, size: 2.2, color: [v.def.colors.accent, '#fff'] });
      }
      // front-grab escape (teleport / phase) at the midpoint
      if (f._victimEscape && f.grabT <= (f._clinchMax || 0.4) * 0.5) {
        f._victimEscape = false;
        if (v.teleEscape && v.ki > 14) { v.ki -= 14; g.afterimage(v); v.pos.x -= f.aim.x * 22; v.pos.z -= f.aim.z * 22; v.invuln = 0.35; g.audio.teleport(); }
        else { v.invuln = 0.4; }
        g.vfx.flash(v.pos.clone().setY(5), v.def.colors.accent, 6, 0.2);
        v.grabbedBy = null; v.state = 'idle'; f.grabbing = null; f.grabState = null;
        return;
      }
      if (f.grabT <= 0) this._breakFree(f);
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
    g.vfx.ring(v.pos.clone().setY(5.2), { color: '#ffffff', r0: 1, r1: 8, life: 0.28 });
    g.audio.swing('fist', v.pos); g.audio.grunt(v.def.voicePitch || 1, v.pos);
    if (g.hud && (g.isHuman(holder) || g.isHuman(v))) g.hud.damageNumber(v.pos, 'BROKE FREE', '#ffffff', true);
  }
}
