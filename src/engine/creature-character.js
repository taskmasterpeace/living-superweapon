import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {metersToUnits} from '../core/world-units.js';
import {createThermavariActor} from './thermavari-character.js';

export const CREATURE_RECIPES={
 thermavari:{name:'Thermavari Hunter · articulated study',asset:'thermavari',heightMeters:2.286,family:'thermavari',skeleton:'thermavari-pivots-v1'},
 husky:{name:'Dog · Husky',asset:'husky',shoulderMeters:.60},
 wolf:{name:'Wolf',asset:'wolf',shoulderMeters:.85},
 hunter:{name:'Hunter hound · size study',asset:'wolf',shoulderMeters:1.35,tint:'#62694c'},
};
// Missing paired/ground-recovery clips remain explicit rather than silently
// substituting a death or jump animation for those gameplay states.
export const QUADRUPED_ACTIONS={idle:'Idle',walk:'Walk',sprint:'Gallop',jump:'Gallop_Jump',land:'Jump_ToIdle',attack:'Attack',hit:'Idle_HitReact1',death:'Death',run:null,knockdown:null,recover:null,pounceVictim:null};
export async function createCreatureActor(recipe){
 if(recipe.asset==='thermavari')return createThermavariActor();
 if(!['wolf','husky'].includes(recipe.asset))throw Error('Unsupported creature asset');
 if(!(recipe.shoulderMeters>=.3&&recipe.shoulderMeters<=2))throw Error('Shoulder height must be 0.3–2 metres');
 const gltf=await new GLTFLoader().loadAsync('/models/quadrupeds/'+recipe.asset+'.glb');
 const root=new T.Group(),actor=gltf.scene;root.add(actor);
 const mixer=new T.AnimationMixer(actor),clips=new Map(gltf.animations.map(c=>[c.name,c]));
 const meshes=[];actor.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.material=o.material.clone();meshes.push(o);if(recipe.tint)o.material.color.set(recipe.tint);}});
 // Measure the animated body itself, not Blender's control objects/bounds.
 const idle=mixer.clipAction(clips.get('Idle'));idle.play();mixer.setTime(0);actor.updateMatrixWorld(true);
 const box=new T.Box3();for(const m of meshes)if(m.visible){m.computeBoundingBox?.();box.union(new T.Box3().setFromObject(m,true));}
 const shoulder=actor.getObjectByName('FrontShoulderL')||actor.getObjectByName('FrontShoulder.L');
 if(!shoulder)throw Error('Quadruped missing canonical shoulder landmark');
 const shoulderY=shoulder.getWorldPosition(new T.Vector3()).y;
 const sourceHeight=shoulderY-box.min.y;
 if(!(sourceHeight>0))throw Error('Invalid quadruped ground/shoulder landmarks');
 const scale=metersToUnits(recipe.shoulderMeters)/sourceHeight;
 actor.scale.multiplyScalar(scale);actor.position.y-=box.min.y*scale;
 let action=idle;
 return {root,actor,meshes,mixer,clips,sourceHeight,scale,
  play(name){const clip=clips.get(name);if(!clip)throw Error('Missing source clip: '+name);mixer.stopAllAction();action=mixer.clipAction(clip).reset();action.clampWhenFinished=true;action.setLoop(['Death','Attack','Gallop_Jump','Jump_ToIdle','Idle_HitReact1','Idle_HitReact2'].includes(name)?T.LoopOnce:T.LoopRepeat,Infinity);action.play();return clip;},
  update(dt){mixer.update(dt);root.updateMatrixWorld(true);},
  sample(name,phase){this.play(name);mixer.setTime(clips.get(name).duration*Math.max(0,Math.min(.99999,phase)));root.updateMatrixWorld(true);},
  dispose(){mixer.stopAllAction();mixer.uncacheRoot(actor);root.removeFromParent();for(const m of meshes){m.geometry.dispose();m.material.dispose();}for(const s of new Set(meshes.map(m=>m.skeleton)))s?.dispose();},
 };
}
