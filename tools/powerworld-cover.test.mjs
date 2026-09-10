import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PowerWorldStage,STAGE,RUBBLE,rungFor} from '../src/engine/powerworld.js';
import {World} from '../src/engine/world.js';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Projectiles} from '../src/engine/projectiles.js';
import {earliestOrdinaryContact} from '../src/engine/attack-interception.js';

// Native stage generation/registration/lifecycle. Only cloud-canvas painting,
// renderer construction and sensory sinks are omitted in this Node fixture.
function fixture(){
 const noop=()=>{},documentStub={createElement(){return {getContext(){return {createRadialGradient(){return {addColorStop:noop};},beginPath:noop,arc:noop,fill:noop};}};}};
 const scene=new THREE.Scene(),w=Object.create(World.prototype);
 Object.assign(w,{scene,cover:[],coverAll:[],interiors:[],ARENA:240,cars:[],planes:[],rocks:[],treeSpots:[],
  refreshFogBoxes:noop,setSkyWorld:noop,setSpace:noop,shake:noop,punch:noop,crater:noop,setBlockCracks:noop});
 const effects=[],g={world:w,scene,entities:[],time:0,isFoe:()=>false,overlapFoe:()=>null,isHuman:()=>false,onHit:noop,slowmo:noop,noise:noop,
  particles:{spawn:noop,burst:noop},audio:{boom:noop,hit:noop,zap:noop},areaDamage:noop,worldImpact:noop,
  vfx:{_add:e=>effects.push(e),borrowLight:()=>new THREE.PointLight(),returnLight:noop,flash:noop,lightning:noop,explode:noop,shockwave:noop,impact:noop}};
 const stage=new PowerWorldStage(g),open=()=>{const originalDocument=globalThis.document;globalThis.document=documentStub;try{return stage.open();}finally{globalThis.document=originalDocument;}};open();
 return {g,w,stage,effects,open,close(){stage.close();}};
}
function vertices(mesh){
 mesh.updateWorldMatrix(true,true);const points=[];
 mesh.traverse(o=>{const a=o.geometry?.attributes.position;if(a)for(let i=0;i<a.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld));});
 return points;
}
function nominalVolume(c){
 const p=c.mesh.geometry.parameters;
 // Geometry fit and layout may change; registration still preserves its own
 // explicit authored destruction volume through damage, reset and rematch.
 if(c.mesh.geometry.type==='CylinderGeometry'){
  assert.ok(c.rubbleVolume>0&&Number.isFinite(c.rubbleVolume));
  return c.rubbleVolume;
 }
 if(c.mesh.geometry.type==='BoxGeometry')return p.width*.5*p.depth*.5*p.height;
 return (p.radius*1.3)**2*(p.radius*1.1);
}

test('all native spires and rotated boulders fit inside their camera/body and projectile proxies',()=>{
 const x=fixture();try{
  assert.equal(x.w.cover.length,STAGE.spires+STAGE.boulders);
  for(const [i,c]of x.w.cover.entries())for(const p of vertices(c.mesh)){
   assert.ok(Math.abs(p.x-c.x)<=c.hx+1e-5,`rock ${i} visible x=${p.x} outside proxy ${c.x-c.hx}..${c.x+c.hx}`);
   assert.ok(Math.abs(p.z-c.z)<=c.hz+1e-5,`rock ${i} visible z=${p.z} outside proxy`);
   assert.ok(p.y<=c.top+1e-5,`rock ${i} visible top=${p.y} exceeds ${c.top}`);
   assert.ok(Math.hypot(p.x-c.x,p.z-c.z)<=c.r+1e-5,`rock ${i} exceeds projectile radius`);
   assert.equal(c.h,c.top);assert.equal(c.w,c.hx*2);assert.equal(c.d,c.hz*2);
  }
 }finally{x.close();}
});

test('native padded camera traces stop before rendered rock surfaces, including upper boulder facets',()=>{
 const x=fixture();try{
  let witnesses=0;
  for(const c of x.w.cover)for(const v of vertices(c.mesh)){
   if(v.y<.1)continue;
   // Both endpoints must be outside even the wider Frontline formations.
   const span=Math.max(50,c.hx*2+3),distance=span*2;
   const start=v.clone().add(new THREE.Vector3(span,0,0)),end=v.clone().add(new THREE.Vector3(-span,0,0));
   const ray=new THREE.Raycaster(start,new THREE.Vector3(-1,0,0),0,distance),hits=ray.intersectObject(c.mesh,true);
   if(!hits.length)continue;witnesses++;
   const t=x.w.traceBox3(...start.toArray(),...end.toArray(),c,1.4);
   assert.ok(t>=0&&t*distance<=hits[0].distance-1.4+1e-4,`Camera enters ${c.mesh.geometry.type} before its proxy responds`);
  }
  assert.ok(witnesses>100,'no actual rendered-face witnesses');
 }finally{x.close();}
});

test('a grounded fighter approaching a clear boulder stops outside its visible extent',()=>{
 const x=fixture(),f=new Fighter(ROSTER.find(d=>d.id==='sol'));try{
  const c=x.w.cover.find(c=>c.mesh.geometry.type==='IcosahedronGeometry'&&!x.w.cover.some(other=>other!==c&&Math.abs(other.x-(c.x+c.hx+10))<other.hx+12&&Math.abs(other.z-c.z)<other.hz+3)),points=vertices(c.mesh);
  assert.ok(c);const right=Math.max(...points.map(p=>p.x));
  f._game=x.g;f._openSky=true;f.flying=false;f.gait='grounded';f.pos.set(right+10,0,c.z);
  for(let i=0;i<240;i++){f.vel.set(-20,0,0);f._physics(1/60,x.g);}
  assert.ok(f.pos.x-f.radius>=right-1e-5,`Fighter entered visible rock: body edge ${f.pos.x-f.radius}, rock ${right}`);
 }finally{f.dispose();x.close();}
});

test('a native travelling beam cannot pass through an upper rotated boulder facet',()=>{
 const x=fixture(),manager=new Projectiles(x.g);let beam;try{
  const c=x.w.cover.find(c=>c.mesh.geometry.type==='IcosahedronGeometry'&&Math.max(...vertices(c.mesh).map(p=>p.y))>c.mesh.geometry.parameters.radius*1.1+1);
  const top=vertices(c.mesh).sort((a,b)=>b.y-a.y)[0],center=new THREE.Vector3(c.x,c.mesh.position.y,c.z);
  // Just inside the highest vertex: above the old guessed s*1.1 height,
  // but demonstrably intersects this actual mesh (not an invented box).
  const point=top.clone().lerp(center,.04),start=point.clone().add(new THREE.Vector3(0,0,-35));
  const ray=new THREE.Raycaster(start,new THREE.Vector3(0,0,1),0,70),hit=ray.intersectObject(c.mesh)[0];
  assert.ok(hit);const caster={team:1,alive:true,ki:1e6,maxKi:1e6,powerBuff:1,pos:start,aim3:new THREE.Vector3(0,0,1),vel:new THREE.Vector3(),spendKi:()=>true,muzzle(out){return out.copy(this.pos);}};
  x.w.cover=[c];const hp=c.hp;beam=manager.spawnBeam(caster,{radius:.05,tipSpeed:180,maxLen:70,dps:1});
  for(let i=0;i<30;i++){x.g.time+=1/60;manager.update(1/60,x.g);}
  assert.ok(beam.blocked,'The beam passed through the upper visible rock');assert.ok(c.hp<hp);
  assert.ok(beam.tip.position.distanceTo(start)<=hit.distance+1e-4);
 }finally{beam?._dispose(x.g);x.close();}
});

test('beams and ordinary shots aimed away from legal standing space beside every rock clear the muzzle',()=>{
 const x=fixture();try{
  const covers=x.w.cover.slice();
  for(const [i,c]of covers.entries())for(const axis of ['x','z'])for(const side of [-1,1]){
   x.w.cover=[c];const start=new THREE.Vector3(c.x,8,c.z),dir=new THREE.Vector3();
   start[axis]+=side*(c[axis==='x'?'hx':'hz']+2.2);dir[axis]=side;
   // This is a legal native muzzle, not the obsolete y=8 plane underneath
   // raised terrain. Aim above any uphill land along the outward path: the
   // regression isolates false rock contacts, not legitimate terrain hits.
   start.y=x.w.heightAt(start.x,start.z)+8;let rise=0;
   for(let d=2;d<=20;d+=2){const at=start.clone().addScaledVector(dir,d);rise=Math.max(rise,(x.w.heightAt(at.x,at.z)+2-start.y)/d);}
   dir.y=rise;dir.normalize();
   const ray=new THREE.Raycaster(start,dir,0,20);assert.equal(ray.intersectObject(c.mesh).length,0);
   const caster={team:1,alive:true,ki:1e6,maxKi:1e6,powerBuff:1,pos:start,aim3:dir,vel:new THREE.Vector3(),spendKi:()=>true,muzzle(out){return out.copy(this.pos);}};
   const ordinary={pos:start,radius:.1,life:10,caster,ground:false};
   assert.equal(earliestOrdinaryContact(ordinary,start.clone().addScaledVector(dir,20),1/30,x.g)?.kind??null,null,`rock ${i} ${axis}/${side} blocks an outward ordinary shot`);
   const manager=new Projectiles(x.g),beam=manager.spawnBeam(caster,{radius:.1,tipSpeed:180,maxLen:20,dps:1}),hp=c.hp;
   const shot=manager.spawnProjectile(caster,{pos:start,vel:dir.clone().multiplyScalar(10),radius:.1,life:5,ground:false});
   try{
    for(let j=0;j<10;j++){x.g.time+=1/60;manager.update(1/60,x.g);}
    assert.equal(beam.blocked,false,`rock ${i} ${axis}/${side} blocks an outward beam`);assert.equal(c.hp,hp);
    assert.equal(shot.dead,false,`rock ${i} ${axis}/${side} kills the actual ordinary shot`);
    assert.ok(beam.tip.position.distanceTo(start)>10);
   }finally{beam._dispose(x.g);shot._dispose(x.g);}
  }
 }finally{x.close();}
});

test('native ballistic ricochets reflect once from box sides and the top without being ejected inside',()=>{
 const x=fixture();try{
  const c=x.w.cover[7];x.w.cover=[c];
  for(const axis of ['x','z','y'])for(const side of axis==='y'?[1]:[-1,1]){
   const start=new THREE.Vector3(c.x+c.hx*.8,8,c.z+c.hz*.8),vel=new THREE.Vector3();
   start[axis]=(axis==='y'?c.top:c[axis]+side*c[axis==='x'?'hx':'hz'])+side*5;vel[axis]=-side*150;
   const caster={team:1,powerBuff:1},manager=new Projectiles(x.g),shot=manager.spawnProjectile(caster,{pos:start,vel,radius:.6,bounces:3,ballistic:true,bullet:true,ground:false,life:5});
   try{
    let bounced=false;
    for(let i=0;i<20;i++){
     manager.update(1/60,x.g);
     if(shot.bounces<3){bounced=true;assert.equal(shot.bounces,2,`repeat bounce from ${axis}/${side} frame ${i}`);assert.equal(shot.dead,false);
      assert.ok(shot.vel[axis]*side>0,'Velocity did not reflect across the contacted face');
      const outside=axis==='y'?shot.pos.y>=c.top:Math.abs(shot.pos[axis]-c[axis])>=c[axis==='x'?'hx':'hz']+.6;
      assert.ok(outside,`Ricochet enters box on ${axis}/${side}: ${shot.pos.toArray()}`);
     }
    }
    assert.ok(bounced);
   }finally{shot._dispose(x.g);}
  }
 }finally{x.close();}
});

test('geometry-corrected cover retains authored durability, rubble rung, reset and crossing lifecycle',()=>{
 const x=fixture();try{
  const originals=x.w.cover.map(c=>({c,position:c.mesh.position.clone(),rotation:c.mesh.rotation.clone(),hp:c.hp,volume:nominalVolume(c)}));
  for(const {c,hp,volume}of originals){assert.equal(hp,Math.round(70+volume*.0075));assert.equal(c.hp,c.maxHp);}
  const {c,volume}=originals[0],before=x.w.rocks.length;c.onShatter(x.g,c);
  assert.ok(!x.w.cover.includes(c));assert.ok(c.destroyed);assert.equal(x.w.rocks[before].w,RUBBLE[rungFor(volume)].w);
  for(const e of x.effects){e.update(1);e.dispose();}assert.equal(c.mesh.visible,false);
  x.w.resetTerrain();
  assert.equal(x.w.cover.length,originals.length);
  for(const o of originals){assert.equal(o.c.hp,o.hp);assert.ok(o.c.mesh.visible);assert.equal(o.c.destroyed,false);assert.deepEqual(o.c.mesh.position,o.position);assert.deepEqual(o.c.mesh.rotation.toArray(),o.rotation.toArray());}
  x.stage.close();assert.equal(x.w.cover.length,0);assert.equal(x.w.coverAll.length,0);
  x.open();assert.equal(x.w.cover.length,originals.length);
  for(const [i,c2]of x.w.cover.entries()){assert.equal(c2.hx,originals[i].c.hx);assert.equal(c2.hz,originals[i].c.hz);assert.equal(c2.top,originals[i].c.top);}
 }finally{x.close();}
});
