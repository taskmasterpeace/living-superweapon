import * as THREE from 'three';
import {sampleFrontlineRelief} from './frontline-ground.js';
import chip from './frontline-chip-data.json' with {type:'json'};
import authoredPlaces from './frontline-chip-placements.json' with {type:'json'};

// Small enough to read as surface detail inside the arena. Medium rubble is
// outside combat bounds; it contributes scale without introducing hidden walls.
export function buildFrontlineRubble(stage,material){
 const world=stage.g.world,features=stage.frontlineRelief||[];
 let seed=7319;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(chip.position,3));
 geometry.setAttribute('normal',new THREE.Float32BufferAttribute(chip.normal,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(chip.uv,2));geometry.setIndex(chip.index);stage._geos.push(geometry);
 const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),yawRotation=new THREE.Quaternion(),scale=new THREE.Vector3(),axis=new THREE.Vector3(0,1,0),normal=new THREE.Vector3();
 const align=(q,heightAt)=>{
  const h=heightAt(q.x,q.z),dx=heightAt(q.x+.5,q.z)-heightAt(q.x-.5,q.z),dz=heightAt(q.x,q.z+.5)-heightAt(q.x,q.z-.5);
  normal.set(-dx,1,-dz).normalize();rotation.setFromUnitVectors(axis,normal).multiply(yawRotation.setFromAxisAngle(axis,q.yaw));
  position.set(q.x,h+q.lift,q.z);scale.set(q.size,q.size,q.size*q.stretch);matrix.compose(position,rotation,scale);return matrix;
 };
 const meshes=[];
 for(const distant of [false,true]){
  const count=distant?650:authoredPlaces.length,mesh=new THREE.InstancedMesh(geometry,material,count),places=[];
  mesh.name=distant?'frontline-distant-rubble':'frontline-surface-chips';mesh.receiveShadow=true;mesh.castShadow=false;
  for(let i=0;i<count;i++){
   if(!distant){const [x,z,size,yaw,stretch]=authoredPlaces[i],q={x,z,size,yaw,stretch,lift:size*.1};mesh.setMatrixAt(i,align(q,(x,z)=>world.heightAt(x,z)));places.push(q);continue;}
   let x,z;
   for(let attempt=0;attempt<200;attempt++){
    const a=random()*Math.PI*2;
    if(distant){const r=1100+random()*3500;x=Math.cos(a)*r;z=Math.sin(a)*r;}
    else if(features.length&&i%3!==0){const f=features[i%Math.min(features.length,15)],r=.35+random()*.85;x=f.x+Math.cos(a)*f.rx*r;z=f.z+Math.sin(a)*f.rz*r;}
    else{const r=150+random()*725;x=Math.cos(a)*r;z=Math.sin(a)*r;}
    if(Math.hypot(x,z)<140||(!distant&&Math.hypot(x,z)>900))continue;
    if(!distant&&stage._cover.some(c=>Math.abs(x-c.x)<c.hx+3&&Math.abs(z-c.z)<c.hz+3))continue;
    break;
   }
   const size=distant?1.6+random()**2*8:.18+random()**3*.62;
   const h=distant?sampleFrontlineRelief(x,z,features):world.heightAt(x,z),lift=size*.1;
   position.set(x,h+lift,z);rotation.setFromAxisAngle(axis,random()*Math.PI*2);scale.set(size*(.75+random()*.25),size,size*(.6+random()*.4));
   matrix.compose(position,rotation,scale);mesh.setMatrixAt(i,matrix);places.push({x,z,lift});
  }
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();stage.group.add(mesh);meshes.push(mesh);
  if(!distant){
   let version=world.groundGeo.attributes.position.version;
   mesh.onBeforeRender=()=>{
    const next=world.groundGeo.attributes.position.version;if(version===next)return;version=next;
    for(let i=0;i<places.length;i++)mesh.setMatrixAt(i,align(places[i],(x,z)=>world.heightAt(x,z)));
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
   };
  }
 }
 return meshes;
}
