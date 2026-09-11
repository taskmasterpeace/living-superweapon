import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180',out='artifacts/frontline-combat-native';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),context=await browser.newContext({viewport:{width:1600,height:900},recordVideo:{dir:out,size:{width:1600,height:900}}});
const page=await context.newPage(),errors=[],result={};page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',two:false,ai:.1})));
 await page.goto(base+'/powerworld.html');await page.waitForFunction(()=>window.PW?.game,{},{polling:100});
 await page.locator('#pwGo').click();await page.waitForFunction(()=>LSW.game.running&&LSW.game.player?.def.id==='vega'&&LSW.game.pwStage?.frontlineReady,{},{polling:100,timeout:60000});
 // Isolate this animation/contact witness before ascent, not after the opponent
 // has already fired. This test is not a claim of beating an active opponent.
 await page.evaluate(()=>{for(const f of LSW.game.entities)if(f!==LSW.game.player)f.ai=null;});
 await page.mouse.click(800,450,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement,{},{polling:100});
 await page.keyboard.down('Space');await page.waitForFunction(()=>LSW.game.player.pos.y>75,{},{polling:100});await page.keyboard.up('Space');
 await page.waitForFunction(()=>Math.abs(LSW.game.player.vel.y)<1);
 // Deterministic opponent placement only. Player input, camera, animation,
 // physics, hit processing, news capture and time remain the live runtime.
 result.setup=await page.evaluate(()=>{
  const g=LSW.game,a=g.player,b=g.entities.find(f=>f!==a&&!f.isDummy);b.ai=null;b.flying=true;b.gait='airborne';b.vel.set(0,0,0);b.invuln=0;b.hp=b.maxHp=1000;
  a.level=10;a.ki=a.maxKi;a.invuln=0;
  if(!a.alive||a.hp<=0||a.staggerT>0||a.stunT>0)throw Error('Invalid contact fixture: player already interrupted');
  const yaw=g.world._lookYaw;b.pos.set(a.pos.x+Math.sin(yaw)*13,a.pos.y,a.pos.z+Math.cos(yaw)*13);b.faceDir(a.pos.x-b.pos.x,a.pos.z-b.pos.z);
  window.frontlineVictim=b;window.frontlineFrames=[];const captureStart=g.time;
  window.frontlineNewsErrors=[];const renderPOV=g.news._renderPOV.bind(g.news);g.news._renderPOV=(...args)=>{try{return renderPOV(...args);}catch(error){window.frontlineNewsErrors.push(error.stack||error.message);throw error;}};
  window.frontlineEncodeMs=[];const encoder=g.news._encoder,encode=encoder.capture.bind(encoder);
  encoder.capture=(...args)=>{const before=new Set(encoder.pending),start=performance.now(),accepted=encode(...args);for(const pending of encoder.pending)if(!before.has(pending))pending.then(()=>window.frontlineEncodeMs.push(performance.now()-start));return accepted;};
  const capture=()=>{const a=g.player,b=window.frontlineVictim,p=a.parts; p.g.updateMatrixWorld(true);const T=LSW.THREE,rec=document.querySelector('#hFieldRec');
   window.frontlineFrames.push({time:g.time,pos:a.pos.toArray(),target:b.pos.toArray(),hp:b.hp,playerHp:a.hp,downed:a.downedT||0,stagger:a.staggerT||0,pose:a._abilityMeleePose?.elapsed??null,active:a.slots.e.t||0,fist:p.armR.children[2].getWorldPosition(new T.Vector3()).toArray(),off:p.armL.children[2].getWorldPosition(new T.Vector3()).toArray(),pitch:p.g.rotation.x,ema:g.world._ema,news:g.news.rec?.tag||null,newsFrames:g.news.rec?.frames.length??0,pending:g.news._encoder?.pending.size??0,recIndicator:rec?.dataset.state,recIndicatorText:rec?.querySelector('span')?.textContent,recIndicatorVisible:!!rec&&!rec.hidden&&rec.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})});
   if(g.time-captureStart<5)requestAnimationFrame(capture);
  };requestAnimationFrame(capture);return {player:a.def.id,position:a.pos.toArray(),target:b.pos.toArray(),mode:g.modeId};
 });
 await page.screenshot({path:`${out}/01-air-approach.png`});
 await page.keyboard.down('w');
 await page.waitForFunction(()=>{const g=LSW.game,s=g.player.slots.e;return g.coneFoe(g.player,s.def.range||11,s.def.arc||.7)===window.frontlineVictim;},{},{polling:'raf',timeout:3000});
 await page.keyboard.down('e');
 await page.waitForTimeout(105);await page.screenshot({path:`${out}/02-rush-extension.png`});await page.keyboard.up('e');
 await page.waitForTimeout(180);await page.keyboard.up('w');await page.screenshot({path:`${out}/03-contact-recovery.png`});
 await page.waitForTimeout(3800);
 result.frames=await page.evaluate(()=>window.frontlineFrames);
 result.news=await page.evaluate(async()=>{const n=LSW.game.news;await n.flush();return {enabled:n.enabled,clips:n.clips.map(c=>({tag:c.tag,frames:c.frames.filter(Boolean).length,shots:c.shots})),preroll:n._preroll.length,ema:LSW.game.world._ema,renderErrors:window.frontlineNewsErrors,encoder:{types:n._encoder.pool.map(c=>c.constructor.name),milliseconds:window.frontlineEncodeMs}};});
 assert.ok(result.frames.some(f=>f.pose!==null),'Native E never activated the ability pose');
 assert.ok(result.frames.some(f=>f.hp<1000),'Native moving Rush Combo did not hit the placed foe');
 assert.ok(result.frames.some(f=>f.pose!==null&&Math.hypot(...f.fist.map((v,i)=>v-f.off[i]))>2),'No separated fists in native frames');
 assert.ok(result.frames.at(-1).pose===null,'Recovery failed to retire');
 assert.ok(result.news.clips.some(c=>c.tag==='bighit'&&c.frames>=6),'Actual rush impact did not produce recorded news footage');
 assert.ok(result.frames.some(f=>f.news==='bighit'&&f.recIndicator==='recording'&&f.recIndicatorVisible&&f.recIndicatorText==='REC'),'The native field camera indicator must visibly acknowledge real recording');
 assert.deepEqual(result.news.renderErrors,[],'Native news POV capture must not swallow rendering errors');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({setup:result.setup,frames:result.frames.length,minimumHp:Math.min(...result.frames.map(f=>f.hp)),news:result.news}));
}catch(e){result.failure=e.message;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw e;}
finally{await writeFile(`${out}/results.json`,JSON.stringify({...result,errors},null,2));await context.close();await browser.close();}
