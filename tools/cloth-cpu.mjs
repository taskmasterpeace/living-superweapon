import {cpus} from 'node:os';
import {mkdir,writeFile} from 'node:fs/promises';
import {clothFall} from './helpers/cloth-fall.mjs';
const label=process.argv[2]||'cloth-cpu';
if(!/^[a-z-]+$/.test(label))throw new Error('Use a simple lowercase report label');
const rows=[];
function summary(values){
 if(!values.length)return null;
 const sorted=[...values].sort((a,b)=>a-b);
 return {samples:values.length,meanMs:values.reduce((a,b)=>a+b,0)/values.length,p95Ms:sorted[Math.floor(sorted.length*.95)],maxMs:sorted.at(-1)};
}
for(const seed of [null,31])for(const hz of [30,60,120]){
 const {f,rag,world}=clothFall({seed});try{
  const cloth=rag.capePose,update=cloth.update,active=[],sleep=[];let maxSurfacePasses=0,passes=0;
  const surface=cloth.collideSurface;cloth.collideSurface=function(world){passes++;return surface.call(this,world);};
  cloth.update=function(dt,world){const wasAsleep=this.asleep,start=performance.now();passes=0;update.call(this,dt,world);(wasAsleep?sleep:active).push(performance.now()-start);maxSurfacePasses=Math.max(maxSurfacePasses,passes);};
  for(let i=0;i<hz*16;i++){rag.step(1/hz,{world});rag.apply(f);}
  rows.push({seed:seed??'constant .5',hz,clothAsleep:cloth.asleep,bodyAsleep:rag.asleep,maxSurfacePasses,active:summary(active),sleep:summary(sleep)});
 }finally{f.dispose();}
}
const report={scope:'Node CPU timing of production cloth.update, not renderer/GPU/FPS or full combat; includes contact/geometry work, excludes skeleton update',node:process.version,cpu:cpus()[0]?.model,rows};
await mkdir('artifacts/cloth-landing',{recursive:true});await writeFile(`artifacts/cloth-landing/${label}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
