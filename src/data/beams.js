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
];
