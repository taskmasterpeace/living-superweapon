// THE ENVIRONMENTS — what each world is like to stand on, and what it would take to survive it.
//
// Robert: "obsess over the skies where it matters, then I want the environments to be fit for our
// game. We will have space suits of some kind, but what would it take for Ascendants to survive on
// these respective environments?"
//
// TWO THINGS LIVE HERE AND THEY ANSWER EACH OTHER.
//
// 1. THE SKY. Air is what makes a sky, so a sky is a fact about an atmosphere, not a texture
//    choice. Mars' day is butterscotch and its SUNSET is blue — the exact inverse of Earth's, and
//    for the exact same reason (fine dust scatters red forward instead of blue). The Moon's sky is
//    black at noon with the sun still up. Titan's is a dim orange ceiling you cannot see through.
//    These are the details worth obsessing over because they are the whole read of a place in the
//    first half-second, before anyone looks at the ground.
//
// 2. THE HAZARD MODEL. A world attacks along CHANNELS — vacuum, cold, heat, crush, toxic,
//    radiation, gravity — and a fighter answers each channel with something they ARE or something
//    they WEAR. That structure is the point: it means the answer to "could RAGE walk on Titan?" is
//    derived from RAGE's own data rather than authored per hero per world, and adding a world or a
//    hero can never leave a hole. ⚠ No `def.id ===` anywhere — everything reads traits.
import { ORBITS, MOONS } from './orbits.js';

// Earth is the unit for everything a player has intuition about.
export const EARTH = { g: 9.81, kPa: 101.3, tempC: 15, sunArcDeg: 0.53, radMsvDay: 0.008 };

// ---------------------------------------------------------------------------------------------
// THE HAZARD CHANNELS. A world sets a level 0–3 on each; a fighter answers with a level of its
// own. Unanswered channels are what a suit is for.
// ⚠ ANOXIA IS A CHANNEL, and leaving it out was the first version's real mistake. Without it the
// model could not say the obvious thing — that the reason you wear a suit on Titan is that there is
// nothing to breathe, not that it is cold — and every world came out needing the same heavy suit
// for the wrong reason. It is derived, not authored: any world whose air is not breathable attacks
// on this channel, and a fighter who does not breathe simply ignores it.
export const CHANNELS = ['anoxia', 'vacuum', 'cold', 'heat', 'crush', 'toxic', 'radiation', 'gravity'];

// ---------------------------------------------------------------------------------------------
// `sky`:  day       — the zenith colour at noon
//         horizon   — the colour at the horizon
//         sunset    — what the sun's own glow goes to as it sets (Mars is the famous inversion)
//         night     — the zenith at night
//         sunArc    — the sun's apparent diameter, in Earths. Pluto's is a bright STAR, not a disc.
//         starsByDay— true where there is no air to scatter light: the sky is black with the sun up
//         inSky     — the thing you would actually point at
export const WORLDS = {
  earth: {
    name: 'Earth', kind: 'home', g: 1.00, kPa: 101.3, tempC: [-60, 50], radMsvDay: 0.008,
    air: '78% nitrogen · 21% oxygen', breathable: true,
    sky: { day: '#7fb8e8', horizon: '#cfe2f2', sunset: '#ff8a3a', night: '#0a1420', sunArc: 1.0, starsByDay: false,
           inSky: 'the Moon, a hand-span across' },
    hazards: {},
    note: 'The only place on this list where standing still is free.',
  },
  moon: {
    name: 'The Moon', kind: 'moon', parent: 'earth', g: 0.166, kPa: 0.0000003, tempC: [-173, 127], radMsvDay: 1.4,
    air: 'none worth the word', breathable: false,
    sky: { day: '#000000', horizon: '#0b0b0d', sunset: '#000000', night: '#000000', sunArc: 1.0, starsByDay: true,
           inSky: 'EARTH — four times the width of the Moon in our sky, and it never moves' },
    hazards: { vacuum: 3, cold: 3, heat: 1, radiation: 1 },
    note: 'No air means no sky, no sound, and no weather. The same view for four billion years.',
  },
  mars: {
    name: 'Mars', kind: 'rocky', g: 0.379, kPa: 0.61, tempC: [-143, 20], radMsvDay: 0.7,
    air: '95% carbon dioxide, and almost none of it', breathable: false,
    sky: { day: '#d9b285', horizon: '#e8c9a0', sunset: '#6f9fd8', night: '#0d0a08', sunArc: 0.66, starsByDay: false,
           inSky: 'Phobos, crossing west to east — twice a day' },
    hazards: { vacuum: 2, cold: 3, radiation: 1 },
    note: 'A butterscotch day and a BLUE sunset — the exact inverse of Earth, for the exact same reason.',
  },
  mercury: {
    name: 'Mercury', kind: 'rocky', g: 0.378, kPa: 0.0000000005, tempC: [-173, 427], radMsvDay: 9,
    air: 'none', breathable: false,
    sky: { day: '#000000', horizon: '#0a0908', sunset: '#000000', night: '#000000', sunArc: 2.5, starsByDay: true,
           inSky: 'the sun, three times the size it is at home, in a black sky' },
    hazards: { vacuum: 3, cold: 3, heat: 3, radiation: 3 },
    note: 'Six hundred degrees between the sunlit rock and the shadow beside it.',
  },
  venus: {
    name: 'Venus', kind: 'rocky', g: 0.905, kPa: 9200, tempC: [462, 462], radMsvDay: 0.02,
    air: '96% carbon dioxide, clouds of sulphuric acid', breathable: false,
    sky: { day: '#c99a4a', horizon: '#e0b878', sunset: '#a8752f', night: '#3a2a14', sunArc: 1.9, starsByDay: false,
           inSky: 'nothing — the cloud deck has never lifted' },
    hazards: { heat: 3, crush: 3, toxic: 3 },
    note: 'Ninety atmospheres at four hundred and sixty degrees. The pressure alone is the sea floor.',
  },
  jupiter: {
    name: 'Jupiter', kind: 'gas', g: 2.53, kPa: 1e6, tempC: [-145, 20000], radMsvDay: 180,
    air: 'hydrogen and helium, all the way down', breathable: false,
    sky: { day: '#e0c08a', horizon: '#a87a4a', sunset: '#8e6238', night: '#1a1208', sunArc: 0.19, starsByDay: false,
           inSky: 'storm bands wider than Earth, moving past at four hundred miles an hour' },
    hazards: { crush: 3, radiation: 3, cold: 3, gravity: 2 },
    note: 'There is no surface. There is only pressure, and then more of it.',
  },
  saturn: {
    name: 'Saturn', kind: 'gas', g: 1.07, kPa: 1e6, tempC: [-178, 11700], radMsvDay: 20,
    air: 'hydrogen and helium', breathable: false,
    sky: { day: '#e8d4a2', horizon: '#bfa06a', sunset: '#9a7f4a', night: '#141008', sunArc: 0.10, starsByDay: false,
           inSky: 'the rings, edge-on — a line of light across the whole sky' },
    hazards: { crush: 3, radiation: 2, cold: 3 },
    note: 'No surface either. The rings are the only thing here you could stand on, and they are ice.',
  },
  titan: {
    name: 'Titan', kind: 'moon', parent: 'saturn', g: 0.138, kPa: 146.7, tempC: [-179, -179], radMsvDay: 0.02,
    air: '95% nitrogen, 5% methane — THICKER than Earth', breathable: false,
    sky: { day: '#d98a3a', horizon: '#b8642a', sunset: '#8e4a1f', night: '#2a1408', sunArc: 0.10, starsByDay: false,
           inSky: 'Saturn, filling a fifth of the sky — if the haze ever cleared, which it does not' },
    hazards: { cold: 3, toxic: 1 },
    note: 'Thicker air than Earth and a tenth the gravity: strap on wings and you could FLY here, by arm.',
  },
  europa: {
    name: 'Europa', kind: 'moon', parent: 'jupiter', g: 0.134, kPa: 1e-9, tempC: [-220, -160], radMsvDay: 540,
    air: 'a whisper of oxygen off the ice', breathable: false,
    sky: { day: '#000000', horizon: '#050608', sunset: '#000000', night: '#000000', sunArc: 0.19, starsByDay: true,
           inSky: 'JUPITER, twelve times the width of our Moon, and it never sets' },
    hazards: { vacuum: 3, cold: 3, radiation: 3 },
    note: 'The radiation would kill an unshielded human in a day. Under the ice: more water than Earth.',
  },
  io: {
    name: 'Io', kind: 'moon', parent: 'jupiter', g: 0.183, kPa: 1e-9, tempC: [-183, 1600], radMsvDay: 3600,
    air: 'sulphur dioxide, where a volcano just put some', breathable: false,
    sky: { day: '#000000', horizon: '#1a1006', sunset: '#000000', night: '#000000', sunArc: 0.19, starsByDay: true,
           inSky: 'Jupiter, and four hundred volcanoes throwing sulphur three hundred kilometres up' },
    hazards: { vacuum: 3, cold: 3, heat: 3, toxic: 2, radiation: 3 },
    note: 'The most violent surface in the system. The ground itself resurfaces faster than it craters.',
  },
  uranus: {
    name: 'Uranus', kind: 'ice', g: 0.89, kPa: 1e6, tempC: [-224, 4700], radMsvDay: 8,
    air: 'hydrogen, helium, methane', breathable: false,
    sky: { day: '#96d4d2', horizon: '#5f9fa4', sunset: '#43767c', night: '#08181a', sunArc: 0.052, starsByDay: false,
           inSky: 'nothing. A featureless blue-green ceiling, in every direction, forever' },
    hazards: { crush: 3, cold: 3 },
    note: 'It rolls on its side, so each pole gets forty-two years of daylight and then forty-two of night.',
  },
  neptune: {
    name: 'Neptune', kind: 'ice', g: 1.14, kPa: 1e6, tempC: [-218, 4700], radMsvDay: 6,
    air: 'hydrogen, helium, methane', breathable: false,
    sky: { day: '#3f86ac', horizon: '#245a7c', sunset: '#183f58', night: '#050e16', sunArc: 0.033, starsByDay: false,
           inSky: 'winds at two thousand kilometres an hour — the fastest in the system' },
    hazards: { crush: 3, cold: 3 },
    note: 'The sun is a thousandth as bright here. Noon is our deep dusk.',
  },
  triton: {
    name: 'Triton', kind: 'moon', parent: 'neptune', g: 0.0794, kPa: 0.0014, tempC: [-235, -235], radMsvDay: 0.4,
    air: 'a trace of nitrogen', breathable: false,
    sky: { day: '#0a0f14', horizon: '#101820', sunset: '#0a0f14', night: '#000000', sunArc: 0.033, starsByDay: true,
           inSky: 'Neptune, and nitrogen geysers eight kilometres tall' },
    hazards: { vacuum: 3, cold: 3 },
    note: 'Minus 235. The coldest measured surface in the solar system, and it orbits backwards.',
  },
  pluto: {
    name: 'Pluto', kind: 'dwarf', g: 0.063, kPa: 0.001, tempC: [-233, -223], radMsvDay: 0.3,
    air: 'nitrogen, when it is close enough to the sun to have any', breathable: false,
    sky: { day: '#1a2028', horizon: '#26303a', sunset: '#141a20', night: '#000000', sunArc: 0.026, starsByDay: true,
           inSky: 'CHARON, half Pluto’s size, hanging in one spot and never moving' },
    hazards: { vacuum: 3, cold: 3 },
    note: 'Noon here is about as bright as Earth at dusk. The sun is the brightest star, and nothing more.',
  },
};

export const worldOf = (id) => WORLDS[id] || null;
export const worldIds = () => Object.keys(WORLDS);

// ---------------------------------------------------------------------------------------------
// THE SUITS. Each covers a set of channels to a level. A suit is GEAR, so it sits in the same
// place in the fiction as everything else a fighter carries — and the ladder is short on purpose:
// the interesting question is which worlds a given hero needs NO suit for.
// ⚠ EACH RUNG MUST HAVE A JOB. First pass gave the pressure suit cold 2 while every cold world was
// cold 3, so the lightest suit protected nobody anywhere and the ladder was decoration. It is
// calibrated against reality now: men walked on the Moon in a SOFT suit, so the Moon must be a
// pressure-suit world. What the heavy rungs buy is radiation and pressure, which is exactly what
// separates a lunar EVA from a day in Jupiter's magnetosphere.
export const SUITS = [
  { id: 'none', name: 'NO SUIT', covers: {}, blurb: 'Whatever you were wearing when you left.' },
  { id: 'pressure', name: 'PRESSURE SUIT', mass: 12,
    covers: { anoxia: 3, vacuum: 3, cold: 3, heat: 1, toxic: 2, radiation: 1 },
    blurb: 'Sealed, heated, eight hours of air. What they wore on the Moon.' },
  { id: 'hard', name: 'HARD SUIT', mass: 34,
    covers: { anoxia: 3, vacuum: 3, cold: 3, heat: 2, toxic: 3, radiation: 2, crush: 1 },
    blurb: 'Armoured and shielded — rated for a working day inside a magnetosphere.' },
  { id: 'deep', name: 'DEEP SUIT', mass: 96,
    covers: { anoxia: 3, vacuum: 3, cold: 3, heat: 3, toxic: 3, radiation: 3, crush: 2 },
    blurb: 'A vehicle you wear. It does not fit through most doors, and it will not save you at Jupiter.' },
];
export const suitById = (id) => SUITS.find(s => s.id === id) || SUITS[0];

// ---------------------------------------------------------------------------------------------
// WHAT A FIGHTER ANSWERS ON THEIR OWN. ⚠ Derived from traits, never from an id — a custom built in
// ORIGIN this afternoon gets a correct answer for Titan with nobody adding a row.
export function nativeResistance(def, sheet) {
  const r = { anoxia: 0, vacuum: 0, cold: 0, heat: 0, crush: 0, toxic: 0, radiation: 0, gravity: 0 };
  if (!def) return r;
  const res = def.resist || {};
  const body = def.body || (def.metal ? 'metal' : def.phase ? 'phase' : 'flesh');
  const str = def.strength || 5;

  // a machine does not breathe, and does not care what the air is made of
  if (def.metal || body === 'metal') { r.anoxia = 3; r.vacuum = 3; r.toxic = 3; r.cold += 1; r.radiation += 1; r.crush += 1; }
  // an energy body has nothing for a vacuum to boil or a toxin to poison
  if (body === 'energy' || def.energyInfinite) { r.anoxia = 3; r.vacuum = 3; r.toxic = 3; r.heat += 2; r.radiation += 2; }
  // intangibility is the general answer to pressure
  // an intangible fighter has no lungs to fill while they are phased, and nothing for pressure to
  // act on — the one trait that answers the two channels nothing else does
  if (def.phase) { r.crush = Math.max(r.crush, 2); r.toxic = Math.max(r.toxic, 2); r.anoxia = Math.max(r.anoxia, 3); r.vacuum = Math.max(r.vacuum, 2); }
  if (def.frostResist) r.cold = 3;          // a cold-native shrugs off the deep cold entirely
  // ⚠ WHAT YOU THROW IS WHAT YOU SURVIVE. Traits alone said the ICE fighter would freeze on Titan,
  // which is absurd on its face — `frostResist` is a flag carried by FIRE heroes (they resist
  // being frozen), so nothing marked the cold-wielders at all. A fighter's own KIT is the evidence:
  // scan the damage types they deal. Data-driven, so a custom built in ORIGIN this afternoon that
  // throws cold is correctly cold-proof on Pluto with nobody adding a row.
  const kit = def.abilities ? Object.values(def.abilities) : [];
  const deals = (t) => kit.some(k => k && (k.dtype === t || k.element === t ||
    (k.payload === t) || (t === 'cold' && (k.freeze || k.frost))));
  if (deals('cold')) r.cold = 3;
  if (deals('fire')) { r.heat = Math.max(r.heat, 3); r.cold = Math.max(r.cold, 1); }
  if (deals('toxic') || deals('acid')) r.toxic = Math.max(r.toxic, 2);
  if (deals('energy')) r.radiation = Math.max(r.radiation, 2);
  if ((res.fire || 1) < 0.7) r.heat = Math.max(r.heat, 2);
  if ((res.cold || 1) < 0.7) r.cold = Math.max(r.cold, 2);
  if ((res.toxic || 1) < 0.5) r.toxic = Math.max(r.toxic, 2);
  // raw physical toughness answers pressure and heavy gravity
  if (str >= 8) { r.crush = Math.max(r.crush, 2); r.gravity = 3; }
  else if (str >= 6) { r.crush = Math.max(r.crush, 1); r.gravity = 2; }
  else r.gravity = 1;
  // sheer vitality buys some time against radiation
  const vig = (sheet && sheet.attrs && sheet.attrs.vigor) || 0;
  if (vig >= 8 || (def.hp || 100) >= 150) r.radiation = Math.max(r.radiation, 1);
  return r;
}

// THE ANSWER. Which channels does this world attack that this fighter cannot answer, and what is
// the lightest suit that closes the gap?
export function survivalFor(def, worldId, sheet) {
  const w = worldOf(worldId);
  if (!w) return null;
  const mine = nativeResistance(def, sheet);
  // DERIVED, not authored: no breathable air is an attack, and it is usually the decisive one.
  const hz = { ...w.hazards };
  if (!w.breathable) hz.anoxia = 3;
  const gap = (cover) => {
    const missing = [];
    for (const ch of CHANNELS) {
      const need = hz[ch] || 0;
      if (!need) continue;
      const have = Math.max(mine[ch] || 0, (cover && cover[ch]) || 0);
      if (have < need) missing.push({ ch, need, have });
    }
    return missing;
  };
  const bare = gap(null);
  let suit = null, missing = bare;
  if (bare.length) {
    for (const s of SUITS) {
      const m = gap(s.covers);
      if (!m.length) { suit = s; missing = []; break; }
      if (m.length < missing.length) { suit = s; missing = m; }
    }
  }
  // gravity is not survival, it is HANDLING — reported separately because it changes the fight
  const gEff = w.g;
  const gravNote = gEff < 0.1 ? `${gEff.toFixed(2)}g — a hard jump is an escape trajectory; nothing you throw comes back`
    : gEff < 0.25 ? `${gEff.toFixed(2)}g — you can leap a building, and you will keep going up for a while`
    : gEff < 0.5 ? `${gEff.toFixed(2)}g — every jump is three times too long and every landing is slow`
    : gEff < 0.9 ? `${gEff.toFixed(2)}g — light on your feet, long on your landings`
    : gEff > 2.0 ? `${gEff.toFixed(2)}g — you weigh ${gEff.toFixed(1)}x what you should and so does your fist`
    : gEff > 1.15 ? `${gEff.toFixed(2)}g — heavy going; jumps are short and falls are hard`
    : `${gEff.toFixed(2)}g — near enough to home`;

  const verdict = !bare.length ? 'NATIVE'
    : missing.length ? 'LETHAL'
    : suit.id === 'pressure' ? 'PRESSURE SUIT'
    : suit.id === 'hard' ? 'HARD SUIT' : 'DEEP SUIT';

  return {
    world: w, verdict, suit, missing, bare,
    gravity: gravNote,
    // an honest clock for the unsuited, so "lethal" is a number and not a mood
    unsuitedSecs: bare.length ? unsuitedTime(w, mine) : Infinity,
    sky: w.sky, note: w.note,
  };
}

// How long an unprotected fighter lasts. Vacuum is the fast one (consciousness in ~15s, and that
// is with superhuman vitality); heat and crush at level 3 are immediate; cold is slower.
function unsuitedTime(w, mine) {
  let secs = Infinity;
  const cut = (v) => { secs = Math.min(secs, v); };
  const h = { ...w.hazards };
  if (!w.breathable) h.anoxia = 3;
  if ((h.anoxia || 0) > (mine.anoxia || 0)) cut(w.kPa < 1 ? 15 : 120);   // vacuum boils you; thin air just stops you
  if ((h.vacuum || 0) > (mine.vacuum || 0)) cut(15);
  if ((h.crush || 0) > (mine.crush || 0)) cut(h.crush >= 3 ? 2 : 40);
  if ((h.heat || 0) > (mine.heat || 0)) cut(h.heat >= 3 ? 4 : 90);
  if ((h.cold || 0) > (mine.cold || 0)) cut(h.cold >= 3 ? 60 : 240);
  if ((h.toxic || 0) > (mine.toxic || 0)) cut(h.toxic >= 3 ? 30 : 300);
  if ((h.radiation || 0) > (mine.radiation || 0)) cut(h.radiation >= 3 ? 600 : 3600);
  return secs;
}

// ---------------------------------------------------------------------------------------------
// THE SKY, for the renderer. Returns the palette a world's dome should use, with the sun's real
// apparent size — which is the single most under-used fact in space fiction: at Pluto the sun is
// a fiftieth of a degree across. It is a very bright STAR. It does not have a disc you can see.
export function skyFor(worldId) {
  const w = worldOf(worldId);
  if (!w) return null;
  const s = w.sky;
  return {
    ...s,
    sunArcDeg: EARTH.sunArcDeg * s.sunArc,
    // below about a fifth of Earth's, the sun stops being a disc and becomes a point of light
    sunIsPoint: s.sunArc < 0.2,
    lightMult: Math.max(0.02, s.sunArc * s.sunArc),   // inverse-square, expressed off the arc
    airless: !w.breathable && (w.kPa < 0.01),
  };
}

// Every moon in orbits.js that we have an environment for — so the almanac can walk the system
// and say something true about each stop.
export function habitatsIn(planetId) {
  const out = [];
  for (const m of (MOONS[planetId] || [])) if (WORLDS[m.id]) out.push({ ...m, env: WORLDS[m.id] });
  return out;
}
