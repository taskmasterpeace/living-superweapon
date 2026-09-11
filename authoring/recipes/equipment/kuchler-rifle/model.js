// Fictional Kuchler Mk I rifle, adapted from War World: Earth weapons.ts.
// Copyright (c) 2026 Machine King Labs. MIT; see LICENSE.txt and provenance.json.
// One selected frame + Kuchler vents + rifle slats. No simulation registry import.
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const KUCHLER={sourceLength:1.1004,lengthMeters:.82,metersPerUnit:.19,grip:[-.15,-.09675,0],support:[.18,-.085,0]};
export function createModel(THREE){
 const root=new THREE.Group();root.name='kuchler-rifle';
 const metal=new THREE.MeshStandardMaterial({color:0x4a4e55,metalness:.55,roughness:.38});metal.name='kuchler-steel';
 const dark=new THREE.MeshStandardMaterial({color:0x39404a,roughness:.72});dark.name='kuchler-polymer';
 const source=new THREE.Group(),special=new Set();
 const add=(geo,mat,name,x=0,y=0,z=0,rz=0)=>{const m=new THREE.Mesh(geo,mat);m.name=name;m.position.set(x,y,z);m.rotation.z=rz;source.add(m);return m;};
 const box=(w,h,d,mat,name,x=0,y=0,z=0,rz=0)=>add(new THREE.BoxGeometry(w,h,d),mat,name,x,y,z,rz);
 const recLen=.66*.94,recH=.11*.85,bl=.34*.94,br=.028*.85,muzzle=recLen/2+bl-.02;
 box(recLen,recH,.09*.85,metal,'receiver');
 add(new THREE.CylinderGeometry(br,br,bl,6),metal,'barrel',recLen/2+bl/2-.02,.01,0,Math.PI/2);
 box(.2,.13*.85,.06,dark,'stock',-recLen/2-.08,-.03);
 const magH=.18*.85,mag=box(.08,magH,.05,dark,'weapon-magazine',.05,-recH/2-magH/2+.02,0,.22);special.add(mag);
 box(.06,.12,.05,dark,'pistol-grip',-.15,-recH/2-.05);
 for(let i=0;i<3;i++)box(.05,.012,.1,dark,'vent-'+i,-.1+i*.11,recH/2+.008);
 for(let i=0;i<2;i++)box(.16,.02,.1,dark,'rail-'+i,.26,-.035-i*.028);
 box(.015,.05,.015,metal,'front-sight',recLen/2+bl/2-.02+.06,.05);
 // PowerWorld addition: a physical, separately driven charging handle.
 const bolt=box(.065,.025,.035,metal,'weapon-charging-handle',-.05,.015,.06);special.add(bolt);
 const scale=KUCHLER.lengthMeters/KUCHLER.metersPerUnit/KUCHLER.sourceLength;
 // Right-handed mapping: source +X muzzle -> -Y; +Y up -> +Z sight; +Z -> -X.
 const basis=new THREE.Matrix4().set(0,0,-scale,0,-scale,0,0,0,0,scale,0,0,0,0,0,1);
 basis.multiply(new THREE.Matrix4().makeTranslation(...KUCHLER.grip.map(n=>-n)));
 source.updateMatrixWorld(true);const batches=new Map();
 for(const mesh of source.children){
  const geo=mesh.geometry.clone();geo.applyMatrix4(basis.clone().multiply(mesh.matrixWorld));mesh.geometry.dispose();
  if(special.has(mesh)){const out=new THREE.Mesh(geo,mesh.material);out.name=mesh.name;out.castShadow=true;root.add(out);}
  else{if(!batches.has(mesh.material))batches.set(mesh.material,[]);batches.get(mesh.material).push(geo);}
 }
 for(const [material,parts]of batches){const geo=mergeGeometries(parts);parts.forEach(p=>p.dispose());const m=new THREE.Mesh(geo,material);m.name=material===metal?'receiver-assembly':'furniture-assembly';m.castShadow=true;root.add(m);}
 const socket=(name,at,rotation=null)=>{const n=new THREE.Object3D();n.name='socket-'+name;n.position.fromArray(at).applyMatrix4(basis);if(rotation)n.quaternion.copy(rotation);root.add(n);return n;};
 socket('grip',KUCHLER.grip);socket('support',KUCHLER.support);socket('muzzle',[muzzle,.01,0]);
 socket('magazine',[.05,-recH/2-magH*.65+.02,0]);socket('charging-handle',[-.05,.015,.06]);
 socket('stock',[-recLen/2-.18,-.03,0]);
 const sling=new THREE.Object3D();sling.name='socket-holster';sling.position.set(0,.2,.3);sling.rotation.z=Math.PI*.12;root.add(sling);
 return root;
}
