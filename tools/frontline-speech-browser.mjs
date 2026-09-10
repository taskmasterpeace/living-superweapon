// Bounded native-mode DOM/CSS fixture. Dialogue is explicitly injected through
// Comic.say for layout coverage; this is not a naturally-triggered speech claim.
// Actors, AI, camera, HP and simulation clocks are not changed by the fixture.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const out=resolve('artifacts/frontline-speech-native'),result={rows:[],errors:[],injectedDialogue:true};
await mkdir(out,{recursive:true});const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1600,height:900}});
const watchdog=setTimeout(()=>page.close().catch(()=>{}),90000);
page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
try{
 await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',cameraPreset:'frontline',ai:1.25})));
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.locator('#pwEncounter [data-encounter="frontline"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>window.PW?.game?.running&&PW.game.pwStage?.frontlineReady,null,{timeout:60000});await page.evaluate(()=>document.fonts.ready);
 for(const [width,height] of [[1600,900],[1280,720],[800,600]]){
  await page.setViewportSize({width,height});
  const row=await page.evaluate(()=>{
   const g=PW.game,c=g.comic,p=g.player,rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
   const old=c.say(p,'FIRST',{life:10}),it=c.say(p,'STAY BACK!',{tone:'weak',life:10});c.update(.016);
   const shown=el=>{const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'&&el.getBoundingClientRect().width>0;};
   const panels=[...new Set([...Object.values(g.hud.el).filter(el=>el?.getBoundingClientRect),document.querySelector('#frontlineObjective')])]
    .filter(el=>el&&['hFoe','hRadar','hFieldRec','hFeed','frontlineObjective'].includes(el.id)&&shown(el)).map(el=>({id:el.id,rect:rect(el)}));
   return {width:innerWidth,height:innerHeight,mode:g.modeId,ready:g.pwStage.frontlineReady,kind:it.kind,
    rect:rect(it.node),visible:shown(it.node),speaker:it.node.querySelector('.cmfield-speaker')?.textContent,text:it.node.querySelector('.cmfield-text')?.textContent,
    oldRemoved:!old.node.isConnected,fieldCount:c.items.filter(it=>it.kind==='field').length,svg:it.node.querySelectorAll('svg').length,panels,
    newsEnabled:g.news.enabled,aiEnabled:g.ms.frontline.soldiers.every(f=>!!f.ai)};
  });
  result.rows.push(row);assert.equal(row.kind,'field');assert.equal(row.mode,'powerworld');assert.ok(row.ready&&row.visible&&row.oldRemoved);
  assert.equal(row.fieldCount,1);assert.equal(row.svg,0);assert.equal(row.text,'STAY BACK!');assert.ok(row.speaker.includes('VEGA'));
  assert.ok(row.rect.top>=0&&row.rect.bottom<=Math.min(180,row.height*.26));assert.ok(row.rect.left>=0&&row.rect.right<=row.width);
  for(const panel of row.panels)assert.ok(!(row.rect.left<panel.rect.right&&row.rect.right>panel.rect.left&&row.rect.top<panel.rect.bottom&&row.rect.bottom>panel.rect.top),`Field speech overlaps ${panel.id}`);
  assert.ok(row.newsEnabled&&row.aiEnabled);await page.screenshot({path:resolve(out,`field-${width}.png`)});
 }
 assert.deepEqual(result.errors,[]);result.success=true;
}catch(error){result.success=false;result.failure=String(error);process.exitCode=1;}
finally{clearTimeout(watchdog);await browser.close();await writeFile(resolve(out,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));}
