import * as THREE from 'three';
// Grip inspection prop. Local X is the handle axis, through the curled fingers;
// this is not yet a gameplay weapon or an imported fleet asset.
export function createGripReviewBat(side=1){
 const bat=new THREE.Group();bat.name='grip-review-baseball-bat';
 const wood=new THREE.MeshStandardMaterial({color:'#b78a50',roughness:.72}),tape=new THREE.MeshStandardMaterial({color:'#242724',roughness:.95});
 const profile=[[.13,-.5],[.13,-.43],[.075,-.4],[.075,.3],[.10,.7],[.19,1.4],[.24,2.2],[.24,2.8],[.19,2.95],[0,3.0]].map(([r,y])=>new THREE.Vector2(r,y));
 const body=new THREE.Mesh(new THREE.LatheGeometry(profile,12),wood);body.rotation.z=-Math.PI/2;body.castShadow=true;bat.add(body);
 const grip=new THREE.Mesh(new THREE.CylinderGeometry(.082,.082,.65,12),tape);grip.rotation.z=-Math.PI/2;bat.add(grip);
 bat.position.set(0,-.25,.12);bat.rotation.y=side<0?Math.PI:0;return bat;
}

