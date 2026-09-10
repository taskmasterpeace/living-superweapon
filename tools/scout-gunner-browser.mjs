// Isolated real-runtime weapon fixture: positions a hero near the actual parked
// scout. NOT a navigation proof. Normal RAF, AI and projectile damage remain on.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const out='artifacts/scout-gunner-runtime';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[],result={kind:'positioned native-runtime mounted-fire fixture'};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',cameraPreset:'frontline'})));
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.locator('#pwEncounter [data-encounter="frontline"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>window.PW?.game?.pwStage?.frontlineReady&&PW.game.pwStage.convoy.ready,null,{timeout:60000});
 await page.evaluate(()=>{
  const g=PW.game,v=g.pwStage.convoy.vehicles[0],p=g.player;
  window.__scoutInitialHp=p.hp;window.__scoutShots=[];
  // Hover level with the actual barrel above a clear patch of the road.
  p.pos.set(v.cover.x+35,v.mesh.position.y+12,v.cover.z+85);p.vel.set(0,0,0);p.flying=true;p.flyHeld=false;p.invuln=0;
  window.__scout=[...g.pwStage.convoy.vehicles].sort((a,b)=>a.mesh.position.distanceToSquared(p.pos)-b.mesh.position.distanceToSquared(p.pos))[0];
  g.world._lookActive=true;g.world._lookYaw=Math.atan2(__scout.cover.x-p.pos.x,__scout.cover.z-p.pos.z);g.world._lookPitch=-.08;g.world._chaseSnap=true;
  const original=g.projectiles.spawnProjectile;
  g.projectiles.spawnProjectile=function(c,o){const p=original.call(this,c,o);if(c._frontlineVehicle)__scoutShots.push({time:g.time,pos:o.pos.toArray(),vel:o.vel.toArray(),damage:p.damage,source:c.name,cover:p.launchCover===__scout.cover});return p;};
 });
 await page.waitForFunction(()=>__scoutShots.length>=3,null,{timeout:15000});
 await page.screenshot({path:out+'/scout-acquired.png'});
 await page.waitForTimeout(1200);
 result.fire=await page.evaluate(()=>({shots:__scoutShots,hp:PW.game.player.hp,initialHp:__scoutInitialHp,state:__scout.gunner.control.state,yaw:__scout.gunner.turret.rotation.y,pitch:__scout.gunner.barrel.rotation.x,sourceAlive:__scout.gunner.source.alive,renderer:PW.game.world.renderer.getContext().getParameter(PW.game.world.renderer.getContext().getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL)}));
 assert.ok(result.fire.hp<result.fire.initialHp,'Finite mounted rounds must actually damage the hero');
 assert.ok(result.fire.shots.every(s=>s.damage===4&&s.cover&&Math.abs(Math.hypot(...s.vel)-220)<.01));
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!PW.game.running);const paused=await page.evaluate(()=>({time:PW.game.time,shots:__scoutShots.length,yaw:__scout.gunner.turret.rotation.y}));await page.waitForTimeout(400);
 assert.deepEqual(await page.evaluate(()=>({time:PW.game.time,shots:__scoutShots.length,yaw:__scout.gunner.turret.rotation.y})),paused);result.pause=true;
 await page.locator('#hPaused [data-p="resume"]').click();
 // Real terrain/cover sweep blocks acquisition, without editing vehicle AI.
 await page.evaluate(()=>{const g=PW.game,v=__scout,p=g.player;window.__testWall={x:(v.cover.x+p.pos.x)/2,z:(v.cover.z+p.pos.z)/2,hx:25,hz:6,top:v.cover.top+100,projectileShape:'box'};g.world.cover.push(__testWall);window.__blockedShots=__scoutShots.length;});
 await page.waitForTimeout(4500);assert.equal(await page.evaluate(()=>__scoutShots.length),await page.evaluate(()=>__blockedShots));result.cover=true;
 await page.evaluate(()=>{const a=PW.game.world.cover;a.splice(a.indexOf(__testWall),1);PW.game.player.pos.y=__scout.mesh.position.y+190;window.__highShots=__scoutShots.length;});
 await page.waitForTimeout(2200);assert.equal(await page.evaluate(()=>__scoutShots.length),await page.evaluate(()=>__highShots));result.aboveArc=true;
 // Exercise normal destructible-cover path rather than writing destroyed/HP.
 await page.evaluate(()=>PW.game.damageBlock(__scout.cover,1000,__scout.mesh.position));
 await page.waitForTimeout(500);result.destroy=await page.evaluate(()=>({wreck:__scout.destroyed,sourceAlive:__scout.gunner.source.alive,registered:PW.game.world.cover.includes(__scout.cover)}));
 assert.deepEqual(result.destroy,{wreck:true,sourceAlive:false,registered:false});
 const pkg=JSON.parse(await readFile('artifacts/sound-library/library.json','utf8'));
 await page.evaluate(async binding=>{
  const g=PW.game;g.startMode('powerworld',{p1:'vanguard',p2:'kano',encounter:'frontline',cameraPreset:'frontline'});await g.pwStage.preparation.promise;
  const first=g.pwStage.convoy.vehicles[0],p=g.player;p.pos.set(first.cover.x+35,first.mesh.position.y+12,first.cover.z+85);p.vel.set(0,0,0);p.flying=true;p.flyHeld=false;
  const v=[...g.pwStage.convoy.vehicles].sort((a,b)=>a.mesh.position.distanceToSquared(p.pos)-b.mesh.position.distanceToSquared(p.pos))[0];
  g.world._lookActive=true;g.world._lookYaw=Math.atan2(v.cover.x-p.pos.x,v.cover.z-p.pos.z);g.world._lookPitch=0;g.world._chaseSnap=true;
  await g.audio.soundLibrary.importPackage({format:'lsw.sound-library',version:1,bindings:{'scout-gunshot':{...binding,name:'scout-gunshot-proof.wav'}},settings:{'scout-gunshot':{source:'chosen'}}});
  window.__gunSounds=[];const play=g.audio.soundLibrary.play;g.audio.soundLibrary.play=function(id,o){const h=play.call(this,id,o);if(id==='scout-gunshot')__gunSounds.push({source:h?.source,name:h?.name});return h;};
 },pkg.bindings.light);
 await page.keyboard.down('c');await page.waitForFunction(()=>PW.game.player.guarding);
 await page.waitForFunction(()=>PW.game.projectiles.list.some(p=>p.launchCaster?._frontlineVehicle&&p.caster===PW.game.player),null,{timeout:15000,polling:20});
 result.deflect=await page.evaluate(()=>({hero:PW.game.player.def.id,guarding:PW.game.player.guarding,sounds:__gunSounds,returned:PW.game.projectiles.list.filter(p=>p.launchCaster?._frontlineVehicle&&p.caster===PW.game.player).map(p=>({team:p.team,originalTeam:p.launchCaster.team,finite:p.vel.toArray().every(Number.isFinite)}))}));
 assert.equal(result.deflect.hero,'vanguard');assert.ok(result.deflect.returned.length&&result.deflect.returned.every(p=>p.finite&&p.team!==p.originalTeam));
 assert.ok(result.deflect.sounds.some(s=>s.source==='chosen-recording'&&s.name==='scout-gunshot-proof.wav'));
 await page.screenshot({path:out+'/native-guard-deflection.png'});await page.keyboard.up('c');
 result.pass=true;assert.deepEqual(errors,[]);
}catch(e){result.failure=e.stack;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw e;}
finally{await writeFile(out+'/results.json',JSON.stringify({...result,errors},null,2));await browser.close();}
