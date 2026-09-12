import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {buildAnimationCatalog} from '../src/data/animation-catalog.js';
const path=resolve(process.argv[2]||'artifacts/animation-library/catalog.json');
const catalog=buildAnimationCatalog();await mkdir(dirname(path),{recursive:true});
await writeFile(path,JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify({path,entries:catalog.entries.length,invalid:catalog.entries.filter(e=>e.issues.length).map(e=>e.id)}));
if(catalog.entries.some(e=>e.issues.length))process.exitCode=1;
