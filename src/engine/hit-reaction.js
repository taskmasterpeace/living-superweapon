import * as THREE from 'three';
import {reachArm} from './hero-rig.js';
import {rangedPoseChannels,usesCombinedHands} from './cast-channels.js';

// A visual upper-body carrier, not another physics root. All driven upper parts move
// together around the hips; hand-mounted equipment follows without reparenting.
const keys=['torso','head','cowl','armL','armR']; // chest-local insignia follows torso once
const omega=22, direction=new THREE.Vector3(), axis=new THREE.Vector3();
const inverse=new THREE.Quaternion(), turn=new THREE.Quaternion(), pivot=new THREE.Vector3();
const bracePoint=new THREE.Vector3(),bracePole=new THREE.Vector3(),incoming=new THREE.Vector3();

function snapshot(f){
 const base=f._hitReactionCache ||= Object.fromEntries(keys.map(k=>[k,{position:new THREE.Vector3(),quaternion:new THREE.Quaternion()}]));
 for(const key of keys){const part=f.parts[key];base[key].position.copy(part.position);base[key].quaternion.copy(part.quaternion);}
 // reachArm drives forearm and fist as well as the shoulder. Restore all three
 // before the next base pose, including zero-dt inspection and form handoff.
 base.arms ||= [0,1,2,3].map(()=>({position:new THREE.Vector3(),quaternion:new THREE.Quaternion()}));
 for(const [i,arm]of [f.parts.armL,f.parts.armR].entries())for(let j=1;j<=2;j++){
  const saved=base.arms[i*2+j-1],part=arm.children[j];saved.position.copy(part.position);saved.quaternion.copy(part.quaternion);
 }
 f._hitReactionBase=base;return base;
}

export function queueHitReaction(f,amount,opts) {
  // Grounded clones and range targets share the third-person field, but must
  // not inherit _openSky's flight/physics policy just to show a hit reaction.
  const field=f._openSky||f._game?.modeId==='powerworld';
  if(!field||!f.parts.rig||amount<=0||(opts.dot&&!opts.beamContact)||f.hp<=0)return;
  if(opts.kb)direction.set(opts.kb.x||0,opts.kb.y||0,opts.kb.z||0);
  else direction.set(0,0,0);
  if(opts.launch)direction.y+=opts.launch;
  if(direction.lengthSq()<.001&&opts.src?.pos)direction.copy(f.pos).sub(opts.src.pos);
  if(direction.lengthSq()<.001)return;
  const state=f._hitReaction ||= {offset:new THREE.Vector3(),velocity:new THREE.Vector3()};
  if(opts.beamContact){
    const beam=state.beam ||= {direction:new THREE.Vector3(),weight:0,remaining:0};
    beam.direction.copy(direction).normalize();beam.remaining=.26;
    beam.strain=THREE.MathUtils.clamp(amount/4.32-(f.strength??5)/10,0,1);
    // A continuous load is a held posture, not another impulse every spark.
    return;
  }
  let amplitude=THREE.MathUtils.clamp(Math.sqrt(amount/24)*.24*(1.2-.04*f.strength),.06,.36);
  state.velocity.addScaledVector(direction.normalize(),amplitude*omega*Math.E).clampLength(0,22);
}

export function restoreHitReaction(f) {
  const base=f._hitReactionBase;if(!base)return;
  for(const key of keys){f.parts[key].position.copy(base[key].position);f.parts[key].quaternion.copy(base[key].quaternion);}
  if(base.arms)for(const [i,arm]of [f.parts.armL,f.parts.armR].entries())for(let j=1;j<=2;j++){
    const saved=base.arms[i*2+j-1];arm.children[j].position.copy(saved.position);arm.children[j].quaternion.copy(saved.quaternion);
  }
  f._hitReactionBase=null;
}

export function animateHitReaction(f,dt) {
  const s=f._hitReaction,p=f.parts;
  if(!s||f.state==='ko')return;
  const beam=s.beam;
  if(beam){
    beam.remaining=Math.max(0,beam.remaining-dt);
    beam.weight=THREE.MathUtils.lerp(beam.weight,beam.remaining>0?1:0,1-Math.exp(-12*dt));
    if(beam.remaining===0&&beam.weight<1e-5)s.beam=null;
  }
  // Exact critically damped step: the same strike has the same recovery at 30–240Hz.
  const decay=Math.exp(-omega*dt);
  for(const k of ['x','y','z']){
    const c=s.velocity[k]+omega*s.offset[k];
    s.offset[k]=(s.offset[k]+c*dt)*decay;
    s.velocity[k]=(s.velocity[k]-omega*c*dt)*decay;
  }
  if(s.offset.lengthSq()+s.velocity.lengthSq()<1e-8&&!s.beam){f._hitReaction=null;return;}
  if(f.frozenT>0||f.grabbedBy)return; // ice/paired contact owns the displayed body
  const busy=f.guarding||f.poseGuard>.01||f.mstate||f.grabState||f.grabbing||f.meleeCharge>0||f.stunT>0||f.staggerT>0||f.state==='charge';
  const channels=beam?rangedPoseChannels(f):null;
  const pressure=beam&&!busy?beam.weight:0;
  p.body.getWorldQuaternion(inverse).invert();
  direction.copy(s.offset).applyQuaternion(inverse);
  if(pressure&&!channels.dominant){
    incoming.copy(beam.direction).applyQuaternion(inverse);
    direction.addScaledVector(incoming,(.036+.07*beam.strain)*pressure);
  }
  // An uppercut arches back; a downward blow folds forward. Pure vertical
  // impacts must not disappear, especially in an aerial fighting game.
  axis.set(direction.z-direction.y*.7,0,-direction.x);
  const angle=Math.min(.38,axis.length());
  if(angle<1e-7&&!pressure)return;
  snapshot(f);
  pivot.set(0,p.rig.pivotHeight,0);
  if(angle>1e-7){
    turn.setFromAxisAngle(axis.normalize(),angle);
    for(const key of keys){
      const part=p[key];part.position.sub(pivot).applyQuaternion(turn).add(pivot);part.quaternion.premultiply(turn);
    }
  }
  if(!pressure)return;
  // Active emission keeps the body part it owns. The empty off-hand may brace,
  // but never a gun grip, a paired cast, a grab, or the player's actual guard.
  const hands=channels.hands;
  if(hands&&(usesCombinedHands(f,hands.def)||hands.def.type==='volley'||hands.def.type==='rifle'))return;
  const arm=p.armL;if(arm.children[2].userData.gripOccupied)return;
  p.torso.getWorldQuaternion(inverse).invert();
  incoming.copy(beam.direction).negate().applyQuaternion(inverse);
  if(incoming.z<.15)return; // no hand folded backward through the ribs
  const scale=p.rig.pivotHeight/4.6;
  // Forearm vertical, fist outside the cheek; elbow flares on the same side.
  // Torso-local targets follow travel-facing support without redirecting feet.
  bracePoint.set((-1.45+Math.max(-.35,Math.min(.35,incoming.x*.5)))*scale,1.45*scale,2.05*scale)
    .applyQuaternion(p.torso.quaternion).add(p.torso.position);
  bracePole.set(-.9,-.4,.15).applyQuaternion(p.torso.quaternion);
  reachArm(arm,bracePoint,-1,pressure,bracePole);
}
