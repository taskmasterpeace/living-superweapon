// MEDICINE — the things you cannot see, and the things nobody wants to talk about.
//
// Robert: "Medical diagnosis (unseen things) and mental health. Imagine a psychologist actually
// helps people — seeing a friend die in front of them may require some help. Build systems with
// depth that the player would feel."
//
// ⚠ THE WHOLE DESIGN IS IN THE WORD *UNSEEN*. A wound you can see is a number on a bar; you route
// around it. A condition you CANNOT see is different in kind: it is already costing you fights
// before you know it exists, and the moment a physician names it is a real reveal rather than a
// menu update. That gap — between the effect landing and the player learning why — is the only
// place this system can generate a feeling, so everything here is built to protect it.
//
// Three rules follow from that:
//
// ⚠ 1. A HIDDEN CONDITION STILL BITES. If undiagnosed conditions did nothing until you found them,
// the diagnosis would be the whole mechanic and the "unseen" part would be decoration. They apply
// their penalty from the moment they exist. The player's experience is "my best operator has been
// off for a month and I don't know why" — and that is the point.
//
// ⚠ 2. THE PSYCHOLOGIST ACTUALLY HELPS. Robert asked for this specifically, and it matters that
// treatment is not a tax. Sessions genuinely clear trauma, and a treated fighter comes back to
// their own resting temperament rather than to a permanently worse version of themselves. A system
// where care is futile is a system that says care is futile.
//
// ⚠ 3. IT REACHES THE FIGHT THROUGH SYSTEMS THAT EXIST. Physical conditions ride the sheet's own
// multipliers; psychological ones ride the PSYCHE layer's resting temperament and volatility
// (data/psyche.js), which already feeds mood, which already multiplies damage, speed and cooldowns.
// Nothing here invents a second combat pipeline.

import { psycheOf } from '../engine/psyche.js';

// -------------------------------------------------------------------------------------------------
// PHYSICAL CONDITIONS. `sev` 1–3. `find` is how hard it is to spot — a scan roll must beat it.
// `silent` means it produces NO outward sign at all until diagnosed: the fighter simply performs
// worse. Those are the ones that hurt.
export const CONDITIONS = [
  { id: 'internal',  n: 'INTERNAL BLEEDING',   find: 0.55, silent: true,  from: 'blunt',
    d: 'No wound to see. Stamina bleeds away and nobody can say why.',
    eff: { vigor: -0.18, kiRegen: -0.15 }, worsens: 0.22, weeks: 3 },
  { id: 'hairline',  n: 'HAIRLINE FRACTURE',   find: 0.40, silent: true,  from: 'blunt',
    d: 'It held. It will keep holding until the day it does not.',
    eff: { might: -0.12, speed: -0.06 }, worsens: 0.30, weeks: 4 },
  { id: 'concussion', n: 'CONCUSSION',         find: 0.35, silent: false, from: 'head',
    d: 'Slowed reactions and a headache they will not mention.',
    eff: { agility: -0.14, awareness: -0.20 }, worsens: 0.34, weeks: 2 },
  { id: 'cardiac',   n: 'CARDIAC STRAIN',      find: 0.70, silent: true,  from: 'exertion',
    d: 'The engine has been run past its limit too many times.',
    eff: { vigor: -0.22, kiRegen: -0.20 }, worsens: 0.18, weeks: 6 },
  { id: 'nerve',     n: 'NERVE DAMAGE',        find: 0.62, silent: true,  from: 'energy',
    d: 'A hand that is a fraction late. Enough to lose an exchange.',
    eff: { fighting: -0.16, agility: -0.10 }, worsens: 0.14, weeks: 8 },
  { id: 'toxicity',  n: 'BLOOD TOXICITY',      find: 0.48, silent: true,  from: 'toxic',
    d: 'Something is still in there from a fight three weeks ago.',
    eff: { vigor: -0.15, resolve: -0.12 }, worsens: 0.26, weeks: 5 },
  { id: 'scarring',  n: 'SCAR TISSUE',         find: 0.30, silent: false, from: 'slash',
    d: 'Healed badly. The range of motion never quite came back.',
    eff: { agility: -0.10 }, worsens: 0.05, weeks: 10, permanentAt: 3 },
];
export const conditionById = (id) => CONDITIONS.find((c) => c.id === id) || null;

// -------------------------------------------------------------------------------------------------
// PSYCHOLOGICAL CONDITIONS. These are the ones Robert named: what it costs to watch someone die.
// ⚠ `drives` and `rest` push the PSYCHE layer rather than combat stats directly — a traumatised
// fighter does not get a −10% damage debuff, they become someone who is angry or frightened by
// default and who is harder to settle. That reaches the fight through mood, which already
// multiplies everything, and it reads as a person rather than as a status effect.
export const TRAUMA = [
  { id: 'acute',    n: 'ACUTE STRESS',        find: 0.25, sessions: 2,
    d: 'Wired, sleepless, and certain they are fine.',
    rest: 'fearful', vol: 0.35, from: ['nearDeath', 'ambush'] },
  { id: 'grief',    n: 'GRIEF',               find: 0.30, sessions: 4,
    d: 'They keep working. That is usually how you tell.',
    rest: 'sad', vol: 0.15, from: ['allyKilled'] },
  { id: 'survivor', n: 'SURVIVOR GUILT',      find: 0.55, sessions: 5,
    d: 'They have decided, quietly, that it should have been them.',
    rest: 'sad', vol: 0.30, from: ['allyKilled', 'nearDeath'], silent: true },
  { id: 'fatigue',  n: 'COMBAT FATIGUE',      find: 0.35, sessions: 3,
    d: 'Too many weeks in the field without a week out of it.',
    rest: 'tired', vol: 0.20, from: ['overwork'] },
  { id: 'dissoc',   n: 'DISSOCIATION',        find: 0.65, sessions: 6,
    d: 'They describe their own fights in the third person.',
    rest: 'bad', vol: 0.45, from: ['killed', 'captivity'], silent: true },
  { id: 'nightmare', n: 'NIGHTMARES',         find: 0.40, sessions: 3,
    d: 'The medical wing keeps logging four-hour nights.',
    rest: 'fearful', vol: 0.25, from: ['nearDeath', 'captivity'] },
  { id: 'hardened', n: 'HARDENED',            find: 0.50, sessions: 4,
    d: 'Nothing reaches them any more. That is not the same as recovery.',
    rest: 'angry', vol: -0.20, from: ['killed', 'overwork'], silent: true },
];
export const traumaById = (id) => TRAUMA.find((t) => t.id === id) || null;

// what the world can do to a person — the events that generate trauma
export const TRAUMA_EVENTS = {
  allyKilled: { n: 'WATCHED A TEAMMATE DIE',   w: 1.00 },
  nearDeath:  { n: 'SHOULD NOT HAVE SURVIVED', w: 0.75 },
  killed:     { n: 'KILLED SOMEBODY',          w: 0.55 },
  captivity:  { n: 'WAS HELD',                 w: 0.85 },
  ambush:     { n: 'WAS AMBUSHED',             w: 0.45 },
  overwork:   { n: 'NO REST IN A LONG TIME',   w: 0.35 },
};

// -------------------------------------------------------------------------------------------------
// THE CHART — one per person, physical and psychological together, because a physician looking at
// somebody does not sort them into two piles.
const charts = new Map();
export function chartOf(id) {
  if (!charts.has(id)) charts.set(id, { id, phys: [], psych: [], seen: false, sessions: 0, log: [] });
  return charts.get(id);
}
export const allCharts = () => [...charts.values()];
export function resetCharts() { charts.clear(); }

// ⚠ HIDDEN ON ARRIVAL. Everything starts `known: false`, which is the entire point.
export function inflict(id, condId, severity = 1, note) {
  const ch = chartOf(id), def = conditionById(condId);
  if (!def) return null;
  const ex = ch.phys.find((c) => c.id === condId);
  if (ex) { ex.sev = Math.min(3, ex.sev + 1); return ex; }
  const c = { id: condId, sev: Math.max(1, Math.min(3, severity)), known: false, weeksLeft: def.weeks, note: note || '' };
  ch.phys.push(c);
  ch.log.push({ t: 'onset', id: condId, hidden: true });
  return c;
}

export function traumatise(id, eventKey, intensity = 1) {
  const ch = chartOf(id), ev = TRAUMA_EVENTS[eventKey];
  if (!ev) return null;
  // which trauma this event can produce — weighted by how hard it hit
  const pool = TRAUMA.filter((t) => t.from.includes(eventKey));
  if (!pool.length) return null;
  const roll = ev.w * intensity;
  const out = [];
  for (const t of pool) {
    if (Math.random() > roll * 0.55) continue;
    const ex = ch.psych.find((x) => x.id === t.id);
    if (ex) { ex.sev = Math.min(3, ex.sev + 1); out.push(ex); continue; }
    const c = { id: t.id, sev: 1, known: false, sessionsLeft: t.sessions, cause: eventKey };
    ch.psych.push(c); ch.log.push({ t: 'trauma', id: t.id, cause: eventKey, hidden: true });
    out.push(c);
  }
  return out;
}

// -------------------------------------------------------------------------------------------------
// DIAGNOSIS — the reveal.
// ⚠ A SCAN IS NOT A SWITCH. Quality decides what gets FOUND, so a cheap examination will genuinely
// miss the quiet, dangerous ones (`find` is highest on internal bleeding, cardiac strain, nerve
// damage, survivor guilt and dissociation — exactly the conditions that show no outward sign).
// Missing something has to be possible or a medical wing is a button that prints the truth.
export function examine(id, quality = 0.5, opts = {}) {
  const ch = chartOf(id);
  const found = [], missed = [];
  const psychOnly = !!opts.psychOnly, physOnly = !!opts.physOnly;
  if (!psychOnly) for (const c of ch.phys) {
    if (c.known) continue;
    const def = conditionById(c.id);
    // severity makes a thing easier to spot — a grade-3 fracture is not subtle
    if (quality + c.sev * 0.12 >= def.find) { c.known = true; found.push({ kind: 'phys', ...c, def }); }
    else missed.push({ kind: 'phys', id: c.id });
  }
  if (!physOnly) for (const c of ch.psych) {
    if (c.known) continue;
    const def = traumaById(c.id);
    if (quality + c.sev * 0.10 >= def.find) { c.known = true; found.push({ kind: 'psych', ...c, def }); }
    else missed.push({ kind: 'psych', id: c.id });
  }
  ch.seen = true;
  ch.log.push({ t: 'exam', quality, found: found.length, missed: missed.length });
  return { found, missed, quality };
}

// ⚠ THE HONEST READOUT. `missed` is a COUNT the player never sees — a screen that says "2 things
// were missed" defeats the entire mechanic. The chart shows what is KNOWN, and the only signal that
// something else is wrong is that the numbers do not add up.
export function chartReport(id) {
  const ch = chartOf(id);
  return {
    seen: ch.seen,
    physical: ch.phys.filter((c) => c.known).map((c) => ({ ...c, def: conditionById(c.id) })),
    psychological: ch.psych.filter((c) => c.known).map((c) => ({ ...c, def: traumaById(c.id) })),
    sessions: ch.sessions,
    // an honest hint WITHOUT naming it: a physician can tell somebody is not right.
    concern: ch.phys.some((c) => !c.known && c.sev >= 2) || ch.psych.some((c) => !c.known && c.sev >= 2)
      ? 'THE FILE DOES NOT EXPLAIN THE DROP IN PERFORMANCE' : null,
  };
}

// -------------------------------------------------------------------------------------------------
// WHAT IT COSTS YOU — applied whether or not anybody has noticed.
export function burden(id) {
  const ch = chartOf(id);
  const m = { might: 1, agility: 1, fighting: 1, vigor: 1, resolve: 1, awareness: 1, speed: 1, kiRegen: 1 };
  for (const c of ch.phys) {
    const def = conditionById(c.id); if (!def) continue;
    for (const k in def.eff) m[k] = (m[k] ?? 1) * (1 + def.eff[k] * c.sev);
  }
  for (const k in m) m[k] = Math.max(0.35, m[k]);
  return m;
}

// ⚠ TRAUMA REACHES THE FIGHT THROUGH THE PSYCHE, not through a stat block. It moves the resting
// temperament and the volatility, so a traumatised fighter behaves differently rather than simply
// hitting for less — and it decays back when they are treated.
export function applyPsyche(id, fighter) {
  const ch = chartOf(id);
  const P = fighter && psycheOf(fighter);
  if (!P || !ch.psych.length) return null;
  let vol = 0, rest = null, worst = 0;
  for (const c of ch.psych) {
    const def = traumaById(c.id); if (!def) continue;
    vol += def.vol * c.sev;
    if (c.sev > worst) { worst = c.sev; rest = def.rest; }
  }
  if (rest) P.rest = rest;
  P.vol = Math.max(0.2, (P.vol || 1) + vol);
  return { rest, vol };
}

// -------------------------------------------------------------------------------------------------
// TREATMENT — and it works.
// ⚠ Robert asked for a psychologist who ACTUALLY HELPS. A session clears real ground, and finishing
// a course removes the condition rather than capping it. A care system that only slows the decline
// would be saying something bleak that nobody asked it to say.
export function session(id, condId, skill = 1) {
  const ch = chartOf(id);
  const c = ch.psych.find((x) => x.id === condId);
  if (!c) return { ok: false, why: 'NOT ON THE CHART' };
  if (!c.known) return { ok: false, why: 'NOBODY HAS DIAGNOSED THIS — YOU CANNOT TREAT WHAT YOU HAVE NOT FOUND' };
  ch.sessions++;
  c.sessionsLeft -= skill;
  if (c.sessionsLeft <= 0) {
    ch.psych.splice(ch.psych.indexOf(c), 1);
    ch.log.push({ t: 'recovered', id: condId });
    return { ok: true, cleared: true, n: traumaById(condId).n };
  }
  if (c.sev > 1 && Math.random() < 0.4) c.sev--;
  return { ok: true, cleared: false, left: c.sessionsLeft, n: traumaById(condId).n };
}

export function treat(id, condId, weeks = 1, quality = 1) {
  const ch = chartOf(id);
  const c = ch.phys.find((x) => x.id === condId);
  if (!c) return { ok: false, why: 'NOT ON THE CHART' };
  if (!c.known) return { ok: false, why: 'UNDIAGNOSED — IT WILL KEEP GETTING WORSE' };
  c.weeksLeft -= weeks * quality;
  if (c.weeksLeft <= 0) {
    const def = conditionById(condId);
    // ⚠ some things do not fully go away, and the sheet says which
    if (def.permanentAt && c.sev >= def.permanentAt) {
      c.weeksLeft = 0; c.permanent = true;
      return { ok: true, cleared: false, permanent: true, n: def.n };
    }
    ch.phys.splice(ch.phys.indexOf(c), 1);
    ch.log.push({ t: 'healed', id: condId });
    return { ok: true, cleared: true, n: def.n };
  }
  return { ok: true, cleared: false, left: Math.ceil(c.weeksLeft) };
}

// ⚠ UNTREATED THINGS GET WORSE, and an undiagnosed thing is by definition untreated. This is the
// pressure that makes a medical wing worth its weeks — without it, ignoring the whole system is a
// valid strategy and the player never feels a thing.
export function weekPassed(id) {
  const ch = chartOf(id);
  const events = [];
  for (const c of ch.phys) {
    const def = conditionById(c.id); if (!def) continue;
    if (c.known) continue;                                  // being treated, or at least watched
    if (Math.random() < def.worsens && c.sev < 3) { c.sev++; events.push({ t: 'worsened', id: c.id, sev: c.sev }); }
  }
  for (const c of ch.psych) {
    if (c.known) continue;
    if (Math.random() < 0.18 && c.sev < 3) { c.sev++; events.push({ t: 'worsened', id: c.id, sev: c.sev }); }
  }
  return events;
}

// one line for a roster row — what a manager sees WITHOUT a chart in front of them
export function statusWord(id) {
  const ch = chartOf(id);
  const known = ch.phys.filter((c) => c.known).length + ch.psych.filter((c) => c.known).length;
  const hiddenBad = ch.phys.some((c) => !c.known && c.sev >= 2) || ch.psych.some((c) => !c.known && c.sev >= 2);
  if (known) return { word: 'UNDER TREATMENT', n: known, tone: 'warn' };
  // ⚠ THE ONLY TELL FOR SOMETHING HIDDEN IS PERFORMANCE, never a label saying "hidden condition".
  if (hiddenBad) return { word: 'OFF FORM', n: 0, tone: 'warn' };
  return { word: ch.seen ? 'CLEARED' : 'NOT EXAMINED', n: 0, tone: ch.seen ? 'ok' : 'dim' };
}
