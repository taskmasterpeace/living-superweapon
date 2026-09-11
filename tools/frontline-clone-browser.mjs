// Native-input clone rig witness. No fighter/camera/HP/AI/animation writes.
// Read-only snapshots and resource-dispose listeners observe normal lifecycle.
// Requires exclusive GPU permission; node tools/frontline-clone-browser.mjs
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const out=resolve(process.env.LSW_CLONE_OUT||'artifacts/frontline-clone-native'),base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180';
const result={kind:'native ground approach and combat / read-only rig witness',frames:[],inputs:[],shots:[],requests:[],errors:[],
 constraints:{actorWrites:false,cameraWrites:false,hpWrites:false,aiDisabled:false,simulationFrozen:false,diagnosticDisposalListeners:true}};
await mkdir(out,{recursive:true});const started=Date.now(),budget=100000,held=new Set();let browser,context,page,phase='launch',targetName=null,mx=800,my=450;
const watchdog=setTimeout(()=>page?.close().catch(()=>{}),budget),wall=()=>Date.now()-started;
async function key(code,on){if(held.has(code)===on)return;await page.keyboard[on?'down':'up'](code);if(on)held.add(code);else held.delete(code);result.inputs.push({phase,wall:wall(),code,on});}
async function sample(){
 const f=await page.evaluate(name=>{
  const g=PW.game,T=LSW.THREE,p=g.player,w=g.world,cam=w.camera;
  const project=v=>{const local=v.clone().applyMatrix4(cam.matrixWorldInverse),q=v.clone().project(cam);return {local:local.toArray(),x:(q.x+1)*innerWidth/2,y:(1-q.y)*innerHeight/2,visible:local.z<-.6&&Math.abs(q.x)<1&&Math.abs(q.y)<1};};
  const at=o=>new T.Vector3().setFromMatrixPosition(o.matrixWorld);
  const clones=(g.ms.frontline?.soldiers||[]).map(f=>{
   const parts=f.parts,skin=parts.skin,rifle=f.obj.getObjectByName('weapon-rifle'),weapons=[];f.obj.traverse(o=>{if(o.userData.weaponKind)weapons.push(o.userData.weaponKind);});
   const points=[at(parts.head),at(parts.torso),at(parts.armR.children[2]),at(parts.armL.children[2]),at(parts.legL.userData.boot),at(parts.legR.userData.boot)];
   if(rifle)rifle.traverse(o=>{if(!o.geometry?.attributes.position)return;const box=new T.Box3().setFromBufferAttribute(o.geometry.attributes.position);
    for(let i=0;i<8;i++)points.push(new T.Vector3(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z).applyMatrix4(o.matrixWorld));});
   const projected=points.map(project),inFront=projected.filter(q=>q.local[2]<-.6),xs=inFront.map(q=>q.x),ys=inFront.map(q=>q.y);
   return {id:f.id,name:f.name,alive:f.alive,hp:f.hp,ki:f.ki,maxKi:f.maxKi,pos:f.pos.toArray(),vel:f.vel.toArray(),state:f.state,stagger:f.staggerT,
    grounded:f.grounded,flying:f.flying,ground:w.heightAt(f.pos.x,f.pos.z),ai:!!f.ai,flightTier:f.flightTier,
    model:f.def.model,build:f.def.build,skin:{id:skin?.id,sourceKind:skin?.source?.kind,disposed:skin?.disposed,
     bodyCount:skin?.meshes.filter(m=>m.name==='hero-skin-body').length,materialUUID:skin?.materials.body.uuid,skeletonUUID:skin?.skeleton.uuid,
     finite:skin?.skeleton.bones.every(b=>b.matrixWorld.elements.every(Number.isFinite))},
    weapons,shield:!!parts.armL.userData.shield,rifleParentIsHand:rifle?.parent===parts.armR.children[2],
    equipment:{loaded:!!f._cloneEquipment,helmet:!!parts.head.getObjectByName('clone_helmet_head'),vest:!!parts.torso.getObjectByName('clone_vest_torso'),hairVisible:parts.cowl.visible,oldHarnessVisible:parts.torso.getObjectByName('field-torso_harness')?.visible},
    handR:{pos:at(parts.armR.children[2]).toArray(),grip:!!parts.armR.children[2].userData.gripOccupied,projection:project(at(parts.armR.children[2]))},
    rifle:rifle?{pos:at(rifle).toArray(),visible:rifle.visible,projection:project(at(rifle)),
     active:!!f._riflePose?.active,supportGap:at(rifle.getObjectByName('weapon-support-grip')).distanceTo(at(parts.armL.children[2])),
     stockShoulderGap:at(rifle.getObjectByName('weapon-stock-contact')).distanceTo(at(parts.armR)),
     muzzle:at(rifle.getObjectByName('weapon-muzzle')).toArray(),barrel:new T.Vector3(0,-1,0).transformDirection(rifle.matrixWorld).toArray(),
     aimDot:new T.Vector3(0,-1,0).transformDirection(rifle.matrixWorld).dot(f.aimWorld.clone().sub(at(rifle.getObjectByName('weapon-muzzle'))).normalize()),
     poseUntil:f.slots.lmb._poseUntil,animT:f.animT,guarding:f.guarding}:null,
    aimProjection:project(new T.Vector3(f.pos.x,f.pos.y+6.4,f.pos.z)),distance:p.pos.distanceTo(f.pos),
    crop:inFront.length?{left:Math.min(...xs)-32,top:Math.min(...ys)-32,right:Math.max(...xs)+32,bottom:Math.max(...ys)+32}:null,
    rifleSlot:{cost:f.slots.lmb.def.cost,damage:f.slots.lmb.def.damage,interval:f.slots.lmb.def.interval,handShots:{...f.slots.lmb.handShots},cd:f.slots.lmb.cd},
    damageDealt:f.stats?.dmg||0};
  });
  return {time:g.time,running:g.running,ready:g.pwStage?.frontlineReady,player:{id:p.def.id,hp:p.hp,alive:p.alive,pos:p.pos.toArray(),groundHeight:w.heightAt(p.pos.x,p.pos.z),flying:p.flying,grounded:p.grounded,guarding:p.guarding,skin:p.parts.skin?.id},
   look:{yaw:w._lookYaw,pitch:w._lookPitch,sens:w._lookSens},pointer:!!document.pointerLockElement,clones,target:clones.find(f=>f.name===name)||null,
   rifleProjectiles:g.projectiles.list.filter(s=>s.caster?._frontlineClone&&s.ballistic).map(s=>({caster:s.caster.name,pos:s.pos.toArray(),vel:s.vel.toArray(),damage:s.damage,life:s.life,radius:s.radius,dead:s.dead})),
   objects:{objectives:document.querySelectorAll('#frontlineObjective').length,markers:g.scene.children.filter(o=>o.name==='frontline-objectives').length},
   news:{enabled:g.news.enabled,pending:g.news._encoder?.pending.size},canonicalSarge:JSON.stringify(LSW.ROSTER.find(d=>d.id==='sarge'))};
 },targetName);
 f.wall=wall();f.phase=phase;result.frames.push(f);return f;
}
async function tick(ms=80){await page.waitForTimeout(ms);const s=await sample();assert.ok(s.player.alive&&s.player.hp>0,'Native player died');assert.ok(s.clones.every(c=>c.ai),'AI must stay enabled');return s;}
async function steer(s){
 const q=s.target.aimProjection.local,dx=Math.max(-140,Math.min(140,Math.atan2(q[0],-q[2])/s.look.sens)),dy=Math.max(-90,Math.min(90,-Math.atan2(q[1],Math.hypot(q[0],q[2]))/s.look.sens));
 mx+=Math.round(dx);my+=Math.round(dy);await page.mouse.move(mx,my);result.inputs.push({phase,wall:wall(),mouse:[Math.round(dx),Math.round(dy)]});
}
async function shot(name,{crop=false}={}){
 const s=await sample(),path=resolve(out,name+'.png');await page.screenshot({path,timeout:6000});const item={name,path,time:s.time,frame:result.frames.length-1};
 const cropState=crop?await sample():null;
 if(cropState?.target?.crop){const c=cropState.target.crop,x=Math.max(0,Math.floor(c.left)-32),y=Math.max(0,Math.floor(c.top)-32),right=Math.min(1600,Math.ceil(c.right)+32),bottom=Math.min(900,Math.ceil(c.bottom)+32);item.cropStateTime=cropState.time;
  if(right-x>20&&bottom-y>20){item.crop=resolve(out,name+'-native-region.png');item.cropRect={x,y,width:right-x,height:bottom-y};await page.screenshot({path:item.crop,clip:item.cropRect,timeout:6000});}}
 result.shots.push(item);return s;
}
function loadout(s){assert.equal(s.clones.length,4);for(const f of s.clones){assert.equal(f.skin.id,'superhero-male');assert.equal(f.skin.sourceKind,'superhero-male');assert.equal(f.skin.bodyCount,1);assert.ok(f.skin.finite&&!f.skin.disposed);
 assert.deepEqual(f.equipment,{loaded:true,helmet:true,vest:true,hairVisible:false,oldHarnessVisible:false});
 assert.equal(f.model.surface,'field');assert.equal(f.model.costume,'tactical');assert.deepEqual(f.weapons,['rifle']);assert.ok(f.rifleParentIsHand&&f.handR.grip&&!f.shield);assert.equal(f.flightTier,0);assert.equal(f.rifleSlot.cost,3);assert.equal(f.rifleSlot.damage,4);}}
try{
 browser=await chromium.launch({channel:'chromium',headless:process.env.LSW_CLONE_HEADED!=='1'});context=await browser.newContext({viewport:{width:1600,height:900},recordVideo:{dir:out,size:{width:1600,height:900}}});page=await context.newPage();page.setDefaultTimeout(10000);await page.bringToFront();
 page.on('request',r=>{if(/hero-body-bank|T_Eye_Brown|garment/i.test(r.url()))result.requests.push({url:r.url(),wall:wall()});});
 page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
 await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',cameraPreset:'frontline',ai:1.25})));
 await page.goto(base+'/powerworld.html');await page.locator('#pwEncounter [data-encounter="frontline"]').click();await page.locator('#pwCamera [data-camera="frontline"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>window.PW?.game?.running&&PW.game.pwStage?.frontlineReady,null,{polling:100,timeout:60000});
 phase='entry';let s=await sample();loadout(s);result.entry=s;
 targetName=[...s.clones].sort((a,b)=>a.distance-b.distance)[0].name;
 await page.mouse.click(mx,my,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
 // Bounded diagnostic wrappers only. Count EVERY WebGL draw via info.update,
 // not info.render after the composer has overwritten it with its final pass.
 await page.evaluate(async()=>{
  const {capturePerformance}=await import('/src/engine/performance-diagnostic.js'),g=PW.game,info=g.world.renderer.info,original=info.update;
  const totals={calls:0,triangles:0,lines:0,points:0},rows=[];let current={...totals},raf,done=false;
  function update(...args){const before={...info.render};try{return original.apply(this,args);}finally{for(const key of Object.keys(totals)){const delta=info.render[key]-before[key];totals[key]+=delta;current[key]+=delta;}}}
  info.update=update;
  function sample(){rows.push({...current,hidden:document.hidden,alive:g.ms.frontline.soldiers.filter(f=>f.alive).length,moving:g.ms.frontline.soldiers.filter(f=>f.vel.lengthSq()>1).length,projectiles:g.projectiles.list.filter(p=>p.caster?._frontlineClone&&p.ballistic).length});current={calls:0,triangles:0,lines:0,points:0};if(!done)raf=requestAnimationFrame(sample);}
  raf=requestAnimationFrame(sample);
  window.__clonePerformance=capturePerformance(g,PW.hud,6000).then(report=>{done=true;cancelAnimationFrame(raf);if(info.update===update)info.update=original;return {report,totals,rows,restored:info.update===original};});
 });
 phase='approach';s=await sample();const approachStart=s.time,approachEnd=Date.now()+12000;
 while(s.time-approachStart<6&&Date.now()<approachEnd){
  assert.ok(s.target.alive,'Chosen clone died before grip inspection');await steer(s);await key('w',s.target.distance>17);
  s=await tick();if(s.target.distance<=26&&s.target.aimProjection.visible)break;
 }
 await key('w',false);s=await shot('01-native-rifle-approach',{crop:true});
 assert.ok(s.target.distance<=26&&s.target.aimProjection.visible,'Native approach never gave a near visible clone');
 assert.ok(!s.player.flying&&Math.abs(s.player.pos[1]-s.player.groundHeight)<1,'Inspection must remain near ground, allowing the real bullet hit-reaction lift');
 phase='native-guard';await key('c',true);let guardStart=s.time,guardEnd=Date.now()+1800;
 while(s.time-guardStart<.65&&Date.now()<guardEnd){await steer(s);s=await tick(70);}
 await shot('01b-native-guard',{crop:true});await key('c',false);
 phase='ground-combat';const combatStart=s.time,combatEnd=Date.now()+3500;let lastPunch=-Infinity;
 while(s.time-combatStart<1.25&&Date.now()<combatEnd){
  await steer(s);await key('w',s.target.alive&&s.target.distance>7);
  if(s.target.distance<14&&s.time-lastPunch>.38){await page.keyboard.press('v');result.inputs.push({phase,wall:wall(),code:'KeyV',tap:true});lastPunch=s.time;}
  s=await tick(70);if(!s.target.alive)break;
 }
 await key('w',false);await shot('02-native-ground-fight',{crop:true});
 phase='native-guard';await key('c',true);guardStart=s.time;guardEnd=Date.now()+1800;
 while(s.time-guardStart<.65&&Date.now()<guardEnd){await steer(s);s=await tick(70);}
 await shot('02b-native-guard',{crop:true});
 assert.ok(result.frames.some(f=>f.phase==='native-guard'&&f.player.guarding),'Native guard input must activate');
 result.performance=await page.evaluate(()=>window.__clonePerformance);await key('c',false);assert.ok(result.performance.restored);assert.ok(result.performance.rows.some(r=>r.alive===4&&r.moving>0&&r.projectiles>0),'Timing must include live moving AI fire');
 const contacts=result.frames.flatMap(f=>f.clones).filter(c=>c.rifle?.active);assert.ok(contacts.length>0);assert.ok(contacts.every(c=>c.rifle.supportGap<.045),'Live active off-hand lost its rifle contact');
 const aimed=contacts.filter(c=>!c.rifle.guarding&&c.rifle.poseUntil>=c.rifle.animT);assert.ok(aimed.length>0);assert.ok(aimed.every(c=>c.rifle.aimDot>.995),'Live active muzzle must align with commanded aim');
 assert.ok(result.frames.some(s=>s.rifleProjectiles.some(p=>p.damage===4&&p.life>0&&p.vel.every(Number.isFinite))),'No live finite AI rifle projectile observed');
 assert.ok(result.frames.some(s=>s.clones.some(c=>Object.values(c.rifleSlot.handShots).some(t=>Number.isFinite(t)&&t>0))),'No actual rifle hand emission observed');
 phase='pause';await page.keyboard.press('Escape');await page.waitForFunction(()=>!PW.game.running);
 const before=await sample();await page.waitForTimeout(400);const after=await sample();
 assert.equal(after.time,before.time);assert.deepEqual(after.clones.map(c=>c.pos),before.clones.map(c=>c.pos));assert.deepEqual(after.clones.map(c=>c.handR.pos),before.clones.map(c=>c.handR.pos));assert.deepEqual(after.clones.map(c=>c.rifleSlot.handShots),before.clones.map(c=>c.rifleSlot.handShots));
 result.pause={before,after};await page.locator('#hPaused [data-p="resume"]').click();await page.waitForFunction(()=>PW.game.running);
 // Observers record disposal; they do not wrap, replace or invoke it. References
 // are kept only in this diagnostic object until the native rematch is checked.
 await page.evaluate(()=>{const clones=PW.game.ms.frontline.soldiers,resources=new Set();for(const f of clones){for(const m of f.parts.skin.meshes){resources.add(m.geometry);for(const material of [].concat(m.material))resources.add(material);}for(const name of ['clone_helmet_head','clone_vest_torso'])f.obj.getObjectByName(name).traverse(m=>{if(m.geometry)resources.add(m.geometry);if(m.material)resources.add(m.material);});}
  const witness=window.__cloneWitness={clones:[...clones],skins:clones.map(f=>f.parts.skin),resourceCount:resources.size,disposed:0};for(const r of resources)r.addEventListener('dispose',()=>witness.disposed++);});
 phase='native-menu';await page.keyboard.press('Tab');await page.waitForFunction(()=>PW.game.hud.titleOpen);
 result.retired=await page.evaluate(()=>({detached:__cloneWitness.clones.every(f=>!f.obj.parent),skinsDisposed:__cloneWitness.skins.every(s=>s.disposed),resources:__cloneWitness.resourceCount,disposed:__cloneWitness.disposed,
  cloneActors:PW.game.entities.filter(f=>f._frontlineClone).length,markers:PW.game.scene.children.filter(o=>o.name==='frontline-objectives').length}));
 assert.ok(result.retired.detached&&result.retired.skinsDisposed);assert.equal(result.retired.cloneActors,0);assert.equal(result.retired.markers,0);assert.equal(result.retired.disposed,result.retired.resources);
 phase='reentry';await page.locator('#pwGo').click();await page.waitForFunction(()=>PW.game.running&&PW.game.pwStage?.frontlineReady,null,{polling:100,timeout:60000});
 s=await sample();loadout(s);result.rematch=s;assert.equal(s.objects.objectives,1);assert.equal(s.objects.markers,1);assert.equal(s.canonicalSarge,result.entry.canonicalSarge);assert.equal(s.player.id,result.entry.player.id);assert.equal(s.player.skin,result.entry.player.skin);
 result.newActors=await page.evaluate(()=>{const yes=PW.game.ms.frontline.soldiers.every(f=>!__cloneWitness.clones.includes(f));delete window.__cloneWitness;return yes;});assert.ok(result.newActors);
 result.bodyBankRequests=result.requests.filter(r=>r.url.includes('hero-body-bank')).length;assert.equal(result.bodyBankRequests,1,'Source body bank should be one module load, not one request per clone/rematch');
 await shot('03-native-rematch');assert.deepEqual(result.errors,[]);result.success=true;
}catch(error){result.success=false;result.failure={phase,message:error.message,stack:error.stack};process.exitCode=1;if(page&&!page.isClosed()){await sample().catch(()=>{});await page.screenshot({path:resolve(out,'failure.png'),timeout:5000}).catch(()=>{});}}
finally{for(const k of [...held])await key(k,false).catch(()=>{});clearTimeout(watchdog);const video=page?.video();await context?.close().catch(()=>{});result.video=await video?.path().catch(()=>null);await browser?.close().catch(()=>{});result.wallMs=wall();await writeFile(resolve(out,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({success:result.success,failure:result.failure,out,wallMs:result.wallMs,video:result.video}));}
