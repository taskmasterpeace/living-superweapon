import test from 'node:test';
import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {beginPersonCarry,syncPersonCarry} from '../src/engine/person-carry.js';

for(const mode of ['front','back','friendly'])for(const transport of [false,true]){
 test(`${mode} hold keeps its anatomical facing during ${transport?'transport':'stationary'} turns`,()=>{
  const x=mainCombatFixture({mode:'powerworld'});
  try{
   const f=x.p,v=x.foe({z:3.3});
   f.grabbing=v;v.grabbedBy=f;f.grabState='clinch';f.grabMode=mode;f.grabT=100;f._clinchMax=100;f._victimEscape=false;
   if(transport)beginPersonCarry(f,v,.5);
   for(const yaw of [0,.7,2.4,-1.5]){
    f.faceDir(Math.sin(yaw),Math.cos(yaw));
    if(transport){f._personCarry.angle=.4;syncPersonCarry(f,x.g);}else x.g.melee.update(f,1/60);
    const angle=yaw+(transport?.4:0),sign=mode==='front'?-1:1;
    assert.ok(v.aim.x*Math.sin(angle)*sign+v.aim.z*Math.cos(angle)*sign>.999,`${mode} receiver was turned around`);
   }
  }finally{x.close();}
 });
}
