import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/storm-clouds';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const context=await browser.newContext({viewport:{width:1364,height:636},recordVideo:{dir:out,size:{width:1364,height:636}}}),page=await context.newPage();
const result={errors:[],states:[],scope:'Native Clear/Rain and Day/Night match setup, normal Practice camera, no pose/camera/simulation overrides. Foreground idle frame cadence, not mixed-combat performance.'};
page.on('pageerror',e=>result.errors.push(String(e)));page.on('console',msg=>{if(msg.type()==='error')result.errors.push(msg.text());});
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=vega');
 for(const [light,weather]of [['day','clear'],['night','clear'],['night','rain'],['day','rain']]){
  if(result.states.length)await page.reload();
  await page.locator(`[data-daylight="${light}"]`).click();await page.locator(`[data-weather="${weather}"]`).click();
  await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
  await page.waitForFunction(()=>window.PW?.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});
  if(weather==='rain')await page.waitForFunction(()=>PW.game.weather.cloud>.8,null,{timeout:30000});
  await page.bringToFront();await page.screenshot({path:`${out}/${light}-${weather}.png`});
  const state=await page.evaluate(async()=>{
   const g=PW.game,w=g.world,u=w.skyMesh.material.uniforms,gl=w.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
   const sample={day:g.pwStage.daylight,cloud:g.weather.cloud,clockStart:u.uCloudTime.value,sun:w.sun.intensity,textureBytes:u.uStormNoise.value.image.data.byteLength,ratio:w.renderer.getPixelRatio(),gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable'};
   const times=[];await new Promise(resolve=>{let previous=performance.now();function tick(now){times.push(now-previous);previous=now;if(times.length>=180)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);});
   times.sort((a,b)=>a-b);return {...sample,clockEnd:u.uCloudTime.value,cadence:{frames:times.length,medianMs:times[90],p95Ms:times[171]}};
  });
  assert.ok(state.clockEnd>state.clockStart);assert.equal(state.textureBytes,256*256*4);result.states.push(state);
  if(weather==='rain'&&light==='night')await page.screenshot({path:out+'/night-rain-later.png'});
 }
 assert.deepEqual(result.errors,[]);result.ok=true;
}catch(e){result.failure=String(e);process.exitCode=1;}
finally{await writeFile(out+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await context.close();await browser.close();}
