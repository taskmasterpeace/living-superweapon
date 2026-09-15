import { clamp, damp, lerp } from '../core/util.js';
import { bendArm, centerFlightBody } from './hero-rig.js';
import { POSE_DEFAULTS, poseDefaultsForStyle } from '../data/flight-tuning.js';
import { rangedPoseChannels } from './cast-channels.js';
import { exclusivePose } from './directional-pose.js';
import { usesFlightPose } from './jump-motion.js';
import { ridingBoard } from './board-flight.js';

const JOINTS = Object.keys(POSE_DEFAULTS.hover);
const CRUISE_PITCH={'cruise-sides':1.26,'cruise-fists':1.26,'cruise-palms':1.26,'cruise-one':1.26,'cruise-bent':1.26,hero:1.26,twin:1.3,martial:1.18,thruster:1.3,hammer:1.06,glider:1.36};

// Flight is a pose family, not a rotation on the idle cycle. Combat owns the hands;
// velocity owns the torso; acceleration/release own the transitions between silhouettes.
export function animateFlight(f, dt, combat = 0) {
  const p = f.parts, rig = p.rig;
  if (!rig) return;
  const airborne = usesFlightPose(f), riding = ridingBoard(f);
  // Contact stops simulation travel. Preserve the committed aerial silhouette
  // through punch recovery without inventing physics velocity to hold the pose.
  const contactMotion=f._abilityMeleePose,heldTravel=contactMotion?.contactVelocity;
  const velocity=heldTravel?heldTravel.clone().lerp(f.vel,clamp((contactMotion.elapsed-contactMotion.active)/contactMotion.recovery,0,1)**3):f.vel;
  const speed = velocity.length(), horizontal = Math.hypot(velocity.x, velocity.z);
  const brake = clamp(f._flightBrake || 0, 0, 1);
  const engaged = airborne ? clamp((speed - 4) / 30, 0, 1) : 0;
  const combatWeight = clamp(combat, 0, 1);
  const channels=rangedPoseChannels(f);
  const ranged=airborne&&!exclusivePose(f)&&(channels.dominant||f._combatAim?.weight>.0001);
  // Field ranged channels articulate above the travelling pelvis. Applying the
  // full-body combat brake here stood the entire flier up on every shot, then
  // tipped it forward again on release. Guard/grab/reactions retain ownership.
  // A chest emitter has no independent arm: retain its existing cross-body
  // brace when firing across/back against travel. Forward chest fire, hands
  // and eyes do not need to stand the travelling lower body upright.
  const chestDirection=channels.torso?.active?.dir||f.aim3;
  const chestAlong=channels.torso?clamp((f.vel.x*chestDirection.x+f.vel.z*chestDirection.z)/Math.max(.001,horizontal*Math.hypot(chestDirection.x,chestDirection.z)),0,1):1;
  const bodyCombat=f._abilityMeleePose?0:f._openSky&&ranged?combatWeight*(1-chestAlong*chestAlong):combatWeight;
  const travel = engaged * (1 - brake * .86) * (1 - bodyCombat * .66);
  const bodyYaw = p.g.rotation.y;
  const forward = velocity.x * Math.sin(bodyYaw) + velocity.z * Math.cos(bodyYaw);
  const side = velocity.x * Math.cos(bodyYaw) - velocity.z * Math.sin(bodyYaw);
  const retreat = clamp(-forward/Math.max(.001,speed*.5),0,1);
  const backWeight = f._openSky ? retreat*retreat*(3-2*retreat) : forward < -2 ? 1 : 0;
  // Direction is a blend space, not a forward-speed threshold. Pure lateral
  // flight keeps the face toward the fight with a modest bank; diagonal flight
  // continuously blends into the authored forward/backward family.
  const lateral = f._openSky ? side*side/Math.max(.001,speed*speed) : 0;
  const strafe = side >= 0 ? 'strafeLeft' : 'strafeRight';
  const longitudinal = f.cruiseHeld ? 'boost' : 'forward';
  const state = brake > .08 ? 'brake' : engaged <= .01 ? 'hover' : lateral > .5 ? strafe : backWeight > .5 ? 'backward' : longitudinal;
  f._flightPoseState = state;
  // Backpedalling stays attack-ready, including descending. Negative forward atan2 used to
  // flip the spine past -90 degrees. City flight keeps its existing dive/bank limits.
  let pitch = horizontal > 2 ? Math.atan2(Math.max(0, forward), velocity.y) :
    (f._openSky && velocity.y < -12 ? Math.PI : 0);
  pitch=lerp(pitch,-.18,backWeight);
  if(f._openSky&&forward>2){
    const level=1-clamp(Math.abs(velocity.y)/Math.max(1,horizontal),0,1);
    const silhouette=CRUISE_PITCH[rig.flightStyle]??1.18;
    pitch-= (Math.PI/2-silhouette)*level;
  }
  // Boost streamlines the same silhouette, without flattening it into boot soles.
  // Steep climbs/dives still follow the requested travel path.
  if (f._openSky && longitudinal === 'boost' && forward > 2) {
    const level = 1 - clamp(Math.abs(velocity.y) / Math.max(1, horizontal), 0, 1);
    pitch += Math.max(0,Math.min(.14,1.36-(CRUISE_PITCH[rig.flightStyle]??1.18))) * level;
  }
  if (!f._openSky) pitch = clamp(pitch, -.18, 1.85);
  let roll = -Math.atan2(side, Math.max(5, Math.hypot(forward, velocity.y)));
  roll=lerp(roll,clamp(roll,-.25,.25),backWeight);
  if (!f._openSky) roll = clamp(roll, -.5, .5);
  pitch=lerp(pitch,.08,lateral);
  roll=lerp(roll,clamp(roll,-.28,.28),lateral);
  if(riding){pitch=clamp(Math.atan2(-velocity.y,Math.max(20,horizontal))*.24+.12,-.22,.36);roll=clamp(roll,-.22,.22);}
  p.g.rotation.x = damp(p.g.rotation.x, airborne ? pitch * travel - brake * .2 : 0, 11, dt);
  p.g.rotation.z = damp(p.g.rotation.z, airborne ? roll * travel : 0, 10, dt);
  if (p.groundRig) { p.groundRig.rotation.x=-p.g.rotation.x; p.groundRig.rotation.z=-p.g.rotation.z; }
  centerFlightBody(p);
  // Production _animate rewrites the base locomotion joints each frame. Smooth flight targets
  // independently, then layer them onto that base; damping base transforms would snap on switches.
  const defaults = poseDefaultsForStyle(rig.flightStyle);
  const pose = f._flightJointPose ||= {...defaults.hover};
  const overrides = f.def.model?.poses;
  const mix = state === 'brake' ? brake : state === 'hover' ? 0 : engaged;
  for (const key of JOINTS) {
    const hover = overrides?.hover?.[key] ?? defaults.hover[key];
    let target = overrides?.[state]?.[key] ?? defaults[state][key];
    if(state!=='hover'&&state!=='brake') {
      const forwardPose=overrides?.[longitudinal]?.[key] ?? defaults[longitudinal][key];
      const backPose=overrides?.backward?.[key] ?? defaults.backward[key];
      const along=lerp(forwardPose,backPose,backWeight);
      const across=overrides?.[strafe]?.[key] ?? defaults[strafe][key];
      target=lerp(along,across,lateral);
    }
    pose[key] = damp(pose[key], lerp(hover, target, mix), 12, dt);
  }
  if(riding){pose.hipL=pose.hipR=-.22;pose.kneeL=pose.kneeR=.44;}
  const flight = f._flyPose || 0, weight = flight * (1-combatWeight);
  // A ranged action claims its emitter and upper-body carrier, not the legs.
  // Keep the authored flight base through release; full-body owners retain
  // their existing suppression so kicks, grabs and guard still win.
  const legWeight=riding?1:ranged||f._abilityMeleePose?flight:weight;
  p.legL.rotation.x=lerp(p.legL.rotation.x,pose.hipL,legWeight);
  p.legR.rotation.x=lerp(p.legR.rotation.x,pose.hipR,legWeight);
  // Legs extend along -Y: left needs negative roll to spread outward. The inverse signs
  // crossed the boot volumes even when the hip pivots appeared separated.
  // Rebuild the ranged base, rather than feeding yesterday's brace back into
  // partial takeoff (including inspection redraws with zero simulation dt).
  p.legL.rotation.z=ranged?-.08*legWeight:damp(p.legL.rotation.z,-.08*weight,12,dt);
  p.legR.rotation.z=ranged?.08*legWeight:damp(p.legR.rotation.z,.08*weight,12,dt);
  p.legL.userData.knee.rotation.x=lerp(p.legL.userData.knee.rotation.x,pose.kneeL,legWeight);
  p.legR.userData.knee.rotation.x=lerp(p.legR.userData.knee.rotation.x,pose.kneeR,legWeight);
  if(riding){p.legL.rotation.z=-.08;p.legR.rotation.z=.08;}
  p.armL.rotation.x=lerp(p.armL.rotation.x,pose.armLx,weight);
  p.armR.rotation.x=lerp(p.armR.rotation.x,pose.armRx,weight);
  p.armL.rotation.z=lerp(p.armL.rotation.z,pose.armLz,weight);
  p.armR.rotation.z=lerp(p.armR.rotation.z,pose.armRz,weight);
  const combatBend = f.poseGuard > .1 ? 1.45 : f.meleeCharge > 0 ? 1.5 : f._bowDraw > .1 ? 1.4 : .08;
  if(f.poseGuard>.02) {
    p.armL.rotation.x=lerp(p.armL.rotation.x,-.58,f.poseGuard);
    p.armR.rotation.x=lerp(p.armR.rotation.x,-.58,f.poseGuard);
  }
  bendArm(p.armL, lerp(lerp(.32,pose.elbowL,flight),combatBend,combatWeight));
  bendArm(p.armR, lerp(lerp(.32,pose.elbowR,flight),combatBend,combatWeight));
  // Eyes look ahead of the flight path, not at the floor under a prone chest.
  p.head.rotation.x=damp(p.head.rotation.x,pose.headPitch*weight,10,dt);
  p.cowl.rotation.x=p.head.rotation.x;
}
