import {disjointCombatFixture} from './disjoint-combat-fixture.mjs';

export function spineCombatFixture({source='chest',...options}={}){
 const x=disjointCombatFixture(options),{f}=x;
 Object.assign(f.slots.lmb.def,{chest:source==='chest',faceOrigin:source==='eye',castStyle:source==='chest'?'chest-brace':source==='eye'?'optic-focus':'palm'});
 const aim=(degrees,height=0)=>{
  f.facing=degrees*Math.PI/180;f.aim.set(Math.sin(f.facing),0,Math.cos(f.facing));
  f.aimWorld.copy(f.pos).addScaledVector(f.aim,100);f.aimWorld.y+=8+height;f.aim3.copy(f.aimWorld).sub(f.pos).normalize();
 };
 aim(0);return {...x,aim};
}
