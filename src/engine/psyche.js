// THE PSYCHE RUNTIME — how a fighter feels, minute to minute, and what it does to them.
//
// The DATA is in data/psyche.js: Robert's own emotion wheel, his value rules, his d100 effect
// tables and his twenty personality types. This file is the machine that runs them.
//
// HIS RULES, IMPLEMENTED LITERALLY:
//   · every emotion carries a value 1–10
//   · the emotion with the biggest value is the MAIN emotion
//   · ties break to whichever reached that value LAST
//   · while the main emotion holds, the others decay toward 1
//   · a value at 10 that gains more subtracts the excess from the next-highest emotion
//   · two effects — an INSTANT ACTION the moment the emotion changes, and a MOOD that lasts as
//     long as it holds — each chosen by one d100 roll at the moment of the change
//
// ⚠ AND THE TRANSLATION RULE. His tables are written for a turn-based game; this one is real time,
// which he has ruled on directly. So "skips next turn" is a stagger measured in seconds, "+20
// initiative" is a cooldown multiplier, "moves closer to the enemy" is a change in what the AI
// WANTS rather than a teleport. Every reading is written beside its row in data/psyche.js.
//
// ⚠ IT IS A MULTIPLIER LAYER, NOT A SECOND COMBAT SYSTEM. Mood reaches the fight through the
// choke points that already exist — takeDamage for damage, move() for speed, pay() for cooldowns —
// so an emotion can never do something the engine could not already do, and nothing else has to
// know emotions exist.
import { WHEEL, EMOTIONS, shadeOf, INSTANT, MOOD, TRIGGERS, rollBand, derivePersonality, TARGET_RULES,
         DRIVES, DRIVE_KEYS, APPRAISALS, drivesFor, appraise } from '../data/psyche.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class Psyche {
  constructor(fighter) {
    this.f = fighter;
    this.p = derivePersonality(fighter.def);
    // ⚠ WHAT THEY WANT. The drive weights are the personality — everything about how this fighter
    // feels follows from them, and nothing else consults the personality number again.
    this.w = drivesFor(this.p.n);
    this.v = {};
    for (const e of EMOTIONS) this.v[e] = 1;
    // a fighter opens the fight at their RESTING TEMPERAMENT, not at neutral: a coward is already
    // wary before anything happens, a zealot already hot. That is what makes a roster of twenty
    // personalities feel like twenty people rather than one person with different targeting.
    const seed = this.w.rest || 'happy';
    this.v[seed] = 3;
    this.rest = seed;
    this.main = seed;
    this.stamp = 0;                 // when the current main last took its value (ties break on this)
    this.mood = null;               // the rolled mood row, held while `main` holds
    this.instant = null;
    this.changed = 0;               // time of the last change, for the HUD and the balloon
    this._decay = 0;
  }

  // what this fighter wants, strongest first — the readout that explains every feeling they have
  get wants() {
    return DRIVE_KEYS.map(d => ({ d, name: DRIVES[d].name, want: DRIVES[d].want, care: this.w[d] == null ? 0.5 : this.w[d] }))
      .sort((a, b) => b.care - a.care);
  }
  get value() { return this.v[this.main] || 1; }
  get shade() { return shadeOf(this.main, this.value); }
  get colour() { return (WHEEL[this.main] || {}).color || '#8b8577'; }
  get label() { return (WHEEL[this.main] || {}).name || ''; }

  // ------------------------------------------------------------------------------- the wheel
  // ⚠ THE OVERFLOW RULE IS HIS, AND IT IS THE INTERESTING ONE: an emotion already at 10 that gains
  // more does not simply cap — the excess is taken OFF the next-highest emotion. Feeling one thing
  // very strongly actively erodes everything else, which is why a fighter who has been angry for a
  // while cannot easily become afraid.
  feel(trigger, scale = 1, t = 0) {
    // ⚠ AN EVENT IS APPRAISED, NOT LOOKED UP. This is the refinement: the same punch is measured
    // against what THIS fighter wants, so it frightens someone who wants to be safe and enrages
    // someone who wants to be dominant — from one table, with no per-personality event rows.
    // TRIGGERS remains as the fallback for anything without an appraisal written yet.
    const row = appraise(trigger, this.w, scale) || TRIGGERS[trigger];
    if (!row) return;
    const viaAppraisal = !!APPRAISALS[trigger];
    const bias = this.p.bias || {};
    for (const e of EMOTIONS) {
      const raw = row[e];
      if (!raw) continue;
      // the old bias only applies to the fallback path — the appraisal already accounts for who
      // they are, and applying both would count personality twice
      const amt = viaAppraisal ? raw * (scale === 1 ? 1 : 1) : raw * scale * (bias[e] || 1);
      const before = this.v[e];
      let next = before + amt;
      if (next > 10) {
        const excess = next - 10;
        next = 10;
        // take it off the next-highest OTHER emotion
        let victim = null, hi = -1;
        for (const o of EMOTIONS) if (o !== e && this.v[o] > hi) { hi = this.v[o]; victim = o; }
        if (victim) this.v[victim] = clamp(this.v[victim] - excess, 1, 10);
      }
      this.v[e] = clamp(next, 1, 10);
      if (this.v[e] > before) this._last = { e, t };
    }
    this._settle(t);
  }

  // decay: while the main emotion holds its value, everything else drains toward 1
  update(dt, t) {
    this._decay += dt;
    if (this._decay >= 1) {
      const step = 0.16 * this._decay;
      this._decay = 0;
      for (const e of EMOTIONS) if (e !== this.main) this.v[e] = Math.max(1, this.v[e] - step);
      // ⚠ AND THE MAIN DRAINS TOO, slowly — otherwise the first big feeling of a match is the only
      // one that ever happens, because nothing can climb past a value that never falls.
      this.v[this.main] = Math.max(1, this.v[this.main] - step * 0.35);
      // ⚠ AND IT DRIFTS HOME. Decaying everything toward 1 leaves a fighter emotionally blank
      // between fights; they should settle back to their own TEMPERAMENT, which is what makes a
      // personality readable when nothing is happening to them.
      if (this.rest && this.v[this.rest] < 2.6) this.v[this.rest] = Math.min(2.6, this.v[this.rest] + step * 0.7);
      this._settle(t);
    }
  }

  _settle(t) {
    let top = this.main, hi = this.v[this.main] || 1;
    for (const e of EMOTIONS) {
      const v = this.v[e];
      // ties break to whichever reached the value LAST — his rule, and it is what stops a fighter
      // flickering between two equal feelings
      if (v > hi + 1e-6 || (Math.abs(v - hi) < 1e-6 && this._last && this._last.e === e && e !== this.main && this._last.t >= (this.stamp || 0))) {
        top = e; hi = v;
      }
    }
    if (top !== this.main) this._become(top, t);
  }

  _become(e, t) {
    const from = this.main;
    this.main = e;
    this.stamp = t;
    this.changed = t;
    // ⚠ ONE d100 EACH, AT THE MOMENT OF THE CHANGE. Not per frame, not per hit — his sheet is
    // explicit that the mood is rolled once when the emotion changes and then held.
    const r1 = Math.floor(Math.random() * 100), r2 = Math.floor(Math.random() * 100);
    this.instant = rollBand(INSTANT[e] || INSTANT.happy, r1);
    this.mood = rollBand(MOOD[e] || MOOD.happy, r2);
    this.pendingInstant = this.instant;      // the engine applies it once and clears it
    this.from = from;
    return this.instant;
  }

  // ------------------------------------------------------------------------- what mood does
  // Every multiplier defaults to 1 / 0 so a fighter with no psyche behaves exactly as before.
  fx(key, dflt) {
    const m = this.mood && this.mood.fx;
    const v = m && m[key];
    return v == null ? dflt : v;
  }
  get dmgMult()   { return this.fx('dmg', 1); }
  get cdMult()    { return this.fx('cd', 1); }
  get speedMult() { return this.fx('speed', 1); }
  get guardMult() { return this.fx('guard', 1); }
  get evadeMult() { return this.fx('evadeCd', 1); }
  get spreadMult(){ return this.fx('spread', 1); }
  get kiMult()    { return this.fx('kiRegen', 1); }
  get aggroAdd()  { return this.fx('aggro', 0); }
  get rangeAdd()  { return this.fx('range', 0); }
}

// ---------------------------------------------------------------------------------------------
// THE ENGINE FACE. One accessor, so nothing else has to know whether a fighter has a psyche yet —
// dummies, sim constructs and the training bag never grow one.
export function psycheOf(f) {
  if (!f || !f.def || f.isDummy || f._labDummy || f.def.holo) return null;
  if (!f._psyche) f._psyche = new Psyche(f);
  return f._psyche;
}
export const moodMult = (f, key, dflt = 1) => {
  const p = f && f._psyche;
  return p ? p.fx(key, dflt) : dflt;
};

// Apply the one-shot instant action. ⚠ It goes through the engine's OWN verbs — ki, stagger, the
// shield pool, disarm — so an emotion can never do something a power could not already do.
export function applyInstant(game, f, row) {
  if (!f || !row || !row.fx) return;
  const x = row.fx;
  if (x.ki) {
    if (x.ki > 0) f.ki = Math.min(f.maxKi, f.ki + f.maxKi * x.ki);
    else f.ki = Math.max(0, f.ki + f.maxKi * x.ki);
  }
  if (x.shield) f._shieldHp = Math.max(f._shieldHp || 0, f.maxHp * x.shield);
  if (x.stagger) f.staggerT = Math.max(f.staggerT || 0, x.stagger / ((f.sheet && f.sheet.ccRecover) || 1));
  if (x.disarm && game.disarm) { try { game.disarm(f); } catch (e) {} }
  if (x.vuln) { f._moodVuln = x.vuln; f._moodVulnT = x.vulnT || 6; }
  if (x.forceMelee) f._moodMeleeT = x.forceMelee;
  if (x.erratic) f._moodErraticT = x.erratic;
  if (x.flee) f._moodFleeT = x.flee;
  if (x.haste) { f._moodHasteT = x.haste; }
  if (x.evadeNow && f.evadeCd != null) f.evadeCd = 0;
  if (x.critNext) f._moodCrit = 1;
}

// ---------------------------------------------------------------------------------------------
// PERSONALITY → WHO THEY GO FOR. Robert's Combat Compendium row, made live: 1 most health ·
// 2 least health · 3 major threat (most damage dealt) · 4 minor threat (least) · 5 random.
// ⚠ It picks from the foes the bot can ACTUALLY SEE — the honesty law outranks the personality,
// so a "goes for the weakest" fighter still cannot know who is weakest through a wall.
export function pickByPersonality(game, self, candidates) {
  if (!candidates || candidates.length < 2) return candidates && candidates[0];
  const p = (self._psyche && self._psyche.p) || derivePersonality(self.def);
  const dmgOf = (f) => (game.stats && game.stats.get && game.stats.get(f)) ? (game.stats.get(f).dmg || 0) : (f._dealt || 0);
  switch (p.target) {
    case 1: return candidates.reduce((a, b) => (b.hp > a.hp ? b : a));
    case 2: return candidates.reduce((a, b) => (b.hp < a.hp ? b : a));
    case 3: return candidates.reduce((a, b) => (dmgOf(b) > dmgOf(a) ? b : a));
    case 4: return candidates.reduce((a, b) => (dmgOf(b) < dmgOf(a) ? b : a));
    default: return candidates[(Math.random() * candidates.length) | 0];
  }
}

export { TARGET_RULES };
