import {addModularMotions,canPoseInfectedFlight,poseInfectedFlight} from './modular-motions.js';
import {createAuthoredParts,readCharacterRecipe} from './character-authoring.js';
import {createTailoring} from './modular-tailoring.js';
import {createImagePlacements} from './modular-image-placements.js';
import {createSignatureParts} from './modular-signature-parts.js';
import {applyModularFrame,validateModularRecipe,applyModularRecipe,MODULAR_RECIPES,animateModularCape} from './modular-costume.js';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {createModularFlightAdapter} from './modular-flight.js';
import {STRIKES} from '../data/martial.js';
import {meleeWeaponFor,WEAPON_GRIP_CENTERS} from './weapon-grip.js';
import {setModularExpression} from './modular-face.js';
import {heroModelOf} from '../data/hero-models.js';
import {rangedPoseChannels} from './cast-channels.js';

let asset;
export const MODULAR_BODY='faceted-v1';
export const MODULAR_SLOTS=['neck','coat','wristbands','boxingGloves','calves','shoes','tornClothes','robe','sleeves','collar','glasses','deltoids','forearms','handTips','emblemBack','head','hair','visor','expression','torso','waist','belt','arms','gauntlets','shoulders','legs','boots','knees','hands','cape','emblem','helmet','vest','backpack','eyepatch','pouches'];
export function modularAsset(){return asset??=new GLTFLoader().loadAsync('/models/modular-hero/modular-hero.glb').catch(e=>{asset=null;throw e;});}
export function setModularCostume(meshes,{soldier=false,primary='#dce0d9',accent='#b52e23',skin='#b18b6d',cape=true,visor=false}={}){
 return applyModularRecipe(meshes,{...MODULAR_RECIPES[soldier?'mercenary':'hero'],primary:soldier?'#657151':primary,secondary:soldier?'#46543a':accent,skin,cape:!soldier&&cape,visor,hair:soldier?'none':'swept',helmet:soldier});
}
export function createModularActor(gltf){
 const actor=clone(gltf.scene),meshes=[];
 actor.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.material=o.material.clone();o.material.side=T.DoubleSide;o.frustumCulled=false;meshes.push(o);}});
 setModularCostume(meshes);
 if(typeof document!=='undefined')setModularExpression(meshes,'neutral');
 const mixer=new T.AnimationMixer(actor),clips=new Map(gltf.animations.map(c=>[c.name,c]));
 return {actor,meshes,mixer,clips,pose(name,phase){const clip=clips.get(name);if(!clip)throw Error('Missing authored clip: '+name);mixer.stopAllAction();const action=mixer.clipAction(clip);action.reset().setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(T.MathUtils.clamp(phase,0,1)*clip.duration);actor.updateMatrixWorld(true);},dispose(){mixer.stopAllAction();mixer.uncacheRoot(actor);actor.removeFromParent();for(const m of meshes){m.geometry.dispose();m.material.dispose();}const skeletons=new Set(meshes.map(m=>m.skeleton));for(const s of skeletons)s?.dispose();}};
}

// Opt-in body renderer. No input, collision, energy or attack rules live here.
export async function loadModularCharacter(f,{load=modularAsset}={}){
 const old=f._modularCharacter;old?.dispose();f._modularCharacter=null;
 if(heroModelOf(f.def).body!==MODULAR_BODY)return;
 const parts=f.parts,epoch=f._modularEpoch=(f._modularEpoch||0)+1;
 const gltf=await load();if(f.def.vocalFamily==='zombie')await addModularMotions(gltf);if(f._formDisposed||f.parts!==parts||f._modularEpoch!==epoch)return;
 const c=createModularActor(gltf);c.actor.name='modular-character';
 const height=parts.head.position.y+.8*parts.head.scale.y;c.actor.scale.setScalar(height/1.8325);f.obj.add(c.actor);c.pose('A_TPose',0);
 const adapter=createModularFlightAdapter(c.actor,f),hidden=[];
 const keep=o=>o.userData.weaponKind||o.name.startsWith('flight-');
 const hide=o=>{if(keep(o))return;if(o.isMesh){hidden.push([o,o.layers.mask]);o.layers.disable(0);}for(const child of o.children)hide(child);};
 for(const root of [parts.torso,parts.pelvis,parts.head,parts.armL,parts.armR,parts.legL,parts.legR,parts.cape,parts.cowl])if(root)hide(root);
 if(parts.skin)for(const mesh of Object.values(parts.skin.meshes||{}))if(mesh?.isMesh)hide(mesh);
 setModularCostume(c.meshes,{primary:f.def.colors.primary,accent:f.def.colors.accent||f.def.colors.secondary,cape:!f.def.metal,soldier:heroModelOf(f.def).equipment==='soldier'});
 let savedRecipe;try{const stored=readCharacterRecipe(f.def.id);if(stored)savedRecipe=validateModularRecipe(stored);}catch(error){console.warn('Saved character recipe ignored:',error.message);}
 const signatureRecipe=savedRecipe||(f.def.vocalFamily==='zombie'?MODULAR_RECIPES.infected:MODULAR_RECIPES['roster-'+f.def.id]);const signatureParts=createSignatureParts(c.actor),tailoring=createTailoring(c.actor),imagePlacements=createImagePlacements(c.actor);if(signatureRecipe){applyModularFrame(c.actor,signatureRecipe.frame,height/1.8325);applyModularRecipe(c.meshes,signatureRecipe);signatureParts.set(signatureRecipe);tailoring.set(signatureRecipe);imagePlacements.set(signatureRecipe);}
 const authoredParts=createAuthoredParts(c.actor);if(signatureRecipe?.authoredAsset)authoredParts.set(signatureRecipe.authoredAsset);
 let drivenWeapon=null,weaponBase=null;
 const restoreWeapon=()=>{if(drivenWeapon&&weaponBase){weaponBase.decompose(drivenWeapon.position,drivenWeapon.quaternion,drivenWeapon.scale);drivenWeapon=null;weaponBase=null;}};
 const dispose=c.dispose.bind(c);c.dispose=()=>{authoredParts.dispose();signatureParts.dispose();tailoring.dispose();imagePlacements.dispose();restoreWeapon();for(const [o,mask]of hidden)o.layers.mask=mask;dispose();};
 c.update=()=>{
  restoreWeapon();
  animateModularCape(c.meshes,f.animT||0,f.vel.length());signatureParts.update(f.animT||0,!!f.flying);imagePlacements.update(f.animT||0,!!f.flying);
  adapter.reset();
  const held=meleeWeaponFor(f),sourcedSword=held&&['sword','katana','knife'].includes(held.weapon.userData.weaponKind)&&!held.weapon.userData.twoHanded;
  // Busy native poses retain responsive aim/guard/grab and weapon attachments.
  // Bare-handed grounded strikes use full authored clips on this skeleton.
  const incapacitated=f.state==='hit'||f.state==='ko'||f.stunT>0||f.staggerT>0||f.frozenT>0||f.sleepT>0||f.shockT>0;
  // Contact-authored strikes own both handedness and the committed target pose.
  const contactStrike=!!(f.mstate&&f._meleeMotion&&!sourcedSword);
  const rangedRecovery=!f.mstate&&!!rangedPoseChannels(f).dominant;
  const interaction=!!(contactStrike||rangedRecovery||f._firearmReload||f._throwAction||f._personThrowPose||f._zombieLimbs||f._grapple||f.hanging||f._carry||f.grabState||f.meleeCharge>0||f.crouching||f._jumpMotion?.applied||f.downedT>0||f.launchT>0||f._slideT>0);
  const native=interaction||incapacitated||f.flying||f.gliding||f.ragdoll||f.grabbing||f.grabbedBy||f.guarding||(f.state==='cast'&&!f.mstate)||(f._meleeMotion?.weapon&&!sourcedSword);
  const airStrike=!interaction&&!incapacitated&&(f.flying||f.gliding)&&f.mstate&&!f.ragdoll&&!f.grabbing&&!f.grabbedBy&&(!held||sourcedSword);
  if((!native||airStrike)&&f.mstate&&STRIKES[f.mId]){
   const s=STRIKES[f.mId],pace=f.def.meleePace||1,phase=f.mstate==='startup'?'startup':f.mstate==='active'?'active':'recover';
   const duration=phase==='startup'?(f._meleeMotion?.startupDuration||s.startup/pace):s[phase]/pace;
   const t=T.MathUtils.clamp(1-f.mT/Math.max(.001,duration),0,1),bounds=phase==='startup'?[0,.3]:phase==='active'?[.3,.55]:[.55,1];
   c.pose(sourcedSword?'Sword_Attack':f.mId==='jab'?'Punch_Jab':'Punch_Cross',T.MathUtils.lerp(...bounds,t));
   if(airStrike)adapter.update({preserveArms:true});
  }else if(native){c.pose('Punch_Cross',.4);adapter.update();}
  else if(sourcedSword)c.pose('Sword_Idle',(f.animT/c.clips.get('Sword_Idle').duration)%1);
  else{const speed=Math.hypot(f.vel.x,f.vel.z);const name=f.def.vocalFamily==='zombie'?(speed>25?'Infected_Sprint_Loop':speed>2?'Zombie_Walk_Fwd_Loop':'Zombie_Idle_Loop'):speed>25?'Sprint_Loop':speed>2?'Walk_Loop':'Idle_Loop';const mechanical=signatureRecipe?.frame==='machine'&&speed<=2;c.pose(name,mechanical?0:(f.animT/c.clips.get(name).duration)%1);if(mechanical){const head=c.actor.getObjectByName('DEF-head');if(head)head.rotation.y+=Math.sin(f.animT*.8)*.12;}}
  if(!held&&canPoseInfectedFlight(f,signatureRecipe?.infection))poseInfectedFlight(c.actor);
  if(sourcedSword&&(!native||airStrike)){
   // Drive the actual weapon, not a decorative duplicate. Native weapon
   // sweep/contact readers therefore see the same blade the player sees.
   const weapon=held.weapon,hand=c.actor.getObjectByName(T.PropertyBinding.sanitizeNodeName('DEF-hand.R'));
   weapon.updateMatrix();drivenWeapon=weapon;weaponBase=weapon.matrix.clone();
   c.actor.updateWorldMatrix(true,true);weapon.parent.updateWorldMatrix(true,false);
   const h=height/1.8325,center=new T.Vector3(...WEAPON_GRIP_CENTERS[weapon.userData.weaponKind]);
   const m=hand.matrixWorld.clone().multiply(new T.Matrix4().makeTranslation(0,.075,.028)).multiply(new T.Matrix4().makeRotationX(Math.PI/2)).multiply(new T.Matrix4().makeRotationZ(Math.PI)).multiply(new T.Matrix4().makeScale(1/h,1/h,1/h)).multiply(new T.Matrix4().makeTranslation(-center.x,-center.y,-center.z));
   m.premultiply(weapon.parent.matrixWorld.clone().invert()).decompose(weapon.position,weapon.quaternion,weapon.scale);
   // A nonuniform legacy parent can introduce shear during decomposition.
   // Re-anchor the grip center exactly after extracting rotation and scale.
   const anchor=weapon.parent.worldToLocal(hand.localToWorld(new T.Vector3(0,.075,.028)));
   weapon.position.copy(anchor.sub(center.clone().multiply(weapon.scale).applyQuaternion(weapon.quaternion)));weapon.updateMatrixWorld(true);
  }
 };
 f._modularCharacter=c;c.update();return c;
}
