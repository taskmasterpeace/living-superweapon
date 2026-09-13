import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir,writeFile,copyFile} from 'node:fs/promises';
const out='artifacts/marketing/training-beacon-departure-2026-09-12';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1280,height:800},recordVideo:{dir:out}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5184/powerworld.html?hero=sandra');await p.waitForTimeout(2500);await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();await p.waitForFunction(()=>window.PW?.game?._threatRoom?.active,{},{timeout:90000});
 await p.keyboard.press('x');await p.waitForFunction(()=>PW.game.player.items[0].state==='deployed',{},{timeout:5000});
 await p.evaluate(()=>{const g=PW.game;window.oldBeaconMesh=g.player.items[0].mesh;window.beaconCharges=g.player.items[0].charges;g.player.pos.copy(g.ms.threatLab.origin).add({x:0,y:0,z:18});g.player.vel.set(0,0,0);g.player.faceDir(0,-1);g.world._lookYaw=Math.PI;g.world._lookPitch=0;g.world._chaseSnap=true;});
 await p.waitForTimeout(250);await p.keyboard.press('e');await p.waitForFunction(()=>PW.game.ms.threatLab.state==='deploying',{},{timeout:5000});
 await p.keyboard.down('w');await p.waitForFunction(()=>PW.game.ms.threatLab.state==='field',{},{timeout:10000});await p.keyboard.up('w');
 const result=await p.evaluate(()=>{const g=PW.game,i=g.player.items[0];return {state:i.state,cd:i.cd,pos:i.pos,mesh:!!i.mesh,oldMeshRemoved:!oldBeaconMesh.parent,charges:i.charges,previousCharges:beaconCharges,room:!!g._threatRoom};});
 assert.equal(result.state,'cooldown');assert.ok(result.cd>0);assert.equal(result.pos,null);assert.equal(result.mesh,false);assert.ok(result.oldMeshRemoved);assert.equal(result.charges,result.previousCharges);assert.equal(result.room,false);
 await p.waitForFunction(()=>PW.game.player.items[0].state==='ready',{},{timeout:6000});await p.keyboard.press('x');await p.waitForFunction(()=>PW.game.player.items[0].state==='deployed',{},{timeout:5000});
 const placed=await p.evaluate(()=>{const g=PW.game,i=g.player.items[0];return {distance:i.pos.distanceTo(g.player.pos),room:i._trainingRoom};});assert.ok(placed.distance<4);assert.equal(placed.room,null);assert.deepEqual(errors,[]);
 await p.screenshot({path:out+'/field-beacon.png'});await writeFile(out+'/result.json',JSON.stringify({result,placed,errors},null,2));console.log({result,placed,errors});
}finally{const video=await p.video().path();await c.close();await copyFile(video,out+'/beacon.webm');await b.close();}
