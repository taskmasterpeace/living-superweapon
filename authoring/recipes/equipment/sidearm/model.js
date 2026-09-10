// Service sidearm — procedural factory. Same axis convention as the carbine: grip at the origin,
// barrel toward -Y, +Z the sight side, magazine into the grip toward +Y.
export function createModel(THREE){
 const g=new THREE.Group();g.name='sidearm';
 const gunmetal=new THREE.MeshStandardMaterial({color:'#25282c',roughness:.55,metalness:.4});gunmetal.name='gunmetal';
 const polymer=new THREE.MeshStandardMaterial({color:'#3a3833',roughness:.9,metalness:.02});polymer.name='polymer';
 const mesh=(geo,mat,name,x=0,y=0,z=0,rx=0)=>{const m=new THREE.Mesh(geo,mat);m.name=name;m.position.set(x,y,z);m.rotation.x=rx;m.castShadow=true;g.add(m);return m;};
 mesh(new THREE.BoxGeometry(.26,.9,.3),gunmetal,'slide',0,-.6,.28);
 mesh(new THREE.BoxGeometry(.22,.55,.22),polymer,'frame',0,-.3,.12);
 mesh(new THREE.BoxGeometry(.28,.55,.5),polymer,'grip',0,-.05,-.02);
 mesh(new THREE.CylinderGeometry(.05,.05,.3,8),gunmetal,'barrel',0,-1.15,.28);
 mesh(new THREE.BoxGeometry(.06,.1,.08),gunmetal,'front-sight',0,-.98,.46);
 mesh(new THREE.BoxGeometry(.12,.08,.08),gunmetal,'rear-sight',0,-.2,.46);
 mesh(new THREE.BoxGeometry(.1,.25,.14),gunmetal,'trigger-guard',0,-.42,-.12);
 const magazine=mesh(new THREE.BoxGeometry(.2,.5,.28),gunmetal,'magazine',0,.05,-.06);
 const socket=(name,x,y,z,parent=g,rot=null)=>{const o=new THREE.Object3D();o.name='socket-'+name;o.position.set(x,y,z);if(rot)o.quaternion.copy(rot);parent.add(o);return o;};
 socket('grip',0,0,0);
 socket('support',0,-.25,-.05);
 socket('muzzle',0,-1.32,.28);
 socket('magazine',0,.28,0,magazine);
 // Hip holster: the slide sits against the thigh, muzzle down, grip up and back.
 socket('holster',0,-.35,.2,g,new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,0)));
 return g;
}
