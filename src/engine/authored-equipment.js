import * as THREE from 'three';
import {loadEquipmentInstance as defaultLoadEquipmentInstance} from './authored-assets.js';
import {mountHeldWeapon,unmountHeldWeapon} from './weapon-emission.js';
import {restoredEquipmentMountManifest} from '../data/restored-equipment.js';

const socketMatrix=socket=>new THREE.Matrix4().compose(new THREE.Vector3(...socket.position),new THREE.Quaternion(...socket.rotation),new THREE.Vector3(1,1,1));
const copyTriangleAttributes=(geometry,keep,owned)=>{
 const output=new THREE.BufferGeometry(),index=geometry.index;
 owned.add(output);
 for(const [name,attribute]of Object.entries(geometry.attributes)){
  const values=[];for(let triangle=0;triangle<(index?.count??geometry.attributes.position.count)/3;triangle++)if(keep(triangle))for(let corner=0;corner<3;corner++){const i=index?index.getX(triangle*3+corner):triangle*3+corner;for(let component=0;component<attribute.itemSize;component++)values.push(attribute.getComponent(i,component));}
  output.setAttribute(name,new THREE.BufferAttribute(new attribute.array.constructor(values),attribute.itemSize,attribute.normalized));
 }
 output.computeBoundingBox();output.computeBoundingSphere();return output;
};
function extractGeometry(root,name,inside,owned){
 let result=null;
 root.traverse(mesh=>{
  if(result||!mesh.isMesh)return;
  const selected=[],index=mesh.geometry.index,p=mesh.geometry.attributes.position;
  for(let triangle=0;triangle<(index?.count??p.count)/3;triangle++){
   let x=0,y=0,z=0;
   for(let corner=0;corner<3;corner++){const i=index?index.getX(triangle*3+corner):triangle*3+corner;x+=p.getX(i);y+=p.getY(i);z+=p.getZ(i);}if(inside(x/3,y/3,z/3))selected.push(triangle);
  }
  if(!selected.length)return;const chosen=new Set(selected),old=mesh.geometry,part=mesh.clone(false);
  part.geometry=copyTriangleAttributes(old,triangle=>chosen.has(triangle),owned);part.name=name;part.userData.physicalEquipmentPart=true;
  mesh.geometry=copyTriangleAttributes(old,triangle=>!chosen.has(triangle),owned);mesh.parent.add(part);result=part;
 });
 return result;
}
function alias(wrapper,name,matrix){const node=new THREE.Object3D();node.name=name;node.matrix.copy(matrix);node.matrix.decompose(node.position,node.quaternion,node.scale);wrapper.add(node);return node;}
function namedActionPart(root,name,socketFrame,owned){
 const part=root.getObjectByName(name);if(!part)return null;
 if(!part.isMesh||!part.geometry?.attributes.position?.count||!socketFrame)throw Error(`Named action part ${name} requires physical geometry and its socket.`);
 // Move the mesh pivot to the authored contact without moving a single visible
 // vertex. The source loader still owns the original; this mount owns the copy.
 root.updateWorldMatrix(true,true);
 const socketWorld=root.parent.matrixWorld.clone().multiply(socketFrame);
 const nextLocal=part.parent.matrixWorld.clone().invert().multiply(socketWorld);
 const geometry=part.geometry.clone();owned.add(geometry);
 geometry.applyMatrix4(nextLocal.clone().invert().multiply(part.matrix));
 part.geometry=geometry;nextLocal.decompose(part.position,part.quaternion,part.scale);
 part.userData.physicalEquipmentPart=true;part.userData.authoredActionPivot=true;return part;
}
function stockFromGeometry(wrapper){
 wrapper.updateMatrixWorld(true);const inverse=wrapper.matrixWorld.clone().invert(),p=new THREE.Vector3(),points=[];
 wrapper.traverse(mesh=>{if(!mesh.isMesh)return;const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++)points.push(p.fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse).clone());});
 if(!points.length)return null;const rear=Math.max(...points.map(v=>v.y)),pad=points.filter(v=>v.y>rear-.14),center=pad.reduce((sum,v)=>sum.add(v),new THREE.Vector3()).multiplyScalar(1/pad.length);
 const node=alias(wrapper,'weapon-stock-contact',new THREE.Matrix4().makeTranslation(center.x,center.y,center.z));node.userData.derivedFromGeometry=true;return node;
}

export function createEquipmentMount(asset,{weaponKind}){
 const {root}=asset,wrapper=new THREE.Group();wrapper.name=`authored-${weaponKind}`;wrapper.userData.weaponKind=weaponKind;
 // The loader owns its original resources. Every split, including intermediate
 // remainders no longer in the graph, belongs to this mount instead.
 const owned=new Set();let disposed=false;
 wrapper.userData.disposeEquipment=()=>{if(disposed)return;disposed=true;for(const geometry of owned)geometry.dispose();owned.clear();asset.dispose();if(wrapper.userData.proceduralFallback)wrapper.userData.proceduralFallback.visible=true;wrapper.removeFromParent();};
 try{
 const manifest=restoredEquipmentMountManifest(asset.manifest,weaponKind);
 wrapper.userData.equipmentSource=`${manifest.id}@${manifest.version}`;
 wrapper.userData.reloadPresentation=manifest.equipment?.reloadPresentation||'physical-magazine-bolt';
 wrapper.userData.rifleContact=!!manifest.equipment?.twoHanded;wrapper.userData.twoHanded=!!manifest.equipment?.twoHanded;
 root.updateMatrixWorld(true);const rootInverse=root.matrixWorld.clone().invert();
 const sockets=new Map((manifest.sockets||[]).map(socket=>{
  const node=root.getObjectByName('socket-'+socket.name);
  return [socket.name,node?rootInverse.clone().multiply(node.matrixWorld):socketMatrix(socket)];
 })),grip=sockets.get('grip');if(!grip)throw Error('Equipment package requires a primary grip socket.');
 const inverseGrip=grip.clone().invert();root.applyMatrix4(inverseGrip);wrapper.add(root);
 const frame=name=>sockets.has(name)?inverseGrip.clone().multiply(sockets.get(name)):null;
 for(const [source,target]of [['grip','weapon-primary-grip'],['support','weapon-support-grip'],['muzzle','weapon-muzzle'],['holster','weapon-holster']])if(sockets.has(source))alias(wrapper,target,frame(source));
 if(weaponKind==='rifle'&&manifest.equipment?.sourceAdapter!=='restored-arsenal-v1'){
  const namedMagazine=namedActionPart(root,'weapon-magazine',frame('magazine'),owned);
  const magazine=namedMagazine||extractGeometry(root,'weapon-magazine',(x,y,z)=>Math.abs(x)<.18&&y>-.59&&y<-.09&&z>-.86&&z<-.18,owned);
  const bolt=namedActionPart(root,'weapon-charging-handle',frame('charging-handle'),owned)||extractGeometry(root,'weapon-charging-handle',(x,y,z)=>x<-.2&&x>-.44&&y>-.23&&y<-.05&&z>-.04&&z<.13,owned);
  if(!magazine||!bolt)throw Error('Carbine GLB is missing physical magazine or charging-handle geometry.');
  const magGrip=alias(magazine,'magazine-grip',new THREE.Matrix4().identity());if(!namedMagazine)magGrip.position.set(0,-.21,0);
  if(sockets.has('stock'))alias(wrapper,'weapon-stock-contact',frame('stock'));else stockFromGeometry(wrapper);
 }
 if(weaponKind==='rifle'&&manifest.equipment?.sourceAdapter==='restored-arsenal-v1')stockFromGeometry(wrapper);
 wrapper.userData.authoredEquipment=true;return wrapper;
 }catch(error){wrapper.userData.disposeEquipment();throw error;}
}

const valid=(f,capture)=>!f._formDisposed&&f.alive!==false&&f.state!=='ko'&&f.parts===capture.parts&&f.parts?.rig===capture.rig&&f._equipmentLoadGeneration===capture.generation&&f._gearHeld===capture.gear;
async function loadMount(f,ref,weaponKind,expectedGear,{loader}={}){
 const generation=f._equipmentLoadGeneration??=0,capture={parts:f.parts,rig:f.parts?.rig,generation,gear:expectedGear};let asset;
 try{asset=await (loader?.loadEquipmentInstance?.(ref)??defaultLoadEquipmentInstance(ref));}catch{return false;}
 if(!valid(f,capture)){asset.dispose();return false;}let mount;try{mount=createEquipmentMount(asset,{weaponKind});}catch{return false;}
 if(!valid(f,capture)){mount.userData.disposeEquipment();return false;}
 if(expectedGear){if(f._gearHeld!==expectedGear){mount.userData.disposeEquipment();return false;}disposeHeldEquipment(f,f._game);mountHeldWeapon(f,mount);}
 else{
  const hands=[f.parts.armR?.children?.[2],f.parts.armL?.children?.[2]],old=hands.flatMap(hand=>hand?.children||[]).find(child=>child.userData.weaponKind===weaponKind);
  if(!old){mount.userData.disposeEquipment();return false;}old.parent.add(mount);old.visible=false;mount.userData.proceduralFallback=old;
 }
 f._soldierLoadoutPresentation=null;return true;
}
export function replaceHeldEquipment(f,ref,expectedGear,options={}){return loadMount(f,ref,expectedGear?.base?.weapon||expectedGear?.weapon||'rifle',expectedGear,options);}
export async function loadFighterEquipment(f,{loader}={}){
 const entries=Object.entries(f.def?.model?.assets?.equipment||{});if(!entries.length)return false;
 const gear=f._gearHeld,results=[];for(const [weaponKind,ref]of entries)results.push(await loadMount(f,ref,weaponKind,gear,{loader}));return results.some(Boolean);
}
export function invalidateEquipmentLoads(f){f._equipmentLoadGeneration=(f._equipmentLoadGeneration??0)+1;}

// Mounts own loader originals and rebased action geometry. Procedural weapons
// instead own their graph resources, which can be shared between mesh children.
export function disposeHeldEquipment(f,game=f._game){
 const weapon=f._gearMesh;if(!weapon)return;
 unmountHeldWeapon(f,game,true);f._gearMesh=null;
 if(weapon.userData.disposeEquipment){weapon.userData.disposeEquipment();return;}
 const resources=new Set();weapon.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const material of [].concat(o.material||[]))resources.add(material);});
 for(const resource of resources)resource.dispose();
}
export function retireFighterEquipment(f,{preserveHeld=false}={}){
 invalidateEquipmentLoads(f);
 if(!preserveHeld&&f._gearMesh?.userData.disposeEquipment)disposeHeldEquipment(f);
 const mounts=[];f.obj?.traverse(o=>{if(o.userData.disposeEquipment&&(!preserveHeld||o!==f._gearMesh))mounts.push(o);});
 for(const mount of mounts)mount.userData.disposeEquipment();
}
