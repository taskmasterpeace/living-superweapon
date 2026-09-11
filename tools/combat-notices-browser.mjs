import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2]||'artifacts/combat-notices';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),page=await browser.newPage({viewport:{width:1600,height:900}});
const result={scope:'Staged simultaneous production HUD messages in normal Practice; separate native KO recording required.',rows:[],errors:[]};
page.on('pageerror',e=>result.errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=kano');await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});
 for(const [width,height] of [[1600,900],[900,1600],[390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);
  await page.evaluate(()=>{PW.game.hud.announce('LEVEL 2','+6% DMG · +7% HP · +4% KI','#ffd24a');PW.game.hud.showKO('K.O.','SIM CONSTRUCT','#ffd24a');document.querySelector('#hud .combo').style.opacity='1';});
  await page.waitForTimeout(250);
  const row=await page.evaluate(()=>['hAnn','hKO'].map(id=>{const el=document.getElementById(id),r=el.getBoundingClientRect();return{id,x:r.x,y:r.y,w:r.width,h:r.height,opacity:getComputedStyle(el).opacity,text:el.textContent};}));result.rows.push({width,height,notices:row});
  await page.screenshot({path:`${out}/${width}x${height}.png`});
  for(const r of row){assert.ok(r.h<=72&&r.y+r.h<height*.3,'Combat notice intrudes into aiming area: '+JSON.stringify(r));assert.ok(r.x>=0&&r.x+r.w<=width,'Notice spills outside viewport');assert.equal(r.opacity,'1');}
  assert.ok(row[0].y+row[0].h<=row[1].y||row[1].y+row[1].h<=row[0].y,'KO and progression overlap');
  assert.equal(await page.locator('#hud .combo').evaluate(el=>getComputedStyle(el).visibility),'hidden','Combo overlaps outcome notices');
 }
 await page.waitForTimeout(1900);for(const id of ['hAnn','hKO'])assert.equal(await page.locator('#'+id).evaluate(el=>getComputedStyle(el).opacity),'0');
 assert.equal(await page.locator('#hud .combo').evaluate(el=>getComputedStyle(el).visibility),'visible','Combo must resume after notices expire');
 assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;}
finally{await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await browser.close();console.log(JSON.stringify(result));}
