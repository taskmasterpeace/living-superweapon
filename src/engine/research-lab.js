import * as THREE from 'three';
import {applyFacilityFinish,labFinishKind} from './facility-finish.js';
import {buildingObstructsView} from './building-cutaway.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
const BASE='./building-delivery/lab.v1/';
export async function installResearchLab(stage){
 const group=stage.group,world=stage.g.world;
 const [asset,data]=await Promise.all([new GLTFLoader().loadAsync(BASE+'lab.glb'),fetch(BASE+'colliders.json').then(r=>{if(!r.ok)throw Error('Lab collision data unavailable');return r.json();})]);
 if(stage.group!==group){asset.scene.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of [].concat(o.material))m.dispose();});return;}
 // Clear placement outside the runway: keep existing scenery and search around the pad.
 let site;
 for(let ring=0;ring<14&&!site;ring++)for(let n=0;n<16;n++){
  const x=-340+Math.cos(n*Math.PI/8)*ring*30,z=-220+Math.sin(n*Math.PI/8)*ring*30;
  if(Math.abs(x)>world.ARENA-60||Math.abs(z)>world.ARENA-60)continue;
  if(world.cover.some(c=>Math.abs(c.x-x)<(c.hx??c.r??0)+27&&Math.abs(c.z-z)<(c.hz??c.r??0)+29))continue;
  const heights=[[-21,-23],[21,-23],[-21,23],[21,23],[0,0]].map(([dx,dz])=>world.heightAt(x+dx,z+dz));
  if(heights.every(Number.isFinite)&&Math.max(...heights)-Math.min(...heights)<1)site={x,z,y:Math.max(...heights)};
 }
 if(!site)throw Error('No clear research-lab pad found');
 const model=asset.scene;model.name='research-lab';model.position.set(site.x,site.y,site.z);group.add(model);
 model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;for(const m of [].concat(o.material))applyFacilityFinish(m,labFinishKind(m.name));stage._mats.push(...[].concat(o.material));}});
 const pieces=[];
 for(const p of data.pieces.filter(p=>p.collider||p.breakGroup==='front_door_leaf')){
  const [a,b]=[p.aabb.min.slice(),p.aabb.max.slice()],node=model.getObjectByName(p.node);
  // Delivery parks its decorative leaf beside an always-open doorway. The
  // runtime gives it a closed position and a real interaction-controlled collider.
  if(p.breakGroup==='front_door_leaf'){for(const v of [a,b]){v[0]+=9;v[2]+=.8;}node.position.x+=9;node.position.z+=.8;}
  const c={x:site.x+(a[0]+b[0])/2,z:site.z+(a[2]+b[2])/2,hx:(b[0]-a[0])/2,hz:(b[2]-a[2])/2,bottom:site.y+a[1],top:site.y+b[1],h:site.y+b[1],hp:p.hp,maxHp:p.hp,mesh:node,finiteBuilding:true,noCam:true,buildingRole:p.role,standable:p.standable,buildingPieceId:p.id,breakGroup:p.breakGroup};
  // Structural meshes combine several pieces. Never let one piece hide the whole shell.
  c.onShatter=()=>{if(!p.breakable){c.hp=c.maxHp;return;}for(const other of pieces.filter(q=>q.breakGroup===c.breakGroup)){other.hp=0;if(other.mesh)other.mesh.visible=false;const i=world.cover.indexOf(other);if(i>=0)world.cover.splice(i,1);}world.refreshFogBoxes?.();};
  pieces.push(c);world.cover.push(c);world.coverAll.push(c);stage._cover.push(c);
 }
 // Render-pass-local cutaway: another camera still sees an intact exterior.
 const byMesh=new Map();for(const c of pieces){if(!c.mesh)continue;if(!byMesh.has(c.mesh))byMesh.set(c.mesh,[]);byMesh.get(c.mesh).push(c);}
 // Decorative trim still occludes the camera. Its authored bounds participate
 // only in presentation; do not turn door frames/floor finishes into colliders.
 for(const p of data.pieces.filter(p=>!p.collider&&p.breakGroup!=='front_door_leaf')){
  const mesh=model.getObjectByName(p.node);if(!mesh?.isMesh)continue;
  const a=p.aabb.min,b=p.aabb.max;
  const box={x:site.x+(a[0]+b[0])/2,z:site.z+(a[2]+b[2])/2,hx:(b[0]-a[0])/2,hz:(b[2]-a[2])/2,bottom:site.y+a[1],top:site.y+b[1],presentationOnly:true};
  if(!byMesh.has(mesh))byMesh.set(mesh,[]);byMesh.get(mesh).push(box);
 }
 for(const [mesh,boxes] of byMesh){
  const originals=[].concat(mesh.material);mesh.material=originals.map(m=>{const copy=m.clone();applyFacilityFinish(copy,labFinishKind(m.name));copy.transparent=true;stage._mats.push(copy);return copy;});
  if(!Array.isArray(originals)||mesh.material.length===1)mesh.material=mesh.material[0];
  mesh.onBeforeRender=(_r,_s,camera)=>{const p=stage.g.player?.pos,cam=camera.position;const hit=p&&boxes.some(c=>(c.presentationOnly||world.cover.includes(c))&&buildingObstructsView(world,cam,p,c));for(const m of [].concat(mesh.material)){m.opacity=hit?.18:1;m.depthWrite=!hit;}};
  mesh.onAfterRender=()=>{for(const m of [].concat(mesh.material)){m.opacity=1;m.depthWrite=true;}};
 }
 const door=pieces.filter(c=>c.breakGroup==='front_door_leaf');let doorOpen=false;
 const handle=stage.g.registerInteractable({id:'research-lab-door',pos:new THREE.Vector3(site.x-9,site.y+5,site.z+22.4),r:12,label:'LAB DOOR',verb:'OPEN',priority:2,
  enabled:f=>door.some(c=>c.hp>0)&&Math.abs(f.pos.y-site.y)<5,
  onUse:()=>{
   if(doorOpen&&stage.g.entities.some(f=>f.alive&&door.some(c=>Math.abs(f.pos.x-c.x)<c.hx+f.radius&&Math.abs(f.pos.z-c.z)<c.hz+f.radius&&f.pos.y<c.top)))return;
   doorOpen=!doorOpen;for(const c of door){if(c.mesh)c.mesh.visible=!doorOpen;const i=world.cover.indexOf(c);if(doorOpen&&i>=0)world.cover.splice(i,1);else if(!doorOpen&&i<0&&c.hp>0)world.cover.push(c);}handle.verb=doorOpen?'CLOSE':'OPEN';world.refreshFogBoxes?.();
  }});
 for(const c of pieces)c.onReset=()=>{if(c.mesh)c.mesh.visible=true;doorOpen=false;handle.verb='OPEN';};
 stage.researchLab={model,pieces,site,doorHandle:handle,dispose(){stage.g.unregisterInteractable(handle);}};world.refreshFogBoxes?.();return stage.researchLab;
}
