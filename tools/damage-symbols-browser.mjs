// Presentation inspection of the real guide; does not claim combat-input coverage.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1000,height:1000}});
try{
 await page.goto('http://127.0.0.1:5182/');await page.waitForFunction(()=>window.LSW?.hud);
 await page.evaluate(()=>{LSW.hud.hideSelect();LSW.hud.showDamage();});
 assert.equal(await page.locator('.dgtag svg').count(),8);
 await page.screenshot({path:'artifacts/flight-readability/damage-codex.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/flight-readability/damage-codex-mobile.png'});
 await page.locator('.dgtag').filter({hasText:'TOXIC'}).scrollIntoViewIfNeeded();await page.screenshot({path:'artifacts/flight-readability/toxic-symbol-mobile.png'});
 assert.ok(await page.evaluate(()=>document.elementFromPoint(30,25)?.id!=='devBtn'));
 console.log('Eight symbols rendered; mobile codex clears the console button.');
}finally{await browser.close();}
