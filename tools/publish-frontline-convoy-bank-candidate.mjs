// Explicitly approved bank-only runtime candidate. Original data and exposure
// remain available; immutable module snapshots support the isolated native A/B.
import {readFile,copyFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
const root='assets-src/frontline-convoy-bank-study/',require=createRequire(import.meta.url),sharp=require(path.resolve(process.argv[2]));
const data=JSON.parse(await readFile(root+'candidate-bed-data.json')),mask=JSON.parse(await readFile(root+'material/metadata.json'));
const sha=createHash('sha256').update(await readFile(root+'native-bed.f32')).digest('hex');
if(data.sha256!==sha||mask.groundSHA256!==sha)throw Error('Reviewed candidate dependencies are stale');
await mkdir(root+'runtime-before',{recursive:true});
for(const name of ['frontline-escarpment.js','frontline-terrain.js']){
 const dest=root+'runtime-before/'+name;
 try{await access(dest);}catch{await copyFile('src/engine/'+name,dest);}
}
await copyFile(root+'candidate-bed-data.json','src/engine/frontline-convoy-bank-data.json');
await sharp(root+'material/geology-mask.png').webp({lossless:true,effort:6}).toFile('public/textures/frontline/geology-mask-convoy-bank.webp');
console.log(JSON.stringify({candidatePublished:true,sha256:sha,originalBedAndMaskRetained:true}));
