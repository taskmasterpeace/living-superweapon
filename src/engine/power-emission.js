import * as THREE from 'three';
import {usesCombinedHands} from './cast-channels.js';
import {handEmissionPosition,palmCastSide} from './hand-emission.js';
import {sweepSplitObstacle} from './projectile-contact.js';
import {naniteEmitter} from './nanite-forearms.js';
import {cancelHeldSlot} from './abilities.js';

const other=new THREE.Vector3(),direction=new THREE.Vector3();
const aperture=new THREE.Vector3(),candidate=new THREE.Vector3(),contact={};

// Solid preparation core compresses into the available space. Stored charge,
// eventual damage/radius and resource cost do not shrink with the visual core.
function fitChargeRadius(f,source,wanted){
 source.radius=0;powerEmissionPosition(f,source,aperture);
 const fits=radius=>{
  source.radius=radius;powerEmissionPosition(f,source,candidate);
  return candidate.y-radius>=(f._game.world.heightAt?.(candidate.x,candidate.z)||0)&&
   !sweepSplitObstacle(f._game.world,aperture,candidate,radius,contact,false,radius);
 };
 if(fits(wanted))return wanted;
 let low=0,high=wanted;
 for(let i=0;i<14;i++){const mid=(low+high)*.5;if(fits(mid))low=mid;else high=mid;}
 return low;
}

// Resolve semantic anatomy from the current rig, never a retired form's mesh.
// The solid sphere sits in front of its emitting surface; radius is zero for
// concentrated beam preparation, whose existing field remains between palms.
export function powerEmissionPosition(f,source,out,point=f.hasAimWorld?f.aimWorld:null){
 if(source.naniteForm==='cannon'){
  const emitter=naniteEmitter(f,source.slot,source.epoch);if(!emitter)return null;
  emitter.socket.getWorldPosition(out);
 }else if(usesCombinedHands(f,source)&&f.parts?.rig){
  f.parts.armL.children[2].getWorldPosition(out);
  f.parts.armR.children[2].getWorldPosition(other);out.add(other).multiplyScalar(.5);
 }else if(!source.faceOrigin&&!source.chest&&palmCastSide(source)<0)handEmissionPosition(f,-1,out);
 else f.muzzle(out,source.faceOrigin?1.1:source.chest?1.2:3.4,source.faceOrigin?8.3:source.chest?5.4:5.8);
 const radius=source.radius||0;
 if(radius){
  if(point)direction.copy(point).sub(out);else direction.copy(f.aim3);
  if(direction.lengthSq()<1e-8)direction.copy(f.aim3);
  out.addScaledVector(direction.normalize(),radius);
 }
 return out;
}

export function syncChargePresentation(f){
 if(!f.parts?.rig||!f.slots)return;
 let updated=false;
 for(const [slot,s]of Object.entries(f.slots)){
  if(!s.charging||!s.orb||!['charge','beam'].includes(s.def.type))continue;
  if(!updated){f.parts.g.updateMatrixWorld(true);updated=true;}
  const source=s._powerOrigin ||= {};
  if(s.def.naniteForm==='cannon'){
   const m=f._nanites?.modules.get(slot);if(!m||!naniteEmitter(f,slot,m.epoch)){cancelHeldSlot(f,slot);continue;}
   source.naniteForm='cannon';source.slot=slot;source.epoch=m.epoch;
  }
  source.faceOrigin=s.def.faceOrigin;source.chest=s.def.chest;
  source.castStyle=s.def.castStyle;source.castHand=s.def.castHand;source.charge=s.def.charge;
  const view=s.def.naniteForm==='cannon'?f.parts.nanites.get(slot):null;
  const wanted=view?Math.min(s._chargeRadius??s.orb.scale.x,view.chargeStage>=2?view.fit.barrelHalfWidth*1.5:view.fit.scale*.28):s._chargeRadius??s.orb.scale.x;
  source.radius=s.def.type==='charge'?fitChargeRadius(f,source,wanted):0;
  if(view){s.orb.children[0].visible=s.orb.children[1].visible=view.chargeStage>=2;}
  if(s.def.type==='charge')s.orb.scale.setScalar(source.radius);
  powerEmissionPosition(f,source,s.orb.position);
  if(s._chargeFx!=null){
   const c01=s._chargeFx,g=f._game,at=s.orb.position,def=s.def;s._chargeFx=null;
   if(!view)g.chargeGather(f,def.color,at,.6+c01*1.6);
   if(def.chest&&Math.random()<.3)g.vfx.ring(at.clone(),{color:def.color2||'#fff',r0:.4,r1:1.8+c01*2.4,life:.2});
   if(!view&&c01>=1&&Math.random()<.3)g.vfx.lightning(at,{color:def.color,count:2,radius:8,height:6});
  }
 }
}
