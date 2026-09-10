import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2]||'artifacts/throwable-native';await mkdir(out,{recursive:true});
const portrait=process.argv.includes('--portrait'),viewport=portrait?{width:900,height:1600}:{width:1600,height:900};
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport,recordVideo:{dir:out,size:viewport}}),page=await context.newPage(),video=page.video();
const result={scope:'Native SARGE Practice. Standing G, moving/crouched G, then rifle fire. Observation wrappers only; no actor, camera, resource or pose overrides.',viewport,errors:[]};
page.on('pageerror',e=>result.errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=sarge');await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});await page.bringToFront();await page.mouse.click(viewport.width/2,viewport.height/2);await page.waitForFunction(()=>!!document.pointerLockElement);
 await page.keyboard.down('KeyW');await page.waitForTimeout(1200);await page.keyboard.up('KeyW');await page.waitForTimeout(350);
 await page.evaluate(()=>{
  window.throwEvidence={samples:[],frames:[],sounds:[],shots:[]};const e=throwEvidence,g=PW.game,f=g.player,w=g.world,lib=g.audio.soundLibrary;
  const play=lib.play;lib.play=function(id,...args){const h=play.call(this,id,...args);if(id.startsWith('grenade-'))e.sounds.push({id,source:h?.source,accepted:!!h});return h;};
  const spawn=g.projectiles.spawnProjectile;g.projectiles.spawnProjectile=function(c,d,...args){const s=spawn.call(this,c,d,...args);if(c===f&&d.canister)e.shots.push({time:g.time,origin:s.pos.toArray(),release:c._throwAction?.releasePosition.toArray(),sameShell:s.obj===c._throwAction?.prop});return s;};
  const render=w.render;let lastAction=null,index=0,action=0;
  w.render=function(...args){const v=render.apply(this,args),m=f._throwAction;
   if(m&&m!==lastAction){lastAction=m;index=0;action++;}
   const t=m?m.elapsed:-1,phases=[0,.095,.19,.285,.38,.54];
   if(m)e.samples.push({action,t,hand:f.parts.armL.children[2].getWorldPosition(f.pos.clone()).toArray(),released:m.released,crouch:!!f.crouching,speed:Math.hypot(f.vel.x,f.vel.z)});
   if(action<=2&&((m&&index<phases.length&&t>=phases[index])||(!m&&lastAction&&index<7))){
    const phase=m?index++:6;if(!m){index=7;lastAction=null;}
    e.frames.push({action,phase,t,image:w.renderer.domElement.toDataURL('image/png')});
   }
   return v;
  };
 });
 await page.keyboard.press('KeyG');await page.waitForTimeout(1200);await page.screenshot({path:`${out}/01-recovered.png`});
 await page.keyboard.down('KeyC');await page.keyboard.down('KeyW');await page.waitForTimeout(400);await page.keyboard.press('KeyG');await page.waitForTimeout(1150);
 await page.keyboard.up('KeyW');await page.keyboard.up('KeyC');await page.waitForTimeout(400);
 await page.mouse.down();await page.waitForTimeout(350);await page.mouse.up();await page.screenshot({path:`${out}/02-rifle-after-throws.png`});
 const e=await page.evaluate(()=>({...throwEvidence,ammo:PW.game.player.slots.lmb.ammo.loaded,faults:[...(PW.game._errSeen||[])]}));
 for(const f of e.frames){const name=`action-${f.action}-phase-${f.phase}.png`;await writeFile(`${out}/${name}`,Buffer.from(f.image.split(',')[1],'base64'));delete f.image;f.path=name;}
 Object.assign(result,e);assert.equal(e.shots.length,2);assert.ok(e.shots.every(s=>s.sameShell&&s.origin.every((v,i)=>Math.abs(v-s.release[i])<1e-6)));
 assert.deepEqual(e.sounds.map(s=>s.id),['grenade-prepare','grenade-release','grenade-prepare','grenade-release']);assert.ok(e.sounds.every(s=>s.accepted&&s.source==='synthesized-placeholder'));
 assert.ok(e.samples.some(s=>s.action===2&&s.crouch&&s.speed>3));assert.equal(e.frames.length,14);assert.ok(e.ammo<29);assert.deepEqual(e.faults,[]);assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await video.saveAs(`${out}/native-throws.webm`);await browser.close();console.log(JSON.stringify({passed:result.passed,failure:result.failure,frames:result.frames?.length,shots:result.shots,sounds:result.sounds,errors:result.errors}));}
