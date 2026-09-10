// =================================================================================================
// THE WEATHER — states, not effects.
//
// Robert: *"we already got day night cycles... we should just have if it's sunny, cloudy, nighttime,
// raining. We want different states so that it could affect different things within the game."*
//
// That is the better framing than a list of effects, and it is why this is a DATA file. A state is
// something other systems can READ — the AI's sight range, the police response, the pedestrians, the
// news desk — where an effect is something one system DOES. Rain that only makes particles is
// decoration; rain that shortens what a bot can see is weather.
//
// ⚠ THE FOUNDATIONAL RULE: WIND ACTS ON MATTER, AND ENERGY IS NOT MATTER. There is no `if (energy)`
// anywhere in this system and there must never be one. Wind force scales by MASS, and an energy
// blast has none — so a ki beam is exempt BY CONSTRUCTION rather than by exception. The moment
// somebody writes the exception, the rule stops being a rule and becomes a list to maintain.
// =================================================================================================

// `drag` is how hard the wind pushes a thing of this kind, in units of "fraction of the wind vector
// applied per second". It is a MASS PROXY: light things are pushed, heavy things are not, and the
// weightless are not in the table at all.
// ⚠ THE ORDER OF THIS TABLE IS THE DESIGN. Read it top to bottom and it says: air moves air totally,
// bullets a lot, thrown cars barely, and energy never — which is exactly the spec's table, expressed
// as numbers the engine can multiply instead of cases it has to test.
export const WIND_DRAG = {
  gas: 1.00,        // a cloud IS air — it goes where the air goes
  litter: 0.85,
  arrow: 0.42,
  ballistic: 0.34,  // bullets and pellets: a visible curve at range
  canister: 0.14,   // grenades: a nudge
  blade: 0.10,
  prop: 0.02,       // a thrown car: negligible, and that is the point
  // NOTE the absence: there is no `energy` key. A projectile with no matching kind gets ZERO.
};

// The states. `vis` multiplies the AI's sight range — the honesty law then does the rest for free,
// because a bot that cannot see you cannot act on you. `light` scales the key light, `wet` drives
// the ground sheen, `wind` is the base wind speed in units/second.
export const STATES = {
  clear:    { n: 'CLEAR',        wind: 0.10, rain: 0,    cloud: 0.05, vis: 1.00, light: 1.00, wet: 0,    fog: 0 },
  fair:     { n: 'FAIR',         wind: 0.18, rain: 0,    cloud: 0.30, vis: 1.00, light: 0.96, wet: 0,    fog: 0 },
  cloudy:   { n: 'OVERCAST',     wind: 0.28, rain: 0,    cloud: 0.80, vis: 0.94, light: 0.78, wet: 0,    fog: 0.10 },
  drizzle:  { n: 'DRIZZLE',      wind: 0.30, rain: 0.35, cloud: 0.85, vis: 0.88, light: 0.72, wet: 0.5,  fog: 0.18 },
  rain:     { n: 'RAIN',         wind: 0.45, rain: 0.80, cloud: 0.95, vis: 0.76, light: 0.62, wet: 0.9,  fog: 0.28 },
  storm:    { n: 'STORM',        wind: 0.85, rain: 1.00, cloud: 1.00, vis: 0.60, light: 0.48, wet: 1.0,  fog: 0.40, thunder: true },
  // ⚠ A HURRICANE IS A STATE, NOT AN ABILITY. It is what the ultimate PUTS the world into, so the
  // ability has nothing to implement — it asks for this state and every reader already knows it.
  hurricane:{ n: 'HURRICANE',    wind: 1.60, rain: 1.00, cloud: 1.00, vis: 0.45, light: 0.40, wet: 1.0,  fog: 0.55, thunder: true },
  tornado:  { n: 'TORNADO',      wind: 0.45, rain: 0.80, cloud: 1.00, vis: 0.60, light: 0.45, wet: 0.9,  fog: 0.40, thunder: true },
  fog:      { n: 'FOG',          wind: 0.08, rain: 0,    cloud: 0.60, vis: 0.52, light: 0.70, wet: 0.3,  fog: 0.85 },
  snow:     { n: 'SNOW',         wind: 0.35, rain: 0,    cloud: 0.90, vis: 0.72, light: 0.80, wet: 0.4,  fog: 0.30, snow: true },
  dust:     { n: 'DUST STORM',   wind: 1.10, rain: 0,    cloud: 0.70, vis: 0.40, light: 0.55, wet: 0,    fog: 0.70, dust: true },
  acidrain: { n: 'ACID RAIN',    wind: 0.55, rain: 0.9,  cloud: 1.00, vis: 0.70, light: 0.50, wet: 0.8,  fog: 0.35, acid: true },
  methane:  { n: 'METHANE DRIZZLE', wind: 0.22, rain: 0.5, cloud: 0.95, vis: 0.80, light: 0.45, wet: 0.7, fog: 0.45 },
  none:     { n: 'NO ATMOSPHERE',wind: 0,    rain: 0,    cloud: 0,    vis: 1.00, light: 1.00, wet: 0,    fog: 0 },
};

// ⚠ PER-WORLD DEFAULTS COME FROM WHETHER THERE IS AIR, which `worldEnv` already answers. A world
// with no atmosphere has no weather, and that falls out rather than being listed.
export const WORLD_WEATHER = {
  earth: ['clear', 'fair', 'fair', 'cloudy', 'cloudy', 'drizzle', 'rain', 'storm', 'fog'],
  mars:  ['clear', 'clear', 'dust', 'dust'],
  venus: ['acidrain', 'acidrain', 'storm'],
  titan: ['methane', 'methane', 'fog'],
  moon: ['none'], io: ['none'], europa: ['none'], ganymede: ['none'],
  enceladus: ['none'], triton: ['none'], pluto: ['none'],
};

export const stateOf = (id) => STATES[id] || STATES.clear;

/** What weather a city gets, derived: the world decides what is possible, the climate biases it. */
export function pickWeather(world, climate, rng = Math.random) {
  const pool = WORLD_WEATHER[world] || WORLD_WEATHER.earth;
  if (pool.length === 1) return pool[0];
  // ⚠ the climate is a BIAS on Earth's pool, never a second table. A polar city sees snow where a
  // desert sees clear, and both are drawing from the same nine rows.
  const z = (climate && climate.zone) || '';
  const w = pool.slice();
  if (/^(BW|BS)/.test(z)) { w.push('clear', 'clear', 'fair'); }         // arid
  else if (/^(Df|Dw|ET|EF)/.test(z)) { w.push('snow', 'snow', 'cloudy'); }
  else if (/^(Af|Am|Cf)/.test(z)) { w.push('rain', 'drizzle', 'storm'); }
  return w[(rng() * w.length) | 0];
}

// ---- GOLDEN HOUR ------------------------------------------------------------------------------
// ⚠ IT IS A FACT ABOUT THE SUN'S ELEVATION, NOT A TIME OF DAY, which is why it is here rather than
// hard-coded to a `dayT` number: at a high latitude in winter the sun never gets far above the
// horizon and the light stays golden for hours, and that should fall out rather than be special-cased.
// Returns 0..1 — the strength of the treatment — plus which side of noon we are on, because a
// sunrise is cooler and cleaner than a sunset and only the sunset should get the haze.
export function goldenHour(dayT) {
  const dl = 0.5 + 0.5 * Math.cos((dayT - 0.25) * Math.PI * 2);   // the same daylight curve world.js uses
  // the bell sits where the sun is LOW but still up: a narrow band either side of the horizon
  const k = Math.exp(-((dl - 0.30) ** 2) / 0.010);
  // ⚠ CAUGHT BY THE NUMBERS, NOT BY READING IT. `dayT < 0.5` looks obviously right and is wrong:
  // daylight PEAKS at dayT 0.25 in this clock, so the sun climbs from ~0.875 through 0.25 and sets
  // from 0.25 to ~0.625. The two golden windows measured at dayT 0.60 (sunset) and 0.90 (pre-dawn),
  // and the naive test called the 0.90 one a sunset — which would have painted the dawn sky with
  // the dusty evening orange every single morning.
  const rising = dayT > 0.75 || dayT < 0.25;
  return { k: Math.max(0, Math.min(1, k)), rising, daylight: dl };
}

// The colour a low sun turns. ⚠ Warm, and never toward magenta — the no-purple law reaches the sky.
export const GOLDEN = {
  sunRise:  '#ffd8a0',   // cooler, cleaner
  sunSet:   '#ff9a4a',   // deeper, dustier
  skyRise:  '#9fc6e8',
  skySet:   '#e88a4c',
  ambient:  '#ffc98a',
};
