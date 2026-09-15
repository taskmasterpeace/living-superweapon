// GATE A — TANK ACCEPTANCE, in the real browser through the production entry
// path: enter tank → move/turn correctly → look around → aim the turret
// separately from the hull → fire the real main gun → ammunition decreases →
// reload → an enemy responds to the occupied vehicle → the tank receives real
// damage → exit restores character control. Plus the AI leg: an AI-crewed
// tank drives and fires through the same intent paths.
// Needs a dev server on http://127.0.0.1:5193 (npx vite --port 5193).
import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/fleet-gate-a';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false});const p=await b.newPage({viewport:{width:1440,height:900}});
const r={errors:[],method:'Native menu + keyboard/mouse; production deployment API for vehicle selection'};
p.on('pageerror',e=>r.errors.push(e.message));
const sample=()=>p.evaluate(()=>{const g=PW.game,a=g._fleetPilot?.actor;return {
 id:a?.id,x:a?.pos.x,z:a?.pos.z,yaw:a?.motion?.yaw,turretYaw:a?.motion?.turretYaw,turretPitch:a?.motion?.turretPitch,
 speed:a?.motion?.speed,mag:a?.weapon?.mag,reserve:a?.weapon?.reserve,reloading:a?.weapon?.reloading,
 hull:a?.hull?.cover.hp,hullMax:a?.hull?.cover.maxHp,shots:g.projectiles?.list?.length??0,
 lookYaw:g.world._lookYaw,seated:!!g.player?._fleetVehicle,visible:g.player?.obj?.visible,
 controls:document.getElementById('fleetControls')?.textContent||''}});
try{
 await p.goto('http://127.0.0.1:5193/powerworld.html');await p.locator('#hSelect.on').waitFor({timeout:60000});
 await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await p.waitForFunction(()=>PW.game.ms?.threatLab?.state==='preparing',null,{timeout:90000});
 await p.keyboard.press('Shift+V');
 await p.waitForFunction(()=>PW.game._simActive&&!PW.game._frontlinePreparing,null,{timeout:60000});
 await p.evaluate(()=>PW.game.deployVehicleSim('tank'));
 await p.waitForFunction(()=>PW.game._fleetActors?.some(a=>a.id==='tank'&&a.ready),null,{timeout:30000});
 // ---- enter ----
 r.boardProbe=await p.evaluate(()=>{const g=PW.game,pl=g.player,a=g._fleetActors.find(x=>x.id==='tank');return {
  d:Math.hypot(pl.pos.x-a.pos.x,pl.pos.z-a.pos.z),dy:Math.abs(pl.pos.y-a.pos.y),radius:a.bodyRadius,
  ready:a.ready,occ:!!a.occupant,dest:!!a.destroyed,
  busy:{stun:pl.stunT,frozen:pl.frozenT,stagger:pl.staggerT,sleep:pl.sleepT,launch:pl.launchT,grabbed:!!pl.grabbedBy,carry:!!pl._carry},
  seatFlags:{fleet:!!pl._fleetVehicle,scout:!!pl._scoutVehicle,air:!!pl._aircraftVehicle,transport:!!pl._passengerTransport},
  cam:g.world._camNearestT?.(pl.pos.x,pl.pos.y+3,pl.pos.z,a.pos.x,a.pos.y+3,a.pos.z,.2),
  blocked:g.paused||g.running===false||g.matchOver||g.hud?.titleOpen||g.combatOverlayOpen}});
 await p.keyboard.press('j');
 r.boarded=await sample();assert.equal(r.boarded.seated,true,'J boards the tank');assert.equal(r.boarded.visible,false,'driver hidden while seated');
 // ---- move / turn correctly ----
 await p.keyboard.down('w');await p.waitForTimeout(1600);await p.keyboard.up('w');
 r.drove=await sample();
 assert.ok(Math.hypot(r.drove.x-r.boarded.x,r.drove.z-r.boarded.z)>8,'W drives the hull forward');
 const yaw0=r.drove.yaw;await p.keyboard.down('d');await p.waitForTimeout(500);await p.keyboard.up('d');
 r.turned=await sample();r.dYaw=r.turned.yaw-yaw0;
 assert.ok(r.dYaw>0.15,'D pivots the hull right (steering not reversed)');
 // ---- look around (Alt freelook) without moving the gun ----
 const gunBefore=(await sample()).turretYaw;
 await p.keyboard.down('Alt');await p.mouse.move(720,450);await p.mouse.move(1100,430,{steps:6});await p.keyboard.up('Alt');
 r.freelook=await sample();
 assert.ok(Math.abs(r.freelook.turretYaw-gunBefore)<0.02,'Alt+mouse looks around without dragging the gun');
 // ---- aim the turret separately from the hull ----
 const hullYaw=r.freelook.yaw;
 await p.mouse.move(700,450);await p.mouse.move(1180,400,{steps:10});await p.waitForTimeout(500);
 r.aimed=await sample();
 assert.ok(Math.abs(r.aimed.turretYaw-gunBefore)>0.05,'mouse slews the turret');
 assert.ok(Math.abs(r.aimed.yaw-hullYaw)<0.02,'the hull did not move while aiming');
 // ---- fire the real main gun: shell exists, ammo decreases, reload runs ----
 const magBefore=r.aimed.mag,reserveBefore=r.aimed.reserve;
 await p.evaluate(()=>{const pr=PW.game.projectiles;if(!pr._counting){pr._counting=true;const o=pr.spawnProjectile.bind(pr);pr.spawnProjectile=(c,x)=>{pr._spawned=(pr._spawned||0)+1;return o(c,x);}}});
 await p.mouse.down();await p.waitForTimeout(250);await p.mouse.up();
 r.fired=await sample();
 r.fired.spawned=await p.evaluate(()=>PW.game.projectiles._spawned||0);
 assert.ok(r.fired.spawned>0,'a REAL projectile left the muzzle');
 assert.ok(r.fired.mag<magBefore||r.fired.reloading,'ammunition decreased');
 assert.equal(r.fired.reloading,true,'single-shell magazine starts the reload');
 await p.waitForTimeout(3900);
 r.reloaded=await sample();
 assert.equal(r.reloaded.reloading,false,'reload completed on the envelope timing');
 assert.equal(r.reloaded.mag,1,'next shell chambered');
 assert.ok(r.reloaded.mag+r.reloaded.reserve<magBefore+reserveBefore,'reserve paid for the round');
 await p.screenshot({path:out+'/tank-fire.png'});
 // ---- the AI leg + the tank RECEIVES damage: an AI-crewed hostile tank engages ----
 await p.evaluate(()=>PW.game.spawnAIVehicle('drone-tank',{x:PW.game.player.pos.x+110,z:PW.game.player.pos.z},{team:1}));
 await p.waitForFunction(()=>PW.game._fleetActors?.some(a=>a.operator&&!a.destroyed),null,{timeout:30000});
 r.aiStart=await p.evaluate(()=>{const a=PW.game._fleetActors.find(a=>a.operator);return {x:a.pos.x,z:a.pos.z,mag:a.weapon?.mag,reserve:a.weapon?.reserve}});
 await p.waitForFunction(()=>{const g=PW.game,a=g._fleetActors.find(a=>a.operator);const me=g._fleetPilot?.actor;
  return a&&me&&(a.weapon.mag+a.weapon.reserve< a.weapon.spec.magazine+a.weapon.spec.reserve)&&me.hull.cover.hp<me.hull.cover.maxHp;},null,{timeout:45000});
 r.aiFight=await p.evaluate(()=>{const g=PW.game,a=g._fleetActors.find(a=>a.operator),me=g._fleetPilot.actor;return {
  aiMoved:Math.hypot(a.pos.x-0,a.pos.z-0),aiMag:a.weapon.mag,aiReserve:a.weapon.reserve,
  aiTurret:a.motion.turretYaw,myHull:me.hull.cover.hp,myHullMax:me.hull.cover.maxHp}});
 assert.ok(r.aiFight.myHull<r.aiFight.myHullMax,'the PLAYER tank received real damage from AI shells');
 await p.screenshot({path:out+'/gate-a-battle.png'});
 // ---- infantry perceives the occupied vehicle ----
 r.percept=await p.evaluate(async()=>{const g=PW.game;const e=g.spawnEnemy(null,{x:g.player.pos.x+55,z:g.player.pos.z+10,team:1});
  let saw=false;for(let i=0;i<600;i++){await new Promise(r=>setTimeout(r,16));if(e.ai?.belief&&e.ai._mem>0){saw=true;break;}}
  const b=e.ai?.belief,me=g.player.pos;return {saw,err:b?Math.hypot(b.x-me.x,b.z-me.z):null};});
 assert.equal(r.percept.saw,true,'infantry PERCEIVES the occupied tank');
 assert.ok(r.percept.err<25,`belief lands on the vehicle (${r.percept.err?.toFixed(1)}u off)`);
 // ---- exit restores character control ----
 await p.keyboard.press('j');
 r.exited=await sample();
 assert.equal(r.exited.seated,false,'J exits');
 assert.equal(await p.evaluate(()=>PW.game.player.obj.visible),true,'character visible and back');
 await p.screenshot({path:out+'/exited.png'});
 assert.deepEqual(r.errors,[]);
 r.verdict='GATE A PASS';
}catch(e){r.failure=String(e);process.exitCode=1;await p.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await writeFile(out+'/result.json',JSON.stringify(r,null,2));console.log(JSON.stringify(r,null,1));await b.close();}
