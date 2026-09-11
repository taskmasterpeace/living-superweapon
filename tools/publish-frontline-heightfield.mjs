// Generated asset serialization only. Author/review source before publishing.
import {readFile,writeFile} from 'node:fs/promises';
const source='assets-src/frontline-heightfield-candidate/';
for(const [from,to] of [['relief-delta.json','frontline-bank-data.json'],['scanned-chip.json','frontline-chip-data.json'],['chip-placements.json','frontline-chip-placements.json']]){
 const data=JSON.parse(await readFile(source+from,'utf8'));
 await writeFile('src/engine/'+to,JSON.stringify(data));
 console.log(`Published generated ${from} → ${to}`);
}
