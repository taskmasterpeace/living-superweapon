// Approved candidate asset serialization. Keeps all previous public assets and
// source baselines intact so the native A/B can route either complete version.
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const folder='assets-src/frontline-escarpment-study/',require=createRequire(import.meta.url),sharp=require(path.resolve(process.argv[2]));
for(const [source,target]of [['candidate-bed-data.json','frontline-escarpment-data.json'],['layout.json','frontline-escarpment-layout.json']])await writeFile('src/engine/'+target,JSON.stringify(JSON.parse(await readFile(folder+source,'utf8'))));
await copyFile(folder+'tiered-escarpment-kit-optimized.glb','public/models/frontline/tiered-escarpment-kit.glb');
await sharp(folder+'material/geology-mask.png').webp({lossless:true,effort:6}).toFile('public/textures/frontline/geology-mask-escarpment.webp');
console.log('Published candidate dependencies; previous assets remain intact.');
