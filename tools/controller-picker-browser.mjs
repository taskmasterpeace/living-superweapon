import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const soldier=process.argv.includes('--soldier');const out='artifacts/marketing/combat-pass-2026-09-12/'+(soldier?'controller-soldier':'controller-picker');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.testPad={connected:true,index:0,id:'Test standard controller',mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.testPad]});});
const button=(i,down)=>page.evaluate(({i,down})=>{Object.assign(testPad.buttons[i],{pressed:down,touched:down,value:down?1:0});},{i,down});
const result={kind:'Browser integration with a synthetic standard Gamepad API device; normal menu selection, no actor overrides. Not physical-controller validation.'};
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.keyboard.press('Escape');if(soldier)await page.locator('#pwRoster [data-id="sarge"]').click();await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();await page.waitForFunction(()=>PW.game.running&&PW.game.time>.5,null,{timeout:90000});
 if(soldier){
  await button(7,true);await page.waitForTimeout(550);await button(7,false);await page.waitForTimeout(100);
  result.ammoBefore=await page.evaluate(()=>({...PW.game.player.slots.lmb.ammo}));assert.ok(result.ammoBefore.loaded<result.ammoBefore.capacity);
  await button(13,true);await page.waitForTimeout(50);await button(2,true);await page.waitForFunction(()=>!!PW.game.player._firearmReload);
  assert.equal(await page.evaluate(()=>!!PW.game.player.mstate||PW.game.player.meleeCharge>0),false,'reload chord cannot strike');
  await page.screenshot({path:out+'/reload.png'});await button(13,false);await page.waitForTimeout(60);await button(2,false);
  await page.waitForFunction(()=>!PW.game.player._firearmReload);result.ammoAfter=await page.evaluate(()=>({...PW.game.player.slots.lmb.ammo}));
  assert.equal(result.ammoAfter.loaded,result.ammoAfter.capacity);assert.equal(result.ammoBefore.loaded+result.ammoBefore.reserve,result.ammoAfter.loaded+result.ammoAfter.reserve);
  assert.equal(await page.evaluate(()=>!!PW.game.player.mstate||PW.game.player.meleeCharge>0),false,'modifier-first release cannot punch');
 }
 await button(15,true);await page.getByRole('dialog',{name:'Choose powers',exact:true}).waitFor();
 result.primaryBefore=await page.evaluate(()=>PW.game.player._selSlot);
 await page.evaluate(()=>testPad.axes[3]=1);await page.waitForTimeout(90);await page.evaluate(()=>testPad.axes[3]=0);
 result.focused=await page.evaluate(()=>document.activeElement.textContent);
 await page.screenshot({path:out+'/secondary-picker.png'});await button(15,false);
 await page.waitForFunction(()=>!PW.game.powerPicker.isOpen);
 result.selection=await page.evaluate(()=>({primary:PW.game.player._selSlot,secondary:PW.game.player._selSecondary,name:PW.game.player.slots[PW.game.player._selSecondary].def.name}));
 assert.equal(result.selection.primary,result.primaryBefore);assert.equal(result.selection.name,result.focused);
 result.primaryBeforeHold=await page.evaluate(()=>PW.game.player._selSlot);
 await button(14,true);await page.getByRole('dialog',{name:'Choose powers',exact:true}).waitFor();
 result.cancelBefore=await page.evaluate(()=>PW.game.player._selSlot);await button(1,true);await page.waitForFunction(()=>!PW.game.powerPicker.isOpen);await button(1,false);await button(14,false);await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>PW.game.player._selSlot),result.cancelBefore);assert.deepEqual(errors,[]);
 assert.equal(result.cancelBefore,result.primaryBeforeHold,'hold/cancel must not cycle on press');
 await button(14,true);await page.waitForTimeout(60);await button(14,false);await page.waitForTimeout(80);
 assert.notEqual(await page.evaluate(()=>PW.game.player._selSlot),result.primaryBeforeHold,'a short tap still cycles');
 await button(8,true);await page.waitForTimeout(80);await button(8,false);await page.getByRole('dialog',{name:'Inventory',exact:true}).waitFor();
 await page.getByRole('button',{name:'Return to game',exact:true}).click();await page.waitForTimeout(100);
 const yawBefore=await page.evaluate(()=>PW.game.world._lookYaw);
 await button(8,true);await page.waitForTimeout(350);await page.evaluate(()=>testPad.axes[2]=.8);await page.waitForTimeout(200);await page.evaluate(()=>testPad.axes[2]=0);
 result.freeLook=await page.evaluate(()=>({yaw:PW.game.world._lookYaw,offset:PW.game.world._freeLook.yaw,inventory:PW.game.inventoryPanel.isOpen}));
 assert.ok(Math.abs(result.freeLook.yaw-yawBefore)<1e-6,'independent stick look preserves travel/aim yaw');assert.ok(Math.abs(result.freeLook.offset)>.1);assert.equal(result.freeLook.inventory,false);
 await page.screenshot({path:out+'/controller-free-look.png'});await button(8,false);await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>PW.game.inventoryPanel.isOpen),false,'free-look release must not open inventory');assert.deepEqual(errors,[]);result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;}finally{result.errors=errors;await writeFile(out+'/result.json',JSON.stringify(result,null,2));await context.close();await browser.close();console.log(result);}
