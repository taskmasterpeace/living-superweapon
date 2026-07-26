// THE ORIGINS — what made a fighter, and what a hospital can do about it.
//
// From Robert's Combat Compendium: nine origins, each with its own relationship to medicine. This
// is the sheet's own table, transcribed rather than reinvented:
//
//   #  ORIGIN                  HEAL MAX   INTENSITY        EVERY    100% REQUIRES
//   1  Skilled Human            100%      Stamina Rank      12h     hospital status
//   2  Altered Human            100%      Stamina +4CS      24h     hospital status
//   3  Tech Enhancement          80%      Stamina +2CS      48h     ORIGIN research & engineering
//   4  Mutated Human             80%      Stamina +3CS      48h     ORIGIN research
//   5  Spiritual Enhancement     30%      Stamina −3CS      72h     ORIGIN investigation
//   6  Robotic                   20%      Stamina Rank      72h     ORIGIN research & engineering
//   7  Symbiotic                 50%      Stamina +2CS      48h     ORIGIN research time
//   8  Alien                      —       cannot be hospitalised
//   9  Unknown                    —       reserved
//
// ⚠ ONE AMBIGUITY, LEFT VISIBLE. In the sheet the intensity row and a following row of "+4CS /
// +2CS / +3CS" do not line up cleanly against the columns, so which of origins 2–4 owns which
// shift is a judgement. The reading above is the one that makes design sense — an ALTERED human
// heals fastest of all because that is what the alteration did — and it is flagged here rather
// than silently chosen. `HOSPITAL[n].intensityNote` carries the doubt into the game.
//
// ⚠ AND THE TIMES ARE UNBALANCED ON PURPOSE. Robert: "we haven't balanced or scaled time yet."
// The hours are the sheet's, `HOUR_SCALE` is the single knob that turns them into game time, and
// nothing else multiplies them anywhere.
import { RANKS } from './ranks.js';

// CS = COLUMN SHIFT — a step up or down the rank ladder we already have, which is exactly what the
// compendium means by it. One idea, one implementation.
export const shiftRank = (rank, cs) => Math.max(1, Math.min(RANKS.length - 1, Math.round(rank) + (cs || 0)));
export const rankLabel = (r) => (RANKS[Math.max(1, Math.min(RANKS.length - 1, Math.round(r)))] || {}).n || '—';

export const HOUR_SCALE = 1;     // the one knob. 1 = the sheet's hours, literally.

export const ORIGINS = [
  { n: 1, id: 'skilled',   name: 'SKILLED HUMAN',
    blurb: 'No powers. Everything they can do, they learned.',
    detail: 'Medicine understands them completely, which is the only advantage they get.' },
  { n: 2, id: 'altered',   name: 'ALTERED HUMAN',
    blurb: 'Something was done to a human body, and it took.',
    detail: 'Still human enough to treat, and the alteration does most of the work.' },
  { n: 3, id: 'tech',      name: 'TECH ENHANCEMENT',
    blurb: 'The power is equipment. Take it off and they are a person.',
    detail: 'A surgeon can close the wound. The hardware needs an engineer.' },
  { n: 4, id: 'mutated',   name: 'MUTATED HUMAN',
    blurb: 'Born different, or changed at the root.',
    detail: 'Every one is a new problem — the biology has to be studied before it can be fixed.' },
  { n: 5, id: 'spiritual', name: 'SPIRITUAL ENHANCEMENT',
    blurb: 'The power did not come from anywhere a scan can find.',
    detail: 'Hospitals barely help. What is hurt is not entirely the body.' },
  { n: 6, id: 'robotic',   name: 'ROBOTIC',
    blurb: 'A machine, whatever else it also is.',
    // ⚠ THEY ARE ADMITTED LIKE ANYONE ELSE — the low ceiling is not a refusal. A hospital stabilises
    // the frame, seals the housing and gets them upright; what it CANNOT do is fabricate the parts,
    // which is why the last 80% waits on engineering. (The 20% is Robert's own sheet — one number.)
    detail: 'A hospital will take them and get them running. Only a workshop can finish the job.' },
  { n: 7, id: 'symbiotic', name: 'SYMBIOTIC',
    blurb: 'Two things sharing one body.',
    detail: 'Treat the host and you may be fighting the passenger.' },
  { n: 8, id: 'alien',     name: 'ALIEN',
    blurb: 'Not from here, and not built like anything that is.',
    detail: 'No hospital on this world will admit them. They heal their own way or not at all.' },
  { n: 9, id: 'unknown',   name: 'UNKNOWN',
    blurb: 'Nobody has established what they are. Including them.',
    detail: 'Reserved. Treat as untreatable until somebody finds out.' },
];
export const originOf = (id) => ORIGINS.find(o => o.id === id || o.n === id) || ORIGINS[8];

// THE HOSPITAL TABLE — the sheet, as data.
export const HOSPITAL = {
  skilled:   { healMax: 1.00, cs:  0, hours: 12, requires: 'HOSPITAL STATUS',              canAdmit: true },
  altered:   { healMax: 1.00, cs: +4, hours: 24, requires: 'HOSPITAL STATUS',              canAdmit: true,
               intensityNote: 'sheet ambiguity: the +4/+2/+3 shifts do not line up cleanly against origins 2–4' },
  tech:      { healMax: 0.80, cs: +2, hours: 48, requires: 'ORIGIN RESEARCH & ENGINEERING', canAdmit: true },
  mutated:   { healMax: 0.80, cs: +3, hours: 48, requires: 'ORIGIN RESEARCH',               canAdmit: true },
  spiritual: { healMax: 0.30, cs: -3, hours: 72, requires: 'ORIGIN INVESTIGATION',          canAdmit: true },
  robotic:   { healMax: 0.20, cs:  0, hours: 72, requires: 'ORIGIN RESEARCH & ENGINEERING', canAdmit: true },
  symbiotic: { healMax: 0.50, cs: +2, hours: 48, requires: 'ORIGIN RESEARCH TIME',          canAdmit: true },
  alien:     { healMax: 0,    cs:  0, hours: 0,  requires: null, canAdmit: false, why: 'no hospital on this world will admit them' },
  unknown:   { healMax: 0,    cs:  0, hours: 0,  requires: null, canAdmit: false, why: 'nobody has established what they are' },
};

// ---------------------------------------------------------------------------------------------
// ⚠ EVERY FIGHTER HAS AN ORIGIN, DERIVED, so the roster is covered the day this file lands and a
// custom built in ORIGIN this afternoon is covered too. `def.origin` overrides — that is the escape
// hatch for the ones a rule cannot know (a magic-user who is also a soldier), and it is one string.
export function deriveOrigin(def) {
  if (!def) return originOf('unknown');
  if (def.origin) return originOf(def.origin);
  const blob = ((def.blurb || '') + ' ' + (def.title || '') + ' ' + (def.role || '')).toLowerCase();
  const has = (re) => new RegExp('\\b(' + re + ')', 'i').test(blob);

  if (def.metal || def.body === 'metal') return originOf('robotic');
  if (has('alien|xeno|offworld|not of this world|another world')) return originOf('alien');
  if (def.tentacles || has('symbiote|symbiotic|parasite|passenger|bonded')) return originOf('symbiotic');
  if (has('god|divine|spirit|ghost|soul|demon|magic|sorcer|mystic|arcane|ancestor|ritual')) return originOf('spiritual');
  if (def.phase && !has('suit|armor|armour|rig|tech')) return originOf('mutated');
  if (has('suit|armor|armour|rig|exo|powered|gadget|engineer|inventor|cyber|drone|reactor|tech')) return originOf('tech');
  if (has('mutat|born with|genetic|evolved|freak')) return originOf('mutated');
  if (has('experiment|serum|accident|irradiat|dosed|altered|treatment|injected')) return originOf('altered');
  // no powers worth the name, and a human ceiling: a trained person
  const str = def.strength || 5, ft = def.flightTier || 0;
  const abil = def.abilities ? Object.keys(def.abilities).length : 0;
  if (str <= 5 && ft === 0 && (def.items || def.weapon || abil <= 4)) return originOf('skilled');
  return originOf('altered');
}

// ---------------------------------------------------------------------------------------------
// THE RECOVERY PLAN. Given who you are and what is wrong, what a hospital can actually do.
//
// The medical ledger (data/rankings.js) already books injuries that outlive a match; this is the
// TREATMENT layer it never had. `bouts` become HOURS, which is only meaningful because the game
// now has a calendar (data/orbits.js) — a stay is a length of time you give up, not a button.
export function recoveryPlan(def, sheet, injury) {
  const o = deriveOrigin(def);
  const H = HOSPITAL[o.id] || HOSPITAL.unknown;
  // STAMINA is our VIGOR — the compendium's stat by another name, and the ladder is the same one.
  const vigor = (sheet && sheet.attrs && sheet.attrs.vigor) || Math.round(((def && def.hp) || 100) / 26) + 2;
  const eff = shiftRank(vigor, H.cs);
  // intensity: how much of the remaining damage one stay closes. A higher rank closes more.
  const perStay = H.canAdmit ? Math.max(0.08, Math.min(0.75, 0.06 * eff)) : 0;
  const hours = Math.round(H.hours * HOUR_SCALE);
  return {
    origin: o, table: H,
    canAdmit: H.canAdmit,
    why: H.why || null,
    healMax: H.healMax,
    stamina: vigor, staminaShift: H.cs, effectiveRank: eff, effectiveLabel: rankLabel(eff),
    perStay, hours,
    requires: H.requires,
    // how many stays to reach this origin's ceiling, and the wall clock that implies
    stays: H.canAdmit ? Math.max(1, Math.ceil(H.healMax / Math.max(0.01, perStay))) : 0,
    totalHours: H.canAdmit ? Math.max(1, Math.ceil(H.healMax / Math.max(0.01, perStay))) * hours : 0,
    injury: injury || null,
    // what an origin that CANNOT be admitted does instead — the interesting half of the table
    // what an origin that CANNOT be admitted does instead. ⚠ ROBOTIC IS NOT ON THIS LIST — they
    // are admitted like anyone else; they just leave with the frame sound and the rest pending.
    alternative: H.canAdmit ? null
      : (o.id === 'alien' ? 'time, and whatever they do in private' : 'nobody knows yet'),
    afterCare: H.canAdmit && H.healMax < 1
      ? (o.id === 'robotic' ? 'the balance needs a workshop and fabricated parts'
        : o.id === 'tech' ? 'the balance needs an engineer, not a surgeon'
        : o.id === 'spiritual' ? 'the balance is not entirely a body problem'
        : o.id === 'symbiotic' ? 'the balance depends on what the passenger wants'
        : 'the balance needs research on this specific biology') : null,
  };
}

// ---------------------------------------------------------------------------------------------
// ONE RULE OFF THE DAMAGE-TYPE TABLE, because it is the only one there that needs an origin to
// mean anything: "Electronic Bolt — additional damage to Robotic origins." Everything else in that
// sheet the engine already models (manual §5's type table), so this is the single genuine gap.
export const ELECTRONIC_VS_ROBOTIC = 1.6;
export function electronicMult(def) {
  return deriveOrigin(def).id === 'robotic' ? ELECTRONIC_VS_ROBOTIC : 1;
}
