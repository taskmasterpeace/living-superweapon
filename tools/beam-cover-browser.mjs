import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const out='artifacts/beam-cover/verified';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}});
const page=await context.newPage(),errors=[],results=[];
page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.evaluate(async()=>{
  const p=STUDIO.preview,{runSlot}=await import('/src/engine/abilities.js'),THREE=await import('/node_modules/three/build/three.module.js');
  const {World}=await import('/src/engine/world.js');
  p.playing=false;p.view='front';p.controls.enabled=false;
  const f=p.fighter;p.combat.reset(f,true,'beam');const g=p.combat.game,foe=p.combat.target;
  f._game=g;f.level=10;f.energyInfinite=true;f.hasAimWorld=true;f.facing=0;f.aim.set(0,0,1);f.pos.set(0,0,0);
  f.flying=false;f.gait='grounded';f._openSky=true;f.obj.position.copy(f.pos);f._rangedPose=null;f._combatAim.weight=0;
  f.slots={lmb:{def:{type:'beam',name:'Optic contact',faceOrigin:true,castStyle:'optic-focus',cost:1,dps:20,kiPerSec:1,steer:8,color:'#ff7658',radius:.15,tipSpeed:2000},cd:0},
   rmb:{def:{type:'beam',name:'Palm contact',castStyle:'palm',cost:1,dps:20,kiPerSec:1,steer:12,color:'#ffcf58',radius:.25,tipSpeed:2000},cd:0}};
  const wall={x:0,z:18,hx:14,hz:.02};g.world.cover=[];g.world.interiors=[{x:0,z:18,hx:14,hz:.02,top:22,walls:[wall]}];
  g.world.hitInteriorWall=World.prototype.hitInteriorWall;
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(28,22,.04),new THREE.MeshStandardMaterial({color:'#7f8178',roughness:.75,metalness:.08}));
  mesh.position.set(0,11,18);mesh.castShadow=true;mesh.receiveShadow=true;p.scene.add(mesh);
  const outline=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color:'#c3bc9e'}));mesh.add(outline);
  foe.pos.set(0,3,42);foe.obj.position.copy(foe.pos);foe.invuln=0;foe.flying=true;
  p.camera.position.set(36,18,7);p.controls.target.set(0,8,16);p.camera.fov=47;p.camera.lookAt(p.controls.target);p.camera.updateProjectionMatrix();
  document.querySelector('.view-tag').textContent='THIN-WALL CONTACT / MOVING EYES + PALM';
  document.querySelector('.viewport-note').textContent='Production beams and collision geometry. Side inspection view; the target beyond the wall must receive zero damage.';
  window.coverStep=(frame,dt)=>{
   const time=Math.max(0,frame)*dt;g.time+=dt;
   f.pos.x=frame<0?0:Math.sin(time*1.4)*3;f.vel.set(frame<0?0:Math.cos(time*1.4)*4.2,0,0);f.obj.position.copy(f.pos);
   f.aimWorld.copy(foe.pos).add(new THREE.Vector3(0,5.2,0));f.aim3.copy(f.aimWorld).sub(f.muzzle(new THREE.Vector3())).normalize();
   if(frame===10)for(const key of ['lmb','rmb'])runSlot(f,key,{pressed:true,held:true,released:false,dt},g);
   if(frame===105)for(const key of ['lmb','rmb'])runSlot(f,key,{pressed:false,held:false,released:true,dt},g);
   f.advanceActionPose(dt);f.animT+=dt;f._animate(dt);f.obj.updateMatrixWorld(true);
   g.projectiles.update(dt,g);g.particles.update(dt);g.vfx.update(dt);p.renderer.render(p.scene,p.camera);
   return {frame,damage:p.combat.damage,streams:g.projectiles.list.filter(s=>s.path).map(s=>({sustaining:s.sustaining,blocked:s.blocked,
    tip:s.tip.position.toArray(),muzzle:s.muzzle.toArray(),radius:s.radius,maxZ:Math.max(...Array.from({length:s.pn},(_,i)=>s.path[i*3+2]))}))};
  };
  window.inspectNearWall=()=>{
   // Reproduce the saved protruding-source case with a continuous approach,
   // hold, release and retreat. No substitute beam source or hand placement.
   for(const shot of g.projectiles.list)shot._dispose(g);g.projectiles.list.length=0;for(const s of Object.values(f.slots))s.active=null;
   wall.z=2.4;g.world.interiors[0].z=2.4;mesh.position.z=2.4;
   f.pos.set(0,0,-4);f.obj.position.copy(f.pos);f.vel.set(0,0,0);f.facing=0;f.aimWorld.set(0,8,42);f.aim3.set(0,0,1);
   p.camera.position.set(19,10,1);p.controls.target.set(0,6,2);p.camera.lookAt(p.controls.target);p.renderer.render(p.scene,p.camera);
   document.querySelector('.view-tag').textContent='NEAR-WALL ARM RETRACTION / ACTUAL PALM SOURCE';
   document.querySelector('.viewport-note').textContent='Continuous approach, hold, release and retreat. The arm retracts; the beam remains attached to the real palm.';
   window.nearWallStep=(frame,dt)=>{
    g.time+=dt;f.pos.z=frame<160?Math.min(0,-4+frame*dt*4):-Math.min(4,(frame-160)*dt*4);
    f.vel.set(0,0,frame<30?4:frame>=160?-4:0);f.obj.position.copy(f.pos);
    if(frame===0)runSlot(f,'rmb',{pressed:true,held:true,released:false,dt},g);
    if(frame===150)runSlot(f,'rmb',{pressed:false,held:false,released:true,dt},g);
    f.advanceActionPose(dt);f.animT+=dt;f._animate(dt);f.obj.updateMatrixWorld(true);g.projectiles.update(dt,g);g.particles.update(dt);g.vfx.update(dt);p.renderer.render(p.scene,p.camera);
    const hand=f.parts.armR.children[2].getWorldPosition(new THREE.Vector3()),beam=f.slots.rmb.active;let meshMaxZ=-Infinity;
    for(const arm of [f.parts.armL,f.parts.armR])for(const mesh of [arm.children[1],arm.children[2]])for(let v=0;v<mesh.geometry.attributes.position.count;v++){
     meshMaxZ=Math.max(meshMaxZ,mesh.getVertexPosition(v,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).z);
    }
    return {frame,bodyRadius:f.radius,bodyZ:f.pos.z,wallNear:wall.z-wall.hz,hand:hand.toArray(),meshMaxZ,
     active:!!beam?.sustaining,muzzle:beam?.muzzle.toArray(),tip:beam?.tip.position.toArray(),blocked:beam?.blocked};
   };
  };
  for(let i=0;i<90;i++)coverStep(-1,1/60);
 });
 for(const [from,to,phase]of [[0,9,'approach'],[9,52,'contact'],[52,105,'sustain'],[105,114,'release'],[114,155,'recovery']]){
  results.push(...await page.evaluate(async({from,to})=>{const rows=[];for(let i=from;i<to;i++){rows.push(coverStep(i,1/30));await new Promise(requestAnimationFrame);}return rows;},{from,to}));
  await page.locator('.viewport').screenshot({path:`${out}/${phase}.png`});
 }
 const active=results.filter(r=>r.frame>=15&&r.frame<105);
 assert.ok(active.every(r=>r.streams.length===2&&r.streams.every(s=>s.blocked&&s.tip[2]<18)));
 assert.ok(results.every(r=>r.damage===0&&r.streams.every(s=>s.maxZ<18)),'neither damage nor the released stream may cross the wall');
 await page.evaluate(()=>inspectNearWall());const nearWall=[];
 for(const [from,to,phase]of [[0,30,'approach'],[30,90,'hold'],[90,150,'sustain'],[150,160,'release'],[160,200,'retreat']]){
  nearWall.push(...await page.evaluate(async({from,to})=>{const rows=[];for(let i=from;i<to;i++){rows.push(nearWallStep(i,1/30));await new Promise(requestAnimationFrame);}return rows;},{from,to}));
  await page.locator('.viewport').screenshot({path:`${out}/near-wall-${phase}.png`});
 }
 assert.ok(nearWall.every(r=>r.meshMaxZ<r.wallNear),'rendered palms and forearms must stay in front of cover');
 assert.ok(nearWall.filter(r=>r.frame>35&&r.active).every(r=>r.blocked&&r.tip[2]<r.wallNear&&Math.hypot(...r.hand.map((v,i)=>v-r.muzzle[i]))<1e-5));
 assert.deepEqual(errors,[]);await writeFile(out+'/results.json',JSON.stringify({results,nearWall,errors},null,2));
 console.log(JSON.stringify({frames:results.length,activeFrames:active.length,maxTipZ:Math.max(...active.flatMap(r=>r.streams.map(s=>s.tip[2]))),damage:results.at(-1).damage,
  nearWall:{frames:nearWall.length,minMeshClearance:Math.min(...nearWall.map(r=>r.wallNear-r.meshMaxZ)),hold:nearWall[100]},errors}));
}catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}
finally{await context.close();await page.video()?.saveAs(out+'/thin-wall-contact.webm');await browser.close();}
