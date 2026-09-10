import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'artifacts/studio-beam-guard';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const context=await browser.newContext({viewport:{width:1600,height:1000},recordVideo:{dir:out,size:{width:1600,height:1000}}});
const page=await context.newPage(),video=page.video(),result={scope:'Native Studio controls; staged autohealed target with real guard and damage, not free knockback.',errors:[]};page.on('pageerror',e=>result.errors.push(String(e)));
async function seek(fraction){const slider=page.locator('.timeline'),b=await slider.boundingBox();await page.mouse.click(b.x+b.width*fraction,b.y+b.height/2);await page.waitForTimeout(150);}
async function sample(){return page.evaluate(()=>{const c=STUDIO.preview.combat;return {time:STUDIO.preview.time,damage:c.damage,blocked:c.blockedContacts,breaks:c.guardBreaks,meter:c.target.guardMeter,guarding:c.target.guarding,readout:document.querySelector('#target-guard-readout').textContent};});}
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);await page.bringToFront();
 await page.locator('#state').selectOption('beam');await seek(.31);result.open=await sample();assert.ok(result.open.damage>0);
 await page.getByLabel('Target defense',{exact:true}).selectOption('guard');await seek(.31);result.guard=await sample();
 assert.ok(result.guard.damage>0&&result.guard.damage<result.open.damage*.35);assert.ok(result.guard.blocked>0&&result.guard.meter<1&&result.guard.guarding);
 await page.getByLabel('Target guard results').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/guard.png`});
 await page.getByRole('tab',{name:'Attacks',exact:true}).click();const drain=page.locator('input[type="number"][data-attack-key="guardDrain"]');await drain.fill('4');await drain.press('Tab');await seek(.29);result.broken=await sample();assert.ok(result.broken.breaks>0);
 await page.screenshot({path:`${out}/broken.png`});
 await seek(0);await page.getByRole('button',{name:'Play preview',exact:true}).click();await page.waitForTimeout(2800);await page.getByRole('button',{name:'Pause preview',exact:true}).click();result.played=await sample();assert.ok(result.played.blocked>0);
 assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await video.saveAs(`${out}/guard-comparison.webm`);await browser.close();console.log(JSON.stringify(result));}
