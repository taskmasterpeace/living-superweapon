import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

// Real root encounter, ordinary RAF/Game.update. Only initial rival placement
// and passive AI are staged; no HUD style, camera, time or simulation override.
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180';
const out=process.env.LSW_CAMERA_OUT||'artifacts/main-combat-hud';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),results=[],errors=[];
const overlap=(a,b)=>a?.visible&&b?.visible&&Math.min(a.right,b.right)>Math.max(a.x,b.x)+.5&&Math.min(a.bottom,b.bottom)>Math.max(a.y,b.y)+.5;
try{
 for(const spec of [{width:1600,height:900},{width:1100,height:720},{width:844,height:390,touch:true}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:!!spec.touch});
  const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base+'/');await page.waitForFunction(()=>window.LSW?.hud?.titleOpen);
   if(await page.locator('#hHowto').isVisible())await page.keyboard.press('Escape');
   await page.locator('#modes [data-m="freeroam"]').click();await page.locator('#startBtn').click();
   await page.waitForFunction(()=>!LSW.hud.titleOpen);if(await page.evaluate(()=>!!LSW.game.mapCam))await page.keyboard.press('Space');
   await page.waitForFunction(()=>LSW.game.running&&!LSW.game.mapCam);await page.locator('#opCine').waitFor({state:'detached'});
   await page.evaluate(()=>{
    const g=LSW.game,p=g.player,f=g.spawnRival('kano');f.ai=null;window.hudTarget=f;
    p.pos.set(0,g.world.heightAt(0,30),30);p.groundY=p.pos.y;p.vel.set(0,0,0);
    f.pos.set(0,g.world.heightAt(0,50),50);f.groundY=f.pos.y;f.vel.set(0,0,0);f.invuln=0;
   });
   await page.waitForFunction(()=>hudTarget._vis>=.4);
   let mx=spec.width/2,my=spec.height/2;
   await page.mouse.click(mx,my,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
   for(let i=0;i<10;i++){
    const delta=await page.evaluate(()=>{const w=LSW.game.world,f=hudTarget,v=f.center(f.pos.clone()).sub(w.camera.position).normalize(),a=w.camera.getWorldDirection(f.pos.clone()),yaw=Math.atan2(v.x,v.z)-Math.atan2(a.x,a.z);
     return {x:-Math.atan2(Math.sin(yaw),Math.cos(yaw))/w._lookSens,y:-(Math.asin(v.y)-Math.asin(a.y))/w._lookSens};});
    mx+=delta.x;my+=delta.y;await page.mouse.move(mx,my);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   }
   // Explicit native lock establishes the real foe readout, not a fake DOM row.
   await page.keyboard.press('t');await page.waitForFunction(()=>LSW.game.hardLock===hudTarget);
   await page.waitForFunction(()=>document.querySelector('#hFoe').style.display==='block'&&document.querySelector('#plMood')?.style.display==='block');
   const read=()=>page.evaluate(()=>{
    const g=LSW.game,selectors={foe:'#hFoe',name:'#foeName',hp:'#foeHp',clock:'#hSun',needle:'#sdNeedle',sun:'#sdSun',moon:'#sdMoon',date:'#sdDate',
     city:'#hCity',news:'#hPip',mood:'#plMood',health:'#plHp',ki:'#plKi',guard:'#plGd',xp:'#hud .pl .xpwrap',wanted:'#plWanted',touch:'#touch',lock:'#touch [data-b="lock"]',rotate:'#hud .rotate'};
    return {width:innerWidth,height:innerHeight,mode:g.modeId,openSky:!!g.player._openSky,police:g.police.active,news:g.news.enabled,classes:document.body.className,
     foe:g.hardLock?.name,dayT:g.world.dayT,needle:document.querySelector('#sdNeedle')?.getAttribute('transform'),
     rects:Object.fromEntries(Object.entries(selectors).map(([key,s])=>{const e=document.querySelector(s),r=e?.getBoundingClientRect(),c=e&&getComputedStyle(e);
      return [key,r?{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,visible:e.checkVisibility()&&r.width>0&&r.height>0,display:c.display,text:e.textContent}:null];}))};
   });
   const row=await read();results.push(row);
   if(!spec.touch){await page.waitForFunction(before=>document.querySelector('#sdNeedle').getAttribute('transform')!==before,row.needle);row.afterClock=await read();}
   await page.screenshot({path:`${out}/foe-city-${spec.width}.png`});
   if(spec.touch){await page.setViewportSize({width:390,height:844});row.portrait=await read();await page.screenshot({path:`${out}/portrait-390.png`});}
  }finally{await context.close();}
 }
 // Collect every width before failing so the RED distinguishes both collisions.
 for(const row of results){
  row.collisions=[];
  for(const key of ['clock','needle','sun','moon','date'])if(overlap(row.rects.foe,row.rects[key]))row.collisions.push(`foe/${key}`);
  for(const key of ['health','ki','guard','xp','wanted','lock'])if(overlap(row.rects.mood,row.rects[key]))row.collisions.push(`mood/${key}`);
  assert.equal(row.mode,'freeroam');assert.equal(row.openSky,false);assert.equal(row.police,true);assert.equal(row.news,true);
  assert.equal(row.rects.foe.visible,true);assert.equal(row.rects.mood.visible,true);
  if(row.width===844){assert.equal(row.rects.touch.visible,true);assert.equal(row.rects.clock.visible,false,'Existing phone clock rule changed');assert.equal(row.portrait.rects.rotate.visible,true);assert.equal(row.portrait.rects.touch.visible,false);}
  else {assert.equal(row.rects.clock.visible,true);assert.equal(row.rects.city.visible,true);assert.equal(row.rects.news.visible,true);assert.notEqual(row.needle,row.afterClock.needle);}
 }
 console.log(JSON.stringify(results.map(r=>({width:r.width,collisions:r.collisions,clock:r.rects.clock,mood:r.rects.mood,xp:r.rects.xp}))));
 assert.deepEqual(results.flatMap(r=>r.collisions.map(c=>`${r.width}:${c}`)),[],'Visible combat/city HUD surfaces overlap');
 assert.deepEqual(errors,[]);
}finally{await writeFile(`${out}/results.json`,JSON.stringify({results,errors},null,2));await browser.close();}
