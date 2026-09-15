import {readFileSync,writeFileSync,copyFileSync,mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
const source='D:/lsw/.worktrees/pw-launch-inheritance';
const files=['src/data/fleet-handling.js','src/data/vehicle-envelopes.js',...['fleet-pilot','vehicle-motion','vehicle-pilot','vehicle-rig','vehicle-sim'].map(n=>`src/engine/${n}.js`),...['fleet-handling','fleet-pilot','vehicle-motion','vehicle-pilot','vehicle-rig','vehicle-sim'].map(n=>`tools/${n}.test.mjs`)];
for(const f of files){if(existsSync(f))throw Error('Refuse overwrite '+f);copyFileSync(path.join(source,f),f);}
for(const f of ['src/engine/game.js','src/boot.js']){
 let s=readFileSync('artifacts/integration-20260915/'+f.replaceAll('/','_')+'.merged','utf8');
 s=s.replace(/^<<<<<<< .*\n|^=======\n|^>>>>>>> .*\n/gm,'');
 if(s.includes('<<<<<<<'))throw Error('Conflict remains');writeFileSync(f,s);
}
const ids=['motorcycle','tank','mech-light','helicopter','jet-a'];
const sourceCatalog=JSON.parse(readFileSync(path.join(source,'public/reference-fleet/catalog.json')));
const models=ids.map(id=>{const row=sourceCatalog.models.find(m=>m.id===id);if(!row)throw Error(id);return row;});
mkdirSync('public/reference-fleet',{recursive:true});writeFileSync('public/reference-fleet/catalog.json',JSON.stringify({...sourceCatalog,models},null,2));
for(const row of models){const rel='public/'+row.url.replace(/^\.\//,'');mkdirSync(path.dirname(rel),{recursive:true});copyFileSync(path.join(source,rel),rel);const manifest=path.join(path.dirname(rel),'manifest.json');if(existsSync(path.join(source,manifest)))copyFileSync(path.join(source,manifest),manifest);}
console.log('Imported seven modules, six focused suites, reviewed game/boot merge and five model packages.');
