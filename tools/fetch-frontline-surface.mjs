// Public CC0 surfaces, pinned by publisher size + MD5. Local runtime only.
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const selections={rock_face:['Diffuse','nor_gl','Rough','Displacement'],aerial_ground_rock:['diff','nor_gl','rough']};
for(const [id,channels]of Object.entries(selections)){
 const response=await fetch(`https://api.polyhaven.com/files/${id}`);if(!response.ok)throw Error(`Metadata ${response.status}`);
 const metadata=await response.json(),info=await(await fetch(`https://api.polyhaven.com/info/${id}`)).json();
 const root=path.resolve('assets-src/polyhaven',id);await mkdir(root,{recursive:true});
 await writeFile(path.join(root,'metadata.json'),JSON.stringify({info,files:metadata},null,2));
 for(const channel of channels){
  const key=Object.keys(metadata).find(k=>k.toLowerCase()===channel.toLowerCase()||k.toLowerCase()===channel.toLowerCase()+'use'||k.toLowerCase()===channel.toLowerCase()+'ness');
  if(!key)throw Error(`Missing ${id}/${channel}: ${Object.keys(metadata)}`);
  const file=metadata[key]['2k'].jpg,url=new URL(file.url);
  if(url.hostname!=='dl.polyhaven.org')throw Error('Unexpected source');
  const download=await fetch(url);if(!download.ok)throw Error(`Download ${download.status}`);
  const bytes=Buffer.from(await download.arrayBuffer());
  if(bytes.length!==file.size||createHash('md5').update(bytes).digest('hex')!==file.md5)throw Error('Integrity mismatch');
  await writeFile(path.join(root,path.basename(url.pathname)),bytes);console.log(id,key,bytes.length);
 }
}
