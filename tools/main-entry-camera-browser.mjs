import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

// Real root entry, first-use help dismissal, city-mode selection and start.
// No seeded storage, camera override, mode setup shortcut or simulation patch.
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180';
const expectBfp=process.env.LSW_CAMERA_EXPECT==='bfp';
const recordAction=process.env.LSW_CAMERA_ACTION==='1';
const lifecycle=process.env.LSW_CAMERA_LIFECYCLE==='1';
const out=process.env.LSW_CAMERA_OUT||'artifacts/main-entry-camera-before';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'});
const page=await browser.newPage({viewport:{width:1600,height:900},
 ...(recordAction?{recordVideo:{dir:out,size:{width:1600,height:900}}}:{})}),errors=[],result={};
const frames=async count=>{
 const elapsed=await page.evaluate(count=>new Promise(resolve=>{
  const intervals=[];let left=count,previous=null;
  function frame(now){if(previous!==null)intervals.push(now-previous);previous=now;
   if(--left<=0)resolve(intervals);else requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
 }),count);
 if(recordAction){
  const sorted=[...elapsed].sort((a,b)=>a-b);
  (result.nativeFrameIntervals??=[]).push({frames:count,meanMs:elapsed.reduce((a,b)=>a+b,0)/elapsed.length,
   p95Ms:sorted[Math.floor((sorted.length-1)*.95)],maxMs:sorted.at(-1)});
 }
};
page.setDefaultTimeout(60000);
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(`${m.text()} ${m.location().url||''}`);});
try{
 await page.goto(base+'/');await page.waitForFunction(()=>window.LSW?.game&&window.LSW?.hud?.titleOpen);
 if(await page.locator('#hHowto').isVisible())await page.keyboard.press('Escape');
 await page.locator('#modes [data-m="freeroam"]').click();
 await page.locator('#startBtn').click();
 await page.waitForFunction(()=>LSW.game.modeId==='freeroam'&&!LSW.hud.titleOpen);
 if(await page.evaluate(()=>!!LSW.game.mapCam))await page.keyboard.press('Space');
 await page.waitForFunction(()=>LSW.game.running&&!LSW.game.mapCam);
 await page.evaluate(()=>new Promise(resolve=>{let left=60;function frame(){if(--left<=0)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);}));
 result.native=await page.evaluate(()=>{
  const g=LSW.game,w=g.world,f=g.player,cross=document.querySelector('#hCross');
  const gl=w.renderer.getContext(),dbg=gl.getExtension('WEBGL_debug_renderer_info');
  const projected=part=>{
   if(!part)return null;
   const p=part.getWorldPosition(f.pos.clone()).project(w.camera);
   return {x:(p.x+1)/2,y:(1-p.y)/2,inDepth:p.z>=-1&&p.z<=1};
  };
  const overlays=Object.fromEntries(['.cityplate','.wantedrow','.pip','#hCross'].map(selector=>{
   const node=document.querySelector(selector);if(!node)return [selector,null];
   const r=node.getBoundingClientRect(),style=getComputedStyle(node);
   return [selector,{display:style.display,visibility:style.visibility,x:r.x,y:r.y,width:r.width,height:r.height}];
  }));
  return {url:location.href,mode:g.modeId,camMode:w.camMode,cameraType:w.camera.type,
   fov:w.camera.fov??null,openSky:!!f._openSky,bodyClasses:document.body.className,
   player:f.def.id,position:f.pos.toArray(),city:w.plan?.name,policeActive:g.police.active,newsEnabled:g.news.enabled,
   cameraPosition:w.camera.position.toArray(),cameraForward:w.camera.getWorldDirection(f.pos.clone()).toArray(),
   projectedPartCenters:{head:projected(f.parts.head),torso:projected(f.parts.torso),
    leftBoot:projected(f.parts.legL?.userData?.boot),rightBoot:projected(f.parts.legR?.userData?.boot)},overlays,
   crosshairDisplay:getComputedStyle(cross).display,canvas:[w.renderer.domElement.width,w.renderer.domElement.height],
   renderer:dbg?gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
 });
 await page.screenshot({path:`${out}/root-city.png`});
 assert.equal(result.native.mode,'freeroam');assert.equal(result.native.openSky,false,'Camera must not enable open-sky physics');
 assert.equal(result.native.policeActive,true);assert.equal(result.native.newsEnabled,true);
 if(expectBfp){
  assert.equal(result.native.camMode,'chase');assert.equal(result.native.cameraType,'PerspectiveCamera');
  assert.equal(result.native.fov,73.74);assert.notEqual(result.native.crosshairDisplay,'none');
  assert.ok(result.native.bodyClasses.split(/\s+/).includes('combat-chase'));
  assert.ok(!result.native.bodyClasses.split(/\s+/).includes('powerworld'),'City must not borrow PowerWorld identity');
 }
 else {assert.equal(result.native.camMode,'iso');assert.equal(result.native.cameraType,'OrthographicCamera');}
 if(recordAction){
  assert.ok(expectBfp,'Action proof requires the expected BFP gate');
  const state=()=>page.evaluate(()=>{
   const g=LSW.game,f=g.player;
   return {position:f.pos.toArray(),flying:f.flying,grounded:f.grounded,alive:f.alive,jumpT:f._jumpT,
    lookYaw:g.world._lookYaw,lookPitch:g.world._lookPitch,running:g.running,
    captured:document.pointerLockElement===g.world.renderer.domElement,openSky:!!f._openSky};
  });
  result.action={kind:'Silent native root input capture; no simulation or camera overrides',before:await state()};
  // Middle click is a real canvas capture gesture without binding an attack.
  await page.mouse.click(800,450,{button:'middle'});
  await page.waitForFunction(()=>document.pointerLockElement===LSW.game.world.renderer.domElement);
  result.action.captured=await state();
  const takeoffStart=Date.now();await page.keyboard.down('Space');
  // Native ground Space begins a ballistic jump; holding past its apex enables
  // flight. Counting60RAF can be <.35s on a high-refresh display, not one second.
  await page.waitForFunction(startY=>LSW.game.player.flying&&LSW.game.player.pos.y>startY+6,
   result.action.before.position[1],{timeout:15000});
  result.action.takeoffHoldWallMs=Date.now()-takeoffStart;
  await page.keyboard.up('Space');await frames(20);
  result.action.hover=await state();
  await page.keyboard.down('w');await frames(48);await page.keyboard.up('w');
  await page.mouse.move(930,420,{steps:10});await frames(30);
  result.action.travel=await state();
  await page.screenshot({path:`${out}/root-native-flight.png`});
  await page.keyboard.press('Escape');await frames(8);
  result.action.paused=await state();
  assert.equal(result.action.hover.flying,true,'Native Space should take off and release into hover');
  assert.ok(result.action.hover.position[1]>result.action.before.position[1]+3,'Native ascent must gain altitude');
  assert.ok(Math.hypot(result.action.travel.position[0]-result.action.hover.position[0],result.action.travel.position[2]-result.action.hover.position[2])>3,'W must travel in the live city');
  assert.ok(Math.abs(result.action.travel.lookYaw-result.action.captured.lookYaw)>.01,'Captured mouse input must turn the rear camera');
  assert.equal(result.action.travel.openSky,false);
  assert.equal(result.action.paused.running,false);assert.equal(result.action.paused.captured,false);
 }
 if(lifecycle){
  assert.ok(expectBfp,'Lifecycle proof requires the expected BFP gate');
  const state=()=>page.evaluate(()=>{
   const g=LSW.game,f=g.player,w=g.world;
   return {alive:f.alive,state:f.state,koT:f.koT,running:g.running,mode:g.modeId,
    camMode:w.camMode,cameraType:w.camera.type,map:!!g.mapCam,koCamera:!!g._koCam,
    captured:!!document.pointerLockElement,classes:document.body.className,
    left:g.input.mouse.left,right:g.input.mouse.right,keys:[...g.input.keys],
    hardLock:!!g.hardLock,chargeKeys:Object.entries(f.slots).filter(([,s])=>s.charging).map(([key])=>key),
    crosshair:getComputedStyle(document.querySelector('#hCross')).display,
    openSky:!!f._openSky,police:g.police.active,news:g.news.enabled};
  });
  result.lifecycle={scope:'Real root lifecycle; native takeDamage fixture triggers KO, not a combat-win claim. Atlas opened through actual title UI; no simulation overrides.'};
  if(!await page.evaluate(()=>LSW.game.running))await page.locator('#hPaused [data-p="resume"]').click();
  await page.waitForFunction(()=>LSW.game.player.invuln<=0);
  await page.mouse.click(800,450,{button:'middle'});
  await page.waitForFunction(()=>!!document.pointerLockElement);
  await page.keyboard.down('w');await page.mouse.down({button:'left'});await frames(3);
  result.lifecycle.beforeKO=await state();
  result.lifecycle.damageFixture=await page.evaluate(()=>{
   const g=LSW.game;
   // Direct invocation of the production receiver deliberately isolates KO
   // ownership from weapon balance. No HP/state/clock assignment is used.
   const f=g.player,first=f.takeDamage(f.maxHp*100,{unblockable:true,trueDamage:true,hitstop:0});
   const downed=f.downedT>0;
   // First lethal damage gives humans Second Wind; held LMB can rally them.
   // Finish a downed actor through its native slam receiver instead of
   // disabling Second Wind or assuming lethal damage guarantees immediate KO.
   const finisher=downed?f.takeDamage(f.maxHp*100,{slam:true,unblockable:true,trueDamage:true,hitstop:0}):0;
   return {first,downed,finisher,hp:f.hp,alive:f.alive,state:f.state};
  });
  assert.equal(result.lifecycle.damageFixture.alive,false,'Production fixture must actually reach KO');
  await page.waitForFunction(()=>!LSW.game.player.alive&&!document.pointerLockElement,null,{timeout:10000});
  result.lifecycle.ko=await state();
  await page.screenshot({path:`${out}/root-native-ko.png`});
  await page.mouse.up({button:'left'});await page.keyboard.up('w');
  assert.equal(result.lifecycle.ko.left,false);assert.equal(result.lifecycle.ko.right,false);
  assert.deepEqual(result.lifecycle.ko.keys,[]);assert.deepEqual(result.lifecycle.ko.chargeKeys,[]);
  assert.equal(result.lifecycle.ko.hardLock,false);assert.equal(result.lifecycle.ko.crosshair,'none');
  await page.waitForFunction(()=>LSW.game.player.alive&&!LSW.game.mapCam&&LSW.game.world.camMode==='chase',null,{timeout:20000});
  await frames(20);result.lifecycle.respawn=await state();
  await page.screenshot({path:`${out}/root-native-respawn.png`});
  assert.equal(result.lifecycle.respawn.cameraType,'PerspectiveCamera');
  assert.equal(result.lifecycle.respawn.openSky,false);assert.equal(result.lifecycle.respawn.left,false);
  assert.deepEqual(result.lifecycle.respawn.chargeKeys,[]);
  await page.keyboard.press('Escape');await page.locator('#hPaused [data-p="menu"]').click();
  await page.locator('#tAtlas').click();await page.locator('#atLive').click();
  await page.waitForFunction(()=>!!LSW.game.mapCam);await frames(20);
  result.lifecycle.atlas=await state();
  await page.screenshot({path:`${out}/root-native-atlas.png`});
  assert.equal(result.lifecycle.atlas.captured,false);assert.equal(result.lifecycle.atlas.crosshair,'none');
  await page.locator('#atClose').click();
  await page.locator('#modes [data-m="freeroam"]').click();await page.locator('#startBtn').click();
  await page.waitForFunction(()=>LSW.game.modeId==='freeroam'&&!LSW.hud.titleOpen);
  if(await page.evaluate(()=>!!LSW.game.mapCam))await page.keyboard.press('Space');
  await page.waitForFunction(()=>LSW.game.running&&!LSW.game.mapCam&&LSW.game.world.camMode==='chase');
  await frames(30);result.lifecycle.afterAtlas=await state();
  await page.screenshot({path:`${out}/root-native-atlas-return.png`});
  assert.equal(result.lifecycle.afterAtlas.cameraType,'PerspectiveCamera');
  assert.equal(result.lifecycle.afterAtlas.openSky,false);
  assert.equal(result.lifecycle.afterAtlas.police,true);assert.equal(result.lifecycle.afterAtlas.news,true);
  assert.equal(result.lifecycle.afterAtlas.left,false);assert.deepEqual(result.lifecycle.afterAtlas.chargeKeys,[]);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
}catch(error){result.failure=error.message;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error;}
finally{
 const video=page.video();await page.context().close();
 if(video){await video.saveAs(`${out}/root-native-input.webm`);result.video='root-native-input.webm';}
 await writeFile(`${out}/results.json`,JSON.stringify({...result,errors},null,2));await browser.close();
}
