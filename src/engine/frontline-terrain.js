import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {applySandstoneSurface,applyGroundSurface} from './frontline-surface.js';
import {buildFrontlineRubble} from './frontline-rubble.js';

export const FRONTLINE_GROUND_RADIUS=6800;
export const FRONTLINE_ASSETS={ground:'./textures/frontline/hardpan-albedo-v1.png',rock:'./models/frontline/boulder-04.glb',mesa:'./models/frontline/tiered-escarpment-kit.glb',talus:'./models/frontline/fractured-talus-kit.glb',sky:'./textures/frontline/kloppenheim_05_puresky-2k.hdr'};
FRONTLINE_ASSETS.background='./models/frontline/background-ridge-kit.glb';

export function applyFrontlineSky(stage,texture){
 const world=stage.g.world,original=world.skyMesh.material;
 const output='gl_FragColor = vec4(c, 1.0);';
 if(!original.fragmentShader.includes(output))throw Error('Native sky shader contract changed');
 const material=new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,fog:false,
  uniforms:{...original.uniforms,uFrontlineSky:{value:texture}},
  vertexShader:original.vertexShader,
  fragmentShader:'uniform sampler2D uFrontlineSky;\n'+original.fragmentShader.replace(output,`
   vec3 skyDir=normalize(vP);
   vec2 skyUV=vec2(atan(skyDir.z,skyDir.x)*0.159154943+0.5,asin(clamp(skyDir.y,-1.0,1.0))*0.318309886+0.5);
   vec3 photographed=texture2D(uFrontlineSky,skyUV).rgb;
   photographed*=.60;
   float skyLuma=dot(photographed,vec3(.2126,.7152,.0722));
   photographed=max(vec3(0.0),mix(vec3(skyLuma),photographed,1.32));
   // Compress only the visible HDR background's solar highlights before bloom.
   // Keep ordinary sky values, hue and the unmodified lighting environment.
   skyLuma=dot(photographed,vec3(.2126,.7152,.0722));
   float skyHighlight=max(0.0,skyLuma-1.0);
   float displayedLuma=min(skyLuma,1.0)+3.0*(1.0-exp(-skyHighlight/3.0));
   photographed*=displayedLuma/max(skyLuma,.00001);
   gl_FragColor=vec4(mix(photographed,c,uSpace),1.0);`),
 });
 stage._frontlineSky={original,material,environment:world.scene.environment,intensity:world.scene.environmentIntensity};
 texture.mapping=THREE.EquirectangularReflectionMapping;
 world.skyMesh.material=material;world.scene.environment=texture;world.scene.environmentIntensity=.22;
 if(stage._cloudMesh)stage._cloudMesh.visible=false;
 stage._mats.push(material);stage._texs.push(texture);
}

export function restoreFrontlineSky(stage){
 const saved=stage._frontlineSky;if(!saved)return;
 const world=stage.g.world;
 if(world.skyMesh.material===saved.material)world.skyMesh.material=saved.original;
 world.scene.environment=saved.environment;world.scene.environmentIntensity=saved.intensity;
 stage._frontlineSky=null;
}

// Normalize once, then fit the render skin inside the existing local collision
// envelope. This pass cannot enlarge invisible walls or change cover balance.
export function fitRockGeometry(source,destination){
 const result=source.clone();result.computeBoundingBox();destination.computeBoundingBox();
 const from=result.boundingBox,to=destination.boundingBox,size=new THREE.Vector3(),targetSize=new THREE.Vector3();
 from.getSize(size);to.getSize(targetSize);
 if(Math.min(size.x,size.y,size.z)<=0){result.dispose();throw Error('Rock source must have volume');}
 result.translate(-from.min.x,-from.min.y,-from.min.z);
 result.scale(targetSize.x/size.x,targetSize.y/size.y,targetSize.z/size.z);
 result.translate(to.min.x,to.min.y,to.min.z);result.computeBoundingBox();result.computeBoundingSphere();
 return result;
}

export function fitFrontlineFormation(sources,destination,mesh,background=false){
 const variant=mesh.userData.frontlineProfile,lod=background?1:0;
 const key=background?`background-ridge-${variant}`:`escarpment-${variant}-lod0`,source=sources.get(key);
 if(!source)throw Error(`Incomplete authored formation kit: ${key}`);
 const transformed=source.geometry.clone().applyMatrix4(source.matrixWorld);
 try{const geometry=fitRockGeometry(transformed,destination);geometry.userData.frontlineMesa={variant,lod,background};return geometry;}
 finally{transformed.dispose();}
}

// A cliff scan is a face, not a freestanding rock. Assemble overlapping faces
// around a volume, with a scanned top; never expose the open scan's reverse.
// Each face retains its UVs and relief. Vertical courses bound texture stretch.
export function buildCliffFormation(source,destination,capSource=null){
 destination.computeBoundingBox();const size=destination.boundingBox.getSize(new THREE.Vector3()),pieces=[];
 const addFace=(width,height,depth,x,y,z,rotation=0,top=false)=>{
  const panel=source.clone();if(top)panel.rotateX(-Math.PI/2);
  const envelope=new THREE.BoxGeometry(width,height,depth),fitted=fitRockGeometry(panel,envelope);
  panel.dispose();envelope.dispose();fitted.rotateY(rotation);fitted.translate(x,y,z);pieces.push(fitted);
 };
 let merged;
 try{
 for(let side=0;side<4;side++){
  const width=side%2?size.z:size.x,depth=side%2?size.x:size.z;
  const courses=Math.max(1,Math.ceil(size.y/(width*.75))),height=size.y/courses;
  for(let i=0;i<courses;i++){
   const offset=depth*.34,a=side*Math.PI/2;
   addFace(width,height*1.12,depth*.32,Math.sin(a)*offset,-size.y/2+height*(i+.5),Math.cos(a)*offset,a);
  }
 }
 if(capSource){
  // A vertical cliff scan turned sideways exposes holes/backfaces. Use a
  // genuinely volumetric boulder for the crown, with its own authored UVs.
  const envelope=new THREE.BoxGeometry(size.x,size.y*.25,size.z);
  try{const cap=fitRockGeometry(capSource,envelope);cap.translate(0,size.y*.54,0);pieces.push(cap);}finally{envelope.dispose();}
 }else addFace(size.x,size.y*.12,size.z,0,size.y*.46,0,0,true);
 merged=mergeGeometries(pieces,!!capSource);if(!merged)throw Error('Incompatible cliff geometry');
 if(capSource)merged.groups.forEach((group,index)=>{group.materialIndex=index===pieces.length-1?1:0;});
 return fitRockGeometry(merged,destination);}
 finally{for(const p of pieces)p.dispose();merged?.dispose();}
}

export function constrainRockToCover(mesh,cover){
 if(!cover)return;
 mesh.updateWorldMatrix(true,true);const box=new THREE.Box3().setFromObject(mesh,true),origin=mesh.getWorldPosition(new THREE.Vector3());
 // A rotated sphere's tight box is smaller than its rotated local box. Fit the
 // actual scanned vertices again in world space, not the corners of that box.
 const limits=[['x',cover.x-cover.hx,cover.x+cover.hx],['z',cover.z-cover.hz,cover.z+cover.hz],['y',-Infinity,cover.top]];
 let scale=1;
 for(const [axis,low,high] of limits){
  if(box.max[axis]>high)scale=Math.min(scale,(high-origin[axis])/(box.max[axis]-origin[axis]));
  if(box.min[axis]<low)scale=Math.min(scale,(origin[axis]-low)/(origin[axis]-box.min[axis]));
 }
 if(scale<1){
  // Upright formations have an authored, integral landing plane. Fitting a
  // yaw-rotated horizontal silhouette must not lower that plane below c.top.
  // Tilted boulders retain uniform fitting because local XZ affects world Y.
  const up=new THREE.Vector3(0,1,0).transformDirection(mesh.matrixWorld);
  const preserveCrown=up.y>1-1e-7&&box.max.y<=cover.top+1e-5;
  mesh.geometry.scale(scale,preserveCrown?1:scale,scale);mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
 }
}

export function replaceRockSkins(stage,targets,source,material,build){
 const prepared=[];
 try{
  for(const mesh of targets){
   const geometry=build(source,mesh.geometry,mesh);prepared.push({mesh,geometry});
   // Constrain a temporary sibling; no live mesh changes until every build succeeds.
   const probe=new THREE.Mesh(geometry,material);probe.position.copy(mesh.position);
   probe.quaternion.copy(mesh.quaternion);probe.scale.copy(mesh.scale);probe.parent=mesh.parent;
   constrainRockToCover(probe,stage._cover.find(c=>c.mesh===mesh));probe.parent=null;
  }
 }catch(error){for(const {geometry} of prepared)geometry.dispose();throw error;}
 for(const {mesh,geometry} of prepared){
  const cover=stage._cover.find(c=>c.mesh===mesh),fade=stage.g.world._fades?.get(cover);
  if(fade){for(const [object,original] of fade.mats){for(const m of Array.isArray(object.material)?object.material:[object.material])m.dispose();object.material=original;}stage.g.world._fades.delete(cover);}
  // Shared primitive buffers are retired once by the stage's deduplicated close.
  if(!stage._geos.includes(mesh.geometry))stage._geos.push(mesh.geometry);
  mesh.geometry=geometry;mesh.material=material;mesh.receiveShadow=true;mesh.userData.frontlineRock=true;
 }
 return prepared.length;
}

export async function installFrontlineTerrain(stage,floor){
 const group=stage.group,loader=new THREE.TextureLoader();
 const surfaceTexture=(file,srgb=false,clamp=false)=>loader.loadAsync('./textures/frontline/'+file).then(texture=>{
  if(stage.group!==group){texture.dispose();return texture;}
  if(srgb)texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=clamp?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;
  texture.anisotropy=Math.min(8,stage.g.world.renderer.capabilities.getMaxAnisotropy());
  stage._texs.push(texture);return texture;
 });
 const surfaces=Promise.all([
  surfaceTexture('sandstone-albedo.webp',true),surfaceTexture('sandstone-normal.webp'),surfaceTexture('sandstone-rough.webp'),
  surfaceTexture('gravel-albedo.webp',true),surfaceTexture('gravel-normal.webp'),
  surfaceTexture('geology-mask-convoy-bank.webp',false,true),surfaceTexture('rock-pbr.webp'),
 ]).then(([albedo,normal,rough,gravelAlbedo,gravelNormal,geology,pbr])=>({sandstone:{albedo,normal,rough,pbr},ground:{albedo:gravelAlbedo,normal:gravelNormal,geology}}));
 const groundPromise=loader.loadAsync(FRONTLINE_ASSETS.ground).then(async texture=>{
  let maps;try{maps=await surfaces;}catch(error){texture.dispose();throw error;}
  if(stage.group!==group){texture.dispose();return;}
  texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.setScalar(FRONTLINE_GROUND_RADIUS/12);texture.anisotropy=Math.min(8,stage.g.world.renderer.capabilities.getMaxAnisotropy());
  floor.material.color.set('#ffffff');floor.material.map=texture;floor.material.needsUpdate=true;stage._texs.push(texture);
  applyGroundSurface(floor.material,{...maps.ground,stone:maps.sandstone});
 });
 const skyPromise=new RGBELoader().loadAsync(FRONTLINE_ASSETS.sky).then(texture=>{
  if(stage.group!==group){texture.dispose();return;}
  try{applyFrontlineSky(stage,texture);}catch(error){texture.dispose();throw error;}
 });
 const loadSkin=(path,accept,build,{dependency=null,retain=false}={})=>{
  // Decide ownership before any asynchronous callback changes geometry.type.
  const targets=group.children.filter(mesh=>mesh.isMesh&&accept(mesh));
  return new GLTFLoader().loadAsync(path).then(async gltf=>{
  const meshes=[];gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
  const textures=new Set(),materials=new Set();for(const mesh of meshes)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}
  let cap,maps;
  try{[cap,maps]=await Promise.all([dependency,surfaces]);}catch(error){for(const m of meshes)m.geometry.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();throw error;}
  if(stage.group!==group){for(const m of meshes)m.geometry.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();return;}
  if(meshes.length!==1||Array.isArray(meshes[0].material)){
   for(const m of meshes)m.geometry.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();
   throw Error('Frontline rock contract requires one mesh/material');
  }
  const source=meshes[0].geometry.clone().applyMatrix4(meshes[0].matrixWorld),material=meshes[0].material;
  material.name='frontline-scanned-stone';material.color.set('#ffffff');material.roughness=1;
  applySandstoneSurface(material,maps.sandstone);
  for(const texture of textures)texture.anisotropy=Math.min(8,stage.g.world.renderer.capabilities.getMaxAnisotropy());
  try{
   const count=replaceRockSkins(stage,targets,source,cap?[material,cap.material]:material,(source,destination)=>build(source,destination,cap?.geometry));
   stage._mats.push(...materials);stage._texs.push(...textures);stage.frontlineRockCount=(stage.frontlineRockCount||0)+count;
   if(retain){const geometry=source.clone();stage._geos.push(geometry);return {geometry,material};}
  }catch(error){for(const m of materials)m.dispose();for(const t of textures)t.dispose();throw error;}
  finally{source.dispose();for(const geometry of new Set(meshes.map(m=>m.geometry)))geometry.dispose();}
  });
 };
 const rockPromise=loadSkin(FRONTLINE_ASSETS.rock,mesh=>stage._cover.some(c=>c.mesh===mesh)&&mesh.geometry.type!=='CylinderGeometry'&&mesh.userData.frontlineTalus===undefined,fitRockGeometry);
 const talusTargets=group.children.filter(mesh=>mesh.isMesh&&mesh.userData.frontlineTalus!==undefined);
 const talusPromise=new GLTFLoader().loadAsync(FRONTLINE_ASSETS.talus).then(async gltf=>{
  const sources=new Map(),materials=new Set();gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(mesh=>{if(mesh.isMesh){sources.set(mesh.name,mesh);for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])materials.add(m);}});
  let adoptedMaterial;
  try{
   const maps=await surfaces;if(stage.group!==group)return;
   for(let i=0;i<4;i++)if(!sources.has(`talus-${i}`))throw Error('Incomplete scan-derived talus kit');
   adoptedMaterial=applySandstoneSurface(new THREE.MeshStandardMaterial(),maps.sandstone);adoptedMaterial.name='frontline-fractured-talus';
   const count=replaceRockSkins(stage,talusTargets,sources,adoptedMaterial,(kit,destination,mesh)=>{
    const variant=mesh.userData.frontlineTalus,source=kit.get(`talus-${variant}`),transformed=source.geometry.clone().applyMatrix4(source.matrixWorld);
    try{const geometry=fitRockGeometry(transformed,destination);geometry.userData.frontlineTalus={variant};return geometry;}
    finally{transformed.dispose();}
   });
   stage._mats.push(adoptedMaterial);adoptedMaterial=null;stage.frontlineRockCount=(stage.frontlineRockCount||0)+count;
  }finally{
   adoptedMaterial?.dispose();for(const mesh of sources.values())mesh.geometry.dispose();for(const m of materials)m.dispose();
  }
 });
 // Capture cylinder ownership before any asynchronous adoption changes type.
 // Each authored asset is one continuous crown/scarp/skirt volume; variants
 // and distant LODs are baked in the GLB, never assembled from stretched scans.
 const mesaTargets=group.children.filter(mesh=>mesh.isMesh&&mesh.geometry.type==='CylinderGeometry');
 const loadFormationKit=(url,background)=>new GLTFLoader().loadAsync(url).then(async gltf=>{
  const sources=new Map(),materials=new Set();gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(mesh=>{if(mesh.isMesh){sources.set(mesh.name,mesh);for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])materials.add(m);}});
  let adoptedMaterial;
  try{
   const maps=await surfaces;if(stage.group!==group)return;
   adoptedMaterial=applySandstoneSurface(new THREE.MeshStandardMaterial(),maps.sandstone);adoptedMaterial.name='frontline-authored-sandstone';
   const targets=mesaTargets.filter(mesh=>!!mesh.userData.frontlineDistant===background);
   const count=replaceRockSkins(stage,targets,sources,adoptedMaterial,(kit,destination,mesh)=>fitFrontlineFormation(kit,destination,mesh,background));
   if(!background)buildFrontlineRubble(stage,adoptedMaterial);
   stage._mats.push(adoptedMaterial);adoptedMaterial=null;stage.frontlineRockCount=(stage.frontlineRockCount||0)+count;
  }finally{
   adoptedMaterial?.dispose();for(const mesh of sources.values())mesh.geometry.dispose();for(const m of materials)m.dispose();
  }
 });
 const mesaPromise=loadFormationKit(FRONTLINE_ASSETS.mesa,false),backgroundPromise=loadFormationKit(FRONTLINE_ASSETS.background,true);
 await Promise.all([groundPromise,rockPromise,talusPromise,mesaPromise,backgroundPromise,skyPromise]);
 if(stage.group===group){stage.frontlineAssetsReady=true;if(!stage.preparation)stage.frontlineReady=true;}
}
