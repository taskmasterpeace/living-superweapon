import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
const out='artifacts/marketing/training-weather-2026-09-12';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1280,height:800},recordVideo:{dir:out}}),p=await c.newPage(),errors=[];
p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5184/powerworld.html?hero=tempest');await p.waitForTimeout(2500);
 await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await p.waitForFunction(()=>window.PW?.game?._threatRoom?.active,{},{timeout:90000});
 await p.evaluate(()=>{const g=PW.game;g.player.pos.set(0,0,40);g.player.vel.set(0,0,0);g.world._lookYaw=0;g.world._lookPitch=.15;g.world._chaseSnap=true;window.savedWeather=g._threatRoom.weatherScope.saved;window.savedTime=savedWeather.time;});
 await p.waitForTimeout(300);await p.keyboard.press('3');
 await p.waitForFunction(()=>PW.game.weather.layers.size>0,{},{timeout:5000});
 await p.waitForTimeout(1600);
 const active=await p.evaluate(()=>{const g=PW.game,l=[...g.weather.layers.values()][0];return {hero:g.player.def.id,age:l.age,center:l.center.toArray(),cloudY:l.center.y+90,desertTime:savedWeather.time,savedTime,isolated:g.weather!==savedWeather,wind:g.weather.sampleBodyWind(g.player.pos,{x:0,y:0,z:0})};});
 assert.equal(active.hero,'tempest');assert.ok(active.age>0);assert.ok(active.cloudY<300);assert.ok(active.isolated);assert.equal(active.desertTime,active.savedTime);
 await p.screenshot({path:out+'/storm.png'});
 await p.waitForFunction(()=>PW.game.weather.layers.size===0,{},{timeout:30000});
 const after=await p.evaluate(()=>({desertTime:savedWeather.time,savedTime,room:PW.game._threatRoom.active,layers:PW.game.weather.layers.size}));
 assert.equal(after.desertTime,after.savedTime);assert.ok(after.room);assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({active,after,errors},null,2));console.log({active,after,errors});
}finally{const video=await p.video().path();await c.close();await copyFile(video,out+'/storm.webm');await b.close();}
