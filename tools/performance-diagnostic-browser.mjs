// UI smoke test of the on-demand diagnostic, not a throughput benchmark.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/performance-diagnostic';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),result={errors:[],kind:'functional command verification; no FPS acceptance'};
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>result.errors.push(String(e)));
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.locator('#pwGo').click();
 await page.waitForFunction(()=>window.PW?.game?.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});
 await page.evaluate(()=>{window.__perfOriginals=[PW.game.update,PW.game.world.render,PW.hud.update];});
 await page.locator('#devBtn').click();await page.locator('#devIn').fill('perf');await page.locator('#devIn').press('Enter');
 await page.waitForFunction(()=>!!PW.game.dev.lastPerformance,null,{timeout:15000});
 result.report=await page.evaluate(()=>PW.game.dev.lastPerformance);
 assert.ok(Number.isFinite(result.report.fps));assert.ok(result.report.frames>0);assert.ok(result.report.sections.game.calls>0);
 assert.ok(await page.evaluate(()=>__perfOriginals.every((f,i)=>f===[PW.game.update,PW.game.world.render,PW.hud.update][i])),'Original methods must be restored');
 assert.equal(await page.evaluate(()=>PW.game._performanceCapture),null);
 result.output=await page.locator('#devOut').innerText();assert.match(result.output,/PERFORMANCE .* FPS/);assert.match(result.output,/GPU /);
 await page.screenshot({path:out+'/console.png'});assert.deepEqual(result.errors,[]);result.pass=true;
}catch(e){result.error=String(e);process.exitCode=1;}
finally{await writeFile(out+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();}
