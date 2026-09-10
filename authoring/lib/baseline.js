// Measure what the game already ships so budgets are grounded in production, not guessed.
// Classes: body (skinned humanoid bodies from src/data/hero-body-bank.json), equipment
// (frontline field gear GLBs), prop (frontline kit GLBs), motion (bundled pose banks).
import {readFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {REPO_ROOT} from './paths.js';
import {measureGlb} from './measure.js';
import {BUDGET_KEYS} from './budgets.js';

const EQUIPMENT_FILES=['field-armor.glb','field-boot.glb','field-greaves.glb','field-harness.glb'];
function fold(samples){
 const max={},mean={};
 for(const key of BUDGET_KEYS){
  const values=samples.map(s=>s.measured[key]).filter(Number.isFinite);
  max[key]=values.length?Math.max(...values):0;mean[key]=values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):0;
 }
 return {count:samples.length,max,mean,samples:samples.map(s=>({name:s.name,...s.measured}))};
}
export async function measureBaseline(){
 const frontline=resolve(REPO_ROOT,'public','models','frontline');
 const files=(await readdir(frontline)).filter(f=>f.endsWith('.glb'));
 const equipment=[],prop=[];
 for(const f of files){
  const bytes=await readFile(join(frontline,f));
  const m=await measureGlb(bytes);
  const measured={triangles:m.triangles,drawCalls:m.drawCalls,materials:m.materials,bones:m.bones,textures:m.textures,bytes:m.bytes};
  (EQUIPMENT_FILES.includes(f)?equipment:prop).push({name:`public/models/frontline/${f}`,measured});
 }
 const bank=JSON.parse(await readFile(resolve(REPO_ROOT,'src','data','hero-body-bank.json'),'utf8'));
 const body=[];
 for(const [id,b] of Object.entries(bank.bodies)){
  let triangles=0;for(const mesh of b.meshes)triangles+=Math.floor(mesh.index.length/3);
  body.push({name:`hero-body-bank:${id}`,measured:{triangles,drawCalls:b.meshes.length,materials:new Set(b.meshes.map(m=>m.material)).size,bones:b.joints.length,textures:1,bytes:Buffer.byteLength(JSON.stringify(b))}});
 }
 const motion=[];
 for(const file of ['locomotion-bank.json','strike-bank.json','heavy-strike-bank.json','jump-bank.json']){
  let text;try{text=await readFile(resolve(REPO_ROOT,'src','data',file),'utf8');}catch{continue;}
  const bankJson=JSON.parse(text);
  let frames=0;for(const clip of Object.values(bankJson.clips))frames+=clip.frames.length;
  motion.push({name:`src/data/${file}`,measured:{triangles:0,drawCalls:0,materials:0,bones:0,textures:0,bytes:Buffer.byteLength(text)},frames});
 }
 return {format:'pw-production-baseline',formatVersion:1,measuredFrom:'pinned combat baseline bcf63279cdf8c99cbdbc5ad66ee142645de93639',
  classes:{body:fold(body),equipment:fold(equipment),prop:fold(prop),motion:fold(motion)}};
}
