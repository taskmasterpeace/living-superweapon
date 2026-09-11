import * as THREE from 'three';

// Diagnostic only: CPU-skin the source hand and measure against visible target
// triangles. This is deliberately independent of gameplay's padded driver boxes.
export function renderedHandContact(actor,target){
 actor.obj.updateMatrixWorld(true);target.obj.updateMatrixWorld(true);
 actor.parts.skin?.skeleton.update();target.parts.skin?.skeleton.update();
 const mesh=actor.parts.skin?.meshes.find(m=>m.name==='hero-skin-body');
 if(!mesh)throw new Error('Witness requires the rendered source-skinned attacker');
 const hand=[];const {skinIndex,skinWeight}=mesh.geometry.attributes;
 for(let i=0;i<skinIndex.count;i++){
  let weight=0;for(let k=0;k<4;k++){
   const bone=mesh.skeleton.bones[skinIndex.getComponent(i,k)]?.name;
   if(bone==='hand_l'||/^(index|middle|ring|pinky|thumb)_.*_l$/.test(bone))weight+=skinWeight.getComponent(i,k);
  }
  if(weight>.5)hand.push(mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));
 }
 const targets=target.parts.skin?.meshes.filter(m=>m.name==='hero-skin-body')||['torso','head','pelvis'].map(k=>target.parts[k]);
 let distance=Infinity;const triangle=new THREE.Triangle(),near=new THREE.Vector3(),box=new THREE.Box3();
 for(const body of targets){
  if(!body.visible||!body.layers.isEnabled(0))continue;
  const positions=Array.from({length:body.geometry.attributes.position.count},(_,i)=>body.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(body.matrixWorld));
  const indices=body.geometry.index, count=indices?.count??positions.length;
  for(let i=0;i<count;i+=3){
   triangle.set(positions[indices?indices.getX(i):i],positions[indices?indices.getX(i+1):i+1],positions[indices?indices.getX(i+2):i+2]);
   box.setFromPoints([triangle.a,triangle.b,triangle.c]);
   for(const point of hand){if(box.distanceToPoint(point)>=distance)continue;triangle.closestPointToPoint(point,near);distance=Math.min(distance,point.distanceTo(near));}
  }
 }
 return {distance,handVertices:hand.length,attacker:mesh.name,targetMeshes:targets.map(m=>m.name)};
}
