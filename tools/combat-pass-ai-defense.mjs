import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {meleeApproach} from '../src/data/melee-approaches.js';
import {captureProvenance} from './capture-provenance.mjs';
const out=(process.env.PW_CAPTURE_ROOT||'artifacts/marketing/combat-pass-2026-09-12')+'/ai-defense-'+(process.argv[2]||'ready');await mkdir(out,{recursive:true});
const sourceBefore=await captureProvenance();await writeFile(out+'/source-before.json',JSON.stringify(sourceBefore,null,2));
const scenario=process.argv[3]||'grab',opponent=process.argv.find(a=>a.startsWith('--opponent='))?.split('=')[1]||(process.argv.includes('--air')?'kano':'webline');
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out}}),page=await context.newPage(),errors=[],rows=[];
page.setDefaultTimeout(15000);
page.on('pageerror',e=>errors.push(e.message));
let mx=720,my=450,failure=null,lockRequested=false,lastDodge=-10;
const read=()=>page.evaluate(()=>{const g=window.PW.game,p=g.player,v=g.entities.find(e=>e!==p&&e.team!==p.team&&e.alive);return {time:g.time,camera:g.world.camera.position.toArray(),lock:g.hardLock?.id??null,yaw:g.world._lookYaw,pitch:g.world._lookPitch,sens:g.world._lookSens,p:{id:p.id,hp:p.hp,ki:p.ki,evadeCd:p.evadeCd,invuln:p.invuln,velocity:p.vel.toArray(),pos:p.pos.toArray(),aim:p.aim3.toArray(),strike:p.mstate,charge:p.meleeCharge,cd:p.strikeCd,stagger:p.staggerT,alive:p.alive,grab:p.grabbing?.id,grabState:p.grabState,carry:!!p._personCarry,melee:p._tabMelee,combo:p.combo},v:v&&{id:v.id,hp:v.hp,pos:v.pos.toArray(),velocity:v.vel.toArray(),strike:v.mstate,approach:v._meleeMotion&&{family:v._meleeMotion.family,distance:v._meleeMotion.approachDistance,origin:v._meleeMotion.approachOrigin?.toArray()},creditedTo:v.lastHitBy?.id,impact:v._personThrow?.impacted,grabbed:!!v.grabbedBy},projectiles:g.projectiles.list.length};});
try{
 await page.goto(process.env.PW_TEST_URL||'http://127.0.0.1:5182/powerworld.html',{waitUntil:'domcontentloaded',timeout:90000});await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1500);
 await page.keyboard.press('Escape');await page.locator('[data-pick="foe"]').click();await page.locator('#pwRoster [data-id="'+opponent+'"]').click();await page.locator('#pwAi [data-ai="0.85"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>window.PW?.game?.running&&window.PW.game.time>.5,{}, {timeout:90000});await page.mouse.click(mx,my,{button:'middle'});
 if(process.argv.includes('--audio'))await page.evaluate(()=>{
  const a=PW.game.audio,destination=a.ctx.createMediaStreamDestination(),probe=a.ctx.createAnalyser();probe.fftSize=2048;
  a.master.connect(destination);a.master.connect(probe);
  const recorder=new MediaRecorder(destination.stream),chunks=[],audit=window.__audioAudit={startedAt:PW.game.time,state:a.ctx.state,peak:0,samples:0};
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  const timer=setInterval(()=>{const values=new Float32Array(probe.fftSize);probe.getFloatTimeDomainData(values);for(const x of values)audit.peak=Math.max(audit.peak,Math.abs(x));audit.samples+=values.length;},30);
  window.__stopAudio=()=>new Promise(resolve=>{recorder.onstop=async()=>{clearInterval(timer);a.master.disconnect(destination);a.master.disconnect(probe);const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));resolve({audit:{...audit,endedAt:PW.game.time},base64:btoa(s)});};recorder.stop();});recorder.start();
 });
 await page.evaluate(()=>{
  const g=window.PW.game,events=window.__carryEvents=[];
  for(const f of g.entities){const original=f.takeDamage;f.takeDamage=function(amount,opts={}){
   const before={time:g.time,kind:'damage',id:this.id,amount,src:opts.src?.id,move:opts.meleeMove,slam:opts.slam,hp:this.hp,ki:this.ki,guard:this.guarding,meter:this.guardMeter,invuln:this.invuln,phase:this.phase,airborne:this.airborne,flying:this.flying,grabbed:!!this.grabbedBy,grabState:this.grabState,launch:this.launchT,pos:this.pos.toArray(),velocity:this.vel.toArray()};
   const result=original.call(this,amount,opts);events.push({...before,sourceStrikeIndex:opts.src?.strikeIdx,sourceMomentum:opts.src?._momSpd,sourcePowerBuff:opts.src?.powerBuff,sourceStrength:opts.src?.def.strength,sourceLevel:opts.src?.level,sourceAirborne:opts.src?.airborne,sourceFlying:opts.src?.flying,sourcePos:opts.src?.pos.toArray(),afterVelocity:this.vel.toArray(),afterHp:this.hp,afterKi:this.ki,afterGuard:this.guarding,afterGrabState:this.grabState,guardBreak:this.guardBreakT,credited:this.lastHitBy?.id});return result;
  };}
  const original=g.onSlam;g.onSlam=function(f,damage,kind,...rest){events.push({time:g.time,kind:'slam',id:f.id,damage,surface:kind,pos:f.pos.toArray(),invuln:f.invuln,credited:f.lastHitBy?.id});return original.call(this,f,damage,kind,...rest);};
 });
 if(process.argv.includes('--air')){await page.keyboard.press('f');await page.keyboard.down('Space');await page.waitForTimeout(800);await page.keyboard.up('Space');}
 for(let i=0;i<150;i++){
  const s=await read();rows.push(s);if(!s.p.alive||!s.v)break;
  if(process.argv.includes('--altitude-floor')){
   if(s.p.pos[1]<35)await page.keyboard.down('Space');else await page.keyboard.up('Space');
  }
  const dx=s.v.pos[0]-s.p.pos[0],dz=s.v.pos[2]-s.p.pos[2],distance=Math.hypot(dx,dz),cx=s.v.pos[0]-s.camera[0],cz=s.v.pos[2]-s.camera[2],yaw=Math.atan2(cx,cz),pitch=Math.atan2(s.v.pos[1]+5-s.camera[1],Math.hypot(cx,cz)),delta=Math.atan2(Math.sin(yaw-s.yaw),Math.cos(yaw-s.yaw));
  lockRequested=!!s.lock;
  if(!lockRequested){mx-=delta/s.sens;my+=(s.pitch-pitch)/s.sens;await page.mouse.move(mx,my);}
  if(distance<65&&!lockRequested){await page.keyboard.press('t');await page.waitForTimeout(35);lockRequested=!!(await read()).lock;}
  if(scenario==='combo'&&process.argv.includes('--hover-entry')&&s.time<4.5){
   await page.keyboard.up('w');await page.keyboard.up('ShiftLeft');await page.keyboard.down('q');await page.waitForTimeout(60);continue;
  }
  if(scenario==='interrupt'&&lockRequested&&distance<28){
   await page.keyboard.up('w');await page.keyboard.up('ShiftLeft');
   if(s.v.strike==='startup'){
    await page.keyboard.up('q');await page.keyboard.down('e');await page.waitForTimeout(40);await page.keyboard.up('e');await page.waitForTimeout(160);
    rows.push({...await read(),phase:'grab-counter-attempt'});
    if(await page.evaluate(()=>window.__carryEvents.some(e=>e.grabState==='startup'&&e.afterGrabState===null&&e.afterHp<e.hp))){await page.screenshot({path:out+'/grab-interrupted.png'});break;}
   }else await page.keyboard.down('q');
   await page.waitForTimeout(25);continue;
  }
  if(scenario==='dodge'&&lockRequested&&distance<28){
   await page.keyboard.up('w');await page.keyboard.up('ShiftLeft');
   if(s.v.strike==='startup'&&s.time-lastDodge>1.5){
    lastDodge=s.time;await page.keyboard.down('d');await page.waitForTimeout(20);await page.keyboard.press('z');
    rows.push({...await read(),phase:'evade-input'});await page.waitForTimeout(450);await page.keyboard.up('d');
    rows.push({...await read(),phase:'evade-result'});await page.screenshot({path:out+'/evade-'+i+'.png'});
   }
   await page.waitForTimeout(35);continue;
  }
  if(scenario==='guard'&&lockRequested&&distance<(process.argv.includes('--air')?120:28)){
   await page.keyboard.up('w');await page.keyboard.up('ShiftLeft');await page.keyboard.down('q');
   if(i%30===0)await page.screenshot({path:out+'/guard-'+i+'.png'});await page.waitForTimeout(60);continue;
  }
  if(scenario==='guard')await page.keyboard.up('q');
  if(distance>(scenario==='combo'?3:6))await page.keyboard.down('w');else await page.keyboard.up('w');
  if(distance>20)await page.keyboard.down('ShiftLeft');else await page.keyboard.up('ShiftLeft');
  if(scenario==='combo'){
   const approach=await page.evaluate(()=>({def:{id:PW.game.player.def.id,flightTier:PW.game.player.def.flightTier,meleeApproach:PW.game.player.def.meleeApproach},airborne:PW.game.player.airborne}));
   const attackRange=meleeApproach(approach.def,approach.airborne).range;
   const strikeDistance=Math.hypot(distance,s.v.pos[1]-s.p.pos[1]);
   if(strikeDistance<attackRange){await page.keyboard.up('w');await page.keyboard.up('q');await page.keyboard.down('v');await page.waitForTimeout(40);await page.keyboard.up('v');}else if(process.argv.includes('--rush')){
    await page.keyboard.up('q');
    if(!rows.some(r=>r.phase==='rush-start')){
     await page.keyboard.up('ShiftLeft');await page.keyboard.press('ShiftLeft');await page.waitForTimeout(60);await page.keyboard.down('ShiftLeft');rows.push({...await read(),phase:'rush-start'});
    }
   }else await page.keyboard.down('q');
   if(i%20===0)await page.screenshot({path:out+'/combo-'+i+'.png'});
  }else if(s.p.grab){
   await page.keyboard.up('w');if(!s.p.carry){await page.keyboard.down('w');await page.waitForTimeout(100);await page.keyboard.up('w');}await page.waitForTimeout(60);rows.push({...await read(),phase:'lift'});
   await page.keyboard.down('Space');await page.waitForTimeout(700);await page.keyboard.up('Space');
   rows.push({...await read(),phase:'airborne'});await page.keyboard.down('e');await page.waitForTimeout(450);rows.push({...await read(),phase:'whirl'});await page.screenshot({path:out+'/carry-whirl.png'});await page.keyboard.up('e');await page.waitForTimeout(30);rows.push({...await read(),phase:'release'});await page.waitForTimeout(1500);rows.push({...await read(),phase:'impact'});break;
  }else if(distance<8&&!s.p.strike&&s.p.cd<=0&&!s.p.grabState){
   await page.keyboard.down('e');await page.waitForTimeout(40);await page.keyboard.up('e');
  }
  if(i%60===0)await page.screenshot({path:out+'/combat-'+i+'.png'});await page.waitForTimeout(60);
 }
}catch(e){failure=e.message;}finally{
 await page.keyboard.up('w').catch(()=>{});await page.keyboard.up('q').catch(()=>{});await page.keyboard.up('ShiftLeft').catch(()=>{});await page.screenshot({path:out+'/final.png'}).catch(()=>{});
 await page.keyboard.up('Space').catch(()=>{});
 const events=await page.evaluate(()=>window.__carryEvents||[]).catch(()=>[]);
 const sourceAfter=await captureProvenance();await writeFile(out+'/source-after.json',JSON.stringify(sourceAfter,null,2));
 if(sourceBefore.sourceDigest!==sourceAfter.sourceDigest)failure=([failure,'Runtime source changed during capture; review provenance before using this evidence.'].filter(Boolean).join(' '));
 if(process.argv.includes('--audio')){const capture=await page.evaluate(()=>window.__stopAudio?.()).catch(()=>null);if(capture){await writeFile(out+'/native-combat-audio.webm',Buffer.from(capture.base64,'base64'));await writeFile(out+'/audio-audit.json',JSON.stringify(capture.audit,null,2));}}
 await writeFile(out+'/result.json',JSON.stringify({scenario,opponent,kind:'Normal menu sparring; browser mouse/keyboard only. Read-only actor telemetry guides steering; pass-through damage/slam observers preserve arguments and returns. No gameplay state overrides.',rows,events,errors,failure},null,2));await context.close();await browser.close();
}
if(failure||errors.length)throw Error(failure||errors.join('\n'));
