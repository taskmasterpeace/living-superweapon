import {writeFile} from 'node:fs/promises';
import {loadSource,bakeStrikes,loadHeavySource,bakeHeavyStrikes} from './lib/quaternius-source.mjs';
const bank=bakeStrikes(await loadSource());
await writeFile(new URL('../src/data/strike-bank.json',import.meta.url),JSON.stringify(bank));
console.log('Baked one-shot strikes:',Object.values(bank.clips).map(c=>`${c.take}: ${c.frames.length} samples / ${c.duration}s`).join(', '));
const heavy=bakeHeavyStrikes(await loadHeavySource());
await writeFile(new URL('../src/data/heavy-strike-bank.json',import.meta.url),JSON.stringify(heavy));
console.log('Baked heavy strikes:',heavy.clips.power.take,heavy.clips.power.frames.length,'samples');
