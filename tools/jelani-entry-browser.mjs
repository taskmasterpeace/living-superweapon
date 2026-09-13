import {chromium} from 'playwright';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/marketing/jelani-entry-2026-09-13';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1280,height:800},recordVideo:{dir:out}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5184/powerworld.html?hero=jelani');await p.waitForTimeout(2500);await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();await p.waitForFunction(()=>PW.game._threatRoom?.active,null,{timeout:90000});
 await p.evaluate(()=>{const g=PW.game,a=g.player,t=g.ms.threatLab.meleeTrial;t.origin.set(0,0,0);const v=t.start('retreat');a.pos.set(0,0,50);a.vel.set(0,0,0);v.invuln=0;g.world._lookYaw=Math.PI;g.world._lookPitch=0;a.faceDir(0,-1);a.aim3.set(0,0,-1);window.entryStart={hp:v.hp,pos:a.pos.toArray(),hero:a.def.id};});
 await p.waitForTimeout(250);await p.keyboard.press('t');await p.keyboard.press('v');
 await p.waitForFunction(()=>PW.game.player._meleeMotion?.family==='tackle',null,{timeout:2000});await p.screenshot({path:out+'/approach.png'});
 await p.waitForFunction(()=>PW.game.ms.threatLab.meleeTrial.target.hp<entryStart.hp,null,{timeout:5000});await p.waitForTimeout(700);await p.screenshot({path:out+'/contact.png'});
 const result=await p.evaluate(()=>({start:entryStart,hero:PW.game.player.def.id,pos:PW.game.player.pos.toArray(),flight:PW.game.player.flying,hp:PW.game.ms.threatLab.meleeTrial.target.hp,records:PW.game.ms.threatLab.meleeTrial.records}));assert.equal(result.hero,'jelani');assert(result.hp<result.start.hp);assert.equal(result.flight,false);assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,result,errors,staging:'Native menu; retreat drill and starting positions staged once. T lock and V attack through keyboard; native target retreat, simulation and contact. Silent video; not full AI/roster balance acceptance.'},null,2));
}catch(e){await p.screenshot({path:out+'/failure.png'});console.log(await p.evaluate(()=>{const g=PW.game;return {hero:g.player.def.id,pos:g.player.pos.toArray(),target:g.ms.threatLab?.meleeTrial?.target?.pos.toArray(),motion:g.player._meleeMotion?.family,records:g.ms.threatLab?.meleeTrial?.records};}));throw e;}
finally{const v=await p.video().path();await c.close();await copyFile(v,out+'/jelani-entry.webm');await b.close();}
