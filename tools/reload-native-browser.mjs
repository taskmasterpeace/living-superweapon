import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2]||'artifacts/reload-native';await mkdir(out,{recursive:true});
const viewport=process.argv.includes('--portrait')?{width:900,height:1600}:{width:1600,height:900};
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport,recordVideo:{dir:out,size:viewport}}),page=await context.newPage(),video=page.video();
const result={scope:'Native SARGE Practice startup, fire/R reload, then crouch-walk/fire/R reload. Observation only, no actor/pose/resource/camera overrides.',viewport,errors:[]};page.on('pageerror',e=>result.errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=sarge');await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});await page.bringToFront();await page.mouse.click(viewport.width/2,viewport.height/2);await page.waitForFunction(()=>!!document.pointerLockElement);
 await page.evaluate(()=>{
  window.reloadEvidence={sounds:[],frames:[],samples:[]};const e=reloadEvidence,g=PW.game,f=g.player,w=g.world,lib=g.audio.soundLibrary;
  const play=lib.play;lib.play=function(id,...args){const h=play.call(this,id,...args);if(id.startsWith('reload'))e.sounds.push({id,source:h?.source,accepted:!!h});return h;};
  const render=w.render;let last=null,index=0,action=0;
  w.render=function(...args){const v=render.apply(this,args),r=f._firearmReload;
   if(r&&r!==last){last=r;index=0;action++;}
   const t=r?r.elapsed/r.duration:1,phases=[0,.2,.35,.5,.65,.85,.97],mag=f.parts.armR.children[2].getObjectByName('weapon-magazine');
   if(r)e.samples.push({action,t,mag:mag.position.toArray(),ammo:f.slots.lmb.ammo.loaded,crouch:!!f.crouching,speed:Math.hypot(f.vel.x,f.vel.z)});
   if(action<=2&&((r&&index<phases.length&&t>=phases[index])||(!r&&last&&index<8))){
    const phase=r?index++:7;if(!r){index=8;last=null;}
    e.frames.push({action,phase,t,ammo:f.slots.lmb.ammo.loaded,image:w.renderer.domElement.toDataURL('image/png')});
   }return v;
  };
 });
 for(let n=0;n<2;n++){
  if(n){await page.keyboard.down('KeyC');await page.keyboard.down('KeyW');}
  await page.mouse.down();await page.waitForTimeout(550);await page.mouse.up();await page.keyboard.press('KeyR');
  await page.waitForFunction(()=>!!PW.game.player._firearmReload);await page.waitForFunction(()=>!PW.game.player._firearmReload,null,{timeout:15000});await page.waitForTimeout(400);
  if(n){await page.keyboard.up('KeyW');await page.keyboard.up('KeyC');}
 }
 await page.screenshot({path:`${out}/recovered.png`});
 const e=await page.evaluate(()=>({...reloadEvidence,faults:[...(PW.game._errSeen||[])]}));
 for(const f of e.frames){f.path=`action-${f.action}-phase-${f.phase}.png`;await writeFile(`${out}/${f.path}`,Buffer.from(f.image.split(',')[1],'base64'));delete f.image;}
 Object.assign(result,e);assert.equal(e.frames.length,16);assert.ok(e.samples.some(s=>s.action===2&&s.crouch&&s.speed>3));
 assert.deepEqual(e.sounds.map(s=>s.id),['reload','reload-eject','reload-insert','reload-chamber','reload','reload-eject','reload-insert','reload-chamber']);assert.ok(e.sounds.every(s=>s.accepted&&s.source==='synthesized-placeholder'));
 assert.ok(e.frames.filter(f=>f.phase===7).every(f=>f.ammo===30));assert.deepEqual(e.faults,[]);assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await video.saveAs(`${out}/native-reloads.webm`);await browser.close();console.log(JSON.stringify({passed:result.passed,failure:result.failure,frames:result.frames?.length,sounds:result.sounds,errors:result.errors}));}
