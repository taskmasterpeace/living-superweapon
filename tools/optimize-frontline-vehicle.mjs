import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const result=spawnSync(process.platform==='win32'?'npx.cmd':'npx',[
 '--yes','@gltf-transform/cli@4.5.0','optimize',
 'assets-src/frontline-vehicles/armored-scout.raw.glb','public/models/frontline/armored-scout.glb',
 '--compress','false','--flatten','false','--join','false','--instance','false',
 '--palette','false','--simplify','false','--texture-compress','auto','--texture-size','1024',
 '--prune-attributes','false',
],{cwd:root,stdio:'inherit',shell:process.platform==='win32'});
if(result.status!==0)process.exit(result.status??1);
