import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const label=process.argv[2]||'work-in-progress';assert.match(label,/^[a-z-]+$/);
const scenario=process.argv[3]||'sustain';assert.ok(['sustain','launch','descent'].includes(scenario));
const out=`artifacts/axial-cofire/${label}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}});
const page=await context.newPage(),errors=[],rows=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.evaluate(async scenario=>{
  const p=STUDIO.preview,f=p.fighter,T=await import('/node_modules/three/build/three.module.js'),{runSlot}=await import('/src/engine/abilities.js');
  p.playing=false;p.view='front';p.controls.enabled=false;p.combat.clear();f._game=p.combat.game;
  Object.assign(f,{animT:0,_openSky:true,flying:true,gait:'airborne',hasAimWorld:true,energyInfinite:true,level:10});f.pos.set(0,50,0);f.vel.set(0,0,0);
  if(scenario==='descent')f.vel.y=-25;
  const common={type:'beam',cost:1,kiPerSec:1,dps:1};
  f.slots.lmb.def={...common,name:'Fast optic test',faceOrigin:true,steer:8,color:'#ff6644'};
  f.slots.rmb.def={...common,name:'Slow chest test',chest:true,steer:1,color:'#ffc54a'};
  const aim=(degrees,height=0)=>{f.facing=degrees*Math.PI/180;f.aim.set(Math.sin(f.facing),0,Math.cos(f.facing));f.aimWorld.copy(f.pos).addScaledVector(f.aim,100);f.aimWorld.y+=8+height;f.aim3.copy(f.aimWorld).sub(f.pos).normalize();};
  const step=()=>{f.animT+=1/60;f.advanceActionPose(1/60);f._animate(1/60);f._game.projectiles.update(1/60,f._game);f._game.vfx.update(1/60);f.obj.updateMatrixWorld(true);};
  aim(0);for(let i=0;i<60;i++)step();for(const key of scenario==='launch'?['lmb']:['lmb','rmb'])runSlot(f,key,{pressed:true,held:true,released:false,dt:1/60},f._game);for(let i=0;i<60;i++)step();
  const forward=part=>new T.Vector3(0,0,1).applyQuaternion(part.getWorldQuaternion(new T.Quaternion()));
  window.cofireStep=frame=>{
   if(frame===30){aim(170,25);if(scenario==='launch')runSlot(f,'rmb',{pressed:true,held:true,released:false,dt:1/60},f._game);}if(frame===120){f.vel.set(45,0,0);aim(-100,-30);}if(frame===210){f.slots.rmb.active.end();aim(5,60);}
   step();const view=frame<120?[22,14,28]:[-26,14,20];
   p.camera.position.set(view[0],50+view[1],view[2]);p.controls.target.set(0,55,0);p.camera.fov=44;p.camera.lookAt(p.controls.target);p.camera.updateProjectionMatrix();
   const head=forward(f.parts.head),chest=forward(f.parts.torso),eye=f.slots.lmb.active,core=f.slots.rmb.active;
   for(const b of [eye,core])if(b?.pendingLaunch&&(b.pn!==0||b.grp.visible||b.light.intensity!==0||b._voice))throw new Error('Unfired preparation has energy presentation');
   const row={frame,time:frame/60,eye:eye.emissionAge>0?head.angleTo(eye.dir)*180/Math.PI:null,chest:core?.sustaining&&core.emissionAge>0?chest.angleTo(core.dir)*180/Math.PI:null,neck:head.angleTo(chest)*180/Math.PI,chestPending:!!core?.pendingLaunch,chestPackets:core?.pn??0};
   document.querySelector('.view-tag').textContent=`SOL RIG / OPTIC + CHEST / ${scenario.toUpperCase()} INSPECTION`;
   document.querySelector('.viewport-note').textContent='Actual beams and rig. Fixed-velocity articulation inspection; not gameplay camera, integrated physics or FPS evidence.';
   document.querySelector('.measurements').textContent=`Eye error ${row.eye?.toFixed(1)??'aligning'}° / chest ${row.chest?.toFixed(1)??(row.chestPending?'ALIGNING':'released')} / neck ${row.neck.toFixed(1)}°`;
   p.renderer.render(p.scene,p.camera);return row;
  };
 },scenario);
 for(const [start,end,name]of [[0,30,'cofire'],[30,31,'first-reversal-frame'],[31,42,'hover-reversal'],[42,120,'hover-settled'],[120,132,'flight-reversal'],[132,210,'flight-settled'],[210,300,'chest-release']]){
  rows.push(...await page.evaluate(async({start,end})=>{const result=[];for(let i=start;i<end;i++){result.push(cofireStep(i));await new Promise(requestAnimationFrame);}return result;},{start,end}));
  await page.locator('.viewport').screenshot({path:`${out}/${name}.png`});
 }
 const pendingFrames=rows.filter(r=>r.chestPending).length;
 if(scenario==='launch'){assert.ok(pendingFrames>0&&pendingFrames<=18,'Chest must turn and emit within .3 seconds');assert.ok(rows.some(r=>r.frame>=30&&r.frame<48&&r.chest!==null),'No timely real first emission');}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({label,scenario,frames:rows.length,pendingFrames,maxEye:Math.max(...rows.map(r=>r.eye||0)),maxChest:Math.max(...rows.map(r=>r.chest||0)),maxNeck:Math.max(...rows.map(r=>r.neck)),errors}));
}finally{await writeFile(`${out}/results.json`,JSON.stringify({rows,errors},null,2));await context.close();await page.video()?.saveAs(`${out}/axial-cofire.webm`);await browser.close();}
