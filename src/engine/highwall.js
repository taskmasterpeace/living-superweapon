import * as THREE from 'three';
import {characterSees} from './character-sight.js';
import {highwallLayout} from '../data/highwall.js';
import {createSoldierFamilyDefinition,SOLDIER_PRESETS,soldierLoadout} from '../data/soldier-family.js';
import {zombieDefinition} from '../data/zombie-encounter.js';
import {ROSTER} from '../data/characters.js';
import {BANDS} from '../core/util.js';
import {AI} from './ai.js';
import {HighwallNavigation} from './highwall-navigation.js';
import {routeHighwallIntent} from './highwall-routing.js';
import {buildHighwallGeometry} from './highwall-geometry.js';
import {highwallLoading} from './highwall-loading.js';
import {HIGHWALL_SCENARIOS,zombieSpawns} from '../data/highwall-scenarios.js';
import {HighwallInfection} from './highwall-infection.js';
import {HighwallInteractables} from './highwall-interactables.js';
import {HighwallLoot,snapshotInventory,restoreInventory} from './highwall-loot.js';
import {writeHighwallSave,readHighwallSave} from './highwall-save.js';
import {HighwallDoor} from './highwall-door.js';
import {HIGHWALL_FLEET_PRESETS} from '../data/highwall-fleet.js';
import {spawnHighwallFleet} from './highwall-fleet.js';
import {OPERATION_GADGETS} from '../data/operation-gadgets.js';

export async function launchHighwall(g,preset='corridor',options={}){
 if(!HIGHWALL_SCENARIOS[preset])throw Error('Unknown Highwall preset');
 const loading=highwallLoading();await loading.frame();
 try{
 loading.stage('Building battlefield, collision and routes');
 g.startMode('training',{p1:'sol'});
 g.world.setSim(false);
 for(const f of g.entities){g.scene.remove(f.obj);f.dispose?.();}
 g.entities.length=0;g.humans.length=0;
 const scope=new Highwall(g,preset,options);g._highwall=scope;
 loading.stage('Deploying soldiers and equipment');await loading.frame();
 if(options.resume)scope.restoreSession(options.resume);else scope.spawn();scope.mountPanel();
 g.modeId='powerworld';g.ms={chaseCam:true,noRespawn:true,highwall:true};
 g.mode={tick:(_,dt)=>scope.tick(dt),onKO(){},isOver(){return null;},hud(){return {type:'training'};}};
 g.running=true;g.paused=false;
 g.hud.hideTitle?.();
 for(const id of ['pwTitle','title']){const el=document.getElementById(id);if(el)el.style.display='none';}
 document.body.classList.add('playing');
 if(scope.scenario.vehicle){
  loading.stage('Loading player-drivable vehicle');
  scope.ready=false;
  try{const vehicle=await spawnHighwallFleet(g,scope.scenario.vehicle,{scope});if(g._highwall===scope){scope.vehicle=vehicle;scope.tank=vehicle;scope.ready=!!vehicle;scope.tick();}}
  catch(e){if(g._highwall===scope){scope.error=`Vehicle unavailable: ${e.message}`;scope.tick();}console.error(e);}
 }
 loading.stage('Preparing recorded gameplay audio');
 g.audio.init();await g.audio.prepareSamples();await g.audio.soundLibrary.prepare();
 await loading.frame();loading.close();
 return scope;
 }catch(error){loading.fail(error);throw error;}
}

export class Highwall {
 constructor(g,preset,options){
  this.g=g;this.preset=preset;this.scenario=HIGHWALL_SCENARIOS[preset];this.options={...options};this.started=false;this.ready=true;this.units=[];this.infection=new HighwallInfection(this);
  this.layout=highwallLayout(options.layout);this.saved={};this.hidden=[];const w=g.world;
  this.previousVision={fov:g.fov,characterVisibility:g.characterVisibility};
  g.fov=true;g.characterVisibility=true;
  for(const key of ['cover','coverAll','cameraObstacles','interiors','rocks','cars','planes','treeSpots','ARENA','heightAt','waterAt','_ghTriangles','crater','flattenGrass'])this.saved[key]=w[key];
  for(const o of g.scene.children)if(!o.isLight&&!o.isPoints){this.hidden.push([o,o.visible]);o.visible=false;}
  this.background=g.scene.background;this.fog=g.scene.fog;
  g.scene.background=new THREE.Color(0xb4bcae);g.scene.fog=new THREE.FogExp2(0xb4bcae,.00045);
  this.peds=g.peds;this.police=g.police;g.peds=null;g.police=null;
  for(const key of ['interiors','rocks','cars','planes','treeSpots'])w[key]=[];
  w.ARENA=1100;w.heightAt=()=>0;w.waterAt=()=>0;w._ghTriangles=false;w.crater=()=>{};w.flattenGrass=()=>{};
  g._bands0={...BANDS};BANDS.ceiling=Math.max(BANDS.ceiling,900);BANDS.sky=Math.max(BANDS.sky,420);
  this.rebuild(this.layout);
  this.loot=new HighwallLoot(g);
  this.devices=new HighwallInteractables(g,{positions:{monitor:{x:220,y:10,z:230},speaker:{x:241,y:10,z:230},screen:{x:262,y:10,z:230}},door:this.layout.pieces.find(p=>p.id==='service-gate'),doorController:this.door,onNoise:(pos,loud)=>g.noise(pos,loud)});
 }
 // Authored data is the only authoring surface. One rebuild replaces all three consumers.
 rebuild(layout){
  const group=buildHighwallGeometry({...layout,pieces:layout.pieces.filter(p=>p.id!=='service-gate')});
  const solids=layout.pieces.map(p=>({...p,h:p.top,finiteBuilding:true,projectileShape:'box',buildingRole:p.kind==='step'?'step':undefined,standable:p.kind==='step'||p.kind==='deck'}));
  const nav=new HighwallNavigation({bounds:layout.bounds,solids,revision:layout.revision});
  if(this.units.some(f=>f.alive&&f.pos.y<3&&!nav.isClear(f.pos,{radius:Math.max(.5,(f.radius||2.2)-.01),height:12*(f.sizeScale||1)}))){
   group.userData.dispose();throw Error('Highwall rebuild overlaps an actor. Reset the scenario with the new placement data.');
  }
  this.group?.userData.dispose();this.group=group;this.layout=layout;this.nav=nav;
  this.g.world.cover=solids;this.g.world.coverAll=solids;this.g.scene.add(group);
  this.g.world._fitFog?.({arena:350});this.g.world.refreshFogBoxes?.();
  // Decorative sign planes obstruct framing, but are not bulletproof walls.
  this.g.world.cameraObstacles=layout.signs.map(s=>({x:s.x,z:s.z,hx:s.w/2,hz:.15,bottom:s.y-s.w/8,top:s.y+s.w/8,h:s.y+s.w/8,finiteBuilding:true}));
  const gate=layout.pieces.find(p=>p.id==='service-gate'),open=this.door?.open||false;this.door?.dispose();this.door=null;
  if(gate)this.door=new HighwallDoor({scene:this.g.scene,box:gate,open,actors:()=>this.g.entities,onProgress:(_,__,collider)=>{
   const index=this.g.world.cover.findIndex(p=>p.id==='service-gate');if(index>=0)this.g.world.cover[index]=collider;
   this.g.world.refreshFogBoxes?.();
   this.nav.replace(this.g.world.cover,this.nav.revision+1);for(const f of this.units)delete f._highwallRoute;
  },onBlocked:message=>this.g.hud.feed(message)});
  if(this.devices)this.devices.doorController=this.door;
  for(const f of this.units)delete f._highwallRoute;
 }
 add(def,team,p,human=false){
  const g=this.g,f=g.addFighter(def,{team,x:p.x,z:p.z,isPlayer:human});
  f.pos.y=p.y||0;f.obj.position.copy(f.pos);f.noRespawn=true;f._openSky=true;f._chaseKb=true;
  f._highwallUnit=true;f._highwallLifeId=`unit:${this.unitSerial=(this.unitSerial||0)+1}`;f._encounterNPC=true;f.persistCorpse=!def.loadoutId&&def.vocalFamily!=='zombie';this.units.push(f);
  if(def.loadoutId&&!this.restoring)g.equipFrom(f,soldierLoadout(def),{primary:true});
  if(human){f.human=true;f.scheme='kbm';f.pnum=1;g.player=f;g.humans.push({fighter:f,scheme:'kbm'});g.hud.setPlayer(def);}
  else f.ai=new AI(f,1);
  return f;
 }
 soldier(index,team,p,human=false){
  const items=OPERATION_GADGETS.filter(d=>d.kind==='medkit'||d.kind==='shieldpack').map(d=>structuredClone(d));
  return this.add({...createSoldierFamilyDefinition({...SOLDIER_PRESETS[index%4],id:`hw-${team}-${index}`,faction:team?'Red':'Blue',team}),items,highwallBiological:true},team,p,human);
 }
 spawn(){
  const l=this.layout,g=this.g;
  if(this.preset==='intercept'){
   for(let i=0;i<2;i++){const f=this.add(ROSTER.find(r=>r.id==='sol'),i,l.airStarts[i],i===0);f.flying=true;}
  }else{
   const station=HIGHWALL_FLEET_PRESETS.find(p=>p.id===this.scenario.vehicle);
   const p=station?{x:station.x+12,z:station.z}:this.preset==='systems'?l.controlPost:l.blue[0];
   if(this.scenario.player)this.add(ROSTER.find(r=>r.id===this.scenario.player),0,p,true);else this.soldier(0,0,p,true);
   for(let i=1;i<4;i++)this.soldier(i,0,l.blue[i]);
   for(let i=0;i<this.scenario.soldiers;i++)this.soldier(i,1,this.preset==='vehicle'?{x:100,z:110-i*18}:l.red[i]);
   for(const [i,p]of zombieSpawns(this.scenario.zombies).entries())this.add({...zombieDefinition(0,{sprinter:p.sprinter}),id:`hw-zombie-${i}`},2,p);
   if(this.preset==='air'||this.scenario.enemyFlyer){const f=this.add(ROSTER.find(r=>r.id==='sol'),1,l.airStarts[1]);f.flying=true;}
  }
  g.world._lookYaw=Math.PI;g.world._lookPitch=-.08;
  for(const f of this.units)f.faceDir(0,f.team?1:-1);
 }
 spawnTurned(f,n){return this.add({...zombieDefinition(),id:`hw-turned-${n}`,modularRecipe:f.def.modularRecipe?{...f.def.modularRecipe,infection:'hollow',eyeColor:'#d2cb78',emblem:'none'}:undefined},2,f.pos);}
 onKO(f){this.loot?.dropDeath(f,{sourceId:f._highwallLifeId});this.g.audio.cry(f.def.voicePitch||1,f.pos);this.g.hud.feed(`${f.name} down${f.persistCorpse?' · body remains':''}`);}
 routeIntent(f,it,dt){
  if(f.def.family==='soldier'&&!this.devices.doorOpen&&Math.hypot(f.pos.x-this.devices.door.x,f.pos.z-this.devices.door.z)<32)this.devices.toggleDoor(f,{open:true});
  const i=this.units.indexOf(f),order=f._highwallOrder;
  let objective=f.def.zombieProfile?it.navigationGoal:{x:this.layout.objective.x+(i%3)*9,z:this.layout.objective.z+Math.floor(i/3)*9};
  if(order?.kind==='hold'){it.move={x:0,z:0};return it;}
  if(order?.kind==='follow')objective={x:this.g.player.pos.x+(i%3-1)*12,z:this.g.player.pos.z+18};
  if(order?.kind==='move')objective=order.point;
  return routeHighwallIntent(this.nav,f,it,dt,objective);
 }
 interact(f){return this.devices.interact(f)||this.loot?.interact(f)||false;}
 command(kind){
  const g=this.g,p=g.player;if(!p?.alive)return;
  const allies=this.units.filter(f=>f.alive&&!f.human&&f.team===p.team&&f.def.family==='soldier');
  let point=null;
  if(kind==='move'){
   point={x:g.aimPoint.x,z:g.aimPoint.z};
   if(!this.nav.isClear(point,{radius:3,height:12})){g.hud.feed('Aim at a reachable patch of ground.');return;}
  }
  let assigned=0;
  for(const f of allies){
   if(point&&!this.nav.route(f.pos,point,{radius:f.radius||2.2,height:12}))continue;
   f._highwallOrder=kind==='advance'?null:{kind,point};delete f._highwallRoute;assigned++;
  }
  g.hud.feed(`${assigned} squadmates: ${kind==='move'?'moving to aimed ground':kind}.`);
 }
 snapshot(){
  if(this.vehicle)throw Error('Vehicle session saving is not supported yet. Save an infantry or systems scenario.');
  return {schema:1,preset:this.preset,unitSerial:this.unitSerial,started:this.started,gateOpen:this.devices.doorOpen,devices:this.devices.snapshot(),loot:this.loot.snapshot(),infectionEvents:this.infection.events,infectionSerial:this.infection.serial,
   units:this.units.filter(f=>this.g.entities.includes(f)).map(f=>({def:f.def,lifeId:f._highwallLifeId,team:f.team,human:!!f.human,pos:f.pos.toArray(),hp:f.hp,ki:f.ki,flying:!!f.flying,dead:!f.alive,retiredBody:!!f._highwallRetiredBody,persistCorpse:!!f.persistCorpse,infection:f._highwallInfection,inventory:snapshotInventory(f)}))};
 }
 save(){try{writeHighwallSave(localStorage,this.snapshot());this.g.hud.feed('Highwall session saved locally.');}catch(e){this.g.hud.feed(`Save failed: ${e.message}`);}}
 restoreSession(s){
  if(s.gateOpen){this.door.fraction=1;this.door.targetOpen=true;this.door.apply();this.devices.doorOpen=true;}
  this.restoring=true;
  try{for(const row of s.units){const f=this.add(row.def,row.team,{x:row.pos[0],y:row.pos[1],z:row.pos[2]},row.human);const result=restoreInventory(this.g,f,row.inventory);if(!result.ok)throw Error(result.reason);
   f.hp=row.hp;f.ki=row.ki;f.flying=row.flying;f.persistCorpse=row.persistCorpse;f._highwallInfection=row.infection;
   if(row.lifeId)f._highwallLifeId=row.lifeId;
   if(row.dead){f._ko();f._wasAlive=false;}
   if(row.retiredBody){f._highwallRetiredBody=true;f.persistCorpse=true;f.noRespawn=true;f._remove=false;f.obj.visible=false;}
  }}finally{this.restoring=false;}
  this.unitSerial=Math.max(this.unitSerial||0,s.unitSerial||0);this.loot.restore(s.loot);this.devices.restore(s.devices);this.infection.events=s.infectionEvents||[];this.infection.serial=s.infectionSerial||0;this.started=s.started;
  this.g.world._lookYaw=Math.PI;this.g.world._lookPitch=-.08;
 }
 tick(dt=0){
  if(this.started){
   this.infection.tick(dt);
   this.lootClock=(this.lootClock||0)-dt;
   if(this.lootClock<=0){this.lootClock=.5;for(const f of this.units){
    if(f.human||!f.alive||f.def.family!=='soldier'||(f.slots?._gear?.ammo?.reserve??Infinity)>0)continue;
    const container=this.loot.nearby(f);if(!container)continue;
    for(const entry of container.entries){if(this.loot.transfer(f,container.id,entry.id,{ammoOnly:true}).ok)break;}
   }}
  }
  this.devices?.tick(dt);
  for(const marker of this.loot?.markers.values()||[])marker.visible=characterSees(this.g,this.g.player,{pos:marker.position});
  if(!this.panel)return;
  const counts=[0,1,2].map(t=>this.units.filter(f=>f.team===t&&f.alive).length);
  const state=this.panel.querySelector('[data-state]');
  const result=this.started?(!this.g.player.alive?'PLAYER DOWN':counts[1]+counts[2]===0&&(this.scenario.soldiers+this.scenario.zombies>0)?'AREA CLEAR':'LIVE'):'READY';
  state.textContent=this.error||(this.ready?`${result} · Blue ${counts[0]} / Red ${counts[1]} / Infected ${counts[2]}`:'Loading vehicle…');
  this.panel.querySelector('[data-start]').disabled=!this.ready||this.started;
  const prompt=this.devices?.prompt(this.g.player)||(this.loot?.nearby(this.g.player)?'E · Inspect dropped equipment':'');
  this.prompt.textContent=prompt;this.prompt.hidden=!prompt;
 }
 mountPanel(){
  const panel=document.createElement('section');panel.id='highwall-controls';
  panel.innerHTML=`<style>
  #highwall-controls{position:fixed;z-index:24;top:14px;right:14px;width:min(310px,calc(100vw - 28px));padding:14px;color:#ece9da;background:oklch(.20 .015 100 / .94);border:1px solid #66644e;border-top:3px solid #e7bc4d;border-radius:10px;font:13px Inter,system-ui,sans-serif;box-shadow:0 8px 28px #0005}
  #highwall-controls strong{font:700 23px Rajdhani,Inter,sans-serif;letter-spacing:.06em;color:#f0cb67}#highwall-controls p{line-height:1.5;margin:8px 0;color:#d0d0c2}
  #highwall-controls select,#highwall-controls button{font:600 13px Inter,system-ui,sans-serif;border:1px solid #827651;border-radius:10px;padding:8px;color:#f2e9ca;background:#353a32;cursor:pointer;transition:background .2s}#highwall-controls select{width:100%;margin:10px 0}#highwall-controls button:hover{background:#565742}#highwall-controls button:disabled{opacity:.45;cursor:default}#highwall-controls [data-start]{background:#b89536;color:#141b18}#highwall-controls footer{display:flex;gap:8px}
  </style><strong>HIGHWALL</strong><p data-state></p><select aria-label="Highwall scenario">${Object.entries(HIGHWALL_SCENARIOS).map(([id,p])=>`<option value="${id}" ${id===this.preset?'selected':''}>${p.title}</option>`).join('')}</select><p>${this.scenario.goal}</p><details><summary>Controls & squad</summary><p>WASD move · mouse aim · LMB fire · R reload<br>V melee · Q guard · E interact/grab · I backpack · X gadget<br>Alt + wheel zoom · double-tap Alt orbit<br>${this.preset==='vehicle'?'J board / exit · W/S drive · A/D steer · Space brake':this.preset==='intercept'?'Space rise · C descend · Shift flight gear':'Soldiers advance toward the central junction.'}</p><button data-order="follow">Regroup</button> <button data-order="hold">Hold</button> <button data-order="advance">Advance</button></details><footer><button data-start>Start combat</button><button data-reset>Reset</button></footer>`;
  document.body.appendChild(panel);this.panel=panel;
  const note=document.createElement('p');note.textContent='Team fire: '+(this.g.friendlyFire?'enabled':'standard allied fire protection')+'. No reinforcement spawns. Reset clears the current encounter; manual saves remain available.';panel.querySelector('details').appendChild(note);
  const move=document.createElement('button');move.textContent='Move to aimed ground';move.onclick=()=>this.command('move');panel.querySelector('details').appendChild(move);
  if(this.scenario.vehicle){const help=document.createElement('p');help.textContent=this.scenario.vehicle==='helicopter'?'J board / exit · W/S forward/back · A/D turn · Space rise · Ctrl descend. Full controls appear on boarding.':'J board / exit · W/S drive · A/D steer · Space brake. Mounted weapons and AI crews are not supported.';panel.querySelector('details').appendChild(help);}
  const save=document.createElement('button');save.textContent='Save';save.onclick=()=>this.save();panel.querySelector('footer').appendChild(save);
  const resume=document.createElement('button');resume.textContent='Resume';resume.onclick=()=>{try{const s=readHighwallSave(localStorage);launchHighwall(this.g,s.preset,{resume:s});}catch(e){this.g.hud.feed(e.message);}};panel.querySelector('footer').appendChild(resume);
  this.prompt=document.createElement('div');this.prompt.id='highwall-prompt';this.prompt.style.cssText='position:fixed;bottom:150px;left:50%;transform:translateX(-50%);padding:10px 18px;border:1px solid #d9b54d;border-radius:10px;background:#252e2ded;color:#eee8ce;z-index:23;font:600 14px Inter,system-ui';document.body.appendChild(this.prompt);
  for(const event of ['pointerdown','pointerup','mousedown','mouseup','click','dblclick','wheel'])panel.addEventListener(event,e=>e.stopPropagation());
  panel.querySelector('select').onchange=e=>launchHighwall(this.g,e.target.value,{...this.options,resume:undefined});
  panel.querySelector('[data-reset]').onclick=()=>launchHighwall(this.g,this.preset,{...this.options,resume:undefined});
  panel.querySelector('[data-start]').onclick=()=>{if(this.ready)this.started=true;this.tick();};this.tick();
  for(const b of panel.querySelectorAll('[data-order]'))b.onclick=()=>this.command(b.dataset.order);
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;
  const g=this.g;this.panel?.remove();this.prompt?.remove();this.devices?.dispose();this.door?.dispose();this.loot?.dispose();this.group?.userData.dispose();
  Object.assign(g.world,this.saved);Object.assign(g,this.previousVision);g.world._fitFog?.();g.world.refreshFogBoxes?.();g.scene.background=this.background;g.scene.fog=this.fog;
  for(const [o,v]of this.hidden)o.visible=v;
  g.peds=this.peds;g.police=this.police;if(g._highwall===this)g._highwall=null;
 }
}
