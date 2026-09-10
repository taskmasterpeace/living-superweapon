import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {disposeAircraftAsset} from './frontline-aircraft.js';
import {OUTPOST_BUILDINGS} from './frontline-outpost-layout.js';

export async function installFrontlineOutpost(stage,{loader=new GLTFLoader()}={}){
 const group=stage.group,{scene}=await loader.loadAsync('./models/frontline/outpost-kit.glb');
 if(stage.group!==group){disposeAircraftAsset(scene);return false;}
 const assets=new Map();
 for(const placement of OUTPOST_BUILDINGS){
  const source=scene.getObjectByName(placement.kind);
  if(!source){disposeAircraftAsset(scene);throw Error(`Missing outpost asset: ${placement.kind}`);}
  assets.set(placement.kind,source);
 }
 const materials=new Set(),textures=new Set();
 scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});
 stage._mats.push(...materials);stage._texs.push(...textures);
 for(const placement of OUTPOST_BUILDINGS){
  const model=assets.get(placement.kind).clone(true);
  model.name=`frontline-outpost-${placement.kind}`;
  model.position.set(placement.x,stage.g.world.heightAt(placement.x,placement.z),placement.z);
  model.rotation.y=placement.yaw;
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});group.add(model);
  model.updateWorldMatrix(true,true);
  const b=new THREE.Box3().setFromObject(model,true),size=b.getSize(new THREE.Vector3());
  const cover=stage._reg(placement.x,placement.z,size.x*.5,size.z*.5,b.max.y,model);
  cover.frontlineBuilding=placement.kind;
  // Material-batched assets keep roof props separate in their authoring data.
  // An aerial landing must not perch on an antenna's bounding-box ceiling.
  if(Number.isFinite(model.userData.solidTop))cover.top=cover.h=model.position.y+model.userData.solidTop;
  cover.hp=cover.maxHp=placement.kind==='barricade'?180:900;
  cover.onShatter=(game,c)=>{
   if(c.destroyed)return;c.destroyed=true;
   const i=game.world.cover.indexOf(c);if(i>=0)game.world.cover.splice(i,1);
   game.world.refreshFogBoxes?.();
   const y0=model.position.y;let time=0;
   game.vfx._add({update(dt){time+=dt;const k=Math.min(1,time/.65);model.position.y=y0-k*c.h;return k>=1;},dispose(){model.visible=false;}});
   game.particles.burst(c.x,y0+6,c.z,{count:30,speed:22,life:1.6,size:8,color:['#aea089','#756955'],up:12,grav:6,drag:1});
   game.audio.boom(.7,{x:c.x,z:c.z});game.world.shake(1.2);
   game.news?.highlight('building','FORWARD POST DAMAGED',{dur:2.4,priority:2,focus:{x:c.x,y:y0+10,z:c.z}});
  };
 }
 stage.g.world.refreshFogBoxes?.();return true;
}
