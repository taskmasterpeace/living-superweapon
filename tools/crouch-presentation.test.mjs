import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {earliestOrdinaryContact} from '../src/engine/attack-interception.js';

function fixture(scale=1){
 const def=structuredClone(ROSTER.find(d=>d.id==='sarge'));def.frame={...def.frame,scale};
 const f=new Fighter(def),scene=new T.Scene(),world={scene,cover:[],interiors:[],heightAt:()=>0,ARENA:240};
 const combat=new StudioCombat(scene,world),g=combat.game;scene.add(f.obj);g.entities=[f];f._game=g;
 Object.assign(f,{_openSky:true,gait:'grounded',onFoot:true,flying:false,animT:0});f.pos.set(0,0,0);f.vel.set(0,0,0);
 const step=(dt=1/60)=>{f.animT+=dt;f._animate(dt);f.obj.updateMatrixWorld(true);};
 const head=()=>f.parts.head.getWorldPosition(new T.Vector3()).y;
 return {f,g,combat,step,head,close(){combat.dispose();f.dispose();}};
}

for(const scale of [.65,1,1.5])for(const hz of [30,60,120])
test(`crouch lowers the real body with planted soles and restores without changing physics (${scale}, ${hz}Hz)`,()=>{
 const {f,step,head,close}=fixture(scale),dt=1/hz;
 try{
  for(let i=0;i<hz;i++)step(dt);const before=head(),center=f.center().y,position=f.pos.clone();
  f.crouching=true;for(let i=0;i<hz;i++)step(dt);
  assert.ok(before-head()>1.25*scale,`head only lowered ${before-head()}`);
  assert.ok(center-f.center().y>1.2*scale,'aim/contact center must follow the lowered core');
  for(const leg of [f.parts.legL,f.parts.legR]){
   const box=new T.Box3().setFromObject(leg.userData.boot);
   assert.ok(box.min.y>=-.025&&box.min.y<.12*scale,`sole clearance ${box.min.y}`);
   assert.ok(leg.userData.knee.rotation.x>1,'knees must visibly flex');
  }
  assert.ok(f.pos.equals(position)&&f.vel.length()===0,'presentation cannot move physics');
  f.crouching=false;for(let i=0;i<hz*2;i++)step(dt);
  assert.ok(Math.abs(head()-before)<.25*scale,'release must restore upright height');
 }finally{close();}
});

test('a shot at standing head height misses a crouched soldier but chest fire still connects',()=>{
 const {f,g,step,head,close}=fixture();
 try{
  for(let i=0;i<90;i++)step();const y=head();
  const caster={team:999},shot=height=>({caster,pos:new T.Vector3(0,height,-30),radius:.1,ground:false});
  g.isFoe=(a,b)=>a!==b;
  assert.ok(earliestOrdinaryContact(shot(y),new T.Vector3(0,y,30),.1,g)?.target===f);
  f.crouching=true;for(let i=0;i<90;i++)step();
  assert.ok(!earliestOrdinaryContact(shot(y),new T.Vector3(0,y,30),.1,g),'invisible standing cylinder must not remain');
  const cy=f.center().y;assert.ok(earliestOrdinaryContact(shot(cy),new T.Vector3(0,cy,30),.1,g)?.target===f);
 }finally{close();}
});

test('a form change during crouch cannot bake the lowered carrier into standing rest',()=>{
 const a=fixture(),b=fixture();
 try{
  a.f.crouching=true;for(let i=0;i<90;i++){a.step();b.step();}
  a.f.applyForm({frame:{scale:1.2}});b.f.applyForm({frame:{scale:1.2}});a.f.crouching=false;
  for(let i=0;i<180;i++){a.step();b.step();}
  assert.ok(Math.abs(a.head()-b.head())<.05,'temporary crouch became the replacement body rest');
 }finally{a.close();b.close();}
});

test('Studio crouch-walk attack rehearsal uses the actual lower stance and paid rifle damage',()=>{
 const {f,combat,close}=fixture();
 try{
  combat.shooterMotion='ground-crouch-forward';combat.reset(f,true,'attack');
  for(let i=0;i<120;i++)combat.step(i/60,1/60);
  assert.ok(f.crouching&&f._crouchPose.drop>1,'crouch rehearsal must pose the real fighter');
  assert.ok(combat.damage>0,'rifle must hit through the production trigger/contact path');
  combat.shooterMotion='ground-forward';combat.step(2.1,1/60);
  assert.equal(f.crouching,false,'switching away must clear the rehearsal stance');
 }finally{close();}
});
