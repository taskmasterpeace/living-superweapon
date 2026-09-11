import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const label=process.argv[2]||'work-in-progress';
assert.match(label,/^[a-z-]+$/);
const scenario=process.argv[3]||'strafe';assert.ok(['strafe','rapid-hover','prep-fly'].includes(scenario));
const out=`artifacts/optic-reversal/${label}${scenario==='strafe'?'':`/${scenario}`}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}});
const page=await context.newPage(),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.evaluate(async scenario=>{
  const p=STUDIO.preview,f=p.fighter,THREE=await import('/node_modules/three/build/three.module.js'),{runSlot}=await import('/src/engine/abilities.js');
  p.playing=false;p.view='front';p.controls.enabled=false;p.combat.clear();f._game=p.combat.game;
  const air=scenario!=='strafe',preparing=scenario==='prep-fly';
  f._openSky=true;f.hasAimWorld=true;f.flying=air;f.gait=air?'airborne':'grounded';f.pos.set(0,air?50:0,0);f.vel.set(air?0:14,0,preparing?45:0);f.level=10;f.energyInfinite=true;
  if(preparing){
   // Labeled configurable test power, never written to Studio storage.
   f.slots.lmb.def={...f.slots.lmb.def,steer:1};
   f.slots.rmb.def={type:'beam',name:'Chest preparation fixture',chest:true,charge:true,maxCharge:20,steer:2,cost:1,dps:1,kiPerSec:1,color:'#ffc24a'};
  }
  const aim=(degrees,height)=>{f.facing=degrees*Math.PI/180;f.aim.set(Math.sin(f.facing),0,Math.cos(f.facing));f.aimWorld.copy(f.pos).addScaledVector(f.aim,100);f.aimWorld.y+=8+height;f.aim3.copy(f.aimWorld).sub(f.pos).normalize();};
  const step=()=>{f.animT+=1/60;f.advanceActionPose(1/60);f._animate(1/60);f._game.projectiles.update(1/60,f._game);f._game.vfx.update(1/60);f.obj.updateMatrixWorld(true);};
  aim(0,0);for(let i=0;i<60;i++)step();runSlot(f,'lmb',{pressed:true,held:true,released:false,dt:1/60},f._game);for(let i=0;i<60;i++)step();
  const forward=part=>new THREE.Vector3(0,0,1).applyQuaternion(part.getWorldQuaternion(new THREE.Quaternion()));
  window.reversalStep=frame=>{
   if(scenario==='rapid-hover'){const alternate=Math.floor(frame/60/.15)%2;aim(alternate?-10:170,alternate?-30:25);}
   else{if(frame===0)aim(170,25);if(frame===60)aim(-100,-30);if(frame===120)aim(5,60);}
   if(preparing)runSlot(f,'rmb',{pressed:frame===0,held:true,released:false,dt:1/60},f._game);
   step();
   p.camera.position.set(21,14+f.pos.y,26);p.controls.target.set(0,5+f.pos.y,0);p.camera.fov=38;p.camera.lookAt(p.controls.target);p.camera.updateProjectionMatrix();
   const head=forward(f.parts.head),torso=forward(f.parts.torso),beam=f.slots.lmb.active;
   const row={frame,time:frame/60,neck:head.angleTo(torso)*180/Math.PI,beamError:head.angleTo(beam.dir)*180/Math.PI,gait:f._groundMotion.weight,heading:f.obj.rotation.y};
   document.querySelector('.view-tag').textContent=`SOL / ${scenario.toUpperCase()} / OPTIC TARGET REVERSAL`;
   document.querySelector('.viewport-note').textContent=preparing?'Configurable test: slow optics + preparing chest. No saved-kit changes. Inspection camera.':'Production gait and traveling beam. Fixed-velocity articulation inspection, not gameplay camera or FPS evidence.';
   document.querySelector('.measurements').textContent=`Eye/ray error ${row.beamError.toFixed(1)}° / source gait ${(row.gait*100).toFixed(0)}%`;
   p.renderer.render(p.scene,p.camera);return row;
  };
 },scenario);
 for(const [start,end,name]of [[0,60,'first-turn'],[60,62,'reversal'],[62,68,'turn-through'],[68,120,'settled-rear'],[120,180,'return']]){
  rows.push(...await page.evaluate(async({start,end})=>{const result=[];for(let i=start;i<end;i++){result.push(reversalStep(i));await new Promise(requestAnimationFrame);}return result;},{start,end}));
  await page.locator('.viewport').screenshot({path:`${out}/${name}.png`});
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({label,scenario,frames:rows.length,maxBeamError:Math.max(...rows.map(r=>r.beamError)),maxNeck:Math.max(...rows.map(r=>r.neck)),minGait:Math.min(...rows.map(r=>r.gait)),errors}));
}finally{
 await writeFile(`${out}/results.json`,JSON.stringify({rows,errors},null,2));await context.close();await page.video()?.saveAs(`${out}/optic-reversal.webm`);await browser.close();
}
