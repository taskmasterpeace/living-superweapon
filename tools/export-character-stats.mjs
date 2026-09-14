import {writeFile} from 'node:fs/promises';
import {ROSTER} from '../src/data/characters.js';
import {ATTR_DEFS,bakeSheet} from '../src/data/ranks.js';
const rows=ROSTER.map(d=>({id:d.id,name:d.name,hp:d.hp,energy:d.ki,speed:d.speed,flightTier:d.flightTier??0,...bakeSheet(d)}));
await writeFile(new URL('../docs/CHARACTER_STATS.json',import.meta.url),JSON.stringify(rows,null,2)+'\n');
const keys=ATTR_DEFS.map(a=>a.k);
const lines=['# Power World character attribute reference','', 'Generated from current roster definitions and bakeSheet. Regenerate with `node tools/export-character-stats.mjs`. Values are base definitions, not live buffs, equipment, progression or current HP.','', 'Attributes use a 1–10 ladder. Displayed Might/Vigor are derived from strength/rank and HP respectively; do not assume editing either sheet value automatically changes lifting or maximum HP. Fighting-based grab timing and Agility-based grab approach remain proposed, not installed.','', '| Character | '+ATTR_DEFS.map(a=>a.name).join(' | ')+' | Base HP | Base energy |','|---|'+keys.map(()=> '---:|').join('')+'---:|---:|',...rows.map(r=>'| '+r.name+' | '+keys.map(k=>r.attrs[k]).join(' | ')+' | '+r.hp+' | '+r.energy+' |')];
await writeFile(new URL('../docs/CHARACTER_STATS.md',import.meta.url),lines.join('\n')+'\n');
console.log('Exported '+rows.length+' character sheets');
