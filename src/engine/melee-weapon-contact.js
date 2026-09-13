import * as THREE from 'three';
import {MELEE_WEAPON_SURFACES} from '../data/melee-weapon-surfaces.js';

export function snapshotWeaponSurface(weapon){
 const surface=weapon?.visible&&MELEE_WEAPON_SURFACES[weapon.userData.weaponKind];
 if(!surface||!weapon.parent)return null;
 weapon.updateWorldMatrix(true,false);
 const a=new THREE.Vector3(...surface.from),b=new THREE.Vector3(...surface.to);
 const count=Math.ceil(a.distanceTo(b)/(surface.radius*1.5));
 const points=[];for(let i=0;i<=count;i++)points.push(a.clone().lerp(b,i/count).applyMatrix4(weapon.matrixWorld));
 const scale=weapon.getWorldScale(new THREE.Vector3());
 return {weapon,points,radius:surface.radius*Math.max(Math.abs(scale.x),Math.abs(scale.y),Math.abs(scale.z))};
}

export function weaponContactSweeps(weapon,previous){
 const now=snapshotWeaponSurface(weapon);if(!now)return null;
 const old=previous?.weapon===weapon&&previous.points.length===now.points.length?previous:now;
 return {snapshot:now,sweeps:now.points.map((point,i)=>({from:old.points[i],to:point,radius:now.radius}))};
}
