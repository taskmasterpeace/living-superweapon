import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function buildHighwallGeometry(layout,{labels=typeof document!=='undefined'}={}){
 const root=new THREE.Group();root.name='HIGHWALL / modular battlefield';
 const colors={concrete:0xaaa593,cap:0x333c3b,steel:0x616b61,dark:0x252e2d,gold:0xd9b54d,blue:0x4b8ba1,red:0xa9483e,floor:0x777c6b,paint:0xc9c7ad};
 const mats=Object.fromEntries(Object.entries(colors).map(([k,color])=>[k,new THREE.MeshStandardMaterial({color,roughness:.93,flatShading:true})]));
 const batches=new Map();
 const box=(x,y,z,w,h,d,mat)=>{const geo=new THREE.BoxGeometry(w,h,d);geo.translate(x,y,z);if(!batches.has(mat))batches.set(mat,[]);batches.get(mat).push(geo);};
 box(0,-1.5,0,2300,3,2300,mats.floor);
 for(const p of layout.pieces){
  const w=p.hx*2,d=p.hz*2,h=p.top-p.bottom;
  box(p.x,p.bottom+h/2,p.z,w,h,d,p.kind==='gate'?mats.steel:mats.concrete);
  if(p.kind!=='step'&&p.kind!=='deck')box(p.x,p.top+.6,p.z,w+1,1.2,d+1,mats.cap);
  if(p.kind==='wall'||p.kind==='gate'){
   const vertical=d>w;
   box(p.x,p.bottom+2,p.z,w+.4,4,d+.4,mats.steel);
   for(const end of[-1,1])box(p.x+(vertical?0:end*(p.hx-1)),p.bottom+h/2,p.z+(vertical?end*(p.hz-1):0),vertical?w+.6:1.4,h,vertical?1.4:d+.6,mats.steel);
   box(p.x,p.top-7,p.z,w+.6,1.2,d+.6,mats.gold);
  }
 }
 // Route paint is deliberately separate from cover. Wide amber lane: armor;
 // narrow blue/red muster pads show team starts even without a minimap.
 for(let z=-270;z<=270;z+=24){for(const x of[18,114])box(x,.12,z,1.5,.12,13,mats.gold);box(66,.13,z,1,.12,7,mats.paint);}
 for(let x=-300;x<=300;x+=25)box(x,.11,260,12,.12,1.4,mats.paint);
 for(const[team,starts]of[[mats.blue,layout.blue],[mats.red,layout.red]])for(const p of starts){box(p.x,.15,p.z,12,.16,12,team);box(p.x,.25,p.z+5,10,.12,.8,mats.paint);}
 for(const z of[-160,80])for(const x of[-44,-32,-20,-8])box(x,.2,z,4,.16,2,mats.gold);
 for(const[mat,geos]of batches){const mesh=new THREE.Mesh(mergeGeometries(geos),mat);mesh.castShadow=mat!==mats.floor;mesh.receiveShadow=true;root.add(mesh);for(const geo of geos)geo.dispose();}
 if(labels)for(const sign of layout.signs){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const c=canvas.getContext('2d');
  c.fillStyle='#252e2d';c.fillRect(0,0,1024,256);c.fillStyle='#d9b54d';c.fillRect(0,0,1024,12);c.textAlign='center';c.font='700 72px Rajdhani, sans-serif';c.fillText(sign.text,512,116);c.fillStyle='#e8e2d6';c.font='500 32px Inter, sans-serif';c.fillText(sign.sub,512,185);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(sign.w,sign.w/4),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));mesh.position.set(sign.x,sign.y,sign.z);root.add(mesh);
 }
 root.userData.dispose=()=>{root.removeFromParent();const materials=new Set();root.traverse(o=>{o.geometry?.dispose();if(o.material)materials.add(o.material);});for(const m of materials){m.map?.dispose();m.dispose();}};
 return root;
}
