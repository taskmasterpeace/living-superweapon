// THE BEAM LIBRARY — beams as NAMED, CHARACTER-UNASSOCIATED rows.
//
// Robert, 2026-09-16, on grading the gallery: "start organizing our beams and get them
// unassociated with characters." A beam is a THING with a name; a hero merely carries one.
// This file is the seed of that library (#42 queue item 3): rows here are exactly beam ability
// defs (same schema as a kit slot — same math, same spawnBeamFor), owned by nobody. The gallery
// browses them alongside the roster's beams; the swap/assign layer builds on this file.
export const LIBRARY_BEAMS = [
  // "maybe you can make one that, like, if a kid drew fire" + "give us one more so we have a
  // solid round 25" — both asks in one row, and the library's first citizen. The zigzag mode is
  // the crayon stroke; the edge override runs the FAMILY_EDGE flame teeth at full bite and a
  // faster flicker than roster fire.
  { id: 'crayonfire', type: 'beam', name: 'Crayon Fire', material: 'fire', dtype: 'fire',
    mode: 'zigzag', cost: 6, cd: 0.4, radius: 1.7, tipSpeed: 420, maxLen: 130, dps: 52,
    kiPerSec: 18, steer: 10, color: '#ff7a1a', color2: '#ffe08a', density: 1.2,
    edge: { amp: 0.8, teeth: 4, step: 10, drift: 1.4 } },
  // "keep this and maybe make another fire that's blue... that has like a blue core" + "for the
  // fire, BEADED is definitely it" (both his, grading the gallery live). The blue hue flips the
  // fire shaders' COOL RAMP — blue lava cracks, azure tongues, hotter-than-orange — and the
  // authored density gives it the solid body he asked for.
  { id: 'blueblaze', type: 'beam', name: 'Blue Blaze', material: 'fire', dtype: 'fire',
    mode: 'beaded', cost: 6, cd: 0.4, radius: 1.6, tipSpeed: 460, maxLen: 135, dps: 56,
    kiPerSec: 19, steer: 10, color: '#2a7bff', color2: '#dff2ff', density: 1.25,
    edge: { amp: 0.66, teeth: 5, step: 12, drift: 1.1 } },
  // "you need to create an ice beam" — the library's cold citizen. Field shape copied from RIME's
  // Cryo Beam (dtype cold drives the ice family + crystal plates); lance mode keeps it a clean
  // frozen needle the whole length.
  { id: 'glacierlance', type: 'beam', name: 'Glacier Lance', dtype: 'cold', mode: 'lance',
    cost: 6, cd: 0.4, radius: 1.3, tipSpeed: 640, maxLen: 140, dps: 44, kiPerSec: 17,
    steer: 11, color: '#7fd4ff', color2: '#ffffff', density: 1.1 },
  // he likes LIGHT and DARK — the pair, on the modes he hasn't seen carried yet
  { id: 'nightwhip', type: 'beam', name: 'Night Whip', material: 'shadow', mode: 'whip',
    cost: 7, cd: 0.5, radius: 1.7, tipSpeed: 540, maxLen: 140, dps: 50, kiPerSec: 19,
    steer: 9, color: '#3a4a5c', color2: '#101018' },
  { id: 'daybreak', type: 'beam', name: 'Daybreak', material: 'light', mode: 'converging',
    cost: 6, cd: 0.4, radius: 1.8, tipSpeed: 820, maxLen: 150, dps: 54, kiPerSec: 18,
    steer: 12, color: '#ffd24a', color2: '#ffffff', density: 1.1 },
];

// THE SHOT LIBRARY — projectiles that belong to nobody, for the stand's SHOTS wheel.
export const LIBRARY_SHOTS = [
  // "what does a RAILGUN look like — something that fires instantly, all the way to the view
  // distance." ⚠ Honest label: this is a HYPER-VELOCITY slug (1400 u/s — the stand lane in ~2
  // frames), not true hitscan; a real instant-line delivery is a new mechanic (manual §5 protocol)
  // and is on the queue as its own decision.
  { id: 'railslug', type: 'projectile', name: 'Rail Slug', speed: 1400, damage: 60, radius: 0.5,
    blast: 3, pierce: 3, cd: 1.2, cost: 6, color: '#bfe9ff', color2: '#ffffff', dtype: 'ballistic' },
  // the explosion trio's carriers: same canister, different DETONATION STYLE (vfx explode)
  { id: 'concussionshell', type: 'projectile', name: 'Concussion Shell', canister: true, grav: 1,
    speed: 74, damage: 20, blast: 16, cd: 1.1, cost: 6, explosion: 'concussion', dtype: 'physical',
    color: '#d8d2c4', color2: '#8f887a' },
  { id: 'empshell', type: 'projectile', name: 'EMP Shell', canister: true, grav: 1,
    speed: 74, damage: 12, blast: 14, cd: 1.1, cost: 6, explosion: 'emp', dtype: 'energy',
    shock: true, shockDuration: 1.4, color: '#9fd4ff', color2: '#eaffff' },
];
