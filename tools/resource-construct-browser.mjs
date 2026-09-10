import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';

// Real authoring controls and genuine ORIGIN packages; simulation is deterministically
// scrubbed for inspection. This is not player-input feel or frame-time evidence.
const out='artifacts/resource-construct-studio';await mkdir(out,{recursive:true});
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180';
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1600,height:1050}}),page=await context.newPage();
const errors=[],result={};
const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};watch(page);
const field=key=>page.locator(`input[type="number"][data-attack-key="${key}"]`);
const set=async(key,value)=>{await field(key).fill(String(value));await field(key).press('Tab');};
const mode=value=>page.getByLabel('Construct lifetime',{exact:true}).selectOption(value);
const pause=async()=>{if(await page.evaluate(()=>STUDIO.preview.playing))await page.getByRole('button',{name:'Pause preview',exact:true}).click();};
const seek=async time=>page.evaluate(time=>{const p=STUDIO.preview;p.seek(time);return {time:p.time,duration:p.duration,...p.combat.resourceStats(),cover:p.chase.cover.length,damage:p.combat.damage,contacts:p.combat.contacts};},time);
const snapshot=async(name,time)=>{const state=await seek(time);await page.screenshot({path:`${out}/${name}.png`});return state;};
const prepare=async slot=>{
 await pause();await page.getByLabel('Preview level',{exact:true}).selectOption('10');
 await page.getByLabel('Motion state',{exact:true}).selectOption('attack');
 await page.getByLabel('Preview attack',{exact:true}).selectOption(slot);
 await page.getByRole('tab',{name:'Attacks',exact:true}).click();
 await page.getByLabel('Attack slot',{exact:true}).selectOption(slot);
};
const importPackage=async pack=>{
 await page.getByRole('button',{name:'Import JSON',exact:true}).click();
 await page.getByLabel('Profile JSON',{exact:true}).fill(JSON.stringify(pack));
 await page.getByRole('button',{name:'Import profile',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('dialog').open&&STUDIO.preview.fighter.def.isCustom);
 return page.evaluate(()=>STUDIO.preview.fighter.def.id);
};
try{
 await page.goto(base+'/studio.html?hero=aurum');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 assert.equal(await page.evaluate(()=>STUDIO.preview.sound.backend.ctx),null,'No autoplay');
 await prepare('q');
 result.wallSource=await page.evaluate(()=>structuredClone(STUDIO.preview.fighter.def.abilities.q));
 assert.equal(await page.getByLabel('Construct lifetime',{exact:true}).inputValue(),'timed');
 assert.equal(await field('constructKiPerSec').isDisabled(),true);
 assert.equal(await field('constructKiPerDamage').isDisabled(),true);
 await mode('upkeep');await set('constructKiPerSec',5);
 assert.equal(await field('duration').isDisabled(),true);assert.equal(await field('constructKiPerDamage').isDisabled(),true);
 await mode('damage');await set('constructKiPerDamage',2);
 assert.equal(await field('constructKiPerSec').isDisabled(),true);
 await mode('timed');assert.equal(await field('duration').isDisabled(),false);
 await mode('upkeep');assert.equal(await field('constructKiPerSec').inputValue(),'5');
 assert.equal(await field('constructKiPerDamage').inputValue(),'2');
 await page.locator('#construct-start-ki').fill('100');await page.locator('#construct-start-ki').press('Tab');
 const zero=await seek(0);assert.equal(zero.ki,100);assert.equal((await seek(0)).ki,100);assert.equal(zero.cover,0);
 result.wall=await snapshot('wall-upkeep',3.2);
 assert.equal(result.wall.duration,8);assert.ok(result.wall.constructs.some(c=>c.mode==='upkeep'&&c.live&&c.hits>0));
 assert.equal(await page.evaluate(()=>STUDIO.preview.combat.game.constructs.find(c=>!c.dead).life===Infinity),true,'Inspection length must not become a lifetime');
 const repeat=await seek(3.2);assert.deepEqual(repeat,result.wall,'Seek must reproduce energy/contact diagnostics');
 const paused=await page.evaluate(()=>{const p=STUDIO.preview;for(let i=0;i<30;i++)p.step(0,false,false);return p.combat.resourceStats();});
 assert.equal(paused.ki,result.wall.ki);assert.deepEqual(paused.constructs,result.wall.constructs);
 await page.getByRole('button',{name:'Sound off',exact:true}).click();
 await page.getByRole('button',{name:'Sound on',exact:true}).waitFor({timeout:30000});
 const audioBefore=await page.evaluate(()=>STUDIO.preview.sound.eventCount);
 await seek(0);await seek(3.2);
 assert.equal(await page.evaluate(()=>STUDIO.preview.sound.eventCount),audioBefore,'Historical scrubbing must stay silent');
 result.wallDismissed=await snapshot('wall-dismissed',6.5);assert.equal(result.wallDismissed.cover,0);
 assert.ok(result.wallDismissed.constructs.length>0&&result.wallDismissed.constructs.every(c=>!c.live),'Keep diagnostics after dismissal');
 await page.getByRole('button',{name:'Sound on',exact:true}).click();
 await page.getByRole('button',{name:'Save local',exact:true}).click();

 // Build only the portable recipe with production tools, then exercise the real
 // import dialog and UI edits. No raw runtime definition is injected into a kit.
 const pack=await page.evaluate(async()=>{
  const {freshPicks,buildDef}=await import('/src/data/creator.js');
  const {profileFromDef}=await import('/src/tool/studio-profile.js');
  const {exportCharacter}=await import('/src/tool/character-package.js');
  const picks={...freshPicks(),name:'BULWARK TEST',budget:'unbound',slots:{lmb:'kibolt',rmb:'heatray',q:'willtank',e:'wall',f:null,r:null}};
  const def=buildDef(picks,'cx_resource_browser');return exportCharacter({picks,def},profileFromDef(def));
 });
 result.createdId=await importPackage(pack);await prepare('q');
 await page.getByLabel('Target distance',{exact:true}).fill('60');await page.getByLabel('Target distance',{exact:true}).press('Tab');
 assert.equal(await page.getByLabel('Construct lifetime',{exact:true}).inputValue(),'timed');
 await mode('damage');await set('constructKiPerDamage',2);await set('moveSpeed',15);await set('interval',1.5);
 await mode('upkeep');await set('constructKiPerSec',5);await mode('damage');
 await page.locator('#construct-start-ki').fill('100');await page.locator('#construct-start-ki').press('Tab');
 result.tank=await snapshot('tank-damage',4.2);
 assert.equal(result.tank.duration,8);assert.ok(result.tank.constructs.some(c=>c.kind==='tank'&&c.mode==='damage'&&c.live&&c.hits>0&&c.kiSpent>0));
 assert.ok(result.tank.damage>0,'Tank must produce native cannon contact in the stage');
 result.tankDefinition=await page.evaluate(()=>structuredClone(STUDIO.preview.fighter.def.abilities.q));
 assert.equal(result.tankDefinition.cost,24);assert.equal(result.tankDefinition.cd,8);
 assert.equal(result.tankDefinition.constructKiPerDamage,2);assert.equal(result.tankDefinition.constructKiPerSec,5);
 await page.getByRole('button',{name:'Save local',exact:true}).click();
 const downloadWait=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON',exact:true}).click();
 await(await downloadWait).saveAs(`${out}/bulwark.character.json`);
 const exported=JSON.parse(await readFile(`${out}/bulwark.character.json`,'utf8'));
 assert.equal(exported.picks.slots.q,'willtank');assert.equal(exported.profile.attacks.q.values.constructKiPerDamage,2);
 const priorId=result.createdId;result.importedId=await importPackage(exported);assert.notEqual(result.importedId,priorId);
 await page.goto(`${base}/studio.html?hero=${result.importedId}`);await page.waitForFunction(id=>window.STUDIO?.preview?.fighter?.def.id===id,result.importedId);
 await prepare('q');assert.deepEqual(await page.evaluate(()=>structuredClone(STUDIO.preview.fighter.def.abilities.q)),result.tankDefinition);
 assert.equal(await field('constructKiPerSec').inputValue(),'5');assert.equal(await field('constructKiPerSec').isDisabled(),true);
 await page.getByRole('button',{name:'Edit power kit',exact:true}).click();
 const tankCard=page.locator('#origin .pcard[data-p="willtank"]');
 await tankCard.waitFor({state:'visible'});await tankCard.scrollIntoViewIfNeeded();
 assert.match(await tankCard.textContent(),/Will Tank/,'Native catalog card must exist');
 await page.screenshot({path:`${out}/tank-origin-catalog.png`});
 // Reload abandons only the isolated browser context's unedited creator screen.
 await page.goto(`${base}/studio.html?hero=${result.importedId}`);await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);await prepare('q');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${out}/tank-compact.png`,fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Compact editor must not overflow horizontally');
 await page.setViewportSize({width:1600,height:1050});
 const gamePage=await context.newPage();watch(gamePage);
 await gamePage.goto(`${base}/powerworld.html?hero=${result.importedId}`);await gamePage.waitForFunction(()=>window.LSW?.game);await gamePage.locator('#pwGo').click();
 result.gameplay=await gamePage.evaluate(id=>{
  const g=LSW.game;g.startMode('powerworld',{p1:id,p2:'sol'});g.running=false;
  return {id:g.player.def.id,ability:structuredClone(g.player.slots.q.def)};
 },result.importedId);
 assert.equal(result.gameplay.id,result.importedId);
 // Gameplay's existing applyDtypes boot pass stamps this derived energy tag;
 // it is not an authored profile difference. Compare every remaining field.
 const {dtype,...gameplayAuthored}=result.gameplay.ability;
 assert.equal(dtype,'energy');assert.deepEqual(gameplayAuthored,result.tankDefinition);
 await gamePage.close();
 // Final endpoint must honor the same eight-second transport boundary as live
 // playback, even when an allowed slow shell misses a moving target. Dismissal
 // at six seconds still leaves already-fired ordnance alive before the endpoint.
 await set('speed',20);await set('range',160);await set('interval',1.2);
 await page.getByLabel('Target distance',{exact:true}).fill('60');await page.getByLabel('Target distance',{exact:true}).press('Tab');
 await page.getByLabel('Target motion',{exact:true}).selectOption('orbit-left');
 await page.getByLabel('Construct starting ki',{exact:true}).fill('100');await page.getByLabel('Construct starting ki',{exact:true}).press('Tab');
 result.beforeEndpoint=await page.evaluate(()=>{const p=STUDIO.preview;p.seek(7.9);return {liveShots:p.combat.game.projectiles.list.filter(s=>!s.dead&&s.obj?.parent).length,...p.combat.resourceStats()};});
 assert.ok(result.beforeEndpoint.liveShots>0,'Valid slow-shot fixture must retain ordnance before the transport boundary');
 result.endpoint=await snapshot('tank-inspection-end',8);
 assert.equal(result.endpoint.cover,0);assert.ok(result.endpoint.constructs.every(c=>!c.live));
 assert.equal(await page.evaluate(()=>STUDIO.preview.combat.game.projectiles.list.filter(s=>!s.dead).length),0);
 assert.deepEqual(result.endpoint.constructs,result.beforeEndpoint.constructs,'End cleanup must retain measured results');
 await page.evaluate(()=>STUDIO.preview.dispose());assert.deepEqual(errors,[]);
 console.log(JSON.stringify(result,null,2));
}catch(error){await page.screenshot({path:`${out}/failure.png`,fullPage:true}).catch(()=>{});throw error;}
finally{await writeFile(`${out}/results.json`,JSON.stringify({...result,errors},null,2));await browser.close();}
