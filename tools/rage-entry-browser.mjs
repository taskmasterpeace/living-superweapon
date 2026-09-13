import {sessionFor} from './playtest/session.mjs';
import {stageMelee} from './playtest/fixtures.mjs';
import {performAction} from './playtest/actions.mjs';
import {observeErrors,saveSnapshot} from './playtest/diagnostics.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.PW_PLAYTEST_OUT||'artifacts/marketing/rage-entry';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1280,height:800},recordVideo:{dir:out}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));const diagnostics=observeErrors(p);
try{
 await p.goto('http://127.0.0.1:5184/powerworld.html?hero=rage');await p.waitForTimeout(2500);await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();await p.waitForFunction(()=>PW.game._threatRoom?.active,null,{timeout:90000});
 sessionFor(p).fixtures.push({kind:'trainer-selection',hero:'kano',status:'staged'});await p.evaluate(()=>{PW.game.ms.threatLab.meleeTrial.selectedThreat='kano';});
 await stageMelee(p,{trial:'stationary',distance:46.8});
 await p.evaluate(()=>{const g=PW.game;window.entryStart={hp:g.ms.threatLab.meleeTrial.target.hp,pos:g.player.pos.toArray(),hero:g.player.def.id};});
 await p.evaluate(()=>{window.entryFrames=[];function capture(){const g=PW.game,a=g.player,t=g.ms.threatLab.meleeTrial.target,m=a._meleeMotion;if(entryFrames.length<300){entryFrames.push({time:g.time,pos:a.pos.toArray(),target:t.pos.toArray(),velocity:t.vel.toArray(),state:a.mstate,mT:a.mT,point:m?.point.toArray(),step:m?.step.toArray()});requestAnimationFrame(capture);}}requestAnimationFrame(capture);});
 await p.bringToFront();await p.waitForFunction(()=>PW.game.ms.threatLab.meleeTrial.target.invuln<=0&&PW.game.time>.6);await p.keyboard.press('t');await performAction(p,'strike');

 await p.waitForFunction(()=>PW.game.player._meleeMotion?.family==='bound'||PW.game.ms.threatLab.meleeTrial.records.some(r=>r.entryFamily==='bound'),null,{timeout:2000});await p.screenshot({path:out+'/approach.png'});
 await p.waitForFunction(()=>PW.game.ms.threatLab.meleeTrial.target.hp<entryStart.hp,null,{timeout:5000});await p.waitForTimeout(700);await p.screenshot({path:out+'/contact.png'});
 const result=await p.evaluate(()=>({lateStart:window.lateStart,start:entryStart,hero:PW.game.player.def.id,pos:PW.game.player.pos.toArray(),flight:PW.game.player.flying,hp:PW.game.ms.threatLab.meleeTrial.target.hp,records:PW.game.ms.threatLab.meleeTrial.records}));assert.equal(result.hero,'rage');assert(result.hp<result.start.hp);assert.equal(result.flight,false);assert.deepEqual(errors,[]);await saveSnapshot(p,out,{name:'observed-state',errors:diagnostics.entries});await writeFile(out+'/result.json',JSON.stringify({passed:true,result,errors,staging:'Native menu; KANO selected in setup, stationary drill and player position staged at 46.8u. Natural spawn immunity expires before native T targeting and shared V strike. No acceptance-time actor movement or damage injection. Silent clip; this is one stationary-target case, not dodge or full-range balance acceptance.'},null,2));
}catch(e){await saveSnapshot(p,out,{error:e,errors:diagnostics.entries}).catch(()=>{});await writeFile(out+'/failed-frames.json',JSON.stringify(await p.evaluate(()=>({late:window.lateStart,frames:window.entryFrames})),null,2));await p.screenshot({path:out+'/failure.png'});console.log(await p.evaluate(()=>{const g=PW.game;return {hero:g.player.def.id,pos:g.player.pos.toArray(),target:g.ms.threatLab?.meleeTrial?.target?.pos.toArray(),motion:g.player._meleeMotion?.family,records:g.ms.threatLab?.meleeTrial?.records};}));throw e;}
finally{const v=await p.video().path();await c.close();await copyFile(v,out+'/rage-entry.webm');await b.close();}
