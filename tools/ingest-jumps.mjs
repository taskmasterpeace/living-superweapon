import {writeFile} from 'node:fs/promises';
import {loadSource,bakeJumps} from './lib/quaternius-source.mjs';
const bank=bakeJumps(await loadSource());
await writeFile(new URL('../src/data/jump-bank.json',import.meta.url),JSON.stringify(bank)+'\n');
console.log('Baked licensed jump takes:',Object.values(bank.clips).map(c=>`${c.take}: ${c.frames.length} samples / ${c.duration.toFixed(4)}s`).join(', '));
