// Source-only serialization: no src/ or public/ changes. The runtime candidate
// is published only after the explicitly coordinated editing window opens.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='assets-src/frontline-convoy-bank-study/';
const raw=await readFile(root+'native-bed.f32'),mask=JSON.parse(await readFile(root+'material/metadata.json'));
const sha256=createHash('sha256').update(raw).digest('hex');
if(raw.length!==257*257*4||mask.groundSHA256!==sha256)throw Error('Reviewed bed or matching material bake is stale');
const baseline=JSON.parse(await readFile('assets-src/frontline-escarpment-study/candidate-bed-data.json'));
const data={...baseline,encoded:raw.toString('base64'),sha256,sources:[...baseline.sources,'Original source-authored supporting convoy benches; exact native parking stencils retained']};
await writeFile(root+'candidate-bed-data.json',JSON.stringify(data));
console.log(JSON.stringify({sourceOnly:true,bytes:raw.length,sha256}));
