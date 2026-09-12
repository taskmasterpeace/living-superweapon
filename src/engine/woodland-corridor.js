import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
const variation=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};

// Sparse arid woodland: shared instanced geometry, native trunk cover and props.
export class WoodlandCorridor{
 constructor(g,route,reserved=[]){
  this.g=g;this.group=new THREE.Group();this.group.name='arid-woodland-corridor';g.scene.add(this.group);this.trees=[];
  for(let i=3;i<route.length-3;i+=2){const a=route[i-1],b=route[i+1],length=Math.hypot(b.x-a.x,b.z-a.z)||1;
   for(const side of [-1,1])for(let cluster=0;cluster<2;cluster++){
    const seed=i*17+(side+1)*41+cluster*79;const offset=34+cluster*18+variation(seed)*12,x=route[i].x+(b.z-a.z)/length*offset*side,z=route[i].z-(b.x-a.x)/length*offset*side+cluster*9+(variation(seed+1)-.5)*16,y=g.world.heightAt(x,z);
    if(!Number.isFinite(y)||g.world.waterAt?.(x,z)||Math.abs(x)>g.world.ARENA-12||Math.abs(z)>g.world.ARENA-12)continue;
    if(g.world.cover.some(c=>Math.abs(c.x-x)<(c.hx??c.r??0)+12&&Math.abs(c.z-z)<(c.hz??c.r??0)+12))continue;
    if(route.some(p=>Math.hypot(p.x-x,p.z-z)<29))continue;
    const scale=.85+(i%5)*.08;
    if(reserved.some(p=>Math.hypot(p.x-x,p.z-z)<p.r+11*scale))continue;
    this.trees.push({x,y,z,scale,yaw:variation(seed+2)*Math.PI*2,heightScale:.85+variation(seed+3)*.3,tint:.78+variation(seed+4)*.3,dead:false,carried:false});
   }
  }
  const trunk=new THREE.CylinderGeometry(.8,1.5,16,6);trunk.translate(0,8,0);
  const lobes=[];
  for(const [x,y,z,sx,sy,sz]of [[0,18,0,5.5,3.8,5],[-5,19,-2,4.8,3.2,4.5],[5,20,1,5.2,3.8,4.5],[1,21,-4,4.5,3.2,4]]){
   const geo=new THREE.IcosahedronGeometry(1,1);geo.scale(sx,sy,sz);geo.translate(x,y,z);lobes.push(geo);
  }
  const crown=mergeGeometries(lobes);for(const geo of lobes)geo.dispose();
  const limbs=[];
  for(const [x,y,z]of [[-5,18,-2],[5,19,1],[1,20,-4]]){
   const start=new THREE.Vector3(0,10,0),end=new THREE.Vector3(x,y,z),delta=end.clone().sub(start);
   const geo=new THREE.CylinderGeometry(.22,.7,delta.length(),5);
   geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));geo.translate(...start.add(end).multiplyScalar(.5).toArray());limbs.push(geo);
  }
  const branch=mergeGeometries(limbs);for(const geo of limbs)geo.dispose();
  this.parts=[{geo:trunk,color:0x66503b},{geo:branch,color:0x66503b},{geo:crown,color:0x727348}];
  for(const part of this.parts){part.mat=new THREE.MeshStandardMaterial({color:part.color,roughness:1,flatShading:true});part.mesh=new THREE.InstancedMesh(part.geo,part.mat,this.trees.length);part.mesh.castShadow=part.mesh.receiveShadow=true;part.mesh.frustumCulled=false;this.group.add(part.mesh);}
  const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion();
  this.trees.forEach((tree,i)=>{
   rotation.setFromAxisAngle(new THREE.Vector3(0,1,0),tree.yaw);
   matrix.compose(new THREE.Vector3(tree.x,tree.y,tree.z),rotation,new THREE.Vector3(tree.scale,tree.scale*tree.heightScale,tree.scale));for(const part of this.parts){part.mesh.setMatrixAt(i,matrix);part.mesh.setColorAt(i,new THREE.Color().setScalar(tree.tint));}
   const standing=matrix.clone();
   const c={x:tree.x,z:tree.z,hx:1.5*tree.scale,hz:1.5*tree.scale,bottom:tree.y,top:tree.y+16*tree.scale*tree.heightScale,h:tree.y+16*tree.scale*tree.heightScale,hp:55,maxHp:55,finiteBuilding:true,standable:false};tree.cover=c;
   tree.remove=()=>{tree.dead=true;c.hp=0;const at=g.world.cover.indexOf(c);if(at>=0)g.world.cover.splice(at,1);const hidden=new THREE.Matrix4().makeScale(0,0,0);for(const p of this.parts){p.mesh.setMatrixAt(i,hidden);p.mesh.instanceMatrix.needsUpdate=true;}g.world.refreshFogBoxes?.();};
   tree.createCarry=()=>{const model=new THREE.Group();for(const p of this.parts){const mat=p.mat.clone();mat.color.multiplyScalar(tree.tint);model.add(new THREE.Mesh(p.geo.clone(),mat));}model.rotation.y=tree.yaw;model.scale.set(tree.scale,tree.scale*tree.heightScale,tree.scale);tree.carried=true;tree.remove();return model;};
   c.onShatter=()=>{tree.remove();g.audio?.sample('debris.wood',{pos:new THREE.Vector3(tree.x,tree.y,tree.z)});};
   c.onReset=()=>{tree.dead=tree.carried=false;for(const p of this.parts){p.mesh.setMatrixAt(i,standing);p.mesh.instanceMatrix.needsUpdate=true;}};
   g.world.cover.push(c);g.world.coverAll.push(c);g.world.treeSpots.push(tree);
  });
  for(const p of this.parts)p.mesh.instanceMatrix.needsUpdate=true;g.world.refreshFogBoxes?.();
 }
 dispose(){
  for(const tree of this.trees){for(const list of [this.g.world.cover,this.g.world.coverAll]){const i=list.indexOf(tree.cover);if(i>=0)list.splice(i,1);}const i=this.g.world.treeSpots.indexOf(tree);if(i>=0)this.g.world.treeSpots.splice(i,1);}
  for(const p of this.parts){p.geo.dispose();p.mat.dispose();}this.group.removeFromParent();this.g.world.refreshFogBoxes?.();
 }
}
