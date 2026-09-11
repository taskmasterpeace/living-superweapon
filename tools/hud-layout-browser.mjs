import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const out='artifacts/hud-layout-2026-09-10';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false});
const errors=[],results={checks:[]};
let page;
async function boot(p,touch=false){
 console.log('boot',touch?'mobile':'desktop');
 await p.goto('http://127.0.0.1:5180/powerworld.html?hero=recon');
 await p.locator('[data-encounter="practice"]')[touch?'tap':'click']();
 await p.locator('#pwGo')[touch?'tap':'click']();
 await p.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});
 await p.waitForFunction(()=>document.querySelector('.ps-portrait img')?.naturalWidth>0);
 console.log('scene ready');
}
async function bounds(p){return p.locator('.player-status').evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,scale:getComputedStyle(e).transform};});}
async function editor(p){
 await p.keyboard.press('Escape');
 await p.locator('[data-p="hud-layout"]').click();
 await p.locator('.hud-layout-editor').waitFor();
 assert.equal(await p.evaluate(()=>PW.game.running),false);
}
try{
 const desktop=await browser.newContext({viewport:{width:1600,height:900}});
 page=await desktop.newPage();page.on('pageerror',e=>errors.push(String(e)));
 await boot(page);results.initial=await bounds(page);
 await editor(page);
 const b=await bounds(page);
 results.dragStart=await page.evaluate(b=>({target:document.elementFromPoint(b.x+b.width*.5,b.y+b.height*.5)?.outerHTML.slice(0,300),locked:!!document.pointerLockElement,style:getComputedStyle(document.querySelector('.player-status')).pointerEvents}),b);
 await page.mouse.move(b.x+b.width*.5,b.y+b.height*.5);await page.mouse.down();
 await page.mouse.move(b.x+b.width*.5+210,b.y+b.height*.5+110,{steps:12});await page.mouse.up();
 const dragged=await bounds(page);results.dragged=dragged;
 results.dragPassed=Math.abs(dragged.x-b.x-210)<2&&Math.abs(dragged.y-b.y-110)<2;
 if(results.dragPassed)results.checks.push('native drag');
 console.log('native drag',results.dragPassed);
 const slider=page.getByRole('slider',{name:'HUD size'});
 await slider.focus();await slider.press('Home');await slider.press('ArrowRight');await slider.press('ArrowRight');
 results.sliderKeyboard=await slider.inputValue();
 assert.equal(results.sliderKeyboard,'70','native slider arrow keys blocked');
 const sb=await slider.boundingBox();await page.mouse.click(sb.x+sb.width*.25,sb.y+sb.height*.5);
 const sizeValue=Number(await slider.inputValue());
 const resized=await bounds(page);assert.ok(Math.abs(resized.width/b.width-sizeValue/100)<.02&&sizeValue!==100,'native slider did not resize');
 results.checks.push('native mouse resize');
 await page.locator('.player-status').focus();await page.keyboard.press('ArrowRight');
 assert.ok(Math.abs((await bounds(page)).x-resized.x-4)<1,'keyboard nudge failed');
 results.checks.push('keyboard nudge');
 await page.screenshot({path:`out/edit.png`.replace('out/',out+'/')});
 await page.locator('[data-layout="done"]').click();
 assert.equal(await page.evaluate(()=>PW.game.running),false,'Done resumed combat');
 results.saved=JSON.parse(await page.evaluate(()=>localStorage.getItem('lsw.hud-layout.v1')));
 const savedBounds=await bounds(page);await boot(page);const restored=await bounds(page);
 assert.ok(Math.abs(restored.x-savedBounds.x)<1&&Math.abs(restored.y-savedBounds.y)<1&&Math.abs(restored.width-savedBounds.width)<1,'reload did not restore');
 results.checks.push('Done saves; page reload restores');
 await page.screenshot({path:`${out}/desktop-restored.png`});
 await editor(page);await page.locator('[data-layout="reset"]').click();
 const reset=await bounds(page);assert.ok(Math.abs(reset.x-results.initial.x)<1&&Math.abs(reset.y-results.initial.y)<1&&Math.abs(reset.width-results.initial.width)<1,'reset differs from defaults');
 await page.keyboard.press('Escape');assert.equal(await page.locator('.hud-layout-editor').count(),0);
 assert.equal(await page.evaluate(()=>PW.game.running),false,'Escape resumed combat');
 assert.deepEqual(JSON.parse(await page.evaluate(()=>localStorage.getItem('lsw.hud-layout.v1'))),{scale:1,x:.25,y:.27});
 results.checks.push('Reset restores defaults; Escape closes into pause');
 await page.screenshot({path:`${out}/desktop-reset.png`});
 await page.locator('[data-p="hud-layout"]').click();await slider.focus();await page.keyboard.press('Tab');
 assert.equal(await page.evaluate(()=>PW.hud.titleOpen),false,'editor Tab opened main menu');
 assert.equal(await page.locator('.hud-layout-editor').count(),1);
 await page.locator('[data-layout="done"]').click();
 results.checks.push('editor Tab stays out of game hotkeys');
 await desktop.close();
 const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
 page=await mobile.newPage();page.on('pageerror',e=>errors.push(String(e)));await boot(page,true);
 results.mobile=[];
 for(const size of [{width:390,height:844},{width:844,height:390},{width:1024,height:768}]){
  await page.setViewportSize(size);await page.waitForTimeout(250);
  const r=await bounds(page);assert.ok(r.x>=0&&r.y>=0&&r.right<=size.width&&r.bottom<=size.height,'mobile HUD out of bounds');
  assert.ok(r.y<=16&&r.width<=240,'mobile HUD not compact/top-pinned');
  assert.equal(await page.locator('#hud .combat-dock').isVisible(),false);
  results.mobile.push({size,bounds:r});await page.screenshot({path:`${out}/${size.width}x${size.height}.png`});
 }
 results.checks.push('mobile top-pinned bounds and no duplicate combat dock, three viewport sizes');
 assert.deepEqual(errors,[]);assert.equal(results.dragPassed,true,'native drag failed');results.passed=true;
 await mobile.close();
}catch(e){results.failure=String(e);process.exitCode=1;await page?.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{results.errors=errors;await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));await browser.close();}
