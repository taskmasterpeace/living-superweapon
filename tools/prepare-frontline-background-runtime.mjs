import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
const source='assets-src/frontline-background-study/',snap=source+'runtime-before/';await mkdir(snap,{recursive:true});
for(const name of ['frontline-ground.js','frontline-layout.js','frontline-terrain.js']){
 let text=await readFile('src/engine/'+name,'utf8');text=text.replace(/(['"])\.\//g,'$1/src/engine/').replace(/(['"])\.\.\//g,'$1/src/');text=text.replace(/(['"])\/src\/engine\/(models|textures)\//g,'$1./$2/');
 await writeFile(snap+name,text,{flag:'wx'});
}
await writeFile('src/engine/frontline-background-layout.json',JSON.stringify(JSON.parse(await readFile(source+'layout.json','utf8'))));
await copyFile(source+'background-ridge-kit-optimized.glb','public/models/frontline/background-ridge-kit.glb');
console.log('Candidate dependencies prepared; no active runtime imports changed yet.');
