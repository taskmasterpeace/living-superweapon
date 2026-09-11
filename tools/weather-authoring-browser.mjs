import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/weather-authoring';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const context=await browser.newContext({viewport:{width:1364,height:768},recordVideo:{dir:out,size:{width:1364,height:768}}});
const page=await context.newPage(),result={errors:[],scope:'Studio UI edits + Save local + reload + Play Test + native Hurricane/Practice launch. Read-only runtime observations; no scene or physics overrides.'};
page.on('pageerror',e=>result.errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sarge');await page.locator('[data-tab="flight"]').click();
 for(const [key,value]of Object.entries({massKg:120,windResistance:1.25,fallSafeSpeed:60,fallDamageScale:.75})){
  const input=page.locator(`input[type="number"][data-path="environment.${key}"]`);await input.fill(String(value));await input.press('Tab');
 }
 await page.locator('#save').click();await page.reload();await page.locator('[data-tab="flight"]').click();
 assert.equal(await page.locator('input[type="number"][data-path="environment.massKg"]').inputValue(),'120.00');
 await page.locator('input[type="number"][data-path="environment.massKg"]').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/studio-resilience.png'});
 await page.locator('#playtest').click();await page.locator('[data-weather="hurricane"]').click();await page.locator('[data-daylight="night"]').click();
 await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});await page.bringToFront();
 await page.waitForFunction(()=>PW.game.weather._vortex?.strength>.8,null,{timeout:30000});
 result.environment=await page.evaluate(()=>PW.game.player.def.environment);
 assert.deepEqual(result.environment,{massKg:120,windResistance:1.25,fallSafeSpeed:60,fallDamageScale:.75});
 result.before=await page.evaluate(()=>({pos:PW.game.player.pos.toArray(),hp:PW.game.player.hp}));
 // Walking toward the center of the regional storm must still be subject to
 // its transverse wind; this is input through the player path, not a teleport.
 await page.keyboard.down('w');await page.waitForTimeout(5000);await page.keyboard.up('w');
 result.after=await page.evaluate(()=>({pos:PW.game.player.pos.toArray(),hp:PW.game.player.hp,driven:PW.game.player._weatherBody?.driven,
  wind:PW.game.player._weatherBody?.pressure,voice:[...PW.game.audio.soundLibrary.active].filter(h=>h.id==='weather-vortex').length}));
 assert.ok(Math.abs(result.after.pos[0]-result.before.pos[0])>5);assert.equal(result.after.voice,1);
 await page.screenshot({path:out+'/hurricane-native.png'});
 result.performance=await page.evaluate(async()=>{
  const g=PW.game,w=g.world,r=w.renderer,gl=r.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
  const frames=[];let previous=performance.now();for(let i=0;i<600;i++)await new Promise(resolve=>requestAnimationFrame(t=>{frames.push(t-previous);previous=t;resolve();}));
  frames.sort((a,b)=>a-b);
  return {scope:'Native hurricane Practice, idle after walking; not a mixed combat benchmark',viewport:[innerWidth,innerHeight],dpr:r.getPixelRatio(),quality:w._qTier,
   gpu:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),samples:frames.length,p50:frames[300],p95:frames[570],p99:frames[594],over33ms:frames.filter(t=>t>33).length,entities:g.entities.length};
 });
 assert.deepEqual(result.errors,[]);result.ok=true;
}catch(e){result.failure=String(e);process.exitCode=1;}
finally{await writeFile(out+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await context.close();await browser.close();}
