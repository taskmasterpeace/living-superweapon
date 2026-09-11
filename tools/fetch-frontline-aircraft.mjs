// Two specifically licensed CC-BY-4.0 models. Do not fetch the repository's
// noncommercial or commercially restricted assets (see its per-file LICENSE).
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='https://raw.githubusercontent.com/srcejon/sdrangel-3d-models/main';
await mkdir('assets-src/aircraft',{recursive:true});
for(const name of ['helicopter.glb','f15.glb']){
 const response=await fetch(`${root}/${name}`);if(!response.ok)throw Error(`${name}: HTTP ${response.status}`);
 if(Number(response.headers.get('content-length'))>25e6)throw Error('Source exceeds review budget');
 const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>25e6||bytes.toString('ascii',0,4)!=='glTF')throw Error('Unexpected model payload');
 await writeFile(`assets-src/aircraft/${name}`,bytes);
 console.log(name,bytes.length,createHash('sha256').update(bytes).digest('hex'));
}
