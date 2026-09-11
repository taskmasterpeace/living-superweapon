import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.LSW_BASE_URL||'http://127.0.0.1:5182';
const browser=await chromium.launch({channel:'chromium'});
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
try{
 await page.goto(base+'/powerworld.html');await page.waitForFunction(()=>window.PW?.game);
 await page.locator('#pwTitle [data-id="vega"]').tap();await page.locator('#pwGo').tap();
 await page.waitForFunction(()=>PW.game.running&&!PW.game._frontlinePreparing&&document.querySelector('#touch')?.classList.contains('touch-enabled'));
 for(const [width,height] of [[390,844],[844,390]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(100);
  const overlaps=await page.evaluate(()=>{
   const trigger=document.querySelector('#pwInventory'),r=trigger.getBoundingClientRect(),visible=trigger.checkVisibility();
   const buttons=[...document.querySelectorAll('#touch .tbtn')].filter(b=>b.checkVisibility());
   return {visibleTouchButtons:buttons.length,collisions:buttons.filter(b=>{
    const q=b.getBoundingClientRect();return visible&&r.left<q.right&&r.right>q.left&&r.top<q.bottom&&r.bottom>q.top;
   }).map(b=>b.dataset.b)};
  });
  assert.ok(overlaps.visibleTouchButtons>0,'native touch pad must actually be visible');
  assert.deepEqual(overlaps.collisions,[],`${width}×${height}: Loadout blocks combat controls`);
  await mkdir('artifacts/impact-loadout',{recursive:true});await page.screenshot({path:`artifacts/impact-loadout/touch-${width}.png`});
  await page.locator('#touch [data-b="start"]').tap();await page.waitForFunction(()=>!PW.game.running);
  assert.equal(await page.locator('#touch .tpad').isVisible(),false,'combat pad must yield to paused menu');
  assert.equal(await page.locator('#touch #tzR').isVisible(),false,'aim zone must not intercept paused menu');
  await page.locator('#pwInventoryMobile').tap();await page.locator('#hArm').waitFor({state:'visible'});
  await page.locator('#amX').tap();assert.equal(await page.evaluate(()=>PW.game.running),false);
  await page.locator('#hPaused [data-p="resume"]').tap();await page.waitForFunction(()=>PW.game.running);
  await page.waitForFunction(()=>document.querySelector('#touch .tpad').getBoundingClientRect().height>0);
  assert.equal(await page.evaluate(()=>PW.game.touch._aim||PW.game.touch._move),null,'no held stick survives menu');
 }
 console.log('PASS portrait and landscape: paused combat pad/aim zones hidden, Loadout closes paused, native Resume tap restores controls without held sticks');
}finally{await browser.close();}
