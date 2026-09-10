import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.LSW_SPEECH_OUT||'artifacts/frontline-speech',base=process.env.LSW_URL||'http://127.0.0.1:5182';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage({viewport:{width:1600,height:900}});
const errors=[],report={url:base+'/powerworld.html',browserChannel:'chromium',evidence:'Native UI entry and observed native speech calls; subsequent explicitly injected layout fixtures are not naturally triggered dialogue.'};
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(report.url);await page.waitForFunction(()=>window.PW?.game);
 await page.evaluate(()=>{const c=LSW.game.comic,say=c.say.bind(c);window.nativeSpeech=[];c.say=(f,text,opts)=>{const it=say(f,text,opts);nativeSpeech.push({speaker:f?.def?.name,text,tone:opts?.tone,admitted:!!it});return it;};});
 await page.locator('#pwEncounter [data-encounter="frontline"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>LSW.game.running&&LSW.game.pwStage?.frontlineReady,{},{timeout:60000});
 await page.waitForTimeout(6500);report.nativeCalls=await page.evaluate(()=>nativeSpeech);
 report.upstreamFixture=await page.evaluate(()=>{
  const g=LSW.game,c=g.comic,p=g.player;c.clear();g._feelSpokeT=-100;
  p._psyche.pendingInstant={text:'Still standing.',fx:{}};g.updatePsyche(0);c.update(.016);
  return {injected:true,path:'Injected pendingInstant -> native updatePsyche -> comic.say',admitted:c.items.some(it=>it.speech),items:c.items.filter(it=>it.speech).map(it=>({kind:it.kind,tone:it.tone}))};
 });
 assert.ok(report.upstreamFixture.admitted,'Native upstream speech event path');
 report.fixtures=[];
 for(const [label,width,height,tone] of [['talk',1600,900,'talk'],['yell',1600,900,'yell'],['portrait-talk',390,844,'talk'],['landscape-yell',844,390,'yell']]){
  await page.setViewportSize({width,height});await page.waitForTimeout(200);
  const row=await page.evaluate(({label,tone})=>{
   const g=LSW.game,c=g.comic,p=g.player;g.update=()=>g.world.render();g.running=true;g.hud.titleOpen=false;g.matchOver=false;
   c.clear();p.hp=p.maxHp;p.alive=true;p.obj.visible=true;p.obj.updateMatrixWorld(true);
   const it=c.say(p,tone==='yell'?'GET TO COVER!':'Ready. Moving in.',{tone,category:label,life:5});c.update(.016);
   const n=it?.node,r=n?.getBoundingClientRect();
   window.fixtureItem=it;
   return {label,injected:true,admitted:!!it,kind:it?.kind,tone:it?.tone,visibility:n?.style.visibility,rect:r?{x:r.x,y:r.y,w:r.width,h:r.height}:null,tail:it?.tail?.getAttribute('d'),point:c._speechPoint(p),viewport:{w:innerWidth,h:innerHeight}};
  },{label,tone});
  await page.waitForTimeout(240);await page.evaluate(()=>{LSW.game.comic.update(.016);fixtureItem?.node.getAnimations().forEach(a=>a.finish());});
  const measured=await page.evaluate(()=>{const it=fixtureItem,r=it?.node.getBoundingClientRect(),hud=document.querySelector('#hud .player-status')?.getBoundingClientRect();return {visibility:it?.node.style.visibility,rect:r?{x:r.x,y:r.y,w:r.width,h:r.height}:null,tail:it?.tail?.getAttribute('d'),tailMode:it?.node.dataset.tailMode,speakerLabel:it?.speakerLabel?.textContent,overlapsVitals:!!(r&&hud&&r.right>hud.left&&r.left<hud.right&&r.bottom>hud.top&&r.top<hud.bottom)};});Object.assign(row,measured);
  report.fixtures.push(row);await page.screenshot({path:`${out}/${label}.png`});
  assert.ok(row.admitted,label+' admitted');assert.equal(row.kind,'bub');assert.equal(row.visibility,'',label+' visible');
  assert.ok(row.rect.x>=0&&row.rect.y>=0&&row.rect.x+row.rect.w<=width&&row.rect.y+row.rect.h<=height,label+' safe bounds');
  assert.equal(row.overlapsVitals,false,label+' avoids portrait/vitals');
  assert.ok(row.tail || (row.tailMode==='speaker-label'&&row.speakerLabel.includes('SPEAKING')),label+' has a mouth tail or explicit speaker fallback');
  if(label==='talk'||label==='yell')assert.ok(row.tail,label+' has a clear mouth tail');
  if(label==='talk'){
   report.animatedAnchor=await page.evaluate(()=>{const c=LSW.game.comic,p=LSW.game.player,it=fixtureItem,old=p.parts.head.position.x,a=c._speechPoint(p);p.parts.head.position.x+=1;c.update(.016);const b=c._speechPoint(p),tail=it.tail.getAttribute('d');p.parts.head.position.x=old;return {injected:true,before:a,after:b,tail};});
   assert.notEqual(report.animatedAnchor.before.x,report.animatedAnchor.after.x,'Tail anchor follows animated head transform');
  }
 }
 await page.setViewportSize({width:1600,height:900});
 report.policyFixtures=await page.evaluate(()=>{
  const g=LSW.game,c=g.comic,p=g.player,foe=g.entities.find(f=>f!==p&&g.isFoe(p,f));const rows={};
  c.clear();const first=c.say(p,'Ordinary talk',{tone:'talk'});const blocked=c.say(foe,'Crowded chatter',{tone:'talk'});rows.concurrency={first:!!first,blocked:!blocked,count:c.items.filter(i=>i.speech).length};
  const warning=c.say(p,'Incoming!',{tone:'yell',category:'warning'});rows.warningPreempts=!!warning;
  c.clear();const oldVisible=foe.obj.visible;foe.obj.visible=false;rows.hiddenEnemy=c.say(foe,'Hidden enemy',{tone:'yell',allowOffscreen:true})===null;foe.obj.visible=oldVisible;
  c.clear();const old=foe.pos.clone();foe.pos.x=p.pos.x+500;rows.far=c.say(foe,'Far talk',{tone:'talk'})===null;foe.pos.copy(old);
  c.clear();const camera=g.world.camera,oldCam=camera.position.clone(),mouth=p.parts.head.getWorldPosition(p.pos.clone());camera.position.copy(mouth);camera.position.z+=20;camera.lookAt(mouth.x,mouth.y,mouth.z+100);camera.updateMatrixWorld(true);
  rows.behindPoint=c._speechPoint(p);rows.behind=c.say(p,'Behind you',{tone:'talk'})===null;
  const radio=c.say(p,'Radio check',{tone:'radio'});c.update(.016);rows.radio={admitted:!!radio,kind:radio?.kind,label:radio?.name?.textContent,noTail:!radio?.tail};camera.position.copy(oldCam);
  return rows;
 });
 assert.equal(report.policyFixtures.hiddenEnemy,true);assert.equal(report.policyFixtures.far,true);assert.equal(report.policyFixtures.concurrency.count,1);assert.equal(report.policyFixtures.warningPreempts,true);
 assert.equal(report.policyFixtures.radio.kind,'field');assert.equal(report.policyFixtures.radio.noTail,true);
 assert.equal(report.policyFixtures.behindPoint.behind,true);assert.equal(report.policyFixtures.behind,true);
 assert.deepEqual(errors,[]);
} catch(error) {report.failure=String(error);throw error;
} finally {report.errors=errors;await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report,null,2));
