import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/inventory-concept-2026-09-14';
await mkdir(out,{recursive:true});
const base=process.env.CONCEPT_BASE||'http://127.0.0.1:5193';
const browser=await chromium.launch({headless:!process.argv.includes('--hud')});
const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
try{
 if(process.argv.includes('--hud')){
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  await page.locator('#hSelect.on').waitFor();
  if(process.argv.includes('--training')){
   await page.evaluate(()=>{const g=PW.game;g.hud.hideTitle();g.hud.hideSelect();g.startMode('training',{p1:'sol',p2:'kano'});g.hud.setPlayer(g.player.def);document.body.classList.add('playing');g.hud.update();});
   await page.waitForTimeout(2500);
  }else{
  await page.keyboard.press('Enter');
  await page.getByRole('button',{name:'Enter with squad',exact:true}).click();
  await page.waitForFunction(()=>window.PW?.game?.running&&PW.game.player&&PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing&&!PW.game.hud?.titleOpen,null,{timeout:180000});
  await page.waitForTimeout(2200);
  }
  await page.evaluate(()=>PW.game.hud.update());
  await page.screenshot({path:out+'/current-game-hud.png'});
  const evidence=await page.evaluate(()=>({url:location.href,running:PW.game.running,frontlineReady:PW.game.pwStage?.frontlineReady,preparing:!!PW.game._frontlinePreparing,hero:PW.game.player.def.id,mode:PW.game.modeId,viewport:[innerWidth,innerHeight]}));
  evidence.captureMethod=process.argv.includes('--training')?'Current game training mode via exposed game API. Full frontline preparation stalled beyond 180 seconds; no current frontline HUD claim.':'Native character and squad entry';
  await writeFile(out+'/current-game-hud.json',JSON.stringify({captured:new Date().toISOString(),evidence,errors},null,2));
 }else{
  await page.goto(base+'/inventory-concept.html');
  for(const mode of ['closed','backpack','square','wide','vehicle']){
   await page.locator(`[data-mode="${mode}"]`).click();
   await page.screenshot({path:out+`/concept-${mode}.png`});
  }
  await page.locator('[data-mode="backpack"]').click();
  if(await page.locator('#capacity-text').innerText()!=='18 / 24 CELLS')throw Error('Equipped pistol footprint must be 2 by 2');
  await page.getByRole('button',{name:'Equip rifle in both hands'}).click();
  if(!await page.locator('#hands').innerText().then(t=>t.includes('BOTH HANDS')))throw Error('Rifle ownership missing');
  if(await page.locator('#capacity-text').innerText()!=='14 / 24 CELLS')throw Error('Equipped rifle counted as stored');
  await page.getByRole('button',{name:'Carry a person'}).click();
  if(!await page.locator('#hands').innerText().then(t=>t.includes('CARRIED PERSON')))throw Error('Carry ownership missing');
  if(await page.locator('#capacity-text').innerText()!=='22 / 24 CELLS')throw Error('Carried person consumed storage');
  await page.getByRole('button',{name:'Stow held item'}).click();
  if(!await page.locator('#feedback').innerText().then(t=>t.includes('cannot')))throw Error('Person could be stored');
  await page.getByRole('button',{name:'Release carried entity'}).click();
  await page.getByRole('button',{name:'Carry a world object'}).click();
  await page.getByRole('button',{name:'Equip rifle in both hands'}).click();
  if(!await page.locator('#hands').innerText().then(t=>t.includes('CARRIED WORLD OBJECT')))throw Error('Equip displaced carried object');
  await page.getByRole('button',{name:'Release carried entity'}).click();
  await page.getByRole('button',{name:'Equip pistol in right hand'}).click();
  await page.getByRole('button',{name:'Stow held item'}).click();
  await page.keyboard.press('Escape');
  if(await page.locator('#kit').isVisible())throw Error('Escape did not dismiss kit');
  await page.setViewportSize({width:844,height:390});
  await page.locator('[data-mode="backpack"]').click();
  await page.screenshot({path:out+'/concept-compact.png'});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal page overflow');
  await writeFile(out+'/verification.json',JSON.stringify({captured:new Date().toISOString(),checks:['five view modes','rifle claims both hands','carried person cannot be stored','release carried entity','equip and stow pistol','Escape closes overlay','844x390 no horizontal overflow'],errors},null,2));
 }
 if(errors.length)throw Error(errors.join('\n'));
}catch(error){await page.screenshot({path:out+'/capture-failure.png'});console.log((await page.locator('body').innerText()).slice(0,2500));console.log(await page.evaluate(()=>({running:window.PW?.game.running,state:window.PW?.game.ms?.threatLab?.state,mode:window.PW?.game.modeId})));throw error;}finally{await browser.close();}
