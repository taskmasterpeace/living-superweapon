import {chromium} from 'playwright';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/marketing/studio-approach-2026-09-13';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out}}),p=await c.newPage(),errors=[],rows=[];p.on('pageerror',e=>errors.push(e.message));
try{
 for(const hero of ['jelani','rage','sol']){
  await p.goto('http://127.0.0.1:5184/studio.html?hero='+hero);await p.waitForFunction(()=>window.STUDIO?.preview?.fighter);
  await p.getByRole('button',{name:'Pause preview',exact:true}).click();
  await p.getByLabel('Motion state',{exact:true}).selectOption('melee');
  await p.getByLabel('Melee stage',{exact:true}).selectOption('grounded');
  await p.getByLabel('Melee sequence',{exact:true}).selectOption('approach');
  const result=await p.evaluate(()=>{const v=STUDIO.preview;v.seek(0);const start=v.fighter.pos.toArray(),gap=v.fighter.pos.distanceTo(v.combat.target.pos);let maxHeight=0;for(let i=1;i<=120;i++){v.time=i/60;v.step(1/60,true,false);maxHeight=Math.max(maxHeight,v.fighter.pos.y);}const read=()=>({position:v.fighter.pos.toArray(),damage:v.combat.damage,contacts:v.combat.contacts});v.seek(2);const first=read();v.seek(0);v.seek(2);return {start,gap,maxHeight,first,replay:read()};});
  await writeFile(out+'/'+hero+'-observed.json',JSON.stringify(result,null,2));console.log(hero,JSON.stringify(result));assert(result.gap>6);assert(result.first.position[2]>5,'Approach should cover ground');assert(result.first.contacts>0&&result.first.damage>0,'Native punch must connect');assert.deepEqual(result.first,result.replay,'Scrubbing must reproduce movement/contact');rows.push({hero,...result});
  await p.evaluate(()=>STUDIO.preview.seek(.5));await p.locator('.viewport').screenshot({path:out+'/'+hero+'.png'});
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,rows,errors,staging:'Authoring simulation: production Fighter/MeleeSystem on empty Studio stage; deterministic seek, not native gameplay input or obstacle acceptance.'},null,2));console.log(JSON.stringify(rows));
}catch(e){await p.screenshot({path:out+'/failure.png'});throw e;}finally{const v=await p.video().path();await c.close();await copyFile(v,out+'/studio-approach.webm');await b.close();}
