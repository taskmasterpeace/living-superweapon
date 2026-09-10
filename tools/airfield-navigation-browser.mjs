import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

// A native-input witness: no player/vehicle teleports, health overrides,
// scripted steering-state writes, manual simulation stepping or frozen images.
const out=process.argv.find(a=>a.startsWith('--output='))?.slice(9)||'artifacts/airfield-navigation';await mkdir(out,{recursive:true});
const checkAim=process.argv.includes('--check-aim');
const jetOnly=process.argv.includes('--jet-only');
const quickTap=process.argv.includes('--quick-tap');
const browser=await chromium.launch({channel:'chromium',headless:false});
const page=await browser.newPage({viewport:{width:1672,height:941},recordVideo:{dir:`${out}/video`,size:{width:1672,height:941}}}),errors=[],trajectory=[];
const hero=process.env.AIRFIELD_HERO||'sarge',encounter=process.env.AIRFIELD_ENCOUNTER||'practice';
const result={kind:`Native keyboard navigation from normal spawn through ${encounter==='practice'?'the user-facing Free practice encounter (no hostile spawns)':'Clone Recovery (guard held during initial approach only)'}; no actor position, health, AI or simulation overrides`,hero,encounter,steps:[],screenshots:[]};
page.on('pageerror',e=>errors.push(e.message));
let held=new Set();
async function keys(next=[]){const target=new Set(next);for(const key of held)if(!target.has(key))await page.keyboard.up(key);for(const key of target)if(!held.has(key))await page.keyboard.down(key);held=target;}
async function read(){return page.evaluate(()=>{const g=PW.game,p=g.player;return {pos:p.pos.toArray(),alive:p.alive,hp:p.hp,aim:[p.aim3.x,p.aim3.z],yaw:g.world._lookYaw,scout:!!p._scoutVehicle,aircraft:p._aircraftVehicle?.kind,paused:g.paused,running:g.running};});}
async function walkTo(x,z,{tolerance=4.5,timeout=25000,label='waypoint',guard=false}={}){
 const started=Date.now();let best=Infinity,lastProgress=Date.now();
 while(Date.now()-started<timeout){
  const s=await read();assert.ok(s.alive,`${label}: player survived normal navigation`);assert.ok(!s.scout&&!s.aircraft,`${label}: on foot`);
  const dx=x-s.pos[0],dz=z-s.pos[2],d=Math.hypot(dx,dz);trajectory.push({at:Date.now(),label,pos:s.pos});
  if(d<tolerance){await keys();await page.waitForTimeout(250);result.steps.push({label,pos:(await read()).pos});return;}
  if(d<best-1){best=d;lastProgress=Date.now();}if(Date.now()-lastProgress>4500)throw Error(`${label}: blocked at ${s.pos}, ${d.toFixed(1)}u from destination`);
  const length=Math.hypot(...s.aim)||1,fx=s.aim[0]/length,fz=s.aim[1]/length,forward=dx*fx+dz*fz,right=-dx*fz+dz*fx;
  const next=guard?['KeyC']:[];if(Math.abs(forward)>2.5)next.push(forward>0?'KeyW':'KeyS');if(Math.abs(right)>2.5)next.push(right>0?'KeyD':'KeyA');
  await keys(next);await page.waitForTimeout(120);
 }throw Error(`${label}: navigation timed out`);
}
async function shot(name){const path=`${out}/${name}.png`;await page.screenshot({path});result.screenshots.push(path);}
async function auditAim(label){
 const row=await page.evaluate(()=>{const g=PW.game,a=g.player._aircraftVehicle,aim=a?.combat?.pilotAim(),el=document.getElementById('hCross'),rect=el.getBoundingClientRect(),s={};
  if(!aim)return null;g.world.screenPosOf(aim.point.x,aim.point.y,aim.point.z,s);return {kind:a.kind,parked:a.parked,shots:a.combat.shots,point:aim.point.toArray(),velocity:aim.velocity.toArray(),mode:el.dataset.aimMode,visible:getComputedStyle(el).visibility!=='hidden',error:Math.hypot(rect.x-s.x,rect.y-s.y)};});
 assert.ok(row?.visible&&row.mode==='aircraft'&&row.error<1.5,`${label}: actual cannon marker follows ballistic path`);(result.aimChecks??=[]).push({label,...row});
 return row;
}
try{
 await page.goto(`http://127.0.0.1:5180/powerworld.html?hero=${hero}`);
 await page.locator(`[data-encounter="${encounter}"]`).click({timeout:5000});await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&PW.game.pwStage.aircraft?.ready&&PW.game.pwStage.convoy?.ready,null,{timeout:60000});
 await page.evaluate(()=>{
  window.navigationFaults=[];window.vehicleDamageAudit=[];const g=PW.game,original=g.reportError.bind(g);g.reportError=(e,c)=>{navigationFaults.push(e.stack);original(e,c);};
  const damage=g.damageBlock.bind(g);g.damageBlock=(c,...args)=>{if(c.frontlineVehicle)vehicleDamageAudit.push({time:g.time,kind:'damage',hp:c.hp,amount:args[0],stack:new Error().stack});return damage(c,...args);};
  const convoy=g.pwStage.convoy,destroy=convoy.destroy.bind(convoy);convoy.destroy=(v,src)=>{vehicleDamageAudit.push({time:g.time,kind:'destroy',hp:v.cover.hp,source:src?.name||src?.def?.id,stack:new Error().stack});return destroy(v,src);};
 });
 result.spawn=await read();
 if(encounter==='practice'){
  result.practiceState=await page.evaluate(()=>{const g=PW.game;return {practice:g.ms.practice,hostileFighters:g.entities.filter(f=>f.alive&&f.team!==g.player.team).length,hasCloneRecovery:!!g.ms.frontline};});
  assert.equal(result.practiceState.practice,true);assert.equal(result.practiceState.hostileFighters,0);assert.equal(result.practiceState.hasCloneRecovery,false);
 }
 result.inventory=await page.evaluate(()=>{const g=PW.game;return {scouts:g.pwStage.convoy.vehicles.map(v=>({x:v.cover.x,z:v.cover.z,hx:v.cover.hx,hz:v.cover.hz})),aircraft:g.pwStage.aircraft.actors.filter(a=>a.pilotable).map(a=>({kind:a.kind,pos:a.wrapper.position.toArray(),radius:a.bodyRadius,yaw:a.yaw})),arena:g.world.ARENA};});
 assert.equal(result.inventory.aircraft.length,2,'Helicopter and jet both have physical parking spots');
 result.runwayAudit=await page.evaluate(()=>{
  const g=PW.game,a=g.pwStage.aircraft.actors.find(a=>a.pilotable&&a.kind==='jet'),r=a.bodyRadius;let nearest={clearance:Infinity},maxGrade=0;
  for(let d=0;d<=350;d+=5){const x=a.wrapper.position.x+Math.sin(a.yaw)*d,z=a.wrapper.position.z+Math.cos(a.yaw)*d;
   for(const c of g.world.cover){if(c===a.combat?.cover||c.hp<=0)continue;const dx=Math.max(0,Math.abs(x-c.x)-(c.hx??c.r??0)),dz=Math.max(0,Math.abs(z-c.z)-(c.hz??c.r??0)),clearance=Math.hypot(dx,dz)-r;if(clearance<nearest.clearance)nearest={clearance,at:[x,z],cover:c.mesh?.name||c.frontlineBuilding||'native-cover',box:[c.x,c.z,c.hx,c.hz,c.bottom,c.top]};}
   const center=g.world.heightAt(x,z);for(const side of [-1,1])maxGrade=Math.max(maxGrade,Math.abs(g.world.heightAt(x+r*side,z)-center));
  }
  return {radius:r,start:a.wrapper.position.toArray(),yaw:a.yaw,nearest,maxSideHeightDifference:maxGrade,northCenterLimit:g.world.ARENA-r};
 });
 await shot('01-spawn');
 const heli=result.inventory.aircraft.find(a=>a.kind==='helicopter');
 if(!jetOnly){
 const scout=result.inventory.scouts[0];
 // Approach the near end, as a player can, instead of steering diagonally into
 // its corner while the waypoint controller waits for the far side-center.
 await walkTo(scout.x,scout.z-scout.hz-6,{label:'walk from normal spawn to scout front',guard:encounter==='frontline'});
 const beforeContact=await page.evaluate(()=>PW.game.pwStage.convoy.vehicles[0].cover.hp);
 await keys(encounter==='frontline'?['KeyW','KeyC']:['KeyW']);
 const minimumContactDistance=await page.evaluate(async()=>{const start=performance.now();let minimum=Infinity;while(performance.now()-start<900){await new Promise(requestAnimationFrame);const g=PW.game,p=g.player,c=g.pwStage.convoy.vehicles[0].cover;minimum=Math.min(minimum,Math.hypot(Math.max(0,Math.abs(p.pos.x-c.x)-c.hx),Math.max(0,Math.abs(p.pos.z-c.z)-c.hz)));}return minimum;});
 await keys();await page.waitForTimeout(180);
 result.bodyContact=await page.evaluate(()=>{const g=PW.game,p=g.player,v=g.pwStage.convoy.vehicles[0],c=v.cover;return {hp:c.hp,destroyed:v.destroyed,pos:p.pos.toArray(),hull:[c.x,c.z,c.hx,c.hz],distance:Math.hypot(Math.max(0,Math.abs(p.pos.x-c.x)-c.hx),Math.max(0,Math.abs(p.pos.z-c.z)-c.hz)),radius:p.radius};});
 result.bodyContact.minimumContactDistance=minimumContactDistance;
 if(encounter==='practice'){assert.equal(result.bodyContact.hp,beforeContact,'Ordinary walking contact must not damage scout');assert.ok(minimumContactDistance<=result.bodyContact.radius+.05,'Witness must actually reach hull contact before its normal bounce');}
 await shot('02-scout-access');
 result.scoutAdmission=await page.evaluate(()=>{
  const g=PW.game,p=g.player,d=g.pwStage.convoy.driving,v=g.pwStage.convoy.vehicles[0],c=v.cover,blockers=[];
  const dx=c.x-p.pos.x,dz=c.z-p.pos.z,n=Math.ceil(Math.hypot(dx,dz)),r=p.radius||2;
  for(let i=0;i<=n;i++){
   const x=p.pos.x+dx*i/n,z=p.pos.z+dz*i/n;
   for(const b of g.world.cover){if(b===c||b.hp<=0||p.pos.y+8<(b.bottom??0)||p.pos.y>(b.top??b.h??Infinity))continue;
    const bx=Math.max(0,Math.abs(x-b.x)-(b.hx??b.r??0)),bz=Math.max(0,Math.abs(z-b.z)-(b.hz??b.r??0));
    if(bx*bx+bz*bz<r*r&&!blockers.some(a=>a.index===g.world.cover.indexOf(b)))blockers.push({index:g.world.cover.indexOf(b),name:b.mesh?.name,x:b.x,z:b.z,hx:b.hx,hz:b.hz,bottom:b.bottom,top:b.top});
   }
  }
  return {flight:p.flightTier,naturalFlight:p.def.flightTier,flying:p.flying,stagger:p.staggerT,frozen:p.frozenT,grabbed:!!p.grabbedBy,ground:v.ground,playerY:p.pos.y,destroyed:v.destroyed,occupied:!!v.occupant,accessClear:d._accessClear(p,v),blockers,prompt:document.getElementById('vehicleControls')?.textContent};
 });
 await page.keyboard.press('KeyJ');await page.waitForFunction(()=>!!PW.game.player._scoutVehicle,null,{timeout:4000});
 const driveStart=await read();await keys(['KeyW']);await page.waitForTimeout(1400);await keys(['Space']);await page.waitForTimeout(1200);await keys();
 const driveEnd=await read();assert.ok(Math.hypot(driveEnd.pos[0]-driveStart.pos[0],driveEnd.pos[2]-driveStart.pos[2])>15,'Scout moved under throttle');result.steps.push({label:'native scout drive and brake',start:driveStart.pos,end:driveEnd.pos});await shot('03-driving');
 await page.keyboard.press('KeyJ');await page.waitForFunction(()=>!PW.game.player._scoutVehicle,null,{timeout:4000});
 // Walk east of the rotor envelope and along the connected apron. The small
 // side-step approach keeps the native plane/cover admission check meaningful.
 await walkTo(heli.pos[0]+heli.radius+7,heli.pos[2]-65,{label:'walk around rotor approach'});
 await walkTo(heli.pos[0]+heli.radius+4,heli.pos[2],{label:'walk to helicopter boarding side'});await shot('04-helicopter-access');
 await page.keyboard.press('KeyJ');await page.waitForFunction(()=>PW.game.player._aircraftVehicle?.kind==='helicopter',null,{timeout:4000});
 await keys(['Space']);await page.waitForTimeout(2200);await keys(['KeyW']);await page.waitForTimeout(900);await keys();await shot('05-helicopter-flight');
 await keys(['KeyS']);await page.waitForTimeout(900);await keys();await page.waitForTimeout(1800);
 await keys(['KeyZ']);await page.waitForFunction(()=>PW.game.player._aircraftVehicle?.parked||!PW.game.player._aircraftVehicle,null,{timeout:9000});await keys();
 assert.equal(await page.evaluate(()=>PW.game.player._aircraftVehicle?.kind),'helicopter','Returned helicopter did not crash');
 await page.waitForTimeout(700);await page.keyboard.press('KeyJ');await page.waitForFunction(()=>!PW.game.player._aircraftVehicle,null,{timeout:4000});result.steps.push({label:'helicopter native takeoff, return, land and exit',pos:(await read()).pos});await shot('06-helicopter-landed');
 }else{
  result.scope='Jet-only normal-spawn walking, native boarding, takeoff, cannon and exit; scout/helicopter route is not tested';
  await walkTo(heli.pos[0]+heli.radius+7,heli.pos[2]-65,{label:'walk to east apron'});
  await walkTo(heli.pos[0]+heli.radius+7,heli.pos[2],{label:'walk past rotor envelope'});
 }
 const jet=result.inventory.aircraft.find(a=>a.kind==='jet');
 await walkTo(70,heli.pos[2]+80,{label:'walk north along runway access'});
 await walkTo(jet.pos[0]+jet.radius+4,jet.pos[2]-55,{label:'walk to jet apron'});
 await walkTo(jet.pos[0]+jet.radius+4,jet.pos[2],{label:'walk to jet boarding side'});await shot('07-jet-access');
 await page.keyboard.press('KeyJ');await page.waitForFunction(()=>PW.game.player._aircraftVehicle?.kind==='jet',null,{timeout:4000});
 const launch=await read();await keys(['KeyW','Space']);await page.waitForTimeout(3200);await keys();
 const airborne=await read();assert.equal(airborne.aircraft,'jet');assert.ok(airborne.pos[1]>launch.pos[1]+15,'Jet lifts only after native takeoff roll');await shot('08-jet-takeoff');
 if(checkAim){const before=await auditAim('jet-airborne-before-fire');if(quickTap)await page.mouse.click(836,470,{button:'left'});else{await page.mouse.down({button:'left'});await page.waitForTimeout(180);await page.mouse.up({button:'left'});}await page.waitForTimeout(50);const after=await auditAim('jet-airborne-after-fire');assert.ok(after.shots>before.shots,`Actual ${quickTap?'quick tap':'held LMB'} must fire jet cannon`);await shot('08b-jet-cannon');}
 // Short lift-off and controlled deceleration/landing, not a full airfield
 // circuit: the native +/-900 arena provides limited straight-line runout.
 await keys(['KeyS','KeyZ']);await page.waitForFunction(()=>PW.game.player._aircraftVehicle?.parked||!PW.game.player._aircraftVehicle,null,{timeout:6500});
 assert.equal(await page.evaluate(()=>PW.game.player._aircraftVehicle?.kind),'jet','Jet remained intact during landing');
 await page.waitForFunction(()=>Math.abs(PW.game.player._aircraftVehicle?.speed||0)<4,null,{timeout:4000});await keys();
 await page.keyboard.press('KeyJ');await page.waitForFunction(()=>!PW.game.player._aircraftVehicle,null,{timeout:4000});result.steps.push({label:'jet native takeoff roll, short flight, land and exit',pos:(await read()).pos});await shot('09-jet-landed');
 if(checkAim)assert.equal(await page.locator('#hCross').getAttribute('data-aim-mode'),null,'Personal reticle restored after leaving jet');
 result.performance=await page.evaluate(async()=>{
  const g=PW.game; if(!g.player.alive||!g.running||g.hud?.titleOpen)throw Error('Performance witness requires live gameplay');
  const samples=[];let previous;for(let i=0;i<123;i++)await new Promise(resolve=>requestAnimationFrame(now=>{if(i>=3)samples.push(now-previous);previous=now;resolve();}));
  const sorted=[...samples].sort((a,b)=>a-b),gl=g.world.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  return {headed:true,visibility:document.visibilityState,count:samples.length,meanRafMs:samples.reduce((a,b)=>a+b,0)/samples.length,p95RafMs:sorted[Math.ceil(sorted.length*.95)-1],worldEmaMs:g.world._ema,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),scope:'One short live airfield sample after navigation, not combat performance or all-hardware guarantee'};
 });
 result.faults=await page.evaluate(()=>navigationFaults);assert.deepEqual(result.faults,[]);assert.deepEqual(errors,[]);result.ok=true;console.log(JSON.stringify(result));
}catch(e){result.error=e.stack;result.last=await read().catch(()=>null);result.faults=await page.evaluate(()=>window.navigationFaults||[]).catch(()=>[]);await shot('failure').catch(()=>{});console.error(e);process.exitCode=1;}
finally{await keys().catch(()=>{});result.damageAudit=await page.evaluate(()=>window.vehicleDamageAudit||[]).catch(()=>[]);result.errors=errors;const video=page.video();await page.close();if(video){result.video=`${out}/native-navigation.webm`;await video.saveAs(result.video);}await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await writeFile(`${out}/trajectory.json`,JSON.stringify(trajectory,null,2));await browser.close();}
