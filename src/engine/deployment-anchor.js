import * as THREE from 'three';

// Shared authored dimensions: 10u reference actor, 16u clear opening.
// Presentation only; native placement and stock remain in ThreatDeployment.
export function createDeploymentAnchor(kind){
 const root=new THREE.Group();root.name=kind==='soldier'?'soldier-induction-vat':'lsw-reserve-portal';
 const shell=new THREE.MeshStandardMaterial({color:0x444b49,roughness:.8,metalness:.25});
 const trim=new THREE.MeshStandardMaterial({color:0xd4b052,emissive:0x493619,roughness:.45,metalness:.5});
 const energy=new THREE.MeshBasicMaterial({color:kind==='soldier'?0xb7d8c9:0xf1c15b,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false});
 const add=(geometry,material,x,y,z)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=material!==energy;mesh.receiveShadow=true;root.add(mesh);return mesh;};
 add(new THREE.CylinderGeometry(12,13,.35,24),shell,0,.18,0);
 if(kind==='soldier'){
  add(new THREE.CylinderGeometry(9,9,.6,20),trim,0,.5,0);
  add(new THREE.CylinderGeometry(9,9,.8,20),shell,0,18,0);
  for(const x of [-8.5,8.5])add(new THREE.BoxGeometry(1.2,17,1.2),shell,x,9,0);
  add(new THREE.CylinderGeometry(8.3,8.3,16,24,1,true,Math.PI/2,Math.PI),energy,0,9,0);
  for(const x of [-8.5,8.5])add(new THREE.BoxGeometry(.3,12,.35),trim,x,9,1);
 }else{
  add(new THREE.TorusGeometry(9,.65,8,48),trim,0,10,0);
  add(new THREE.CircleGeometry(8.4,48),energy,0,10,0);
  for(const x of [-9,9])add(new THREE.BoxGeometry(2,4,3),shell,x,2,0);
 }
 root.userData.kind=kind;
 return root;
}
