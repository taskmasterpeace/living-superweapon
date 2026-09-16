// THE BEAM CHART — Robert: "give all this stuff some names, and I want you to make me a chart of
// it... so I know all of the stuff when it comes to beams... get the language understood."
//
// ⚠ GENERATED FROM THE LIVE TABLES, through the game's OWN derivation chain — family comes from
// `fxOf(visOf(def), def, ownerDef, 1)` exactly as spawnBeamFor computes it, build/temper/mode from
// the same visual.js functions the BeamHose ctor reads. The chart physically cannot drift from the
// engine (the damage-codex law). The one authored layer here is the PLAIN-LANGUAGE blurbs; a
// vocabulary word the tables carry but this file hasn't blurbed yet still renders (undescribed,
// never hidden).
import { ROSTER } from './data/characters.js';
import { LIBRARY_BEAMS } from './data/beams.js';
import { visOf, beamBuildOf, beamTemperOf, beamModeOf, MODE_LOOK, FAMILY_EDGE } from './data/visual.js';
import { fxOf } from './data/powerfx.js';
import { beamVisualFamily } from './engine/beam-surface.js';

const BUILD_WORDS = {
  ray: 'a thin line — nearly all core, the halo stays a whisper',
  hose: 'the classic beam body — core wrapped in a sheath',
  torrent: 'a flood — wide, more sheath than core',
};
const TEMPER_WORDS = {
  steady: 'calm inside — nothing rides the shaft',
  helix: 'orbs wind down the shaft in a corkscrew',
  kink: 'sharp offsets snap along the length',
  roil: 'a boiling churn inside the body',
  crystal: 'rigid shards ride in formation',
  sinuous: 'a slow snaking drift',
  surge: 'pushes down the shaft in waves',
  churn: 'grinding turbulence, never settled',
};
const MODE_WORDS = {
  straight: 'a clean line — the baseline',
  pulsed: 'packets race down the shaft',
  spiral: 'corkscrews around the line of fire',
  waveform: 'an S-wave rides the shaft',
  converging: 'wide at the hand, gathers to a point',
  diverging: 'tight at the hand, sprays open at the far end',
  lance: 'needle-thin the whole way',
  beaded: 'a chain of energy beads',
  whip: 'the far end lashes',
  taper: 'fat at the hand, fine at the tip',
  throb: 'the whole beam breathes together',
  zigzag: 'hard angular breaks — a drawn stroke',
};
const FAMILY_WORDS = {
  fire: 'lava-crust core, jagged flickering tongues (THE EDGE); an authored BLUE flame flips the cool ramp',
  ice: 'rigid crystal plates — the seams glint cold',
  shock: 'arcing electric comb lanes',
  ki: 'saturated pulse stream — the DBZ energy body',
  magic: 'sigils crawl the shaft',
  ray: 'pure light — nearly all core, whisper halo',
  fluid: 'liquid sheen, weight in the body',
  alien: 'organic and wrong on purpose',
  void: 'near-black, ABSORBS — the colour survives only as the escaping rim',
  energy: 'the plain energy default',
};
const ORIGIN_WORDS = {
  EYES: 'fires from the face (optic) — the launch braces the head onto the line',
  CHEST: 'fires from a chest aperture (reactor / unibeam)',
  HANDS: 'fires from the palm — charged releases brace both hands',
};

const rows = [];
for (const d of ROSTER) {
  if (!d.abilities) continue;
  for (const k of ['lmb', 'rmb', 'q', 'e', 'f', 'r']) {
    const a = d.abilities[k];
    if (a && a.type === 'beam') rows.push({ owner: d.name, ownerDef: d, ab: a, lib: false });
  }
}
for (const b of LIBRARY_BEAMS) rows.push({ owner: 'LIBRARY', ownerDef: null, ab: b, lib: true });

// ⚠ THE FULL CHAIN, both steps — fxOf gives the powerfx family and the BeamHose ctor then routes
// it THROUGH beamVisualFamily to pick the SURFACE. Running only the first step made this chart call
// Heat Ray 'fire' while the live beam renders 'ray' — the drift this page exists to make impossible.
const famOf = r => { try { return beamVisualFamily({ ...r.ab, fxFam: fxOf(visOf(r.ab), r.ab, r.ownerDef, 1).family }) || 'energy'; } catch { return 'energy'; } };
const originOf = a => a.faceOrigin ? 'EYES' : a.chest ? 'CHEST' : 'HANDS';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const chips = (words, keys) => `<div class="vocab">${keys.map(k =>
  `<div class="v"><b>${esc(k)}</b><span>${esc(words[k] || '— (in the tables, not yet described)')}</span></div>`).join('')}</div>`;

const derived = rows.map(r => ({
  ...r, fam: famOf(r), build: beamBuildOf(r.ab), temper: beamTemperOf(r.ab),
  mode: beamModeOf(r.ab), origin: originOf(r.ab),
}));
const famsInPlay = [...new Set(derived.map(r => r.fam))];
const originCounts = derived.reduce((m, r) => (m[r.origin] = (m[r.origin] || 0) + 1, m), {});

document.getElementById('app').innerHTML = `
  <h1>◈ THE BEAM CHART<small>${derived.length} beams · generated from the live tables — this page cannot drift from the engine</small></h1>
  <div class="bar"><a href="./powerworld.html?destination=gallery">◈ open the Beam Gallery</a><a href="./index.html">← deployment hub</a></div>

  <h2>HOW A BEAM IS BUILT — the axes</h2>
  <p class="note">Every beam is one pick from each axis. Same math for a hero's beam and a library beam.</p>
  <div class="axis">FAMILY — what the energy IS (the surface shader)</div>${chips(FAMILY_WORDS, famsInPlay)}
  <div class="axis">BUILD — how much of it there is (derived from width)</div>${chips(BUILD_WORDS, Object.keys(BUILD_WORDS))}
  <div class="axis">TEMPER — what is happening INSIDE (the detail layer, from material)</div>${chips(TEMPER_WORDS, Object.keys(TEMPER_WORDS))}
  <div class="axis">MODE — what the tube ITSELF does</div>${chips(MODE_WORDS, Object.keys(MODE_LOOK))}
  <div class="axis">EDGE — the silhouette on the wall (today: fire's jagged flicker teeth)</div>
  ${chips({ fire: `triangle teeth on a flicker clock — amp ${FAMILY_EDGE.fire.amp} bite · ${FAMILY_EDGE.fire.teeth} tongues · ${FAMILY_EDGE.fire.step} flickers/s (per-beam override on the row)` }, Object.keys(FAMILY_EDGE))}
  <div class="axis">ORIGIN — where it leaves the body (${Object.entries(originCounts).map(([k, v]) => `${k} ×${v}`).join(' · ')})</div>${chips(ORIGIN_WORDS, Object.keys(ORIGIN_WORDS))}
  <div class="axis">THE DIALS</div>${chips({
    'SPD (gallery)': 'look-speed ×0.25–×6 — scales the mode + edge clocks only, never damage or reach',
    'DENSITY (row)': 'per-beam body — multiplies the family’s core/sheath opacity',
    'WIDTH (radius)': 'the beam’s thickness — also picks its BUILD',
    'REACH (maxLen)': 'how far the stream runs before it ends',
  }, ['SPD (gallery)', 'DENSITY (row)', 'WIDTH (radius)', 'REACH (maxLen)'])}

  <h2>THE ${derived.length} BEAMS</h2>
  <table><thead><tr><th>#</th><th>OWNER</th><th>BEAM</th><th>FAMILY</th><th>BUILD</th><th>TEMPER</th><th>MODE</th><th>ORIGIN</th><th class="num">WIDTH</th><th class="num">REACH</th><th class="num">DPS</th><th>COLORS</th></tr></thead>
  <tbody>${derived.map((r, i) => `<tr${r.lib ? ' class="lib"' : ''}><td class="own">${i + 1}</td><td class="own">${esc(r.owner)}</td><td class="name">${esc(r.ab.name)}</td><td>${esc(r.fam)}</td><td>${esc(r.build)}</td><td>${esc(r.temper)}</td><td>${esc(r.mode)}</td><td>${esc(r.origin)}</td><td class="num">${r.ab.radius ?? 1.6}</td><td class="num">${r.ab.maxLen ?? 120}u</td><td class="num">${r.ab.dps ?? 60}</td><td><i class="sw" style="background:${esc(r.ab.color || '#8fe3ff')}"></i><i class="sw" style="background:${esc(r.ab.color2 || '#eaffff')}"></i></td></tr>`).join('')}</tbody></table>
  <p class="note">LIBRARY rows belong to nobody — any character can fire them. Supplement this sheet freely; the columns map 1:1 onto the beam row fields (data/beams.js).</p>`;
