// Fixed driving-trial harness for the scout car. Drives the REAL ScoutDriving
// through FrontlineConvoy on a stubbed flat world, scripting native WASD/Space
// input each frame exactly as the game routes it. Reused for before/after
// comparison and by tools/operation-driving.test.mjs. No world/render needed.
//
// Units are engine units (u) and seconds (s); no real-world units are invented.
// Speeds/distances are whatever the controller produces — reported, not assumed.
import * as T from 'three';
import {Input} from '../src/core/input.js';
import {FrontlineConvoy} from '../src/engine/frontline-convoy.js';

const noop=()=>{};

// A flat, cover-free stub theatre matching the scout-driving unit test's shape.
export function makeRig({ground=4, cover=[]}={}){
 const world={
  cover:[...cover],coverAll:[...cover],ARENA:4000,
  heightAt:()=>ground,waterAt:()=>false,
  refreshFogBoxes:noop,shake:noop,punch:noop,_fades:new Map(),
 };
 const player={alive:true,team:0,pos:new T.Vector3(),vel:new T.Vector3(),obj:new T.Group(),slots:{},radius:2,flying:false,
  def:{archetype:'soldier',flightTier:0},_openSky:true};
 const g={world,player,entities:[player],scene:new T.Scene(),running:true,paused:false,matchOver:false,
  time:0,ms:{frontline:{}},particles:{burst:noop},vfx:{flash:noop,scorch:noop},audio:{boom:noop},
  areaDamage:noop,input:new Input(),hud:null,combatOverlayOpen:false};
 const asset=new T.Group();
 const hull=new T.Mesh(new T.BoxGeometry(2.4,2.2,5.3),new T.MeshStandardMaterial());hull.position.y=1.1;asset.add(hull);
 const convoy=new FrontlineConvoy({g,_cover:[]},{loader:{loadAsync:async()=>({scene:asset})}});
 return {g,world,player,convoy,ready:convoy.loading.then(()=>convoy)};
}

// One driven frame: set held keys, route through handleInput, advance the game
// clock by dt, then convoy.update() (which computes dt from the clock and calls
// driving.update). Mirrors the real per-frame order in main/game.
export function frame(rig,dt,keys=[]){
 const g=rig.g;
 g.input.keys=new Set(keys);
 g.input.justPressed=new Set();
 rig.convoy.driving.handleInput(g.input);
 g.time+=dt;
 rig.convoy.update();
 g.input.endFrame();
}

function speedOf(v){return v.speed||0;}
function posOf(v){return {x:v.cover.x,z:v.cover.z};}

// Drive with a fixed key set until `until(v,t,i)` is true or maxFrames elapse.
// Returns the trajectory samples for analysis.
export function drive(rig,{dt,keys,frames,until}){
 const v=rig.convoy.vehicles[0];
 const start=posOf(v);let t=0;const samples=[];
 for(let i=0;i<frames;i++){
  frame(rig,dt,keys);t+=dt;
  const p=posOf(v);
  samples.push({t,x:p.x,z:p.z,yaw:v.yaw,speed:speedOf(v),dist:Math.hypot(p.x-start.x,p.z-start.z)});
  if(until&&until(v,t,i))break;
 }
 return {start,samples,end:samples[samples.length-1]};
}

// ---- Trials --------------------------------------------------------------

export async function accelTrial(dt=1/60){
 const R=await makeRig();await R.ready;
 const v=R.convoy.vehicles[0];R.convoy.driving.enter(v,R.player);
 // Settle top speed: hold W long enough to plateau.
 const run=drive(R,{dt,keys:['KeyW'],frames:Math.ceil(8/dt)});
 const top=run.samples.reduce((m,s)=>Math.max(m,s.speed),0);
 // Time/distance to reach 90% of top from a clean restart.
 const R2=await makeRig();await R2.ready;const v2=R2.convoy.vehicles[0];R2.convoy.driving.enter(v2,R2.player);
 let t90=null,d90=null;
 const acc=drive(R2,{dt,keys:['KeyW'],frames:Math.ceil(8/dt),until:(vv,t)=>{
  if(t90===null&&(vv.speed||0)>=0.9*top){t90=t;return false;}return false;}});
 for(const s of acc.samples)if(s.speed>=0.9*top){d90=s.dist;break;}
 R.convoy.dispose();R2.convoy.dispose();
 return {top:+top.toFixed(3),t90:t90&&+t90.toFixed(3),d90:d90&&+d90.toFixed(2)};
}

export async function brakeTrial(dt=1/60){
 const R=await makeRig();await R.ready;const v=R.convoy.vehicles[0];R.convoy.driving.enter(v,R.player);
 drive(R,{dt,keys:['KeyW'],frames:Math.ceil(6/dt)});           // reach top
 const entry=speedOf(v);const p0=posOf(v);let t=0,stopped=null;
 for(let i=0;i<Math.ceil(6/dt);i++){frame(R,dt,['Space']);t+=dt;if(Math.abs(speedOf(v))<0.05){stopped=t;break;}}
 const dist=Math.hypot(v.cover.x-p0.x,v.cover.z-p0.z);
 R.convoy.dispose();
 return {entry:+entry.toFixed(3),stopTime:stopped&&+stopped.toFixed(3),stopDist:+dist.toFixed(2)};
}

export async function reverseTrial(dt=1/60){
 const R=await makeRig();await R.ready;const v=R.convoy.vehicles[0];R.convoy.driving.enter(v,R.player);
 const run=drive(R,{dt,keys:['KeyS'],frames:Math.ceil(6/dt)});
 const topRev=run.samples.reduce((m,s)=>Math.min(m,s.speed),0);
 let tRev=null;for(const s of run.samples)if(s.speed<=0.9*topRev){tRev=s.t;break;}
 R.convoy.dispose();
 return {topReverse:+topRev.toFixed(3),t90:tRev&&+tRev.toFixed(3)};
}

// Brake-then-reverse from full forward on the S key (intuitive: S stops you, then reverses).
export async function brakeThenReverseTrial(dt=1/60){
 const R=await makeRig();await R.ready;const v=R.convoy.vehicles[0];R.convoy.driving.enter(v,R.player);
 drive(R,{dt,keys:['KeyW'],frames:Math.ceil(6/dt)});
 let crossedZero=null,t=0;const entry=speedOf(v);
 for(let i=0;i<Math.ceil(6/dt);i++){frame(R,dt,['KeyS']);t+=dt;if(crossedZero===null&&speedOf(v)<=0){crossedZero=t;}}
 const finalRev=speedOf(v);
 R.convoy.dispose();
 return {entry:+entry.toFixed(3),timeToStop:crossedZero&&+crossedZero.toFixed(3),finalReverse:+finalRev.toFixed(3)};
}

// Yaw rate + turn radius at cruising speed (W+D held). Also reports lateral slip.
export async function steerTrial(dt=1/60){
 const R=await makeRig();await R.ready;const v=R.convoy.vehicles[0];R.convoy.driving.enter(v,R.player);
 drive(R,{dt,keys:['KeyW'],frames:Math.ceil(4/dt)});           // reach cruise
 const cruise=speedOf(v);
 const y0=v.yaw;const samples=[];let t=0;const p0=posOf(v);
 for(let i=0;i<Math.ceil(2/dt);i++){frame(R,dt,['KeyW','KeyD']);t+=dt;samples.push({t,yaw:v.yaw,x:v.cover.x,z:v.cover.z,speed:speedOf(v)});}
 // Steady-state yaw rate over the last second.
 const late=samples.filter(s=>s.t>=1);
 const yawRate=late.length>1?(late[late.length-1].yaw-late[0].yaw)/(late[late.length-1].t-late[0].t):0;
 const radius=yawRate?Math.abs(speedOf(v)/yawRate):Infinity;
 R.convoy.dispose();
 return {cruise:+cruise.toFixed(3),yawRate:+yawRate.toFixed(4),turnRadius:isFinite(radius)?+radius.toFixed(2):null};
}

// Frame-time independence: same held input across dt, compare outcome.
export async function dtIndependence(){
 const dts=[1/120,1/60,1/30];
 const straight=[];const curve=[];
 for(const dt of dts){
  const R=await makeRig();await R.ready;const v=R.convoy.vehicles[0];R.convoy.driving.enter(v,R.player);
  drive(R,{dt,keys:['KeyW'],frames:Math.round(2/dt)});
  straight.push({dt,dist:+Math.hypot(v.cover.x,v.cover.z).toFixed(2),speed:+speedOf(v).toFixed(3)});
  R.convoy.dispose();
  const R2=await makeRig();await R2.ready;const v2=R2.convoy.vehicles[0];R2.convoy.driving.enter(v2,R2.player);
  drive(R2,{dt,keys:['KeyW'],frames:Math.round(2/dt)});
  drive(R2,{dt,keys:['KeyW','KeyD'],frames:Math.round(1.5/dt)});
  curve.push({dt,x:+v2.cover.x.toFixed(2),z:+v2.cover.z.toFixed(2),yaw:+v2.yaw.toFixed(3)});
  R2.convoy.dispose();
 }
 const dSpread=Math.max(...straight.map(s=>s.dist))-Math.min(...straight.map(s=>s.dist));
 const yawSpread=Math.max(...curve.map(c=>c.yaw))-Math.min(...curve.map(c=>c.yaw));
 const posSpread=Math.max(...curve.map(c=>Math.hypot(c.x-curve[0].x,c.z-curve[0].z)));
 return {straight,curve,straightDistSpread:+dSpread.toFixed(2),curveYawSpread:+yawSpread.toFixed(3),curvePosSpread:+posSpread.toFixed(2)};
}

// Collision: a wall dz ahead; W into it at coarse & fine dt; car must never pass it.
export async function collisionTrial(dt=1/60){
 const R=await makeRig();await R.ready;const v=R.convoy.vehicles[0];
 const z0=v.cover.z,wallZ=z0+40;
 R.world.cover.push({x:v.cover.x,z:wallZ,hx:80,hz:1,bottom:0,top:60});
 R.convoy.driving.enter(v,R.player);v.yaw=0;v.terrain=[];R.convoy._ground(v);
 drive(R,{dt,keys:['KeyW'],frames:Math.ceil(6/dt)});
 const frontFace=wallZ-1;                        // near face of the wall
 const carFront=v.cover.z+v.cover.hz;            // leading edge of the hull
 R.convoy.dispose();
 return {dt:+dt.toFixed(4),wallNearFace:+frontFace.toFixed(2),carFront:+carFront.toFixed(2),penetration:+(carFront-frontFace).toFixed(3),stoppedSpeed:+speedOf(v).toFixed(3)};
}

export async function runAll(){
 const out={};
 out.accel_60=await accelTrial(1/60);
 out.brake_60=await brakeTrial(1/60);
 out.reverse_60=await reverseTrial(1/60);
 out.brakeThenReverse_60=await brakeThenReverseTrial(1/60);
 out.steer_60=await steerTrial(1/60);
 out.dt=await dtIndependence();
 out.collision_30=await collisionTrial(1/30);
 out.collision_120=await collisionTrial(1/120);
 return out;
}

if(import.meta.url===`file://${process.argv[1].replace(/\\/g,'/')}`||process.argv[1]?.endsWith('operation-driving.mjs')){
 runAll().then(o=>{console.log(JSON.stringify(o,null,2));}).catch(e=>{console.error(e);process.exit(1);});
}
