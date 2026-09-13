import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir,writeFile,copyFile} from 'node:fs/promises';
const out='artifacts/marketing/training-hazard-departure-2026-09-12';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1280,height:800},recordVideo:{dir:out}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5184/powerworld.html?hero=sarge');await p.waitForTimeout(2500);await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();await p.waitForFunction(()=>window.PW?.game?._threatRoom?.active,{},{timeout:90000});
 // Fixture installs an existing native gas gadget kind; not a catalog-issuance test.
 await p.evaluate(()=>{const g=PW.game;window.testRoom=g._threatRoom;g.player.items[0]={def:{kind:'gas',payload:'teargas',r:16,dur:8,charges:1},charges:1,state:'ready',cd:0};g.player._selectedGadget=0;g.player.pos.copy(g.ms.threatLab.origin).add({x:0,y:0,z:18});g.player.vel.set(0,0,0);g.player.faceDir(0,-1);g.world._lookYaw=Math.PI;g.world._chaseSnap=true;});
 await p.waitForTimeout(200);await p.keyboard.press('x');await p.waitForFunction(()=>PW.game._smoke.length>0,{},{timeout:5000});
 const before=await p.evaluate(()=>({smoke:PW.game._smoke.length,timers:testRoom._effectTimers.size}));assert.ok(before.timers>0);
 await p.screenshot({path:out+'/training-smoke.png'});await p.keyboard.press('e',{delay:120});console.log(await p.evaluate(()=>({state:PW.game.ms.threatLab.state,focus:PW.game._focus?.id,pos:PW.game.player.pos.toArray(),grab:PW.game.player._contextGrab,stagger:PW.game.player.staggerT,sleep:PW.game.player.sleepT,frozen:PW.game.player.frozenT,paused:PW.game.paused,alive:PW.game.player.alive})));await p.waitForFunction(()=>PW.game.ms.threatLab.state==='deploying',{},{timeout:5000});
 await p.keyboard.down('w');await p.waitForFunction(()=>PW.game.ms.threatLab.state==='field',{},{timeout:10000});await p.keyboard.up('w');await p.waitForTimeout(1800);
 const after=await p.evaluate(()=>({state:PW.game.ms.threatLab.state,smoke:PW.game._smoke?.length||0,timers:testRoom._effectTimers.size,room:!!PW.game._threatRoom}));assert.equal(after.state,'field');assert.equal(after.smoke,0);assert.equal(after.timers,0);assert.equal(after.room,false);assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({setup:'Existing gas-kind fixture plus native X activation, E ready and W crossing; controlled position near portal.',before,after,errors},null,2));console.log({before,after,errors});
}finally{const video=await p.video().path();await c.close();await copyFile(video,out+'/hazards.webm');await b.close();}
