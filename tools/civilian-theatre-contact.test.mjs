import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Pedestrians} from '../src/engine/pedestrians.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {Game} from '../src/engine/game.js';

for(const mode of ['powerworld','training','freeroam'])for(const attack of ['bullet','impact','blast'])
test(`${mode}: ${attack} only affects civilians belonging to the current theatre`,()=>{
 const x=mainCombatFixture({hero:'recon',mode}),g=x.g,peds=new Pedestrians(x.w.scene,240,188);
 try{
  g.peds=peds;g.cityStats={civs:0};peds.n=1;peds.px[0]=0;peds.pz[0]=32;peds.state[0]=0;
  const civil=mode==='freeroam';peds.mesh.visible=civil;peds.head.visible=civil;
  if(attack!=='blast'){
   const b=g.projectiles.spawnProjectile(x.p,{pos:new T.Vector3(0,6,0),vel:new T.Vector3(0,0,320),radius:.45,damage:31,blast:0,bullet:true,ballistic:true,weapon:'rifle',life:3,color:'#efc66d'});
   if(attack==='impact'){b.pos.z=32;b._impact(g,false);}else{
    b.advancePrepared(.1,g);
    assert.equal(b.dead,civil,'absent city crowd must not consume a projectile');
   }
  }else Game.prototype.worldImpact.call(g,new T.Vector3(0,6,32),6,.1,x.p);
  assert.equal(peds.state[0],civil?2:0,'only active civilians may be injured');
  assert.equal(g.cityStats.civs,civil?1:0,'no invisible collateral penalties');
 }finally{for(const mesh of [peds.mesh,peds.head]){mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}x.close();}
});
