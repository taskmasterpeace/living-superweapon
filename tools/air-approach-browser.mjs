import {chromium} from 'playwright';import {mkdir,writeFile,copyFile} from 'node:fs/promises';import assert from 'node:assert/strict';
import {stageMelee} from './playtest/fixtures.mjs';import {performAction,actionHistory} from './playtest/actions.mjs';import {observeErrors,saveSnapshot} from './playtest/diagnostics.mjs';
const {defense=false}=JSON.parse(process.env.PW_PLAYTEST_CONFIG||'{}');
const out=process.env.PW_PLAYTEST_OUT;await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out}}),p=await c.newPage(),diagnostics=observeErrors(p);
try{
 await p.goto('http://127.0.0.1:5184/powerworld.html?hero=sol');await p.waitForTimeout(2500);await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();await p.waitForFunction(()=>PW.game._threatRoom?.active,null,{timeout:90000});
 await p.mouse.move(640,360);
 await stageMelee(p,{trial:defense?'air-defense':'airborne',distance:30});
 await performAction(p,'up',{until:'flight-height'});
 await p.waitForFunction(()=>{const t=PW.game.ms.threatLab.meleeTrial.target;return t.flying&&!t.flyHeld&&Math.abs(t.vel.y)<3;},null,{timeout:15000});
 await p.waitForFunction(()=>Math.abs(PW.game.player.vel.y)<2,null,{timeout:10000});
 for(let i=0;i<2;i++){
 const look=await p.evaluate(()=>{const g=PW.game,t=g.ms.threatLab.meleeTrial.target,w=g.world,c=w.camera.position,dx=t.pos.x-c.x,dy=t.pos.y+5.2-c.y,dz=t.pos.z-c.z;return {x:g.input._lastCX,y:g.input._lastCY,dyaw:Math.atan2(Math.sin(Math.atan2(dx,dz)-w._lookYaw),Math.cos(Math.atan2(dx,dz)-w._lookYaw)),dpitch:Math.atan2(dy,Math.hypot(dx,dz))-w._lookPitch,sens:w._lookSens};});
 await p.mouse.move(look.x-look.dyaw/look.sens,look.y-look.dpitch/look.sens);await p.waitForTimeout(250);
 }
 if(!defense){await p.keyboard.press('t');await p.waitForFunction(()=>PW.game.hardLock===PW.game.ms.threatLab.meleeTrial.target,null,{timeout:3000});}
 const before=await p.evaluate(()=>{const g=PW.game,t=g.ms.threatLab.meleeTrial.target;return {time:g.time,playerHp:g.player.hp,playerAir:g.player.flying,targetAir:t.flying,hp:t.hp,distance:g.player.pos.distanceTo(t.pos),locked:g.hardLock?.id,target:t.id};});
 assert(before.playerAir&&before.targetAir);if(!defense)assert.equal(before.locked,before.target);if(!defense)assert(before.distance>15,'Must begin outside ordinary fist reach');
 let block=null;
 if(defense){
 for(let i=0;i<6&&!block;i++){await performAction(p,'guard',{holdMs:1500});block=await p.evaluate(time=>PW.game.ms.threatLab.meleeTrial.records.find(r=>r.incoming&&r.time>time),before.time);}
 assert(block,'Must observe a new incoming contact');assert.equal(block.result,'BLOCK');assert.equal(block.healthLost,0);assert(block.guardEnergySpent>0);
 }else{await performAction(p,'strike');await p.waitForFunction(()=>PW.game.ms.threatLab.meleeTrial.records.some(r=>!r.incoming&&r.healthLost>0),null,{timeout:10000});}
 const after=await p.evaluate(()=>{const g=PW.game,t=g.ms.threatLab.meleeTrial.target;return {hp:t.hp,playerAir:g.player.flying,records:g.ms.threatLab.meleeTrial.records};});if(!defense)assert(after.hp<before.hp);assert(after.playerAir);assert.deepEqual(diagnostics.entries,[]);
 await p.screenshot({path:out+'/air-contact.png'});await saveSnapshot(p,out,{name:'observed-state',errors:diagnostics.entries});await writeFile(out+'/result.json',JSON.stringify({passed:true,defense,block,before,after,actions:actionHistory(p),errors:diagnostics.entries,staging:'One ground setup at 30u from airborne trainer. Native held Space takes off, trainer natively rises and hovers, Mouse aims; approach mode uses T lock and V strike, defense mode faces the attacker and holds Q without requiring lock. No altitude, flight flag, motion or damage injection after setup. This tests a hover-target approach or one airborne guard contact, not evasion or full air-combat balance.'},null,2));
}catch(error){await saveSnapshot(p,out,{error,errors:diagnostics.entries}).catch(()=>{});throw error;}
finally{diagnostics.dispose();const video=await p.video().path();await c.close();await copyFile(video,out+'/air-contact.webm');await b.close();}
