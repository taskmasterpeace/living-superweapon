// Read-only baseline substitution in this diagnostic process, never in Vite.
import {registerHooks} from 'node:module';
import {readFile} from 'node:fs/promises';
const source=await readFile('artifacts/cloth-union/runtime-before.txt','utf8');
const target=new URL('../src/engine/ragdoll-cape.js',import.meta.url).href;
registerHooks({load(url,context,next){return url===target?{format:'module',source,shortCircuit:true}:next(url,context);}});
process.argv[2]='union-before-cpu';await import('./cloth-cpu.mjs');
