import * as THREE from 'three';

// Elliptical loft: anatomy with a shoulder line, ribcage and waist, not a stack of capsules.
// Geometry is independently replaceable; animation addresses sockets, never vertex layout.
export function anatomyGeometry(rings, segments = 12) {
  const vertices = [], indices = [];
  for (const [y, width, depth] of rings) {
    for (let i = 0; i <= segments; i++) {
      const a = i / segments * Math.PI * 2;
      vertices.push(Math.sin(a) * width, y, Math.cos(a) * depth);
    }
  }
  for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < segments; i++) {
    const a = r * (segments + 1) + i, b = a + segments + 1;
    indices.push(a, a + 1, b, a + 1, b + 1, b);
  }
  // Separate cap vertices keep flat end normals out of the rounded side shading.
  // Open lofts exposed the background at necks, cuffs and bent limb joints.
  for(const end of [0,rings.length-1]){
    const [y,width,depth]=rings[end],center=vertices.length/3;
    vertices.push(0,y,0);
    for(let i=0;i<=segments;i++){
      const a=i/segments*Math.PI*2;vertices.push(Math.sin(a)*width,y,Math.cos(a)*depth);
    }
    for(let i=0;i<segments;i++){
      const a=center+1+i,b=a+1;
      if(end===0)indices.push(center,b,a);else indices.push(center,a,b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.userData.anatomy = { rings: rings.map(r=>[...r]), segments };
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices); geo.computeVertexNormals();
  // Duplicate seam vertices need the same normal or a false crease runs down the chest/face.
  const normal=geo.attributes.normal, averaged=new THREE.Vector3();
  for(let r=0;r<rings.length;r++){
    const a=r*(segments+1),b=a+segments;
    averaged.set(normal.getX(a)+normal.getX(b),normal.getY(a)+normal.getY(b),normal.getZ(a)+normal.getZ(b)).normalize();
    normal.setXYZ(a,averaged.x,averaged.y,averaged.z);normal.setXYZ(b,averaged.x,averaged.y,averaged.z);
  }
  return geo;
}

// Flat FK preserves the existing arm [upper, forearm, hand] contract used by combat and ragdolls.
// Bending updates BOTH the forearm orientation and the hand socket, so held gear cannot detach.
export function bendArm(arm, angle) {
  const { upperLength: u, foreLength: v } = arm.userData;
  if (!u) return;
  const fore = arm.children[1], hand = arm.children[2];
  const s = Math.sin(angle), c = Math.cos(angle);
  fore.rotation.x = -angle;
  fore.position.set(0, -u - c * v * 0.5, s * v * 0.5);
  hand.position.set(0, -u - c * v, s * v);
  hand.rotation.set(-angle, 0, 0);
}

const reach = new THREE.Vector3(), restReach = new THREE.Vector3(), elbowAxis = new THREE.Vector3();
const pole = new THREE.Vector3(), cross = new THREE.Vector3();
const reachRotation = new THREE.Quaternion(), twistRotation = new THREE.Quaternion();
// Two-bone reach in the arm parent's space. The elbow pole chooses an outward bend,
// while bendArm keeps all existing hand/weapon and ragdoll contracts intact.
export function reachArm(arm, point, side, weight = 1, elbowPole = null) {
  const {upperLength:u,foreLength:v}=arm.userData;
  reach.copy(point).sub(arm.position);
  const distance=Math.max(Math.abs(u-v)+.001,Math.min(u+v-.001,reach.length()));
  reach.normalize();
  const angle=Math.acos(Math.max(-1,Math.min(1,(distance*distance-u*u-v*v)/(2*u*v))));
  restReach.set(0,-u-v*Math.cos(angle),v*Math.sin(angle)).normalize();
  reachRotation.setFromUnitVectors(restReach,reach);
  elbowAxis.set(0,-1,0).applyQuaternion(reachRotation).addScaledVector(reach,-elbowAxis.dot(reach)).normalize();
  if(elbowPole)pole.copy(elbowPole);else pole.set(side,-.3,-.2);
  pole.addScaledVector(reach,-pole.dot(reach)).normalize();
  const twist=Math.atan2(cross.crossVectors(elbowAxis,pole).dot(reach),elbowAxis.dot(pole));
  reachRotation.premultiply(twistRotation.setFromAxisAngle(reach,twist));
  arm.quaternion.slerp(reachRotation,weight);
  bendArm(arm,THREE.MathUtils.lerp(-arm.children[1].rotation.x,angle,weight));
}

const inverse = new THREE.Quaternion(), center = new THREE.Vector3();
export function syncHeadCover(parts) {
  if(!parts.rig||!parts.cowl)return;
  // Head and cover remain sibling drivers for ragdoll compatibility, but the
  // authored offset is HEAD-local. Copying rotation alone rotates the hair
  // around a different pivot and exposes the scalp when looking up in flight.
  parts.cowl.position.copy(parts.rig.rest.cowl).sub(parts.rig.rest.head)
    .applyQuaternion(parts.head.quaternion).add(parts.head.position);
  parts.cowl.quaternion.copy(parts.head.quaternion);
}
export function centerFlightBody(parts) {
  // g remains the authoritative physics position. Compensate the visual body so pitch/bank
  // rotate around the hips, not the soles. Ground markers remain on their independent rig.
  const h = parts.rig.pivotHeight;
  inverse.copy(parts.g.quaternion).invert();
  center.set(0, h, 0).applyQuaternion(inverse);
  parts.body.position.set(center.x, center.y - h, center.z);
}

export function bindHeroRig(parts, def) {
  const body = new THREE.Group(); body.name = 'hero-body';
  for (const child of [...parts.g.children]) if (child !== parts.groundRig) body.add(child);
  parts.g.add(body); parts.body = body;
  if (parts.cape) {
    parts.g.updateMatrixWorld(true);
    parts.torso.attach(parts.cape);
    // Bind in torso space: body-size edits must not leave the shoulder seam near
    // the crown on a small body or halfway down the back on a tall one.
    parts.cape.scale.set(1,1,1);
    parts.cape.position.set(0,1.25-2.6,-.94);
    parts.cape.userData.rest = parts.cape.geometry.attributes.position.array.slice();
    parts.cape.geometry.userData.deformsWithRig=true;
  }
  const scale = parts.g.userData.frame?.scale || 1;
  for (const arm of [parts.armL, parts.armR]) {
    arm.userData.upperLength = 1.65 * scale;
    arm.userData.foreLength = 1.55 * scale;
    arm.userData.sockets = { hand: arm.children[2] };
  }
  parts.rig = {
    version: 1, pivotHeight: 4.6 * scale,
    flightStyle: def.model?.flightStyle || (def.metal ? 'thruster' : def.id === 'sol' ? 'hero' : 'martial'),
    rest: Object.fromEntries(['torso','head','cowl','pelvis','emblem'].map(k => [k, parts[k].position.clone()])),
    sockets: { head: parts.head, chest: parts.torso, pelvis: parts.pelvis,
      leftHand: parts.armL.children[2], rightHand: parts.armR.children[2],
      leftFoot: parts.legL.userData.boot, rightFoot: parts.legR.userData.boot },
  };
}

const capeInverse=new THREE.Quaternion(),capeAir=new THREE.Vector3(),capeTangent=new THREE.Vector3();
export function animateCape(parts, time, speed, velocity) {
  const cape=parts.cape;if(!cape?.userData.rest)return;
  const pos=cape.geometry.attributes.position,rest=cape.userData.rest;
  const flow=Math.min(1,Math.max(0,speed/65));
  // Read the FINAL articulated carrier, after flight/combat pose. Airflow is world-space;
  // cloth deformation is local and never writes the simulated root or its velocity.
  cape.rotation.x=0;cape.updateWorldMatrix(true,false);
  cape.getWorldQuaternion(capeInverse).invert();
  capeAir.set(velocity?-velocity.x*.055:0,-1-(velocity?velocity.y*.055:0),velocity?-velocity.z*.055:-flow*3).applyQuaternion(capeInverse);
  // A lightweight garment envelope, not free cloth physics: stay behind the body and
  // below the shoulder attachment rather than flipping through the head on a reversal.
  capeAir.x=THREE.MathUtils.clamp(capeAir.x,-1.8,1.8);
  capeAir.y=Math.min(-.45,capeAir.y);capeAir.z=Math.min(-.22,capeAir.z);capeAir.normalize();
  const rows=cape.geometry.parameters.heightSegments,columns=cape.geometry.parameters.widthSegments+1;
  let cx=0,cy=2.6,cz=0;
  for(let i=0;i<pos.count;i++) {
    const x=rest[i*3],tail=(2.6-rest[i*3+1])/5.2;
    if(i%columns===0&&i>0){
      const bend=(tail-.5/rows)*.88;
      capeTangent.set(capeAir.x*bend,-(1-bend)+capeAir.y*bend,-.1*(1-bend)+capeAir.z*bend).normalize().multiplyScalar(5.2/rows);
      cx+=capeTangent.x;cy+=capeTangent.y;cz+=capeTangent.z;
    }
    const release=Math.sin(tail*Math.PI*.5),edge=Math.abs(x)/1.55;
    // Harmonics of the editor's eight-second playback window also keep its wrap seamless.
    const phase=time*Math.PI/4;
    const fold=-(.19+.17*Math.cos(x*5.1+Math.sin(phase*2-tail*2)*.18))*release;
    // Frequencies are independent of speed: changing speed changes amplitude, never phase.
    const flutter=Math.sin(phase*6-tail*6+x*1.5)*tail*tail*(.09+flow*.16);
    const width=1+Math.sin(tail*Math.PI*.8)*.17;
    const hem=tail**6*(.18*edge*edge+.055*Math.cos(x*4));
    pos.setXYZ(i,cx+x*width+Math.sin(phase*3-tail*4)*tail*tail*.07,cy+hem,cz+fold+flutter);
  }
  pos.needsUpdate=true;cape.geometry.computeVertexNormals();cape.geometry.computeBoundingSphere();
  if(cape.geometry.boundingBox)cape.geometry.computeBoundingBox();
}
