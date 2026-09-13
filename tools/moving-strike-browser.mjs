import {chromium} from 'playwright';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {installEmulatedGamepad} from './playtest/gamepad.mjs';
import {stageMelee} from './playtest/fixtures.mjs';
import {performAction,actionHistory} from './playtest/actions.mjs';
import {observeErrors,saveSnapshot} from './playtest/diagnostics.mjs';
const out=process.env.PW_PLAYTEST_OUT;await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:out}}),page=await context.newPage(),diagnostics=observeErrors(page);
try{
 await installEmulatedGamepad(page);
 await page.goto('http://127.0.0.1:5184/powerworld.html?hero=sol');await page.waitForTimeout(2500);
 await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await page.waitForFunction(()=>PW.game._threatRoom?.active,null,{timeout:90000});
 await stageMelee(page,{trial:'stationary',distance:60});
 await page.evaluate(()=>{window.moveStrikeFrames=[];window.moveStrikeObserving=true;function sample(){const g=PW.game,f=g.player;moveStrikeFrames.push({time:g.time,x:f.pos.x,z:f.pos.z,charge:f.meleeCharge,lx:g.pad.lx,ly:g.pad.ly,strike:g.pad.down('strike')});if(moveStrikeFrames.length>600)moveStrikeFrames.shift();if(moveStrikeObserving)requestAnimationFrame(sample);}sample();});
 await performAction(page,'strike',{scheme:'pad',until:'melee-charged',move:[1,0]});
 await page.waitForFunction(()=>PW.game.pad.lx===0&&!PW.game.pad.down('strike'),null,{timeout:5000});
 const frames=await page.evaluate(()=>{moveStrikeObserving=false;return moveStrikeFrames;}),during=frames.filter(f=>f.strike&&f.lx>.9&&f.charge>0);
 assert(during.length>=2,'Must observe simultaneous stick input and a charging attack');
 const displacement=Math.hypot(during.at(-1).x-during[0].x,during.at(-1).z-during[0].z);
 assert(displacement>1,'Character must actually move while charging');
 const actions=actionHistory(page);assert(actions[0].movementReleased&&actions[0].released&&actions[0].chargeAtRelease>=.6);
 assert.deepEqual(diagnostics.entries,[]);
 await page.screenshot({path:out+'/moving-strike.png'});await saveSnapshot(page,out,{name:'observed-state',errors:diagnostics.entries});
 await writeFile(out+'/result.json',JSON.stringify({passed:true,scheme:'pad',displacement,frames,actions,errors:diagnostics.entries,staging:'Native keyboard menus; stationary Threat Room fixture and initial position/camera staged once. Raw emulated controller stick and strike go through native polling. Read-only frame observations prove movement during charge; this does not assert target contact or physical controller support.'},null,2));
}catch(error){await saveSnapshot(page,out,{error,errors:diagnostics.entries}).catch(()=>{});throw error;}
finally{diagnostics.dispose();const video=await page.video().path();await context.close();await copyFile(video,out+'/moving-strike.webm');await browser.close();}
