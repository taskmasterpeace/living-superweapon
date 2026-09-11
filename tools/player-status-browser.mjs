import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/player-status-2026-09-10';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e)));const results=[];
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=vega');
 await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});
 await page.waitForFunction(()=>document.querySelector('.ps-portrait img')?.naturalWidth>0);
 const read=()=>page.evaluate(()=>{const e=document.querySelector('.player-status'),r=e.getBoundingClientRect();return {bounds:{x:r.x,y:r.y,width:r.width,height:r.height},name:e.querySelector('.ps-name').textContent,meters:[...e.querySelectorAll('[role="meter"]')].map(m=>({label:m.getAttribute('aria-label'),value:m.getAttribute('aria-valuenow'),text:m.textContent})),form:e.querySelector('.ps-form').textContent,portrait:e.querySelector('img').src,flight:!e.querySelector('.ps-flight').hidden,oldVisible:document.querySelector('#hud .pl').checkVisibility(),errors:[...(PW.game._errSeen||[])]};});
 const before=await read();assert.equal(before.oldVisible,false);assert.equal(before.meters.length,3);assert.equal(before.flight,false);
 await page.screenshot({path:`${out}/desktop.png`});results.push({name:'desktop',...before,portrait:before.portrait.slice(0,30)});
 await page.mouse.click(800,450);await page.keyboard.down('KeyW');await page.waitForTimeout(500);await page.keyboard.up('KeyW');
 assert.deepEqual((await read()).bounds,before.bounds,'HUD followed movement');
 await page.keyboard.down('Space');await page.waitForTimeout(650);await page.keyboard.up('Space');await page.waitForFunction(()=>!document.querySelector('.ps-flight').hidden);await page.screenshot({path:`${out}/flight.png`});
 // Presentation-state fixtures: real HUD and actual applyForm, not combat/transform-input proof.
 await page.evaluate(()=>{const p=PW.game.player;p.hp=p.maxHp*.2;p.ki=p.maxKi*.3;p.guardMeter=.0009;p.staggerT=.7;p.guardBreakT=.7;p.buffT=5;p.buffName='Power boost';p.sprintT=5;p.sprintMult=1.6;PW.hud.kiWarn();p.applyForm({name:'HUD FORM TEST',colors:{suit:'#e34e2d',accent:'#ffcf52'}});});
 await page.waitForFunction(()=>document.querySelector('.player-status').classList.contains('ps-broken'));
 assert.equal(await page.locator('.ps-energy-denied').count(),1);assert.match(await page.locator('.ps-effects').textContent(),/\+60%/);
 await page.waitForFunction(()=>document.querySelector('.ps-form').textContent==='HUD FORM TEST');await page.waitForFunction(old=>document.querySelector('.ps-portrait img').src!==old&&document.querySelector('.ps-portrait img').naturalWidth>0,before.portrait);
 await page.screenshot({path:`${out}/status-fixture.png`});results.push({name:'status fixture',...await read(),portrait:'redacted data URL'});
 for(const size of [{width:900,height:1600},{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(size);await page.waitForTimeout(250);const s=await read();assert.ok(s.bounds.x>=0&&s.bounds.x+s.bounds.width<=size.width);assert.ok(s.bounds.y+s.bounds.height<=size.height);await page.screenshot({path:`${out}/${size.width}x${size.height}.png`});results.push({name:`${size.width}x${size.height}`,...s,portrait:'redacted data URL'});}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,results}));
}finally{await writeFile(`${out}/results.json`,JSON.stringify({results,errors},null,2));await context.close();await browser.close();}
