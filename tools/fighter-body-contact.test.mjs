import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3} from 'three';
import {Fighter} from '../src/engine/entity.js';
import {Game} from '../src/engine/game.js';
import {ROSTER} from '../src/data/characters.js';

function core(f){
 f.obj.updateMatrixWorld(true);const box=new Box3();
 for(const k of ['torso','head','pelvis']){const p=f.parts[k];if(!p?.geometry)continue;p.geometry.computeBoundingBox();box.union(p.geometry.boundingBox.clone().applyMatrix4(p.matrixWorld));}
 return box;
}
function fixture(){
 const a=new Fighter(structuredClone(ROSTER.find(d=>d.id==='kano'))),b=new Fighter(structuredClone(ROSTER.find(d=>d.id==='kano')));
 for(const f of [a,b]){f._openSky=true;f.flying=true;f.gait='airborne';f.pos.y=80;}
 a.pos.x=-20;b.pos.x=20;
 const g={entities:[a,b],world:{cover:[],interiors:[],ARENA:900,heightAt:()=>0}};
 return {a,b,g,begin(){Game.prototype.beginBodyContactFrame?.call(g);},end(){Game.prototype.resolveBodies.call(g);},close(){a.dispose();b.dispose();}};
}
// Break caught: the old two-airborne exemption, or endpoint-only separation,
// lets these paths swap sides despite an earlier physical-core collision.
for(const reverse of [false,true])test(`two fast flyers stop on the approach side (reverse order ${reverse})`,()=>{
 const t=fixture();try{
  if(reverse)t.g.entities.reverse();t.begin();t.a.pos.x=20;t.b.pos.x=-20;t.a.vel.x=400;t.b.vel.x=-400;t.end();
  assert.ok(t.a.pos.x<t.b.pos.x,'Flyers must not exchange sides through each other');
  assert.ok(core(t.a).max.x<=core(t.b).min.x+.001,'Rendered core bounds must be separated');
  assert.ok(t.a.vel.x<=0&&t.b.vel.x>=0,'Contact must remove inward velocity');
 }finally{t.close();}
});
test('fast flight into a hovering target stops the traveller without moving the target',()=>{
 const t=fixture();try{t.b.pos.x=0;t.begin();t.a.pos.x=20;t.a.vel.x=400;t.end();
  assert.equal(t.b.pos.x,0);assert.ok(core(t.a).max.x<=core(t.b).min.x+.001);assert.equal(t.a.vel.x,0);
 }finally{t.close();}
});
test('initial exact overlap separates instead of silently remaining interpenetrated',()=>{
 const t=fixture();try{t.a.pos.copy(t.b.pos);t.begin();t.end();assert.ok(!core(t.a).intersectsBox(core(t.b)));}finally{t.close();}
});
test('sliding flight keeps tangential motion after a grazing contact',()=>{
 const t=fixture();try{t.b.pos.set(0,80,0);t.a.pos.set(-20,80,-3);t.begin();t.a.pos.set(20,80,3);t.a.vel.set(400,0,60);t.end();
  assert.ok(t.a.pos.x<0);assert.equal(t.a.pos.z,3);assert.equal(t.a.vel.z,60);
 }finally{t.close();}
});
test('parallel and vertically separated flight paths remain free',()=>{
 for(const mode of ['parallel','above']){const t=fixture();try{
  if(mode==='above')t.a.pos.y=110;else t.b.pos.z=15;
  t.begin();t.a.pos.x=20;t.b.pos.x=-20;t.end();assert.equal(t.a.pos.x,20);assert.equal(t.b.pos.x,-20);
 }finally{t.close();}}
});
test('following a moving target stops only relative closing motion',()=>{
 const t=fixture();try{t.b.pos.x=0;t.begin();t.a.pos.x=30;t.b.pos.x=10;t.a.vel.x=500;t.b.vel.x=100;t.end();
  assert.equal(t.b.pos.x,10);assert.ok(t.a.pos.x<10);assert.equal(t.b.vel.x,100);assert.equal(t.a.vel.x,100);
 }finally{t.close();}
});
for(const mode of ['phase','sprint','grab','scout','aircraft'])test(`intentional ${mode} ownership is not intercepted`,()=>{
 const t=fixture();try{
  if(mode==='phase')t.a.phase=true;
  if(mode==='sprint'){t.a.sprintT=1;t.a._sprintThrough=true;}
  if(mode==='grab'){t.a.grabbing=t.b;t.b.grabbedBy=t.a;}
  if(mode==='scout')t.a._scoutVehicle={};
  if(mode==='aircraft')t.a._aircraftVehicle={};
  t.begin();t.a.pos.x=20;t.b.pos.x=-20;t.end();assert.equal(t.a.pos.x,20);assert.equal(t.b.pos.x,-20);
 }finally{t.close();}
});
test('teleports between frames do not leave a stale collision trail',()=>{
 const t=fixture();try{t.b.pos.x=0;t.begin();t.end();t.a.pos.x=40;t.begin();t.a.pos.x=45;t.end();assert.equal(t.a.pos.x,45);t.a.pos.x=-40;t.end();assert.equal(t.a.pos.x,-40,'An out-of-frame resolve must not replay old motion');}finally{t.close();}
});
test('changing flight orientation protects the actual horizontal core, not just the foot position',()=>{
 const t=fixture();try{
  for(const f of [t.a,t.b])f.obj.rotation.z=Math.PI/2;
  t.b.pos.x=0;t.begin();t.a.pos.x=20;t.a.vel.x=400;t.end();
  assert.ok(core(t.a).max.x<=core(t.b).min.x+.001,'Head and chest cannot pass through the horizontal target');
 }finally{t.close();}
});
test('hovering legs cannot pass through the head of a grounded fighter',()=>{
 const t=fixture();try{
  t.a.pos.set(-20,86,0);t.b.pos.set(0,80,0);t.b.flying=false;t.b.gait='grounded';
  t.begin();t.a.pos.x=20;t.a.vel.x=400;t.end();
  t.a.obj.updateMatrixWorld(true);t.b.obj.updateMatrixWorld(true);
  const head=core(t.b),legs=new Box3();
  for(const leg of [t.a.parts.legL,t.a.parts.legR])for(const key of ['thigh','shin','boot']){
   const part=leg.userData[key];part.geometry.computeBoundingBox();legs.union(part.geometry.boundingBox.clone().applyMatrix4(part.matrixWorld));
  }
  assert.ok(!legs.intersectsBox(head),'Boot/shin volumes cannot be excluded from ordinary body collision');
  assert.ok(t.a.pos.x<0,'Hovering approach must remain on the near side');
 }finally{t.close();}
});
