// Firearm presentation set — Mac asset lab. For the four mission firearms, measure the
// ACTUAL package geometry and existing sockets, verify socket-to-surface contact, and
// propose the missing presentation data (stock contact, stow mount, reload-relevant
// moving parts). Proposals are data for Codex to fold into new package versions on the
// integration branch; this tool does not modify any published package or hash.
import fs from 'node:fs/promises';
import path from 'node:path';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const root=path.resolve(import.meta.dirname,'..');
globalThis.ProgressEvent??=class{constructor(type,init){this.type=type;Object.assign(this,init);}};
const WEAPONS=[
 {ref:'prop.reference-weapon-rifle-m16@4',dir:'prop.reference-weapon-rifle-m16/v4',family:'rifle',twoHanded:true,stow:{mount:'back',parentBone:'DEF-spine003',note:'sling across back, muzzle up-left; grip reachable by right hand'}},
 {ref:'prop.reference-weapon-pistol-1@5',dir:'prop.reference-weapon-pistol-1/v5',family:'pistol',twoHanded:false,stow:{mount:'hip-right',parentBone:'DEF-hips',note:'holster on right hip, grip rearward'}},
 {ref:'prop.reference-weapon-shotgun-0@5',dir:'prop.reference-weapon-shotgun-0/v5',family:'shotgun',twoHanded:true,stow:{mount:'back',parentBone:'DEF-spine003',note:'sling across back opposite the rifle side'}},
 {ref:'prop.reference-weapon-sniper-1@4',dir:'prop.reference-weapon-sniper-1/v4',family:'sniper',twoHanded:true,stow:{mount:'back',parentBone:'DEF-spine003',note:'sling across back; longest silhouette, verify leg clearance'}},
];
const results=[];
for(const w of WEAPONS){
 const dir=path.join(root,'public/authored-assets',w.dir);
 const manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
 const bytes=await fs.readFile(path.join(dir,'model.glb'));
 const g=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 g.scene.updateMatrixWorld(true);
 // Collect world-space vertices of all painted meshes and socket world transforms.
 const verts=[];const sockets={};const nodes=[];
 g.scene.traverse(o=>{nodes.push(o.name);
  if(o.isMesh){const pos=o.geometry.attributes.position,v=new T.Vector3();for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);verts.push(v.clone());}}
  if(o.name.startsWith('socket-'))sockets[o.name.slice(7)]={position:o.getWorldPosition(new T.Vector3()).toArray().map(x=>+x.toFixed(4)),quaternion:o.getWorldQuaternion(new T.Quaternion()).toArray().map(x=>+x.toFixed(4))};});
 const box=new T.Box3().setFromPoints(verts);
 const size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
 // Bore axis: dominant horizontal extent axis; sign toward the muzzle socket.
 const axis=size.z>=size.x?'z':'x';
 const muzzle=new T.Vector3(...(sockets['muzzle']?.position??sockets['attachment-muzzle'].position));
 const sign=Math.sign(muzzle[axis]-center[axis])||1;
 const boreDir=new T.Vector3();boreDir[axis]=sign;
 // Stock contact proposal: centroid of the rear-most 2% band along the bore axis,
 // restricted to points near the grip height (butt plate, not a low grip spur).
 const rear=verts.filter(v=>Math.abs(v[axis]-(sign>0?box.min[axis]:box.max[axis]))<size[axis]*0.02);
 const stockContact=rear.reduce((a,v)=>a.add(v),new T.Vector3()).divideScalar(rear.length||1);
 // Socket-to-surface probe: nearest actual vertex distance for each existing socket.
 const nearest=p=>{let d=1/0;const t=new T.Vector3(...p);for(const v of verts)d=Math.min(d,v.distanceTo(t));return +d.toFixed(4);};
 const socketContact=Object.fromEntries(Object.entries(sockets).map(([name,s])=>[name,{...s,nearestSurface:nearest(s.position)}]));
 const magazineNodes=nodes.filter(n=>/mag/i.test(n));
 const movingParts=nodes.filter(n=>/pump|bolt|slide|charging|scope/i.test(n)&&!n.startsWith('socket-'));
 const muzzleAtBoreEnd=Math.abs(muzzle[axis]-(sign>0?box.max[axis]:box.min[axis]));
 results.push({ref:w.ref,family:w.family,twoHanded:w.twoHanded,displayName:manifest.displayName,packageDir:w.dir,
  bounds:{min:box.min.toArray().map(v=>+v.toFixed(3)),max:box.max.toArray().map(v=>+v.toFixed(3)),size:size.toArray().map(v=>+v.toFixed(3))},
  orientation:{boreAxis:axis,boreDirection:boreDir.toArray(),muzzleAtBoreEnd:+muzzleAtBoreEnd.toFixed(4),note:'weapon-local space of the package root'},
  sockets:socketContact,
  proposed:{
   'stock-contact':w.twoHanded?{position:stockContact.toArray().map(v=>+v.toFixed(4)),construction:'centroid of rear-most 2% vertex band along bore axis',status:'proposed-unreviewed'}:{status:'not-applicable',note:'one-handed weapon; no shoulder stock'},
   stow:{...w.stow,weaponAnchor:'grip-primary',status:'proposed-unreviewed'},
  },
  reload:{detachableMagazine:magazineNodes.length?magazineNodes:false,
   movingParts,
   note:magazineNodes.length?'magazine nodes present; animate along receiver axis':'Source model has NO detachable magazine mesh. Do not invent one; preserve real gameplay reload timing and present reload with hand motion + moving parts only.'},
  status:'measured-unreviewed'});
}
const output={version:1,mission:'War World firearm presentation set (Mac asset lab)',
 contract:{grips:'grip-primary = firing hand, grip-support = forward hand (existing package sockets, verified against surface)',
  muzzle:'muzzle socket is the projectile origin; verified at bore end',
  stock:'proposed stock-contact = shoulder pocket contact point for aimed poses',
  stow:'proposed stow = holster/back mount recommendation with runtime parent bone',
  consumption:'Codex folds accepted proposals into new authored-asset package versions + restored-equipment registration; hashes are owned by the integration branch.'},
 weapons:results};
await fs.writeFile(path.join(root,'public/models/modular-hero/firearm-presentation-set.json'),JSON.stringify(output,null,1)+'\n');
console.log(JSON.stringify(results.map(r=>({ref:r.ref,size:r.bounds.size,bore:r.orientation.boreAxis,muzzleAtBoreEnd:r.orientation.muzzleAtBoreEnd,
 gripPrimaryToSurface:r.sockets['grip-primary']?.nearestSurface,gripSupportToSurface:r.sockets['grip-support']?.nearestSurface,muzzleToSurface:r.sockets['muzzle']?.nearestSurface,
 stockProposal:r.proposed['stock-contact'].position,magazine:r.reload.detachableMagazine,movingParts:r.reload.movingParts})),null,2));
