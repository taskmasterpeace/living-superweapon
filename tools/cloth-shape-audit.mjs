// Native procedural flight and ragdoll; read-only substitution of cloth only.
import * as T from 'three';
import {registerHooks} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [label='current',sourceFile='src/engine/ragdoll-cape.js']=process.argv.slice(2);
assert.match(label,/^[a-z0-9-]+$/);
const source=await readFile(sourceFile,'utf8'),sourceHash=createHash('sha256').update(source).digest('hex');
const target=new URL('../src/engine/ragdoll-cape.js',import.meta.url).href;
registerHooks({load(url,context,next){return url===target?{format:'module',source,shortCircuit:true}:next(url,context);}});
const {clothFall}=await import('./helpers/cloth-fall.mjs');
const {f,rag,world}=clothFall({seed:99,frame:{scale:.65,bulk:1.65,head:1.4,neck:1.6,broad:1.6,stance:1.4},cover:[{x:52,z:3,hx:4,hz:4,top:4}]});
try{
 const c=rag.capePose,box=new T.Box3(),rows=[];
 for(let tick=0;tick<=720;tick++){
  if(tick){rag.step(1/120,{world});rag.apply(f);}
  box.makeEmpty();for(const p of c.points)box.expandByPoint(p.pos);
  let maxStretch=0;for(const l of c.links)maxStretch=Math.max(maxStretch,c.points[l.a].pos.distanceTo(c.points[l.b].pos)/l.length);
  rows.push({tick,maxStretch,span:box.getSize(new T.Vector3()).toArray(),chest:rag.P.chest.pos.toArray(),head:rag.P.head.pos.toArray(),pelvis:rag.P.pelvis.pos.toArray()});
 }
 const report={scope:'Native short/broad SOL seed99, 90 source flight frames then 720 ragdoll steps at120Hz. Cloth-only substitution; not an acceptance or FPS claim.',label,sourceFile,sourceHash,initial:rows[0],worst:rows.reduce((a,b)=>a.maxStretch>b.maxStretch?a:b),rows};
 assert.equal(createHash('sha256').update(await readFile(sourceFile,'utf8')).digest('hex'),sourceHash,'source changed during audit');
 await mkdir('artifacts/cloth-body-sweep',{recursive:true});await writeFile(`artifacts/cloth-body-sweep/${label}-shape.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({...report,rows:undefined},null,2));
}finally{f.dispose();}
