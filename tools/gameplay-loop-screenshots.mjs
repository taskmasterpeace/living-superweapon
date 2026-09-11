import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5184';
const out='artifacts/gameplay-loop-screenshots-2026-09-11';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));

async function boot(){
 await page.goto(base+'/powerworld.html',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.LSW?.game?.world?.renderer);
 await page.locator('#pwGo').click();
 await page.waitForFunction(()=>!window.LSW.hud.titleOpen);
}
async function start({p1='sol',p2='kano',encounter='practice',weatherPreset='clear'}={}){
 await page.evaluate(async cfg=>{
  const {game:g,hud}=LSW;hud.hideEndScreen();
  g.startMode('powerworld',{...cfg,cameraPreset:'frontline'});hud.hideTitle();
  document.body.classList.add('playing');g.running=true;
  const prep=g.pwStage?.preparation?.promise;if(prep)await prep;
  for(const f of g.entities)f.ai=null;
  g.world.qualityOverride=2;g.world._qTier=2;g.world._applyQuality?.();
 },{p1,p2,encounter,weatherPreset});
 await page.waitForTimeout(700);
}
async function snap(name){
 await page.evaluate(()=>{LSW.hud.update();LSW.game.world.render();});
 await page.waitForTimeout(120);
 await page.screenshot({path:`${out}/${name}.png`});
}

try{
 await boot();

 await start({p1:'sol'});
 await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW,p=g.player,w=g.world;
  p.pos.set(-32,g.world.heightAt(-32,-48)+.2,-48);p.vel.set(0,0,0);p.faceDir(.35,.94);p.aim3.set(.35,0,.94);
  w.chase(p,null,1,'bfp');g.hud.feed('DESERT OUTPOST · OPEN-SKY SUPERWEAPON OPERATIONS','#ffd24a');
 });
 await snap('01-desert-outpost-overview');

 await page.evaluate(()=>{
  const {game:g}=LSW,p=g.player;p.pos.y=g.world.heightAt(p.pos.x,p.pos.z)+52;p.flying=true;p.grounded=false;
  p.vel.set(22,5,244);p.movementGear ||= {};Object.assign(p.movementGear,{gear:3,sequence:3,ready:true,holdTime:1.2,limited:false});
  p.powerBuff=1.6;p._flyPose=1;g._captureOriginalUpdate=g.update;g.update=()=>g.world.render();g.hud.feed('GEAR III · MAX SPEED REACHED','#ffd24a');
 });
 await snap('02-gear-iii-max-flight');

 await page.evaluate(()=>{
  const {game:g}=LSW,p=g.player,w=g.world;
  g.update=g._captureOriginalUpdate;delete g._captureOriginalUpdate;
  p.vel.set(0,0,88);p.faceDir(0,1);p.aim3.set(0,0,1);w._combatAimDirection ||= p.aim3.clone();w._combatAimDirection.set(0,0,1);
  w._freeLook={yaw:1.28,pitch:.12,held:true,cancelVersion:g.input.cancelVersion};w.chase(p,null,1,'bfp');
  g._aim3pt.set(p.pos.x,p.pos.y+5,p.pos.z+320);g._captureOriginalUpdate=g.update;g.update=()=>w.render();
  g.hud.feed('ALT FREE-LOOK · TRAVEL AND AIM HEADING PRESERVED','#beeaff');g.hud.updateCrosshair(g);
 });
 await snap('03-alt-free-look-bearing');
 await page.evaluate(()=>{const g=LSW.game;g.update=g._captureOriginalUpdate;delete g._captureOriginalUpdate;});

 await start({p1:'sol',p2:'kano',encounter:'sparring'});
 await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW,a=g.player,b=g.entities.find(f=>f!==a&&f.def&&!f._encounterNPC);
  a.pos.set(-4,g.world.heightAt(-4,0),0);b.pos.set(5,g.world.heightAt(5,0),0);a.faceDir(1,0);b.faceDir(-1,0);a.aim3.set(1,0,0);b.aim3.set(-1,0,0);
  a._tabMelee=true;a._selSlot='melee';a._selSecondary='grab';a.strikeIdx=2;a.mstate='active';a.mId='cross';a.mKind='light';a.strikeActive=.2;a.punchPose=1;a._animate(1);b.state='hit';b._animate(1);
  const hit=a.pos.clone().add(b.pos).multiplyScalar(.5).add(new T.Vector3(0,5.5,0));g.vfx.impact(hit,new T.Vector3(1,0,0),{color:a.def.colors.accent,power:2.2});
  g.hud.feed('TAB MELEE · JAB → JAB → KNOCKBACK CROSS','#ffd24a');g.world.chase(a,b,1,'bfp');
 });
 await snap('04-tab-melee-finisher');

 await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW,a=g.player,b=g.entities.find(f=>f!==a&&f.def&&!f._encounterNPC);
  b.guarding=true;b._guardUpT=.4;b.guardMeter=.82;b.ki=Math.max(20,b.maxKi*.62);b._animate(1);
  b.takeDamage(24,{src:a,strike:true,meleeMove:'light',kb:{x:8,y:0,z:0}});
  g.vfx.impactStar(b.center(new T.Vector3()),8,'#bfe0ff',.5);g.hud.feed('BLOCKED · ENERGY ABSORBS THE HIT BEFORE HEALTH','#bfe0ff');
 });
 await snap('05-energy-first-guard');

 await start({p1:'titan',p2:'sarge',encounter:'sparring'});
 await page.evaluate(()=>{
  const {game:g}=LSW,a=g.player,b=g.entities.find(f=>f!==a&&f.def&&!f._encounterNPC);
  a.pos.set(0,g.world.heightAt(0,0)+28,0);a.flying=true;a.grounded=false;a.faceDir(0,1);a.aim3.set(.3,-.15,.94).normalize();
  b.pos.set(0,a.pos.y,4);a.grabbing=b;b.grabbedBy=a;a.grabState='clinch';a.grabT=8;a._clinchMax=4;a._clinchElapsed=0;
  g.melee.liftPerson(a);if(a._personCarry){a._personCarry.whirling=true;a._personCarry.throwArmed=true;a._personCarry.angle=1.05;a._personCarry.whirlT=1.2;}
  g.melee.update(a,.08);a._animate(1);b._animate(1);g.hud.feed('PERSON CARRY · FLY, WHIRL, AIM, THROW INTO TERRAIN','#ffd24a');g.world.chase(a,b,1,'bfp');
 });
 await snap('06-flying-person-carry-whirl');

 await start({p1:'kano',p2:'vega',encounter:'sparring'});
 await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW,p=g.player,foe=g.entities.find(f=>f!==p&&f.def&&!f._encounterNPC);
  p.pos.set(0,g.world.heightAt(0,-25)+18,-25);p.flying=true;p.grounded=false;p.faceDir(0,1);p.aim3.set(0,-.28,.96).normalize();
  foe.pos.set(0,g.world.heightAt(0,50),60);foe.ai=null;
  const beam=g.spawnBeamFor(p,p.slots.lmb.def,1.8);p.slots.lmb.active=beam;
  for(let i=0;i<32;i++){p.ki=p.maxKi;beam.update(1/60,g);g.vfx.update(1/60);}
  for(let z=12;z<=46;z+=7)g.vfx.beamGroundScorch(new T.Vector3(0,g.world.heightAt(0,z),z),3.3);
  g.hud.feed('BEAM CONTACT · TRAVELING TIP LEAVES SCORCH AND DUST','#beeaff');g.world.chase(p,foe,1,'bfp');
 });
 await snap('07-beam-ground-burn-trail');

 await start({p1:'tempest',p2:'kano',encounter:'sparring',weatherPreset:'rain'});
 await page.evaluate(()=>{
  const {game:g}=LSW,p=g.player;p.pos.set(0,g.world.heightAt(0,0)+32,0);p.flying=true;p.grounded=false;
  const layer=g.weather.command({src:p,center:p.pos.clone(),rain:1,wind:1.1,cloud:1,storm:1,dur:16,radius:65,range:100,kiPerSec:0});
  layer.age=1.25;layer.state='active';g.weather.update(.1);g.hud.feed('TEMPEST · BOUNDED STORM OVER LIVE AMBIENT RAIN','#beeaff');g.world.chase(p,null,1,'bfp');
 });
 await snap('08-tempest-bounded-storm');

 await start({p1:'sol',encounter:'zombies'});
 await page.evaluate(()=>{
  const {game:g}=LSW,p=g.player,z=g.ms.zombies;p.pos.set(0,g.world.heightAt(0,0),0);
  for(const [i,f] of z.units.entries()){const a=i*Math.PI*2/z.units.length,r=15+i*2;f.pos.set(Math.cos(a)*r,g.world.heightAt(Math.cos(a)*r,Math.sin(a)*r),Math.sin(a)*r);f.faceDir(-f.pos.x,-f.pos.z);f.ai=null;f._animate(1);}
  g.hud.feed('OUTBREAK · THREE FINITE WAVES · MELEE CREATES SPACE','#ffd24a');g.world.chase(p,z.units[0],1,'bfp');
 });
 await snap('09-zombie-outbreak-wave');

 await start({p1:'sol',encounter:'frontline'});
 await page.evaluate(()=>{
  const {game:g}=LSW,p=g.player,e=g.ms.frontline;if(e?.casePosition){p.pos.copy(e.casePosition).add({x:-16,y:0,z:-12});p.pos.y=g.world.heightAt(p.pos.x,p.pos.z);}
  for(const f of e?.soldiers||[]){f.ai=null;f._animate(1);}g.hud.feed('CLONE RECOVERY · FIGHT OR BYPASS · SECURE THE CASE','#ffd24a');g.world.chase(p,e?.soldiers?.[0]||null,1,'bfp');
 });
 await snap('10-clone-recovery-case-and-squad');

 await start({p1:'sol',encounter:'security'});
 await page.evaluate(()=>{
  const {game:g}=LSW,p=g.player,law=g.ms.desertLaw;for(const f of law.cops){f.ai=null;f.pos.lerp(p.pos,.45);f._animate(1);}law.render();
  g.hud.feed('OUTPOST SECURITY · POLICE PATROL RESPONDS FIRST','#ffd24a');g.world.chase(p,law.cops[0]||null,1,'bfp');
 });
 await snap('11-police-first-response');

 await page.evaluate(async()=>{
  const {game:g}=LSW,p=g.player,law=g.ms.desertLaw;law.heat.set(p,100);law.lastTier=5;law.deploy(5,4);
  const military=law.cops.filter(f=>f._responseTier===5);await Promise.allSettled(military.map(f=>f._desertEquipmentReady));
  for(const [i,f] of military.entries()){f.ai=null;f.pos.set(p.pos.x-12+i*8,g.world.heightAt(p.pos.x-12+i*8,p.pos.z+16),p.pos.z+16);f.faceDir(p.pos.x-f.pos.x,p.pos.z-f.pos.z);f._animate(1);}law.render();
  g.hud.feed('MILITARY RESPONSE · KUCHLER MK I · 24 + 96 ROUNDS','#ffd24a');g.world.chase(p,military[1]||military[0],1,'bfp');
 });
 await snap('12-military-escalation-kuchler');

 await start({p1:'sol',encounter:'zombies'});
 await page.evaluate(()=>{const {game:g}=LSW;g.ms.zombies.wave=2;g.ms.zombies.finish(false);});
 await page.waitForTimeout(700);await page.click('#hEnd',{position:{x:500,y:300}}).catch(()=>{});await page.waitForTimeout(350);
 await snap('13-clean-operation-report');

 await writeFile(`${out}/capture-results.json`,JSON.stringify({base,viewport:[1600,900],errors},null,2));
 if(errors.length)process.exitCode=1;
}finally{await browser.close();}
