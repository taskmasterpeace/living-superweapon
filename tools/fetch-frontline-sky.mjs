// Download the selected CC0 production sky, verifying the publisher's bytes.
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const id=process.argv[2]||'kloppenheim_05_puresky';
if(!['kloppenheim_05_puresky','kloppenheim_06_puresky','table_mountain_1_puresky'].includes(id))throw Error('Unreviewed sky asset');
const metadata=await fetch(`https://api.polyhaven.com/files/${id}`);
if(!metadata.ok)throw Error(`Metadata HTTP ${metadata.status}`);
const catalog=await metadata.json(),file=catalog.hdri['2k'].hdr,url=new URL(file.url);
if(url.hostname!=='dl.polyhaven.org'||url.protocol!=='https:')throw Error('Unexpected asset origin');
const response=await fetch(url);if(!response.ok)throw Error(`Download HTTP ${response.status}`);
const bytes=Buffer.from(await response.arrayBuffer());
if(bytes.length!==file.size||createHash('md5').update(bytes).digest('hex')!==file.md5)throw Error('Sky integrity mismatch');
await mkdir('public/textures/frontline',{recursive:true});
await writeFile(`public/textures/frontline/${id}-2k.hdr`,bytes);
await mkdir(`assets-src/polyhaven/${id}`,{recursive:true});
await writeFile(`assets-src/polyhaven/${id}/metadata.json`,JSON.stringify({id,source:`https://polyhaven.com/a/${id}`,license:'CC0',authors:['Greg Zaal','Jarod Guest'],file},null,2));
console.log(id,bytes.length,file.md5);
