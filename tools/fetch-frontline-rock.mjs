// Reproducible source-asset fetch. Public CC0 model, no credentials or runtime CDN.
import {mkdir,writeFile,access} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const id=process.argv[2]||'namaqualand_cliff_02';
if(!['namaqualand_cliff_02','namaqualand_boulder_02','namaqualand_boulder_04'].includes(id))throw Error('Unapproved asset id');
const root=path.resolve('assets-src/polyhaven',id);
const response=await fetch(`https://api.polyhaven.com/files/${id}`);if(!response.ok)throw Error(`Metadata HTTP ${response.status}`);
const entry=(await response.json()).gltf['1k'].gltf;
const files={[`${id}_1k.gltf`]:entry,...entry.include};
for(const [relative,file] of Object.entries(files)){
 const destination=path.resolve(root,relative);if(!destination.startsWith(root+path.sep))throw Error('Invalid relative asset path');
 const url=new URL(file.url);if(url.hostname!=='dl.polyhaven.org'||url.protocol!=='https:')throw Error('Unexpected asset origin');
 try{await access(destination);console.log('Exists:',relative);continue;}catch{}
 const downloaded=await fetch(url);if(!downloaded.ok)throw Error(`Download HTTP ${downloaded.status}`);
 const bytes=Buffer.from(await downloaded.arrayBuffer());if(bytes.length!==file.size||createHash('md5').update(bytes).digest('hex')!==file.md5)throw Error(`Asset integrity mismatch: ${relative}`);
 await mkdir(path.dirname(destination),{recursive:true});await writeFile(destination,bytes);console.log(relative,bytes.length);
}
