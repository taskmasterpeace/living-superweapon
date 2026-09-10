// Counter-evidence for the rejected union candidate. Both cases use the same
// native procedural flight, launch history and body simulation; only cloth differs.
import * as T from 'three';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
const candidate=process.argv.includes('--candidate');
if(candidate){
 const source=await readFile('tools/prototypes/ragdoll-cape-union.mjs','utf8');
 const target=new URL('../src/engine/ragdoll-cape.js',import.meta.url).href;
 registerHooks({load(url,context,next){return url===target?{format:'module',source,shortCircuit:true}:next(url,context);}});
}
const {clothFall}=await import('./helpers/cloth-fall.mjs');
const rows=[];
{
 const {f,rag,world}=clothFall({seed:99,frame:{scale:.65,bulk:1.65,head:1.4,neck:1.6,broad:1.6,stance:1.4},cover:[{x:52,z:3,hx:4,hz:4,top:4}]});
 try{
  const frames=[],cloth=rag.capePose,box=new T.Box3();
  for(let tick=1;tick<=720;tick++){
   rag.step(1/120,{world});rag.apply(f);
   box.makeEmpty();for(const p of cloth.points)box.expandByPoint(p.pos);
   let maxStretch=0;for(const link of cloth.links)maxStretch=Math.max(maxStretch,cloth.points[link.a].pos.distanceTo(cloth.points[link.b].pos)/link.length);
   frames.push({tick,maxStretch,span:box.getSize(new T.Vector3()).toArray(),chest:rag.P.chest.pos.toArray()});
  }
  rows.push({candidate,worst:frames.reduce((a,b)=>a.maxStretch>b.maxStretch?a:b),atDisplay22:frames[87],frames});
 }finally{f.dispose();}
}
const report={scope:'Rejected-candidate shape counter-evidence; world-space links and bounds, not gameplay FPS or cloth acceptance',rows};
await mkdir('artifacts/cloth-union',{recursive:true});await writeFile(`artifacts/cloth-union/${candidate?'candidate':'baseline'}-shape.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(rows.map(({frames,...row})=>row),null,2));
