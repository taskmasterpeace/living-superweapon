import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/weather-lightning';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const context=await browser.newContext({viewport:{width:1364,height:636},recordVideo:{dir:out,size:{width:1364,height:636}}});
const page=await context.newPage(),result={errors:[],scope:'Native night + Storm selection and Practice entry. No camera, pose, simulation or strike timing overrides. Read-only storm/audio observation.'};
page.on('pageerror',e=>result.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=vega');
 await page.locator('[data-daylight="night"]').click();await page.locator('[data-weather="storm"]').click();
 await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});
 await page.bringToFront();
 await page.waitForFunction(()=>PW.game.weather.cloud>.75&&PW.game.world.weatherFlash<.01);
 await page.screenshot({path:out+'/night-storm-rest.png'});
 // A screenshot can miss a 70 ms return stroke; record several native strikes
 // and retain the actual observed state beside each requested capture.
 result.strikes=[];
 for(let i=0;i<3;i++){
  await page.waitForFunction(()=>PW.game.world.weatherFlash>.1,null,{polling:'raf',timeout:15000});
  const state=await page.evaluate(()=>{
   const g=PW.game,w=g.weather,bolt=w._lightning;
   return {time:w.time,flash:g.world.weatherFlash,age:bolt.age,position:bolt.position.toArray(),ground:g.world.heightAt(bolt.position.x,bolt.position.z),segments:bolt.core.count,lightCount:g.vfx._lights.length,cloud:w.cloud};
  });
  await page.screenshot({path:`${out}/native-strike-${i}.png`});result.strikes.push(state);
  await page.waitForFunction(()=>PW.game.weather._lightning?.age>.4);
 }
 await page.waitForFunction(()=>PW.game.audio.soundLibrary.events.some(e=>e.id==='weather-thunder'&&e.accepted),null,{timeout:15000});
 result.audio=await page.evaluate(()=>({state:PW.game.audio.ctx?.state,active:[...PW.game.audio.soundLibrary.active].filter(e=>e.id.startsWith('weather-')).map(e=>({id:e.id,source:e.source,loop:e.loop})),events:PW.game.audio.soundLibrary.events.filter(e=>e.id.startsWith('weather-'))}));
 assert.equal(result.audio.active.filter(e=>e.id==='weather-rain').length,1);
 assert.ok(result.strikes.every(s=>s.position[1]>=s.ground&&s.segments===42&&s.lightCount===14&&s.cloud>.7));
 await page.setViewportSize({width:390,height:844});await page.reload();
 await page.locator('[data-weather="storm"]').waitFor();
 result.mobile=await page.locator('#pwWeather').evaluate(el=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...el.querySelectorAll('button')].map(b=>({id:b.dataset.weather,pressed:b.getAttribute('aria-pressed'),width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}))}));
 assert.equal(result.mobile.overflow,false);assert.ok(result.mobile.buttons.every(b=>b.width>=44&&b.height>=44));assert.equal(result.mobile.buttons.find(b=>b.id==='storm').pressed,'true');
 assert.deepEqual(result.errors,[]);result.ok=true;
}catch(e){result.failure=String(e);process.exitCode=1;}
finally{await writeFile(out+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await context.close();await browser.close();}
