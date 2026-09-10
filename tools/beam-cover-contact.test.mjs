import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Projectiles} from '../src/engine/projectiles.js';
import {World} from '../src/engine/world.js';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';

function fixture({speed=2000,radius=.05,y=10,readable=false}={}){
 const noop=()=>{},game={scene:new THREE.Scene(),time:0,entities:[],
  world:{cover:[],interiors:[],hitInteriorWall:World.prototype.hitInteriorWall,shake:noop,punch:noop,setBlockCracks:noop},
  audio:{boom:noop,hit:noop},particles:{spawn:noop,burst:noop},slowmo:noop,isHuman:()=>false,onHit:noop,
  isFoe:(a,b)=>a.team!==b.team&&b.alive,
  vfx:{borrowLight:()=>new THREE.PointLight(),returnLight:noop,flash:noop,lightning:noop,explode:noop,shockwave:noop,impact:noop}};
 const caster={team:1,alive:true,_openSky:readable,ki:1e6,maxKi:1e6,powerBuff:1,pos:new THREE.Vector3(0,y,0),
  aim3:new THREE.Vector3(0,0,1),vel:new THREE.Vector3(),spendKi(){return true;},muzzle(out){return out.copy(this.pos);}};
 const manager=new Projectiles(game),beam=manager.spawnBeam(caster,{radius,tipSpeed:speed,maxLen:150,dps:20});
 const wall=(z=3.1,hz=.01,top=30)=>{const w={x:0,z,hx:20,hz};game.world.interiors.push({x:0,z,hx:20,hz,top,walls:[w]});return w;};
 const tick=dt=>{game.time+=dt;manager.update(dt,game);};
 return {game,manager,beam,caster,wall,tick,close:()=>beam._dispose(game)};
}

test('field wall contact lights the approached surface only after the beam reaches it',()=>{
 const f=fixture({speed:60,radius:1,readable:true});
 try{
  f.wall(12);f.tick(1/60);assert.equal(f.beam.blocked,false);assert.ok(f.beam.light.intensity<=5);
  for(let i=0;i<30;i++)f.tick(1/60);
  assert.equal(f.beam.blocked,true);assert.ok(f.beam.light.intensity>25,'A reached wall still has free-flight illumination');
  assert.ok(f.beam.light.position.z<f.beam.tip.position.z,'Wall impact lamp must remain on the approached side');
  assert.ok(f.beam.light.position.distanceTo(f.beam.tip.position)<1);
 }finally{f.close();}
});

for(const hz of [30,60,120])test(`a real fast thin beam stops at the wall surface throughout emission and release at ${hz} Hz`,()=>{
 const f=fixture();try{
  f.wall();const surface=3.1-.01-f.beam.radius;
  for(let i=0;i<hz/2;i++){
   f.tick(1/hz);assert.ok(f.beam.blocked,`wall missed at frame ${i}, tip z=${f.beam.tip.position.z}`);
   assert.ok(Math.abs(f.beam.tip.position.z-surface)<1e-4,`surface=${surface}, tip=${f.beam.tip.position.z}`);
  }
  f.beam.sustaining=false;
  for(let i=0;i<Math.ceil(.18*hz);i++){
   f.tick(1/hz);
   for(let p=0;p<f.beam.pn;p++)assert.ok(f.beam.path[p*3+2]<=surface+1e-4,`released node ${p} leaked to ${f.beam.path[p*3+2]}`);
  }
 }finally{f.close();}
});

test('the nearest destructible cover receives the beam, regardless of cover array order',()=>{
 const f=fixture();try{
  const near={x:0,z:5,r:.1,h:30,hp:1000,maxHp:1000},far={...near,z:5.7};
  f.game.world.cover=[far,near];f.tick(1/30);
  assert.ok(near.hp<1000,'the first physical cover must receive damage');assert.equal(far.hp,1000,'far cover is shielded');
  assert.ok(Math.abs(f.beam.tip.position.z-(5-.1-.05))<1e-4);
 }finally{f.close();}
});

test('an interior wall protects destructible cover farther along the same stream segment',()=>{
 const f=fixture();try{
  f.wall();const far={x:0,z:8,r:.3,h:30,hp:1000,maxHp:1000};f.game.world.cover=[far];f.tick(1/30);
  assert.equal(far.hp,1000,'cover behind an interior wall cannot be carved');assert.ok(f.beam.tip.position.z<3.1);
 }finally{f.close();}
});

test('beams remain travelling streams and clear a wall below their emission altitude',()=>{
 const f=fixture({speed:60,y:40});try{
  f.wall(3.1,.01,30);f.tick(1/60);assert.equal(f.beam.blocked,false);
  assert.ok(f.beam.tip.position.z>0&&f.beam.tip.position.z<2,'one frame must not fill the whole reach');
  for(let i=0;i<12;i++)f.tick(1/60);
  assert.equal(f.beam.blocked,false);assert.ok(f.beam.tip.position.z>10);
 }finally{f.close();}
});

test('beam contact padding cannot damage or shove a real fighter protected by a thin wall',()=>{
 const f=fixture(),target=new Fighter(structuredClone(ROSTER.find(d=>d.id==='sol')));
 try{
  f.wall();target.team=2;target._game=f.game;target._openSky=true;target.invuln=0;target.armor=0;target.resist={};
  target.pos.set(0,4.8,5.5);target.hp=target.maxHp=1000;f.game.entities=[target];
  assert.ok(target.pos.z-target.radius>3.11,'target collision body is entirely behind the wall');
  for(let i=0;i<30;i++)f.tick(1/60);
  assert.equal(target.hp,1000,'the beam endpoint padding cannot reach through cover');assert.equal(target.vel.length(),0);
  f.game.world.interiors.length=0;
  for(let i=0;i<5;i++)f.tick(1/60);
  assert.ok(target.hp<1000,'the same production target takes damage once the wall is removed');
 }finally{f.close();target.dispose();}
});

test('a blocked nearest segment cannot veto another exposed part of a curved hose',()=>{
 const f=fixture({radius:1}),target=new Fighter(structuredClone(ROSTER.find(d=>d.id==='sol')));
 try{
  f.game.world.interiors=[{x:0,z:0,hx:1,hz:.01,top:30,walls:[{x:0,z:0,hx:1,hz:.01}]}];
  target.team=2;target._game=f.game;target._openSky=true;target.invuln=0;target.armor=0;target.resist={};
  target.pos.set(0,4.8,3);target.hp=target.maxHp=1000;f.game.entities=[target];
  f.caster.pos.z=-1.02;f.beam.resolveLaunch();
  // An already-travelled hose wraps around the right edge. Its front segment
  // is closer but hidden; the clear right segment is still inside hit reach.
  f.beam.path.set([0,10,-1.02,4.15,10,-1.02,4.15,10,3]);f.beam.pvel.fill(0);f.beam.pn=3;
  f.tick(.001);assert.equal(f.beam.blocked,false);assert.ok(target.hp<1000,'the exposed wrapped segment must still make contact');
 }finally{f.close();target.dispose();}
});
