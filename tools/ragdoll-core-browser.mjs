import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const tag=process.argv.includes('--before')?'before':process.argv.find(a=>a.startsWith('--label='))?.slice(8)||'final',root=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'artifacts/ragdoll-core',out=`${root}/${tag}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}}),page=await context.newPage();
const errors=[],scenes=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 for(const hero of ['titan','sol']){
  await page.goto(`http://127.0.0.1:5180/studio.html?hero=${hero}`);await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
  await page.getByRole('button',{name:'Pause preview',exact:true}).click();
  await page.evaluate(async({hero,tag})=>{
   const p=STUDIO.preview,f=p.fighter,T=await import('/node_modules/three/build/three.module.js'),{Ragdoll}=await import('/src/engine/ragdoll.js');
   p.playing=false;p.controls.enabled=false;p.combat.reset(f,true,'idle');
   f.animT=0;f._openSky=true;f.flying=true;f.gait='airborne';f.pos.set(20,50,-15);f.vel.set(14,0,45);f.facing=.9;f.aimWorld.set(65,25,90);f.hasAimWorld=true;
   for(let i=0;i<90;i++){f.animT+=1/60;f._animate(1/60);}
   f.obj.updateMatrixWorld(true);const initial=f.parts.torso.getWorldPosition(new T.Vector3());
   const random=Math.random;Math.random=()=>.5;const rag=new Ragdoll(f,new T.Vector3(35,25,18));Math.random=random;
   window.coreStep=(frame,view)=>{
    if(frame>=0){if(frame>0)rag.step(1/60,p.combat.game);rag.apply(f);}
    const focus=frame<0?initial:rag.P.chest.pos;
    p.controls.target.copy(focus);p.camera.position.copy(focus).add(new T.Vector3(...({front:[5,3,23],right:[23,3,1],back:[-5,3,-23],left:[-23,3,1]}[view])));
    p.camera.fov=34;p.camera.lookAt(p.controls.target);p.camera.updateProjectionMatrix();
    document.querySelector('.view-tag').textContent=`${hero.toUpperCase()} / ${tag.toUpperCase()} / ${view.toUpperCase()}`;
    document.querySelector('.viewport-note').textContent='Real production flight → ragdoll → terminal hold. Inspection camera; no saved-profile, kit or gameplay-camera changes.';
    document.querySelector('.attack-phase').textContent=frame<0?'FLIGHT / CAPTURED POSE':frame===0?'HANDOFF / NO PHYSICS STEP':rag.asleep?'RAGDOLL / SLEEP':'RAGDOLL / FALL AND CONTACT';
    document.querySelector('.measurements').textContent=frame<0?'Before ownership changes':`${(frame/60).toFixed(2)} s / physics`;
    p.renderer.render(p.scene,p.camera);
    return {frame,asleep:rag.asleep,chest:rag.P.chest.pos.toArray(),torso:f.parts.torso.getWorldPosition(new T.Vector3()).toArray(),head:f.parts.head.getWorldPosition(new T.Vector3()).toArray(),neck:f.parts.neck.getWorldPosition(new T.Vector3()).toArray(),draws:p.renderer.info.render.calls};
   };
  },{hero,tag});
  const rows=[];
  rows.push(await page.evaluate(()=>coreStep(-1,'front')));await page.locator('.viewport').screenshot({path:`${out}/${hero}-flight.png`});
  rows.push(await page.evaluate(()=>coreStep(0,'front')));await page.locator('.viewport').screenshot({path:`${out}/${hero}-handoff.png`});
  for(const [from,to,view,label]of [[1,60,'front','quarter'],[60,120,'right','mid'],[120,180,'back','three-quarter'],[180,300,'left','terminal']]){
   rows.push(...await page.evaluate(async({from,to,view})=>{const rows=[];for(let i=from;i<to;i++){rows.push(coreStep(i,view));await new Promise(requestAnimationFrame);}return rows;},{from,to,view}));
   await page.locator('.viewport').screenshot({path:`${out}/${hero}-${label}.png`});
  }
  scenes.push({hero,rows});
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({tag,frames:scenes.reduce((n,s)=>n+s.rows.length,0),errors}));
}finally{
 await writeFile(out+'/results.json',JSON.stringify({tag,scenes,errors},null,2));await context.close();await page.video()?.saveAs(out+'/core-motion.webm');await browser.close();
}
