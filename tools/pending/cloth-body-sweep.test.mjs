import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
// Parked at the user's direction: cape work is not the current priority.
import {Fighter} from '../../src/engine/entity.js';
import {ROSTER} from '../../src/data/characters.js';
import {RagdollCape} from '../../src/engine/ragdoll-cape.js';

function fixture(rotated){
 const fighter=new Fighter(ROSTER.find(d=>d.id==='sol'));fighter._animate(0);
 const cloth=new RagdollCape(fighter.parts,new T.Vector3()),p=cloth.points[40];
 const matrix=new T.Matrix4().compose(new T.Vector3(0,8,0),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),rotated?.4:0),new T.Vector3(rotated?2:1,rotated?.7:1,1));
 const box=new T.Box3(new T.Vector3(-.2,-3,-3),new T.Vector3(.2,3,3));
 const body={box,worldBox:box.clone().applyMatrix4(matrix),matrix,inverse:matrix.clone().invert()};
 cloth.bodies=[body];cloth.colliders=[body];cloth.covers=[];p.faces=[];
 const point=(x)=>new T.Vector3(x,0,0).applyMatrix4(matrix);
 return {fighter,cloth,p,body,point};
}
for(const rotated of [false,true])for(const side of [-1,1]){
 test(`body sweep ignores fictitious Verlet history (${rotated?'rotated/scaled':'axis'}, ${side})`,()=>{
  const {fighter,cloth,p,point}=fixture(rotated);try{
   p.pos.copy(point(side*2));p.sweep=point(side*2.1);p.last.copy(point(-side*2));p.prev.copy(p.last);
   const before=p.pos.clone();cloth.collide(p,{heightAt:()=>0});
   assert.ok(p.pos.distanceTo(before)<1e-9,'body collision was invented from velocity bookkeeping although real cloth travel never crossed it');
  }finally{fighter.dispose();}
 });
 for(const depth of [.1,2])test(`body sweep catches real crossing even when Verlet history misses it (${rotated?'rotated/scaled':'axis'}, ${side}, ${depth})`,()=>{
  const {fighter,cloth,p,body,point}=fixture(rotated);try{
   p.pos.copy(point(-side*depth));p.sweep=point(side*2);p.last.copy(p.pos);p.prev.copy(p.pos);
   cloth.collide(p,{heightAt:()=>0});
   assert.ok(p.pos.clone().applyMatrix4(body.inverse).x*side>.2,'real body crossing was missed because artificial velocity history stayed on the destination side');
  }finally{fighter.dispose();}
 });
}
