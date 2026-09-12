import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const touch=process.env.LSW_TOUCH==='1';
const out=touch?'artifacts/combat-readability-touch':'artifacts/combat-readability';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1600,height:900},hasTouch:touch,isMobile:touch}),page=await context.newPage();
const errors=[],results=[];page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto(process.env.LSW_TEST_URL||'http://127.0.0.1:5182/',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#hSelect.on');
 await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
 await page.waitForFunction(()=>document.querySelector('.selname')?.textContent==='VEGA');
 await page.screenshot({path:`${out}/selection.png`});
 assert.match(await page.locator('.selinfo').innerText(),/RESISTANCES & WEAKNESSES/);
 await page.keyboard.press('Enter');await page.waitForTimeout(600);
 console.log('After selection:',(await page.locator('body').innerText()).slice(-3000));
 if(await page.locator('#pwGo:visible').count()){
  await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 }
 await page.waitForFunction(()=>window.LSW?.game?.running&&window.LSW.game.player&&document.querySelector('.player-status')?.checkVisibility(),null,{timeout:120000});
 await page.waitForFunction(()=>!window.LSW.game._frontlinePreparing,null,{timeout:120000});
 await page.waitForTimeout(1500);
 await page.screenshot({path:`${out}/gameplay.png`});
 const read=()=>page.evaluate(()=>({effects:document.querySelector('.ps-effects')?.textContent,attacks:[...document.querySelectorAll('.trigger-damage')].map(e=>e.textContent),errors:[...(LSW.game._errSeen||[])]}));
 results.push({kind:'native menu entry',...await read()});
 // A real trigger press must emit the attack whose type is on the card.
 await page.evaluate(()=>{const g=LSW.game,original=g.projectiles.spawnProjectile;window._readabilityShots=0;g.projectiles.spawnProjectile=function(c,...args){if(c===g.player)window._readabilityShots++;return original.call(this,c,...args);};});
 if(touch){
  const b=await page.locator('#touch [data-b="lmb"]').boundingBox(),cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await page.waitForTimeout(600);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 }else{await page.mouse.click(800,450);await page.mouse.down();await page.waitForTimeout(600);await page.mouse.up();}
 assert.ok(await page.evaluate(()=>window._readabilityShots>0),'native primary input did not fire');
 results.push({kind:touch?'native touch primary':'native mouse primary',shots:await page.evaluate(()=>window._readabilityShots)});
 await page.screenshot({path:`${out}/native-attack.png`});
 // Deliberate status setup verifies production HUD rendering and real countdowns,
 // not the input/contact path that causes each condition.
 await page.evaluate(()=>{const g=LSW.game,p=g.player;window._readabilityUpdate=g.update;g.update=()=>g.world.render();p.addBleed(p);p._bleedStill=1;p.blindT=5;p._corrode=5;p._dots=[{kind:'poison',t:4,dps:2,dtype:'toxic'}];LSW.hud.update();});
 await page.screenshot({path:`${out}/conditions-fixture.png`});
 let r=await read();assert.match(r.effects,/Bleeding/);assert.match(r.effects,/Blinded/);assert.match(r.effects,/Corroded/);assert.match(r.effects,/Poisoned/);results.push({kind:'staged active conditions',...r});
 for(const size of [{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(size);await page.waitForTimeout(350);
  const b=await page.locator('.player-status').boundingBox();assert.ok(b.x>=0&&b.x+b.width<=size.width+1);assert.ok(b.y+b.height<=size.height+1);
  const controls=page.locator(touch?'#touch .tpad':'.combat-dock');
  if(await controls.isVisible()){
   const c=await controls.boundingBox();assert.ok(!(b.x<c.x+c.width&&b.x+b.width>c.x&&b.y<c.y+c.height&&b.y+b.height>c.y),'controls overlap vitals');
  }
  await page.screenshot({path:`${out}/conditions-${size.width}.png`});
 }
 await page.setViewportSize({width:1600,height:900});
 await page.evaluate(()=>{const p=LSW.game.player;p.clotBleed(null,true);p.blindT=0;p._corrode=0;p._dots=[];LSW.hud.update();});
 r=await read();assert.doesNotMatch(r.effects,/Bleeding|Blinded|Corroded|Poisoned/);results.push({kind:'cleared conditions',...r});
 await page.evaluate(()=>{const g=LSW.game;g.update=window._readabilityUpdate;delete window._readabilityUpdate;});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,results}));
}finally{await writeFile(`${out}/results.json`,JSON.stringify({results,errors},null,2));await context.close();await browser.close();}
