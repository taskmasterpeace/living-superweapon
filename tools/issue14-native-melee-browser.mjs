import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/issue14-native-melee-'+(process.argv[2]||'ready');await mkdir(out,{recursive:true});
const scenario=process.argv[3]||'grab',opponent=scenario==='guard'?'kano':'ripclaw';
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out}}),page=await context.newPage(),errors=[],rows=[];
page.setDefaultTimeout(15000);
page.on('pageerror',e=>errors.push(e.message));
let mx=720,my=450,failure=null,lockRequested=false;
const read=()=>page.evaluate(()=>{const g=window.PW.game,p=g.player,v=g.entities.find(e=>e!==p&&e.team!==p.team&&e.alive);return {time:g.time,camera:g.world.camera.position.toArray(),lock:g.hardLock?.id??null,yaw:g.world._lookYaw,pitch:g.world._lookPitch,sens:g.world._lookSens,p:{id:p.id,hp:p.hp,ki:p.ki,pos:p.pos.toArray(),aim:p.aim3.toArray(),strike:p.mstate,charge:p.meleeCharge,cd:p.strikeCd,stagger:p.staggerT,alive:p.alive,grab:p.grabbing?.id,grabState:p.grabState,carry:!!p._personCarry,melee:p._tabMelee,combo:p.combo},v:v&&{id:v.id,hp:v.hp,pos:v.pos.toArray(),velocity:v.vel.toArray(),creditedTo:v.lastHitBy?.id,impact:v._personThrow?.impacted,grabbed:!!v.grabbedBy},projectiles:g.projectiles.list.length};});
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1500);
 await page.keyboard.press('Escape');await page.locator('[data-pick="foe"]').click();await page.locator('#pwRoster [data-id="'+opponent+'"]').click();await page.locator('#pwAi [data-ai="0.85"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>window.PW?.game?.running&&window.PW.game.time>.5,{}, {timeout:90000});await page.mouse.click(mx,my);await page.waitForFunction(()=>!!document.pointerLockElement);await page.keyboard.press('Tab');await page.waitForFunction(()=>window.PW.game.player._tabMelee===true);
 await page.evaluate(()=>{
  const g=window.PW.game,events=window.__carryEvents=[];
  for(const f of g.entities){const original=f.takeDamage;f.takeDamage=function(amount,opts={}){
   const before={time:g.time,kind:'damage',id:this.id,amount,src:opts.src?.id,move:opts.meleeMove,slam:opts.slam,hp:this.hp,ki:this.ki,guard:this.guarding,meter:this.guardMeter,invuln:this.invuln,phase:this.phase,grabbed:!!this.grabbedBy,launch:this.launchT,pos:this.pos.toArray(),velocity:this.vel.toArray()};
   const result=original.call(this,amount,opts);events.push({...before,sourceStrikeIndex:opts.src?.strikeIdx,afterVelocity:this.vel.toArray(),afterHp:this.hp,afterKi:this.ki,afterGuard:this.guarding,guardBreak:this.guardBreakT,credited:this.lastHitBy?.id});return result;
  };}
  const original=g.onSlam;g.onSlam=function(f,damage,kind,...rest){events.push({time:g.time,kind:'slam',id:f.id,damage,surface:kind,pos:f.pos.toArray(),invuln:f.invuln,credited:f.lastHitBy?.id});return original.call(this,f,damage,kind,...rest);};
 });
 for(let i=0;i<240;i++){
  const s=await read();rows.push(s);if(!s.p.alive||!s.v)break;
  const dx=s.v.pos[0]-s.p.pos[0],dz=s.v.pos[2]-s.p.pos[2],distance=Math.hypot(dx,dz),cx=s.v.pos[0]-s.camera[0],cz=s.v.pos[2]-s.camera[2],yaw=Math.atan2(cx,cz),pitch=Math.atan2(s.v.pos[1]+5-s.camera[1],Math.hypot(cx,cz)),delta=Math.atan2(Math.sin(yaw-s.yaw),Math.cos(yaw-s.yaw));
  if(!lockRequested){mx-=delta/s.sens;my+=(s.pitch-pitch)/s.sens;await page.mouse.move(mx,my);}
  if(distance<65&&!lockRequested&&scenario!=='combo'){await page.keyboard.press('t');lockRequested=true;}
  if(scenario==='guard'&&lockRequested){
   await page.keyboard.up('w');await page.keyboard.up('ShiftLeft');await page.keyboard.down('c');
   if(i%30===0)await page.screenshot({path:out+'/guard-'+i+'.png'});await page.waitForTimeout(60);continue;
  }
  if(distance>(scenario==='combo'?3:6))await page.keyboard.down('w');else await page.keyboard.up('w');
  if(distance>20)await page.keyboard.down('ShiftLeft');else await page.keyboard.up('ShiftLeft');
  if(scenario==='combo'){
   if(distance<10){await page.mouse.down({button:'left'});await page.waitForTimeout(40);await page.mouse.up({button:'left'});}
   if(i%20===0)await page.screenshot({path:out+'/combo-'+i+'.png'});
  }else if(s.p.grab){
   await page.keyboard.up('w');if(!s.p.carry)await page.keyboard.press('j');await page.waitForTimeout(60);rows.push({...await read(),phase:'lift'});
   await page.keyboard.down('Space');await page.waitForTimeout(700);await page.keyboard.up('Space');
   rows.push({...await read(),phase:'airborne'});await page.mouse.down({button:'right'});await page.waitForTimeout(450);rows.push({...await read(),phase:'whirl'});await page.screenshot({path:out+'/carry-whirl.png'});await page.mouse.up({button:'right'});await page.waitForTimeout(30);rows.push({...await read(),phase:'release'});await page.waitForTimeout(1500);rows.push({...await read(),phase:'impact'});break;
  }else if(distance<8&&!s.p.strike&&s.p.cd<=0&&!s.p.grabState){
   await page.mouse.down({button:'right'});await page.waitForTimeout(40);await page.mouse.up({button:'right'});
  }
  if(i%60===0)await page.screenshot({path:out+'/combat-'+i+'.png'});await page.waitForTimeout(60);
 }
}catch(e){failure=e.message;}finally{
 await page.keyboard.up('w').catch(()=>{});await page.keyboard.up('c').catch(()=>{});await page.keyboard.up('ShiftLeft').catch(()=>{});await page.screenshot({path:out+'/final.png'}).catch(()=>{});
 const events=await page.evaluate(()=>window.__carryEvents||[]).catch(()=>[]);
 await writeFile(out+'/result.json',JSON.stringify({scenario,opponent,kind:'Normal menu sparring; browser mouse/keyboard only. Read-only actor telemetry guides steering; pass-through damage/slam observers preserve arguments and returns. No gameplay state overrides.',rows,events,errors,failure},null,2));await context.close();await browser.close();
}
if(failure||errors.length)throw Error(failure||errors.join('\n'));
