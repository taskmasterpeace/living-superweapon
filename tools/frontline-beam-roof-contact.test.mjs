import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Projectiles} from '../src/engine/projectiles.js';
import {World} from '../src/engine/world.js';

// Historical retry9 native scout collider. Its top rounds UP and bottom rounds
// DOWN in the beam's Float32 path; neither stored endpoint remains inside it.
const scout=()=>({x:-190,z:205,hx:9.074943005199913,hz:14.363180337522948,
 bottom:51.00827519159805,top:68.48092476349716,projectileShape:'box',hp:1000,maxHp:1000});
function fixture({underside=false,city=false}={}){
 const noop=()=>{},cover=scout(),world={cover:[cover],interiors:[],shake:noop,punch:noop,setBlockCracks:noop};
 if(city){delete cover.projectileShape;cover.r=12;cover.h=cover.top;}
 const game={time:0,entities:[],scene:new THREE.Scene(),world,audio:{boom:noop,hit:noop},
  particles:{spawn:noop,burst:noop},slowmo:noop,isHuman:()=>false,onHit:noop,isFoe:()=>false,
  vfx:{borrowLight:()=>new THREE.PointLight(),returnLight:noop,flash:noop,lightning:noop,explode:noop,shockwave:noop,impact:noop}};
 const caster={team:1,alive:true,ki:1e6,maxKi:1e6,powerBuff:1,
  pos:new THREE.Vector3(-190,underside?30:100,underside?205:160),
  aim3:new THREE.Vector3(0,underside?1:-.6,underside?0:.8),vel:new THREE.Vector3(),
  spendKi:()=>true,muzzle(out){return out.copy(this.pos);}};
 const manager=new Projectiles(game),beam=manager.spawnBeam(caster,{radius:2,tipSpeed:200,maxLen:150,dps:20});
 return {game,cover,beam,manager,tick(dt){game.time+=dt;manager.update(dt,game);},close(){beam._dispose(game);}};
}

for(const underside of [false,true])test(`stored ${underside?'underside':'roof'} contact survives exact native Float32 rounding`,()=>{
 const f=fixture({underside});try{
  const plane=underside?f.cover.bottom:f.cover.top,
   a=new THREE.Vector3(-190,plane+(underside?-10:10),205),b=new THREE.Vector3(-190,plane+(underside?10:-10),205);
  assert.equal(f.beam._clipStreamSegment(f.game.world,a,b,false),true);
  assert.ok(Math.abs(b.y-plane)<1e-12,'temporal first contact uses the exact surface');
  const stored=new THREE.Vector3().fromArray(new Float32Array(b.toArray()));
  assert.ok(underside?stored.y<plane:stored.y>plane,'fixture must round outside the collider');
  assert.equal(f.beam._clipStreamSegment(f.game.world,a,stored,true),true,'stored contact must not lose its receiver');
  assert.equal(f.beam._obstacleContact.target,f.cover);
 }finally{f.close();}
});

for(const hz of [30,60,120])for(const underside of [false,true])test(`native manager sustains ${underside?'underside':'roof'} damage at ${hz} Hz`,()=>{
 const f=fixture({underside});try{
  for(let i=0;i<hz;i++)f.tick(1/hz);
  const first=f.cover.hp;
  assert.ok(first<1000,'arriving beam must damage the contacted scout');
  for(let i=0;i<hz;i++)f.tick(1/hz);
  assert.ok(f.cover.hp<first-10,'held contact must continue damage rather than plateau');
  assert.equal(f.beam.blocked,true);
 }finally{f.close();}
});

test('nonstored box/city contact retains exact vertical boundary and city clear flight stays clear',()=>{
 for(const city of [false,true]){
  const f=fixture({city});try{
   const top=f.cover.top,a=new THREE.Vector3(-220,top+1e-6,205),b=new THREE.Vector3(-160,top+1e-6,205);
   assert.equal(f.beam._clipStreamSegment(f.game.world,a,b,false),false,'temporal sweep must not grow the roof by beam radius or numerical skin');
   a.y=b.y=top+.001;
   assert.equal(f.beam._clipStreamSegment(f.game.world,a,b,true),false,'stored skin must remain microscopic, including legacy city cylinders');
   a.y=b.y=top;
   assert.equal(f.beam._clipStreamSegment(f.game.world,a,b,false),!city,'preserve existing exact-plane box/city convention');
   a.set(-220,top-1e-6,205);b.set(-160,top-1e-6,205);
   assert.equal(f.beam._clipStreamSegment(f.game.world,a,b,false),true,'both shapes collide immediately below the roof');
  }finally{f.close();}
 }
});

test('nearest actual ground or roof wins independently of cover ordering',()=>{
 const f=fixture();try{
  const w=f.game.world;Object.assign(w,{_ghTriangles:true,_gseg:2,_ghArena:500,
   _gh:new Float32Array(9).fill(70),heightAt:World.prototype.heightAt});
  const far={...f.cover,top:60,bottom:45};w.cover=[far,f.cover];
  const a=new THREE.Vector3(-190,100,205),b=new THREE.Vector3(-190,30,205);
  assert.equal(f.beam._clipStreamSegment(w,a,b,true),true);
  assert.equal(f.beam._obstacleContact.kind,'ground','higher native terrain shields the scout roof');
  w._gh.fill(0);b.set(-190,30,205);
  assert.equal(f.beam._clipStreamSegment(w,a,b,true),true);
  assert.equal(f.beam._obstacleContact.target,f.cover,'roof is in front of both ground and lower cover');
 }finally{f.close();}
});
