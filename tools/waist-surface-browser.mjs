import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const tag=process.argv.includes('--before')?'before':process.argv.includes('--final')?'final':'after',out=`artifacts/waist-surface/${tag}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}}),page=await context.newPage();
const errors=[],scenes=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 for(const hero of ['titan','sol']){
  await page.goto(`http://127.0.0.1:5180/studio.html?hero=${hero}`);await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
  await page.getByRole('button',{name:'Pause preview',exact:true}).click();await page.getByLabel('Motion state',{exact:true}).selectOption('attack');
  await page.evaluate(async({hero,tag})=>{
   const p=STUDIO.preview,c=p.combat,f=p.fighter,T=await import('/node_modules/three/build/three.module.js');
   p.playing=false;p.view='front';p.controls.enabled=false;c.reset(f,true,'attack');
   c.slot='lmb';c.secondarySlot=null;c.shooterMotion='ground-right';c.elevation=35;c.distance=55;c.motion='orbit-right';c.targetSpeed=25;
   f.slots.lmb.def={...f.slots.lmb.def,type:'beam',charge:false,chest:true,faceOrigin:false,castStyle:'chest-brace',radius:.3,kiPerSec:1,cost:1,dps:1};
   f.level=10;f.energyInfinite=true;
   window.waistStep=(frame,view)=>{
    const time=(frame+1)/60;c.step(time,1/60);
    const offset={front:[8,9,25],right:[25,8,1],back:[-8,9,-25],left:[-25,8,1]}[view];
    p.camera.position.copy(f.pos).add(new T.Vector3(...offset));p.controls.target.copy(f.pos).y+=6;
    p.camera.fov=34;p.camera.lookAt(p.controls.target);p.camera.updateProjectionMatrix();
    document.querySelector('.view-tag').textContent=`${hero.toUpperCase()} / ${tag.toUpperCase()} / ${view.toUpperCase()}`;
    document.querySelector('.viewport-note').textContent='Surface inspection: real production moving chest pose, labeled test beam. No saved-kit or gameplay-camera changes.';
    document.querySelector('.attack-phase').textContent=`SEQUENCE / ${c.phase.toUpperCase()}`;
    document.querySelector('.measurements').textContent=`${time.toFixed(2)} s / ${c.damage.toFixed(1)} actual damage`;
    p.renderer.render(p.scene,p.camera);
    const geo=f.parts.torso.geometry,pos=geo.attributes.position;
    return {frame,phase:c.phase,position:f.pos.toArray(),vertices:pos.count,draws:p.renderer.info.render.calls,triangles:p.renderer.info.render.triangles,
     hem:Array.from({length:geo.userData.anatomy.segments},(_,i)=>new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(f.parts.torso.matrixWorld).toArray())};
   };
  },{hero,tag});
  const rows=[];
  for(const [from,to,view,label]of [[0,75,'front','entry'],[75,130,'right','right'],[130,190,'back','back'],[190,260,'left','left'],[260,360,'front','recovery']]){
   rows.push(...await page.evaluate(async({from,to,view})=>{const rows=[];for(let i=from;i<to;i++){rows.push(waistStep(i,view));await new Promise(requestAnimationFrame);}return rows;},{from,to,view}));
   await page.locator('.viewport').screenshot({path:`${out}/${hero}-${label}.png`});
  }
  scenes.push({hero,rows});
  if(tag==='final'&&hero==='titan'){
   await page.evaluate(async()=>{
    const {Ragdoll}=await import('/src/engine/ragdoll.js'),T=await import('/node_modules/three/build/three.module.js');
    const p=STUDIO.preview,f=p.fighter;f.pos.y=50;f.flying=true;f.gait='airborne';f.vel.set(0,0,45);f._animate(1/60);
    const rag=new Ragdoll(f,new T.Vector3(35,25,18));
    window.waistRagdollStep=frame=>{
     rag.step(1/60,p.combat.game);rag.apply(f);
     p.controls.target.copy(rag.P.chest.pos);p.camera.position.copy(p.controls.target).add(new T.Vector3(10,5,20));p.camera.lookAt(p.controls.target);
     document.querySelector('.view-tag').textContent='TITAN / FINAL / REAL RAGDOLL';
     document.querySelector('.attack-phase').textContent='WAIST / FALL AND RECOVERY INSPECTION';
     document.querySelector('.measurements').textContent=`${((frame+1)/60).toFixed(2)} s`;
     p.renderer.render(p.scene,p.camera);return {frame,chest:rag.P.chest.pos.toArray(),pelvis:rag.P.pelvis.pos.toArray()};
    };
   });
   const rows=[];
   for(const [from,to,label]of [[0,40,'tumble'],[40,80,'landing'],[80,120,'settled']]){
    rows.push(...await page.evaluate(async({from,to})=>{const rows=[];for(let i=from;i<to;i++){rows.push(waistRagdollStep(i));await new Promise(requestAnimationFrame);}return rows;},{from,to}));
    await page.locator('.viewport').screenshot({path:`${out}/titan-ragdoll-${label}.png`});
   }
   scenes.push({hero:'titan-ragdoll',rows});
  }
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({tag,frames:scenes.reduce((n,s)=>n+s.rows.length,0),errors}));
}finally{
 await writeFile(out+'/results.json',JSON.stringify({tag,scenes,errors},null,2));
 await context.close();await page.video()?.saveAs(out+'/waist-motion.webm');await browser.close();
}
