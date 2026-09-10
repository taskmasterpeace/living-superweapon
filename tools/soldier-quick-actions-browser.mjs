import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2]||'artifacts/soldier-quick-actions';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1600,height:900},recordVideo:{dir:out,size:{width:1600,height:900}}}),page=await context.newPage(),video=page.video();
const result={scope:'Native SARGE Practice. W advance, G quick grenade, LMB rifle, Q carried jump jets. No actor/resource/pose overrides.',errors:[]};
page.on('pageerror',e=>result.errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=sarge');await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});await page.bringToFront();await page.mouse.click(800,450);await page.waitForFunction(()=>!!document.pointerLockElement);
 await page.keyboard.down('KeyW');await page.waitForTimeout(1400);await page.keyboard.up('KeyW');await page.waitForTimeout(300);
 await page.evaluate(()=>{window.quickShots=[];const manager=PW.game.projectiles,spawn=manager.spawnProjectile;manager.spawnProjectile=function(c,d,...args){const shot=spawn.call(this,c,d,...args);if(c===PW.game.player)quickShots.push({time:PW.game.time,name:d.name,canister:d.canister,selected:c._selSlot});return shot;};});
 const state=()=>page.evaluate(()=>{const p=PW.game.player;return{selected:p._mouseCombat?.primary||p._selSlot||'lmb',ammo:p.slots.lmb.ammo?.loaded,charges:p.items[0].charges,jets:p._jetT,bladeCd:p.slots.q.cd,grab:p.grabState,shots:quickShots.slice(),faults:[...(PW.game._errSeen||[])]};});
 result.before=await state();await page.screenshot({path:`${out}/01-ready.png`});
 assert.equal(await page.evaluate(()=>PW.game.hud.slotEls.q.root.querySelector('.key').textContent),'WHEEL','Blade chip must not advertise the reassigned gadget key');
 await page.keyboard.down('KeyG');await page.waitForTimeout(1000);await page.keyboard.up('KeyG');result.grenade=await state();await page.screenshot({path:`${out}/02-grenade.png`});
 assert.equal(result.grenade.shots.filter(s=>s.canister).length,1);assert.equal(result.grenade.selected,result.before.selected);assert.ok(!result.grenade.grab);
 await page.mouse.down();await page.waitForTimeout(450);await page.mouse.up();await page.screenshot({path:`${out}/03-rifle.png`});
 await page.keyboard.down('KeyQ');await page.waitForTimeout(900);await page.keyboard.up('KeyQ');result.gadget=await state();await page.screenshot({path:`${out}/04-gadget.png`});
 assert.ok(result.gadget.jets>0);assert.equal(result.gadget.charges,result.before.charges-1);assert.equal(result.gadget.bladeCd,0);assert.equal(result.gadget.selected,result.before.selected);
 assert.ok(result.gadget.ammo<result.grenade.ammo,'LMB must still fire the selected physical rifle after a quick throw');
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.gadget.faults,[]);result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await video.saveAs(`${out}/native-quick-actions.webm`);await browser.close();console.log(JSON.stringify(result));}
