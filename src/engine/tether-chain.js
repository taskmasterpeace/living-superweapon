import * as THREE from 'three';
const transform=new THREE.Object3D(),direction=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),twist=new THREE.Quaternion();
// One instanced draw for a tether of any length; reusable by innate and gadget grapples.
export function updateTetherChain(line,start,end,color){
 let chain=line.userData.chain;
 if(!chain){chain=new THREE.InstancedMesh(new THREE.TorusGeometry(.28,.085,4,8),new THREE.MeshStandardMaterial({color:0xa8b8c1,metalness:.65,roughness:.45,emissive:color,emissiveIntensity:.12}),128);chain.name='tether-chain';chain.instanceMatrix.setUsage(THREE.DynamicDrawUsage);chain.frustumCulled=false;line.add(chain);line.userData.chain=chain;line.userData.disposeChain=()=>{chain.geometry.dispose();chain.material.dispose();chain.removeFromParent();delete line.userData.chain;delete line.userData.disposeChain;};}
 const length=direction.subVectors(end,start).length();chain.count=length>.01?Math.min(128,Math.max(1,Math.ceil(length/.8))):0;if(!chain.count)return;
 direction.normalize();const spacing=length/chain.count;
 for(let i=0;i<chain.count;i++){transform.position.copy(start).addScaledVector(direction,(i+.5)*spacing);transform.quaternion.setFromUnitVectors(up,direction);twist.setFromAxisAngle(up,i%2?Math.PI/2:0);transform.quaternion.multiply(twist);transform.scale.set(1,spacing/.4,1);transform.updateMatrix();chain.setMatrixAt(i,transform.matrix);}
 chain.material.emissive.set(color);chain.instanceMatrix.needsUpdate=true;
}
