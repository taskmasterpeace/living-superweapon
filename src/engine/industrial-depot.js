import * as THREE from 'three';
import {applyFacilityFinish} from './facility-finish.js';

// Reusable loading-bay recipe. Same game-unit scale as the lab and transport;
// 18u clear entrance fits the standard 10u actor without scaling the actor.
export const DEPOT_BAY={width:40,depth:42,height:24,doorWidth:18};
export class IndustrialDepot{
 constructor(game,destination,route=[]){
  this.g=game;this.route=route;this.group=new THREE.Group();this.group.name='research-industrial-depot';game.scene.add(this.group);this.covers=[];
  this.geo=new THREE.BoxGeometry(1,1,1);
  this.materials={wall:new THREE.MeshStandardMaterial({color:0xb2a386,roughness:.9}),steel:new THREE.MeshStandardMaterial({color:0x4f5959,roughness:.7,metalness:.3}),trim:new THREE.MeshStandardMaterial({color:0xc1a154,roughness:.7}),freight:new THREE.MeshStandardMaterial({color:0x795841,roughness:.9})};
  applyFacilityFinish(this.materials.wall,'wall');applyFacilityFinish(this.materials.steel,'steel');
  this.sites=[];
  for(const side of [-1,1]){
   const site=this.findSite(destination,side);if(site){this.sites.push(site);this.bay(site);}
  }
  this.g.world.refreshFogBoxes?.();
 }
 findSite(origin,side){
  const w=this.g.world;
  for(const dz of [0,48,-48,96])for(const offset of [65,95,125]){
   const x=origin.x+side*offset,z=origin.z+dz;
   if(Math.abs(x)+24>w.ARENA||Math.abs(z)+26>w.ARENA)continue;
   if(this.route.some((b,i)=>{const a=this.route[Math.max(0,i-1)],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/4));for(let j=0;j<=n;j++)if(Math.abs(a.x+(b.x-a.x)*j/n-x)<44&&Math.abs(a.z+(b.z-a.z)*j/n-z)<46)return true;return false;}))continue;
   if(w.cover.some(c=>c.hp>0&&Math.abs(c.x-x)<(c.hx??c.r??0)+24&&Math.abs(c.z-z)<(c.hz??c.r??0)+26))continue;
   const heights=[[-22,-24],[22,-24],[-22,24],[22,24],[0,0]].map(([dx,dz])=>w.heightAt(x+dx,z+dz));
   if(heights.every(Number.isFinite)&&Math.max(...heights)-Math.min(...heights)<1&&!w.waterAt?.(x,z))return {x,z,y:Math.max(...heights),side};
  }
  return null;
 }
 box(site,name,x,y,z,w,h,d,material,solid=false){
  const mesh=new THREE.Mesh(this.geo,this.materials[material]);mesh.name=name;mesh.position.set(site.x+x,site.y+y,site.z+z);mesh.scale.set(w,h,d);mesh.castShadow=mesh.receiveShadow=true;this.group.add(mesh);
  if(solid){
   const c={x:mesh.position.x,z:mesh.position.z,hx:w/2,hz:d/2,bottom:mesh.position.y-h/2,top:mesh.position.y+h/2,h:mesh.position.y+h/2,hp:180,maxHp:180,finiteBuilding:true,standable:true,noCam:true,mesh};
   mesh.userData.decorations=[];
   c.onShatter=()=>{mesh.visible=false;for(const child of mesh.userData.decorations)child.visible=false;const i=this.g.world.cover.indexOf(c);if(i>=0)this.g.world.cover.splice(i,1);this.g.world.refreshFogBoxes?.();this.g.audio?.sample('rubble',{pos:mesh.position});};
   c.onReset=()=>{mesh.visible=true;for(const child of mesh.userData.decorations)child.visible=true;};this.covers.push(c);this.g.world.cover.push(c);this.g.world.coverAll.push(c);
  }
  return mesh;
 }
 bay(s){
  const {width:w,depth:d,height:h,doorWidth:door}=DEPOT_BAY;
  this.box(s,'depot-foundation',0,.25,0,w+4,.5,d+4,'wall',true);
  this.box(s,'depot-back',0,h/2,d/2,w,h,1.5,'wall',true);
  const sides=[];for(const x of [-w/2,w/2])sides.push(this.box(s,'depot-side',x,h/2,0,1.5,h,d,'wall',true));
  for(const sign of [-1,1])this.box(s,'loading-door-jamb',sign*(door/2+(w-door)/4),h/2,-d/2,(w-door)/2,h,1.5,'steel',true);
  const header=this.box(s,'loading-door-header',0,21,-d/2,door,6,1.5,'trim',true);
  this.box(s,'depot-roof',0,h+.6,0,w+4,1.2,d+4,'steel',true);
  // Shared narrow ribs provide readable sheet-metal relief at oblique angles.
  for(let z=-18;z<=18;z+=6)for(const [i,x]of [-20.9,20.9].entries())sides[i].userData.decorations.push(this.box(s,'sheet-metal-rib',x,h/2,z,.3,h,.45,'steel'));
  for(const x of [-14,14]){
   const freight=this.box(s,'freight-case',x,3,10,7,6,10,'freight',true);
   for(const dx of [-2.5,2.5])freight.userData.decorations.push(this.box(s,'freight-band',x+dx,3,4.9,.4,6,.2,'steel'));
  }
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle='#303a36';ctx.fillRect(0,0,512,96);ctx.fillStyle='#e5c777';ctx.font='bold 44px sans-serif';ctx.textAlign='center';ctx.fillText('RESEARCH LOGISTICS',256,63);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(30,5.6),new THREE.MeshBasicMaterial({map:texture}));sign.position.set(s.x,s.y+21,s.z-21.8);sign.rotation.y=Math.PI;this.group.add(sign);header.userData.decorations.push(sign);
 }
 dispose(){
  for(const c of this.covers)for(const list of [this.g.world.cover,this.g.world.coverAll]){const i=list.indexOf(c);if(i>=0)list.splice(i,1);}
  const geos=new Set(),mats=new Set();this.group.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)mats.add(o.material);});for(const m of mats){m.map?.dispose();m.dispose();}for(const geo of geos)geo.dispose();this.group.removeFromParent();this.g.world.refreshFogBoxes?.();
 }
}
