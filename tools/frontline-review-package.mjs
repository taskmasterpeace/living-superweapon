// Snapshot-scoped review artifact for this dirty checkout; never reads the index.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const kind=process.argv[2]||'audio';
const shared=kind==='ground'?['src/engine/powerworld.js','tools/frontline-terrain-browser.mjs']:kind==='encounter'?['src/engine/game.js','src/engine/pwTitle.js']:kind==='audio'?['src/core/audio.js','src/tool/studio-main.js','src/tool/studio.css']:
 ['src/engine/abilities.js','src/engine/entity.js','src/engine/melee-pose.js','src/engine/combat-pose.js','src/engine/directional-pose.js','src/engine/flight-pose.js','src/engine/game.js','src/data/characters.js','src/tool/studio-combat.js','src/engine/pwTitle.js'];
const added=kind==='ground'?['src/engine/frontline-ground.js','tools/frontline-ground.test.mjs','tools/frontline-terrain.test.mjs']:kind==='encounter'?['src/engine/frontline-encounter.js','tools/frontline-encounter.test.mjs','tools/frontline-encounter-browser.mjs']:kind==='audio'?['src/data/sound-library.js','src/core/sound-library.js','src/tool/sound-library.js','src/tool/sound-library.css','tools/sound-library.test.mjs','tools/sound-library-browser.mjs']:
 ['src/engine/ability-melee-pose.js','tools/ability-melee-pose.test.mjs','tools/frontline-beam-speed.test.mjs','tools/ability-melee-studio.test.mjs','tools/frontline-combat-browser.mjs','tools/frontline-news.test.mjs'];
let text=`# ${kind} review package\nBase and Head: e6a757f9 (uncommitted scoped snapshot changes, NOT a HEAD diff).\nBaseline: artifacts/frontline-${kind}-baseline.\n\n`;
for(const path of shared){
 const base=kind==='ground'?`artifacts/frontline-ground-baseline/${path.split('/').at(-1)}`:kind==='encounter'?`artifacts/frontline-encounter-baseline/${path.split('/').at(-1)}`:kind==='audio'?`artifacts/frontline-audio-baseline/${path}`:`artifacts/frontline-combat-baseline/${path.split('/').at(-1)}`;
 const result=spawnSync('git',['diff','--no-index','--no-ext-diff','--unified=50',base,path],{encoding:'utf8',maxBuffer:12e6});
 if(result.status>1)throw Error(result.stderr);text+=result.stdout+'\n';
}
for(const path of added){const source=await readFile(path,'utf8');text+=`\n--- /dev/null\n+++ ${path}\n@@ new complete file @@\n`+source.split('\n').map(l=>'+'+l).join('\n')+'\n';}
await mkdir('artifacts/frontline-reviews',{recursive:true});
const output=`artifacts/frontline-reviews/${kind}-review.diff`;await writeFile(output,text);console.log(output);
