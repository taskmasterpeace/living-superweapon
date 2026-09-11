import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

// Scripted native runtime evidence, not a player-input or frame-performance test.
const out='artifacts/construct-tank';
await mkdir(out,{recursive:true});
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180';
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:out,size:{width:1280,height:800}}});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(base+'/powerworld.html');
 await page.waitForFunction(()=>window.LSW?.game);
 await page.locator('#pwGo').click();
 await page.evaluate(async()=>{
  const {game:g,hud,THREE:T}=LSW,{runSlot}=await import('/src/engine/abilities.js');
  const {sweepSplitObstacle}=await import('/src/engine/projectile-contact.js');
  g.startMode('powerworld',{p1:'aurum',p2:'kano'});
  const f=g.player;
  for(const e of g.entities){e.ai=null;if(e!==f)e.pos.set(800,100,800);}
  g.controlPlayer=()=>{};g.controlBot=()=>{};g.news.enabled=false;
  // Pick existing clear terrain; do not remove stage cover or decorative rocks.
  const solids=[...g.world.cover,...(g.world.rocks||[])];
  let origin=null;
  for(const z of [-300,-200,-100,0,100,200]){
   for(const x of [-300,-200,-100,0,100,200]){
    if(solids.every(c=>{
     const cx=c.x??c.mesh?.position.x??c.pos?.x,cz=c.z??c.mesh?.position.z??c.pos?.z;
     return !Number.isFinite(cx)||!Number.isFinite(cz)||Math.abs(cx-(x+25))>80+(c.hx??c.r??5)||Math.abs(cz-(z+50))>90+(c.hz??c.r??5);
    })){origin={x,z};break;}
   }
   if(origin)break;
  }
  if(!origin)throw Error('No untouched clear native tank lane found');
  const {x,z}=origin;
  f.pos.set(x,g.world.heightAt(x,z),z);f.vel.set(0,0,0);f.aim.set(0,0,1);f.aim3.set(0,0,1);
  f.flying=false;f.gait='grounded';f.invuln=30;f.level=10;f.sheet.kiRegenMult=0;f.ki=140;
  g.aimPoint.set(x,0,z+16);hud.setPlayer(f.def);g.hardLock=null;
  const st=f.slots.q;
  st.def={type:'construct',name:'Tank runtime fixture',construct:'tank',cost:24,cd:8,duration:12,
   constructLifetime:'upkeep',constructKiPerSec:2,moveSpeed:12,turnRate:1.8,
   damage:18,interval:1.2,speed:90,range:90,blast:6,color:'#7dff9e'};
  st.cd=0;
  const update=g.update.bind(g),render=g.world.render.bind(g.world);
  g.update=()=>{};g.world.render=()=>{};
  for(let i=0;i<120;i++){update(1/60);g.input.endFrame();}
  const shots=[],hits=[];let phase='formation',time=0,tank=null;
  const spawn=g.projectiles.spawnProjectile.bind(g.projectiles);
  g.projectiles.spawnProjectile=(owner,options)=>{
   const p=spawn(owner,options);
   if(owner===f)shots.push({phase,time,state:tank?.state,origin:options.pos.toArray(),velocity:options.vel.toArray(),owner:owner.def.id});
   return p;
  };
  const onHit=g.onHit.bind(g);
  g.onHit=(target,amount,opts,blocked)=>{
   if(opts?.src===f)hits.push({phase,time,target:target.def.id,amount,blocked});
   return onHit(target,amount,opts,blocked);
  };
  const cast=()=>runSlot(f,'q',{pressed:true,held:true,released:false,dt:1/60},g);
  cast();tank=st.active;
  if(!tank||tank.kind!=='tank')throw Error('Native tank cast rejected on clear terrain');
  const note=document.createElement('div');
  note.style.cssText='position:fixed;left:20px;top:85px;padding:10px;background:#17251de8;color:#f1eee1;z-index:10000;font:13px system-ui';
  document.body.append(note);
  const frames=[];
  const barrelBlocked=()=>!tank.dead&&!!sweepSplitObstacle(
   {cover:g.world.cover.filter(c=>c!==tank._cover),interiors:g.world.interiors||[]},
   tank.turret.getWorldPosition(new T.Vector3()),tank.muzzle.getWorldPosition(new T.Vector3()),.62,{},false);
  const state=()=>({phase,time,pos:tank.pos.toArray(),yaw:tank.obj.rotation.y,state:tank.state,ki:f.ki,
   dead:tank.dead,cover:!!tank._cover&&g.world.cover.includes(tank._cover),barrelBlocked:barrelBlocked(),shots:shots.length});
  const step=(n=1,inspect=true)=>{
   for(let i=0;i<n;i++){update(1/60);g.input.endFrame();time+=1/60;frames.push(state());}
   if(inspect){g.world.camera.position.set(x+70,48,z-15);g.world.camera.lookAt(x+18,4,z+45);g.world.camera.updateMatrixWorld(true);}
   note.textContent=`Native tank runtime fixture · ${phase} · ${tank.state} · ${f.ki.toFixed(1)} ki · ${shots.length} shots${inspect?' · inspection lens (not player camera)':' · production player camera'}`;
   render();
  };
  window.tankProof={g,f,st,tank,T,origin,shots,hits,frames,state,step,cast,detailRender:render,setPhase:value=>{phase=value;}};
  step(1,false);
 });
 const initial=await page.evaluate(()=>{const names=[];tankProof.tank.obj.traverse(o=>{if(o.name)names.push(o.name);});return {...tankProof.state(),names};});
 assert.equal(initial.dead,false);assert.equal(initial.cover,true);
 await page.screenshot({path:out+'/production-camera.png'});
 await page.evaluate(()=>tankProof.step(59));
 await page.screenshot({path:out+'/formed.png'});
 await page.evaluate(()=>{
  const {g,tank:c}=tankProof,cam=g.world.camera;tankProof.savedFov=cam.fov;
  cam.fov=38;cam.position.copy(c.pos).add(new LSW.THREE.Vector3(24,16,-29));cam.lookAt(c.pos.x,c.pos.y+4,c.pos.z+3);cam.updateProjectionMatrix();cam.updateMatrixWorld(true);
  // An extra labeled inspection view; no simulation or player-camera change.
  tankProof.detailRender();
 });
 await page.screenshot({path:out+'/tank-detail.png'});
 await page.evaluate(()=>{const {g,savedFov}=tankProof;g.world.camera.fov=savedFov;g.world.camera.updateProjectionMatrix();});
 await page.evaluate(()=>{const p=tankProof;p.setPhase('travel');p.g.aimPoint.set(p.origin.x,0,p.origin.z+48);});
 for(let i=0;i<45;i++){await page.evaluate(()=>tankProof.step(4));if(i===20)await page.screenshot({path:out+'/travel.png'});}
 const traveled=await page.evaluate(()=>tankProof.state());
 assert.ok(traveled.pos[2]>initial.pos[2]+20,'Native tank must translate, not just animate tracks');
 await page.evaluate(()=>{const p=tankProof;p.setPhase('turn');p.g.aimPoint.set(p.origin.x+24,0,p.origin.z+48);});
 for(let i=0;i<60;i++){await page.evaluate(()=>tankProof.step(4));if(i===10)await page.screenshot({path:out+'/turn.png'});}
 await page.evaluate(()=>{
  const p=tankProof;p.setPhase('cannon');p.g.aimPoint.copy(p.tank.pos).setY(0);
  p.foe=p.g.spawnEnemy('sarge',{x:p.tank.pos.x+18,z:p.tank.pos.z+38,team:1});
  p.foe.ai=null;p.foe.invuln=0;p.foe.vel.set(0,0,0);p.foe.flying=false;p.foe.gait='grounded';p.foeStartHp=p.foe.hp;
 });
 for(let i=0;i<60;i++){await page.evaluate(()=>tankProof.step(4));if(i===25)await page.screenshot({path:out+'/cannon.png'});}
 const cannon=await page.evaluate(()=>({startHp:tankProof.foeStartHp,endHp:tankProof.foe.hp,shots:tankProof.shots,hits:tankProof.hits}));
 assert.ok(cannon.shots.length>0);assert.ok(cannon.endHp<cannon.startHp,'Native cannon projectile must damage real target');
 assert.ok(cannon.shots.every(s=>s.state!=='moving'),'No firing while moving');
 await page.evaluate(()=>{
  const p=tankProof,{T,g,tank:c}=p;p.setPhase('obstacle');p.foe.pos.set(800,100,800);
  const geometry=new T.BoxGeometry(.2,14,40),material=new T.MeshStandardMaterial({color:'#9b9075',roughness:.8});
  const mesh=new T.Mesh(geometry,material);mesh.position.set(c.pos.x+20,7,c.pos.z);g.scene.add(mesh);
  p.obstacle={x:mesh.position.x,z:mesh.position.z,hx:.1,hz:20,top:14,h:14,bottom:0,r:20,projectileShape:'box',mesh};
  g.world.cover.push(p.obstacle);g.world.refreshFogBoxes();g.aimPoint.set(c.pos.x+50,0,c.pos.z);
  if(p.state().barrelBlocked)throw Error('Test wall was inserted through barrel; invalid static-approach fixture');
 });
 for(let i=0;i<60;i++)await page.evaluate(()=>tankProof.step(4));
 await page.screenshot({path:out+'/blocked.png'});
 const blocked=await page.evaluate(()=>({...tankProof.state(),edge:tankProof.tank._cover.x+tankProof.tank._cover.hx,wall:tankProof.obstacle.x-tankProof.obstacle.hx}));
 assert.equal(blocked.state,'blocked');assert.ok(blocked.edge<=blocked.wall+1e-5,'Tank must stop before thin native cover');
 const exhausted=await page.evaluate(()=>{const p=tankProof;p.setPhase('depletion');const before=p.shots.length;p.f.ki=.01;p.step(1);return {...p.state(),before,detached:p.tank.obj.parent===null};});
 assert.equal(exhausted.ki,0);assert.equal(exhausted.dead,true);assert.equal(exhausted.cover,false);assert.equal(exhausted.detached,true);assert.equal(exhausted.shots,exhausted.before);
 await page.screenshot({path:out+'/depleted.png'});
 const frames=await page.evaluate(()=>tankProof.frames);
 assert.ok(frames.every(f=>!f.barrelBlocked),'Actual barrel capsule must remain outside native cover throughout the run');
 assert.deepEqual(errors,[]);
 await writeFile(out+'/results.json',JSON.stringify({initial,traveled,cannon,blocked,exhausted,frames,errors},null,2));
 console.log(JSON.stringify({frames:frames.length,traveled,cannon:{shots:cannon.shots.length,damage:cannon.startHp-cannon.endHp},blocked,exhausted,errors}));
}catch(error){
 const failure=await page.evaluate(()=>window.tankProof?{
  state:tankProof.state(),frames:tankProof.frames.slice(-30),shots:tankProof.shots,hits:tankProof.hits,
 }:null).catch(()=>null);
 await writeFile(out+'/failure.json',JSON.stringify({message:error.message,failure,errors},null,2));
 await page.screenshot({path:out+'/failure.png'}).catch(()=>{});
 throw error;
}finally{
 await writeFile(out+'/browser-errors.json',JSON.stringify(errors));
 await context.close();await page.video()?.saveAs(out+'/native-tank.webm');await browser.close();
}
