import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
const out='artifacts/marketing/training-weather-departure-2026-09-12';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1280,height:800},recordVideo:{dir:out}}),p=await c.newPage(),errors=[];
p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5184/powerworld.html?hero=tempest');await p.waitForTimeout(2500);
 await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await p.waitForFunction(()=>window.PW?.game?._threatRoom?.active,{},{timeout:90000});
 await p.evaluate(()=>{const g=PW.game;window.trainingWeather=g.weather;window.desertWeather=g._threatRoom.weatherScope.saved;desertWeather.set('rain',{instant:true});window.startStock={...g.ms.threatLab.stock.remaining};g.player.pos.set(0,0,40);g.player.vel.set(0,0,0);g.world._lookYaw=0;g.world._lookPitch=0;g.world._chaseSnap=true;});
 await p.waitForTimeout(300);await p.keyboard.press('3');await p.waitForFunction(()=>PW.game.weather.layers.size===1,{},{timeout:5000});
 await p.evaluate(()=>{window.trainingStorm=[...PW.game.weather.layers.values()][0];const g=PW.game;g.player.pos.copy(g.ms.threatLab.origin).add({x:0,y:0,z:18});g.player.vel.set(0,0,0);g.player.faceDir(0,-1);g.world._lookYaw=Math.PI;g.world._lookPitch=0;g.world._chaseSnap=true;});
 await p.waitForTimeout(250);await p.keyboard.press('e');
 await p.waitForFunction(()=>PW.game.ms.threatLab.state==='deploying',{},{timeout:5000});
 await p.screenshot({path:out+'/ready.png'});
 await p.keyboard.down('w');await p.waitForFunction(()=>PW.game.ms.threatLab.state==='field',{},{timeout:10000});await p.keyboard.up('w');
 await p.waitForTimeout(500);
 const result=await p.evaluate(()=>{const g=PW.game;return {state:g.ms.threatLab.state,room:!!g._threatRoom,sameWeather:g.weather===desertWeather,weather:g.weather.stateId,time:g.weather.time,trainingDisposed:trainingStorm.disposed,trainingLayers:trainingWeather.layers.size,stockBefore:startStock,stockAfter:{...g.ms.threatLab.stock.remaining},deployed:g.ms.threatLab.deployed.size,manifest:g.ms.threatLab.manifest.length,roomWalls:g.world.cover.filter(c=>c.threatRoom).length};});
 assert.equal(result.state,'field');assert.equal(result.room,false);assert.ok(result.sameWeather);assert.equal(result.weather,'rain');assert.ok(result.time>0);assert.ok(result.trainingDisposed);assert.equal(result.trainingLayers,0);assert.equal(result.roomWalls,0);assert.equal(result.deployed,result.manifest);assert.equal(result.stockAfter.lsw,result.stockBefore.lsw-1);assert.deepEqual(errors,[]);
 await p.screenshot({path:out+'/desert.png'});await writeFile(out+'/result.json',JSON.stringify({setup:'Ordinary selection; seeded saved desert rain, controlled portal approach position, native Digit3, E ready and W crossing.',result,errors},null,2));console.log(result);
}finally{const video=await p.video().path();await c.close();await copyFile(video,out+'/departure.webm');await b.close();}
