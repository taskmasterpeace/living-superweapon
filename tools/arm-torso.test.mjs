import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {bendArm} from '../src/engine/hero-rig.js';
import {constrainArmTorso} from '../src/engine/arm-torso.js';
import {sweepSplitObstacle} from '../src/engine/projectile-contact.js';
import {updateLimbSurfaces} from '../src/engine/hero-limb-surface.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';
import {heroTorsoGeometry} from '../src/engine/hero-torso.js';

for(const definition of [0,.7,1])test(`contact rows enclose the actual sculpt at definition ${definition}`,()=>{
 const geo=heroTorsoGeometry(definition),p=geo.attributes.position,n=geo.userData.anatomy.segments;
 try{
  for(const [row,[y,w,d]]of geo.userData.contactRings.entries())for(let i=0;i<=n;i++){
   const index=row*(n+1)+i;
   assert.equal(p.getY(index),y);assert.ok((p.getX(index)/w)**2+(p.getZ(index)/d)**2<=1,'Sculpted chest leaves its contact ellipse');
  }
 }finally{geo.dispose();}
});

for(const witness of [
 {scale:1.3,broad:.8,side:1,q:[-.23598538172321926,-.4676364292588816,-.06639861940217284,.8492457200271515],bend:.5519001923501492,triangle:[141,153,152]},
 {scale:1.5,broad:.7,side:-1,q:[-.3235114767045682,.25184642813137925,.419059909446609,.8101249862660055],bend:.4682537280023098,triangle:[137,149,148]},
 {scale:1.5,broad:.8,side:1,q:[-.36303442174741996,-.28969514920070977,-.40753925306755273,.7862534491913126],bend:1.113086224347353,triangle:[140,152,151]},
])test(`a narrow tall frame clears the actual elbow join (${witness.scale}/${witness.broad}/${witness.side})`,()=>{
 const def=structuredClone(ROSTER.find(d=>d.id==='kano'));def.frame={...def.frame,scale:witness.scale,bulk:.65,broad:witness.broad};
 const f=new Fighter(def),arm=witness.side<0?f.parts.armL:f.parts.armR,point=new THREE.Vector3();
 try{
  arm.quaternion.fromArray(witness.q);bendArm(arm,witness.bend);
  constrainArmTorso(f,arm,witness.side);updateLimbSurfaces(f.parts,true);
  const surface=f.parts.rig.limbSurfaces.find(s=>s.upper===arm.children[0]),pos=surface.mesh.geometry.attributes.position;
  const inside=trunkProbe(f.parts.torso),inverse=f.parts.torso.matrixWorld.clone().invert(),centroid=new THREE.Vector3();
  // The upper join belongs to the upper driver, not a t-row. Checking only
  // lower/t-row vertices silently omitted this visible elbow boundary.
  for(const index of witness.triangle){
   point.fromBufferAttribute(pos,index).applyMatrix4(surface.mesh.matrixWorld);centroid.add(point);
   assert.ok(!inside(point,inverse),`Visible join vertex ${index} enters the trunk`);
  }
  assert.ok(!inside(centroid.multiplyScalar(1/3),inverse),'The connecting triangle crosses the trunk');
 }finally{f.dispose();}
});

test('a torso projection cannot invalidate an already-clear cover constraint',()=>{
 const def=structuredClone(ROSTER.find(d=>d.id==='kano'));def.frame={...def.frame,scale:.65};const f=new Fighter(def);
 const wall={x:0,z:2.4,hx:20,hz:.02},world={cover:[],interiors:[{x:0,z:2.4,hx:20,hz:.02,top:40,walls:[wall]}]};f._game={world};
 const start=new THREE.Vector3(),end=new THREE.Vector3(),scale=new THREE.Vector3(),contact={};let changed=0,seed=314159;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const intersects=arm=>{
  f.obj.updateMatrixWorld(true);arm.getWorldPosition(start);arm.children[2].getWorldPosition(end);arm.children[2].getWorldScale(scale);
  const sphere=arm.children[2].geometry.boundingSphere,r=(sphere.radius+sphere.center.length())*Math.max(scale.x,scale.y,scale.z)+.04;
  return sweepSplitObstacle(world,start,end,r,contact,false,r);
 };
 try{
  assert.ok(f.radius<wall.z-wall.hz,'Body must stay outside the test wall');
  for(const [arm,side]of [[f.parts.armL,-1],[f.parts.armR,1]])for(let i=0;i<600;i++){
   arm.rotation.set(-random()*2.4,(random()-.5)*1.5,side*(random()-.3)*.8);bendArm(arm,random()*1.5);
   if(intersects(arm))continue;
   if(constrainArmTorso(f,arm,side)){changed++;assert.ok(!intersects(arm),`Projection moved a previously clear hand into cover, side ${side}, sample ${i}`);}
  }
  assert.ok(changed>10,'Fixture must exercise real shoulder corrections');
 }finally{f.dispose();}
});
