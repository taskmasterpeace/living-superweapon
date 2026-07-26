// THE PSYCHE — how a fighter feels, and who they are.
//
// Built from two of Robert's own sheets: `Emotions.xlsx` (the wheel, the value rules and the d100
// effect tables) and `Combat Compendium — PERSONALITY TARGET SELECTION` (twenty personality types,
// each with an AI targeting preference).
//
// ⚠ THE SHEETS ARE TURN-BASED AND THIS GAME IS NOT. The effect tables are written in the language
// of SHT — "skips next turn", "+20 initiative", "moves to later timeline position in FAST". Robert
// has already ruled on this directly: *"this game is real time... NOT turn based. SHT was not
// this."* So every effect is TRANSLATED, not transcribed, and the translation is written down next
// to it. A turn becomes a span of seconds; initiative becomes cooldown rate; "moves closer" becomes
// a change in what the AI wants rather than a teleport. Where a turn-based effect has no honest
// real-time reading it is dropped and said so, rather than faked.
//
// THE RULES, exactly as the sheet states them:
//   · every emotion carries a value 1–10
//   · the emotion with the biggest value is the MAIN emotion
//   · ties are broken by whichever reached that value LAST
//   · while the main emotion holds, the others decay toward 1
//   · a value at 10 that gains more subtracts the excess from the next-highest emotion
//   · two effects: an INSTANT ACTION when the emotion changes, and a MOOD that lasts while it holds
//   · each is chosen by a d100 (0–99), rolled once at the moment the emotion changes

// ---------------------------------------------------------------------------------------------
// THE WHEEL. Seven primaries, and the sub-emotion is the SHADE — it is what the caption says and
// what the face shows, while the primary is what the engine acts on. Sub-emotions are ordered from
// mildest to most extreme, so the intensity of a feeling picks the word for it.
export const WHEEL = {
  happy:     { name: 'HAPPY',     color: '#ffd24a', face: '^',
    subs: ['Content', 'Peaceful', 'Trusting', 'Accepted', 'Interested', 'Optimistic', 'Playful', 'Proud', 'Powerful'] },
  sad:       { name: 'SAD',       color: '#5f88b8', face: 'v',
    subs: ['Lonely', 'Vulnerable', 'Guilty', 'Hurt', 'Depressed', 'Despair'] },
  disgusted: { name: 'DISGUSTED', color: '#7fa05a', face: '~',
    subs: ['Disapproving', 'Disappointed', 'Repelled', 'Awful'] },
  angry:     { name: 'ANGRY',     color: '#c9482f', face: '>',
    subs: ['Critical', 'Distant', 'Let down', 'Humiliated', 'Frustrated', 'Bitter', 'Aggressive', 'Mad'] },
  fearful:   { name: 'FEARFUL',   color: '#b98fd0'.replace('b98fd0', '9aa8b8'), face: 'o',   // ⚠ never purple
    subs: ['Insecure', 'Anxious', 'Weak', 'Rejected', 'Threatened', 'Scared'] },
  bad:       { name: 'BAD',       color: '#8b8577', face: '-',
    subs: ['Bored', 'Busy', 'Tired', 'Stressed'] },
  surprised: { name: 'SURPRISED', color: '#7fe6ff', face: 'O',
    subs: ['Confused', 'Startled', 'Amazed', 'Excited'] },
};
export const EMOTIONS = Object.keys(WHEEL);

// the shade for a given intensity — 1 is the mildest word on the list, 10 the most extreme
export function shadeOf(emotion, value) {
  const w = WHEEL[emotion]; if (!w) return '';
  const i = Math.min(w.subs.length - 1, Math.max(0, Math.round(((value - 1) / 9) * (w.subs.length - 1))));
  return w.subs[i];
}

// ---------------------------------------------------------------------------------------------
// THE EFFECT TABLES. `roll` is the sheet's own d100 band. `fx` is the translation into this engine.
// A band with no honest real-time reading carries `fx: null` and a reason — an empty row in the
// sheet is not an excuse to invent a mechanic.
//
// INSTANT — fires once, the moment the emotion takes over.
export const INSTANT = {
  happy: [
    { roll: [0, 60],  id: 'refill',   text: 'A SECOND WIND!',      fx: { ki: 1.0 } },        // "refills his current energy"
    { roll: [61, 97], id: 'lift',     text: 'FEELING GOOD!',       fx: { ki: 0.35 } },
    { roll: [98, 99], id: 'aegis',    text: 'UNTOUCHABLE!',        fx: { shield: 1.0 } },    // "shield as 100% of max HP" — the shieldpack pool
  ],
  sad: [
    { roll: [0, 60],  id: 'drain',    text: 'WHAT’S THE POINT...', fx: { ki: -0.5 } },       // "loses one of his energies to half"
    { roll: [61, 97], id: 'falter',   text: 'CAN’T...',            fx: { stagger: 0.9 } },   // "skips next turn" → a real-time hesitation
    { roll: [98, 99], id: 'collapse', text: 'IT’S OVER.',          fx: { ki: -1.0, stagger: 1.6 } },
  ],
  disgusted: [
    { roll: [0, 60],  id: 'recoil',   text: 'GET AWAY FROM ME!',   fx: { range: +18 } },     // "moves backwards"
    { roll: [61, 97], id: 'exposed',  text: 'SICKENING!',          fx: { vuln: 1.35, vulnT: 6 } },
    { roll: [98, 99], id: 'openGuard',text: 'I CAN’T STAND IT!',   fx: { critTaken: 1, vulnT: 6 } },
  ],
  angry: [
    { roll: [0, 60],  id: 'close',    text: 'COME HERE!',          fx: { range: -22, aggro: +0.35 } },  // "moves closer to enemy"
    { roll: [61, 97], id: 'charge',   text: 'RAAAAGH!',            fx: { range: -30, aggro: +0.6, forceMelee: 4 } },
    { roll: [98, 99], id: 'berserk',  text: 'I’LL TEAR YOU APART!',fx: { range: -30, aggro: +0.8, dmg: 1.25, forceMelee: 6 } },
  ],
  fearful: [
    { roll: [0, 60],  id: 'scatter',  text: 'WHERE DO I GO?!',     fx: { erratic: 4 } },     // "moves to random position"
    { roll: [61, 97], id: 'backOff',  text: 'STAY BACK!',          fx: { range: +26, aggro: -0.35 } },
    { roll: [98, 99], id: 'flee',     text: 'I’M OUT OF HERE!',    fx: { flee: 7 } },        // "char leaves fight"
  ],
  bad: [
    { roll: [0, 60],  id: 'sluggish', text: 'I’M DONE...',         fx: { speed: 0.9 } },
    { roll: [61, 97], id: 'fumble',   text: 'NOT NOW...',          fx: { cd: 1.2 } },
    { roll: [98, 99], id: 'breakArm', text: 'IT BROKE!',           fx: { disarm: 1 } },      // "breaks his weapon"
  ],
  surprised: [
    { roll: [0, 60],  id: 'blink',    text: 'WHAT?!',              fx: { stagger: 0.4 } },
    { roll: [61, 97], id: 'jolt',     text: 'WHOA!',               fx: { evadeNow: 1 } },
    { roll: [98, 99], id: 'rush',     text: 'HERE WE GO!',         fx: { stagger: 0.5, haste: 5 } },  // "loses next turn, gains +3 turns"
  ],
};

// MOOD — rolled once when the emotion changes, and it holds for as long as the emotion does.
export const MOOD = {
  happy: [
    { roll: [0, 30],  id: 'quick',   text: 'ON THE FRONT FOOT',  fx: { cd: 0.82 } },        // "+20 initiative" → cooldowns
    { roll: [31, 60], id: 'nimble',  text: 'LIGHT ON HIS FEET',  fx: { evadeCd: 0.8 } },    // "+10 to dodge"
    { roll: [61, 80], id: 'sharp',   text: 'IN THE ZONE',        fx: { dmg: 1.08 } },
    { roll: [81, 97], id: 'certain', text: 'EVERYTHING LANDS',   fx: { dmg: 1.12, cd: 0.92 } },   // "all rolls +5"
    { roll: [98, 99], id: 'firstBlood', text: 'THE FIRST ONE HURTS', fx: { critNext: 1 } },
  ],
  sad: [
    { roll: [0, 30],  id: 'heavy',   text: 'HEAVY LIMBS',        fx: { speed: 0.92 } },
    { roll: [31, 60], id: 'slow',    text: 'SLOW TO ANSWER',     fx: { cd: 1.15 } },
    { roll: [61, 80], id: 'weakArm', text: 'NO STRENGTH IN IT',  fx: { dmg: 0.88 } },
    { roll: [81, 97], id: 'listless',text: 'BARELY THERE',       fx: { dmg: 0.85, speed: 0.9 } },
    { roll: [98, 99], id: 'hollow',  text: 'EMPTY',              fx: { dmg: 0.8, kiRegen: 0.7 } },
  ],
  disgusted: [
    { roll: [0, 30],  id: 'distance',text: 'KEEPING HIS DISTANCE', fx: { range: +12 } },
    { roll: [31, 60], id: 'curt',    text: 'NO PATIENCE',        fx: { cd: 0.94, dmg: 0.96 } },
    { roll: [61, 80], id: 'harsh',   text: 'CONTEMPTUOUS',       fx: { dmg: 1.06, guard: 0.9 } },
    { roll: [81, 97], id: 'cruel',   text: 'ENJOYING THIS',      fx: { dmg: 1.1, guard: 0.85 } },
    { roll: [98, 99], id: 'venom',   text: 'PURE SPITE',         fx: { dmg: 1.18, guard: 0.75 } },
  ],
  angry: [
    { roll: [0, 30],  id: 'hot',     text: 'SEEING RED',         fx: { dmg: 1.1, guard: 0.9, aggro: +0.2 } },
    { roll: [31, 60], id: 'reckless',text: 'NO GUARD AT ALL',    fx: { dmg: 1.16, guard: 0.75, aggro: +0.3 } },
    { roll: [61, 80], id: 'relentless', text: 'HE WON’T STOP',   fx: { cd: 0.85, aggro: +0.35 } },
    { roll: [81, 97], id: 'wild',    text: 'SWINGING WILD',      fx: { dmg: 1.22, guard: 0.6, spread: 1.3 } },
    { roll: [98, 99], id: 'fury',    text: 'BLIND FURY',         fx: { dmg: 1.32, guard: 0.5, speed: 1.08, aggro: +0.5 } },
  ],
  fearful: [
    { roll: [0, 30],  id: 'jumpy',   text: 'FLINCHING',          fx: { evadeCd: 0.75, dmg: 0.94 } },
    { roll: [31, 60], id: 'guarded', text: 'HIDING BEHIND IT',   fx: { guard: 1.2, aggro: -0.25 } },
    { roll: [61, 80], id: 'shaky',   text: 'SHAKING',            fx: { spread: 1.35, dmg: 0.9 } },
    { roll: [81, 97], id: 'cornered',text: 'CORNERED',           fx: { guard: 1.3, range: +18, aggro: -0.35 } },
    { roll: [98, 99], id: 'panic',   text: 'PANICKING',          fx: { speed: 1.12, dmg: 0.8, aggro: -0.5, erratic: 999 } },
  ],
  bad: [
    { roll: [0, 30],  id: 'weary',   text: 'RUNNING ON EMPTY',   fx: { kiRegen: 0.85 } },
    { roll: [31, 60], id: 'dull',    text: 'GOING THROUGH IT',   fx: { dmg: 0.94, cd: 1.08 } },
    { roll: [61, 80], id: 'sloppy',  text: 'SLOPPY',             fx: { spread: 1.25 } },
    { roll: [81, 97], id: 'spent',   text: 'SPENT',              fx: { speed: 0.88, cd: 1.15 } },
    { roll: [98, 99], id: 'checked', text: 'CHECKED OUT',        fx: { dmg: 0.85, speed: 0.85, aggro: -0.3 } },
  ],
  surprised: [
    { roll: [0, 30],  id: 'alert',   text: 'WIDE AWAKE',         fx: { evadeCd: 0.85 } },
    { roll: [31, 60], id: 'reading', text: 'READING IT NOW',     fx: { cd: 0.9 } },
    { roll: [61, 80], id: 'wired',   text: 'WIRED',              fx: { speed: 1.08, spread: 1.1 } },
    { roll: [81, 97], id: 'inspired',text: 'INSPIRED',           fx: { dmg: 1.1, cd: 0.88 } },
    { roll: [98, 99], id: 'transcend', text: 'SOMETHING CLICKED', fx: { dmg: 1.15, cd: 0.82, evadeCd: 0.8 } },
  ],
};

export function rollBand(table, roll) {
  for (const row of table) if (roll >= row.roll[0] && roll <= row.roll[1]) return row;
  return table[table.length - 1];
}


// =================================================================================================
// THE DRIVES — what a fighter WANTS, and therefore why they feel anything at all.
//
// Robert: "refine emotions and personalities, so that something DRIVES emotions."
//
// ⚠ THE MISSING MIDDLE LAYER. Until now an event added a fixed amount to fixed emotions —
// `hurtBad → angry 2.0, fearful 1.5` — so a coward and a zealot felt an identical punch identically
// and personality was only a targeting preference. That is a lookup table, not a psychology.
//
// What sits between an EVENT and a FEELING is an APPRAISAL: the event is measured against what the
// person wants. A punch is not intrinsically frightening or enraging; it is frightening if you
// want to be SAFE and enraging if you want to be DOMINANT, and the same punch does both in
// different proportions depending on who is being hit. That is where personality finally bites.
//
//   event → what it does to each DRIVE → the emotions that drive produces when served or thwarted
//
// Seven drives, chosen because each one produces a DIFFERENT emotion when it is thwarted — a drive
// that thwarts to the same feeling as another is not a separate drive.
export const DRIVES = {
  dominance: { name: 'DOMINANCE', want: 'to be the strongest thing in the room',
    served: { happy: 1.0 }, thwarted: { angry: 1.0, sad: 0.3 } },
  safety:    { name: 'SAFETY',    want: 'to not be hurt',
    served: { happy: 0.4 }, thwarted: { fearful: 1.0 } },
  duty:      { name: 'DUTY',      want: 'to keep people from being hurt',
    served: { happy: 0.7 }, thwarted: { sad: 0.9, angry: 0.6 } },
  glory:     { name: 'GLORY',     want: 'to be seen doing it',
    served: { happy: 1.0 }, thwarted: { sad: 0.7, disgusted: 0.4 } },
  vengeance: { name: 'VENGEANCE', want: 'to settle a score',
    served: { happy: 0.9 }, thwarted: { angry: 1.1 } },
  order:     { name: 'ORDER',     want: 'the plan to survive contact',
    served: { happy: 0.4 }, thwarted: { disgusted: 0.9, surprised: 0.5 } },
  purpose:   { name: 'PURPOSE',   want: 'something worth doing',
    served: { happy: 0.5 }, thwarted: { bad: 1.0 } },
};
export const DRIVE_KEYS = Object.keys(DRIVES);

// ⚠ AN APPRAISAL, NOT AN EMOTION. Each event says which drives it SERVES (+) or THWARTS (−) and by
// how much. The emotion that results is then computed per fighter from how much they care.
export const APPRAISALS = {
  hurtBad:      { safety: -1.0, dominance: -0.7, order: -0.3 },
  hurtLight:    { safety: -0.3, dominance: -0.25 },
  hitThem:      { dominance: 0.4, vengeance: 0.2 },
  bigHitThem:   { dominance: 0.9, glory: 0.5, vengeance: 0.5 },
  blocked:      { dominance: -0.5, order: -0.4 },
  guardBroken:  { safety: -0.8, dominance: -0.6 },
  kill:         { dominance: 1.2, vengeance: 1.0, glory: 0.8 },
  allyDown:     { duty: -1.2, safety: -0.4, vengeance: 0.8 },
  lowHealth:    { safety: -1.1, dominance: -0.4 },
  winning:      { dominance: 0.6, purpose: 0.3 },
  losing:       { dominance: -0.7, purpose: -0.3 },
  missed:       { order: -0.5, dominance: -0.2 },
  stunned:      { order: -1.0, safety: -0.6 },
  taunted:      { glory: -0.8, dominance: -0.6, vengeance: 0.6 },
  civilianHurt: { duty: -1.1, glory: -0.4 },
  crowdCheer:   { glory: 1.0, purpose: 0.4 },
  crowdFlees:   { glory: -0.6, duty: -0.5 },
  hunted:       { safety: -0.7, order: -0.6 },
  // ⚠ BOREDOM HAS TO ACTUALLY ARRIVE. At -0.5, scaled by care and volatility, twenty-four
  // seconds of standing in an empty street moved the needle by half a point — technically a
  // driver, practically nothing. Having no reason to be here is the strongest ambient pressure
  // in the game precisely because it is the one that never stops.
  idle:         { purpose: -0.7 },
  tierUp:       { dominance: 1.0, glory: 0.6, purpose: 0.5 },
  wounded:      { safety: -0.7, dominance: -0.5 },
  rivalHere:    { vengeance: 0.9, dominance: -0.3 },
  // ⚠ fear must LEAD here. At safety -0.8 an order-minded fighter came out DISGUSTED at being
  // surrounded rather than afraid of it, which is a reasonable sentence and the wrong feeling.
  outnumbered:  { safety: -1.3, order: -0.35 },
  // ⚠ a SLOW burn. At -1.6 a fighter standing in an empty street reached MAXIMUM boredom in
  // twenty-four seconds, which makes every idle character Stressed and the state meaningless.
  alone:        { purpose: -0.85, safety: 0.3 },
};

// ⚠ A PERSONALITY IS A SET OF DRIVE WEIGHTS, and that is the whole refinement. THE COWARD cares
// about safety far more than dominance, so the same punch that enrages THE ZEALOT frightens them —
// from one appraisal, with no per-personality event tables anywhere.
// `vol` is volatility: how hard feelings hit at all. `rest` is where the mood settles when nothing
// is happening, which is what gives a roster its range of resting temperaments.
export const DRIVE_WEIGHTS = {
  1:  { dominance: 1.0, glory: .6, safety: .3, vengeance: .5, duty: .3, order: .4, purpose: .5, vol: 1.0, rest: 'happy' },
  2:  { dominance: .5, glory: .2, safety: .5, vengeance: .2, duty: .6, order: 1.0, purpose: .6, vol: .7,  rest: 'bad' },
  3:  { dominance: .9, glory: .5, safety: .7, vengeance: .4, duty: .1, order: .3, purpose: .3, vol: 1.1, rest: 'disgusted' },
  4:  { dominance: .6, glory: .4, safety: .8, vengeance: .3, duty: .2, order: .5, purpose: .4, vol: .9,  rest: 'happy' },
  5:  { dominance: 1.1, glory: .9, safety: .3, vengeance: .5, duty: .3, order: .4, purpose: .6, vol: 1.1, rest: 'happy' },
  6:  { dominance: .4, glory: .3, safety: .4, vengeance: .5, duty: 1.2, order: .6, purpose: .8, vol: .9,  rest: 'bad' },
  7:  { dominance: .3, glory: .2, safety: 1.2, vengeance: .2, duty: .2, order: .5, purpose: .3, vol: 1.0, rest: 'fearful' },
  8:  { dominance: 1.2, glory: .5, safety: .1, vengeance: .7, duty: .4, order: .2, purpose: .9, vol: 1.3, rest: 'angry' },
  9:  { dominance: .7, glory: .5, safety: .5, vengeance: .4, duty: .3, order: .7, purpose: .5, vol: .8,  rest: 'happy' },
  10: { dominance: 1.0, glory: .4, safety: .3, vengeance: .8, duty: .1, order: .3, purpose: .6, vol: 1.2, rest: 'angry' },
  11: { dominance: 1.0, glory: .7, safety: .4, vengeance: 1.1, duty: .2, order: .3, purpose: .5, vol: 1.2, rest: 'angry' },
  12: { dominance: .2, glory: .2, safety: 1.4, vengeance: .1, duty: .3, order: .6, purpose: .3, vol: 1.2, rest: 'fearful' },
  13: { dominance: .9, glory: .3, safety: .3, vengeance: .9, duty: .1, order: .4, purpose: .5, vol: 1.1, rest: 'disgusted' },
  14: { dominance: .6, glory: .3, safety: .5, vengeance: .3, duty: .7, order: 1.2, purpose: .6, vol: .7,  rest: 'bad' },
  15: { dominance: .7, glory: .4, safety: .3, vengeance: 1.3, duty: .9, order: .3, purpose: .7, vol: 1.2, rest: 'angry' },
  16: { dominance: .6, glory: .3, safety: .4, vengeance: .4, duty: 1.3, order: .8, purpose: .7, vol: .8,  rest: 'bad' },
  17: { dominance: .7, glory: .2, safety: .5, vengeance: .4, duty: .3, order: .8, purpose: .5, vol: .7,  rest: 'bad' },
  18: { dominance: .8, glory: .8, safety: .2, vengeance: .5, duty: .1, order: .1, purpose: .4, vol: 1.5, rest: 'surprised' },
  19: { dominance: .6, glory: 1.0, safety: .3, vengeance: .3, duty: .2, order: .1, purpose: .5, vol: 1.4, rest: 'surprised' },
  20: { dominance: .6, glory: .2, safety: .8, vengeance: .5, duty: .1, order: .6, purpose: .4, vol: .8,  rest: 'bad' },
};
export const drivesFor = (n) => DRIVE_WEIGHTS[n] || DRIVE_WEIGHTS[2];

// THE APPRAISAL ITSELF. Returns emotion deltas for THIS fighter from THIS event — the one function
// that turns "what happened" into "what they feel", and the only place personality enters.
export function appraise(event, weights, scale = 1) {
  const ap = APPRAISALS[event];
  if (!ap) return null;
  const out = {};
  const vol = weights.vol == null ? 1 : weights.vol;
  for (const d in ap) {
    const care = weights[d] == null ? 0.5 : weights[d];
    const push = ap[d] * scale * care * vol;
    if (!push) continue;
    const table = push > 0 ? DRIVES[d].served : DRIVES[d].thwarted;
    const mag = Math.abs(push);
    for (const e in table) out[e] = (out[e] || 0) + table[e] * mag;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// WHAT MOVES A FEELING. The engine reports events; this decides what they do to the wheel. Values
// are in wheel-points, so a knockdown moves a fighter further than a scratch — the numbers are the
// design, which is why they are here and not scattered through combat code.
export const TRIGGERS = {
  hurtBad:      { angry: 2.0, fearful: 1.5, surprised: 0.5 },   // took a big hit
  hurtLight:    { angry: 0.8, bad: 0.3 },
  hitThem:      { happy: 0.7, angry: 0.3 },
  bigHitThem:   { happy: 1.6, surprised: 0.4 },
  blocked:      { angry: 0.6, disgusted: 0.4 },
  guardBroken:  { fearful: 1.4, angry: 0.8 },
  kill:         { happy: 3.0, powerfulShade: 1 },
  allyDown:     { sad: 2.4, angry: 1.6 },
  lowHealth:    { fearful: 2.2, sad: 0.8 },
  winning:      { happy: 1.2 },
  losing:       { sad: 1.0, fearful: 0.8 },
  missed:       { disgusted: 0.8, bad: 0.4 },
  stunned:      { surprised: 2.0, fearful: 1.0 },
  taunted:      { angry: 1.8, disgusted: 1.0 },
  civilianHurt: { sad: 1.2, disgusted: 1.6 },
  idle:         { bad: 0.5 },
  tierUp:       { happy: 2.6, surprised: 1.4 },
  wounded:      { fearful: 1.2, sad: 0.9 },
};

// ---------------------------------------------------------------------------------------------
// THE TWENTY PERSONALITIES, from the Combat Compendium sheet. The TARGET numbers are Robert's,
// straight off the row: 1 most health · 2 least health · 3 major threat · 4 minor threat · 5 random.
//
// ⚠ THE SHEET GIVES NUMBERS, NOT NAMES. The `name` and `blurb` below are provisional working
// labels chosen to match each type's targeting and temperament — one string each to change, and
// the NUMBER is the identity, so renaming can never break a save or a hero row.
export const TARGET_RULES = {
  1: { id: 'mostHealth',  label: 'THE BIGGEST',   desc: 'goes for whoever still has the most left' },
  2: { id: 'leastHealth', label: 'THE WEAKEST',   desc: 'finishes whoever is nearly down' },
  3: { id: 'majorThreat', label: 'THE DANGER',    desc: 'goes for whoever has done the most damage' },
  4: { id: 'minorThreat', label: 'THE EASIEST',   desc: 'picks off whoever has done the least' },
  5: { id: 'random',      label: 'WHOEVER',       desc: 'no pattern at all' },
};

const P = (n, target, name, blurb, bias) => ({ n, target, name, blurb, bias });
export const PERSONALITIES = [
  P(1,  1, 'THE CHALLENGER',  'Wants the hardest fight in the room and says so.',        { angry: 1.2, happy: 1.1, fearful: 0.7 }),
  P(2,  3, 'THE PROFESSIONAL','Neutralises the biggest gun first. No theatre.',          { bad: 1.1, angry: 0.8, fearful: 0.8 }),
  P(3,  4, 'THE BULLY',       'Finds the softest target and stays on it.',               { disgusted: 1.3, angry: 1.1, fearful: 1.2 }),
  P(4,  4, 'THE OPPORTUNIST', 'Takes the free hit every time.',                          { happy: 1.2, disgusted: 1.0 }),
  P(5,  1, 'THE PROVER',      'Only a win against the strongest counts.',                { happy: 1.3, angry: 1.1, sad: 0.8 }),
  P(6,  3, 'THE GUARDIAN',    'Stops whoever is doing the most harm.',                   { sad: 1.2, angry: 1.1, fearful: 0.8 }),
  P(7,  4, 'THE SCAVENGER',   'Never picks a fight it might lose.',                      { fearful: 1.3, bad: 1.1 }),
  P(8,  1, 'THE ZEALOT',      'Charges the centre of the strongest thing present.',      { angry: 1.4, fearful: 0.5 }),
  P(9,  2, 'THE CLOSER',      'Ends what someone else started.',                         { happy: 1.2, bad: 0.9 }),
  P(10, 2, 'THE PREDATOR',    'Smells blood and follows it.',                            { angry: 1.2, happy: 1.1, fearful: 0.7 }),
  P(11, 1, 'THE RIVAL',       'Fixates on the one worth beating.',                       { angry: 1.3, disgusted: 1.1 }),
  P(12, 4, 'THE COWARD',      'Anything but the dangerous one.',                         { fearful: 1.6, sad: 1.2, angry: 0.6 }),
  P(13, 2, 'THE MERCILESS',   'No such thing as a beaten opponent.',                     { disgusted: 1.3, angry: 1.2 }),
  P(14, 3, 'THE TACTICIAN',   'Reads the room and removes the problem.',                 { surprised: 0.7, bad: 1.1, angry: 0.8 }),
  P(15, 3, 'THE AVENGER',     'Whoever hurt someone gets it back, doubled.',             { angry: 1.5, sad: 1.2 }),
  P(16, 3, 'THE SENTINEL',    'Holds the line against whatever is hitting hardest.',     { fearful: 0.7, sad: 1.1, angry: 1.0 }),
  P(17, 2, 'THE FINISHER',    'Cleans up, quietly.',                                     { bad: 1.2, happy: 1.0 }),
  P(18, 5, 'THE MADMAN',      'There is no pattern. That is the pattern.',               { surprised: 1.4, angry: 1.3, fearful: 1.2 }),
  P(19, 5, 'THE WILDCARD',    'Whoever happens to be in front of them.',                 { surprised: 1.5, happy: 1.2 }),
  P(20, 2, 'THE VULTURE',     'Waits, then takes the one who cannot answer.',            { disgusted: 1.2, bad: 1.1, fearful: 1.0 }),
];

export const personalityOf = (n) => PERSONALITIES.find(p => p.n === n) || PERSONALITIES[0];

// ⚠ DERIVED, so a hero without a `personality:` row still HAS one and a custom built in ORIGIN gets
// a sane answer for free. The kit and the AI doctrine already say who someone is; this reads them.
export function derivePersonality(def) {
  if (def && def.personality) return personalityOf(def.personality);
  if (!def) return personalityOf(19);
  const st = (def.ai && def.ai.style) || '';
  const aggro = (def.ai && def.ai.aggro) != null ? def.ai.aggro : 0.6;
  const threat = def.threat || '';
  if (st === 'rusher' || st === 'bruiser') return personalityOf(aggro > 0.85 ? 8 : 1);
  if (st === 'grappler') return personalityOf(10);
  if (st === 'trickster') return personalityOf(19);
  if (st === 'artillery' || st === 'zoner') return personalityOf(14);
  if (st === 'summoner') return personalityOf(6);
  if (st === 'beamer') return personalityOf(threat === 'Extreme' || threat === 'Cosmic' ? 5 : 2);
  return personalityOf(aggro > 0.75 ? 15 : 2);
}
