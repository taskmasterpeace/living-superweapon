import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {startGameAudio,finishGameAudio} from './capture-game-audio.mjs';
import {captureProvenance} from './capture-provenance.mjs';
const hero=process.argv[2]||'rage',scenario=process.argv[3]||'combo';
const url=process.env.PW_TEST_URL||'http://127.0.0.1:5182/powerworld.html';
const out=`${process.env.PW_CAPTURE_ROOT||'artifacts/marketing/combat-pass-2026-09-12'}/02-${hero}-${scenario}${process.argv[4]?'-'+process.argv[4]:''}`;await mkdir(out,{recursive:true});
const sourceBefore=await captureProvenance();
const browser=await chromium.launch({headless:false}),ctx=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await ctx.newPage(),video=page.video();
const result={hero,scenario,kind:'Native practice selection, N training target, ordinary browser input. Passive target trial, not adversarial AI proof. Silent video.',errors:[],rows:[]};page.on('pageerror',e=>result.errors.push(e.message));let mx=720,my=450,locked=false;
result.url=url;result.resourceErrors=[];
page.on('response',response=>{if(response.status()>=400&&response.url().startsWith(new URL(url).origin))result.resourceErrors.push({url:response.url(),status:response.status()});});
try{
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await page.locator('#hSelect.on').waitFor();await page.keyboard.press('Escape');await page.locator('#pwRoster [data-id="'+hero+'"]').click();await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();await page.waitForFunction(()=>PW.game.running&&PW.game.time>.5,null,{timeout:90000});await page.mouse.click(mx,my,{button:'middle'});await page.keyboard.press('n');
 await page.evaluate(()=>{const g=PW.game,old=g.onHit;window.__hits=[];window.__releases=[];const release=g.melee.release;g.melee.release=function(f){window.__releases.push({time:g.time,who:f.id,carry:!!f._personCarry,grab:!!f.grabbing,remaining:f.grabT,version:g.input.cancelVersion,saved:f._personCarry?.cancelVersion,stack:new Error().stack});return release.call(this,f);};g.onHit=function(...args){window.__hits.push({time:g.time,target:args[0]?.id,amount:args[1],move:args[2]?.meleeMove,finisher:args[2]?.finisher,src:args[2]?.src?.id,index:args[2]?.src?.strikeIdx,velocity:args[0]?.vel.toArray(),targetPos:args[0]?.pos.toArray(),sourcePos:args[2]?.src?.pos.toArray()});return old.apply(this,args);};});
 if(process.argv.includes('--audio'))await startGameAudio(page);
 for(let i=0;i<65;i++){
  const s=await page.evaluate(()=>{const g=PW.game,p=g.player,v=g.entities.find(e=>e.isDummy&&e.alive);return {time:g.time,id:p.id,p:p.pos.toArray(),v:v?.pos.toArray(),hp:v?.hp,camera:g.world.camera.position.toArray(),yaw:g.world._lookYaw,pitch:g.world._lookPitch,sens:g.world._lookSens,grab:!!p.grabbing,carry:!!p._personCarry,state:p.mstate,airborne:p.airborne,family:p._meleeMotion?.family,idx:p.strikeIdx,faults:[...(g._errSeen||[])]};});result.rows.push(s);if(!s.v)break;
  if(process.argv.includes('--finisher-review')&&!result.finisherRecovery){
   const hit=await page.evaluate(()=>window.__hits.find(h=>h.finisher));
   if(hit){await page.keyboard.up('w');await page.keyboard.up('v');await page.screenshot({path:out+'/finisher-contact.png'});await page.waitForTimeout(600);const after=await page.evaluate(()=>{const p=PW.game.player,v=PW.game.entities.find(e=>e.isDummy&&e.alive);return {time:PW.game.time,sourcePos:p.pos.toArray(),targetPos:v?.pos.toArray(),sourceState:p.mstate,targetStagger:v?.staggerT};});result.finisherRecovery={hit,after};await page.screenshot({path:out+'/finisher-recovery.png'});break;}
  }
  const dx=s.v[0]-s.camera[0],dz=s.v[2]-s.camera[2],yaw=Math.atan2(dx,dz),pitch=Math.atan2(s.v[1]+5.6-s.camera[1],Math.hypot(dx,dz));if(!locked){mx-=Math.atan2(Math.sin(yaw-s.yaw),Math.cos(yaw-s.yaw))/s.sens;my+=(s.pitch-pitch)/s.sens;await page.mouse.move(mx,my);await page.keyboard.press('t');locked=await page.evaluate(()=>!!PW.game.hardLock);}
  const d=Math.hypot(s.p[0]-s.v[0],s.p[2]-s.v[2]);
  if(d>24)await page.keyboard.down('w');else await page.keyboard.up('w');
  if(scenario==='grab'){
   if(s.grab){
    if(process.argv[4]==='escape-timeout'){
     await page.keyboard.up('w');
     await page.evaluate(()=>{const m=PW.game.melee,original=m._breakFree;window.__escape=null;m._breakFree=function(holder){const victim=holder.grabbing,at=PW.game.time;const result=original.call(this,holder);window.__escape={at,holder:holder.id,victim:victim?.id,stillHeld:!!holder.grabbing,holderStagger:holder.staggerT,victimInvuln:victim?.invuln,victimAlive:victim?.alive};return result;};});
     await page.waitForFunction(()=>!!window.__escape,null,{timeout:12000});result.escape=await page.evaluate(()=>window.__escape);await page.screenshot({path:out+'/broke-free.png'});break;
    }
    await page.keyboard.down('w');await page.waitForTimeout(150);await page.keyboard.up('w');
    if(process.argv[4]?.startsWith('menu-carry')){
     await page.keyboard.press('i');await page.getByRole('dialog',{name:'Inventory',exact:true}).waitFor();await page.waitForTimeout(200);
     await page.getByRole('button',{name:'Return to game',exact:true}).click();await page.waitForTimeout(150);
     const retained=await page.evaluate(()=>!!PW.game.player._personCarry&&!!PW.game.player.grabbing);result.menuCarryRetained=retained;if(!retained)throw Error('Menu released carried victim');
    }
    await page.keyboard.press('f');await page.keyboard.down('Space');await page.waitForTimeout(600);await page.keyboard.up('Space');await page.keyboard.down('e');await page.waitForTimeout(450);await page.screenshot({path:out+'/holding.png'});await page.keyboard.up('e');await page.waitForTimeout(1800);break;}
   if(d>6)await page.keyboard.down('w');else {await page.keyboard.up('w');await page.keyboard.press('e');}
  }else if(d<30){if(process.argv[4]==='jump-profile'&&!result.jumped){await page.keyboard.down('Space');await page.waitForTimeout(120);await page.keyboard.up('Space');result.jumped=true;}await page.keyboard.down('v');await page.waitForTimeout(40);await page.keyboard.up('v');}
  if(i%12===0)await page.screenshot({path:out+`/frame-${i}.png`});await page.waitForTimeout(160);
 }
 if(process.argv.includes('--audio'))await finishGameAudio(page,out,writeFile);
 result.hits=await page.evaluate(()=>window.__hits);result.faults=await page.evaluate(()=>[...(PW.game._errSeen||[])]);result.passed=(result.escape?(!result.escape.stillHeld&&result.escape.victimAlive&&result.escape.holderStagger>0&&result.escape.victimInvuln>0):result.hits.some(h=>h.move))&&!result.errors.length&&!result.faults.length;
}catch(e){result.failure=String(e);process.exitCode=1;}
finally{await page.screenshot({path:out+'/final.png'}).catch(()=>{});result.releases=await page.evaluate(()=>window.__releases).catch(()=>[]);const sourceAfter=await captureProvenance();result.sourceStable=sourceBefore.sourceDigest===sourceAfter.sourceDigest;if(!result.sourceStable||result.resourceErrors.length){result.passed=false;process.exitCode=1;}await writeFile(out+'/provenance.json',JSON.stringify({sourceBefore,sourceAfter},null,2));await writeFile(out+'/result.json',JSON.stringify(result,null,2));await ctx.close();await video.saveAs(out+'/native-combat.webm');await browser.close();console.log(JSON.stringify({hero,scenario,passed:result.passed,failure:result.failure,errors:result.errors,resourceErrors:result.resourceErrors,sourceStable:result.sourceStable,hits:result.hits,faults:result.faults}));}
