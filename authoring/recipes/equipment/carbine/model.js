// Field carbine — procedural factory (img2threejs method: primitives + named pivots/sockets).
// Built along the engine weapon axis: the grip origin is where the hand closes, the barrel runs
// toward -Y, +Z is the sight side, the magazine hangs toward -Z. Units are game units (1u=0.19m).
export function createModel(THREE){
 const g=new THREE.Group();g.name='carbine';
 const gunmetal=new THREE.MeshStandardMaterial({color:'#2b2f33',roughness:.62,metalness:.35});gunmetal.name='gunmetal';
 const polymer=new THREE.MeshStandardMaterial({color:'#3c3a33',roughness:.88,metalness:.05});polymer.name='polymer';
 const olive=new THREE.MeshStandardMaterial({color:'#5a5b3c',roughness:.9,metalness:0});olive.name='olive-furniture';
 const mesh=(geo,mat,name,x=0,y=0,z=0,rx=0,rz=0)=>{const m=new THREE.Mesh(geo,mat);m.name=name;m.position.set(x,y,z);m.rotation.x=rx;m.rotation.z=rz;m.castShadow=true;g.add(m);return m;};
 mesh(new THREE.BoxGeometry(.34,2.0,.34),gunmetal,'receiver',0,-1.15,.16);
 mesh(new THREE.CylinderGeometry(.075,.075,1.1,10),gunmetal,'barrel',0,-2.62,.16);
 mesh(new THREE.BoxGeometry(.3,1.35,.3),olive,'handguard',0,-1.9,.16);
 mesh(new THREE.BoxGeometry(.52,.9,.62),polymer,'lower-receiver',0,-.3,.12);
 mesh(new THREE.BoxGeometry(.3,.62,.26),polymer,'pistol-grip',0,.12,-.22,.35);
 mesh(new THREE.BoxGeometry(.28,.95,.34),polymer,'stock',0,.575,.16);
 mesh(new THREE.BoxGeometry(.36,.12,.56),polymer,'buttpad',0,1.11,.16);
 mesh(new THREE.BoxGeometry(.1,.55,.1),gunmetal,'front-sight',0,-2.35,.42);
 mesh(new THREE.BoxGeometry(.2,.28,.22),gunmetal,'optic',0,-.85,.5);
 const magazine=mesh(new THREE.BoxGeometry(.28,.46,.65),gunmetal,'magazine',0,-.34,-.515);
 mesh(new THREE.BoxGeometry(.18,.12,.1),gunmetal,'charging-handle',-.32,-.14,.04);
 const socket=(name,x,y,z,parent=g,rot=null)=>{const o=new THREE.Object3D();o.name='socket-'+name;o.position.set(x,y,z);if(rot)o.quaternion.copy(rot);parent.add(o);return o;};
 socket('grip',0,0,0);
 socket('support',0,-.95,-.1); // handguard hold: the engine's own rifle puts its support grip 0.68u down the barrel
 socket('muzzle',0,-3.2,.16);
 socket('magazine',0,-.15,0,magazine);
 // Slung on the back: the weapon lies along the spine, muzzle up-and-out.
 socket('holster',0,.2,.3,g,new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,Math.PI*.12)));
 return g;
}
