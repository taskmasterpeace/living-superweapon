// Source-only serialization. Never writes src/ or public/; integration follows
// a separate explicit review/window. Float32 bytes retain protected land exactly.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const folder='assets-src/frontline-escarpment-study/';
const bytes=await readFile(folder+'native-bed.f32');
const source={segments:256,halfSpan:1028,encoding:'float32-le',encoded:bytes.toString('base64'),sha256:createHash('sha256').update(bytes).digest('hex'),sources:['Poly Haven CC0 Rock Face: Greg Zaal / Dario Barresi','Poly Haven CC0 Aerial Ground Rock: Rob Tuytel','Original source-authored tiered escarpment bed']};
if(bytes.length!==257*257*4)throw Error('Reviewed native bed has incorrect dimensions');
await writeFile(folder+'candidate-bed-data.json',JSON.stringify(source));
console.log(JSON.stringify({bytes:bytes.length,sha256:source.sha256,sourceOnly:true}));
