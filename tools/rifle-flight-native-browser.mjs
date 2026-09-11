// Native input evidence; observations never reposition/pose the actor or grant flight.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'artifacts/rifle-flight-native';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const context=await browser.newContext({viewport:{width:1600,height:900},recordVideo:{dir:out,size:{width:1600,height:900}}});
const page=await context.newPage(),video=page.video();
const result={scope:'Native SARGE Practice: walk/fire, carried Jump Jets, rise, fly/fire/turn, release and gadget expiry. No actor/physics edits; no FPS claim.',errors:[],samples:[]};
page.on('pageerror',e=>result.errors.push(String(e)));
async function sample(label){
 const row=await page.evaluate(()=>{const g=PW.game,f=g.player;return{pos:f.pos.toArray(),vel:f.vel.toArray(),alive:f.alive,flying:f.flying,jet:f._jetT,flightTier:f.flightTier,ammo:f.slots.lmb.ammo.loaded,combat:f._combatAim?.weight,held:g.input.mouse.left,faults:[...(g._errSeen||[])]};});
 result.samples.push({label,...row});return row;
}
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=sarge');
 await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});await page.bringToFront();
 await page.mouse.click(800,450);await page.waitForFunction(()=>!!document.pointerLockElement);await page.waitForTimeout(300);
 await sample('spawn');await page.keyboard.down('KeyW');await page.mouse.down();await page.waitForTimeout(550);await page.mouse.up();await page.keyboard.up('KeyW');
 await sample('ground-fire');await page.screenshot({path:`${out}/01-ground.png`});
 await page.keyboard.press('KeyX');await page.keyboard.down('Space');await page.waitForTimeout(750);await page.keyboard.up('Space');
 await page.keyboard.down('KeyW');await page.keyboard.down('KeyA');await page.mouse.down();await page.waitForTimeout(450);
 await sample('air-fire');await page.screenshot({path:`${out}/02-air-fire.png`});
 await page.mouse.move(1000,520);await page.waitForTimeout(350);await sample('turn-down');await page.screenshot({path:`${out}/03-turn-down.png`});
 await page.mouse.move(650,360);await page.waitForTimeout(350);await sample('turn-up');await page.screenshot({path:`${out}/04-turn-up.png`});
 await page.mouse.up();await page.keyboard.up('KeyA');await page.keyboard.up('KeyW');await page.waitForTimeout(500);await sample('released');
 await page.waitForFunction(()=>PW.game.player._jetT<=0,null,{timeout:15000});await page.waitForTimeout(900);
 await sample('expired');await page.screenshot({path:`${out}/05-recovery.png`});
 assert.ok(result.samples.some(s=>s.label==='air-fire'&&s.flying&&s.jet>0&&Math.hypot(...s.vel)>10),'Actual carried gadget must enable moving armed flight');
 assert.ok(result.samples.find(s=>s.label==='air-fire').ammo<result.samples.find(s=>s.label==='ground-fire').ammo,'Native airborne trigger spends actual ammunition');
 assert.equal(result.samples.at(-1).flightTier,0,'Gadget expiration restores grounded soldier permissions');
 assert.ok(result.samples.every(s=>s.alive&&s.faults.length===0));assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{
 await page.mouse.up().catch(()=>{});for(const key of ['KeyW','KeyA','Space'])await page.keyboard.up(key).catch(()=>{});
 await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await video.saveAs(`${out}/native-rifle-flight.webm`);await browser.close();console.log(JSON.stringify(result));
}
