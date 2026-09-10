// Immutable source evidence for the native material A/B route, not runtime code.
import {readFile,writeFile} from 'node:fs/promises';
const source=await readFile('src/engine/frontline-surface.js','utf8');
await writeFile('assets-src/frontline-ground-material/surface-before.js',source,{flag:'wx'});
