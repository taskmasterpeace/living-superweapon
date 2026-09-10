import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.LSW_BASE_URL||'http://127.0.0.1:5182';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
try{
 await page.goto(base+'/powerworld.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.PW?.game);console.log('Loaded PowerWorld');
 await page.locator('#pwTitle [data-id="sarge"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.running&&PW.game.player?.def.id==='sarge');console.log('Entered Sarge');
 // Isolate the native input/emission loop from random enemy hits during issuance.
 await page.evaluate(()=>{for(const e of PW.game.entities)if(e!==PW.game.player)e.ai=null;});
 for(const id of ['m16','pump','m24']){
  console.log('Testing',id);
  await page.keyboard.press('KeyI');await page.locator('#hArm').waitFor({state:'visible'});
  assert.deepEqual(await page.evaluate(()=>({running:PW.game.running,paused:PW.game.paused,look:PW.game.input.pointerLock})),{running:false,paused:true,look:false});
  const before=await page.evaluate(()=>PW.game.player.pos.toArray());
  await page.keyboard.down('KeyW');await page.waitForTimeout(80);await page.keyboard.up('KeyW');
  assert.deepEqual(await page.evaluate(()=>PW.game.player.pos.toArray()),before);
  await page.locator(`[data-eq="${id}"][data-slot="lmb"]`).click();
  await page.locator('#amIssue').click();assert.match(await page.locator('#amIssueStatus').textContent(),/EQUIPPED/);
  assert.equal(await page.evaluate(()=>PW.game.player._gearHeld.rowId),id);
  const loaded=await page.evaluate(()=>PW.game.player.slots.lmb.ammo.loaded);
  await page.keyboard.press('Escape');await page.locator('#hArm').waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>PW.game.running),true);
  await page.waitForTimeout(100);
  await page.mouse.move(720,400);await page.mouse.down();await page.waitForTimeout(85);await page.mouse.up();
  await page.waitForFunction(n=>PW.game.player.slots.lmb.ammo.loaded<n,loaded);
  assert.ok(await page.evaluate(()=>PW.game.projectiles.list.some(p=>p.owner===PW.game.player||p.caster===PW.game.player)),'native projectile exists');
  await page.keyboard.press('KeyR');await page.waitForFunction(()=>!!PW.game.player._firearmReload);
  await page.waitForFunction(()=>!PW.game.player._firearmReload);
  assert.equal(await page.evaluate(()=>PW.game.player.slots.lmb.ammo.loaded),loaded);
 }
 await page.keyboard.press('KeyI');await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.getElementById('hArm').scrollWidth<=innerWidth),'mobile menu overflow');
 await mkdir('artifacts/impact-loadout',{recursive:true});await page.screenshot({path:'artifacts/impact-loadout/mobile.png'});
 await page.keyboard.press('Escape');
 await page.evaluate(()=>{PW.game.running=false;PW.hud.setPaused(true);});
 await page.locator('#pwInventory').click();await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>PW.game.running),false,'close preserves a prior pause');
 assert.deepEqual(errors,[]);console.log('PASS native rifle / shotgun / sniper input, ammo, reload, menu pause, mobile and prior-pause restoration');
}finally{await browser.close();}
