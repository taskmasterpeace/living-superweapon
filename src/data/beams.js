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
    kiPerSec: 18, steer: 10, color: '#ff7a1a', color2: '#ffe08a',
    edge: { amp: 0.8, teeth: 4, step: 10, drift: 1.4 } },
];
