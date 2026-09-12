import test from 'node:test';
import assert from 'node:assert/strict';
import {SCOUT_DRIVE,stepGroundDrive,haltDrive,initDriveState} from '../src/engine/ground-driving.js';
import {accelTrial,brakeTrial,reverseTrial,brakeThenReverseTrial,steerTrial,dtIndependence,collisionTrial,makeRig,drive} from './operation-driving.mjs';

// A fresh kinematic state for the pure model.
const S=()=>initDriveState({});
// Advance the pure model `seconds` at fixed dt, returning the state.
function sim(state,intent,dt,seconds){const n=Math.round(seconds/dt);for(let i=0;i<n;i++)stepGroundDrive(state,intent,dt,SCOUT_DRIVE);return state;}
const speed=s=>Math.hypot(s.vx,s.vz);

// ---------------------------------------------------------------------------
// PURE MODEL — no world, no three.js. These pin the handling shape itself.
// ---------------------------------------------------------------------------

test('model self-proof: throttle moves the state, idle does not', ()=>{
 const a=sim(S(),{throttle:1,steer:0,brake:false},1/60,1);
 assert.ok(a.speed>1,`throttle must build speed, got ${a.speed}`);
 const b=sim(S(),{throttle:0,steer:0,brake:false},1/60,1);
 assert.equal(b.speed,0,'idle state stays at rest');
});

test('acceleration is responsive, monotonic and capped at top speed', ()=>{
 const s=S();let prev=-1;
 for(let i=0;i<Math.round(0.75/(1/60));i++){stepGroundDrive(s,{throttle:1},1/60,SCOUT_DRIVE);assert.ok(s.speed>=prev-1e-9,'monotonic while accelerating');prev=s.speed;}
 assert.ok(s.speed>0.5*SCOUT_DRIVE.topSpeed,`>=half top within 0.75s, got ${s.speed.toFixed(2)}`);
 sim(s,{throttle:1},1/60,6);
 assert.ok(s.speed<=SCOUT_DRIVE.topSpeed+1e-6,'never exceeds top speed');
 assert.ok(s.speed>SCOUT_DRIVE.topSpeed-0.01,'reaches top speed');
});

test('acceleration/brake distances are frame-rate independent (dt-exact)', ()=>{
 // Reaching a fixed sub-top speed takes the same TIME at any dt (linear approach).
 const target=30;
 for(const dt of [1/30,1/60,1/120]){
  const s=S();let t=0;while(s.speed<target&&t<4){stepGroundDrive(s,{throttle:1},dt,SCOUT_DRIVE);t+=dt;}
  assert.ok(Math.abs(t-target/SCOUT_DRIVE.accel)<0.05,`dt ${dt.toFixed(4)} reached ${target} in ${t.toFixed(3)}s`);
 }
 // Braking from a fixed speed covers the same DISTANCE at any dt.
 const dists=[1/30,1/60,1/120].map(dt=>{
  const s=S();sim(s,{throttle:1},dt,6);let d=0,t=0;
  while(speed(s)>0.1&&t<3){const before=speed(s);stepGroundDrive(s,{throttle:0,brake:true},dt,SCOUT_DRIVE);d+=(before+speed(s))/2*dt;t+=dt;}
  return d;
 });
 assert.ok(Math.max(...dists)-Math.min(...dists)<1.2,`brake distance dt-stable within 1.2u: ${dists.map(x=>x.toFixed(2))}`);
});

test('braking decelerates faster than coasting', ()=>{
 const a=S();sim(a,{throttle:1},1/60,6);const start=a.speed;
 const b={...a};
 sim(a,{throttle:0,brake:true},1/60,0.4);
 sim(b,{throttle:0,brake:false},1/60,0.4);
 assert.ok(a.speed<b.speed,`brake ${a.speed.toFixed(2)} < coast ${b.speed.toFixed(2)}`);
 assert.ok(a.speed<start,'brake actually slows');
});

test('reverse is capped and slower than forward; S from full forward brakes then reverses', ()=>{
 const r=S();sim(r,{throttle:-1},1/60,4);
 assert.ok(r.speed<0,'S reverses');
 assert.ok(r.speed>=-SCOUT_DRIVE.reverseSpeed-1e-6,'reverse capped');
 assert.ok(Math.abs(r.speed)<SCOUT_DRIVE.topSpeed,'reverse slower than forward top');
 // From full forward, hold S: forward must reach 0 (brake) before going negative.
 const f=S();sim(f,{throttle:1},1/60,6);let crossed=null,t=0;
 for(let i=0;i<Math.round(4/(1/60));i++){stepGroundDrive(f,{throttle:-1},1/60,SCOUT_DRIVE);t+=1/60;if(crossed===null&&f.speed<=0)crossed=t;}
 assert.ok(crossed!==null&&crossed<1.3,`S brakes to stop from top in <1.3s (${crossed})`);
 assert.ok(f.speed<-1,'then continues into reverse');
});

test('steering is speed-sensitive: tighter at a moderate speed than at top', ()=>{
 // Achieved steady yaw rate at a moderate rolling speed vs at top, full lock.
 const yawRateAtSpeed=(targetSpeed)=>{
  const th=Math.min(1,targetSpeed/SCOUT_DRIVE.topSpeed);               // hold this speed, don't keep accelerating
  const s=S();sim(s,{throttle:th},1/60,6);                             // settle at ~targetSpeed
  const held=s.speed;sim(s,{throttle:th,steer:1},1/60,0.6);            // ease steer in
  const y0=s.yaw;sim(s,{throttle:th,steer:1},1/60,0.4);
  return {rate:(s.yaw-y0)/0.4,held};
 };
 const mod=yawRateAtSpeed(18);                 // rolling, high authority
 const fast=yawRateAtSpeed(SCOUT_DRIVE.topSpeed-1);
 assert.ok(mod.held<fast.held,`moderate sample slower than top (${mod.held.toFixed(1)} < ${fast.held.toFixed(1)})`);
 assert.ok(Math.abs(mod.rate)>Math.abs(fast.rate)*1.2,`tighter turn at moderate speed: ${Math.abs(mod.rate).toFixed(3)} > 1.2x ${Math.abs(fast.rate).toFixed(3)}`);
});

test('steering matches the screen: D (right,+1) turns the nose to world -X, A (left,-1) to +X', ()=>{
 // Travel is x=sin(yaw), z=cos(yaw); screen-right under the chase cam is world -X,
 // so steer-right MUST decrease yaw (move the nose toward -X). Guards the inversion bug.
 const d=S(); sim(d,{throttle:1},1/60,1); sim(d,{throttle:1,steer:1},1/60,0.5);
 assert.ok(d.yawVel<0 && Math.sin(d.yaw)<0, `D must steer toward -X (screen-right): yawVel ${d.yawVel.toFixed(3)}, noseX ${Math.sin(d.yaw).toFixed(3)}`);
 const a=S(); sim(a,{throttle:1},1/60,1); sim(a,{throttle:1,steer:-1},1/60,0.5);
 assert.ok(a.yawVel>0 && Math.sin(a.yaw)>0, `A must steer toward +X (screen-left): yawVel ${a.yawVel.toFixed(3)}, noseX ${Math.sin(a.yaw).toFixed(3)}`);
});

test('a standing scout cannot pivot in place (roll authority floor)', ()=>{
 const s=S();const y0=s.yaw;sim(s,{throttle:0,steer:1},1/60,0.5);
 assert.ok(Math.abs(s.yaw-y0)<0.12,`near-zero heading change at rest, got ${(s.yaw-y0).toFixed(3)}`);
});

test('releasing steer self-centers the wheel and damps yaw', ()=>{
 const s=S();sim(s,{throttle:1},1/60,3);sim(s,{throttle:1,steer:1},1/60,0.6);
 assert.ok(Math.abs(s.yawVel)>0.2,'turning');
 sim(s,{throttle:1,steer:0},1/60,0.6);
 assert.ok(Math.abs(s.steerSmooth)<0.05,'steer returns to center');
 assert.ok(Math.abs(s.yawVel)<0.1,'yaw damps out');
});

test('model never leaves a NaN in the state (bad dt / poisoned input)', ()=>{
 const s=S();sim(s,{throttle:1},1/60,2);const snap={...s};
 stepGroundDrive(s,{throttle:1},NaN,SCOUT_DRIVE);           // bad dt: no-op
 assert.deepEqual({speed:s.speed,yaw:s.yaw,vx:s.vx,vz:s.vz},{speed:snap.speed,yaw:snap.yaw,vx:snap.vx,vz:snap.vz});
 stepGroundDrive(s,{throttle:NaN,steer:NaN},1/60,SCOUT_DRIVE);
 for(const k of ['speed','yaw','vx','vz','steerSmooth','yawVel'])assert.ok(Number.isFinite(s[k]),`${k} finite`);
 const bad=initDriveState({speed:NaN,vx:NaN});stepGroundDrive(bad,{throttle:1},1/60,SCOUT_DRIVE);
 for(const k of ['speed','yaw','vx','vz'])assert.ok(Number.isFinite(bad[k]),`recovered ${k}`);
});

test('haltDrive zeroes momentum but keeps heading', ()=>{
 const s=S();sim(s,{throttle:1,steer:1},1/60,2);const yaw=s.yaw;haltDrive(s);
 assert.equal(s.speed,0);assert.equal(s.vx,0);assert.equal(s.vz,0);assert.equal(s.yawVel,0);assert.equal(s.yaw,yaw,'heading preserved');
});

// ---------------------------------------------------------------------------
// TRIAL METRICS — the full ScoutDriving through the convoy on a stub world.
// Bounds, not exact values, so tuning has headroom without going silently bad.
// ---------------------------------------------------------------------------

test('trial: responsive acceleration to a real top speed', async()=>{
 const a=await accelTrial(1/60);
 assert.ok(a.top>40&&a.top<70,`top speed in band: ${a.top}`);
 assert.ok(a.t90<1.8,`reaches 90% quickly: ${a.t90}s`);
 assert.ok(a.d90<45,`short pickup distance: ${a.d90}u`);
});

test('trial: controlled braking distance from top', async()=>{
 const b=await brakeTrial(1/60);
 assert.ok(b.stopTime<1.2&&b.stopDist<30,`firm stop ${b.stopTime}s / ${b.stopDist}u`);
});

test('trial: reverse cap and brake-then-reverse feel', async()=>{
 const r=await reverseTrial(1/60);
 assert.ok(r.topReverse<-10&&r.topReverse>-30,`reverse capped: ${r.topReverse}`);
 const br=await brakeThenReverseTrial(1/60);
 assert.ok(br.timeToStop<1.4,`S stops from full forward in <1.4s: ${br.timeToStop}`);
 assert.ok(br.finalReverse<-5,`then reverses: ${br.finalReverse}`);
});

test('trial: high-speed turn is controlled (bounded radius, no spin-out)', async()=>{
 const s=await steerTrial(1/60);
 assert.ok(Math.abs(s.yawRate)>0.2,`turns at speed: ${s.yawRate}`);
 assert.ok(s.turnRadius!==null&&s.turnRadius>40&&s.turnRadius<160,`sane radius at top: ${s.turnRadius}u`);
});

test('trial: no large frame-time dependence (straight and curved)', async()=>{
 const d=await dtIndependence();
 assert.ok(d.straightDistSpread<3,`straight distance dt-stable: ${d.straightDistSpread}u`);
 assert.ok(d.curvePosSpread<6,`curved path dt-stable: ${d.curvePosSpread}u`);
 assert.ok(d.curveYawSpread<0.1,`heading dt-stable: ${d.curveYawSpread}rad`);
});

test('trial: fast motion never tunnels through cover at coarse or fine dt', async()=>{
 for(const dt of [1/30,1/60,1/120]){
  const c=await collisionTrial(dt);
  assert.ok(c.penetration<0,`dt ${c.dt}: hull stops short of the wall (pen ${c.penetration})`);
  assert.ok(Math.abs(c.stoppedSpeed)<0.01,`dt ${c.dt}: dead stop at the wall`);
 }
});

test('trial: a wall stops the scout on water and cliff edges too', async()=>{
 // Water ahead: _surface returns null -> stop before it.
 const rig=await makeRig();await rig.ready;const v=rig.convoy.vehicles[0];
 const z0=v.cover.z;rig.world.waterAt=(x,z)=>z>z0+30;rig.convoy.driving.enter(v,rig.player);v.yaw=0;v.terrain=[];rig.convoy._ground(v);
 drive(rig,{dt:1/60,keys:['KeyW'],frames:400});
 assert.ok(v.cover.z<z0+32,`stops at the waterline (z=${v.cover.z.toFixed(1)} < ${z0+32})`);
 rig.convoy.dispose();
});
