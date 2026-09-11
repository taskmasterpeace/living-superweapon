// Immutable isolated cliff shading baseline, before any signed-basis fix.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const out='assets-src/frontline-cliff-normal';await mkdir(out,{recursive:true});
await writeFile(out+'/surface-before.js',await readFile('src/engine/frontline-surface.js','utf8'),{flag:'wx'});
