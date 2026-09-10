import {writeFile} from 'node:fs/promises';
import {loadSource,bakeLocomotion} from './lib/quaternius-source.mjs';
const bank=bakeLocomotion(await loadSource());
await writeFile(new URL('../src/data/locomotion-bank.json',import.meta.url),JSON.stringify(bank)+'\n');
console.log('Baked licensed takes:',Object.values(bank.clips).map(c=>`${c.take}: ${c.frames.length} samples / ${c.duration.toFixed(4)}s`).join(', '));
