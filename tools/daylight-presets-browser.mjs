import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/daylight-presets';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
const results={errors:[],presets:[],scope:'Native match-setup selections and practice startup; no camera or simulation overrides.'};
page.on('pageerror',e=>results.errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=vega');
 await page.locator('#pwDaylight').waitFor();
 for(const id of ['day','sunset','night']){
  if(id!=='day')await page.reload();
  await page.locator(`[data-daylight="${id}"]`).click();
  assert.equal(await page.locator(`[data-daylight="${id}"]`).getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('powerworld_prefs_v1')).daylight),id);
  await page.reload();await page.locator(`[data-daylight="${id}"][aria-pressed="true"]`).waitFor();
  await page.locator('[data-encounter="practice"]').click();
  if(id==='day')await page.screenshot({path:out+'/desktop-setup.png'});
  await page.locator('#pwGo').click();
  await page.waitForFunction(()=>window.PW?.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});
  await page.bringToFront();await page.waitForTimeout(600);
  const state=await page.evaluate(()=>{const g=PW.game,w=g.world;return {id:g.pwStage.daylight,clock:w.dayFixed,sun:w.sun.intensity,environment:w.scene.environmentIntensity,skyMix:w.skyMesh.material.uniforms.uFrontlineDayMix?.value,alive:g.player.alive};});
  assert.equal(state.id,id);assert.ok(state.alive);results.presets.push(state);
  await page.screenshot({path:`${out}/${id}.png`});
 }
 await page.reload();await page.setViewportSize({width:390,height:844});
 await page.locator('#pwDaylight').scrollIntoViewIfNeeded();
 await page.locator('[data-daylight="sunset"]').focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('[data-daylight="sunset"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.evaluate(()=>document.activeElement?.dataset.daylight),'sunset');
 results.mobile=await page.locator('#pwDaylight').evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x,right:r.right,width:innerWidth,buttonHeight:el.querySelector('button').getBoundingClientRect().height};});
 assert.ok(results.mobile.x>=0&&results.mobile.right<=results.mobile.width&&results.mobile.buttonHeight>=44);
 await page.screenshot({path:out+'/mobile-setup.png'});
 assert.deepEqual(results.errors,[]);results.ok=true;
}catch(e){results.failure=String(e);process.exitCode=1;}
finally{await writeFile(out+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser.close();}
