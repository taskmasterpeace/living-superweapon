// Small articulated field crew. Local-space joints only; no fighter rig, collision or simulation.
import * as THREE from 'three';

const sphere = new THREE.SphereGeometry(1, 10, 8);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 8);
const box = new THREE.BoxGeometry(1, 1, 1);
const up = new THREE.Vector3(0, 1, 0);
const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3();
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function mesh(parent, name, geometry, material, position, scale) {
  const m = new THREE.Mesh(geometry, material); m.name = name;
  m.position.set(...position); m.scale.set(...scale); m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
function segment(m, from, to, radius) {
  m.position.copy(from).add(to).multiplyScalar(0.5);
  a.copy(to).sub(from); const length = a.length();
  m.scale.set(radius, length, radius);
  if (length > 0.001) m.quaternion.setFromUnitVectors(up, a.multiplyScalar(1 / length));
}
function bend(from, to, pole, upper, lower, out) {
  b.copy(to).sub(from); const distance = b.length() || 0.001; b.multiplyScalar(1 / distance);
  c.copy(pole).sub(from); c.addScaledVector(b, -c.dot(b));
  if (c.lengthSq() < 0.001) c.set(0, 0, 1);
  c.normalize();
  const reach = clamp(distance, Math.abs(upper - lower) + 0.01, upper + lower - 0.01);
  const along = (upper * upper - lower * lower + reach * reach) / (2 * reach);
  out.copy(from).addScaledVector(b, along).addScaledVector(c, Math.sqrt(Math.max(0, upper * upper - along * along)));
}

export function createNewsPerson(role, pressTexture = null) {
  const operator = role === 'operator';
  const material = color => new THREE.MeshStandardMaterial({ color, roughness: 0.84 });
  const skin = material(operator ? '#cda37e' : '#a9724d'), coat = material(operator ? '#304b59' : '#a93e34');
  const pants = material('#252b30'), shoes = material('#15191c'), dark = material('#29201b');
  const vest = material(operator ? '#d1c1a2' : '#d8c9ad'), shirt = material('#e8ddc6');
  const person = new THREE.Group(); person.name = 'news-' + role;
  const body = new THREE.Group(); body.name = 'body'; person.add(body);
  mesh(body, 'torso', box, coat, [0, 5.65, 0], [2.6, 2.7, 1.55]);
  mesh(body, 'waist', box, pants, [0, 4.2, 0], [2.25, 0.65, 1.35]);
  mesh(body, 'belt', box, shoes, [0, 4.4, 0.01], [2.35, 0.16, 1.41]);
  mesh(body, 'vest', box, vest, [0, 5.9, 0.04], [2.42, 1.85, 1.66]);
  for (const side of [-1, 1]) {
    mesh(body, 'vest-strap', box, vest, [side * 0.84, 6.79, 0.08], [0.42, 0.56, 1.7]);
    mesh(body, 'vest-pocket', box, coat, [side * 0.65, 5.28, 0.93], [0.86, 0.43, 0.15]);
  }
  mesh(body, 'shirt', box, shirt, [0, 6.8, 0.81], [0.77, 0.42, 0.09]);
  const badgeMat = new THREE.MeshStandardMaterial({ color: '#fff3d8', map: pressTexture, roughness: 0.9 });
  mesh(body, 'press-badge', box, badgeMat, [0, 6.07, 0.9], [1.48, 0.66, 0.06]);
  mesh(body, 'neck', cylinder, skin, [0, 7.2, 0], [0.42, 0.92, 0.42]);
  const head = new THREE.Group(); head.name = 'head-pivot'; body.add(head);
  mesh(head, 'head', sphere, skin, [0, 8.3, 0], [0.89, 1.04, 0.81]);
  mesh(head, 'jaw', sphere, skin, [0, 7.8, 0.26], [0.64, 0.5, 0.56]);
  mesh(head, 'nose', sphere, skin, [0, 8.26, 0.81], [0.18, 0.25, 0.25]);
  mesh(head, 'mouth', box, dark, [0, 7.91, 0.755], [0.33, 0.055, 0.05]);
  for (const side of [-1, 1]) {
    mesh(head, 'ear', sphere, skin, [side * 0.85, 8.29, 0], [0.18, 0.3, 0.2]);
    mesh(head, 'eye', sphere, shirt, [side * 0.3, 8.46, 0.733], [0.17, 0.11, 0.06]);
    mesh(head, 'pupil', sphere, dark, [side * 0.3, 8.46, 0.785], [0.065, 0.072, 0.035]);
    mesh(head, 'brow', box, dark, [side * 0.3, 8.65, 0.733], [0.35, 0.06, 0.07]);
  }
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.97, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), operator ? coat : dark);
  hair.position.set(0, 8.68, -0.07); hair.scale.set(1, 0.7, 0.94); head.add(hair);
  if (operator) mesh(head, 'cap-brim', box, coat, [0, 8.74, 0.86], [1.35, 0.13, 0.85]);
  else mesh(head, 'hair-back', sphere, dark, [0, 8.26, -0.53], [0.77, 0.83, 0.37]);
  const arms = {}, legs = {};
  for (const [side, sign] of [['L', -1], ['R', 1]]) {
    const limb = (name, geo, mat, scale) => mesh(person, name + side, geo, mat, [0, 0, 0], scale);
    arms[side] = {
      sign, shoulder: limb('shoulder', sphere, coat, [0.5, 0.52, 0.53]),
      upper: limb('upper-arm', cylinder, coat, [0.34, 1, 0.34]), fore: limb('forearm', cylinder, coat, [0.29, 1, 0.29]),
      elbow: limb('elbow', sphere, coat, [0.34, 0.34, 0.34]), hand: limb('hand', sphere, skin, [0.3, 0.35, 0.29]),
      start: new THREE.Vector3(), end: new THREE.Vector3(), joint: new THREE.Vector3(),
    };
    legs[side] = {
      sign, thigh: limb('thigh', cylinder, pants, [0.49, 1, 0.49]), shin: limb('shin', cylinder, pants, [0.39, 1, 0.39]),
      knee: limb('knee', sphere, pants, [0.45, 0.45, 0.45]), boot: limb('boot', box, shoes, [0.92, 0.6, 1.4]),
      start: new THREE.Vector3(), end: new THREE.Vector3(), joint: new THREE.Vector3(),
    };
  }
  person.userData.newsRig = { body, head, arms, legs, operator };
  poseNewsPerson(person, {}); return person;
}

export function poseNewsPerson(person, { time = 0, speed = 0, duck = 0, microphone = null, camera = null } = {}) {
  const rig = person.userData.newsRig; if (!rig) return;
  const gait = clamp(speed / 18, 0, 1), crouch = clamp(duck, 0, 1), drop = crouch * 0.78;
  rig.body.position.y = -drop;
  person.updateMatrixWorld(true);
  for (const limb of Object.values(rig.legs)) {
    const swing = Math.sin(time * 8 + (limb.sign < 0 ? Math.PI : 0));
    limb.start.set(limb.sign * 0.65, 3.95 - drop, -0.2 * crouch);
    limb.end.set(limb.sign * (0.65 + crouch * 0.16), 0.5 + Math.max(0, swing) * gait * 0.62, swing * gait * 1.1);
    d.set(limb.sign * 0.7, 2, 3);
    bend(limb.start, limb.end, d, 1.9, 1.75, limb.joint);
    segment(limb.thigh, limb.start, limb.joint, 0.49); segment(limb.shin, limb.joint, limb.end, 0.39);
    limb.knee.position.copy(limb.joint);
    limb.boot.position.copy(limb.end); limb.boot.position.y -= 0.2; limb.boot.position.z += 0.23;
  }
  for (const limb of Object.values(rig.arms)) {
    limb.start.set(limb.sign * 1.46, 6.63 - drop, 0);
    if (rig.operator && camera) {
      limb.end.set(...(limb.sign > 0 ? [0.65, -0.2, 0.4] : [0, -0.63, 1.05]));
      camera.localToWorld(limb.end); person.worldToLocal(limb.end);
    } else if (!rig.operator && limb.sign > 0 && microphone) {
      limb.end.set(0, -0.24, 0); microphone.localToWorld(limb.end); person.worldToLocal(limb.end);
    } else limb.end.set(limb.sign * 1.5, 3.85 - drop * 0.2, Math.sin(time * 8) * limb.sign * gait * 0.7);
    d.set(limb.sign * 3, 4.8 - drop, 0.3);
    bend(limb.start, limb.end, d, 1.7, 1.65, limb.joint);
    limb.shoulder.position.copy(limb.start); limb.elbow.position.copy(limb.joint); limb.hand.position.copy(limb.end);
    segment(limb.upper, limb.start, limb.joint, 0.35); segment(limb.fore, limb.joint, limb.end, 0.29);
    limb.hand.quaternion.copy(limb.fore.quaternion);
  }
}
