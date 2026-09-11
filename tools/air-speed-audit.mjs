// Diagnostic measurement of current controllers, not a balance target or flight-feel approval.
import * as THREE from 'three';
import {mkdir,writeFile} from 'node:fs/promises';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {AircraftPiloting} from '../src/engine/aircraft-piloting.js';
import {PW_AIR} from '../src/core/util.js';
import {METERS_PER_UNIT,unitsPerSecondToKmh} from '../src/core/world-units.js';

const report={kind:'CPU controller diagnostic, staged conditions; no native input, rendering or performance claim',metersPerUnit:METERS_PER_UNIT,heroWishCap:{unitsPerSecond:PW_AIR.top,kmh:unitsPerSecondToKmh(PW_AIR.top)},heroes:[],aircraft:[]};
const speed=v=>({unitsPerSecond:Number(v.toFixed(3)),kmh:Number(unitsPerSecondToKmh(v).toFixed(3))});
// Exercise the real controller/slot payment boundary, not a source-text check.
// This characterizes existing inputs; these numbers are not desired behavior.
report.flightInputs=[];
for(const input of ['ShiftLeft','ShiftRight','pad.dash']){
 const fixture=mainCombatFixture({hero:'sol',mode:'powerworld'}),{p,g,pad}=fixture;
 try{
  Object.assign(p,{_openSky:true,flying:true,gait:'airborne'});p.pos.set(0,80,0);
  fixture.w.chase(p,null,0,'bfp');
  const initialKi=p.ki;
  if(input==='pad.dash'){pad.active=true;pad.cur.dash=true;pad.ly=-1;}
  else {g.input.keys.add('KeyW');g.input.keys.add(input);g.input.justPressed.add(input);}
  fixture.control();
  report.flightInputs.push({input,condition:'one staged input edge through native controlPlayer; no browser event dispatch',cruiseHeld:p.cruiseHeld,energySpent:Number((initialKi-p.ki).toFixed(3)),dashCooldown:Number((p.slots.shift?.cd||0).toFixed(3)),...speed(p.vel.length())});
 }finally{fixture.close();}
}
for(const hero of ['sol','vega','kano'])for(const boost of [false,true]){
 const fixture=mainCombatFixture({hero}),f=fixture.p;
 try{
  Object.assign(f,{_openSky:true,flying:true,gait:'airborne',cruiseHeld:boost});f.pos.set(0,80,0);
  const initialKi=f.ki;
  for(let i=0;i<300;i++)f.move(new THREE.Vector3(0,0,1),1/60);
  report.heroes.push({hero,condition:boost?'held cruise, no staged afterburner ignition':'ordinary powered flight',seconds:5,...speed(f.vel.length()),energySpent:Number((initialKi-f.ki).toFixed(3))});
 }finally{fixture.close();}
}
for(const kind of ['jet','helicopter']){
 const player={alive:true,team:0,def:{flightTier:0},pos:new THREE.Vector3(),vel:new THREE.Vector3(),obj:new THREE.Group(),slots:{},radius:2};
 const world={ARENA:100000,cover:[],heightAt:()=>0,waterAt:()=>false};
 const game={player,world,running:true,hud:{feed(){}}};
 const actor={kind,parked:true,pilotable:true,wrapper:new THREE.Group(),groundOffset:4,bodyRadius:12,yaw:0,velocity:new THREE.Vector3()};
 const pilot=new AircraftPiloting({game,actors:[actor]});
 if(!pilot.enter(actor,player))throw Error('Native aircraft entry failed');
 actor.wrapper.position.set(0,5000,0);actor.parked=false;pilot.throttle=1;
 for(let i=0;i<1200;i++)pilot.update(1/60);
 report.aircraft.push({kind,condition:'20 seconds full forward throttle, level air-start at 5000u, open space',...speed(actor.velocity.length()),destroyed:!!actor.destroyed});
 pilot.exit(true);
}
{
 const fixture=mainCombatFixture({hero:'sol'});
 try{
  fixture.p.pos.set(0,80,0);fixture.foe({y:80,z:100});
  const shot=fixture.g.projectiles.spawnProjectile(fixture.p,{pos:new THREE.Vector3(0,85,0),vel:new THREE.Vector3(0,0,96),homing:4.5,damage:1,life:4,radius:.1,color:'#ffd97a'});
  const launch=speed(shot.vel.length());fixture.g.projectiles.update(1/60,fixture.g);
  report.genericHoming={condition:'representative 96u/s homing shot with nearby target, not a heat-seeking aircraft missile',launch,afterFirstGuidanceStep:speed(shot.vel.length())};
 }finally{fixture.close();}
}
report.gaps=['No multi-tap cruise speed levels in the inspected controller','No dedicated aircraft/SAM seeker, motor burn, lock/cone/turn/fuel contract verified','Ordinary homing projectiles are not a substitute for military missile guidance','Camera/contact/beam travel and braking require coupled retuning before raising speed limits'];
await mkdir('artifacts/air-speed-audit',{recursive:true});
await writeFile('artifacts/air-speed-audit/current.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
