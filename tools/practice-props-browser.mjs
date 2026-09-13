import {chromium} from 'playwright';import {mkdir,writeFile,copyFile} from 'node:fs/promises';import assert from 'node:assert/strict';
import {sessionFor,beginAcceptance} from './playtest/session.mjs';import {performAction,actionHistory} from './playtest/actions.mjs';import {observeErrors,saveSnapshot} from './playtest/diagnostics.mjs';
const out=process.env.PW_PLAYTEST_OUT||'artifacts/marketing/practice-props-2026-09-12';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out}}),p=await c.newPage(),diagnostics=observeErrors(p);
try{
 await p.goto('http://127.0.0.1:5184/powerworld.html?hero=sol');await p.waitForTimeout(2500);await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();await p.waitForFunction(()=>PW.game.ms?.threatLab?.state==='preparing',null,{timeout:90000});
 const record={kind:'practice-prop-near-console',status:'staging'};sessionFor(p).fixtures.push(record);
 record.result=await p.evaluate(()=>{const g=PW.game,l=g.ms.threatLab,h=l.trialRepeatHandle.pos,e=l.practiceProps.entries[0],r=e.ref;window.__practiceRock=r;window.__rockCount=g.world.rocks.length;
 r.x=h.x+13;r.z=h.z;r.mesh.position.set(r.x,g.world.heightAt(r.x,r.z),r.z);e.position.copy(r.mesh.position);
 g.player.pos.set(h.x+16,g.world.heightAt(h.x+16,h.z),h.z);g.player.vel.set(0,0,0);g.world._lookYaw=-Math.PI/2;g.world._lookPitch=0;g.player.faceDir(-1,0);g.player.aim3.set(-1,0,0);return {rockCount:g.world.rocks.length,player:g.player.id};});record.status='staged';beginAcceptance(p);
 await performAction(p,'grab');await p.waitForFunction(()=>PW.game.player._carry?.sourceRef===__practiceRock,null,{timeout:5000});await p.screenshot({path:out+'/carry-rock.png'});await saveSnapshot(p,out,{name:'carrying'});
 await performAction(p,'grab',{until:'grab-armed'});
 await p.waitForFunction(()=>!PW.game.player._carry&&!PW.game._flung?.some(f=>f.sourceRef===__practiceRock),null,{timeout:10000});
 const spent=await p.evaluate(()=>({carried:__practiceRock.carried,visible:__practiceRock.mesh.visible}));assert(spent.carried||!spent.visible,'Thrown rock must require restoration');
 // Walk the short approach through keyboard input; no post-acceptance relocation.
 await p.keyboard.down('w');try{await p.waitForFunction(()=>PW.game._focus?.id==='threat-melee-repeat',null,{timeout:5000,polling:50});}finally{await p.keyboard.up('w');}
 await performAction(p,'grab');
 await p.waitForFunction(()=>!__practiceRock.carried&&__practiceRock.mesh.visible,null,{timeout:5000});
 const result=await p.evaluate(()=>({sameRecord:PW.game.world.rocks.includes(__practiceRock),countStable:PW.game.world.rocks.length===__rockCount,visible:__practiceRock.mesh.visible,carried:__practiceRock.carried,held:!!PW.game.player._carry,inFlight:!!PW.game._flung?.some(f=>f.sourceRef===__practiceRock)}));
 assert(result.sameRecord&&result.countStable&&result.visible&&!result.carried&&!result.held&&!result.inFlight);assert.deepEqual(diagnostics.entries,[]);
 await p.screenshot({path:out+'/reset-rocks.png'});await saveSnapshot(p,out,{name:'observed-state',errors:diagnostics.entries});await writeFile(out+'/result.json',JSON.stringify({passed:true,...result,spent,actions:actionHistory(p),errors:diagnostics.entries,staging:'One setup relocates a practice rock and player near the reset console. Native E pickup, held E throw, keyboard W walk until reset prompt, then E reset. No post-input relocation or direct reset invocation. This proves restoration after a completed throw, not reset denial while a prop is airborne.'},null,2));
}catch(error){await saveSnapshot(p,out,{error,errors:diagnostics.entries}).catch(()=>{});throw error;}
finally{diagnostics.dispose();const video=await p.video().path();await c.close();await copyFile(video,out+'/practice-props.webm');await b.close();}
