import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const label=process.argv[2]||'paired-clearance';assert.match(label,/^[a-z-]+$/);
const out=`artifacts/torso-range/${label}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}});
const page=await context.newPage(),errors=[],rows=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 const source=await page.evaluate(async()=>{
  const p=STUDIO.preview,f=p.fighter,T=await import('/node_modules/three/build/three.module.js'),{runSlot}=await import('/src/engine/abilities.js'),{GROUND_SOURCE}=await import('/src/engine/ground-motion.js');
  p.playing=false;p.combat.clear();p.controls.enabled=false;f._game=p.combat.game;
  f.applyForm({frame:{scale:.65}});
  Object.assign(f,{animT:0,_openSky:true,hasAimWorld:true,energyInfinite:true,level:10,flying:false,gait:'grounded'});f.pos.set(0,0,0);f.vel.set(14*.65,0,0);
  f.slots.lmb.def={type:'beam',castStyle:'two-hand',name:'Paired clearance inspection',cost:1,kiPerSec:1,dps:1,steer:8,color:'#ffc54a'};
  const aim=(yaw,height=0)=>{f.facing=yaw*Math.PI/180;f.aim.set(Math.sin(f.facing),0,Math.cos(f.facing));f.aimWorld.copy(f.pos).addScaledVector(f.aim,100);f.aimWorld.y+=8+height;f.aim3.copy(f.aimWorld).sub(f.pos).normalize();};
  const step=()=>{f.animT+=1/60;f.advanceActionPose(1/60);f._animate(1/60);f._game.projectiles.update(1/60,f._game);f.obj.updateMatrixWorld(true);};
  aim(0);for(let i=0;i<60;i++)step();
  const forward=new T.Vector3(),q=new T.Quaternion();let at=0;
  window.pairedView=angle=>{
   if(angle===null)p.camera.position.set(12,8,18);
   else{forward.set(0,0,1).applyQuaternion(f.parts.torso.getWorldQuaternion(q));const yaw=Math.atan2(forward.x,forward.z)+angle;p.camera.position.set(Math.sin(yaw)*18,8,Math.cos(yaw)*18);}
   p.controls.target.set(0,3.5,0);p.camera.fov=30;p.camera.lookAt(p.controls.target);p.camera.updateProjectionMatrix();
   document.querySelector('.view-tag').textContent='KANO / TWO-HAND PROCEDURAL OVERLAY / HEIGHT 0.65 / FULL-WIDTH CHEST';
   const beam=f.slots.lmb.active;
   document.querySelector('.measurements').textContent=`${f._groundMotion?.take||'Neutral'} · ${beam?.pendingLaunch?'Preparing':beam?.sustaining?'Emitting':'Released'} · frame ${at}`;
   document.querySelector('.viewport-note').textContent='Production Studio rig + live power. Fixed-velocity articulation inspection, not integrated travel or gameplay-camera evidence.';
   p.renderer.render(p.scene,p.camera);
  };
  window.pairedStep=i=>{
   at=i;if(i===0)runSlot(f,'lmb',{pressed:true,held:true,released:false,dt:1/60},f._game);
   if(i===60)aim(170,25);if(i===120)aim(-100,-30);if(i===180)aim(5,60);
   if(i===240)runSlot(f,'lmb',{pressed:false,held:false,released:true,dt:1/60},f._game);
   if(i===300)f.vel.set(0,0,0);step();pairedView(null);
   const beam=f.slots.lmb.active;
   return {frame:i,take:f._groundMotion?.take,phase:f._groundMotion?.phase,emitting:!!(beam?.sustaining&&beam.emissionAge>0),pending:!!beam?.pendingLaunch,root:f.pos.toArray(),velocity:f.vel.toArray()};
  };
  return {body:f.parts.skin?.id||'procedural sculpt',ground:GROUND_SOURCE,overlay:'procedural two-hand',scale:f.parts.rig.pivotHeight/4.6};
 });
 let start=0;
 for(const [end,name]of [[1,'start'],[13,'first-shot'],[91,'quarter'],[181,'mid'],[271,'three-quarter'],[361,'end']]){
  rows.push(...await page.evaluate(async({start,end})=>{const result=[];for(let i=start;i<end;i++){result.push(pairedStep(i));await new Promise(requestAnimationFrame);}return result;},{start,end}));
  for(const [angle,view]of [[0,'front'],[-Math.PI/2,'left'],[Math.PI/2,'right'],[Math.PI,'rear']]){
   await page.evaluate(angle=>pairedView(angle),angle);await page.locator('.viewport').screenshot({path:`${out}/${name}-${view}.png`});
  }
  start=end;
 }
 assert.ok(rows.some(r=>r.emitting));assert.equal(rows.at(-1).emitting,false);assert.deepEqual(errors,[]);
 await writeFile(`${out}/results.json`,JSON.stringify({source,scope:'Multi-phase/multi-angle Studio articulation, not whole-game acceptance',rows,errors},null,2));
 console.log(JSON.stringify({source,frames:rows.length,errors}));
}finally{await context.close();await page.video()?.saveAs(`${out}/paired-clearance.webm`);await browser.close();}
