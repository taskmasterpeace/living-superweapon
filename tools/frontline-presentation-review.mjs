import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const pairs=[
 ['artifacts/frontline-reviews/powerworld-before-aircraft.js','src/engine/powerworld.js'],
 ['artifacts/frontline-reviews/pwTitle-before-aircraft.js','src/engine/pwTitle.js'],
 ['artifacts/frontline-reviews/world-before-material-arrays.js','src/engine/world.js'],
 ['artifacts/frontline-reviews/sound-library-before-spatial.js','src/core/sound-library.js'],
 ['artifacts/frontline-reviews/sound-catalog-before-aircraft.js','src/data/sound-library.js'],
];
let output='# Scoped parent presentation review — dirty shared checkout, not branch diff\n';
for(const [before,after] of pairs){const r=spawnSync('git',['diff','--no-index','--no-ext-diff','--unified=30',before,after],{encoding:'utf8',maxBuffer:12e6});if(r.status>1)throw Error(r.stderr);output+=r.stdout+'\n';}
for(const path of ['src/engine/frontline-aircraft.js','src/engine/frontline-terrain.js','tools/frontline-aircraft.test.mjs','tools/frontline-aircraft-browser.mjs','tools/frontline-terrain.test.mjs','tools/sound-library-spatial.test.mjs','public/models/frontline/AIRCRAFT-LICENSE.md'])output+='\n## '+path+'\n'+await readFile(path,'utf8');
await writeFile('artifacts/frontline-reviews/presentation-review.diff',output);
console.log('artifacts/frontline-reviews/presentation-review.diff');
