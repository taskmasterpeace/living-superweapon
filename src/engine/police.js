// THRESHOLD — the POLICE. The Witness Layer grows teeth: THE VILLAIN IS WHOEVER HURTS HUMANS.
// Every civilian a fighter puts down builds HEAT; cross the line and the city dispatches units —
// how FAST depends on the theater's SAFETY INDEX off the world sheet (safe cities respond in
// seconds; lawless ones take their time). Cruisers roll in from the map edge with light bars
// running, officers pile out and FIXATE on the villain only — heroes who keep civilians out of
// it never see a badge. KO'ing an officer is villainy squared. Heat decays; the news covers all
// of it. Police are real Fighters (AI, ragdolls, the crew films them) but never enter the Elo book.
import * as THREE from 'three';
import { hasCivilians } from '../data/modes.js';
import { AI } from './ai.js';
import { clamp } from '../core/util.js';
import { countryOf } from '../data/countries.js';
import { ROSTER } from '../data/characters.js';
// ⚠ THE ARMORY WAS IN NOBODY'S HANDS. 35 rows in data/armory.js — 13 firearms with their own
// measured audio signatures (manual §38) — and not one fighter or police def carried a single id.
// The response ladder therefore sounded identical at every rung: a beat cop and a federal agent
// fired the same generic "rifle".
//
// The badges are the cheapest carriers in the game, and the payoff is the one the ladder was built
// for: escalation you can HEAR. Each rung now draws a real named weapon out of the armory, so the
// difference between a patrol car and a tactical team arrives through the audio before you see it.
// `armWith` copies the armory row's ability and keeps the police tuning that was balanced against
// civilians — the weapon supplies its identity (name, mesh, voice, class), never its damage.
import { FIREARMS } from '../data/armory.js';
const gunOf = (id) => FIREARMS.find((f) => f.id === id) || null;
function armWith(slot, id) {
  const g = gunOf(id);
  if (!g || !g.ab) return slot;
  // ⚠ IDENTITY FROM THE ARMORY, NUMBERS FROM THE LADDER. Taking the armory's damage would hand a
  // beat cop a 46-damage marksman round and undo the whole ballistic scale against civilians.
  return { ...slot, name: g.ab.name, weapon: g.ab.weapon || g.cls, voice: g.voice, mesh: g.mesh,
           armoryId: g.id, spread: g.ab.spread ?? slot.spread, pellets: g.ab.pellets ?? slot.pellets };
}


const HEAT_CIV = 12, HEAT_COP = 40, THRESH = 35;

export const COP_DEF = {
  id: 'police', police: true, name: 'OFFICER', title: 'City Police', role: 'Response Unit',
  colors: { primary: '#1c2d4a', secondary: '#14161c', accent: '#5aa0ff', skin: '#caa27a' },
  hp: 60, ki: 60, speed: 26, strength: 3, overdrive: 0, threat: 'Low', flightTier: 0, meleeTiers: 2,
  ai: { style: 'zoner', range: 36, aggro: 0.6, fly: 0 },
  evade: { kind: 'dash', name: 'Take Cover' },
  abilities: {
    lmb: armWith({ type: 'rifle', name: 'Service Pistol', gear: true, cost: 1.5, interval: 0.46, damage: 5, speed: 130, radius: 0.6, oneHand: true, color: '#cfe0ff' }, 'p9'),
    shift: { type: 'dash', name: 'Sprint', cost: 4, cd: 0.9, power: 70, iframes: 0.1, color: '#5aa0ff' },
  },
};
export const SWAT_DEF = {
  ...COP_DEF, id: 'police', name: 'SWAT', title: 'Special Response', role: 'Tactical Unit',
  colors: { primary: '#16181e', secondary: '#0e1013', accent: '#5aa0ff', skin: '#caa27a' },
  hp: 95, speed: 28, strength: 5, meleeTiers: 3,
  abilities: {
    lmb: armWith({ type: 'rifle', name: 'Tactical Carbine', gear: true, cost: 1.5, interval: 0.16, damage: 4, speed: 150, radius: 0.55, color: '#cfe0ff' }, 'mp5'),
    shift: { type: 'dash', name: 'Breach Sprint', cost: 4, cd: 0.8, power: 80, iframes: 0.12, color: '#5aa0ff' },
  },
};
// THE FEDS — rung four. Black suits out of black Suburbans, automatic weapons, no small talk.
// Only a state with a real federal apparatus fields them (see _hasFeds — intel budget).
export const FED_DEF = {
  ...COP_DEF, id: 'police', name: 'FEDERAL AGENT', title: 'Federal Response', role: 'Field Office',
  colors: { primary: '#101216', secondary: '#1a1d24', accent: '#cfd6e4', skin: '#caa27a' },
  hp: 110, ki: 70, speed: 29, strength: 5, meleeTiers: 3, armor: 4,
  evade: { kind: 'dash', name: 'Break Contact' },
  abilities: {
    lmb: armWith({ type: 'rifle', name: 'Automatic Rifle', gear: true, cost: 1.3, interval: 0.11, damage: 4.5, speed: 165, radius: 0.55, color: '#e4ecff' }, 'pdw'),
    rmb: armWith({ type: 'rifle', weapon: 'pistol', name: 'Sidearm', cost: 1.5, interval: 0.5, damage: 7, speed: 140, radius: 0.6, oneHand: true, color: '#cfe0ff' }, 'magnum'),
    shift: { type: 'dash', name: 'Break Contact', cost: 4, cd: 0.85, power: 78, iframes: 0.12, color: '#cfd6e4' },
  },
};
// THE TOP OF THE LADDER — the state sends its ARMY. Reachable ONLY in a country whose military
// budget says it HAS one to send (see _hasMilitary), so a broke state tops out at SWAT and a
// superpower brings out armour. Soldiers are plated (armor eats bullets — but the villain fights
// with energy) and carry a grenade, so they're a real escalation, not more of the same.
export const GUARD_DEF = {
  ...COP_DEF, id: 'police', name: 'SOLDIER', title: 'National Guard', role: 'Military',
  colors: { primary: '#3a4a2c', secondary: '#232a1a', accent: '#9bd07a', skin: '#caa27a' },
  hp: 145, ki: 90, speed: 27, strength: 6, meleeTiers: 3, armor: 8, body: 'metal',
  abilities: {
    lmb: armWith({ type: 'rifle', name: 'Assault Rifle', gear: true, cost: 1.2, interval: 0.12, damage: 5, speed: 168, radius: 0.55, color: '#e6ffcf' }, 'm16'),
    rmb: { type: 'projectile', name: 'Rifle Grenade', gear: true, cost: 10, cd: 3.6, damage: 20, speed: 96, radius: 1.2, blast: 11, grav: 5, shock: true, color: '#ffd24a', color2: '#fff' },
    shift: { type: 'dash', name: 'Combat Roll', cost: 4, cd: 0.9, power: 82, iframes: 0.14, color: '#9bd07a' },
  },
};

// THE GATES, exported pure so the opening director (and anything else) reads the SAME rule the
// dispatcher runs — never a reimplementation (the validator law).
export function ladderGatesFor(C) {
  return {
    feds: !!C && (C.intelBudget >= 45 || C.lawBudget >= 62),
    military: !!C && (C.milBudget >= 52 || C.milService >= 60),
    sanctioned: !!C && C.lswRegs !== 'Banned' && C.lswActivity >= 40,
  };
}

export class PoliceSystem {
  constructor(game) {
    this.g = game;
    this.heat = new Map();          // fighter → heat
    this.cruisers = [];             // { grp, barR, barB, t, from, to, arrived, spawned }
    this.cops = [];
    this._reinforceT = 0; this._respT = -1; this._unitNo = 0;
    this._lastHarmT = -99; this._announced = false;
  }
  reset() {
    this.heat.clear();
    for (const c of this.cruisers) this._sirenOff(c);          // a loop outlives the scene unless you stop it
    for (const c of this.cruisers) { this.g.scene.remove(c.grp); c.grp.traverse(o => { if (o.geometry && o.geometry !== this.g.world._carGeo) o.geometry.dispose(); if (o.material && !o.material._shared) o.material.dispose(); }); }
    this.cruisers.length = 0;
    this.cops.length = 0;           // the fighters themselves are cleared by startMode
    this._respT = -1; this._reinforceT = 0; this._announced = false; this._lastHarmT = -99; this._lswSent = false; this._cCache = undefined;
  }
  // ⚠ "is there a civil society here" is ONE question with one home (data/modes.js). It used to be
  // the magic string `!== 'training'` here and again in newscrew.js, so every new dimension needed
  // both edited by hand — and a dimension with nobody in it would otherwise still dispatch police.
  get active() { return !!(this.g.mode && (this._forced || hasCivilians(this.g.modeId)) && !(this.g.netplay && this.g.netplay.active)); }

  heatOf(f) { return this.heat.get(f) || 0; }

  // ---- THE VOICE OF THE LAW (manual §22) -------------------------------------------------
  // Everything the police say is SYNTHESISED speech through a radio chain — no words, just the
  // register: clipped traffic over the air (`radio`) or a shouted order through a hailer
  // (`command`). Rate-limited by the soundscape's own voice governor, positional through the
  // same falloff as every other sound, so you hear the units NEAR you and not the whole city.
  _say(pos, emotion, opts = {}) {
    const ss = this.g.soundscape; if (!ss || !ss.say) return;
    try { ss.say(pos, emotion, { radio: true, gain: 0.34, ...opts }); } catch (e) {}
  }
  // dispatch: heard as a transmission from nowhere in particular (it is the radio, not a person)
  _dispatch(pos, urgent = false) {
    try { this.g.audio.squelch(pos, true); } catch (e) {}
    this._say(pos, 'radio', { urgent, speaker: 'woman', gain: 0.3 });
  }
  // the order: the hailer chirp, then the shout. This is the sound of being TOLD to stop.
  _order(pos) {
    try { this.g.audio.hailer(pos); } catch (e) {}
    this._say(pos, 'command', { urgent: true, gain: 0.42, delay: 0.26 });
  }
  // one wailing light bar per vehicle, created live and reaped on stand-down
  _sirenOn(cr) {
    if (cr._siren) return;
    try { cr._siren = this.g.audio.sustain('siren', cr.grp.position); } catch (e) { cr._siren = null; }
  }
  _sirenOff(cr) {
    if (cr._siren) { try { cr._siren.stop(); } catch (e) {} cr._siren = null; }
  }
  // THE LADDER (Robert's ruling 2026-07-24): ★ beat cops (35) → ★★ patrol backup (90) →
  // ★★★ TACTICAL/SWAT (160) → ★★★★ THE FEDS (240, black Suburbans + automatics) →
  // ★★★★★ the MILITARY (340) → ★★★★★★ A SANCTIONED LSW (460) — a registered superweapon of the
  // state's own. Every top rung exists ONLY where the country sheet says the state HAS it to
  // send: no federal apparatus → tops out at SWAT; no army → tops out at feds; a state with a
  // Banned/low-activity LSW program never fields one. A failed state just keeps sending SWAT —
  // that difference is the whole point of the country sheet.
  wantedLevel(f) {
    const h = this.heatOf(f);
    let lvl = h >= 460 ? 6 : h >= 340 ? 5 : h >= 240 ? 4 : h >= 160 ? 3 : h >= 90 ? 2 : h >= THRESH ? 1 : 0;
    if (lvl >= 6 && !this._hasSanctioned()) lvl = 5;
    if (lvl >= 5 && !this._hasMilitary()) lvl = 4;
    if (lvl >= 4 && !this._hasFeds()) lvl = 3;
    return lvl;
  }
  _country() {
    const name = (this.g.world.plan || {}).country;
    if (this._cCache !== undefined && this._cCountry === name) return this._cCache;
    this._cCountry = name;
    return (this._cCache = countryOf(name));
  }
  // Does this theater's country field a real military? Median milBudget is ~41; a superpower is
  // 80-90, a failed state ~25. Above ~52 = there's an army that could roll in.
  _hasMilitary() { return ladderGatesFor(this._country()).military; }
  _hasFeds() { return ladderGatesFor(this._country()).feds; }
  _hasSanctioned() { return ladderGatesFor(this._country()).sanctioned; }
  villain() {
    let best = null, bh = THRESH - 0.01;
    for (const [f, h] of this.heat) if (f.alive !== undefined && h > bh && f.def && !f.def.police && this.g.entities.includes(f)) { bh = h; best = f; }
    return best;
  }

  // a blast just put civilians on the ground — the perpetrator owns that
  onCivHarm(src, n) {
    if (!this.active || !src || !src.def || src.def.police) return;
    this.heat.set(src, this.heatOf(src) + n * HEAT_CIV);
    this._lastHarmT = this.g.time;
    const lvl = this.wantedLevel(src);
    if (lvl > 0 && this.g.hud && this.g.isHuman(src)) this.g.hud.feed(`🚨 WANTED ${'★'.repeat(lvl)} — civilians harmed`, '#5aa0ff');
  }
  // KILLING A BADGE JUMPS THE LADDER — it does not tick it. One dead officer pushes you at least to
  // the next star, and every subsequent one compounds. (Robert's ruling: attacking police escalates
  // HARD.) A corrupt state can look away from a civilian call; it does NOT look away from its own
  // officers being killed — that overrides an "unanswered" dispatch on the spot.
  onCopDown(killer) {
    if (!this.active || !killer || !killer.def || killer.def.police) return;
    this.g.cityStats.cops = (this.g.cityStats.cops || 0) + 1;
    this._copsKilled = (this._copsKilled || 0) + 1;
    const cur = this.heatOf(killer);
    const jumpTo = cur < 90 ? 100 : cur < 160 ? 172 : cur < 240 ? 252 : cur < 340 ? 352 : cur < 460 ? 472 : cur + 60;   // straight to the next rung
    this.heat.set(killer, Math.max(cur, jumpTo) + this._copsKilled * 18);
    this._lastHarmT = this.g.time;
    if (this._respT >= 900) { this._respT = -1; this._announced = false; }   // the "unanswered" call is now answered
    if (this.g.hud && this.g.isHuman(killer)) this.g.hud.feed('🚔 OFFICER DOWN — the response hardens', '#ff6a5a');
    // OFFICER DOWN goes out over the air, and a nearby unit shouts it aloud (not on the radio —
    // the man next to him is yelling). Two registers, one event: that is what sells it.
    const at = killer && killer.pos;
    this._dispatch(at, true);
    const near = this.cops.find(f => f.alive);
    if (near) this._say(near.pos, 'panic', { radio: false, gain: 0.4, urgent: true, delay: 0.35 });
  }
  // HURTING an officer (not just killing) is a crime that escalates on its own — softer than a KO,
  // but it books heat and makes them radio for backup sooner.
  onCopHurt(src, amount) {
    if (!this.active || !src || !src.def || src.def.police || !(amount > 1)) return;
    this.heat.set(src, this.heatOf(src) + amount * 0.55);
    this._lastHarmT = this.g.time;
    if (this._respT >= 900) { this._respT = -1; this._announced = false; }        // shooting at cops answers the call too
    if (this.cops.length) this._reinforceT = Math.min(this._reinforceT, 3.5);     // "shots fired, requesting backup"
    // ...and it is AUDIBLE: one "shots fired" transmission per 2.5s however fast the hits land.
    if (this.cops.length && (this._fireCallT || 0) < this.g.time) {
      this._fireCallT = this.g.time + 2.5;
      this._dispatch(src.pos, true);
    }
  }

  // --- what the CROWD knows, for the pedestrian layer -------------------------------------
  // A PHONE POINTED AT YOU IS EVIDENCE. Called by filming civilians where vigilantism is banned:
  // the crowd itself is what escalates the response. Rate-limited so a dense street doesn't
  // stack heat instantly — it's a pressure, not a punishment.
  witnessed(x, z) {
    const V = this.villain(); if (!V) return;      // ⚠ villain() is a METHOD, not a field
    if ((this._witT || 0) > this.g.time) return;
    this._witT = this.g.time + 0.5;
    this.heat.set(V, (this.heat.get(V) || 0) + 1.6);
    this._witCount = (this._witCount || 0) + 1;
    if (this._witCount === 12 && this.g.hud) this.g.hud.feed('📱 They are filming you. The whole block is filming you.', '#9fb2c9');
  }

  // RESPONSE TIME = the city's safety index MET BY THE STATE THAT POLICES IT.
  // The city sheet says how safe this place is; the COUNTRY sheet says how good and how funded
  // its police are, and how corrupt. A well-funded force in a safe city is on you in seconds; a
  // broke, corrupt one in a rough city takes the better part of half a minute — and sometimes
  // doesn't come at all (see _corruptionIgnores).
  _responseDelay() {
    const plan = this.g.world.plan || {};
    const safety = plan.safety || 50;
    const C = countryOf(plan.country);
    let d = 26 - safety * 0.25;
    if (C) {
      d -= (C.lawEnforcement - 50) * 0.10;      // competence: a strong force is already close
      d -= (C.lawBudget - 50) * 0.06;           // money: cars, radios, coverage
      d += (50 - C.integrity) * 0.05;           // ⚠ integrity is HIGH=CLEAN — a bought force is in no hurry
    }
    return clamp(d, 4, 30);
  }
  // A BOUGHT FORCE lets some calls go unanswered entirely. ⚠ `integrity` is HIGH = CLEAN
  // (Norway 85, Somalia 20) — the sheet's column is named GovermentCorruption but the values are
  // an integrity index. Reading it the wrong way round makes Norway the crooked one.
  // Rolled ONCE per dispatch so a response is either coming or it isn't — never a flicker.
  _corruptionIgnores() {
    const C = countryOf((this.g.world.plan || {}).country);
    if (!C) return false;
    return Math.random() < clamp((55 - C.integrity) / 140, 0, 0.34);
  }

  update(dt) {
    const g = this.g;
    if (!this.active) return;
    // heat decays once the harming stops
    if (g.time - this._lastHarmT > 6) {
      for (const [f, h] of this.heat) { const nh = h - dt * 1.3; if (nh <= 0) this.heat.delete(f); else this.heat.set(f, nh); }
    }
    const V = this.villain();
    // escalation drama: each wanted star is NEWS ("SWAT AUTHORIZED" at three)
    if (V) {
      const lvl = this.wantedLevel(V);
      if (lvl > (this._lastLvl || 0) && this.cops.length > 0) {
        const esc = lvl >= 6 ? 'A SANCTIONED ASCENDANT IS CLEARED TO ENGAGE'
          : lvl >= 5 ? 'THE MILITARY IS DEPLOYING'
          : lvl >= 4 ? 'FEDERAL RESPONSE — AGENTS EN ROUTE'
          : lvl >= 3 ? 'SPECIAL RESPONSE AUTHORIZED' : 'ADDITIONAL UNITS EN ROUTE';
        if (g.hud) g.hud.announce(`WANTED ${'★'.repeat(lvl)}`, esc, lvl >= 6 ? '#ffd24a' : lvl >= 5 ? '#9bd07a' : lvl >= 4 ? '#cfd6e4' : '#5aa0ff');
        try { g.audio.siren(V.pos, Math.min(3, lvl)); } catch {}
        this._dispatch(V.pos, true);            // every new rung is called in over the air
        if (g.news && lvl >= 3) {
          const head = lvl >= 6 ? 'SANCTIONED ASCENDANT DEPLOYED — ' : lvl >= 5 ? 'MILITARY DEPLOYED — ' : lvl >= 4 ? 'FEDERAL AGENTS ON SCENE — ' : 'SWAT AUTHORIZED — ';
          g.news.highlight('police', head + g.world.districtAt(V.pos.x, V.pos.z), { dur: 2.4, priority: lvl >= 5 ? 3 : 2, focus: V.pos });
        }
      }
      this._lastLvl = lvl;
    } else this._lastLvl = 0;
    // cruiser drive-ins
    for (const c of this.cruisers) {
      if (!c.arrived) {
        c.t += dt / 1.7;
        const k = Math.min(1, c.t), e = 1 - Math.pow(1 - k, 3);
        c.grp.position.lerpVectors(c.from, c.to, e);
        if (k >= 1) { c.arrived = true; this._deploy(c, V); }
      }
      const blink = (g.time * 4) % 1 < 0.5;
      c.barR.material.emissiveIntensity = blink ? 2.6 : 0.3;
      c.barB.material.emissiveIntensity = blink ? 0.3 : 2.6;
      // THE WAIL: driven at full while rolling in, easing back once parked — the lights stay on
      // as long as there is a villain, and so does the note (loop law: set every live frame).
      if (c._siren) c._siren.set(c.arrived ? 0.55 : 1, c.grp.position);
    }
    this.cops = this.cops.filter(f => g.entities.includes(f));
    // no villain → units stand down (officers jog off and vanish)
    if (!V) {
      if (this._respT !== -1 || this.cops.length) {                 // the moment it goes quiet
        for (const c of this.cruisers) this._sirenOff(c);
        if (this.cops.length) this._dispatch(this.cops[0].pos, false);   // "all units, stand down"
      }
      this._respT = -1; this._announced = false; this._lswSent = false;
      for (const f of this.cops) if (!f._leaving) { f._leaving = true; f._leaveT = 3.2; }
      for (const f of this.cops) if (f._leaving && f.alive) { f._leaveT -= dt; if (f._leaveT <= 0) { f.noRespawn = true; f._remove = true; } }
      return;
    }
    // villain confirmed: the clock starts (speed = the city's safety index)
    for (const f of this.cops) { f._leaving = false; f.fixation = V; if (f.ai) f.ai.level = 0.85 + this.wantedLevel(V) * 0.15; }
    if (this._respT < 0 && this.cops.length === 0) {
      // CORRUPTION: in a bought state the call sometimes simply doesn't go out. Rolled ONCE so a
      // response is either coming or it isn't — the villain gets a long, quiet minute instead of
      // sirens that flicker on and off.
      if (this._corruptionIgnores()) {
        this._respT = 999; this._announced = true;
        if (g.hud) g.hud.feed('📻 The call goes unanswered.', '#8b8577');
        try { g.audio.squelch(V.pos, true); g.audio.squelch(V.pos, false); } catch (e) {}   // opened, closed, nothing said
        return;
      }
      this._respT = this._responseDelay();
      if (g.hud && !this._announced) {
        this._announced = true;
        g.hud.announce('🚨 WANTED', `${V.name} — units dispatched (ETA ${Math.round(this._respT)}s)`, '#5aa0ff');
        this._dispatch(V.pos, true);                                 // the call goes out over the air
        g.hud.feed(`🚨 ${V.name} flagged — response en route`, '#5aa0ff');
        if (g.news) g.news.highlight('police', 'POLICE DISPATCHED — ' + g.world.districtAt(V.pos.x, V.pos.z), { dur: 2.2, priority: 1, focus: V.pos });
        g.matchLog.push({ t: g.matchT, type: 'police', v: V.name, vid: V.def.id, at: g.world.districtAt(V.pos.x, V.pos.z) });
      }
    }
    if (this._respT > 0) { this._respT -= dt; if (this._respT <= 0) this._sendCruiser(V); }
    // reinforcements while the villain stays hot
    this._reinforceT -= dt;
    const cap = 2 + this.wantedLevel(V) * 2;
    if (this._reinforceT <= 0 && this.cops.filter(f => f.alive).length < Math.min(cap, 10) && this.cops.length > 0) {
      this._reinforceT = 16;
      this._sendCruiser(V);
    }
  }

  _sendCruiser(V) {
    const g = this.g, w = g.world, A = w.ARENA;
    // roll in from the nearest dry edge, stop short of the villain
    const edges = [[-A + 6, V.pos.z], [Math.min(A, w.waterX) - 10, V.pos.z], [V.pos.x, -A + 6], [V.pos.x, A - 6]]
      .filter(([x]) => x < w.waterX - 8);
    let from = edges[0], bd = 1e9;
    for (const e of edges) { const d = Math.hypot(e[0] - V.pos.x, e[1] - V.pos.z); if (d < bd) { bd = d; from = e; } }
    const dx = V.pos.x - from[0], dz = V.pos.z - from[1], dl = Math.hypot(dx, dz) || 1;
    const stop = new THREE.Vector3(V.pos.x - (dx / dl) * 44, 0, V.pos.z - (dz / dl) * 44);
    stop.x = clamp(stop.x, -A + 16, w.waterX - 14); stop.z = clamp(stop.z, -A + 16, A - 16);
    // the vehicle: black-and-white cruiser — or, at the federal rung, a BLACK SUBURBAN: all-black
    // body, tinted glass, low-profile dash strobes instead of a roof bar. Robert's ruling.
    const fed = V && this.wantedLevel(V) === 4;
    const grp = new THREE.Group();
    const paint = fed
      ? (w._fedMat || (w._fedMat = Object.assign(new THREE.MeshStandardMaterial({ color: '#0c0d11', roughness: 0.32, metalness: 0.6 }), { _shared: true })))
      : (w._cruiserMat || (w._cruiserMat = Object.assign(new THREE.MeshStandardMaterial({ color: '#e8e8ea', roughness: 0.4, metalness: 0.4 }), { _shared: true })));
    const body = new THREE.Mesh(w._carGeo, paint); body.castShadow = false; body.receiveShadow = true; grp.add(body);
    if (fed) body.scale.set(1.12, 1.18, 1.12);                       // a Suburban stands taller than a squad car
    if (!fed) {
      const hood = new THREE.Mesh(new THREE.BoxGeometry(7, 0.5, 9.7), Object.assign(new THREE.MeshStandardMaterial({ color: '#16181e', roughness: 0.6 }), {}));
      hood.position.set(8, 5.3, 0); grp.add(hood);
    }
    const barW = fed ? 1.3 : 2.6, barH = fed ? 0.5 : 1.1, barY = fed ? 6.4 : 9.1, barX = fed ? 9.2 : -1.6;
    const barR = new THREE.Mesh(new THREE.BoxGeometry(barW, barH, 3.6), new THREE.MeshStandardMaterial({ color: '#7a1616', emissive: '#ff2f2f', emissiveIntensity: 2 }));
    barR.position.set(barX, barY, -2.2); grp.add(barR);
    const barB = new THREE.Mesh(new THREE.BoxGeometry(barW, barH, 3.6), new THREE.MeshStandardMaterial({ color: '#16307a', emissive: '#3a7aff', emissiveIntensity: 0.3 }));
    barB.position.set(barX, barY, 2.2); grp.add(barB);
    grp.position.set(from[0], 0, from[1]);
    grp.rotation.y = Math.atan2(dx, dz) + Math.PI / 2;
    g.scene.add(grp);
    const cr = { grp, barR, barB, t: 0, from: new THREE.Vector3(from[0], 0, from[1]), to: stop, arrived: false };
    this.cruisers.push(cr);
    try { g.audio.siren({ x: from[0], z: from[1] }, 2); } catch {}   // the two-whoop announce...
    this._sirenOn(cr);                                              // ...then the wail holds until stand-down
    this._dispatch({ x: from[0], z: from[1] }, true);
  }
  _deploy(cruiser, V) {
    const g = this.g;
    if (!V || !this.active) return;
    const lvl = this.wantedLevel(V);
    if (lvl >= 6 && !this._lswSent) this._deploySanctioned(cruiser, V);
    const def = lvl >= 5 ? GUARD_DEF : lvl >= 4 ? FED_DEF : lvl >= 3 ? SWAT_DEF : COP_DEF;
    const n = lvl >= 5 ? 4 : lvl >= 3 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      this._unitNo++;
      const d = { ...def, name: `${def.name} ${String(this._unitNo).padStart(2, '0')}` };
      const f = g.addFighter(d, { team: 2, x: cruiser.grp.position.x + (i - n / 2) * 7, z: cruiser.grp.position.z + 6 });
      f.ai = new AI(f, 0.85); f.fixation = V; f.noRespawn = true;
      g.vfx.ring(f.pos.clone().setY(0.5), { color: '#5aa0ff', r0: 1, r1: 6, life: 0.3, flat: true, y: 0.5 });
    }
    this.cops.push(...g.entities.slice(-n));
    // the cruiser parks and becomes part of the street (destructible like any car)
    g.world.cars.push({ mesh: cruiser.grp, x: cruiser.grp.position.x, z: cruiser.grp.position.z, hp: 30, maxHp: 30, dead: false, paint: cruiser.grp.children[0].material });
    if (g.hud) g.hud.feed(`${lvl >= 5 ? '🪖 The Guard is' : lvl >= 4 ? '🕶 Federal agents are' : '🚔 Units'} on scene — ${V.name} is the target`, lvl >= 5 ? '#9bd07a' : lvl >= 4 ? '#cfd6e4' : '#5aa0ff');
    if (g.news) g.news.highlight('police', 'UNITS ON SCENE — ' + g.world.districtAt(cruiser.grp.position.x, cruiser.grp.position.z), { dur: 2.2, priority: 1, focus: cruiser.grp.position });
    // ON SCENE: the hailer order at the villain, then units calling their positions.
    this._order(cruiser.grp.position);
    this._say(cruiser.grp.position, 'radio', { delay: 0.9 });
  }

  // ★★★★★★ — THE STATE'S OWN SUPERWEAPON. In a country whose sheet says superweapons are a real,
  // legal institution (lswActivity + lswRegs), the last rung of the ladder is one of ours: a
  // REGISTERED Ascendant cleared to engage. WHICH one leans on the CITY's stats — a safe,
  // well-run theater rates a top-tier responder; a rough one gets whoever is posted nearby.
  // Deterministic per city (seeded by name), flagged police so the bout never enters the Elo
  // book, fixated on the villain like any badge. One per flag cycle — this is an event, not a wave.
  _deploySanctioned(cruiser, V) {
    const g = this.g;
    this._lswSent = true;
    const plan = g.world.plan || {};
    const safety = plan.safety || 50;
    const want = safety >= 60 ? ['Very High', 'Extreme', 'Cosmic'] : safety >= 35 ? ['High', 'Very High'] : ['Moderate', 'High'];
    let pool = ROSTER.filter(r => !r.police && !r.isDummy && want.includes(r.threat) && r.id !== (V.def && V.def.id));
    if (!pool.length) pool = ROSTER.filter(r => !r.police && !r.isDummy && r.id !== (V.def && V.def.id));
    if (!pool.length) return;
    let h = 7; for (const ch of String(plan.name || 'x')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const src = pool[h % pool.length];
    const d = { ...src, police: true };                          // registered responder — never books Elo
    const f = g.addFighter(d, { team: 2, x: cruiser.grp.position.x, z: cruiser.grp.position.z + 9 });
    f.ai = new AI(f, 1.6); f.fixation = V; f.noRespawn = true;
    this.cops.push(f);
    g.vfx.shockwave(f.pos.clone().setY(0.3), { color: '#ffd24a', radius: 26, power: 1.5 });
    try { g.heroYell(f, 1.3); } catch (err) {}
    if (g.hud) { g.hud.announce('⚡ SANCTIONED RESPONSE', `${src.name} is cleared to engage`, '#ffd24a'); g.hud.feed(`⚡ REGISTERED ASCENDANT ON SCENE — ${src.name}`, '#ffd24a'); }
    if (g.news) g.news.highlight('police', 'SANCTIONED ASCENDANT — ' + src.name + ' ENGAGES', { dur: 3, priority: 3, focus: f.pos });
    if (g.matchLog) g.matchLog.push({ t: g.matchT, type: 'police', v: V.name, vid: V.def.id, at: 'SANCTIONED RESPONSE — ' + src.name });
  }
}
