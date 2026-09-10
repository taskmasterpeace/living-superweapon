// Existing licensed publisher metadata pins this source-only height map.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='assets-src/polyhaven/aerial_ground_rock',metadata=JSON.parse(await readFile(root+'/metadata.json','utf8'));
const file=metadata.files.Displacement['2k'].jpg,url=new URL(file.url);
if(url.hostname!=='dl.polyhaven.org'||url.protocol!=='https:')throw Error('Unexpected displacement source');
const response=await fetch(url);if(!response.ok)throw Error(`Displacement download ${response.status}`);
const bytes=Buffer.from(await response.arrayBuffer());
if(bytes.length!==file.size||createHash('md5').update(bytes).digest('hex')!==file.md5)throw Error('Publisher displacement integrity mismatch');
await writeFile(root+'/aerial_ground_rock_disp_2k.jpg',bytes);
console.log(JSON.stringify({source:url.href,bytes:bytes.length,md5:file.md5,author:metadata.info.authors,license:'Poly Haven CC0'}));
