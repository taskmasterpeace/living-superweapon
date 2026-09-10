import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const out='artifacts/frontline-encounter',base='http://127.0.0.1:5180';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'});
const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[],result={};
page.setDefaultTimeout(20000);
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const state=()=>page.evaluate(()=>{
  const g=LSW.game,e=g.ms.frontline;
  return {mode:g.modeId,running:g.running,phase:e?.phase,progress:e?.progress,completions:e?.completions,
    player:{y:g.player?.pos.y,flying:g.player?.flying,openSky:g.player?._openSky},
    clones:g.entities.filter(f=>f._frontlineClone).map(f=>({name:f.def.name,y:f.pos.y,grounded:f.grounded,flying:f.flying,openSky:!!f._openSky,flightTier:f.flightTier,team:f.team,level:f.level,alive:f.alive})),
    hud:document.querySelectorAll('#frontlineObjective').length,markers:g.scene.children.filter(o=>o.name==='frontline-objectives').length};
});
try {
  await page.goto(base+'/powerworld.html');await page.waitForFunction(()=>window.PW?.game);
  assert.equal(await page.locator('#pwEncounter [data-encounter="frontline"]').count(),1,'Native title must offer Clone recovery');
  assert.equal(await page.locator('#pwEncounter [data-encounter="sparring"]').getAttribute('aria-pressed'),'true');
  await page.locator('#pwTwo [data-two="1"]').click();
  assert.ok(await page.locator('#pwEncounter [data-encounter="frontline"]').isDisabled());
  await page.locator('#pwTwo [data-two="0"]').click();
  await page.locator('#pwEncounter [data-encounter="frontline"]').click();
  await page.locator('#pwGo').click();
  await page.waitForFunction(()=>LSW.game.running&&LSW.game.ms.frontline&&LSW.game.pwStage?.frontlineReady,{},{polling:100,timeout:60000});
  result.nativeEntry=await state();
  assert.equal(result.nativeEntry.mode,'powerworld');assert.equal(result.nativeEntry.hud,1);assert.equal(result.nativeEntry.markers,1);
  assert.equal(result.nativeEntry.clones.length,4);
  assert.ok(result.nativeEntry.clones.every(f=>f.flightTier===0&&!f.openSky&&f.team===1&&f.level===1));
  await page.screenshot({path:`${out}/native-entry.png`});
  await page.keyboard.down('Space');
  await page.waitForFunction(()=>LSW.game.player.pos.y>30);
  await page.keyboard.up('Space');
  result.nativeAscent=await state();
  assert.ok(result.nativeAscent.player.openSky&&result.nativeAscent.player.flying);
  assert.ok(result.nativeAscent.clones.every(f=>!f.flying&&f.y<1&&f.grounded));
  await page.screenshot({path:`${out}/native-flight.png`});
  // Deterministic objective fixture: the native entry and ascent above used real UI/Space.
  // This does NOT claim a player-input combat victory. Suppress fire, invoke native damage,
  // place the hero, and step the real objective controller for exact-duration assertions.
  result.fixture=await page.evaluate(()=>{
    const g=LSW.game,e=g.ms.frontline,p=g.player;g.running=false;
    const rankingsBefore=localStorage.getItem('threshold_rankings_v1');
    for(const f of e.soldiers){f.ai=null;f.takeDamage(f.hp+5,{src:p,knock:0});g.handleKO(f);f._wasAlive=false;}
    const rankingsUnchanged=rankingsBefore===localStorage.getItem('threshold_rankings_v1');
    g.running=true;p.hp=p.maxHp;p.flying=false;p.gait='grounded';p.pos.copy(e.casePosition);p.vel.set(0,0,0);p.staggerT=0;
    e.damagePause=0;e.update(0);e.update(.5);const hold=e.progress;
    p.flying=true;e.update(2);const airborne=e.progress;p.flying=false;
    e.onHit(p,1);e.update(.5);const hit=e.progress;e.update(.5);e.update(1);
    const secured=e.phase;p.pos.copy(e.extractionPosition);e.update(2);e.update(5);
    return {fixture:'Suppressed AI, native lethal damage/KO, placed player, exact objective steps',rankingsUnchanged,hold,airborne,hit,secured,phase:e.phase,completions:e.completions};
  });
  assert.equal(result.fixture.hold,.5);assert.equal(result.fixture.airborne,.5);assert.equal(result.fixture.hit,.5);
  assert.equal(result.fixture.secured,'extract');assert.equal(result.fixture.phase,'complete');assert.equal(result.fixture.completions,1);
  assert.equal(result.fixture.rankingsUnchanged,true,'Clone KOs must not change SARGE’s persistent rankings or medical record');
  await page.screenshot({path:`${out}/fixture-complete.png`});
  // Existing title path uses the real door; repeat launch uses its real UI.
  await page.keyboard.press('Tab');await page.waitForFunction(()=>LSW.hud.titleOpen);
  result.titleCleanup=await state();assert.equal(result.titleCleanup.hud,0);assert.equal(result.titleCleanup.markers,0);assert.equal(result.titleCleanup.clones.length,0);
  await page.locator('#pwGo').click();await page.waitForFunction(()=>LSW.game.ms.frontline&&!LSW.game.ms.frontline.disposed&&LSW.game.pwStage?.frontlineReady,{},{polling:100,timeout:60000});
  result.repeat=await state();assert.equal(result.repeat.hud,1);assert.equal(result.repeat.markers,1);assert.equal(result.repeat.clones.length,4);
  await page.evaluate(()=>LSW.hud.onRematch());
  await page.waitForFunction(()=>LSW.game.pwStage?.frontlineReady,{},{polling:100,timeout:60000});
  result.rematch=await state();assert.equal(result.rematch.hud,1);assert.equal(result.rematch.markers,1);assert.equal(result.rematch.clones.length,4);
  await page.keyboard.press('Tab');await page.waitForFunction(()=>LSW.hud.titleOpen);
  await page.locator('#pwEncounter [data-encounter="sparring"]').click();await page.locator('#pwGo').click();
  await page.waitForFunction(()=>LSW.game.pwStage?.frontlineReady,{},{polling:100,timeout:60000});
  result.sparring=await state();assert.equal(result.sparring.hud,0);assert.equal(result.sparring.markers,0);assert.equal(result.sparring.clones.length,0);
  assert.deepEqual(errors,[]);console.log(JSON.stringify(result,null,2));
} finally {await writeFile(`${out}/results.json`,JSON.stringify({...result,errors},null,2));await browser.close();}
