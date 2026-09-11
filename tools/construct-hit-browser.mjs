import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const out='artifacts/construct-hit';await mkdir(out,{recursive:true});
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(base+'/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(async()=>{
  const {game:g,THREE:T,hud}=LSW,{runSlot}=await import('/src/engine/abilities.js');
  g.startMode('powerworld',{p1:'aurum',p2:'sol'});const f=g.player;
  for(const e of g.entities){e.ai=null;if(e!==f)e.pos.set(800,100,800);}
  const source=g.spawnEnemy('sol',{x:-300,z:-35,team:1});source.ai=null;source.invuln=0;
  source.faceDir(0,-1);source.aim3.set(0,0,-1);source.hasAimWorld=true;source.aimWorld.set(-300,7,-70);
  source.powerBuff=1;source.sheet.kiRegenMult=0;
  g.controlPlayer=()=>{};g.controlBot=()=>{};g.news.enabled=false;g.hardLock=null;
  f.pos.set(-300,0,-100);f.vel.set(0,0,0);f.flying=false;f.gait='grounded';f.invuln=0;f.level=10;f.sheet.kiRegenMult=0;f.ki=120;
  f.faceDir(0,1);f.aim3.set(0,0,1);
  hud.setPlayer(f.def);g.aimPoint.set(-300,0,-70);
  const update=g.update.bind(g),render=g.world.render.bind(g.world);g.update=()=>{};g.world.render=()=>{};
  for(let i=0;i<60;i++){update(1/60);g.input.endFrame();}
  const st=f.slots.q,explosions=[],frames=[];let construct=null,phase='setup',beamHeld=false,beamPressed=false;
  const area=g.areaDamage.bind(g);
  g.areaDamage=(owner,pos,radius,damage,...rest)=>{
   if(owner===source)explosions.push({phase,pos:pos.toArray(),radius,damage,power:owner.powerBuff});
   return area(owner,pos,radius,damage,...rest);
  };
  const note=document.createElement('div');note.style.cssText='position:fixed;left:20px;top:85px;padding:9px;background:#17251de8;color:#f1eee1;z-index:10000;font:13px system-ui';document.body.append(note);
  const cast=()=>runSlot(f,'q',{pressed:true,held:true,released:false,dt:1/60},g);
  const state=()=>({phase,ki:f.ki,hp:f.hp,dead:construct?.dead,cover:!!construct?._cover&&g.world.cover.includes(construct._cover),
   hitCount:construct?.hitCount||0,damageReceived:construct?.damageReceived||0,kiSpent:construct?.kiSpent||0,
   beam:!!source.slots.lmb.active,tip:source.slots.lmb.active?.tip?.position.toArray()});
  const step=(n=1)=>{
   for(let i=0;i<n;i++){
    if(beamHeld){runSlot(source,'lmb',{pressed:beamPressed,held:true,released:false,dt:1/60},g);beamPressed=false;}
    update(1/60);g.input.endFrame();frames.push(state());
   }
   const cam=g.world.camera;cam.position.set(-267,23,-91);cam.lookAt(-300,6,-65);cam.updateMatrixWorld(true);
   note.textContent=`Native receiver fixture · ${phase} · ${f.ki.toFixed(2)} caster ki · ${construct?.hitCount||0} accepted contacts · inspection lens`;
   render();
  };
  const makeWall=(mode='damage',ki=100)=>{
   if(st.active&&!st.active.dead)cast();
   st.def={...st.def,type:'construct',construct:'wall',cost:12,cd:7,duration:9,holdTrigger:true,
    constructLifetime:mode,constructKiPerSec:2,constructKiPerDamage:2,color:'#7dff9e'};
   st.cd=0;f.ki=120;g.aimPoint.set(-300,0,-70);cast();construct=st.active;
   if(!construct)throw Error('Native resource wall failed to spawn');
   f.ki=ki;return state();
  };
  const shot=(ballistic=true,damage=10)=>g.projectiles.spawnProjectile(source,{
   pos:new T.Vector3(-300,7,-35),vel:new T.Vector3(0,0,-90),radius:.5,damage,blast:6,ballistic,color:'#ffd97a',color2:'#fff'});
  const startBeam=()=>{
   const slot=source.slots.lmb;slot.def={...slot.def,dps:20,radius:.8,tipSpeed:40,maxLen:120,kiPerSec:4};slot.cd=0;source.ki=120;
   beamHeld=true;beamPressed=true;
  };
  const stopBeam=()=>{beamHeld=false;runSlot(source,'lmb',{pressed:false,held:false,released:true,dt:1/60},g);};
  window.hitProof={g,f,source,st,explosions,frames,state,step,makeWall,shot,startBeam,stopBeam,
   getConstruct:()=>construct,setPhase:value=>{phase=value;}};
 });
 const ballistic=await page.evaluate(()=>{
  const p=hitProof;p.setPhase('ballistic direct');p.makeWall();p.step(40);const before=p.state();p.shot(true);
  for(let i=0;i<90&&p.state().hitCount===0;i++)p.step();return {before,after:p.state()};
 });
 assert.equal(ballistic.after.ki,80);assert.equal(ballistic.after.hitCount,1);assert.equal(ballistic.after.hp,ballistic.before.hp);
 await page.screenshot({path:out+'/ballistic-contact.png'});
 const explosive=await page.evaluate(()=>{
  const p=hitProof;p.setPhase('explosion: one splash debit');p.makeWall();p.step(40);p.shot(false);
  for(let i=0;i<90&&p.state().hitCount===0;i++)p.step();
  const event=p.explosions.findLast(e=>e.phase==='explosion: one splash debit'),c=p.getConstruct()._cover;
  if(!event)throw Error('Native impact did not produce area damage');
  const [x,y,z]=event.pos,dx=Math.max(Math.abs(x-c.x)-c.hx,0),dz=Math.max(Math.abs(z-c.z)-c.hz,0),dy=Math.max(c.bottom-y,y-c.top,0);
  const falloff=1-.6*Math.min(1,Math.hypot(dx,dy,dz)/event.radius);
  return {state:p.state(),event,expectedKi:100-event.damage*event.power*falloff*2};
 });
 assert.equal(explosive.state.hitCount,1);assert.ok(Math.abs(explosive.state.ki-explosive.expectedKi)<1e-7);
 await page.screenshot({path:out+'/explosive-contact.png'});
 await page.evaluate(()=>{const p=hitProof;p.setPhase('traveling beam: approach');p.makeWall();p.step(40);p.startBeam();});
 const arrival=[];
 for(let i=0;i<180;i++){
  const state=await page.evaluate(()=>{hitProof.step();return hitProof.state();});arrival.push(state);
  if(state.hitCount>0)break;
 }
 assert.ok(arrival.length>5,'Beam must travel before contact');assert.ok(arrival.slice(0,-1).every(s=>s.ki===100));
 assert.ok(arrival.at(-1).hitCount>0,'Real sustained beam must reach the wall');
 const beam=await page.evaluate(()=>{
  const p=hitProof;p.setPhase('beam: measured quarter-second contact');const before=p.state();p.step(15);return {before,after:p.state()};
 });
 assert.ok(Math.abs(beam.before.ki-beam.after.ki-10)<1e-6);assert.equal(beam.before.hp,beam.after.hp);
 await page.screenshot({path:out+'/beam-contact.png'});
 const released=await page.evaluate(()=>{const p=hitProof;p.stopBeam();const before=p.state();p.step(40);return {before,after:p.state()};});
 assert.equal(released.after.ki,released.before.ki);
 const exhausted=await page.evaluate(()=>{
  const p=hitProof;p.setPhase('damage-backed exhaustion');p.makeWall('damage',15);p.step(40);p.shot(true,10);
  for(let i=0;i<90&&!p.state().dead;i++)p.step();const c=p.getConstruct();return {...p.state(),detached:c.obj.parent===null};
 });
 assert.equal(exhausted.ki,0);assert.equal(exhausted.dead,true);assert.equal(exhausted.cover,false);assert.equal(exhausted.detached,true);
 await page.screenshot({path:out+'/exhausted.png'});
 const frames=await page.evaluate(()=>hitProof.frames);assert.deepEqual(errors,[]);
 await writeFile(out+'/results.json',JSON.stringify({ballistic,explosive,arrival,beam,released,exhausted,frames,errors},null,2));
 console.log(JSON.stringify({ballistic,explosive,arrivalFrames:arrival.length,beam,released,exhausted,errors}));
}catch(error){
 const state=await page.evaluate(()=>window.hitProof?{state:hitProof.state(),frames:hitProof.frames.slice(-20),explosions:hitProof.explosions}:null).catch(()=>null);
 await writeFile(out+'/failure.json',JSON.stringify({message:error.message,state,errors},null,2));await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw error;
}finally{await writeFile(out+'/browser-errors.json',JSON.stringify(errors));await browser.close();}
