import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const label=process.argv[2]||'work-in-progress';assert.match(label,/^[a-z-]+$/);
const scenario=process.argv[3]||'optic';assert.ok(['optic','chest-handoff','rifle'].includes(scenario));
const out=`artifacts/flight-split-aim/${label}${scenario==='optic'?'':`/${scenario}`}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}});
const page=await context.newPage(),errors=[],rows=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`http://127.0.0.1:5180/studio.html?hero=${scenario==='rifle'?'sarge':'sol'}`);await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.evaluate(async scenario=>{
  const p=STUDIO.preview,f=p.fighter,T=await import('/node_modules/three/build/three.module.js'),{runSlot}=await import('/src/engine/abilities.js');
  p.playing=false;p.view='front';p.controls.enabled=false;p.combat.clear();f._game=p.combat.game;
  Object.assign(f,{_openSky:true,flying:true,gait:'airborne',hasAimWorld:true,energyInfinite:true,level:10});f.pos.set(0,50,0);f.vel.set(40,0,0);
  if(scenario==='rifle'){f.animT=9;f.vel.x=-40;}
  if(scenario==='chest-handoff')f.slots.lmb.def={type:'beam',name:'Chest handoff inspection',chest:true,castStyle:'chest-brace',cost:1,kiPerSec:1,dps:1,steer:8,color:'#ffc54a'};
  const aim=(degrees,height=0)=>{f.facing=degrees*Math.PI/180;f.aim.set(Math.sin(f.facing),0,Math.cos(f.facing));f.aimWorld.copy(f.pos).addScaledVector(f.aim,100);f.aimWorld.y+=8+height;f.aim3.copy(f.aimWorld).sub(f.pos).normalize();};
  const step=(held=true)=>{if(scenario==='rifle')runSlot(f,'lmb',{pressed:false,held,released:!held,dt:1/60},f._game);f.animT+=1/60;f.advanceActionPose(1/60);f._animate(1/60);f._game.projectiles.update(1/60,f._game);f._game.vfx.update(1/60);f.obj.updateMatrixWorld(true);};
  aim(0);runSlot(f,'lmb',{pressed:true,held:true,released:false,dt:1/60},f._game);if(scenario!=='rifle')for(let i=0;i<120;i++)step();
  const travel=new T.ArrowHelper(new T.Vector3(1,0,0),new T.Vector3(0,49,0),9,0xffc34f,1.5,.7);p.scene.add(travel);
  const forward=part=>new T.Vector3(0,0,1).applyQuaternion(part.getWorldQuaternion(new T.Quaternion()));
  const {firearmEmitter}=await import('/src/engine/weapon-emission.js');
  window.splitStep=frame=>{
   if(scenario==='rifle'){if(frame===60)aim(-170,25);if(frame===120)aim(100,-30);if(frame===180)aim(-5,60);}
   else if(scenario==='optic'){if(frame===60)aim(40,25);if(frame===120)aim(170,15);}
   else if(frame<180){const descend=Math.floor(frame/60/.2)%2;f.vel.set(descend?.9:40,descend?-30:0,0);travel.setDirection(f.vel.clone().normalize());}
   if(frame===180&&scenario!=='rifle'){f.vel.set(0,0,0);runSlot(f,'lmb',{pressed:false,held:false,released:true,dt:1/60},f._game);}
   step(frame<210);travel.visible=scenario!=='rifle'&&frame<180;
   const view=frame<60?[21,14,26]:frame<120?[-24,12,24]:frame<180?[22,15,-26]:[21,14,26];
   p.camera.position.set(view[0],50+view[1],view[2]);p.controls.target.set(0,55,0);p.camera.fov=38;p.camera.lookAt(p.controls.target);p.camera.updateProjectionMatrix();
   const pelvis=forward(f.parts.pelvis).setY(0).normalize(),head=forward(f.parts.head),chest=forward(f.parts.torso),beam=f.slots.lmb.active;
   const row={frame,time:frame/60,travel:pelvis.x,separation:pelvis.angleTo(chest)*180/Math.PI,neck:head.angleTo(chest)*180/Math.PI,beamError:beam?.sustaining?(scenario==='optic'?head:chest).angleTo(beam.dir)*180/Math.PI:null};
   if(scenario==='rifle'&&frame<210){
    const source=firearmEmitter(f,f.slots.lmb.def),ray=f.aimWorld.clone().sub(source.socket.getWorldPosition(new T.Vector3())).normalize();
    row.beamError=new T.Vector3(0,-1,0).applyQuaternion(source.hand.getWorldQuaternion(new T.Quaternion())).angleTo(ray)*180/Math.PI;
   }
   document.querySelector('.view-tag').textContent=scenario==='optic'?'SOL / FLIGHT + INDEPENDENT OPTIC AIM':'SOL RIG / TEST CHEST POWER / LATERAL–DESCENT HANDOFF';
   if(scenario==='rifle')document.querySelector('.view-tag').textContent='SARGE / RIFLE FLIGHT TURN / PHASE 9 / STAGED INSPECTION';
   document.querySelector('.viewport-note').textContent='Gold arrow = travel. Fixed-velocity articulation inspection; not gameplay camera, physics integration, or FPS evidence.';
   if(scenario==='rifle')document.querySelector('.viewport-note').textContent='Fixed-velocity rig/contact inspection. Native Jump Jets gameplay is recorded separately; not gameplay-camera or FPS evidence.';
   document.querySelector('.measurements').textContent=`Pelvis/X ${row.travel.toFixed(2)} / emitter-ray error ${row.beamError?.toFixed(1)??'released'}°`;
   p.renderer.render(p.scene,p.camera);return row;
  };
 },scenario);
 for(const [start,end,name]of [[0,60,'side-cast'],[60,90,'elevated-turn'],[90,120,'elevated-settled'],[120,121,'exact-contact-frame'],[121,130,'rear-transition'],[130,180,'rear-settled'],[180,210,'high-turn'],[210,240,'release']]){
  rows.push(...await page.evaluate(async({start,end})=>{const result=[];for(let i=start;i<end;i++){result.push(splitStep(i));await new Promise(requestAnimationFrame);}return result;},{start,end}));
  await page.locator('.viewport').screenshot({path:`${out}/${name}.png`});
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({label,scenario,frames:rows.length,sideTravel:Math.min(...rows.slice(0,60).map(r=>r.travel)),maxBeamError:Math.max(...rows.map(r=>r.beamError||0)),maxNeck:Math.max(...rows.map(r=>r.neck)),errors}));
}finally{await writeFile(`${out}/results.json`,JSON.stringify({rows,errors},null,2));await context.close();await page.video()?.saveAs(`${out}/flight-split-aim.webm`);await browser.close();}
