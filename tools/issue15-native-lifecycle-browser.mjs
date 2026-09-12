import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/marketing/issue15-native-lifecycle-'+(process.argv[2]||'short');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out}}),page=await context.newPage(),errors=[],rows=[];
page.setDefaultTimeout(15000);
page.on('pageerror',e=>errors.push(e.message));let failure;
const sample=async label=>{const s=await page.evaluate(()=>{const g=window.PW.game,p=g.player,st=p.slots.rmb;return {hero:p.def.id,selected:p._selSecondary,slot:st.def.name,cost:st.def.cost,cd:st.cd,active:!!st.active,handsBusy:st._handsBusy,stagger:p.staggerT,stun:p.stunT,time:g.time,ki:p.ki,drained:p.drainedT,running:g.running,charging:st.charging,beamCount:g.projectiles.list.filter(b=>b.sustaining).length,events:window.__beamEvents};});rows.push({label,...s});console.log(label,JSON.stringify(s));return s;};
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1500);await page.keyboard.press('d');await page.keyboard.press('d');await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});await page.waitForTimeout(500);
 await page.evaluate(()=>{const g=window.PW.game;window.__beamEvents=[];for(const name of ['onDrained','onNoKi']){const original=g[name];g[name]=function(f,...args){window.__beamEvents.push({name,time:g.time,ki:f.ki,id:f.id,args:args.map(a=>typeof a==='object'?a?.name??a?.constructor?.name: a)});return original.call(this,f,...args);};}});
 await page.waitForFunction(()=>window.PW.game.time>3);await page.mouse.click(720,450,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);await page.waitForTimeout(250);
 await sample('before-charge');await page.mouse.down({button:'right'});await page.waitForTimeout(450);await sample('held');await page.mouse.up({button:'right'});await page.waitForFunction(()=>window.PW.game.projectiles.list.some(b=>b.sustaining));await sample('started');
 await page.waitForFunction(()=>window.__beamEvents.some(e=>e.name==='onDrained'),{}, {timeout:20000});await sample('drained-event');
 await page.waitForTimeout(650);await sample('before-retry');await page.mouse.down({button:'right'});await page.waitForTimeout(180);await page.mouse.up({button:'right'});await page.waitForTimeout(60);await sample('denied-retry');await page.screenshot({path:out+'/depleted-denied.png'});
 await page.waitForTimeout(500);const ended=await sample('retired');assert.equal(ended.beamCount,0);assert.equal(!!ended.charging,false);assert.ok(ended.events.some(e=>e.name==='onNoKi'),'Unaffordable retry must signal denial');
 await page.waitForFunction(()=>window.PW.game.player.ki>30);await page.mouse.down({button:'right'});await page.waitForTimeout(500);await sample('charge-before-pause');await page.keyboard.press('Escape');await page.mouse.up({button:'right'});await page.waitForTimeout(200);const paused=await sample('paused');assert.equal(paused.running,false);assert.equal(!!paused.charging,false);assert.equal(paused.beamCount,0);await page.screenshot({path:out+'/pause-clean.png'});
 await page.keyboard.press('Escape');await page.waitForTimeout(300);const resumed=await sample('resumed');assert.equal(resumed.running,true);assert.equal(!!resumed.charging,false);assert.equal(resumed.beamCount,0);
 assert.equal(errors.length,0);
}catch(e){failure=e.message;await sample('failure-state').catch(()=>{});}finally{
 try{await writeFile(out+'/result.json',JSON.stringify({kind:'Normal selector/squad entry and browser input; pass-through onDrained/onNoKi observers only',rows,errors,failure},null,2));}finally{await context.close();await browser.close();}
}if(failure)throw Error(failure);
