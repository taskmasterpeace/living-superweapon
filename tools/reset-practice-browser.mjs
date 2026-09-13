import {chromium} from 'playwright';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {stageMelee} from './playtest/fixtures.mjs';
import {performAction,actionHistory} from './playtest/actions.mjs';
import {observeErrors,saveSnapshot} from './playtest/diagnostics.mjs';
const out=process.env.PW_PLAYTEST_OUT;await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:out}}),page=await context.newPage(),diagnostics=observeErrors(page);
const observe=()=>page.evaluate(()=>{const g=PW.game,t=g.ms.threatLab.meleeTrial,f=g.player;return {player:f.id,target:t.target.id,kind:t.kind,entities:g.entities.map(e=>e.id),hp:f.hp,maxHp:f.maxHp,ki:f.ki,maxKi:f.maxKi,stock:JSON.stringify(g.ms.threatLab.stock),manifest:JSON.stringify(g.ms.threatLab.manifest?.map(e=>e.id)),focus:g._focus?.id};});
try{
 await page.goto('http://127.0.0.1:5184/powerworld.html?hero=sol');await page.waitForTimeout(2500);await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();await page.waitForFunction(()=>PW.game._threatRoom?.active,null,{timeout:90000});
 await stageMelee(page,{placement:'reset-console',trial:'stationary'});
 const baseline=await observe(),cycles=[];
 for(let i=0;i<3;i++){
  await page.waitForFunction(()=>PW.game.player.slots.lmb.cd<=0,null,{timeout:5000});
  await performAction(page,'primary',{holdMs:1500});
  await page.waitForFunction(()=>PW.game.player.ki<PW.game.player.maxKi-1,null,{timeout:5000});
  await page.waitForFunction(()=>!Object.values(PW.game.player.slots).some(s=>s.active||s.charging||s.sustainT>0),null,{timeout:5000});
  const before=await observe();assert(before.ki<before.maxKi-1,'Native beam must spend energy');
  await page.waitForFunction(()=>PW.game._focus?.id==='threat-melee-repeat',null,{timeout:5000});
  await performAction(page,'grab');
  await page.waitForFunction(id=>PW.game.ms.threatLab.meleeTrial.target.id!==id,before.target,{timeout:5000});
  const after=await observe();assert.equal(after.player,baseline.player);assert.equal(after.ki,after.maxKi);assert.equal(after.hp,after.maxHp);assert.equal(after.stock,baseline.stock);assert.equal(after.manifest,baseline.manifest);assert.equal(after.entities.length,baseline.entities.length);assert(!after.entities.includes(before.target));assert.equal(after.kind,'stationary');cycles.push({before,after});
 }
 assert.deepEqual(diagnostics.entries,[]);await page.screenshot({path:out+'/reset-console.png'});await saveSnapshot(page,out,{name:'observed-state',errors:diagnostics.entries});await writeFile(out+'/result.json',JSON.stringify({passed:true,cycles,actions:actionHistory(page),errors:diagnostics.entries,staging:'Native menus; one setup positions player facing the reset console and starts a stationary trial nearby. Three native beam bursts spend energy, E resets each time. Checks player identity, reserve/manifest stability and actor retirement. No outcome injection; damage, KO, carried props and live powers need separate reset cases.'},null,2));
}catch(error){await saveSnapshot(page,out,{error,errors:diagnostics.entries}).catch(()=>{});throw error;}
finally{diagnostics.dispose();const video=await page.video().path();await context.close();await copyFile(video,out+'/reset-console.webm');await browser.close();}
