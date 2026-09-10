import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

// Bounded DOM adapter gate, not a gameplay/visual acceptance capture. The root
// UI and city-camera captures belong to main-entry-camera-browser.mjs.
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5189';
if(process.argv.includes('transition')){
 const out='artifacts/main-combat-view-transition';await mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[],result={};
 page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/');await page.waitForFunction(()=>window.LSW?.hud?.titleOpen);
  if(await page.locator('#hHowto').isVisible())await page.keyboard.press('Escape');
  await page.locator('#modes [data-m="freeroam"]').click();await page.locator('#startBtn').click();
  await page.waitForFunction(()=>!LSW.hud.titleOpen);if(await page.evaluate(()=>!!LSW.game.mapCam))await page.keyboard.press('Space');
  await page.waitForFunction(()=>LSW.game.running&&!LSW.game.mapCam);await page.locator('#opCine').waitFor({state:'detached'});
  await page.evaluate(()=>{window.transitionState=()=>{
   const g=LSW.game,w=g.world,c=w.camera;
   const screen=v=>{v.project(c);return {x:(v.x+1)/2,y:(1-v.y)/2,z:v.z};};
   return {time:g.time,wall:performance.now(),mapCam:g.mapCam?{...g.mapCam}:null,running:g.running,mode:g.modeId,camMode:w.camMode,
    camDir:w.camDir.toArray(),camDist:w.camDist,camPos:w.camPos.toArray(),camTarget:w.camTarget.toArray(),frustum:w.frustum,
    camera:{type:c.type,uuid:c.uuid,position:c.position.toArray(),up:c.up.toArray(),quaternion:c.quaternion.toArray(),top:c.top,bottom:c.bottom,left:c.left,right:c.right,near:c.near,far:c.far,
     matrix:c.matrixWorld.elements.slice(),projection:c.projectionMatrix.elements.slice()},
    passes:w.composer.passes.filter(p=>p.camera).map(p=>({kind:p.constructor.name,camera:p.camera.uuid,same:p.camera===c,type:p.camera.type})),
    humans:g.humans.map(({fighter:f})=>({id:f.id,alive:f.alive,pos:f.pos.toArray(),gait:f.gait,objQuat:f.obj.quaternion.toArray(),headWorld:f.parts.head.getWorldPosition(f.pos.clone()).toArray(),
     root:screen(f.pos.clone()),head:screen(f.parts.head.getWorldPosition(f.pos.clone())),foot:screen(f.parts.legL.userData.boot.getWorldPosition(f.pos.clone()))}))};
  };});
  await page.mouse.click(800,450,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
  await page.mouse.move(970,350,{steps:5});result.before=await page.evaluate(()=>transitionState());
  await page.keyboard.press('Tab');await page.waitForFunction(()=>LSW.hud.titleOpen);
  await page.locator('#modes [data-m="duel"]').click();await page.locator('[data-two="1"]').click();await page.locator('#startBtn').click();
  await page.waitForFunction(()=>!LSW.hud.titleOpen);result.opening=await page.evaluate(()=>transitionState());
  if(await page.evaluate(()=>!!LSW.game.mapCam))await page.keyboard.press('Space');
  result.samples=await page.evaluate(()=>new Promise(resolve=>{
   const points=[0,100,300,600,1200,2400],rows=[],begin=performance.now();
   const tick=()=>{if(performance.now()-begin>=points[rows.length])rows.push(transitionState());if(rows.length===points.length)resolve(rows);else requestAnimationFrame(tick);};requestAnimationFrame(tick);
  }));
  await page.locator('#opCine').waitFor({state:'detached'});await page.screenshot({path:`${out}/settled-2p.png`});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({before:result.before.camMode,opening:result.opening.camMode,samples:result.samples.map(s=>({time:s.time,frustum:s.frustum,up:s.camera.up,top:s.camera.top,bottom:s.camera.bottom,
   projected:s.humans.map(f=>({rootY:f.root.y,headY:f.head.y,headMinusRoot:f.head.y-f.root.y})),passes:s.passes})),errors}));
 }catch(e){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw e;}
 finally{await writeFile(`${out}/results.json`,JSON.stringify({...result,errors},null,2));await browser.close();}
 process.exit(0);
}
if(process.argv.includes('bodies')){
 const out=process.argv.includes('large')?'artifacts/main-combat-view-body-large':'artifacts/main-combat-view-bodies';await mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[],cases=[];
 page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 const frames=n=>page.evaluate(n=>new Promise(r=>{const next=()=>--n<=0?r():requestAnimationFrame(next);requestAnimationFrame(next);}),n);
 let mx=800,my=450;
 const aim=async()=>{for(let i=0;i<10;i++){
  const d=await page.evaluate(()=>{const g=LSW.game,w=g.world,f=window.bodyTarget,v=f.center(f.pos.clone()).sub(w.camera.position).normalize(),a=w.camera.getWorldDirection(f.pos.clone());
   const yaw=Math.atan2(v.x,v.z)-Math.atan2(a.x,a.z);return {dx:-Math.atan2(Math.sin(yaw),Math.cos(yaw))/w._lookSens,dy:-(Math.asin(v.y)-Math.asin(a.y))/w._lookSens};});
  mx+=d.dx;my+=d.dy;await page.mouse.move(mx,my);await frames(3);
 }};
 const capture=async(label)=>{
  const state=await page.evaluate(()=>{const g=LSW.game,p=g.player,w=g.world,f=bodyTarget;
   const proj=part=>{const v=part.getWorldPosition(p.pos.clone()).project(w.camera);return {x:(v.x+1)/2,y:(1-v.y)/2,z:v.z};};
   return {time:g.time,player:p.pos.toArray(),target:f.pos.toArray(),camera:w.camera.position.toArray(),fov:w.camera.fov,
    openSky:!!p._openSky,police:g.police.active,news:g.news.enabled,city:w.plan.name,cover:w.cover.length,
    targetScreen:proj(f.parts.torso),head:proj(p.parts.head),boots:[proj(p.parts.legL.userData.boot),proj(p.parts.legR.userData.boot)],
    guarded:p.guarding,cannonCharge:p.slots.q.chargeT,charging:p.slots.q.charging,gait:p.gait,flying:p.flying,
    cannonReady:p._nanites.modules.get('q').ready,shieldReady:p._nanites.modules.get('e').ready,lock:g.hardLock===f};});
  await page.screenshot({path:`${out}/${label}.png`});
  assert.equal(state.openSky,false);assert.equal(state.fov,73.74);assert.equal(state.lock,true);
  assert.ok(state.targetScreen.x>0&&state.targetScreen.x<1&&state.targetScreen.y>0&&state.targetScreen.y<1&&state.targetScreen.z<1,'Target is outside the native frame');
  return state;
 };
 try{
  await page.goto(base+'/');await page.waitForFunction(()=>window.LSW?.hud?.titleOpen);
  if(await page.locator('#hHowto').isVisible())await page.keyboard.press('Escape');
  await page.locator('#modes [data-m="freeroam"]').click();await page.locator('#startBtn').click();
  await page.waitForFunction(()=>!LSW.hud.titleOpen);if(await page.evaluate(()=>!!LSW.game.mapCam))await page.keyboard.press('Space');
  await page.waitForFunction(()=>LSW.game.running&&!LSW.game.mapCam);await page.locator('#opCine').waitFor({state:'detached'});
  const lane=await page.evaluate(()=>{
   const g=LSW.game,w=g.world,p=g.player,f=g.spawnRival('kano');f.ai=null;window.bodyTarget=f;
   for(const c of w.cover){if((c.top??c.h)<5)continue;
    for(const sign of [1,-1]){
     const x=c.x+sign*((c.hx??c.r)+8),z=c.z,pad=4;
     if(w.cover.some(k=>Math.abs(x-k.x)<(k.hx??k.r)+pad&&Math.abs(z-k.z)<(k.hz??k.r)+pad))continue;
     if(w.cover.some(k=>Math.abs(x-k.x)<(k.hx??k.r)+pad&&Math.abs(z+35-k.z)<(k.hz??k.r)+pad))continue;
     p.pos.set(x,w.heightAt(x,z),z);f.pos.set(x,w.heightAt(x,z+35),z+35);
     if(!g.canSee(p,f))continue;
     f.groundY=f.pos.y;f.obj.position.copy(f.pos);f.spawn.copy(f.pos);f.vel.set(0,0,0);
     window.bodyLane={x,z,y:p.pos.y};return {x,z,y:p.pos.y,cover:{x:c.x,z:c.z,hx:c.hx,hz:c.hz,top:c.top},edgeDistance:8,target:f.pos.toArray()};
    }
   }throw Error('No native cover-side lane available');
  });
  for(const spec of [{body:'superhero-female',scale:.65,bulk:.65},{body:'superhero-male',scale:1,bulk:1},{body:'procedural',scale:1.5,bulk:1.65}].filter(s=>!process.argv.includes('large')||s.body==='procedural')){
   const row={spec,lane,fixture:'Actual root Free Roam; genuine buildDef/applyProfile source registered in this page only; native setPlayerChar; level10 and initial pool/placement disclosed. No camera/physics/controller/render override.'};cases.push(row);
   await page.evaluate(async spec=>{
    const g=LSW.game,{freshPicks,buildDef}=await import('/src/data/creator.js'),{applyProfile,profileFromDef}=await import('/src/tool/studio-profile.js');
    const basis=buildDef({...freshPicks(),name:'CITY VIEW BODY',cape:false,budget:'unbound',flightTier:3,
     slots:{lmb:'kibolt',rmb:'heatray',q:'nanite-cannon',e:'nanite-shield',f:null,r:null}},'cx_camera_body_fixture');
    const profile=profileFromDef(basis);profile.model.body=spec.body;profile.model.costume='fitted';profile.frame.scale=spec.scale;profile.frame.bulk=spec.bulk;
    const def=applyProfile(basis,profile),i=LSW.ROSTER.findIndex(d=>d.id===def.id);if(i<0)LSW.ROSTER.push(def);else LSW.ROSTER[i]=def;
    g.setPlayerChar(def.id);LSW.hud.setPlayer(def);const p=g.player,l=bodyLane;p.pos.set(l.x,l.y,l.z);p.groundY=l.y;p.spawn.copy(p.pos);p.vel.set(0,0,0);p.level=10;p.ki=p.maxKi;
    bodyTarget.pos.set(l.x,l.y,l.z+35);bodyTarget.groundY=l.y;bodyTarget.vel.set(0,0,0);bodyTarget.flying=false;bodyTarget.hp=bodyTarget.maxHp=1000;bodyTarget.invuln=0;
   },spec);
   await page.waitForFunction(()=>LSW.game.player._nanites?.modules.get('q').ready&&LSW.game.player._nanites?.modules.get('e').ready);
   await page.mouse.click(800,450,{button:'middle'});await page.waitForFunction(()=>document.pointerLockElement===LSW.game.world.renderer.domElement);mx=800;my=450;
   await aim();await page.keyboard.press('t');await page.waitForFunction(()=>LSW.game.hardLock===bodyTarget);
   const tag=spec.body;
   await page.keyboard.down('c');await page.waitForFunction(()=>LSW.game.player.guarding);await frames(40);
   row.groundGuard=await capture(`${tag}-ground-guard`);await page.keyboard.up('c');await page.waitForFunction(()=>!LSW.game.player.guarding&&!LSW.game.player.mstate);await frames(10);
   await page.keyboard.down('q');await page.waitForFunction(()=>{const s=LSW.game.player.slots.q;return s.charging&&s.chargeT>.3||s._naniteDenied==='obstructed'&&s._naniteRetry;});
   row.groundCannon=await capture(`${tag}-ground-cannon`);
   row.groundCannonGeometry=await page.evaluate(async()=>{
    const {OBB}=await import('/node_modules/three/examples/jsm/math/OBB.js'),T=await import('/node_modules/three/build/three.module.js');
    const {naniteEnvelopeClear}=await import('/src/engine/nanite-pose.js');const g=LSW.game,f=g.player,v=f.parts.nanites.get('q'),w=g.world,unit=new T.Box3(new T.Vector3(-.5,-.5,-.5),new T.Vector3(.5,.5,.5));
    let minY=Infinity;const coverHits=[],bodyHits=[];
    for(const cell of v.layout){const matrix=v.root.matrixWorld.clone().multiply(cell.matrix),obb=new OBB().fromBox3(unit).applyMatrix4(matrix);
     for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5]){const p=new T.Vector3(x,y,z).applyMatrix4(matrix);minY=Math.min(minY,p.y-w.heightAt(p.x,p.z));}
     for(const c of w.cover){const b=new T.Box3(new T.Vector3(c.x-(c.hx??c.r),c.bottom??-1e6,c.z-(c.hz??c.r)),new T.Vector3(c.x+(c.hx??c.r),c.top??c.h,c.z+(c.hz??c.r)));if(obb.intersectsBox3(b))coverHits.push(cell.cell);}
     for(const b of f.parts.naniteBodyVolumes||[])if(obb.intersectsOBB(new OBB().fromBox3(b.box).applyMatrix4(b.driver.matrixWorld)))bodyHits.push({cell:cell.cell,driver:b.driver.name});
    }
    return {denied:f.slots.q._naniteDenied,retry:f.slots.q._naniteRetry,minAboveGround:minY,socket:v.socket.getWorldPosition(f.pos.clone()).toArray(),coverHits,bodyHits,envelopeClear:naniteEnvelopeClear(f,v),guard:f.guarding,poseGuard:f.poseGuard,foot:f.onFoot,gait:f.gait};
   });await page.keyboard.up('q');await frames(30);
   await page.keyboard.down('Space');await page.waitForFunction(()=>LSW.game.player.flying&&LSW.game.player.pos.y>bodyLane.y+6);await page.keyboard.up('Space');await frames(25);
   await page.keyboard.down('c');await page.waitForFunction(()=>LSW.game.player.guarding);await frames(30);
   row.hoverGuard=await capture(`${tag}-hover-guard`);await page.keyboard.up('c');await frames(10);
   await page.waitForFunction(()=>LSW.game.player.slots.q.cd<=0);
   await page.keyboard.down('q');await page.waitForFunction(()=>LSW.game.player.slots.q.charging&&LSW.game.player.slots.q.chargeT>.3);
   row.hoverCannon=await capture(`${tag}-hover-cannon`);await page.keyboard.up('q');await frames(15);
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({cases,errors}));
 }catch(e){
  const diagnostic=await page.evaluate(()=>{const g=LSW.game,p=g?.player,s=p?.slots.q;return {running:g.running,alive:p?.alive,guard:p?.guarding,ki:p?.ki,input:[...g.input.keys],q:s?{type:s.def.type,charging:s.charging,chargeT:s.chargeT,cd:s.cd,denied:s._naniteDenied,retry:s._naniteRetry,hands:s._handsBusy,last:p._lastSlot}:null};}).catch(()=>null);
  cases.push({failure:e.message,diagnostic});await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw e;
 }
 finally{await writeFile(`${out}/results.json`,JSON.stringify({cases,errors},null,2));await browser.close();}
 process.exit(0);
}
if(process.argv.includes('phone')){
 const out='artifacts/main-combat-view-phone';await mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),errors=[],result={};
 page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 const state=()=>page.evaluate(()=>({width:innerWidth,height:innerHeight,classes:document.body.className,
  mode:LSW.game.modeId,openSky:!!LSW.game.player._openSky,cam:LSW.game.world.camMode,
  ui:Object.fromEntries(['#hud .rotate','#touch','#touch [data-b="lock"]','#hud .pl','#hCross'].map(s=>{
   const e=document.querySelector(s),r=e.getBoundingClientRect(),c=getComputedStyle(e);return [s,{x:r.x,y:r.y,w:r.width,h:r.height,display:c.display,visibility:c.visibility,label:e.getAttribute('aria-label')}];
  }))}));
 try{
  await page.goto(base+'/');await page.waitForFunction(()=>window.LSW?.hud?.titleOpen);
  if(await page.locator('#hHowto').isVisible())await page.keyboard.press('Escape');
  await page.locator('#modes [data-m="freeroam"]').click();await page.locator('#startBtn').click();
  await page.waitForFunction(()=>!LSW.hud.titleOpen);if(await page.evaluate(()=>!!LSW.game.mapCam))await page.keyboard.press('Space');
  await page.waitForFunction(()=>LSW.game.running&&!LSW.game.mapCam);await page.locator('#opCine').waitFor({state:'detached'});
  result.portrait=await state();await page.screenshot({path:`${out}/portrait-390.png`});
  assert.equal(result.portrait.ui['#hud .rotate'].display,'flex','Existing portrait rotation gate was lost');
  assert.equal(result.portrait.ui['#touch'].display,'none');
  await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>innerWidth===844&&LSW.game.world.camMode==='chase');
  result.landscape=await state();await page.screenshot({path:`${out}/landscape-844.png`});
  assert.equal(result.landscape.openSky,false);assert.equal(result.landscape.ui['#touch'].display,'block');
  const lock=result.landscape.ui['#touch [data-b="lock"]'];assert.match(lock.label,/lock.*target/i);
  assert.ok(lock.w>=44&&lock.h>=44&&lock.x>=0&&lock.y>=0&&lock.x+lock.w<=844&&lock.y+lock.h<=390,'Accessible lock must fit actual phone layout');
  assert.notEqual(result.landscape.ui['#hud .pl'].display,'none');assert.notEqual(result.landscape.ui['#hCross'].display,'none');
  // Chromium touch events pass through the real mounted TouchControls -> pad
  // merge -> Game.update controller. This is emulation, not physical hardware.
  result.targetFixture=await page.evaluate(()=>{
   const g=LSW.game,p=g.player,f=g.spawnRival('kano');f.ai=null;f.pos.set(p.pos.x,p.pos.y+9,p.pos.z+20);
   f.flying=true;f.vel.set(0,0,0);f.obj.position.copy(f.pos);window.phoneTarget=f;return f.pos.toArray();
  });
  const cdp=await page.context().newCDPSession(page),point={x:lock.x+lock.w/2,y:lock.y+lock.h/2,id:1};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
  await page.waitForFunction(()=>LSW.game.hardLock===phoneTarget);
  result.lockInput=await page.evaluate(()=>({locked:LSW.game.hardLock===phoneTarget,guard:LSW.game.player.guarding,
   shots:LSW.game.projectiles.list.filter(p=>p.caster===LSW.game.player).length,selected:LSW.game.player._lastSlot??null}));
  assert.equal(result.lockInput.shots,0);assert.equal(result.lockInput.guard,false);assert.equal(result.lockInput.selected,null);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(()=>!LSW.game.pad.cur.lock&&!LSW.game.pad.prev.lock);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await page.waitForFunction(()=>!LSW.game.hardLock);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const yaw=await page.evaluate(()=>LSW.game.world._lookYaw);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:490,y:270,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:525,y:270,id:1}]});
  await page.waitForFunction(yaw=>Math.abs(LSW.game.world._lookYaw-yaw)>.12,yaw);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  result.touchLook=await page.evaluate(()=>({yaw:LSW.game.world._lookYaw,rx:LSW.game.pad.rx,shots:LSW.game.projectiles.list.filter(p=>p.caster===LSW.game.player).length}));
  assert.equal(result.touchLook.shots,0);
  await page.screenshot({path:`${out}/native-touch-look.png`});await cdp.detach();
  assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
 }catch(e){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw e;}
 finally{await writeFile(`${out}/results.json`,JSON.stringify({...result,errors},null,2));await browser.close();}
 process.exit(0);
}
if(process.argv.includes('combat')){
 const out=process.env.LSW_CAMERA_OUT||'artifacts/main-combat-view-combat';await mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[],result={};
 page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 const frames=n=>page.evaluate(n=>new Promise(r=>{const next=()=>--n<=0?r():requestAnimationFrame(next);requestAnimationFrame(next);}),n);
 const enter=async(mode,two=false)=>{
  await page.locator(`#modes [data-m="${mode}"]`).click();
  if(two)await page.locator('[data-two="1"]').click();
  await page.locator('#startBtn').click();await page.waitForFunction(()=>!LSW.hud.titleOpen);
  if(await page.evaluate(()=>!!LSW.game.mapCam))await page.keyboard.press('Space');
  await page.waitForFunction(()=>LSW.game.running&&!LSW.game.mapCam);await page.locator('#opCine').waitFor({state:'detached'});await frames(5);
 };
 let mx=800,my=450;
 const aim=async()=>{
  for(let i=0;i<10;i++){
   const d=await page.evaluate(()=>{
    const g=LSW.game,w=g.world,f=window.cameraTarget,v=f.center(f.pos.clone()).sub(w.camera.position).normalize(),forward=w.camera.getWorldDirection(f.pos.clone());
    const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
    return {dx:-wrap(Math.atan2(v.x,v.z)-Math.atan2(forward.x,forward.z))/w._lookSens,
     dy:-(Math.asin(v.y)-Math.asin(forward.y))/w._lookSens};
   });
   mx+=d.dx;my+=d.dy;await page.mouse.move(mx,my);await frames(3);
  }
 };
 try{
  await page.goto(base+'/');await page.waitForFunction(()=>window.LSW?.hud?.titleOpen);
  if(await page.locator('#hHowto').isVisible())await page.keyboard.press('Escape');await enter('freeroam');
  result.entry=await page.evaluate(()=>({mode:LSW.game.modeId,city:LSW.game.world.plan.name,openSky:!!LSW.game.player._openSky,
   police:LSW.game.police.active,news:LSW.game.news.enabled,fov:LSW.game.world.camera.fov}));
  // Disclosed fixture: real spawnRival, passive AI, native city-clear placement.
  // No camera/aim/controller/physics/damage/render override; subsequent actions are DOM input.
  result.fixture=await page.evaluate(()=>{
   const g=LSW.game,p=g.player,w=g.world,f=g.spawnRival('kano');f.ai=null;
   let found=false;
   for(let i=0;i<24;i++){
    const a=i*Math.PI/12,x=p.pos.x+Math.sin(a)*20,z=p.pos.z+Math.cos(a)*20;
    f.pos.set(x,w.heightAt(x,z),z);f.groundY=f.pos.y;
    if(w.cover.some(c=>Math.abs(x-c.x)<(c.hx??c.r)+f.radius&&Math.abs(z-c.z)<(c.hz??c.r)+f.radius))continue;
    if(g.canSee(p,f)){found=true;break;}
   }
   if(!found)throw Error('No actual clear native city lane');f.vel.set(0,0,0);f.obj.position.copy(f.pos);f.spawn.copy(f.pos);window.cameraTarget=f;
   return {kind:'native Kano rival with passive AI and disclosed clear placement',player:p.pos.toArray(),target:f.pos.toArray(),cover:w.cover.length};
  });
  await page.mouse.click(mx,my,{button:'middle'});await page.waitForFunction(()=>document.pointerLockElement===LSW.game.world.renderer.domElement);
  await aim();await page.keyboard.press('t');await frames(8);
  assert.equal(await page.evaluate(()=>LSW.game.hardLock===cameraTarget),true,'T failed to lock the genuinely viewed native rival');
  await page.screenshot({path:`${out}/ground-lock.png`});
  await page.keyboard.press('t');await aim();assert.equal(await page.evaluate(()=>LSW.game.hardLock),null);
  result.before=await page.evaluate(()=>({hp:cameraTarget.hp,ki:LSW.game.player.ki,lock:LSW.game.hardLock?.id}));
  await page.mouse.down({button:'left'});
  await page.waitForFunction(()=>LSW.game.projectiles.list.some(b=>b.caster===LSW.game.player&&b.tip));
  result.launch=await page.evaluate(()=>{const g=LSW.game,b=g.projectiles.list.find(b=>b.caster===g.player&&b.tip);return {hp:cameraTarget.hp,tip:b.tip.position.toArray(),tipDistance:b.tipDist,sustaining:b.sustaining};});
  await page.waitForFunction(hp=>cameraTarget.hp<hp-3,result.before.hp);await page.mouse.up({button:'left'});await frames(4);
  result.hit=await page.evaluate(()=>({hp:cameraTarget.hp,lastHitBy:cameraTarget.lastHitBy===LSW.game.player,openSky:!!LSW.game.player._openSky}));
  await page.screenshot({path:`${out}/native-beam-hit.png`});assert.ok(result.hit.hp<result.before.hp);assert.equal(result.hit.lastHitBy,true);
  const coldBefore=await page.evaluate(()=>cameraTarget.frost);
  await page.mouse.down({button:'right'});await page.waitForFunction(before=>cameraTarget.frost>before,coldBefore);
  result.secondary=await page.evaluate(()=>({type:LSW.game.player.slots.rmb.def.type,name:LSW.game.player.slots.rmb.def.name,ki:LSW.game.player.ki,frost:cameraTarget.frost}));
  await page.mouse.up({button:'right'});await frames(4);
  assert.equal(await page.evaluate(()=>LSW.game.hardLock),null);
  // Elevated target remains native hovering motion; no per-frame fixture pinning.
  result.highFixture=await page.evaluate(()=>{const f=cameraTarget;f.pos.y+=15;f.flying=true;f.vel.set(0,0,0);return f.pos.toArray();});
  await aim();await page.keyboard.press('t');await frames(6);assert.equal(await page.evaluate(()=>LSW.game.hardLock===cameraTarget),true);
  await page.screenshot({path:`${out}/high-lock.png`});
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.pointerLockElement&&!LSW.game.running);
  await page.locator('[data-p="resume"]').click();await frames(5);
  result.resume=await page.evaluate(()=>({running:LSW.game.running,lock:LSW.game.hardLock,charging:Object.values(LSW.game.player.slots).some(s=>s.charging),held:LSW.game.input.mouse.left||LSW.game.input.mouse.right}));
  assert.equal(result.resume.charging,false);assert.equal(result.resume.held,false);assert.equal(result.resume.lock,null);
  await page.evaluate(()=>{window.combatTransitionState=()=>{
   const g=LSW.game,w=g.world,c=w.camera,screen=v=>{v.project(c);return {x:(v.x+1)/2,y:(1-v.y)/2,z:v.z};};
   return {time:g.time,wall:performance.now(),mapCam:g.mapCam?{...g.mapCam}:null,running:g.running,mode:g.modeId,camMode:w.camMode,
    camDir:w.camDir.toArray(),camDist:w.camDist,camPos:w.camPos.toArray(),camTarget:w.camTarget.toArray(),frustum:w.frustum,
    camera:{type:c.type,uuid:c.uuid,position:c.position.toArray(),up:c.up.toArray(),quaternion:c.quaternion.toArray(),top:c.top,bottom:c.bottom,left:c.left,right:c.right,near:c.near,far:c.far,matrix:c.matrixWorld.elements.slice(),projection:c.projectionMatrix.elements.slice()},
    passes:w.composer.passes.filter(p=>p.camera).map(p=>({kind:p.constructor.name,camera:p.camera.uuid,same:p.camera===c,type:p.camera.type})),
    humans:g.humans.map(({fighter:f})=>({id:f.id,alive:f.alive,pos:f.pos.toArray(),gait:f.gait,objQuat:f.obj.quaternion.toArray(),root:screen(f.pos.clone()),head:screen(f.parts.head.getWorldPosition(f.pos.clone())),foot:screen(f.parts.legL.userData.boot.getWorldPosition(f.pos.clone()))}))};
  };});
  result.transitionBefore=await page.evaluate(()=>combatTransitionState());
  await page.keyboard.press('Tab');await page.waitForFunction(()=>LSW.hud.titleOpen);await enter('duel',true);
  result.shared=await page.evaluate(()=>({humans:LSW.game.humans.length,cam:LSW.game.world.camMode,camera:LSW.game.world.camera.type,classes:document.body.className,captured:!!document.pointerLockElement}));
  assert.equal(result.shared.humans,2);assert.equal(result.shared.cam,'iso');assert.equal(result.shared.captured,false);assert.ok(!result.shared.classes.includes('combat-chase'));
  await page.screenshot({path:`${out}/root-duel-2p.png`});
  result.transition=await page.evaluate(()=>new Promise(resolve=>{
   const points=[0,100,300,600,1200,2400],rows=[],begin=performance.now();const tick=()=>{
    if(performance.now()-begin>=points[rows.length])rows.push(combatTransitionState());if(rows.length===points.length)resolve(rows);else requestAnimationFrame(tick);};requestAnimationFrame(tick);
  }));
  await page.screenshot({path:`${out}/root-duel-2p-settled.png`});
  assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
 }catch(e){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw e;}
 finally{await writeFile(`${out}/results.json`,JSON.stringify({...result,errors},null,2));await browser.close();}
 process.exit(0);
}
if(process.argv.includes('layout')){
 const out=process.env.LSW_CAMERA_OUT||'artifacts/main-combat-view-layout';await mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[],results=[];
 page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/');await page.waitForFunction(()=>window.LSW?.hud?.titleOpen);
  if(await page.locator('#hHowto').isVisible())await page.keyboard.press('Escape');
  await page.locator('#modes [data-m="freeroam"]').click();await page.locator('#startBtn').click();
  await page.waitForFunction(()=>LSW.game.modeId==='freeroam'&&!LSW.hud.titleOpen);
  if(await page.evaluate(()=>!!LSW.game.mapCam))await page.keyboard.press('Space');
  await page.waitForFunction(()=>LSW.game.running&&!LSW.game.mapCam&&document.body.classList.contains('combat-chase'));
  for(const [width,height]of [[1600,900],[1100,720]]){
   await page.setViewportSize({width,height});
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const data=await page.evaluate(()=>({width:innerWidth,mode:LSW.game.modeId,openSky:!!LSW.game.player._openSky,
    rects:Object.fromEntries(['.cityplate','.status-dock','.combat-dock','.pip','.wantedrow'].map(s=>{
     const e=document.querySelector('#hud '+s),r=e.getBoundingClientRect(),c=getComputedStyle(e);
     return [s,{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,display:c.display}];
    }))}));results.push(data);
   await page.screenshot({path:`${out}/city-${width}.png`});
   assert.equal(data.mode,'freeroam');assert.equal(data.openSky,false);
   assert.ok(data.rects['.cityplate'].right<=width*.35,'City plate crosses the rear-view body lane');
   assert.ok(data.rects['.status-dock'].h<=190,'Default status dock is not compact');
   assert.ok(data.rects['.combat-dock'].h<=180,'Selected attacks retain a full duplicate card grid');
   assert.notEqual(data.rects['.pip'].display,'none','Correspondent was hidden to fit the HUD');
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({results,errors}));
 }finally{await writeFile(`${out}/results.json`,JSON.stringify({results,errors},null,2));await browser.close();}
 process.exit(0);
}
const browser=await chromium.launch({channel:'chromium',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 // Same-origin document without booting a second city renderer during review.
 await page.goto(base+'/src/core/touch.js');
 await page.setContent('<!doctype html><html><head><link rel="stylesheet" href="/src/styles/shell.css"></head><body></body></html>');
 const setup=await page.evaluate(async()=>{
  const {TouchControls}=await import('/src/core/touch.js');const {Gamepad}=await import('/src/core/gamepad.js');
  const pad=new Gamepad(),touch=new TouchControls(pad);
  const f={alive:true,slots:{},def:{}},g={modeId:'freeroam',running:true,player:f,humans:[{}]};f._game=g;
  touch.mount();touch.show(true);touch.updateAccess(f);window.testTouch={touch,pad,f,g};
  const b=document.querySelector('[data-b="lock"]');return {count:!!b,label:b?.getAttribute('aria-label')};
 });
 assert.equal(setup.count,true,'Native TouchControls has no explicit chase lock control');
 assert.match(setup.label,/lock.*target/i);
 const button=page.locator('[data-b="lock"]');await button.dispatchEvent('pointerdown',{pointerType:'touch'});
 assert.deepEqual(await page.evaluate(()=>{
  const {touch,pad}=testTouch;touch.apply();return {lock:pad.sampleCombatLock(true),item:pad.down('item'),fire:pad.down('lmb')};
 }),{lock:true,item:false,fire:false});
 await button.dispatchEvent('pointerup',{pointerType:'touch'});
 assert.equal(await page.evaluate(()=>{const {touch,pad}=testTouch;touch.apply();return pad.sampleCombatLock(true);}),false);
 await button.focus();await page.keyboard.down('Enter');
 assert.equal(await page.evaluate(()=>{const {touch,pad}=testTouch;touch.apply();return pad.sampleCombatLock(true);}),true);
 await page.keyboard.up('Enter');
 assert.equal(await page.evaluate(()=>{const {touch,pad}=testTouch;touch.apply();return pad.sampleCombatLock(true);}),false);
 await page.evaluate(()=>{testTouch.g.running=false;testTouch.touch.updateAccess(testTouch.f);});
 assert.equal(await button.isVisible(),false);
 await page.evaluate(()=>{testTouch.g.running=true;testTouch.g.humans.push({});testTouch.touch.updateAccess(testTouch.f);});
 assert.equal(await button.isVisible(),false);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({adapter:'native TouchControls DOM',viewport:[390,844],lock:true,release:true,pausedHidden:true,sharedHidden:true,errors}));
}finally{await browser.close();}
