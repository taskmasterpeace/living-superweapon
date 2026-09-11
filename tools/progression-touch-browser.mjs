import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import {profileFromDef,STORAGE_KEY} from '../src/tool/studio-profile.js';
import {ROSTER} from '../src/data/characters.js';
const profile=profileFromDef(ROSTER.find(d=>d.id==='kano'));profile.progression.unlocks={q:4,shift:4};
const browser=await chromium.launch({headless:true}),errors=[];await mkdir('artifacts/progression',{recursive:true});
try{
 for(const [device,width,height] of [['phone',844,390],['tablet',1024,768]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});
  await context.addInitScript(({key,profile})=>localStorage.setItem(key,JSON.stringify({kano:profile})),{key:STORAGE_KEY,profile});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5180/powerworld.html?hero=kano');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
  await page.waitForFunction(()=>LSW.game.running&&LSW.game.touch.enabled);
  await page.evaluate(()=>{LSW.game.update=()=>{};LSW.game.hud.update();});
  const touchState=await page.evaluate(()=>{const t=document.querySelector('#touch'),s=getComputedStyle(t),r=t.getBoundingClientRect();return {body:document.body.className,enabled:LSW.game.touch.enabled,display:s.display,visibility:s.visibility,w:r.width,h:r.height,buttons:[...t.querySelectorAll('.tbtn')].map(b=>({id:b.dataset.b,display:getComputedStyle(b).display}))};});
  assert.equal(await page.locator('#touch [data-b="q"]').isVisible(),true,JSON.stringify({device,touchState}));
  for(const button of ['q','dash']){const control=page.locator(`#touch [data-b="${button}"]`);assert.equal(await control.getAttribute('aria-disabled'),'true');assert.match(await control.textContent(),/LV 4/);assert.match(await control.getAttribute('aria-label'),/level 4/);}
  await page.screenshot({path:`artifacts/progression/${device}-locked.png`});
  await page.evaluate(()=>{const g=LSW.game;while(g.player.level<4)g.levelUp(g.player,true);g.hud.update();});
  for(const button of ['q','dash']){const control=page.locator(`#touch [data-b="${button}"]`);assert.equal(await control.getAttribute('aria-disabled'),'false');assert.doesNotMatch(await control.textContent(),/LV 4/);}
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS phone/tablet visible level gates and unlock updates, including dash→shift mapping');
}finally{await browser.close();}
