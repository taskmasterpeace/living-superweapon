import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/weather-rain';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await context.newPage();
const result={errors:[],scope:'Native menu rain selection, Practice, Space ascent and movement. Read-only rain geometry and CPU timing observations.'};
page.on('pageerror',e=>result.errors.push(String(e)));
async function observe(){return page.evaluate(()=>{
 const w=PW.game.world,r=PW.game.weather,attr=r._mesh.geometry.attributes.position;
 let visible=0,belowTerrain=0,insideRoof=0,local=0;
 for(let i=0;i<attr.count;i+=2){if(attr.getY(i)===attr.getY(i+1))continue;visible++;
  const x=attr.getX(i),y=attr.getY(i),z=attr.getZ(i);
  if(y<w.heightAt(x,z)-.001)belowTerrain++;
  if(w.cover.some(c=>!c.destroyed&&Math.abs(x-c.x)<=(c.hx??c.r)&&Math.abs(z-c.z)<=(c.hz??c.r)&&y<c.top-.001))insideRoof++;
  if(Math.abs(x-w.camera.position.x)<=130&&Math.abs(z-w.camera.position.z)<=130&&Math.abs(y-w.camera.position.y)<160)local++;
 }
 return {visible,belowTerrain,insideRoof,local,height:PW.game.player.pos.y,opacity:r._mesh.material.opacity,vertexCount:attr.count};
});}
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=vega');
 await page.locator('[data-weather="rain"]').click({timeout:10000});
 await page.reload();await page.locator('[data-weather="rain"][aria-pressed="true"]').waitFor();
 await page.locator('[data-daylight="day"]').click();await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>window.PW?.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing&&PW.game.weather.rain>.55,null,{timeout:90000});await page.bringToFront();
 result.ground=await observe();await page.screenshot({path:out+'/01-ground.png'});
 await page.evaluate(()=>{const r=PW.game.weather,original=r.update;window.rainTimings=[];r.update=function(dt){const start=performance.now();original.call(this,dt);if(rainTimings.length<1000)rainTimings.push(performance.now()-start);};});
 await page.keyboard.down('Space');await page.waitForFunction(()=>PW.game.player.pos.y>300,null,{timeout:30000});await page.keyboard.up('Space');
 await page.keyboard.down('KeyW');await page.waitForTimeout(1600);await page.keyboard.up('KeyW');
 result.flight=await observe();await page.screenshot({path:out+'/02-high-flight.png'});
 result.performance=await page.evaluate(()=>{const a=rainTimings.slice().sort((a,b)=>a-b),w=PW.game.world;return {samples:a.length,medianMs:a[Math.floor(a.length*.5)],p95Ms:a[Math.floor(a.length*.95)],maxMs:a.at(-1),renderer:w.renderer.getContext().getParameter(w.renderer.getContext().RENDERER),pixelRatio:w.renderer.getPixelRatio(),viewport:[innerWidth,innerHeight]};});
 for(const s of [result.ground,result.flight]){assert.ok(s.visible>100);assert.equal(s.belowTerrain,0);assert.equal(s.insideRoof,0);assert.equal(s.local,s.visible);assert.equal(s.vertexCount,2800);}
 await page.reload();await page.locator('[data-weather="clear"]').click();await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});
 assert.equal(await page.evaluate(()=>PW.game.weather._mesh),null);
 await page.reload();await page.setViewportSize({width:390,height:844});await page.locator('#pwWeather').scrollIntoViewIfNeeded();
 await page.locator('[data-weather="rain"]').focus();await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.weather),'rain');
 const box=await page.locator('#pwWeather').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390);
 await page.screenshot({path:out+'/03-mobile-menu.png'});assert.deepEqual(result.errors,[]);result.ok=true;
}catch(e){result.failure=String(e);process.exitCode=1;}
finally{await writeFile(out+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await context.close();await browser.close();}
