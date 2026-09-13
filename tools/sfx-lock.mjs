// tools/sfx-lock.mjs — lock Robert's picked takes into public/audio/sfx-cc0/final/ + a winners manifest.
//   node tools/sfx-lock.mjs
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'audio', 'sfx-cc0');
const FINAL = join(OUT, 'final');

// Robert's picks (thumbs-up), 2026-09-13
const PICKS = {
  'sfx.shotgun.fire': ['01'], 'sfx.shotgun.pump': ['01'],
  'gun.ak': ['02', '04'], 'gun.ar15': ['01'], 'gun.smg': ['04'], 'gun.smg2': ['04'],
  'gun.pistol2': ['01'], 'gun.bolt': ['02'], 'gun.battle': ['02'],
  'sfx.impact.glass': ['01', '02', '05'], 'sfx.impact.metal': ['03'], 'sfx.impact.wood': ['03'],
  'sfx.impact.concrete': ['01', '03', '04'], 'sfx.impact.water': ['01', '02', '03'],
  'sfx.impact.flesh': ['04', '05'], 'sfx.punch.flesh': ['03', '04'],
  'sfx.step.concrete': ['01', '02', '03', '04'], 'sfx.step.grass': ['01', '02', '03', '04'], 'sfx.step.dirt': ['01'],
};
// proposed game sample name + integration target per cue
const SAMPLE = {
  'sfx.shotgun.fire': { name: 'wpn.pump', mapsTo: "arsenal wpn-pump / wpn-auto12 (REPLACE the weak AI shotgun)" },
  'sfx.shotgun.pump': { name: 'wpn.pump.rack', mapsTo: 'shotgun rack/cock (NEW — none existed)' },
  'gun.ak': { name: 'wpn.ak', mapsTo: 'arsenal wpn-ak (REPLACE)' },
  'gun.ar15': { name: 'wpn.m16', mapsTo: 'arsenal wpn-m16 (REPLACE)' },
  'gun.smg': { name: 'wpn.smg', mapsTo: 'arsenal wpn-mp5 / wpn-pdw (REPLACE)' },
  'gun.smg2': { name: 'wpn.saw', mapsTo: 'arsenal wpn-saw / wpn-machinepistol (REPLACE)' },
  'gun.pistol2': { name: 'wpn.pistol', mapsTo: 'arsenal wpn-p9 / wpn-machinepistol (REPLACE)' },
  'gun.bolt': { name: 'wpn.bolt', mapsTo: 'arsenal wpn-m24 (REPLACE)' },
  'gun.battle': { name: 'wpn.battle', mapsTo: 'arsenal wpn-battle (REPLACE)' },
  'sfx.impact.glass': { name: 'impact.glass', mapsTo: 'bullet impact — glass (NEW family)' },
  'sfx.impact.metal': { name: 'impact.metal', mapsTo: 'bullet impact — metal (NEW family)' },
  'sfx.impact.wood': { name: 'impact.wood', mapsTo: 'bullet impact — wood (NEW family)' },
  'sfx.impact.concrete': { name: 'impact.concrete', mapsTo: 'bullet impact — concrete/stone (NEW family)' },
  'sfx.impact.water': { name: 'impact.water', mapsTo: 'bullet impact — water (NEW family)' },
  'sfx.impact.flesh': { name: 'impact.flesh', mapsTo: 'bullet impact — flesh (NEW family)' },
  'sfx.punch.flesh': { name: 'melee.flesh', mapsTo: 'bare-fist body hit (NEW family)' },
  'sfx.step.concrete': { name: 'step.concrete2', mapsTo: 'footstep concrete (UPGRADE of existing step.concrete)' },
  'sfx.step.grass': { name: 'step.grass2', mapsTo: 'footstep grass (UPGRADE of existing step.grass)' },
  'sfx.step.dirt': { name: 'step.dirt', mapsTo: 'footstep dirt (NEW family)' },
};

const manifest = JSON.parse(await readFile(join(OUT, 'manifest.json'), 'utf8'));
await mkdir(FINAL, { recursive: true });
const letters = 'abcdefgh';
const winners = [], bank = {};
for (const [cue, takes] of Object.entries(PICKS)) {
  const cueU = cue.replace(/\./g, '_'), files = [], srcs = [];
  let i = 0;
  for (const tk of takes) {
    const srcStem = `${cueU}_${tk}`, src = join(OUT, srcStem + '.mp3');
    if (!existsSync(src)) { console.warn('MISSING', src); continue; }
    const outStem = `${cueU}_${letters[i]}`; await copyFile(src, join(FINAL, outStem + '.mp3'));
    const rec = manifest.files.find((f) => f.cue === cue && String(f.take).padStart(2, '0') === tk);
    files.push(`sfx-cc0/final/${outStem}`); srcs.push({ take: tk, source: rec?.source, pack: rec?.pack, dur: rec?.durationSec });
    i++;
  }
  const s = SAMPLE[cue];
  winners.push({ cue, sample: s.name, mapsTo: s.mapsTo, files, sources: srcs });
  bank[s.name] = { f: files, g: cue.startsWith('gun.') || cue.startsWith('sfx.shotgun') ? 0.55 : cue.startsWith('sfx.step') ? 0.4 : 0.7 };
}
const wm = {
  format: 'lsw.sfx-cc0.winners', version: 1, pickedBy: 'Robert', date: '2026-09-13',
  provenance: 'Real recordings, all CC0 / public domain (OpenGameArt). Sources per file. No AI, no synth.',
  license: 'CC0 1.0 (public domain) throughout — see packs.',
  packs: manifest.packs,
  counts: { sounds: winners.length, files: winners.reduce((a, w) => a + w.files.length, 0) },
  integration: {
    note: 'Paste `sampleBankManifest` into src/core/samples.js MANIFEST (files load as audio/<stem>.mp3). wpn.* entries REPLACE the weak AI arsenal guns; impact.*/melee.*/step.* are new families to wire on the matching events. Per-sound gain is a starting point.',
    sampleBankManifest: bank,
  },
  winners,
};
await writeFile(join(FINAL, 'winners-manifest.json'), JSON.stringify(wm, null, 2));
console.log(`locked ${winners.length} sounds / ${wm.counts.files} files -> public/audio/sfx-cc0/final/`);
for (const w of winners) console.log('  ' + w.sample.padEnd(16), w.files.length + ' file(s)', '·', w.mapsTo);
