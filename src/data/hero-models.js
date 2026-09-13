// Presentation data only. A kit can change costume/flight language without touching its powers.
// def.model overrides any of these defaults; archetype/frame continue to control proportions.
export const HERO_BODY_LABELS={'faceted-v1':'Faceted modular · authored rig',procedural:'Procedural modules','superhero-male':'Quaternius · Superhero male','superhero-female':'Quaternius · Superhero female'};
export const HERO_BODIES=Object.keys(HERO_BODY_LABELS);
export const HERO_MODELS = {
  sol: { body:'superhero-male',surface:'standard',costume:'fitted', flightStyle:'hero', hairColor:'#172127' },
  kano: { costume:'martial', flightStyle:'martial', hairColor:'#14222a' },
  vega: { body:'superhero-male',costume:'plated',surface:'field',flightStyle:'hero',hair:'none',insignia:'V' },
  titan: { costume:'plated', flightStyle:'thruster' },
  ironclad: { costume:'plated', flightStyle:'thruster' },
  stormcall: { costume:'fitted', flightStyle:'hammer' },
  vanguard: { costume:'fitted', flightStyle:'glider' },
  majesty: { costume:'fitted', flightStyle:'twin' },
  sarge: { body:'superhero-male',surface:'field',equipment:'soldier',costume:'tactical', flightStyle:'thruster' },
  merc: { body:'superhero-male',surface:'field',equipment:'soldier',costume:'tactical', flightStyle:'thruster' },
  gale: { costume:'tactical', flightStyle:'martial' },
  volt: { costume:'fitted', flightStyle:'martial' },
};

export function heroModelOf(def) {
  const model={ costume:def.metal?'plated':'fitted',flightStyle:def.metal?'thruster':'martial',
    hairColor:'#17242b',...HERO_MODELS[def.id],...def.model };
  model.definition ??= ({fitted:.85,martial:.5,tactical:.35,plated:.2})[model.costume]??.7;
  return model;
}
