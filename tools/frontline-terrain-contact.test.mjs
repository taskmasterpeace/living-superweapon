import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {World} from '../src/engine/world.js';
import {sweepSplitObstacle} from '../src/engine/projectile-contact.js';
import {earliestOrdinaryContact} from '../src/engine/attack-interception.js';
import {Projectiles} from '../src/engine/projectiles.js';
function world(){const w=Object.create(World.prototype);Object.assign(w,{_gseg:2,_ghArena:10,_ghTriangles:true,_gh:new Float32Array([75,75,75,75,100,75,75,75,75]),cover:[],interiors:[]});return w;}
const p=(x,y,z)=>new THREE.Vector3(x,y,z);
test('native projectile sweep catches a raised ridge even when both segment endpoints are above ground',()=>{
 const w=world(),out={};assert.equal(sweepSplitObstacle(w,p(-10,85,0),p(10,85,0),0,out),true);assert.equal(out.kind,'ground');assert.ok(Math.abs(out.t-.2)<1e-6);
 assert.equal(sweepSplitObstacle(w,p(-10,120,0),p(10,120,0),0,out),false);
 assert.equal(sweepSplitObstacle(w,p(-10,85,0),p(10,85,0),0,out,false),false);
 assert.equal(sweepSplitObstacle(w,p(0,120,0),p(0,80,0),0,out),true);assert.ok(Math.abs(out.t-.5)<1e-6);
});
test('beam clipping and ordinary projectile arbitration agree on the first rendered terrain triangle',()=>{
 const w=world(),a=p(-10,90,-10),b=p(10,90,10),game={world:w,entities:[],scene:new THREE.Scene(),audio:{},vfx:{borrowLight:()=>new THREE.PointLight(),returnLight(){}}};
 const hit=earliestOrdinaryContact({pos:a,radius:0,ground:true,caster:{},life:10},b,1,game);assert.equal(hit?.kind,'ground');assert.ok(Math.abs(hit.t-.4)<1e-6);
 const beam=new Projectiles(game).spawnBeam({def:{},pos:a,aim3:p(1,0,1),muzzle(out){return out.copy(this.pos);}},{});beam.radius=0;
 try{assert.equal(beam._clipStreamSegment(w,a,b),true);assert.ok(Math.abs(b.x+2)<1e-6);assert.ok(Math.abs(b.z+2)<1e-6);}finally{beam._dispose(game);}
});

function combat(){
 const noop=()=>{},explosions=[],w=world();w.shake=w.punch=noop;
 const game={world:w,scene:new THREE.Scene(),entities:[],time:0,isFoe:()=>false,nearestFoe:()=>null,noise:noop,
  audio:{boom:noop,zap:noop},particles:{burst:noop,spawn:noop},areaDamage:noop,
  vfx:{borrowLight:()=>new THREE.PointLight(),returnLight:noop,explode:pos=>explosions.push(pos.clone()),flash:noop,ring:noop}};
 const caster={def:{},alive:true,team:1,powerBuff:1,ki:1e6,maxKi:1e6,spendKi:()=>true,pos:p(-10,85,0),aim3:p(1,0,0),vel:p(0,0,0),muzzle(out){return out.copy(this.pos);}};
 return {game,caster,explosions,manager:new Projectiles(game)};
}
for(const hz of [30,60,120])test(`production unprioritized shots stop and explode on the raised surface at ${hz}Hz`,()=>{
 const f=combat(),shot=f.manager.spawnProjectile(f.caster,{pos:f.caster.pos.clone(),vel:p(6000,0,0),radius:.2,ground:true,damage:10});
 f.manager.update(1/hz,f.game);
 assert.equal(shot.dead,true);assert.equal(f.manager.list.length,0);assert.equal(f.explosions.length,1);
 const at=f.explosions[0];assert.ok(at.x<0&&at.x>-10);assert.ok(Math.abs(at.y-f.game.world.heightAt(at.x,at.z)-.2)<1e-6,'impact effect must not teleport to y=0');
});
test('a launched star sphere sweeps raised terrain and keeps its shockwave at the contact floor',()=>{
 const f=combat(),waves=[];f.game.overlapFoe=()=>null;f.game.vfx.shockwave=at=>waves.push(at.clone());f.caster.aim=p(1,0,0);
 const orb=f.manager.spawnGrowingOrb(f.caster,{minR:1,maxR:10});orb.pos.set(-10,85,0);orb.launch();orb.vel.set(6000,0,0);
 try{f.manager.update(1/60,f.game);assert.equal(orb.dead,true);assert.equal(waves.length,1);const at=waves[0];assert.ok(Math.abs(at.y-f.game.world.heightAt(at.x,at.z)-.2)<1e-6);}finally{orb._dispose(f.game);}
});
for(const hz of [30,60,120])test(`live beam packets terminate at the raised ridge through emission and release at ${hz}Hz`,()=>{
 const f=combat(),beam=f.manager.spawnBeam(f.caster,{radius:.2,tipSpeed:6000,maxLen:100,dps:20});
 try{
  for(let i=0;i<hz/3;i++){f.game.time+=1/hz;f.manager.update(1/hz,f.game);assert.equal(beam.blocked,true);assert.ok(beam.tip.position.x<0);assert.ok(Math.abs(beam.tip.position.y-f.game.world.heightAt(beam.tip.position.x,beam.tip.position.z)-.1)<.001);}
  beam.end();for(let i=0;i<hz/4;i++){f.game.time+=1/hz;f.manager.update(1/hz,f.game);for(let j=0;j<beam.pn;j++)assert.ok(beam.path[j*3]<0,'retired tail cannot leak behind the ridge');}
 }finally{beam._dispose(f.game);}
});
test('delayed ground payload retains surface contact through its fuse, including the elevated shockwave',()=>{
 const f=combat(),waves=[];f.game.world._gh.fill(75);f.game.vfx.shockwave=at=>waves.push(at.clone());
 const shot=f.manager.spawnProjectile(f.caster,{pos:p(0,78,0),vel:p(0,-60,0),radius:1,ground:true,armDelay:.05,shock:true});
 try{for(let i=0;i<30&&!shot.dead;i++)f.manager.update(1/120,f.game);assert.equal(shot.dead,true);assert.equal(waves.length,1);assert.equal(waves[0].y,75.2);}finally{shot._dispose(f.game);}
});
test('star spheres enter native below-sea-level craters before detonating, without a y=0 trigger',()=>{
 const f=combat();f.game.world._gh.fill(-5);f.game.overlapFoe=()=>null;f.game.vfx.shockwave=()=>{};f.caster.aim=p(1,0,0);
 const orb=f.manager.spawnGrowingOrb(f.caster,{minR:1,maxR:10});orb.pos.set(0,5,0);orb.launch();orb.vel.set(0,-60,0);
 try{for(let i=0;i<30&&!orb.dead;i++)f.manager.update(1/120,f.game);assert.equal(orb.dead,true);assert.equal(f.explosions.length,1);assert.ok(Math.abs(f.explosions[0].y+4)<1e-6);}finally{orb._dispose(f.game);}
});
test('airborne delayed expiry above a crater stays airborne instead of creating a false ground impact',()=>{
 const f=combat(),waves=[];f.game.world._gh.fill(-5);f.game.vfx.shockwave=at=>waves.push(at.clone());
 const shot=f.manager.spawnProjectile(f.caster,{pos:p(0,1,0),vel:p(0,0,0),radius:1,ground:false,armDelay:.05,life:.02,shock:true});
 try{for(let i=0;i<30&&!shot.dead;i++)f.manager.update(1/120,f.game);assert.equal(shot.dead,true);assert.equal(waves.length,0);assert.equal(f.explosions[0].y,1);}finally{shot._dispose(f.game);}
});
