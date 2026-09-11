import * as THREE from 'three';
import {handStartupFixture} from './helpers/hand-startup-fixture.mjs';

// Diagnostic only: fixed-root production rig, no native locomotion claim.
const rows=[];
for(const motion of ['stand','fly'])for(const z of [4,8,12,24,50,100])for(const y of [1,7,15]){
 const x=handStartupFixture({motion,charge:true,hz:60});
 try{
  x.f.aimWorld.copy(x.f.pos).add(new THREE.Vector3(0,y,z));
  x.input(true,true,false);for(let n=0;n<42;n++){x.input(false,true,false);x.step();}
  x.input(false,false,true);const b=x.f.slots.lmb.active;
  let t=0;while(b.pendingLaunch&&!b.dead&&t<1){x.step();t+=x.dt;}
  if(b.pendingLaunch){const ray=b.predictDirection(new THREE.Vector3(),0,b.muzzle);rows.push({motion,z,y,time:t,pending:b.pendingLaunch,source:x.f._combatAim?.source,gather:x.f._combatAim?.gather,root:x.f.pos.toArray(),target:b._launchTarget?.toArray(),muzzle:b.muzzle.toArray(),body:x.f.parts.g.rotation.toArray(),hands:x.arms.map(a=>({reach:a.children[2].getWorldPosition(new THREE.Vector3()).sub(a.getWorldPosition(new THREE.Vector3())).normalize().dot(ray),palm:new THREE.Vector3(0,-1,0).applyQuaternion(a.children[2].getWorldQuaternion(new THREE.Quaternion())).dot(ray)}))});}
 }finally{x.close();}
}
console.log(JSON.stringify({cases:36,stranded:rows.length,rows},null,2));
