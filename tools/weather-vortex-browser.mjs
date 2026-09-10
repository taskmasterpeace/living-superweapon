import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/weather-vortex';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const context=await browser.newContext({viewport:{width:1364,height:768},recordVideo:{dir:out,size:{width:1364,height:768}}});
const page=await context.newPage(),result={errors:[],scope:'Native Sarge / Tornado / Practice menu entry, W movement, Z prone. Read-only runtime observations; no actor, camera or weather mutation.'};
page.on('pageerror',e=>result.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=sarge');
 await page.locator('[data-daylight="day"]').click();await page.locator('[data-weather="tornado"]').click();
 await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});await page.bringToFront();
 await page.waitForFunction(()=>PW.game.weather._vortex?.strength>.7,null,{timeout:30000});
 await page.screenshot({path:out+'/tornado-approach.png'});
 const observe=()=>page.evaluate(()=>{const g=PW.game,p=g.player,v=g.weather._vortex;return {pos:p.pos.toArray(),hp:p.hp,prone:p.prone,vel:p.vel.toArray(),footing:p._weatherBody?.footing,pressure:p._weatherBody?.pressure,wind:p._weatherBody?.driven,vortex:v?{x:v.x,y:v.y,z:v.z,age:v.age,strength:v.strength,drawObjects:v.group.children.length}:null};});
 result.frames=[await observe()];await page.keyboard.down('w');
 for(let i=0;i<8;i++){await page.waitForTimeout(1000);result.frames.push(await observe());if(i===4)await page.screenshot({path:out+'/tornado-near.png'});}
 await page.keyboard.up('w');await page.keyboard.press('z');await page.waitForTimeout(2000);result.frames.push(await observe());
 await page.screenshot({path:out+'/tornado-after.png'});
 result.audio=await page.evaluate(()=>[...PW.game.audio.soundLibrary.active].filter(e=>e.id==='weather-vortex').map(e=>({id:e.id,source:e.source,loop:e.loop})));
 assert.equal(result.audio.length,1);assert.ok(result.frames[0].vortex.strength>.7);
 await page.setViewportSize({width:390,height:844});await page.reload();await page.locator('[data-weather="hurricane"]').click();
 result.mobile=await page.locator('#pwWeather').evaluate(el=>({overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...el.querySelectorAll('button')].map(b=>({id:b.dataset.weather,width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}))}));
 assert.equal(result.mobile.overflow,false);assert.ok(result.mobile.buttons.every(b=>b.width>=44&&b.height>=44));
 assert.deepEqual(result.errors,[]);result.ok=true;
}catch(e){result.failure=String(e);process.exitCode=1;}
finally{await writeFile(out+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await context.close();await browser.close();}
