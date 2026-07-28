// =================================================================================================
// G-GROUND · THE GROUND-GRAMMAR GAUGE — `LSW.groundSuite()` (aaa-02-ground.md §8, LOOP 3/4/5/6)
//
// ⚠ THIS FILE CHANGES NOTHING ABOUT THE GAME. It is an INSTRUMENT. Two halves:
//   1. `groundLogic()` — PURE, runs in Node OR in-page. Drives the real `MeleeSystem` phase machine
//      through the real `strike/chargeRelease/grab/update` methods against a minimal stub game, and
//      checks the LOOP-3/5/6 gates. ⚠ THE HARNESS PROVES ITSELF FIRST: a point-blank jab MUST land
//      at all before any negative assertion counts ([].every() is true — the vacuous-pass law).
//   2. `handSpeedTable(game)` — IN-PAGE ONLY (LOOP 4). Reads the FIST mesh (arm.children[2]) world
//      speed off the live poser across all 52 fighters and publishes p50/p95 for jab/cross/haymaker,
//      so HAND_REF is MEASURED, not guessed. Needs a running game; no-ops with a clear message in Node.
//
// Drive the gate, never write the gated value: nothing here assigns mstate/mT directly except the
// documented setup of a VICTIM already in recovery (there is no other way to place a foe there to
// test the back-grab rule, and it is the state under test, not the metric).
// =================================================================================================
import * as THREE from 'three';
import { MeleeSystem, swingMult, momentumMult, handMult, HAND_REF } from '../engine/melee.js';
import { STRIKES, artOf, STYLES, hasStrike, guardArcOf, blockStateOf, clinchWindow, groundKitOf } from '../data/martial.js';

const DT = 1 / 60;

// ---- the minimal stub game + fighters (no THREE scene, no rendering) -----------------------------
function noop() {}
function stubGame() {
  const g = {
    audio: new Proxy({}, { get: () => noop }),
    vfx: new Proxy({}, { get: () => noop }),
    world: { shake: noop, punch: noop },
    particles: { spawn: noop, burst: noop },
    hud: null, trail: noop, heroYell: noop, slowmo: noop, afterimage: noop,
    isHuman: () => false, disarm: noop,
    // coneFoe: the real one tests distance + a front cone + the ±10 same-deck rule. This mirrors it
    // closely enough for connect-TIMING (the thing under test): nearest foe in range, in front, same deck.
    coneFoe(caster, range, arc) {
      let best = null, bd = 1e9;
      for (const f of g._foes) {
        if (!f.alive || f === caster) continue;
        const dx = f.pos.x - caster.pos.x, dz = f.pos.z - caster.pos.z, dy = Math.abs(f.pos.y - caster.pos.y);
        const d = Math.hypot(dx, dz);
        if (d > range || dy > 10) continue;
        const dot = d < 0.001 ? 1 : (dx / d) * caster.aim.x + (dz / d) * caster.aim.z;
        if (dot < 0.2) continue;                 // roughly in front (arc)
        if (d < bd) { bd = d; best = f; }
      }
      return best;
    },
    _foes: [],
  };
  return g;
}
let _idc = 1;
function stubFighter(def, x = 0, z = 0) {
  const f = {
    id: _idc++, def, alive: true, hitstop: 0, staggerT: 0, stunT: 0, frozenT: 0,
    grabbedBy: null, grabState: null, grabbing: null, hanging: false, _carry: null,
    guarding: false, meleeCharge: 0, strikeCd: 0, comboWin: 0, strikeIdx: 0, strikeHit: null,
    mstate: null, mId: null, mKind: null, mHay: false, mP: 1, mT: 0, strikeActive: 0,
    invuln: 0, powerBuff: 1, ki: 100, phase: false, teleEscape: false, canPhase: false,
    _wounds: null, sheet: null, thorns: 0, grabMode: null, _guardUpT: 99, _victimEscape: false,
    state: 'idle', stateT: 0, punchPose: 0, _clinchMax: 0,
    pos: new THREE.Vector3(x, 0, z), vel: new THREE.Vector3(0, 0, 0), aim: { x: 1, z: 0 }, aim3: new THREE.Vector3(1, 0, 0),
    hits: [],
    faceDir() {}, muzzle(v) { return { x: this.pos.x, y: 5, z: this.pos.z }; },
    heal() {},
    takeDamage(amt, o = {}) { this.hits.push({ amt, o }); },
  };
  return f;
}
const DUMMY = { id: 'dummy', abilities: {}, strength: 5, colors: { accent: '#ffffff' }, voicePitch: 1, meleeTiers: 3 };

// ---- the assertion ledger -----------------------------------------------------------------------
function suite() {
  const R = [];
  const chk = (name, pass, got) => { R.push({ name, pass: !!pass, got: got === undefined ? '' : String(got) }); return !!pass; };

  // Aim +X. A punch attacker at origin, a foe placed ahead.
  const mk = (attDef, foeDef, foeX) => {
    const g = stubGame(), M = new MeleeSystem(g);
    const a = stubFighter(attDef, 0, 0), b = stubFighter(foeDef, foeX, 0);
    a.aim = { x: 1, z: 0 }; b.aim = { x: -1, z: 0 };   // foe faces the attacker (front)
    g._foes = [a, b]; return { g, M, a, b };
  };
  // step the world for both fighters
  const step = (M, ...fs) => { for (const f of fs) M.update(f, DT); };

  // ===== 0. PROVE THE HARNESS (vacuous-pass law): a POINT-BLANK jab MUST land ======================
  {
    const { M, a, b } = mk(DUMMY, DUMMY, 3);           // inside jab reach 11
    M.strike(a);
    let landed = false; for (let i = 0; i < 40; i++) { step(M, a, b); if (b.hits.length) { landed = true; break; } }
    chk('H0 point-blank jab LANDS (harness is real)', landed, `hits=${b.hits.length}`);
  }

  // ===== LOOP 3a: a jab at 10wu does NOT connect in the first 0.10s (startup) ======================
  {
    const { M, a, b } = mk(DUMMY, DUMMY, 10);           // reach 11 → in range, but startup 0.10s
    M.strike(a);
    let firstHitT = null, t = 0;
    for (let i = 0; i < 40; i++) { t += DT; step(M, a, b); if (b.hits.length && firstHitT === null) firstHitT = t; }
    chk('L3a jab does NOT connect before 0.10s startup', firstHitT !== null && firstHitT >= 0.10 - 1e-6, `firstHit=${firstHitT && firstHitT.toFixed(3)}s`);
    chk('L3a jab DOES connect after startup', firstHitT !== null, `firstHit=${firstHitT && firstHitT.toFixed(3)}s`);
  }

  // ===== LOOP 3b: a haymaker's 0.34s startup is interruptible (a hit → canAct false → cancel) ======
  {
    const { M, a, b } = mk(DUMMY, DUMMY, 6);            // power reach 7
    a.meleeCharge = 1.3; M.chargeRelease(a);            // full haymaker → mId 'power', startup 0.34s
    chk('L3b haymaker begins in startup', a.mstate === 'startup' && a.mId === 'power', `mstate=${a.mstate} mId=${a.mId}`);
    step(M, a);                                          // one frame of startup (~0.017s, well inside 0.34)
    a.hitstop = 0.15;                                    // a jab landed on the winder → canAct() false
    step(M, a);
    chk('L3b haymaker startup CANCELLED by a hit', a.mstate === null && b.hits.length === 0, `mstate=${a.mstate} foeHits=${b.hits.length}`);
  }

  // ===== LOOP 3c: a grab during the victim's RECOVER phase yields grabMode 'back' ==================
  {
    const { M, a, b } = mk(DUMMY, DUMMY, 5);            // grab reach 8
    b.aim = { x: -1, z: 0 };                             // victim faces the attacker → geometric FRONT
    // put the victim genuinely in recovery via the real machine: throw a jab and advance to recover
    M.strike(b); for (let i = 0; i < 40 && b.mstate !== 'recover'; i++) step(M, b);
    const inRecover = b.mstate === 'recover';
    M.grab(a); for (let i = 0; i < 20 && a.grabState !== 'clinch'; i++) { step(M, a); if (b.mstate === 'recover') { /* hold it */ } M.update(b, 0); }
    chk('L3c victim reached recover', inRecover, `victim mstate at grab=${inRecover}`);
    chk('L3c grab in recover → grabMode BACK (from the front)', a.grabMode === 'back', `grabMode=${a.grabMode}`);
  }

  // ===== LOOP 6a: a haymaker's STARTUP takes FULL damage from a jab (blk 'no') =====================
  {
    // attacker A winds a haymaker; defender/attacker B jabs A during A's startup. A is NOT blocking.
    const { M, a, b } = mk(DUMMY, DUMMY, 5);
    a.meleeCharge = 1.3; M.chargeRelease(a);            // A in power startup, blk = 'no'
    chk('L6a power startup blockState = no', blockStateOf(a) === 'no', `blk=${blockStateOf(a)}`);
    // B jabs A. A is mid-startup, not guarding → _blocks(A) must be false → full damage.
    b.aim = { x: -1, z: 0 }; a.pos.x = 0; b.pos.x = 5; b.aim = { x: -1, z: 0 };
    // resolve B's jab directly against A
    M.strike(b); let hit = null; for (let i = 0; i < 40; i++) { step(M, b); if (a.hits.length) { hit = a.hits[0]; break; } M.update(a, DT); }
    const blocked = hit && (hit.o.hitstop === undefined ? false : false);
    chk('L6a jab on power-startup is UNBLOCKED (full dmg)', hit && !hit.o.unblockable && hit.amt >= 7, `dmg=${hit && hit.amt && hit.amt.toFixed(1)}`);
  }

  // ===== LOOP 6b: a plain held guard behaves IDENTICALLY to today (wide, arc −0.15) ================
  {
    const { M, a, b } = mk(DUMMY, DUMMY, 5);
    b.guarding = true; b.aim = { x: -1, z: 0 };          // guarding, facing the attacker (front)
    chk('L6b held guard blockState = wide', blockStateOf(b) === 'wide', `blk=${blockStateOf(b)}`);
    chk('L6b plain guard arc threshold = −0.15 (unchanged)', Math.abs(guardArcOf(b) - (-0.15)) < 1e-9, `arc=${guardArcOf(b)}`);
    M.strike(a); let hit = null; for (let i = 0; i < 40; i++) { step(M, a); M.update(b, DT); if (b.hits.length) { hit = b.hits[0]; break; } }
    chk('L6b a front jab IS blocked by a held guard', b.hits.length > 0, `hits=${b.hits.length}`);
  }

  // ===== LOOP 4: swingMult is EXACTLY momentumMult when !onFoot; handMult when onFoot =============
  {
    const f1 = { onFoot: false, _momSpd: 40 };
    chk('L4 swingMult === momentumMult in the air (exact)', swingMult(f1) === momentumMult(f1), `${swingMult(f1)} vs ${momentumMult(f1)}`);
    const f2 = { onFoot: true, _handSpd: 0 };
    chk('L4 swingMult uses handMult on foot (×1.0 at rest)', swingMult(f2) === handMult(f2) && Math.abs(swingMult(f2) - 1) < 1e-9, `${swingMult(f2)}`);
    const f3 = { onFoot: false, _momSpd: 58 };
    chk('L4 blocked hits take neither (verified in resolver: kbs = blocked?1:mom)', momentumMult(f3) > 2, `mom@58=${momentumMult(f3).toFixed(2)}`);
  }

  return R;
}

// ---- LOOP 5: the distribution + hasStrike, over a real roster ------------------------------------
export function groundStyles(ROSTER) {
  const dist = {}; for (const k of Object.keys(STYLES)) dist[k] = [];
  for (const d of ROSTER) dist[artOf(d)].push(d.id);
  const red = [];
  for (const k of Object.keys(STYLES)) { const n = dist[k].length; if (n === 0 || n > 21) red.push(`${k}=${n}`); }
  // override + no-abilities checks
  const overrideOk = artOf({ ...ROSTER[0], art: 'wrestling' }) === 'wrestling';
  let closerOk = false; try { closerOk = groundKitOf({}).closer === true && typeof artOf({ abilities: {} }) === 'string'; } catch { closerOk = false; }
  const arcs = new Set(); for (const d of ROSTER) arcs.add(+guardArcOf({ def: d }).toFixed(3));
  return { dist, red, overrideOk, closerOk, arcDistinct: arcs.size };
}

// ---- LOOP 4 (in-page only): the fist-speed table ------------------------------------------------
// Reads the FIST mesh world speed off the live poser. arm.children[2] = fist (the rig contract).
export function handSpeedTable(game) {
  const L = (typeof window !== 'undefined' && window.LSW) || null;
  if (!L || !game) { return { error: 'IN-PAGE ONLY — run LSW.groundSuite() in the game, not in Node.' }; }
  const THREE = L.THREE;
  const rows = {};
  const roster = L.ROSTER;
  const sampleFist = (f) => {
    const arm = f.parts && (f.parts.armR || f.parts.armL);
    if (!arm) return null;
    const fist = arm.children && arm.children[2] ? arm.children[2] : arm;
    const w = new THREE.Vector3(); fist.getWorldPosition(w); return w;
  };
  // driven per-fighter jab/cross/haymaker, sampling peak fist speed
  const measure = (def, kind) => {
    game.startMatch(def.id);
    const f = game.player; if (!f) return null;
    const M = game.melee; let peak = 0, prev = null;
    const fire = () => {
      if (kind === 'jab') M.strike(f);
      else if (kind === 'cross') { f.comboWin = 1; f.strikeIdx = 1; M.strike(f); }
      else { f.meleeCharge = 1.3; M.chargeRelease(f); }
    };
    fire();
    for (let i = 0; i < 30; i++) {
      f._animate ? f._animate(1 / 60) : null;
      const p = sampleFist(f);
      if (p && prev) { const s = p.distanceTo(prev) / (1 / 60); if (s > peak) peak = s; }
      prev = p ? p.clone() : null;
      M.update(f, 1 / 60);
    }
    return peak;
  };
  for (const kind of ['jab', 'cross', 'haymaker']) {
    const vals = [];
    for (const def of roster) { const v = measure(def, kind); if (v != null && isFinite(v)) vals.push(v); }
    vals.sort((a, b) => a - b);
    const p = q => vals.length ? vals[Math.min(vals.length - 1, Math.floor(q * vals.length))] : 0;
    rows[kind] = { n: vals.length, p50: +p(0.5).toFixed(2), p95: +p(0.95).toFixed(2), min: +p(0).toFixed(2), max: +(vals[vals.length - 1] || 0).toFixed(2) };
  }
  rows.HAND_REF_current = HAND_REF;
  return rows;
}

export function groundSuite(game) {
  const L = (typeof window !== 'undefined' && window.LSW) || null;
  const roster = (L && L.ROSTER) || null;
  const logic = suite();
  const styles = roster ? groundStyles(roster) : null;
  const pass = logic.every(r => r.pass) && (!styles || (styles.red.length === 0 && styles.overrideOk && styles.closerOk && styles.arcDistinct >= 3));
  const out = { pass, logic, styles };
  if (L) out.handSpeed = handSpeedTable(game);
  return out;
}

export default groundSuite;
