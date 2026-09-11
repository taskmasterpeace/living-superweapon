import * as THREE from 'three';
import {reachArm} from './hero-rig.js';
import {sweepSplitObstacle} from './projectile-contact.js';

const shoulder=new THREE.Vector3(),point=new THREE.Vector3(),grip=new THREE.Vector3(),offset=new THREE.Vector3(),delta=new THREE.Vector3(),shoulderLocal=new THREE.Vector3();
const local=new THREE.Matrix4(),box=new THREE.Box3(),partBox=new THREE.Box3(),wrist=new THREE.Quaternion(),parent=new THREE.Quaternion(),contact={};
const torsoInverse=new THREE.Matrix4(),meshToTorso=new THREE.Matrix4(),weaponBox=new THREE.Box3();
const contactBoxes=new WeakMap();
function rigidContactBoxes(geometry){
 let boxes=contactBoxes.get(geometry);if(boxes)return boxes;
 // Imported rifles batch disconnected barrel, stock and receiver pieces by
 // material. One bounding box fills the empty space between those pieces and
 // can push an otherwise reachable fore-end away from the support shoulder.
 boxes=[];const a=geometry.attributes.position,index=geometry.index;
 for(let i=0;i<(index?.count??a.count);i+=3){
  const b=new THREE.Box3();
  for(let k=0;k<3;k++)b.expandByPoint(new THREE.Vector3().fromBufferAttribute(a,index?index.getX(i+k):i+k));
  boxes.push(b);
 }
 contactBoxes.set(geometry,boxes);return boxes;
}

// A wrist can rotate a clear forearm's attached stock/barrel back into the ribs.
// Bound each rigid mesh separately in the torso's frame (including scale), then
// clear the intersected anatomical slabs. Per-part bounds avoid treating the
// empty space between a long barrel and its grip as a solid weapon-sized box.
export function constrainWeaponTorso(f,emitter,pole){
 const {hand,weapon,side}=emitter,torso=f.parts.torso;
 const rings=torso.geometry?.userData.contactRings||torso.geometry?.userData.anatomy?.rings;
 if(!weapon||!hand||!rings?.length)return false;
 torsoInverse.copy(torso.matrixWorld).invert();let correction=0;
 weapon.traverseVisible(mesh=>{
  if(!mesh.isMesh)return;
  const geometry=mesh.geometry;if(!geometry.boundingBox)geometry.computeBoundingBox();
  meshToTorso.multiplyMatrices(torsoInverse,mesh.matrixWorld);
  for(const bounds of weapon.userData.authoredEquipment?rigidContactBoxes(geometry):[geometry.boundingBox]){
  weaponBox.copy(bounds).applyMatrix4(meshToTorso);
  const near=side<0?-weaponBox.max.x:weaponBox.min.x;
  const far=side<0?-weaponBox.min.x:weaponBox.max.x;
  const z=weaponBox.min.z>0?weaponBox.min.z:weaponBox.max.z<0?-weaponBox.max.z:0;
  for(let i=1;i<rings.length;i++){
   const a=rings[i-1],b=rings[i];
   if(weaponBox.max.y<Math.min(a[0],b[0])||weaponBox.min.y>Math.max(a[0],b[0]))continue;
   const width=Math.max(a[1],b[1])+.025,depth=Math.max(a[2],b[2])+.025;
   if(z>=depth)continue;
   const edge=width*Math.sqrt(1-z*z/(depth*depth));
   if(near<edge&&far>-edge)correction=Math.max(correction,edge-near+.025);
  }
  }
 });
 if(correction<1e-5)return false;
 const arm=side<0?f.parts.armL:f.parts.armR;
 hand.getWorldQuaternion(wrist);hand.getWorldPosition(grip);
 torso.worldToLocal(grip);grip.x+=side*correction;
 torso.localToWorld(grip);arm.parent.worldToLocal(grip);
 reachArm(arm,grip,side,1,pole);
 arm.getWorldQuaternion(parent).invert();hand.quaternion.copy(parent).multiply(wrist);
 return true;
}

function gripBounds(weapon,hand){
 if(weapon._gripCoverBounds)return weapon._gripCoverBounds;
 hand.updateWorldMatrix(true,true);local.copy(hand.matrixWorld).invert();box.makeEmpty();
 // Cache bind-local bounds, not a world AABB that grows while the weapon turns.
 // Equipment is rigid under the grip, including its open-hand morph envelope.
 for(const root of [weapon,hand]){
  const add=mesh=>{
   if(!mesh.isMesh)return;if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
   partBox.copy(mesh.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(local,mesh.matrixWorld));box.union(partBox);
  };
  if(root===hand)add(hand);else root.traverse(add);
 }
 return weapon._gripCoverBounds=box.clone().expandByScalar(.06);
}

// Final FK retraction for a rigid held firearm. The eight conservative grip-local
// corners include the barrel, receiver and hand, not just an invisible launch point.
// The caller re-aims the wrist after each solve so a retracted gun still owns its ray.
export function constrainWeaponCover(f,emitter,pole){
 const world=f._game?.world,{hand,weapon,side}=emitter;
 if(!weapon||!hand||!world||!world.cover?.length&&!world.interiors?.length)return false;
 const arm=side<0?f.parts.armL:f.parts.armR,bounds=gripBounds(weapon,hand);
 arm.getWorldPosition(shoulder);hand.getWorldPosition(grip);offset.set(0,0,0);let deepest=0;
 for(let i=0;i<8;i++){
  point.set(i&1?bounds.max.x:bounds.min.x,i&2?bounds.max.y:bounds.min.y,i&4?bounds.max.z:bounds.min.z).applyMatrix4(hand.matrixWorld);
  if(!sweepSplitObstacle(world,shoulder,point,.02,contact,false,.02)||contact.t<=0)continue;
  delta.copy(shoulder).sub(point).multiplyScalar(1-contact.t+.002);
  if(delta.lengthSq()>deepest){deepest=delta.lengthSq();offset.copy(delta);}
 }
 if(deepest)weapon._coverUntil=f.animT+.18;
 else if(!(weapon._coverUntil>f.animT))return false;
 hand.getWorldQuaternion(wrist);grip.add(offset);
 // A backward grip correction must not fold inward through the ribs. Use the
 // rotated/scaled torso's own shoulder lane, not a hard-coded world-X boundary.
 const torso=f.parts.torso;torso.worldToLocal(grip);shoulderLocal.copy(shoulder);torso.worldToLocal(shoulderLocal);
 const lane=shoulderLocal.x+side*.35;
 const before=grip.x;grip.x=side<0?Math.min(grip.x,lane):Math.max(grip.x,lane);
 if(!deepest&&Math.abs(before-grip.x)<1e-5)return false;
 torso.localToWorld(grip);arm.parent.worldToLocal(grip);
 reachArm(arm,grip,side,1,pole);
 arm.getWorldQuaternion(parent).invert();hand.quaternion.copy(parent).multiply(wrist);
 return true;
}
