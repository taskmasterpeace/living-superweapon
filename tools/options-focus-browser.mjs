// Actual HUD Options method in a lightweight DOM shell: no renderer/gameplay claim.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5182';
const browser=await chromium.launch();
try{
 const page=await browser.newPage();
 await page.route('**/options-focus-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><button id="open">Options</button><div id="dialog" style="display:none"></div><button id="outside">Outside</button>'}));
 await page.goto(base+'/options-focus-fixture');
 await page.evaluate(async()=>{
  // Load the normal dependency root without calling boot (no renderer). Vite
  // may otherwise mix a cold HUD URL with timestamped imports after HMR.
  await import('/src/boot.js');
  const {HUD}=await import('/src/engine/hud.js');
  const hud=Object.create(HUD.prototype);hud.optionsEl=document.querySelector('#dialog');hud._uiSndWired=true;
  hud.game={retireCombatViewInput(){},audio:{},world:null};
  window.focusHud=hud;window.rosterRequests=0;
  window.addEventListener('keydown',event=>{if(event.code==='Tab')window.rosterRequests++;if(event.code==='Escape')hud.closeOverlays();});
  document.querySelector('#open').onclick=()=>hud.showOptions();
 });
 await page.locator('#open').click();
 assert.equal(await page.evaluate(()=>document.activeElement.matches('[data-camera-option][aria-pressed="true"]')),true,'Opening Options focuses the selected camera button');
 await page.keyboard.press('Tab');
 assert.equal(await page.evaluate(()=>window.rosterRequests),0,'First Tab must not reach roster shortcut');
 assert.equal(await page.evaluate(()=>focusHud.optionsEl.contains(document.activeElement)),true);
 await page.locator('[data-options-done]').focus();await page.keyboard.press('Tab');
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.cameraOption),'character','Tab wraps to first control');
 await page.keyboard.press('Shift+Tab');
 assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-options-done')),true,'Shift+Tab wraps to last control');
 await page.locator('#camera-range').focus();await page.keyboard.press('ArrowRight');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'camera-range','Range input retains focus');
 await page.locator('[data-options-done]').click();
 assert.equal(await page.evaluate(()=>document.activeElement.id),'open','Done restores opener');
 await page.locator('#open').click();await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'open','Escape restores opener');
 assert.equal(await page.locator('#dialog').evaluate(el=>el.style.display),'none');
 console.log('PASS actual HUD Options focus, first Tab, forward/reverse wrap, range key, Done and Escape restoration. Lightweight DOM shell; full gameplay proof remains in camera-settings-browser.mjs.');
}catch(error){console.error(error);process.exitCode=1;}finally{await browser.close();}
