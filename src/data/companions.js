// =================================================================================================
// COMPANIONS — a breed is a set of APTITUDES on shared baselines, never a class with exclusive moves.
//
// Robert settled the design question himself: *"should all dogs be able to do all things to a certain
// degree, like a pitbull vs an aussiedoodle — dogs can bite and hear/smell much better than humans."*
//
// Yes, and it is the difference between a data model and a list of special cases. EVERY dog in this
// file can bite, scent, hear, guard, steady its handler and be trained. The SPECIES sets the
// baseline — and the dog baseline is already far past a human on the senses, which is the whole
// reason to have one. The BREED shifts the curve. Nothing here is exclusive to anything.
//
// ⚠ THE GATE (COMBAT_MANUAL §5) SAYS `if (breed === 'x')` IS ALWAYS WRONG, and this is the file
// where that would have been most tempting: five dogs, five jobs, five branches. Instead there are
// seven aptitude axes, one row per breed, and every behaviour reads an axis. Adding a sixth dog is a
// row. Adding a Belgian Malinois that is 90% of a Dutch Shepherd is a row with different numbers.
//
// ⚠ NUMBERS COME FROM THE DISTRIBUTION, NOT FROM MY THUMB. The project has made the hand-picked-rung
// mistake at least three times (university standing, the rank ladder's top end, the site survey —
// four passes on that one). `aptRank()` ranks a breed against every other breed on that axis and
// returns the percentile, so the WORDS on the sheet are occupied by construction.
// =================================================================================================

// ---- SPECIES BASELINES ------------------------------------------------------------------------
// ⚠ HUMAN IS IN THIS TABLE ON PURPOSE. "Dogs smell better than humans" has to be a MEASURED
// relationship in the data rather than a claim in a comment, or nobody can check it and the first
// person to tune scent will flatten it by accident. These are ratios against a trained adult human.
export const SPECIES = {
  human: { n: 'Human',  scent: 1,     hearing: 1,    bite: 1,    speed: 1,    stamina: 1,   size: 1 },
  // scent: dogs have ~40x the olfactory epithelium and ~50x the receptors; the working figure people
  // quote is 10,000-100,000x sensitivity. Compressed hard — a 10,000x radius is not a game.
  dog:   { n: 'Dog',    scent: 42,    hearing: 3.6,  bite: 2.1,  speed: 1.35, stamina: 1.5, size: 0.42 },
  // room for later without changing a line of engine code
  bird:  { n: 'Bird',   scent: 0.4,   hearing: 1.8,  bite: 0.3,  speed: 2.2,  stamina: 0.9, size: 0.06 },
  drone: { n: 'Drone',  scent: 0,     hearing: 0.6,  bite: 0.2,  speed: 1.9,  stamina: 2.2, size: 0.25 },
};

// ---- THE SEVEN AXES ---------------------------------------------------------------------------
// Every companion has all seven. A breed row is a multiplier on the species baseline, 0.4 – 1.8.
// ⚠ A ROW MUST NOT BE GOOD AT EVERYTHING. The sum of each row is checked by `verify()` — if one
// breed dominates every axis it is not a breed, it is a power fantasy, and every other row becomes
// a worse version of it.
export const AXES = {
  bite:      { n: 'Bite',        d: 'damage and hold strength' },
  scent:     { n: 'Scent',       d: 'finds what is hidden — mines, gas, drops, people' },
  hearing:   { n: 'Hearing',     d: 'range at which it notices a noise before you do' },
  guard:     { n: 'Guard',       d: 'how readily it puts itself between you and a threat' },
  steady:    { n: 'Steadiness',  d: 'what it does to your nerve — damps volatility, calms the resting temperament' },
  stamina:   { n: 'Stamina',     d: 'how long it can work before it needs to stop' },
  biddable:  { n: 'Biddability', d: 'how fast it learns — the TRAINING RATE, not a cap' },
};
export const AXIS_IDS = Object.keys(AXES);

// ---- THE BREEDS -------------------------------------------------------------------------------
// ⚠ FIVE DOGS, FIVE SHAPES, AND NOT ONE OF THEM IS LOCKED OUT OF ANYTHING. The bloodhound can be
// trained to bite; it will never bite like a Dutch shepherd, because training is capped by aptitude
// (see `ceiling()`). That is the mechanical form of "all dogs to a certain degree".
export const BREEDS = {
  dutch: {
    n: 'DUTCH SHEPHERD', species: 'dog', role: 'PATROL & APPREHENSION',
    d: 'The working military and police dog. Bites hard, holds, and takes direction under fire.',
    apt: { bite: 1.70, scent: 1.05, hearing: 1.15, guard: 1.75, steady: 0.75, stamina: 1.45, biddable: 1.55 },
    military: true,
  },
  bloodhound: {
    n: 'BLOODHOUND', species: 'dog', role: 'TRAILING',
    d: 'Follows a scent hours old and across water. Will not fight and does not pretend to.',
    apt: { bite: 0.55, scent: 1.80, hearing: 1.10, guard: 0.55, steady: 1.35, stamina: 1.30, biddable: 0.75 },
  },
  pit: {
    n: 'PIT BULL', species: 'dog', role: 'HOLD',
    d: 'The strongest hold in the group and, contrary to its reputation, the most people-social — '
     + 'temperament tests have it above the average dog on human sociability. Poor at distance work.',
    // ⚠ THE REPUTATION IS NOT THE DATA. Making this breed the "vicious" one would be authoring a
    // stereotype into a table that claims to be derived. High bite, high steadiness, low guard —
    // it is a poor watchdog precisely because it likes people.
    apt: { bite: 1.80, scent: 0.85, hearing: 0.90, guard: 0.85, steady: 1.30, stamina: 1.10, biddable: 1.05 },
  },
  labradoodle: {
    n: 'AUSTRALIAN LABRADOODLE', species: 'dog', role: 'ASSISTANCE',
    d: 'Bred for assistance work. Reads a person coming apart before they know it themselves.',
    apt: { bite: 0.50, scent: 1.05, hearing: 0.95, guard: 0.50, steady: 1.80, stamina: 0.95, biddable: 1.45 },
  },
  collie: {
    n: 'BORDER COLLIE', species: 'dog', role: 'SCOUT',
    d: 'Learns faster than anything else on four legs and hears you coming a street away.',
    apt: { bite: 0.60, scent: 1.00, hearing: 1.60, guard: 0.80, steady: 1.05, stamina: 1.55, biddable: 1.80 },
  },
};
export const BREED_IDS = Object.keys(BREEDS);

// ---- THE LADDER, RANKED AGAINST THE POPULATION ------------------------------------------------
// ⚠ RANK AGAINST EVERY REAL ROW, TAKE THE PERCENTILE. Hand-picking the edges of "POOR / FAIR /
// STRONG / EXCEPTIONAL" is how you end up with a word nobody can ever earn. Computed from the table,
// so adding a breed re-sorts the words automatically and every rung stays occupied.
export const APT_WORDS = ['POOR', 'FAIR', 'CAPABLE', 'STRONG', 'EXCEPTIONAL'];
export function aptRank(breedId, axis) {
  const all = BREED_IDS.map(b => BREEDS[b].apt[axis]).sort((a, b) => a - b);
  const v = BREEDS[breedId].apt[axis];
  const below = all.filter(x => x < v).length;
  return all.length > 1 ? below / (all.length - 1) : 0.5;      // 0..1 percentile
}
export const aptWord = (breedId, axis) =>
  APT_WORDS[Math.min(APT_WORDS.length - 1, Math.floor(aptRank(breedId, axis) * APT_WORDS.length))];

/** What this animal can actually do on an axis, in units relative to a trained human. */
export function raw(c, axis) {
  const B = BREEDS[c.breed]; if (!B) return 0;
  const S = SPECIES[B.species] || SPECIES.dog;
  const base = S[axis] != null ? S[axis] : 1;
  return base * B.apt[axis] * (1 + 0.55 * trained(c, axis));
}
/** How much better than a person, on this axis. The sentence the codex prints. */
export const vsHuman = (c, axis) => raw(c, axis) / (SPECIES.human[axis] != null ? SPECIES.human[axis] : 1);

// ---- TRAINING, ANCHORED TO TIME ---------------------------------------------------------------
// Robert: *"I want to implement dog training also, which we can anchor to time."*
//
// ⚠ TIME IS THE CAREER WEEK, WHICH IS ALREADY SEVEN REAL DAYS. `turnWeek` was fixed on 2026-07-26 to
// actually advance the calendar; before that a week moved a counter and nothing else, and anything
// anchored to time would have silently never progressed. Training rides the same turn.
//
// ⚠ APTITUDE IS A CEILING, BIDDABILITY IS A RATE, AND CONFLATING THEM IS THE WHOLE TRAP. A border
// collie learns to bite FASTER than a bloodhound and neither of them will ever bite like a Dutch
// shepherd. That is exactly "all dogs to a certain degree": nothing is forbidden, everything is
// bounded by what the animal is.
export const TRAIN_WEEKS = 1;                     // one focus per week
export const ceiling = (c, axis) => Math.min(1, (BREEDS[c.breed] ? BREEDS[c.breed].apt[axis] : 0) / 1.8);
export const trained = (c, axis) => Math.min(ceiling(c, axis), (c.train && c.train[axis]) || 0);

/**
 * One week of work on one axis. Returns what actually moved, which may be zero — a bloodhound put on
 * bite work for a year is still a bloodhound, and the screen should be able to say so.
 */
export function trainWeek(c, axis, weeks = 1) {
  if (!BREEDS[c.breed] || !AXES[axis]) return 0;
  c.train = c.train || {};
  const cap = ceiling(c, axis);
  const before = Math.min(cap, c.train[axis] || 0);
  // rate = biddability, with diminishing returns as it approaches its own ceiling
  const rate = 0.055 * BREEDS[c.breed].apt.biddable;
  let v = before;
  for (let i = 0; i < weeks; i++) v += rate * (1 - v / Math.max(0.0001, cap));
  c.train[axis] = Math.min(cap, v);
  c.weeks = (c.weeks || 0) + weeks;
  return +(c.train[axis] - before).toFixed(4);
}

// ---- THE BOND ---------------------------------------------------------------------------------
// ⚠ THE BOND IS THE PERSISTENCE, and it is what stops a companion being equipment. A dog that resets
// every match is a gadget with fur. Weeks together, fights survived together, and — the one that
// matters — times it was hurt working for you.
export const bondOf = (c) => Math.min(1, ((c.weeks || 0) * 0.014) + ((c.fights || 0) * 0.010) + ((c.saves || 0) * 0.05));
export const BOND_WORDS = ['NEW', 'WORKING', 'PAIRED', 'INSEPARABLE'];
export const bondWord = (c) => BOND_WORDS[Math.min(3, Math.floor(bondOf(c) * 4))];

/**
 * ⚠ EMOTIONAL SUPPORT IS NOT "+2 HAPPY" — IT CHANGES THE APPRAISAL. `psyche.js` runs
 * event → drives → emotion, and trauma already works by moving the RESTING temperament and the
 * VOLATILITY. A support animal moves the same two dials the other way, which is why it helps an
 * anxious personality enormously and a zealot barely, straight out of DRIVE_WEIGHTS, with no
 * per-personality compatibility table anywhere.
 *
 * Returns multipliers to fold into the handler's psyche: `vol` scales volatility, `rest` nudges the
 * resting temperament toward calm. Both scale with the BOND, so it is time together that helps.
 */
export function steadyEffect(c) {
  if (!c || !BREEDS[c.breed]) return { vol: 1, rest: 0, from: null };
  const s = raw(c, 'steady') / (SPECIES.dog.steady || 1);      // relative to an untrained average dog
  const k = Math.min(1, s * (0.45 + 0.55 * bondOf(c)));
  return { vol: 1 - 0.38 * k, rest: 0.30 * k, from: c.id || c.breed };
}

// ---- MAKING ONE -------------------------------------------------------------------------------
let _n = 0;
export function makeCompanion(breed, opts = {}) {
  if (!BREEDS[breed]) return null;
  return {
    id: opts.id || (breed + '-' + (++_n)),
    breed, species: BREEDS[breed].species,
    name: opts.name || null,
    // ⚠ ORIGIN IS THE EXISTING NINE, NOT A NEW LIST. A companion can be any of them — a robotic dog
    // is `origin: 'robotic'` and the hospital table already refuses to admit it, for free.
    origin: opts.origin || 'skilled',
    train: {}, weeks: 0, fights: 0, saves: 0,
    hp: Math.round(46 * (SPECIES[BREEDS[breed].species].size / 0.42)),
    handler: opts.handler || null,
  };
}

// ---- PERSISTENCE ------------------------------------------------------------------------------
const LS = 'threshold_companions_v1';
let _kennel = null;
export function kennel() {
  if (_kennel) return _kennel;
  try { _kennel = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { _kennel = null; }
  if (!_kennel || !Array.isArray(_kennel.dogs)) _kennel = { dogs: [], active: null };
  return _kennel;
}
export function saveKennel() { try { localStorage.setItem(LS, JSON.stringify(kennel())); } catch (e) {} return _kennel; }
export function adopt(breed, opts) {
  const c = makeCompanion(breed, opts); if (!c) return null;
  kennel().dogs.push(c); if (!_kennel.active) _kennel.active = c.id;
  saveKennel(); return c;
}
export const activeCompanion = () => { const k = kennel(); return k.dogs.find(d => d.id === k.active) || null; };
export const companionById = (id) => kennel().dogs.find(d => d.id === id) || null;
export function resetKennel() { _kennel = { dogs: [], active: null }; saveKennel(); return _kennel; }

// ---- SELF-CHECK -------------------------------------------------------------------------------
// ⚠ THE TABLE CHECKS ITSELF, because the failure mode here is silent: one breed quietly better at
// everything, or a word on the ladder nobody occupies. Both look fine in review and are dead on
// arrival in play.
export function verify() {
  const problems = [];
  // 1 · no breed dominates
  for (const a of BREED_IDS) {
    for (const b of BREED_IDS) {
      if (a === b) continue;
      if (AXIS_IDS.every(x => BREEDS[a].apt[x] >= BREEDS[b].apt[x])) problems.push(a + ' dominates ' + b);
    }
  }
  // 2 · every word on the ladder is occupied
  for (const axis of AXIS_IDS) {
    const words = new Set(BREED_IDS.map(b => aptWord(b, axis)));
    if (words.size < 3) problems.push('axis ' + axis + ' only spans ' + words.size + ' words');
  }
  // 3 · a dog is meaningfully better than a person where it should be
  const d = SPECIES.dog;
  if (!(d.scent > 10 && d.hearing > 2)) problems.push('dog senses are not superhuman in the table');
  // 4 · nothing is locked out — every breed can reach a nonzero ceiling on every axis
  for (const b of BREED_IDS) for (const axis of AXIS_IDS) {
    if (ceiling({ breed: b }, axis) <= 0) problems.push(b + ' is locked out of ' + axis);
  }
  return { breeds: BREED_IDS.length, axes: AXIS_IDS.length, problems };
}
