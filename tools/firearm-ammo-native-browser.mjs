import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv.find(a=>a.startsWith('--output='))?.slice(9)||'artifacts/firearm-ammo-native';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const context=await browser.newContext({viewport:{width:1600,height:900},recordVideo:{dir:out,size:{width:1600,height:900}}});
const page=await context.newPage(),video=page.video(),result={native:true,scope:'SARGE fire/reload/ammo and Studio persistence; dedicated reload hand animation not delivered',errors:[],samples:[]};
page.on('pageerror',e=>result.errors.push(String(e)));
async function sample(label){const s=await page.evaluate(()=>{const g=PW.game,f=g.player;return {ammo:f.slots.lmb.ammo,ki:f.ki,reload:f._firearmReload?{elapsed:f._firearmReload.elapsed,duration:f._firearmReload.duration}:null,airstrike:f.slots.r.cd,alive:f.alive,faults:[...(g._errSeen||[])],cues:window.reloadCueWitness||[],status:document.querySelector('.trigger-status')?.textContent};});result.samples.push({label,...s});return s;}
async function start(){await page.goto('http://127.0.0.1:5180/powerworld.html?hero=sarge');await page.bringToFront();await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});await page.bringToFront();await page.waitForTimeout(500);}
try{
 await start();await page.evaluate(()=>{window.reloadCueWitness=[];const lib=PW.game.audio.soundLibrary,record=lib._record.bind(lib);lib._record=e=>{if(e.id?.startsWith('reload')||e.id==='empty')reloadCueWitness.push({...e,time:lib.ctx?.currentTime});return record(e);};});const initial=await sample('initial');assert.equal(initial.ammo.loaded,30);
 assert.notEqual(await page.locator('.slot.ult .key').textContent(),'R','Airstrike must not advertise the soldier reload key');
 await page.mouse.move(800,450);await page.mouse.down();await page.waitForTimeout(450);await page.mouse.up();const fired=await sample('fired');assert.ok(fired.ammo.loaded<30&&fired.ammo.loaded>0);
 await page.keyboard.press('KeyR');await page.waitForTimeout(650);const reloading=await sample('reloading');assert.ok(reloading.reload);assert.equal(reloading.airstrike,0);await page.screenshot({path:`${out}/01-reloading.png`});
 await page.waitForFunction(()=>!PW.game.player._firearmReload);const loaded=await sample('loaded');assert.equal(loaded.ammo.loaded,30);assert.equal(loaded.ammo.reserve,120-(30-fired.ammo.loaded));assert.deepEqual(loaded.cues.filter(c=>c.accepted).map(c=>c.id),['reload','reload-eject','reload-insert','reload-chamber']);
 await page.mouse.down();await page.waitForFunction(()=>!!PW.game.player._firearmReload,null,{timeout:10000});await page.mouse.up();await sample('empty-auto-reload');await page.waitForFunction(()=>!PW.game.player._firearmReload);await sample('automatic-complete');
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sarge');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);await page.getByRole('tab',{name:'Attacks',exact:true}).click();
 for(const [key,value]of [['magazine','7'],['reserveAmmo','21'],['reloadTime','3']]){const field=page.locator(`input[type="number"][data-attack-key="${key}"]`);await field.fill(value);await field.press('Tab');}
 await page.getByRole('button',{name:'Save local',exact:true}).click();await page.reload();await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);await page.getByRole('tab',{name:'Attacks',exact:true}).click();await page.screenshot({path:`${out}/02-studio-ammunition.png`});
 await start();const authored=await sample('authored-runtime');assert.equal(authored.ammo.loaded,7);assert.equal(authored.ammo.reserve,21);
 assert.ok(result.samples.every(s=>s.faults.length===0));assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.error=String(e);await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});process.exitCode=1;}
finally{await page.mouse.up().catch(()=>{});await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await video.saveAs(`${out}/native-reload-and-editor.webm`);await browser.close();console.log(JSON.stringify(result));}
