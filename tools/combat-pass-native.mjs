import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/marketing/combat-pass-2026-09-12/01-controls-final';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),ctx=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await ctx.newPage(),video=page.video();
const result={kind:'Native menus and keyboard/mouse; no actor/physics overrides. Silent video.',errors:[],samples:[]};page.on('pageerror',e=>result.errors.push(e.message));
async function sample(label,delay=250){await page.waitForTimeout(delay);result.samples.push({label,...await page.evaluate(()=>{const g=PW.game,p=g.player;return {time:g.time,hp:p.hp,ki:p.ki,selected:[p._selSlot,p._selSecondary],strike:p.mstate,guard:p.guarding,flight:p.flying,pos:p.pos.toArray(),speed:p.vel.length(),faults:[...(g._errSeen||[])]};})});await page.screenshot({path:`${out}/${label}.png`});}
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.keyboard.press('Escape');await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();await page.waitForFunction(()=>PW.game.running&&PW.game.time>.5,null,{timeout:90000});
 await page.mouse.click(720,450,{button:'middle'});await sample('01-ready');
 await page.keyboard.down('v');await sample('02-heavy-charge',300);await page.keyboard.up('v');await sample('03-heavy-release',70);
 await page.waitForTimeout(900);await page.keyboard.down('q');await sample('04-guard');await page.keyboard.up('q');
 await page.keyboard.press('i');await page.getByRole('dialog',{name:'Inventory',exact:true}).waitFor();await page.screenshot({path:`out/inventory.png`.replace('out/',out+'/')});await page.getByRole('button',{name:'Return to game',exact:true}).click();
 await page.keyboard.down('Tab');await page.getByRole('dialog',{name:'Choose powers',exact:true}).waitFor();await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>PW.game.combatOverlayOpen),true);await page.screenshot({path:out+'/05-power-picker.png'});await page.keyboard.press('Escape');await page.keyboard.up('Tab');assert.equal(await page.evaluate(()=>PW.game.running&&!PW.game.powerPicker.isOpen),true,'Escape closes picker without pausing');
 await page.mouse.click(720,450,{button:'middle'});await page.keyboard.down('Space');await sample('06-rise',650);await page.keyboard.up('Space');await page.keyboard.down('w');await page.keyboard.down('ShiftLeft');await sample('07-forward',650);await page.keyboard.up('ShiftLeft');await page.waitForTimeout(90);await page.keyboard.down('ShiftLeft');await sample('08-boost',1300);await page.keyboard.up('ShiftLeft');await page.keyboard.up('w');
 assert.ok(result.samples.find(s=>s.label==='04-guard').guard,'Q must guard');assert.ok(result.samples.find(s=>s.label==='03-heavy-release').strike,'V must directly strike');assert.deepEqual(result.errors,[]);assert.ok(result.samples.every(s=>s.faults.length===0));result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await writeFile(out+'/result.json',JSON.stringify(result,null,2));await ctx.close();await video.saveAs(out+'/native-controls-flight.webm');await browser.close();console.log(JSON.stringify(result));}
