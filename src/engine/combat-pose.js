import * as THREE from 'three';
import { damp, lerp, GAIT } from '../core/util.js';
import { bendArm, reachArm } from './hero-rig.js';
import { animateMelee } from './melee-pose.js';
import { braceGuard } from './guard-pose.js';
import {rangedPoseChannels,usesCombinedHands} from './cast-channels.js';
import {volleyPattern,palmCastSide} from './hand-emission.js';
import {constrainArmCover} from './arm-cover.js';
import {constrainArmTorso} from './arm-torso.js';
import {firearmEmitter} from './weapon-emission.js';
import {constrainWeaponCover,constrainWeaponTorso} from './weapon-cover.js';
import {animateChestAim} from './chest-pose.js';
import {animateSpineAim} from './spine-pose.js';
import {animateGroundAimSupport} from './ground-aim-support.js';
import {NECK_LOOK_CONE,AXIAL_COFIRE_CONE} from './aim-limits.js';
import {exclusivePose} from './directional-pose.js';
import {castingPalmOrientation} from './hero-hand.js';
import {updateIndependentHands} from './hand-pose-channels.js';

const forward = new THREE.Vector3(0, 0, 1), down = new THREE.Vector3(0, -1, 0);
const xAxis = new THREE.Vector3(1, 0, 0), yAxis = new THREE.Vector3(0,1,0), shoulderTurn=new THREE.Quaternion(), direction = new THREE.Vector3(), origin = new THREE.Vector3();
const inverse = new THREE.Quaternion(), target = new THREE.Quaternion(), bend = new THREE.Quaternion();
const keys = ['head', 'cowl', 'armL', 'armR', 'body'];
const handTarget=new THREE.Vector3(), castCenter=new THREE.Vector3(), chargeCenter=new THREE.Vector3();
const hip=new THREE.Vector3(), hipBase=new THREE.Vector3();
const jointStart=new THREE.Quaternion(),jointTarget=new THREE.Quaternion();
const jointAccepted=new THREE.Quaternion();
const routeDirection=new THREE.Vector3();

function settleArm(f,key,dt){
  const p=f.parts,arm=p[key],side=key==='armL'?-1:1;
  const previous=f._combatRenderedElbows[key],desired=-arm.children[1].rotation.x;
  jointStart.copy(f._combatRenderedTorso).invert().multiply(f._combatRendered[key]);
  jointTarget.copy(p.torso.quaternion).invert().multiply(arm.quaternion);
  if(f._combatArmRoutes?.rig!==p.rig)f._combatArmRoutes={rig:p.rig};
  const routes=f._combatArmRoutes,route=routes[key];
  if(route){
    if(jointStart.angleTo(route)<.08)routes[key]=null;
    else jointTarget.copy(route);
  }
  const distance=Math.max(jointStart.angleTo(jointTarget),Math.abs(desired-previous));
  const budget=12*dt,amount=Math.min(1,budget/Math.max(.00001,distance));
  // A hard obstacle can require immediate retraction. Do not strand a legal
  // shot by forcing that existing collision response into an open-space budget.
  let coverCorrected=false,torsoCorrected=false;
  const pose=t=>{
    arm.quaternion.copy(p.torso.quaternion).multiply(target.copy(jointStart).slerp(jointTarget,t));
    bendArm(arm,lerp(previous,desired,t));
    if(f._openSky){
      p.g.updateMatrixWorld(true);origin.set(side,-.55,-.15).applyQuaternion(shoulderTurn);
      coverCorrected=constrainArmCover(f,arm,side,origin);torsoCorrected=constrainArmTorso(f,arm,side)||torsoCorrected;
    }
    target.copy(p.torso.quaternion).invert().multiply(arm.quaternion);
    return Math.max(jointStart.angleTo(target),Math.abs(-arm.children[1].rotation.x-previous));
  };
  if(pose(amount)>budget+1e-7&&amount>0&&!coverCorrected){
    // Contact changes the path length. Find the furthest feasible progress on
    // this articulated path, not a post-contact lerp back through the torso.
    jointAccepted.copy(arm.quaternion);let acceptedElbow=-arm.children[1].rotation.x;
    if(pose(0)<=budget+1e-7){
      let lo=0,hi=amount;jointAccepted.copy(arm.quaternion);acceptedElbow=-arm.children[1].rotation.x;
      for(let i=0;i<12;i++){
        const t=(lo+hi)*.5;
        if(pose(t)<=budget+1e-7){lo=t;jointAccepted.copy(arm.quaternion);acceptedElbow=-arm.children[1].rotation.x;}else hi=t;
      }
    }
    // If the moving body already invalidated the previous pose, contact wins;
    // that infeasible case is not disguised as a guaranteed angular bound.
    arm.quaternion.copy(jointAccepted);bendArm(arm,acceptedElbow);
  }
  // Retire only on actual arrival, not the unprojected candidate's distance.
  target.copy(p.torso.quaternion).invert().multiply(arm.quaternion);
  // Projection can accept a tiny legal step while erasing nearly all progress
  // toward a clear destination. That case never enters the over-budget branch.
  // Route outside the shoulder instead of retrying the same blocked shortcut.
  if(!route&&torsoCorrected&&!coverCorrected&&budget>0&&distance>budget*2)
    routes[key]=new THREE.Quaternion().setFromUnitVectors(down,routeDirection.set(side,-.15,.6).normalize());
  return !routes[key]&&target.angleTo(jointTarget)<1e-6&&Math.abs(-arm.children[1].rotation.x-desired)<1e-6;
}

// Remove only our previous overlay before locomotion writes its next base. No accumulated
// Euler yaw, and no changes to physics roots, hierarchy or the ragdoll's flat-FK contract.
export function restoreCombatBase(f) {
  if(!f.parts.rig)return;
  const rendered=f._combatRendered ||= Object.fromEntries(keys.map(k=>[k,new THREE.Quaternion()]));
  for(const key of keys)rendered[key].copy(f.parts[key].quaternion);
  (f._combatRenderedTorso ||= new THREE.Quaternion()).copy(f.parts.torso.quaternion);
  const elbows=f._combatRenderedElbows ||= {};
  for(const key of ['armL','armR'])elbows[key]=-f.parts[key].children[1].rotation.x;
  const base = f._combatPoseBase;
  if (base) for (const key of keys) f.parts[key].quaternion.copy(base[key]);
}

function aimDirection(f, socket, parent, point=f._combatAim.point) {
  socket.getWorldPosition(origin);
  direction.copy(point).sub(origin);
  if (direction.lengthSq() < .001) direction.copy(f.aim3);
  parent.getWorldQuaternion(inverse).invert();
  return direction.normalize().applyQuaternion(inverse);
}

function settleBody(f, base, dt) {
  const p=f.parts,state=f._combatAim;
  // Keep only the beam/guard carrier's history. Reusing the final rendered body here
  // would feed a subsequent melee twist back into its own recovery every frame.
  const carrier=state.carrier ||= base.body.clone();
  // Source gait already carries hip support. A second delayed body rotation
  // after the boot solve would push the support foot below the floor.
  // Source locomotion already owns the carrier. A second smoother after jump
  // landing support would rotate the planted boots back beneath the floor.
  if(f._groundMotion?.weight>.001||f._jumpMotion?.applied){carrier.copy(p.body.quaternion);state.groundCarrier=true;return;}
  if(state.groundCarrier){carrier.copy(p.body.quaternion);state.groundCarrier=false;}
  carrier.rotateTowards(p.body.quaternion,12*dt);p.body.quaternion.copy(carrier);
  hip.set(0,p.rig.pivotHeight,0);hipBase.copy(hip).applyQuaternion(base.body);
  p.body.position.add(hipBase.sub(hip.applyQuaternion(carrier)));
}

export function animateCombatAim(f, dt) {
  const p = f.parts;
  if (!p.rig) return;
  f._combatPoseVersion=(f._combatPoseVersion||0)+1;
  const base = f._combatPoseBase ||= Object.fromEntries(keys.map(k => [k, new THREE.Quaternion()]));
  for (const key of keys) base[key].copy(p[key].quaternion);
  const state = f._combatAim ||= { weight: 0, gather: 0, source: 'hand', point: new THREE.Vector3() };
  const blocked = !!f._abilityMeleePose || f.poseGuard > .05 || f.poseStrike > .05 || f.poseGrab > .05 || f.meleeCharge > 0 || f.staggerT > 0 || f.stunT > 0 || f.frozenT > 0 || !!f.grabbedBy;
  if(blocked&&f._combatArmRoutes){f._combatArmRoutes.armL=null;f._combatArmRoutes.armR=null;}
  const slots=Object.values(f.slots);
  const channels=rangedPoseChannels(f),slot=channels.dominant;
  if(slot&&slot!==state.owner){
    // A continuing off-hand attack can become the body carrier when the other
    // hand releases. Adopt its own history, not the outgoing slow ray/gather.
    const incoming=state.armChannels?.find(hand=>hand.independent&&hand.slot===slot&&hand.weight>.0001);
    if(incoming){state.point.copy(incoming.point);state.weight=incoming.weight;state.gather=incoming.gather;}
  }
  state.owner=slot;
  if (slot) {
    state.source = slot.def.faceOrigin ? 'face' : slot.def.chest ? 'chest' : 'hand';
    state.style=slot.def.castStyle||'auto';
    state.castSide=palmCastSide(slot.def);
    state.firearm=slot.def.type==='rifle'?Object.assign(state._firearm ||= {},firearmEmitter(f,slot.def)):null;
    state.handPattern=state.firearm?(state.firearm.side<0?'left':'right'):slot.def.type==='volley'?volleyPattern(slot.def):null;
    state.handShots=slot.handShots;
    // Explicit ability metadata wins; legacy charged martial kits inherit this motion class.
    state.twoHand = usesCombinedHands(f,slot.def);
  }
  state.gather=damp(state.gather,slot?.charging?1:0,slot?.charging?14:20,dt);
  direction.copy(f.hasAimWorld ? f.aimWorld : f.pos);
  if (!f.hasAimWorld) direction.addScaledVector(f.aim3, 100);
  const beam=slot?.active?.sustaining ? slot.active : null;
  // Release/pressure is a body-channel response, not simulated knockback. Read
  // every live emission's age: slot arbitration or an interruption cannot replay
  // a kick, and an earlier charging slot cannot hide another beam's onset.
  let kick=0,pressure=0,strain=0;
  if(f._openSky&&!blocked)for(const s of slots){
    const emission=s.def.type==='beam'&&s.active?.sustaining?s.active:null;
    if(!emission)continue;
    const age=emission.emissionAge||0;
    const load=THREE.MathUtils.clamp(Math.sqrt(emission.power),.75,1.6)*(s.def.faceOrigin?.4:s.def.chest?.65:1);
    const brace=(1-Math.exp(-age*10))*load;
    kick=Math.max(kick,age/.1*Math.exp(1-age/.1)*load);
    pressure+=brace;strain+=Math.sin(age*8)*brace;
  }
  const pressureLimit=1.6/Math.max(1.6,pressure);pressure*=pressureLimit;strain*=pressureLimit;
  if(beam?.predictDirection){
    // Follow what is being emitted, not the faster target-point filter. The beam
    // retains its steering response and already-fired energy is not redirected.
    const emission=state.emission ||= new THREE.Vector3();
    const emissionOrigin=state.emissionOrigin ||= new THREE.Vector3();
    p.g.updateMatrixWorld(true);
    beam.sampleMuzzle?beam.sampleMuzzle(emissionOrigin):f.muzzle(emissionOrigin,beam.faceOrigin?1.1:beam.chest?1.2:undefined,beam.faceOrigin?8.3:beam.chest?5.4:undefined);
    beam.predictDirection(emission,dt,emissionOrigin);
    // While a hand release is preparing, the captured point owns parallax.
    // Projecting its ray out to 100 units makes a nearby shot chase a moving
    // virtual target as the palms rise; readiness checks the real close point.
    if(beam.pendingLaunch&&beam._launchTarget&&!beam.faceOrigin&&!beam.chest)state.point.copy(beam._launchTarget);
    else state.point.copy(emissionOrigin).addScaledVector(emission,100);
  }
  else if (state.weight < .0001) state.point.copy(direction);
  else state.point.lerp(direction, 1 - Math.exp(-24 * dt));
  state.weight = blocked ? 0 : damp(state.weight, slot ? 1 : 0, slot ? 18 : 12, dt);
  const handChannels=updateIndependentHands(f,channels,dt,blocked);
  const weight = state.weight;
  shoulderTurn.setFromEuler(new THREE.Euler(-(f._directionalPose?.pitch||0),f._directionalPose?.shoulder||0,0,'YXZ'));
  if (weight < .0001) {
    state.palmUp=null;
    braceGuard(f);settleBody(f,base,dt);animateGroundAimSupport(f,dt,null,exclusivePose(f));animateChestAim(f,dt,null,blocked);
    const spineTurn=animateSpineAim(f,dt,false,exclusivePose(f));if(spineTurn)shoulderTurn.premultiply(spineTurn);
    animateMelee(f);
    // Grounded neutral is still a physical pose. Dropping clearance with the
    // last casting weight lets an elbow pop back through breathing ribs. The
    // authored hover/cruise families retain their own resting joint contract.
    if((f._openSky||f._game?.modeId==='powerworld')&&f.gait===GAIT.GROUNDED&&!f.flying&&!f.gliding&&!exclusivePose(f))
      for(const [arm,side]of [[p.armL,-1],[p.armR,1]])constrainArmTorso(f,arm,side);
    if(state.recovering&&f._combatRendered&&!blocked){
      const left=settleArm(f,'armL',dt),right=settleArm(f,'armR',dt);
      state.recovering=!(left&&right);
    }
    return;
  }
  state.recovering=true;
  const air=(f.airborne||f.gliding)?weight:0;
  if (air) {
    if(!exclusivePose(f)){
      // Brace relative to the authored flight joints, strongest at hover.
      // Velocity already selects and smooths the leg family in animateFlight;
      // replacing those joints here would erase cruise and custom profiles.
      const hover=1-THREE.MathUtils.clamp((f.vel.length()-4)/30,0,1);
      state.legBrace=damp(state.legBrace??hover,hover,12,dt);
      const brace=state.legBrace*air;
      p.legL.rotation.x-= (.1+state.gather*.12)*brace;
      p.legR.rotation.x-= (.04+state.gather*.12)*brace;
      p.legL.rotation.z=lerp(p.legL.rotation.z,-.16,brace);
      p.legR.rotation.z=lerp(p.legR.rotation.z,.16,brace);
      p.legL.userData.knee.rotation.x+=(.15+state.gather*.18)*brace;
      p.legR.userData.knee.rotation.x+=(.12+state.gather*.2)*brace;
    }else{
      p.legL.rotation.x=lerp(p.legL.rotation.x,-.16-state.gather*.12,air);
      p.legR.rotation.x=lerp(p.legR.rotation.x,.06-state.gather*.12,air);
      p.legL.rotation.z=lerp(p.legL.rotation.z,-.16,air);
      p.legR.rotation.z=lerp(p.legR.rotation.z,.16,air);
      p.legL.userData.knee.rotation.x=lerp(p.legL.userData.knee.rotation.x,.65+state.gather*.18,air);
      p.legR.userData.knee.rotation.x=lerp(p.legR.userData.knee.rotation.x,.42+state.gather*.2,air);
    }
    p.legL.rotation.x+=(.18*kick-.06*pressure-.04*strain)*air;
    p.legR.rotation.x+=(.1*kick+.04*pressure+.03*strain)*air;
    p.legL.userData.knee.rotation.x+=(.14*kick+.06*pressure+.04*strain)*air;
    p.legR.userData.knee.rotation.x+=(.08*kick+.04*pressure-.03*strain)*air;
    if(!exclusivePose(f))for(const leg of [p.legL,p.legR]){
      leg.rotation.x=THREE.MathUtils.clamp(leg.rotation.x,-1.6,1.2);
      leg.userData.knee.rotation.x=THREE.MathUtils.clamp(leg.userData.knee.rotation.x,0,2.4);
    }
    if(state.twoHand)p.body.rotation.y+=air*lerp(-.06,.2,state.gather);
    // The body supplies elevation before the neck and hand solves. A vertical shot
    // should not be a neutral hover with a ninety-degree neck bend. Keep the pelvis
    // anchored in flight; neither simulation position nor the ground markers rotate.
    p.g.updateMatrixWorld(true);
    hip.set(0,p.rig.pivotHeight,0);p.body.localToWorld(hip);
    direction.copy(state.point).sub(hip).normalize();
    p.body.parent.getWorldQuaternion(inverse).invert();direction.applyQuaternion(inverse);
    // A chest ray above a nose-down carrier can be behind its local Z plane.
    // hypot(x,z) folds that pitch back below 90 degrees and aims the body the
    // wrong distance upward. Root yaw already follows the emitted chest ray.
    const axial=channels.torso?.active?.sustaining;
    const elevation=Math.atan2(direction.y,axial?direction.z:Math.hypot(direction.x,direction.z));
    // An emitting chest must counter the dive carrier as well as elevation.
    // The old +/- .95 body cap left more than the thorax's .8-radian budget
    // during a descending, upward reversal. This is whole-body presentation
    // around the hip, not additional spine bend or a change to travel physics.
    const bodyElevation=axial?elevation*.7:THREE.MathUtils.clamp(elevation*.7,-.95,.95);
    // A hand emitter has independent shoulder/elbow aim. Counter-pitching its
    // entire body here cancelled the flight carrier and stood the actual pelvis
    // upright, even though the outer group's flight-pitch tests still passed.
    // Fade that hover brace out during travel; chest/optic carriers and guarded
    // full-body actions keep their own anatomical aiming budgets.
    const aimX=state.point.x-f.pos.x,aimZ=state.point.z-f.pos.z,horizontal=Math.hypot(f.vel.x,f.vel.z);
    const along=(aimX*f.vel.x+aimZ*f.vel.z)/Math.max(.001,horizontal*Math.hypot(aimX,aimZ));
    const handTravel=f._openSky&&state.source==='hand'&&!channels.head&&!channels.torso&&!exclusivePose(f)
      ?THREE.MathUtils.clamp((horizontal-4)/30,0,1)*THREE.MathUtils.smoothstep(along,.6,.9):0;
    p.body.rotation.x-=bodyElevation*air*(1-handTravel);
    p.body.rotation.x+=(-.22*kick+.045*pressure+.045*strain)*air;
  }
  // Settle the carrier BEFORE solving its child emitters, not after their IK.
  settleBody(f,base,dt);
  animateGroundAimSupport(f,dt,channels.torso,exclusivePose(f));
  const chestTurn=animateChestAim(f,dt,channels.torso,blocked,channels.head);
  if(chestTurn)shoulderTurn.premultiply(chestTurn);
  const spineTurn=animateSpineAim(f,dt,!!slot,exclusivePose(f));
  if(spineTurn)shoulderTurn.premultiply(spineTurn);
  p.g.updateMatrixWorld(true);
  // Both optic and hand casters look at the attack, including elevation. Constrain neck
  // yaw to its forward hemisphere; turning the fighter remains the controller's job.
  // A slower optic hose can turn independently of a faster palm hose. Resolve
  // its predicted emission here, after the shared body carrier has settled.
  const headPoint=state.headPoint ||= new THREE.Vector3();headPoint.copy(state.point);
  const optic=channels.head?.active?.sustaining?channels.head.active:null;
  if(optic?.predictDirection&&optic?.sampleMuzzle){
    const opticOrigin=state.opticOrigin ||= new THREE.Vector3(),opticDir=state.opticDir ||= new THREE.Vector3();
    optic.sampleMuzzle(opticOrigin);optic.predictDirection(opticDir,dt,opticOrigin);
    headPoint.copy(opticOrigin).addScaledVector(opticDir,100);
    // Refresh the primary optic as well as co-fire after its carrier moves.
    // Use the ray directly: an arbitrary 100u point from a pre-carrier socket
    // introduces parallax that feeds back into emission and misses forever.
    p.head.parent.getWorldQuaternion(inverse).invert();direction.copy(opticDir).applyQuaternion(inverse);
  }else aimDirection(f, p.head, p.head.parent,headPoint);
  if(!f._directionalPose?.applied&&!optic)direction.z = Math.max(.08, direction.z);
  direction.normalize();
  target.setFromUnitVectors(forward, direction);
  p.head.quaternion.slerp(target, weight);
  p.cowl.quaternion.copy(p.head.quaternion);

  if (state.source === 'face' || state.source === 'chest') {
    // Braced fists below the ribs, not a two-handed launch pose for an eye/chest emitter.
    for (const [arm, side] of [[p.armL, -1], [p.armR, 1]]) {
      target.setFromEuler(new THREE.Euler(-.12, 0, side * .17));
      target.premultiply(shoulderTurn);
      arm.quaternion.slerp(target, weight);
      bendArm(arm, lerp(-arm.children[1].rotation.x, .48, weight));
    }
    const scale=p.rig.pivotHeight/4.6;
    if(state.source==='face'&&state.style==='optic-focus'&&!p.armR.children[2].userData.gripOccupied){
      // One hand at the temple, the other bracing. The head remains the emitter;
      // hands occupied by equipment never bury that equipment in the face.
      p.g.updateMatrixWorld(true);
      handTarget.set(1.35*scale,-.12*scale,.15*scale);
      p.head.localToWorld(handTarget);p.body.worldToLocal(handTarget);
      origin.set(1,-.4,.1).applyQuaternion(shoulderTurn);
      reachArm(p.armR,handTarget,1,weight,origin);
    }else if(state.source==='chest'&&state.style==='chest-brace'){
      for(const [arm,side]of [[p.armL,-1],[p.armR,1]]){
        handTarget.set(side*2*scale,5.65*scale,1.25*scale);
        handTarget.sub(hip.set(0,p.rig.pivotHeight,0)).applyQuaternion(shoulderTurn).add(hip);
        origin.set(side,-.6,0).applyQuaternion(shoulderTurn);
        reachArm(arm,handTarget,side,weight,origin);
      }
    }
  } else if (state.handPattern) {
    // Independent forward palm lanes, with actual emission-timed recoil. Rapid
    // alternation keeps both arms ready instead of windmilling between shots.
    // This is a procedural combat overlay on the authored walk/jog/flight base.
    for(const [arm,side] of [[p.armL,-1],[p.armR,1]]){
      const active=state.handPattern==='paired'||state.handPattern==='alternate'||(side<0?state.handPattern==='left':state.handPattern==='right');
      if(active){
        aimDirection(f,arm,arm.parent);
        const age=Math.max(0,f.animT-(state.handShots?.[side]??-100));
        const pulse=age<.3?Math.exp(-age*18):0;
        const length=arm.userData.upperLength+arm.userData.foreLength;
        handTarget.copy(arm.position).addScaledVector(direction,length*(.91-.08*pulse));
        origin.set(side,-.5,-.15).applyQuaternion(shoulderTurn);
        reachArm(arm,handTarget,side,weight,origin);
      }else{
        target.setFromEuler(new THREE.Euler(-.62,-side*.25,side*.32));target.premultiply(shoulderTurn);
        arm.quaternion.slerp(target,weight);bendArm(arm,lerp(-arm.children[1].rotation.x,1.25,weight));
      }
    }
  } else if (state.twoHand) {
    const scale=p.rig.pivotHeight/4.6;
    // Gather at the lower ribs, then extend both hands along the attack. All positions
    // live in the body channel: moving/flying never drags the authoritative entity root.
    aimDirection(f,p.torso,p.body);
    // Shoulder/spine aiming moves this pair in all three body-local axes.
    // Keeping only their mean height anchored a small tilted body's hands
    // behind its actual shoulder plane and stranded an otherwise legal shot.
    castCenter.copy(p.armL.position).add(p.armR.position).multiplyScalar(.5).addScaledVector(direction,(f._directionalPose?.applied?3.05:2.65)*scale);
    chargeCenter.set(.25*scale,6.1*scale,1.55*scale);
    chargeCenter.sub(hip.set(0,p.rig.pivotHeight,0)).applyQuaternion(shoulderTurn).add(hip);
    castCenter.lerp(chargeCenter,state.gather);
    for(const [arm,side] of [[p.armL,-1],[p.armR,1]]) {
      handTarget.copy(castCenter).add(origin.set(side*.58*scale,0,0).applyQuaternion(shoulderTurn));
      origin.set(side,-.6,-.2).applyQuaternion(shoulderTurn);
      reachArm(arm,handTarget,side,weight,origin);
    }
  } else {
    // Primary palm is the real muzzle socket. Two iterations account for its position
    // changing as the shoulder turns; elbow compensation keeps the palm on the ray.
    const side=state.castSide,key=side<0?'armL':'armR',arm=p[key],off=side<0?p.armR:p.armL;
    if(f._directionalPose?.applied){
      aimDirection(f,arm,arm.parent);
      handTarget.copy(arm.position).addScaledVector(direction,(arm.userData.upperLength+arm.userData.foreLength)*.96);
      origin.set(side,-.55,-.15).applyQuaternion(shoulderTurn);
      reachArm(arm,handTarget,side,weight,origin);
    }else{
      const elbow = lerp(-arm.children[1].rotation.x, .3, weight);
      bendArm(arm, elbow);
      for (let i = 0; i < 2; i++) {
        p.g.updateMatrixWorld(true);
        target.setFromUnitVectors(down, aimDirection(f, arm.children[2], arm.parent));
        target.multiply(bend.setFromAxisAngle(xAxis, elbow));
        arm.quaternion.copy(target);
      }
      arm.quaternion.slerpQuaternions(base[key], target, weight);
    }
    // Off hand guards the torso; silhouette differs from the extended casting arm.
    target.setFromEuler(new THREE.Euler(-.62, -side*.25, -side*.32));
    target.premultiply(shoulderTurn);
    off.quaternion.slerp(target, weight);
    bendArm(off, lerp(-off.children[1].rotation.x, 1.25, weight));
  }
  // A disjoint second attack replaces only its own off-hand brace. It does not
  // inherit the primary beam's slower ray, charge gather, or opposite-hand recoil.
  for(let i=0;i<2;i++){
    const hand=handChannels[i];if(!hand.independent||hand.weight<.0001)continue;
    const arm=i?p.armR:p.armL,side=i?1:-1;
    aimDirection(f,arm,arm.parent,hand.point);
    const age=Math.max(0,f.animT-(hand.slot?.handShots?.[side]??-100));
    const pulse=age<.3?Math.exp(-age*18):0;
    const length=arm.userData.upperLength+arm.userData.foreLength;
    handTarget.copy(arm.position).addScaledVector(direction,length*(.91-.08*pulse));
    origin.set(side,-.5,-.15).applyQuaternion(shoulderTurn);
    reachArm(arm,handTarget,side,hand.weight,origin);
  }
  // Make the destination physical before easing toward it. The non-emitting
  // brace arm also needs clearance when a hand channel yields to the eyes.
  if(f._openSky)for(const [arm,side]of [[p.armL,-1],[p.armR,1]]){
    p.g.updateMatrixWorld(true);origin.set(side,-.55,-.15).applyQuaternion(shoulderTurn);
    constrainArmCover(f,arm,side,origin);constrainArmTorso(f,arm,side);
  }
  // IK and the locomotion base can choose very different orientations at entry/exit.
  // Bound the actual rendered path, not just the blend weight, including wrap crossings.
  if(f._combatRendered)for(const key of keys) {
    if(key==='body')continue; // already settled before the child emitter solves
    target.copy(p[key].quaternion);
    if(key==='armL'||key==='armR'){
      // Shoulder and elbow travel as one articulation. Snapping a new elbow
      // bend under a still-easing shoulder sends a temple hand through the ribs.
      // Carry the upper arm with the chest before easing its own articulation.
      // Otherwise a turning chest moves the shoulder socket but leaves the
      // previous arm direction behind, sweeping the forearm through the ribs.
      settleArm(f,key,dt);
    }else{
      // Head and chest are sibling nodes, but smoothing belongs to the neck.
      // Body-space history would hold the face behind a turning shoulder carrier
      // and then the anatomical clamp would point the eyes away from their hose.
      jointStart.copy(f._combatRenderedTorso).invert().multiply(f._combatRendered[key]);
      jointTarget.copy(p.torso.quaternion).invert().multiply(target);
      // Live optic steering is already filtered by the hose. The face must
      // follow that physical emission, not a second delayed gaze filter.
      if(optic)jointStart.copy(jointTarget);else jointStart.rotateTowards(jointTarget,12*dt);
      p[key].quaternion.copy(p.torso.quaternion).multiply(jointStart);
    }
  }
  if(state.source==='hand')for(const [arm,side]of [[p.armL,-1],[p.armR,1]]){
    p.g.updateMatrixWorld(true);
    origin.set(side,-.55,-.15).applyQuaternion(shoulderTurn);
    constrainArmCover(f,arm,side,origin);
  }
  if(f._openSky)for(const [arm,side]of [[p.armL,-1],[p.armR,1]])constrainArmTorso(f,arm,side);
  if(f._openSky){
    // The rig's head and torso are siblings. A limit relative to the body
    // parent is not a neck limit once the shoulders turn independently.
    inverse.copy(p.torso.quaternion).invert();target.copy(inverse).multiply(p.head.quaternion);
    direction.copy(forward).applyQuaternion(target);
    const angle=Math.acos(THREE.MathUtils.clamp(direction.z,-1,1));
    // Limit the look cone, not quaternion distance: source shoulder roll is
    // compatible neck twist and must not drag a high optic shot off its ray.
    const lookCone=optic&&channels.torso?.active?.sustaining?AXIAL_COFIRE_CONE:NECK_LOOK_CONE;
    if(angle>lookCone){
      origin.copy(direction);origin.z=0;
      if(origin.lengthSq()<.00001)origin.copy(yAxis);
      origin.normalize().multiplyScalar(Math.sin(lookCone));origin.z=Math.cos(lookCone);
      bend.setFromUnitVectors(direction,origin);target.premultiply(bend);
      p.head.quaternion.copy(p.torso.quaternion).multiply(target);
    }
    p.cowl.quaternion.copy(p.head.quaternion);
  }
  // Contact is final: smoothing a shoulder after the wrist solve otherwise rotates
  // its palm away from emission. Attached gear follows the same authoritative grip.
  if(state.source==='hand')for(let i=0;i<2;i++){
    const independent=handChannels[i].independent&&handChannels[i].weight>=.0001;
    if(!independent&&((!state.twoHand&&!state.handPattern&&i!==(state.castSide<0?0:1))||state.handPattern==='left'&&i===1||state.handPattern==='right'&&i===0))continue;
    const hand=independent?handChannels[i]:state,handSlot=independent?hand.slot:slot;
    const arm=i?p.armR:p.armL;
    p.g.updateMatrixWorld(true);
    target.setFromUnitVectors(down,aimDirection(f,arm.children[2],arm,hand.point));
    // The procedural open palm has an explicit finger tangent. Imported skins
    // retain their source hand basis; occupied sockets retain their weapon grip.
    if(!p.skin&&!arm.children[2].userData.gripOccupied&&arm.children[2].geometry===arm.children[2].geometry.palmVariants?.[1])
      castingPalmOrientation(f,arm,direction,dt,target);
    // Once energy is actually leaving the hand, the final wrist owns its ray.
    // Keep the shoulder/elbow release blend, not a lingering gather at the muzzle.
    const emitting=handSlot?.active?.sustaining;
    arm.children[2].quaternion.slerp(target,emitting?1:hand.weight*(1-hand.gather));
    if(hand.firearm&&handSlot){
      const command=hand.firearmPoint ||= new THREE.Vector3();
      if(f.hasAimWorld)command.copy(f.aimWorld);
      else{(hand.firearm.socket||arm.children[2]).getWorldPosition(command);command.addScaledVector(f.aim3,100);}
      // Barrel offsets are not collinear with the grip. Re-solve at the actual
      // socket after the shoulder/hand has moved; close targets need parallax.
      for(let pass=0;pass<3;pass++){
        p.g.updateMatrixWorld(true);
        target.setFromUnitVectors(down,aimDirection(f,hand.firearm.socket||arm.children[2],arm,command));
        arm.children[2].quaternion.copy(target);
      }
    }
    if(hand.firearm){
      origin.set(i?1:-1,-.55,-.15).applyQuaternion(shoulderTurn);
      for(let pass=0;pass<5;pass++){
        p.g.updateMatrixWorld(true);
        const coverMoved=constrainWeaponCover(f,hand.firearm,origin);
        if(coverMoved)p.g.updateMatrixWorld(true);
        const bodyMoved=constrainWeaponTorso(f,hand.firearm,origin);
        if(!coverMoved&&!bodyMoved)break;
        if(handSlot){
          p.g.updateMatrixWorld(true);
          target.setFromUnitVectors(down,aimDirection(f,hand.firearm.socket||arm.children[2],arm,hand.firearmPoint));
          arm.children[2].quaternion.copy(target);
        }
      }
    }
  }
}
