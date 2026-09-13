import {installEmulatedGamepad} from './playtest/gamepad.mjs';
import {stageMelee} from './playtest/fixtures.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {performAction,actionHistory} from './playtest/actions.mjs';
import {observeErrors,saveSnapshot} from './playtest/diagnostics.mjs';
const {facing='front',attack='defend',scheme='kbm'}=JSON.parse(process.env.PW_PLAYTEST_CONFIG||'{}');assert(['front','rear'].includes(facing),'Unknown guard facing');assert(['defend','heavy','grab'].includes(attack),'Unknown guard attack');
const out=process.env.PW_PLAYTEST_OUT||'artifacts/marketing/guard-drill';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:scheme==='touch'?{width:844,height:390}:{width:1280,height:800},isMobile:scheme==='touch',hasTouch:scheme==='touch',recordVideo:{dir:out}}),page=await context.newPage(),diagnostics=observeErrors(page);
const act=(name,options={})=>performAction(page,name,{scheme,...options});
try{
 if(scheme==='pad')await installEmulatedGamepad(page);
 await page.goto('http://127.0.0.1:5184/powerworld.html?hero=sol');await page.waitForTimeout(2500);if(scheme==='touch'){await page.getByRole('button',{name:'Select character',exact:true}).tap();await page.getByRole('button',{name:'Enter with squad',exact:true}).tap();}else{await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();}await page.waitForFunction(()=>PW.game._threatRoom?.active,null,{timeout:90000});
 await stageMelee(page,{trial:attack!=='defend'?'guard':'defend',distance:attack==='grab'?6:attack==='heavy'?8:14,facing});
 await page.evaluate(({attack})=>{window.guardObservation=[];let count=0;function observe(){const g=PW.game;guardObservation.push({time:g.time,guard:(attack!=='defend'?g.ms.threatLab.meleeTrial.target:g.player).guarding,incoming:g.ms.threatLab.meleeTrial.records.filter(r=>attack!=='defend'?!r.incoming:r.incoming).length});if(guardObservation.length>120)guardObservation.shift();if(++count<600&&!guardObservation.at(-1).incoming)requestAnimationFrame(observe);}requestAnimationFrame(observe);},{facing,attack});
 let records=[],grab=null;
 if(attack==='grab'){
  await page.waitForFunction(()=>{const t=PW.game.ms.threatLab.meleeTrial.target;return t.guarding&&t.invuln<=0;},null,{timeout:10000});
  await act('grab');
  await page.waitForFunction(()=>PW.game.player.grabbing===PW.game.ms.threatLab.meleeTrial.target,null,{timeout:5000});
  grab=await page.evaluate(()=>{const g=PW.game,t=g.ms.threatLab.meleeTrial.target;return {holder:g.player.id,victim:t.id,reciprocal:t.grabbedBy===g.player};});assert(grab.reciprocal);
  await page.screenshot({path:out+'/grab-connected.png'});await saveSnapshot(page,out,{name:'grab-connected',errors:diagnostics.entries});
  const beforeRelease=await page.evaluate(()=>({time:PW.game.time,held:!!PW.game.player.grabbing,remaining:PW.game.player.grabT}));assert(beforeRelease.held&&beforeRelease.remaining>1,'Capture must leave time for an intentional release');
  await act('grab');
  await page.waitForFunction(()=>{const g=PW.game;return !g.player.grabbing&&!g.ms.threatLab.meleeTrial.target.grabbedBy&&!g.player._personCarry;},null,{timeout:5000});grab.released=true;grab.releaseElapsed=await page.evaluate(t=>PW.game.time-t,beforeRelease.time);assert(grab.releaseElapsed<.75,'Release must precede grab expiry');
 }
 if(attack==='heavy'){await page.waitForFunction(()=>PW.game.ms.threatLab.meleeTrial.target.guarding);await act('strike',{until:'melee-charged'});await page.waitForFunction(()=>PW.game.ms.threatLab.meleeTrial.records.some(r=>!r.incoming),null,{timeout:5000});records=await page.evaluate(()=>PW.game.ms.threatLab.meleeTrial.records.filter(r=>!r.incoming));}
 for(let i=0;attack==='defend'&&i<5&&!records.length;i++){await act('guard',{holdMs:1500});records=await page.evaluate(()=>PW.game.ms.threatLab.meleeTrial.records.filter(r=>r.incoming));}
 if(attack!=='grab'){assert(records.length,'Trainer must make actual contact; invulnerability or a miss is not a successful guard test');
 const observation=await page.evaluate(()=>guardObservation);assert(observation.findLast(x=>!x.incoming)?.guard,'Native guard must be active immediately before contact');
 const hit=records[0];if(attack==='heavy'){assert.equal(hit.result,'GUARD BROKEN');assert.equal(hit.guardBreakReason,'heavy-crush');assert.equal(hit.healthLost,0);assert(hit.guardEnergySpent>0);}else if(facing==='rear'){assert.equal(hit.blocked,false);assert(hit.healthLost>0,'Rear hit must hurt health');assert.equal(hit.guardEnergySpent,0);}else{assert.equal(hit.blocked,true,'First incoming contact must be blocked');assert.equal(hit.healthLost,0,'Funded frontal guard must preserve health');assert(hit.guardEnergySpent>0,'Real guard contact must spend energy');}}
 const actions=actionHistory(page);assert(actions.length>0&&actions.every(a=>a.scheme===scheme&&a.status==='dispatched'&&a.released),'Every combat action must use the requested scheme and release successfully');
 const observation=await page.evaluate(()=>guardObservation),hit=records[0]||null;
 assert.deepEqual(diagnostics.entries,[]);await page.screenshot({path:out+'/guard-contact.png'});await saveSnapshot(page,out,{name:'observed-state',errors:diagnostics.entries});
 await writeFile(out+'/result.json',JSON.stringify({passed:true,facing,attack,scheme,actions,observation,hit,grab,errors:diagnostics.entries,staging:'Native character/squad menus; guard/defend trial and initial positions/camera staged once. Shared combat actions use the configured KBM, browser-emulated gamepad or browser touch through the real input adapter; touch mode also taps menus. Trainer uses native attack/contact. No damage, energy, immunity or outcome injection. Silent clip; configured light defense, charged-heavy or grab/release counterplay only; grab escape/counterstrikes and depleted energy remain separate.'},null,2));
}catch(error){await saveSnapshot(page,out,{error,errors:diagnostics.entries}).catch(()=>{});throw error;}
finally{diagnostics.dispose();const video=await page.video().path();await context.close();await copyFile(video,out+'/guard-drill.webm');await browser.close();}
