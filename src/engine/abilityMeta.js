// TYPE_META — ONE registration point per power type (code review 2026-07-24, item 2).
//
// Adding a power type used to touch ~six sites: the TYPES function, `describeAbility` in the
// HUD, `powerNumbers` in the creator, the AI's HOLD set, the AI's holdTime ladder, and the
// creator catalog. Several of those failed SILENTLY — a type missing from HOLD simply never
// got held by a bot, and nothing said so. Everything a consumer needs about a type now hangs
// HERE, and the consumers derive from it.
//
// Fields:
//   hold   — the AI holds the button for this type (charge-likes, beams, cones…)
//   holdT  — [min, max] seconds a bot holds it, when hold is true
//   req    — numeric fields the type genuinely cannot work without
//   family — the readable grouping used by the visual contract and the codex
//   sustained — drives ki over time rather than a one-shot cost (documentation + AI budget)

export const TYPE_META = {
  melee:       { family: 'strike',    req: ['damage'],                   hold: false },
  rush:        { family: 'strike',    req: ['damage', 'hits'],           hold: false },
  projectile:  { family: 'shot',      req: ['damage', 'speed'],          hold: false },
  volley:      { family: 'shot',      req: ['damage', 'speed'],          hold: true,  holdT: [0.4, 1.1] },
  beam:        { family: 'beam',      req: ['dps'],                      hold: true,  holdT: [0.9, 1.8], sustained: true },
  cone:        { family: 'cone',      req: ['dps', 'range'],             hold: true,  holdT: [0.4, 1.1], sustained: true },
  charge:      { family: 'charge',    req: ['dmgMin', 'dmgMax'],         hold: true,  holdT: [0.9, 1.9], sustained: true },
  growingorb:  { family: 'charge',    req: ['minR', 'maxR'],             hold: true,  holdT: [1.1, 2.2], sustained: true },
  teleport:    { family: 'movement',  req: ['range'],                    hold: false },
  phase:       { family: 'defense',   req: [],                           hold: true,  holdT: [0.5, 1.2], sustained: true },
  naniteShield:{ family: 'defense',   req: [],                           hold: false },
  dash:        { family: 'movement',  req: [],                           hold: false },
  summon:      { family: 'summon',    req: [],                           hold: false },
  construct:   { family: 'summon',    req: [],                           hold: false },
  buff:        { family: 'buff',      req: ['dur'],                      hold: false },
  tentacle:    { family: 'grapple',   req: ['range', 'damage'],          hold: false },
  portal:      { family: 'movement',  req: [],                           hold: false },
  bow:         { family: 'shot',      req: ['dmgMin', 'dmgMax'],         hold: true,  holdT: [0.4, 0.95] },
  quiver:      { family: 'utility',   req: [],                           hold: false },
  rifle:       { family: 'shot',      req: ['damage', 'speed'],          hold: true,  holdT: [0.6, 1.5] },
  facebomb:    { family: 'charge',    req: ['dmgMin', 'dmgMax'],         hold: true,  holdT: [1.2, 2.2], sustained: true },
  nova:        { family: 'nova',      req: ['dmgMin', 'dmgMax'],         hold: true,  holdT: [1.4, 2.4], sustained: true },
  mindcontrol: { family: 'control',   req: ['range', 'dur'],             hold: false },
  grapple:     { family: 'movement',  req: ['range'],                    hold: false },
  mine:        { family: 'trap',      req: ['damage', 'blast'],          hold: false },
  lifedrain:   { family: 'beam',      req: ['dps', 'range'],             hold: true,  holdT: [0.8, 1.6], sustained: true },
  meteor:      { family: 'nova',      req: ['damage', 'count'],          hold: false },
  // ---- TIER THREE: each drives an engine SYSTEM (docs/POWERS_BRIEF.md Part Five) ----
  weather:     { family: 'world',     req: [],                           hold: false },
  size:        { family: 'transform', req: [],                           hold: false },
  timefield:   { family: 'world',     req: ['radius', 'dur'],            hold: false },
  invisible:   { family: 'defense',   req: ['dur'],                      hold: false },
  regen:       { family: 'defense',   req: [],                           hold: false },
  banish:      { family: 'control',   req: ['range', 'dur'],             hold: false },
  gravity:     { family: 'world',     req: ['radius', 'dur'],            hold: false },
  duplicate:   { family: 'summon',    req: ['dur'],                      hold: false },
  possess:     { family: 'control',   req: ['range', 'dur'],             hold: false },
  elastic:     { family: 'transform', req: ['dur'],                      hold: false },
  telekinesis: { family: 'grapple',   req: ['range'],                    hold: false },
  reshape:     { family: 'world',     req: [],                           hold: false },
  consume:     { family: 'control',   req: ['range'],                    hold: false },
  mimic:       { family: 'control',   req: ['range', 'dur'],             hold: false },
  mount:       { family: 'movement',  req: [],                           hold: false },
  dome:        { family: 'defense',   req: ['radius', 'dur'],            hold: false },
  vision:      { family: 'utility',   req: ['dur'],                      hold: false },
  wallcrawl:   { family: 'movement',  req: [],                           hold: false },
};

// The AI's two derived views. These used to be a hand-maintained Set and a chained ternary.
export const HOLD_TYPES = new Set(Object.keys(TYPE_META).filter(t => TYPE_META[t].hold));
export function holdTimeFor(type, rand) {
  const m = TYPE_META[type];
  const [a, b] = (m && m.holdT) || [0.4, 1.1];
  return rand(a, b);
}

// ---- THE ROSTER VALIDATOR (code review item 1) -------------------------------------------
// A typo'd ability type is a SILENT dead slot forever: runSlot looks the type up, finds
// nothing, and returns. Nothing throws, nothing logs, the button just does nothing for the
// life of the project. Same for a numeric field that lands as undefined or NaN — the ability
// fires and quietly does nothing, or does something absurd.
//
// Runs at dev boot over the whole roster (including installed customs) and reports every
// problem at once rather than dying on the first.
export function validateRoster(roster, TYPES) {
  const problems = [];
  const P = (id, slot, msg) => problems.push({ id, slot, msg });

  for (const def of roster || []) {
    if (!def || !def.id) { P('?', '-', 'hero has no id'); continue; }
    const abil = def.abilities || {};
    for (const key of Object.keys(abil)) {
      const a = abil[key];
      if (!a || typeof a !== 'object') { P(def.id, key, 'ability is not an object'); continue; }

      // 1. the type must be REGISTERED — this is the silent-dead-slot check
      if (!a.type) { P(def.id, key, 'no type'); continue; }
      if (TYPES && !TYPES[a.type]) { P(def.id, key, `unknown type "${a.type}" — slot is DEAD`); continue; }

      // 2. every numeric field present must be FINITE (catches undefined maths and NaN)
      for (const f of Object.keys(a)) {
        const v = a[f];
        if (typeof v === 'number' && !Number.isFinite(v)) P(def.id, key, `${f} is ${v}`);
      }

      // 3. the fields this type cannot work without
      const meta = TYPE_META[a.type];
      if (meta) {
        for (const f of meta.req) {
          if (!Number.isFinite(a[f])) P(def.id, key, `${a.type} requires numeric "${f}" (got ${a[f]})`);
        }
      } else if (TYPES && TYPES[a.type]) {
        P(def.id, key, `type "${a.type}" is registered but has no TYPE_META entry`);
      }

      // 4. the shared contract every slot has
      for (const f of ['cost', 'cd']) {
        if (a[f] != null && !Number.isFinite(a[f])) P(def.id, key, `${f} is not a number`);
      }
      if (!a.name) P(def.id, key, 'no name (the HUD chip will be blank)');
    }
  }
  return problems;
}

