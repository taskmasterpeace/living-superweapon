import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {HIGHWALL_MODULES as KIT} from '../data/highwall-modules.js';

export function buildHighwallGeometry(layout,{labels=typeof document!=='undefined'}={}){
 const root=new THREE.Group();root.name='HIGHWALL / modular battlefield';
 const colors=KIT.palette;
 const mats=Object.fromEntries(Object.entries(colors).map(([k,color])=>[k,new THREE.MeshStandardMaterial({color,roughness:.93,flatShading:true})]));
 const batches=new Map();
 const box=(x,y,z,w,h,d,mat)=>{const geo=new THREE.BoxGeometry(w,h,d);geo.translate(x,y,z);if(!batches.has(mat))batches.set(mat,[]);batches.get(mat).push(geo);};
 box(0,-1.5,0,2300,3,2300,mats.floor);
 for(const p of layout.pieces){
  const w=p.hx*2,d=p.hz*2,h=p.top-p.bottom;
  const dressed=['wall','gate','tower','post','cover'].includes(p.kind);
  box(p.x,p.bottom+h/2,p.z,w-(dressed?.08:0),h-(dressed?.08:0),d-(dressed?.08:0),p.kind==='gate'?mats.steel:p.kind==='roof'?mats.cap:mats.concrete);
  if(dressed)box(p.x,p.top-1.5,p.z,w,3,d,mats.cap);
  if(p.kind==='wall'||p.kind==='gate'||p.kind==='tower'){
   const vertical=d>w;
   // Wide masonry base and inset face panels; all parts remain inside the collider.
   box(p.x,p.bottom+2.5,p.z,w,5,d,mats.steel);
   for(const side of[-1,1]){
    const inset=KIT.wall.panelInset;
    box(p.x+(vertical?side*(p.hx-inset/2):0),p.bottom+(h-8)/2+5,p.z+(vertical?0:side*(p.hz-inset/2)),vertical?inset:w-5,h-8,vertical?d-5:inset,mats.paint);
   }
   box(p.x,p.top-5,p.z,w,.7,d,mats.gold);
  }
 }
 // Route paint is deliberately separate from cover. Wide amber lane: armor;
 // Small corner stencils mark muster positions without turning the floor into a debug overlay.
 for(let z=-270;z<=270;z+=24){for(const x of[18,114])box(x,.12,z,1.5,.12,13,mats.gold);box(66,.13,z,1,.12,7,mats.paint);}
 for(let x=-300;x<=300;x+=25)box(x,.11,260,12,.12,1.4,mats.paint);
 for(const[team,starts]of[[mats.blue,layout.blue],[mats.red,layout.red]])for(const p of starts){for(const side of[-1,1]){box(p.x+side*5,.08,p.z+5,2,.08,.45,team);box(p.x+side*5.8,.08,p.z+4,.45,.08,2,team);}}
 for(const z of[-160,80])for(const x of[-44,-32,-20,-8])box(x,.2,z,4,.16,2,mats.gold);
 for(const[mat,geos]of batches){const mesh=new THREE.Mesh(mergeGeometries(geos),mat);mesh.castShadow=mat!==mats.floor;mesh.receiveShadow=true;root.add(mesh);for(const geo of geos)geo.dispose();}
 if(labels)for(const sign of layout.signs){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const c=canvas.getContext('2d');
  c.fillStyle='#252e2d';c.fillRect(0,0,1024,256);c.fillStyle='#d9b54d';c.fillRect(0,0,1024,12);c.textAlign='center';c.font='700 72px Rajdhani, sans-serif';c.fillText(sign.text,512,116);c.fillStyle='#e8e2d6';c.font='500 32px Inter, sans-serif';c.fillText(sign.sub,512,185);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map:tex}),geometry=new THREE.PlaneGeometry(sign.w,sign.w/4);
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(sign.x,sign.y,sign.z+.04);root.add(mesh);
  const back=new THREE.Mesh(geometry,material);back.position.set(sign.x,sign.y,sign.z-.04);back.rotation.y=Math.PI;root.add(back);
 }
 root.userData.dispose=()=>{root.removeFromParent();const materials=new Set();root.traverse(o=>{o.geometry?.dispose();if(o.material)materials.add(o.material);});for(const m of materials){m.map?.dispose();m.dispose();}};
 return root;
}
