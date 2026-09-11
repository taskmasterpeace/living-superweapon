import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {damp} from '../core/util.js';

// One driven mesh, one draw call, one open-hand morph. Weapons remain children
// of the same socket; fingers never become new ragdoll joints or separate draws.
export function createHeroHand(material,side) {
  const closed=[],opened=[],casting=[];
  const append=(a,b)=>{closed.push(a.index?a.toNonIndexed():a);opened.push(b.index?b.toNonIndexed():b);if(a.index)a.dispose();if(b.index)b.dispose();};
  const palm=new THREE.SphereGeometry(1,12,8);palm.scale(.25,.24,.13);
  append(palm,palm.clone().rotateX(Math.PI/2));
  casting.push(opened[0].clone());
  const axis=new THREE.Vector3(0,1,0),from=new THREE.Vector3(),to=new THREE.Vector3(),q=new THREE.Quaternion();
  const segment=(a,b,r)=>{
    from.fromArray(a);to.fromArray(b);const distance=from.distanceTo(to);
    const geo=new THREE.CapsuleGeometry(r,Math.max(.01,distance-2*r),2,6);
    q.setFromUnitVectors(axis,to.clone().sub(from).normalize());
    geo.applyQuaternion(q);geo.translate((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);return geo;
  };
  // Open fingers extend along +Z while the palm emits along -Y. The former
  // -Z extension made a forward, fingers-up palm read as the opposite hand.
  // Build the reflected point layout, not a negative-scale mesh (winding and
  // normals stay outward); closed grips and their weapon socket are unchanged.
  const openPoint=p=>[p[0],-p[1],p[2]];
  const castingSegment=(a,b,r)=>{const g=segment(openPoint(a),openPoint(b),r).rotateX(Math.PI/2);casting.push(g.toNonIndexed());g.dispose();};
  const digit=(a,b,c,x,y,z,r)=>{
    append(segment(a,b,r),segment(x,y,r).rotateX(Math.PI/2));append(segment(b,c,r),segment(y,z,r).rotateX(Math.PI/2));
    castingSegment(x,y,r);castingSegment(y,z,r);
  };
  for(let i=0;i<4;i++){
    const x=(i-1.5)*.135*side,length=[.43,.49,.46,.36][i],splay=(i-1.5)*.035*side;
    digit([x,-.17,0],[x,-.34,.14],[x,-.19,.23],
      [x,-.17,0],[x+splay,-.17-length*.52,.01],[x+splay*1.7,-.17-length,.04],.068);
  }
  const thumb=-side;
  digit([thumb*.23,.09,.02],[thumb*.29,-.07,.15],[thumb*.10,-.15,.20],
    [thumb*.23,.09,.02],[thumb*.40,-.04,0],[thumb*.51,-.18,.01],.082);
  // Extend the heel of the open palm beyond the cuff. Keep a continuous wrist
  // inside the same mesh; the authoritative hand/weapon socket never moves.
  for(const g of [...opened,...casting])g.translate(0,-.30,0);
  const wrist=new THREE.CapsuleGeometry(.14,.30,2,8);
  append(wrist,wrist.clone());
  casting.push(opened.at(-1).clone());
  // Keep the existing non-casting shape and its conservative contact envelope.
  // Each variant has accurate render bounds; an unused casting morph must not
  // silently change gun retraction or a closed-hand ragdoll's cloth trajectory.
  const variants=[opened,casting].map(parts=>{
    const geometry=mergeGeometries(closed),openGeometry=mergeGeometries(parts);
    geometry.morphAttributes.position=[openGeometry.attributes.position.clone()];
    geometry.morphAttributes.normal=[openGeometry.attributes.normal.clone()];
    geometry.morphTargetsRelative=false;geometry.computeBoundingBox();geometry.computeBoundingSphere();openGeometry.dispose();
    return geometry;
  });
  // Not userData: Three.js JSON-clones userData for decoys. Resource retirement
  // follows this pair explicitly, including a decoy borrowing either variant.
  for(const geometry of variants)geometry.palmVariants=variants;
  for(const g of [...closed,...opened,...casting])g.dispose();
  const hand=new THREE.Mesh(variants[0],material);hand.name='hero-hand';hand.castShadow=true;
  hand.userData.gripOccupied=false;return hand;
}

const normal=new THREE.Vector3(),upright=new THREE.Vector3(),tangent=new THREE.Vector3(),cross=new THREE.Vector3();
const palmX=new THREE.Vector3(),palmY=new THREE.Vector3(),palmFrame=new THREE.Matrix4(),parentRotation=new THREE.Quaternion();

// An aim ray leaves one rotation undetermined: roll. Use the final torso's up
// direction for a deliberate palm-forward, fingers-up blast. Transport and
// rate-limit only roll, so vertical targets cannot flip the wrist in one frame
// and the palm normal never lags behind its actually emitted energy.
export function castingPalmOrientation(f,arm,localDirection,dt,out){
 arm.getWorldQuaternion(parentRotation);
 normal.copy(localDirection).applyQuaternion(parentRotation).normalize();
 upright.set(0,1,0).applyQuaternion(f.parts.torso.getWorldQuaternion(out));
 upright.addScaledVector(normal,-upright.dot(normal));
 const frames=f._combatAim.palmUp ||= [],i=arm===f.parts.armR?1:0,previous=frames[i];
 if(upright.lengthSq()<.02){
  if(previous)upright.copy(previous).addScaledVector(normal,-previous.dot(normal));
  if(upright.lengthSq()<.001){
   upright.set(0,0,1).applyQuaternion(out).addScaledVector(normal,-upright.dot(normal));
  }
 }
 upright.normalize();
 if(previous){
  tangent.copy(previous).addScaledVector(normal,-previous.dot(normal));
  if(tangent.lengthSq()>.001){
   tangent.normalize();
   const angle=Math.atan2(cross.crossVectors(tangent,upright).dot(normal),tangent.dot(upright));
   upright.copy(tangent).applyAxisAngle(normal,THREE.MathUtils.clamp(angle,-14*dt,14*dt));
  }
 }
 (frames[i] ||= new THREE.Vector3()).copy(upright);
 palmX.crossVectors(upright,normal).normalize();palmY.copy(normal).negate();
 palmFrame.makeBasis(palmX,palmY,upright);
 return out.setFromRotationMatrix(palmFrame).premultiply(parentRotation.invert());
}

export function animateHands(f,dt) {
  const state=f._combatAim;
  for(let i=0;i<2;i++){
    const arm=i?f.parts.armR:f.parts.armL,primary=i===1;
    const hand=arm.children[2];if(!hand.morphTargetInfluences)continue;
    const channel=state?.armChannels?.[i],independent=channel?.independent&&channel.weight>.01;
    const casting=independent||state?.source==='hand'&&state.weight>.01&&(state.handPattern?
      state.handPattern==='alternate'||state.handPattern==='paired'||(primary?state.handPattern==='right':state.handPattern==='left'):
      i===(state.castSide<0?0:1)||state.twoHand);
    const style=f.parts.rig?.flightStyle;
    const leadingFist=(state?.weight??0)>.01||style==='glider'&&!primary&&f._flightPoseState==='boost';
    const glide=f.airborne&&['thruster','glider'].includes(style)&&!leadingFist&&!f.guarding&&f.poseGuard<.05&&f.poseStrike<.05&&f.poseGrab<.05&&f.meleeCharge<=0&&f.staggerT<=0&&!(f.frozenT>0);
    const barrier=f._openSky&&f.def.guardType==='barrier'&&!primary&&f.staggerT<=0&&!(f.frozenT>0)?(f.poseGuard||0):0;
    const cast=independent?channel:state;
    let open=hand.userData.gripOccupied?0:barrier>.01?barrier:casting?cast.weight*(1-.38*cast.gather):glide?(f._flyPose||0)*.92:0;
    const variants=hand.geometry.palmVariants,wanted=casting&&!f.parts.skin&&!hand.userData.gripOccupied?1:0;
    if(variants&&hand.geometry!==variants[wanted]){
      // Change shape through the shared closed fist, never teleport open digits.
      // Picking up a weapon requires an immediate closed grip before it fires.
      if(hand.morphTargetInfluences[0]>.001&&!hand.userData.gripOccupied)open=0;
      else{
        hand.morphTargetInfluences[0]=0;hand.geometry=variants[wanted];
        hand.traverse(o=>{if(o._gripCoverBounds)delete o._gripCoverBounds;});
      }
    }
    hand.morphTargetInfluences[0]=damp(hand.morphTargetInfluences[0],open,20,dt);
  }
}
