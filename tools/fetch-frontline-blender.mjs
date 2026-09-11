// Portable DCC scoped to this project's source assets; no system install.
import {mkdir,writeFile} from 'node:fs/promises';
const root='assets-src/tooling';await mkdir(root,{recursive:true});
const name='blender-4.5.0-windows-x64.zip';
const response=await fetch(`https://download.blender.org/release/Blender4.5/${name}`);
if(!response.ok)throw Error(`Blender download HTTP ${response.status}`);
await writeFile(`${root}/${name}`,Buffer.from(await response.arrayBuffer()));
console.log(`${root}/${name}`);
