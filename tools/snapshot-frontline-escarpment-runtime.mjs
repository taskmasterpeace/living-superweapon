// Baseline routes need absolute engine imports after Vite transforms this copy.
// Immutable snapshots are reference evidence, never copied back over live files.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const folder='assets-src/frontline-escarpment-study/runtime-before/';await mkdir(folder,{recursive:true});
for(const name of ['frontline-ground.js','frontline-terrain.js','frontline-layout.js','powerworld.js']){
 let text=await readFile('src/engine/'+name,'utf8');text=text.replace(/(['"])\.\//g,'$1/src/engine/').replace(/(['"])\.\.\//g,'$1/src/');
 // Asset URLs are relative to the HTML document, not ES modules. Revert those
 // string paths after normalizing imports; only module import specifiers move.
 text=text.replace(/(['"])\/src\/engine\/(models|textures)\//g,'$1./$2/');
 await writeFile(folder+name,text,{flag:'wx'});
}
