import {chromium} from 'playwright';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {sessionFor,beginAcceptance} from './playtest/session.mjs';
import {performAction,actionHistory} from './playtest/actions.mjs';
import {observeErrors,saveSnapshot} from './playtest/diagnostics.mjs';
const out=process.env.PW_PLAYTEST_OUT;await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1280,height:800},recordVideo:{dir:out}}),p=await c.newPage(),diagnostics=observeErrors(p);
const session=sessionFor(p),fixture={kind:'research-approach',status:'staging',description:'Native menus; place player at portal console and portal, then lab approach with one stationary one-HP enemy. No position or HP changes after acceptance begins.'};session.fixtures.push(fixture);session.phase='staging';
try{
 await p.goto('http://127.0.0.1:5184/powerworld.html?hero=sol');await p.waitForTimeout(2500);await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();await p.waitForFunction(()=>PW.game._threatRoom?.active,null,{timeout:90000});
 await p.evaluate(()=>{const g=PW.game;g.player.pos.copy(g.ms.threatLab.handle.pos);g.player.pos.y=0;g.player.vel.set(0,0,0);});await p.waitForTimeout(300);await p.keyboard.press('e');await p.evaluate(()=>PW.game.player.pos.copy(PW.game.ms.threatLab.origin));await p.waitForFunction(()=>PW.game.ms.threatLab.state==='field');await p.waitForFunction(()=>PW.game.ms.fieldResearch?.terminal,null,{timeout:90000});
 const before=await p.evaluate(()=>{const g=PW.game,lab=g.pwStage.researchLab.site,at={x:lab.x-9,z:lab.z+40};const t=g.spawnEnemy('merc',{team:g.player.team===0?1:0,x:at.x,z:at.z,noRespawn:true});window.firstTarget=t;t.hp=1;t.ai=null;t._encounterNPC=true;t.vel.set(0,0,0);g.player.pos.set(at.x,g.world.heightAt(at.x,at.z+6),at.z+6);g.player.vel.set(0,0,0);g.player.flying=false;g.world._lookYaw=Math.PI;g.world._lookPitch=0;g.world._chaseSnap=true;return {capacity:g.player.maxKi,player:g.player.id,target:t.id,stock:JSON.stringify(g.ms.threatLab.stock),rank:g.ms.fieldResearch.ranks};});fixture.status='staged';fixture.result=before;session.phase='setup';beginAcceptance(p);await p.waitForTimeout(600);await p.keyboard.press('t');await p.waitForFunction(()=>PW.game.hardLock===window.firstTarget,null,{timeout:3000});await performAction(p,'strike');await p.waitForFunction(()=>PW.game.ms.fieldResearch.samples.length>0,null,{timeout:10000});

 await p.waitForTimeout(300);await performAction(p,'grab');await p.waitForFunction(()=>PW.game.ms.fieldResearch.carried);await p.screenshot({path:out+'/sample.png'});
 async function walkTo(zOffset){await p.keyboard.down('w');try{await p.waitForFunction(z=>PW.game.player.pos.z<PW.game.pwStage.researchLab.site.z+z,zOffset,{timeout:15000});}finally{await p.keyboard.up('w');}await p.waitForTimeout(150);}
 await walkTo(32);await performAction(p,'grab');await p.waitForFunction(()=>PW.game.pwStage.researchLab.doorHandle.verb==='CLOSE');await p.screenshot({path:out+'/door.png'});
 await walkTo(10);await performAction(p,'grab');await p.waitForFunction(()=>PW.game.ms.fieldResearch.ranks===1);const upgradedCapacity=await p.evaluate(()=>PW.game.player.maxKi);assert.equal(upgradedCapacity,before.capacity+10);await p.screenshot({path:out+'/upgrade.png'});

 const result=await p.evaluate(()=>{const g=PW.game,r=g.ms.fieldResearch;return {player:g.player.id,capacity:g.player.maxKi,rank:r.ranks,carried:r.carried,events:r.events,stock:JSON.stringify(g.ms.threatLab.stock),targetAlive:window.firstTarget.alive};});
 assert.equal(result.player,before.player);assert.equal(result.rank,before.rank+1);assert.equal(result.carried,null);assert.equal(result.stock,before.stock);assert.equal(result.targetAlive,false);assert.deepEqual(diagnostics.entries,[]);
 await saveSnapshot(p,out,{name:'observed-state',errors:diagnostics.entries});
 await writeFile(out+'/result.json',JSON.stringify({passed:true,before,...result,actions:actionHistory(p),errors:diagnostics.entries,staging:fixture.description+' Native T lock and bounded W walking are explicit browser inputs outside the shared action history. V and E use the shared adapter. Checks KO, collection, door, analysis, capacity and reserve conservation; not transport, fight-again or balance acceptance.'},null,2));
}catch(error){if(session.phase==='staging'){fixture.status='failed';session.phase='failed';}await saveSnapshot(p,out,{error,errors:diagnostics.entries}).catch(()=>{});throw error;}
finally{diagnostics.dispose();const v=await p.video().path();await c.close();await copyFile(v,out+'/research-checkpoint.webm');await b.close();}
