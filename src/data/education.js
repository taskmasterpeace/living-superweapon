// EDUCATION — the twelve majors, the world's universities, and the four-stage pipeline.
//
// Robert's pipeline, and it is the right shape:
//
//     THEORY  →  RESEARCH  →  DESIGN  →  MANUFACTURE
//     university   the lab    drafting     workshop
//
// ⚠ THE FIRST STAGE IS THE ONE THAT MAKES THIS A GAME RATHER THAN A SHOP. "Without a graduate in a
// discipline, its research tree is INVISIBLE — not locked with a price tag, invisible. You don't
// know what you don't know." A greyed-out row with a cost on it is a shopping list; a tree that
// isn't there until someone studied it is a decision about who you send away and for how long.
//
// ⚠ TIME IS THE CURRENCY, NOT MONEY (Robert's first insistence). "Money is boring because you can
// always get more." Everything here is priced in WEEKS OF A PERSON, which the career already
// counts — a hero in a lecture hall is a hero not in a fight, and that cost is already expressible
// in the loop we have. Cash is a secondary gate, never the only one.
//
// ⚠ STAFF ARE THE ANSWER TO "WHO STUDIES?" (his second). If only heroes can learn, education
// competes head-on with fighting and loses every time. Researchers never throw a punch — which is
// what gives the base a POPULATION, makes living quarters mean something, and makes a raid that
// takes your only geneticist a catastrophe you feel for a season.
//
// Everything below reads the sheets we already baked. A university's standing is not authored; it
// is derived from the country's science and the city's own row, so it cannot lie and it moves if
// the sheet ever does.

import { cityList } from './cities.js';
import { countryOf, countryList } from './countries.js';

// -------------------------------------------------------------------------------------------------
// THE TWELVE MAJORS — his table, with the system each one plugs into named so a major can never
// become flavour text. If a major has no hook, it should not exist.
export const MAJORS = {
  medicine:    { name: 'Medicine',            careers: ['Field Medic', 'Trauma Surgeon', 'Epidemiologist'],   hooks: 'injury ledger · disease · the medical wing' },
  genetics:    { name: 'Genetics',            careers: ['Cloning Technician', 'Gene Therapist', 'Bioengineer'], hooks: 'the cloning column · power stability · the clone line' },
  aerospace:   { name: 'Aerospace',           careers: ['Aircraft Mechanic', 'Test Pilot', 'Orbital Engineer'], hooks: 'transports · solar craft · celestial craft' },
  materials:   { name: 'Materials',           careers: ['Armourer', 'Metallurgist', 'Fabricator'],            hooks: 'armour · weapons · containment · the weight ladder' },
  robotics:    { name: 'Robotics',            careers: ['Drone Wright', 'Cyberneticist', 'Automation Engineer'], hooks: 'drones · prosthetics · turrets · the training core' },
  physics:     { name: 'Applied Physics',     careers: ['Energy Systems', 'Beam Technician', 'Reactor Engineer'], hooks: 'energy weapons · shields · suppression' },
  dimensional: { name: 'Dimensional Physics', careers: ['Portal Technician', 'Rift Analyst', 'Chrononaut'],   hooks: 'portals · dimensions · the rewind' },
  chemistry:   { name: 'Chemistry',           careers: ['Pharmacologist', 'Demolitionist', 'Toxicologist'],   hooks: 'payloads · explosives · gas · the DoT types' },
  compsci:     { name: 'Computer Science',    careers: ['Intel Analyst', 'Signals', 'Countermeasures'],       hooks: 'investigation · detection · jamming' },
  law:         { name: 'Law & Governance',    careers: ['Registry Liaison', 'Diplomat', 'Prosecutor'],        hooks: 'legal status · heat · country access' },
  media:       { name: 'Media',               careers: ['Publicist', 'Broadcaster', 'Field Producer'],        hooks: 'the news layer · renown · media freedom' },
  // ⚠ KINESIOLOGY IS THE ONLY MAJOR THAT TOUCHES A HERO'S BODY, and it grants TALENTS rather than
  // attributes. That is Robert's balance rule made structural: study can buy you technique, and it
  // can never buy you raw Might — otherwise the whole rank ladder becomes a shopping trip.
  kinesiology: { name: 'Kinesiology',         careers: ['Trainer', 'Physiotherapist', 'Fight Analyst'],       hooks: 'talents · recovery · the training hall', grantsTalents: true },
};
export const MAJOR_IDS = Object.keys(MAJORS);

// What a country must have before a faculty can exist at all. `sci` is the science floor; some
// disciplines lean on a second column because that is what actually staffs them.
// ⚠ THIS IS THE RULE THAT MAKES THE WORLD MAP A DECISION: "a poor country can't teach you
// Dimensional Physics — the faculty doesn't exist."
const FACULTY_REQ = {
  medicine:    { sci: 30, health: 35 },
  genetics:    { sci: 62, health: 45 },
  aerospace:   { sci: 66, gdp: 45 },
  materials:   { sci: 38 },
  robotics:    { sci: 58, gdp: 40 },
  physics:     { sci: 55 },
  dimensional: { sci: 74, gdp: 60, flagshipOnly: true },   // see FLAGSHIP_ONLY below
  chemistry:   { sci: 40 },
  compsci:     { sci: 48, gdp: 35 },
  law:         { sci: 20 },
  media:       { sci: 25, press: 30 },        // a press school needs a press
  kinesiology: { sci: 25, health: 30 },
};

// ⚠ THE UGLY DISCIPLINES. "A country with high science and low integrity teaches you things nobody
// should know." A state that is capable but not clean will staff a faculty the treaty would refuse
// to certify — and that is the single best use of the two columns that were doing nothing.
const SHADOW = { genetics: true, dimensional: true, chemistry: true };
const isShadow = (mid, co) => !!SHADOW[mid] && co && co.integrity < 45 && co.science >= 55;

// -------------------------------------------------------------------------------------------------
// THE UNIVERSITIES. Not authored — DERIVED. A university exists where Robert's city sheet says
// 'Educational', which is 291 of the 1,050 cities, and its standing comes from the country's own
// science, wealth and health columns plus the city's size and safety.
const hash = (s) => { let h = 2166136261 >>> 0; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };

const NAME_FORMS = [
  (c) => `THE UNIVERSITY OF ${c}`,
  (c) => `${c} STATE UNIVERSITY`,
  (c) => `${c} INSTITUTE OF TECHNOLOGY`,
  (c) => `THE ${c} POLYTECHNIC`,
  (c) => `${c} NATIONAL UNIVERSITY`,
  (c) => `THE ${c} ACADEMY`,
  (c) => `${c} COLLEGE OF SCIENCES`,
];

// The standing ladder — a WORD, on the LeFevre/recovery pattern, never a bare score on a surface.
export const STANDING = [
  { min: 0.78, label: 'WORLD-LEADING', short: 'WORLD', mult: 1.55 },
  { min: 0.70, label: 'EMINENT',       short: 'EMIN',  mult: 1.34 },
  { min: 0.60, label: 'DISTINGUISHED', short: 'DIST',  mult: 1.18 },
  { min: 0.46, label: 'ESTABLISHED',   short: 'ESTB',  mult: 1.00 },
  { min: 0.32, label: 'REGIONAL',      short: 'REGN',  mult: 0.86 },
  { min: 0.00, label: 'PROVINCIAL',    short: 'PROV',  mult: 0.72 },
];
export const standingOf = (score) => STANDING.find((s) => score >= s.min) || STANDING[STANDING.length - 1];

// ⚠ RARE MUST NOT MEAN "ONE COUNTRY". At sci>=80 + gdp>=60 exactly ONE state on the sheet
// qualified for Dimensional Physics, so the rarest and most interesting discipline had a single
// national monopoly and "study abroad" had one possible answer. Scarcity now comes from a
// FLAGSHIP-ONLY rule instead of an ever-higher bar: a country gets at most one such faculty, at
// its largest educational city. Genuinely rare, and a real choice of where in the world to send
// someone for a year.
function facultyFor(co, score, isFlagship) {
  const out = [];
  if (!co) return out;
  for (const mid of MAJOR_IDS) {
    const r = FACULTY_REQ[mid];
    if (r.flagshipOnly && !isFlagship) continue;
    const shadow = isShadow(mid, co);
    // a shadow faculty relaxes the SCIENCE bar it would otherwise fail, never the others
    const sciBar = shadow ? r.sci - 14 : r.sci;
    if ((co.science || 0) < sciBar) continue;
    if (r.health && (co.healthcare || 0) < r.health) continue;
    if (r.gdp && (co.gdpPerCapita || 0) < r.gdp) continue;
    if (r.press && (co.mediaFreedom || 0) < r.press) continue;
    // a weak school does not offer every discipline it is technically eligible for
    if (score < 0.42 && (mid === 'dimensional' || mid === 'aerospace')) continue;
    out.push({ id: mid, shadow });
  }
  return out;
}

let _cache = null;

// The world's universities, ranked. Built once, from the sheets.
export function universities() {
  if (_cache) return _cache;
  // ⚠ GATHER BY COUNTRY FIRST. The first version scored each city independently, and because the
  // country's science is the dominant term that made the entire world top ten American — every one
  // of the USA's educational cities outscored every school on earth, because they all inherit the
  // same 90. Prestige does not work that way anywhere: a country has a FEW elite institutions and
  // a long tail, however rich it is. The k-th school in a country takes a concentration falloff,
  // which is what lets Japan, Germany and the UK back onto the board.
  const byCountry = new Map();
  for (const city of cityList()) {
    if (!(city.types || []).some((t) => /educat/i.test(t))) continue;
    const co = countryOf(city.country);
    if (!co) continue;                                   // ⚠ countryOf returns null for rows the sheet lacks
    if (!byCountry.has(city.country)) byCountry.set(city.country, { co, cities: [] });
    byCountry.get(city.country).cities.push(city);
  }

  const rows = [];
  const usedNames = new Set();
  for (const [, grp] of byCountry) {
    const co = grp.co;
    grp.cities.sort((a, b) => b.pop - a.pop);            // the flagship is the biggest city's school
    grp.cities.forEach((city, k) => {
      const h = hash(city.name + '|' + city.country);
      const sci = (co.science || 0) / 100, gdp = (co.gdpPerCapita || 0) / 100;
      const size = Math.min(1, Math.log10(Math.max(1, city.pop)) / 7.2);
      const safe = (city.safety || 0) / 100;
      const raw = sci * 0.46 + gdp * 0.18 + size * 0.20 + safe * 0.10 + ((h % 100) / 100) * 0.06;
      const concentration = 1 / (1 + k * 0.11);          // 1.00, 0.90, 0.82, 0.75 …
      const score = Math.max(0, Math.min(1, raw * concentration));
      // ⚠ NAMES MUST BE UNIQUE. Two 'Atlanta' rows in the sheet hash identically and produced two
      // schools with the same name at adjacent ranks, which reads as a duplication bug. Walk the
      // name forms until one is free, and only then fall back to disambiguating by country.
      let name = null;
      for (let t = 0; t < NAME_FORMS.length && !name; t++) {
        const cand = NAME_FORMS[(h + t) % NAME_FORMS.length](city.name.toUpperCase());
        if (!usedNames.has(cand)) name = cand;
      }
      if (!name) name = `${NAME_FORMS[h % NAME_FORMS.length](city.name.toUpperCase())} (${co.code || city.country})`;
      usedNames.add(name);
      rows.push({
        id: 'u' + h.toString(36) + k,
        name, flagship: k === 0,
        city: city.name, country: city.country, pop: city.pop,
        science: co.science || 0, integrity: co.integrity || 0, cloning: co.cloning || 'Banned',
        score: +score.toFixed(4), standing: standingOf(score),
        faculty: facultyFor(co, score, k === 0),
      });
    });
  }
  rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  rows.forEach((r, i) => { r.rank = i + 1; });
  _cache = rows;
  return rows;
}

export const universityById = (id) => universities().find((u) => u.id === id) || null;
export const universitiesTeaching = (mid) => universities().filter((u) => u.faculty.some((f) => f.id === mid));
export const bestFor = (mid, n = 10) => universitiesTeaching(mid).slice(0, n);

// How long a degree takes, in WEEKS of the person's time. A better school is faster, because the
// only thing you can buy with standing is somebody else's time.
export const BASE_WEEKS = { theory: 12 };
export function studyWeeks(uni, mid) {
  const f = uni && uni.faculty.find((x) => x.id === mid);
  if (!f) return null;                                   // the faculty does not exist here
  const w = BASE_WEEKS.theory / (uni.standing.mult || 1);
  return { weeks: Math.max(4, Math.round(w)), shadow: f.shadow };
}

// -------------------------------------------------------------------------------------------------
// CLONING — the uncomfortable one, and it should be.
// 93 countries ban it, 38 permit it, 37 regulate it. That split is Robert's own data, verified.
// ⚠ THE LAW IS THE COUNTRY'S, NOT THE PLAYER'S. Where you stand decides what you are allowed to do,
// which is what finally gives the world map teeth: a legal clone is a person coming back, and a
// state with high science and low integrity will do it for you without asking any questions.
export const CLONE_LAW = {
  Legal:     { ok: true,  ask: false, degrade: 0.06, weeks: 10, note: 'sanctioned — a licensed facility, a paper trail, a person who comes back' },
  Regulated: { ok: true,  ask: true,  degrade: 0.12, weeks: 16, note: 'permitted under review — the board must approve, and the board asks why' },
  Banned:    { ok: false, ask: false, degrade: 0.26, weeks: 22, note: 'prohibited — no lawful facility exists in this country' },
};

// Can this country do it, and what does it cost you to be the kind of person who asks?
export function cloneOption(country) {
  const co = typeof country === 'string' ? countryOf(country) : country;
  if (!co) return { available: false, why: 'NO REGISTRY DATA FOR THIS STATE' };
  const law = CLONE_LAW[co.cloning] || CLONE_LAW.Banned;
  const capable = (co.science || 0) >= 55;
  // ⚠ THE BLACK CLINIC. Capable + unclean will do it anyway. This is the story hook, and it is
  // deliberately WORSE at the job than a licensed lab — you get your friend back wrong.
  const black = !law.ok && capable && (co.integrity || 100) < 45;
  return {
    available: (law.ok && capable) || black,
    lawful: law.ok && capable,
    black,
    needsApproval: law.ask,
    weeks: law.weeks + (black ? 6 : 0),
    degrade: law.degrade + (black ? 0.14 : 0),           // how wrong they come back
    stance: co.cloning,
    why: !capable && law.ok ? 'LAWFUL, BUT NO FACILITY — THE SCIENCE BASE IS NOT THERE'
       : black ? 'PROHIBITED — BUT A CLINIC HERE WILL NOT ASK'
       : law.note,
  };
}

// The world, on this one question — used by the country-select screen and the desk.
export function cloneAtlas() {
  const out = { Legal: [], Regulated: [], Banned: [], black: [], capable: 0 };
  for (const co of countryList()) {
    (out[co.cloning] || out.Banned).push(co.name);
    const o = cloneOption(co);
    if (o.black) out.black.push(co.name);
    if (o.available) out.capable++;
  }
  return out;
}

// -------------------------------------------------------------------------------------------------
// THE RESEARCH CATALOGUE — Robert's sixty, verbatim, each tagged with the major that makes it
// VISIBLE. ⚠ `major` is not a price, it is a precondition for the row EXISTING: with no graduate in
// that discipline the entry is not shown greyed out with a cost, it is not shown at all. "You don't
// know what you don't know" is the entire reason the university stage is stage one.
//
// `w` is WEEKS OF A RESEARCHER — the real currency. `t` is the tier: 1 rides systems that already
// exist, 2 needs a new mechanic on existing bones, 3 is new architecture.
// ⚠ `base: true` marks the things the PLAYER DOES NOT HOLD — Robert: "with bases there are new
// items that the player doesn't hold but can do stuff." A carried item goes in the armoury and onto
// a fighter; a base item is installed in a facility and acts on its own. Two different nouns, and
// the manufacture stage has to know which one it is building.
export const RESEARCH = [
  // ---- TIER 1 — data entries and small hooks on the gear system that already exists
  { id: 'traumakit',    n: 'Trauma Kit',          major: 'medicine',    t: 1, w: 3,  d: 'heals a persistent injury one rung between bouts' },
  { id: 'coagulant',    n: 'Coagulant Injector',  major: 'medicine',    t: 1, w: 2,  d: 'clears bleed stacks instantly' },
  { id: 'antitoxin',    n: 'Antitoxin Shot',      major: 'chemistry',   t: 1, w: 2,  d: 'clears toxic damage over time' },
  { id: 'thermalgel',   n: 'Thermal Gel',         major: 'medicine',    t: 1, w: 2,  d: 'clears burn damage over time' },
  { id: 'stimshot',     n: 'Stim Shot',           major: 'chemistry',   t: 1, w: 4,  d: 'a short attribute surge, then a crash' },
  { id: 'frostsheath',  n: 'Frost Sheath',        major: 'materials',   t: 1, w: 3,  d: 'cold resistance for one bout' },
  { id: 'ablative',     n: 'Ablative Plate',      major: 'materials',   t: 1, w: 3,  d: 'flat armour, consumed on use' },
  { id: 'acidcoat',     n: 'Acid Coating',        major: 'materials',   t: 1, w: 4,  d: 'cancels the metal chassis acid weakness' },
  { id: 'dampener',     n: 'Kinetic Dampener',    major: 'physics',     t: 1, w: 4,  d: 'knockback resistance' },
  { id: 'grapnel2',     n: 'Grapnel Mk II',       major: 'robotics',    t: 1, w: 4,  d: 'longer reach, faster reel' },
  { id: 'jammer',       n: 'Signal Jammer',       major: 'compsci',     t: 1, w: 5,  d: 'delays the police response' },
  { id: 'scrubber',     n: 'Evidence Scrubber',   major: 'law',         t: 1, w: 4,  d: 'sheds heat after a fight' },
  { id: 'presscred',    n: 'Press Credential',    major: 'media',       t: 1, w: 3,  d: 'the news crew prioritises you' },
  { id: 'fieldstim',    n: 'Field Stim',          major: 'kinesiology', t: 1, w: 3,  d: 'faster energy recovery' },
  { id: 'gauntlets',    n: 'Weighted Gauntlets',  major: 'kinesiology', t: 1, w: 3,  d: 'more melee, less speed — a training item' },
  { id: 'monocle',      n: 'Targeting Monocle',   major: 'compsci',     t: 1, w: 4,  d: 'tighter spread' },
  { id: 'recoilcomp',   n: 'Recoil Compensator',  major: 'materials',   t: 1, w: 3,  d: 'ballistic accuracy' },
  { id: 'insulboots',   n: 'Insulated Boots',     major: 'robotics',    t: 1, w: 3,  d: 'shock immunity' },
  { id: 'rebreather',   n: 'Rebreather',          major: 'medicine',    t: 1, w: 3,  d: 'gas immunity' },
  { id: 'navbeacon',    n: 'Nav Beacon',          major: 'aerospace',   t: 1, w: 5,  d: 'cuts travel time between cities' },
  // ---- TIER 2 — a new mechanic, riding systems that exist
  { id: 'prosthetic',   n: 'Prosthetic Arm',      major: 'robotics',    t: 2, w: 10, d: 'an injury that resolved as hardware — it changes strength' },
  { id: 'neurallace',   n: 'Neural Lace',         major: 'robotics',    t: 2, w: 12, d: 'cooldown reduction, with feedback risk' },
  { id: 'clonevat',     n: 'Cloning Vat',         major: 'genetics',    t: 2, w: 16, d: 'return a dead hero — degraded', base: true, lawful: 'cloning' },
  { id: 'genestab',     n: 'Gene Stabiliser',     major: 'genetics',    t: 2, w: 12, d: 'halts power instability' },
  { id: 'vaccine',      n: 'Vaccine Batch',       major: 'medicine',    t: 2, w: 9,  d: 'cures a city outbreak — a mission type' },
  { id: 'surgerybay',   n: 'Field Surgery Bay',   major: 'medicine',    t: 2, w: 11, d: 'treat injuries mid-mission', base: true },
  { id: 'cuffs',        n: 'Suppressor Cuffs',    major: 'physics',     t: 2, w: 10, d: 'take villains alive — feeds detention' },
  { id: 'containment',  n: 'Containment Cell',    major: 'materials',   t: 2, w: 13, d: 'holds one specific power type', base: true },
  { id: 'droneswarm',   n: 'Drone Swarm',         major: 'robotics',    t: 2, w: 11, d: 'deployable scouts with real vision' },
  { id: 'repairdrone',  n: 'Repair Drone',        major: 'aerospace',   t: 2, w: 9,  d: 'field repair for vehicles' },
  { id: 'transport',    n: 'The Transport',       major: 'aerospace',   t: 2, w: 14, d: 'non-fliers can leave the city', base: true },
  { id: 'vtol',         n: 'VTOL Gunship',        major: 'aerospace',   t: 2, w: 18, d: 'armed transport, fewer seats', base: true },
  { id: 'solarcraft',   n: 'Solar Craft',         major: 'aerospace',   t: 2, w: 22, d: 'Mars, the Moon — in-system', base: true },
  { id: 'reactive',     n: 'Reactive Armour',     major: 'materials',   t: 2, w: 13, d: 'adapts to the last damage type that hurt you' },
  { id: 'shieldproj',   n: 'Shield Projector',    major: 'physics',     t: 2, w: 11, d: 'deployable cover in open ground' },
  { id: 'emp',          n: 'EMP Charge',          major: 'robotics',    t: 2, w: 8,  d: 'devastating to a metal chassis, useless on flesh' },
  { id: 'portalanchor', n: 'Portal Anchor',       major: 'dimensional', t: 2, w: 20, d: 'a fixed pair between two cities', base: true },
  { id: 'chronobuoy',   n: 'Chrono Buoy',         major: 'dimensional', t: 2, w: 22, d: 'the rewind point', base: true },
  { id: 'forensickit',  n: 'Forensic Kit',        major: 'law',         t: 2, w: 8,  d: 'investigation missions' },
  { id: 'broadcastrig', n: 'Broadcast Rig',       major: 'media',       t: 2, w: 12, d: 'you control the story instead of KMK 9', base: true },
  // ---- TIER 3 — new architecture, campaign-shaping
  { id: 'celestial',    n: 'Celestial Craft',     major: 'aerospace',   t: 3, w: 40, d: 'interstellar — the heliopause becomes a destination', base: true },
  { id: 'dimgate',      n: 'The Dimensional Gate', major: 'dimensional', t: 3, w: 44, d: 'the multiplayer door', base: true },
  { id: 'timeanchor',   n: 'Time Anchor',         major: 'dimensional', t: 3, w: 42, d: 'the rewind, as a built facility', base: true },
  { id: 'fullchassis',  n: 'Full Chassis',        major: 'robotics',    t: 3, w: 34, d: 'rebuild a hero as a machine — gains and losses' },
  { id: 'cureprogram',  n: 'Cure Program',        major: 'medicine',    t: 3, w: 38, d: 'eradicate a disease worldwide over a campaign', base: true },
  { id: 'transplant',   n: 'Power Transplant',    major: 'genetics',    t: 3, w: 36, d: 'move a power between heroes', base: true },
  { id: 'cloneline',    n: 'The Clone Line',      major: 'genetics',    t: 3, w: 40, d: 'a roster of your own variants', base: true, lawful: 'cloning' },
  { id: 'terraform',    n: 'Terraform Module',    major: 'materials',   t: 3, w: 38, d: 'permanently alter a city terrain', base: true },
  { id: 'orbital',      n: 'Orbital Platform',    major: 'aerospace',   t: 3, w: 46, d: 'a base in orbit', base: true },
  { id: 'suppression',  n: 'Suppression Field',   major: 'physics',     t: 3, w: 40, d: 'a city-wide anti-power zone', base: true },
  { id: 'sparringcore', n: 'Adaptive Sparring Core', major: 'compsci',  t: 3, w: 30, d: 'the training robot that learns your habits', base: true },
  { id: 'responseunit', n: 'Response Unit',       major: 'robotics',    t: 3, w: 42, d: 'your own sanctioned superweapon', base: true },
  { id: 'uplink',       n: 'Registry Uplink',     major: 'law',         t: 3, w: 32, d: 'change your legal status in a country', base: true },
  { id: 'nanite',       n: 'Nanite Swarm',        major: 'medicine',    t: 3, w: 40, d: 'true regeneration' },
  { id: 'archive',      n: 'The Archive',         major: null,          t: 3, w: 36, d: 'research survives into the next campaign', base: true },
  { id: 'weatherarray', n: 'Weather Array',       major: 'physics',     t: 3, w: 38, d: 'weather as infrastructure, not a power', base: true },
  { id: 'salvagerig',   n: 'Deep Salvage Rig',    major: 'materials',   t: 3, w: 34, d: 'the trench becomes harvestable', base: true },
  { id: 'psiscreen',    n: 'Psi Screen',          major: 'medicine',    t: 3, w: 32, d: 'mind control immunity' },
  { id: 'memoryrecon',  n: 'Memory Reconstruction', major: 'dimensional', t: 3, w: 40, d: 'recover what a rewind erased', base: true },
  { id: 'foundry',      n: 'The Foundry',         major: 'materials',   t: 3, w: 44, d: 'manufacture without a supply chain', base: true },
];

export const researchById = (id) => RESEARCH.find((r) => r.id === id) || null;

// ⚠ VISIBILITY, NOT AFFORDABILITY. This is the function that makes stage one matter: pass the set
// of majors your organisation actually holds a graduate in, and it returns what you can even SEE.
// A row you have no graduate for is ABSENT from the return value, never returned-and-flagged —
// because the moment a caller can see the row it will render it greyed out with a price, and that
// is a shopping list again.
export function visibleResearch(heldMajors) {
  const held = new Set(heldMajors || []);
  return RESEARCH.filter((r) => r.major === null || held.has(r.major));
}

// What a discipline opens up — for the "is this worth a year of somebody's life?" decision.
export function unlockedBy(mid) { return RESEARCH.filter((r) => r.major === mid); }

// ⚠ SOME RESEARCH IS ILLEGAL WHERE YOU STAND. `lawful: 'cloning'` rows read the host country's own
// column, so a clone vat is a different proposition in Seoul than it is in Oslo.
export function researchLegal(row, country) {
  if (!row || !row.lawful) return { ok: true };
  if (row.lawful === 'cloning') {
    const o = cloneOption(country);
    return { ok: o.available, lawful: o.lawful, black: o.black, why: o.why, weeks: o.weeks };
  }
  return { ok: true };
}

// THE FOUR STAGES, named once so no surface invents its own vocabulary.
export const STAGES = [
  { id: 'theory',      n: 'THEORY',      where: 'the university',     d: 'somebody has to know the field' },
  { id: 'research',    n: 'RESEARCH',    where: 'the lab',            d: 'knowledge and salvage become a blueprint' },
  { id: 'design',      n: 'DESIGN',      where: 'the drafting table', d: 'a blueprint is a family — this is where you choose' },
  { id: 'manufacture', n: 'MANUFACTURE', where: 'the workshop',       d: 'a spec and materials become a thing you own' },
];

// THE DESIGN STAGE'S AXES. Robert: "that's the weight you were after — not a bigger number, a
// choice you can regret." Every one of these is already a LIVE RULE in the engine, which is what
// stops them being decoration: the resistance table, the lift ladder, weaponProficiency, the burst
// window. A design choice here is a real commitment because the engine already enforces it.
export const DESIGN_AXES = {
  dtype:  { n: 'DAMAGE TYPE',          d: 'one of the eight. Fire is strong on flesh and weak on plate; acid is the reverse. Pick wrong and you built a gun for the wrong enemy.' },
  weight: { n: 'WEIGHT',               d: 'the lift ladder is live — a heavy weapon a rank-18 hero cannot carry is a paperweight.' },
  prof:   { n: 'PROFICIENCY CLASS',    d: 'soldiers fire at ×1.25, bruisers at ×0.7. Design for who is actually holding it.' },
  feed:   { n: 'CHARGES OR SUSTAINED', d: 'discrete hits or a tick stream — the burst window measures these differently.' },
  grade:  { n: 'MATERIAL GRADE',       d: 'cheap and common, or exotic and one of one.' },
};
