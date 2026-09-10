import * as THREE from 'three';
import {reachArm} from './hero-rig.js';
import {sweepSplitObstacle} from './projectile-contact.js';

const shoulder=new THREE.Vector3(),handPoint=new THREE.Vector3(),scale=new THREE.Vector3(),contact={};

// Final unarmed arm clearance, after pose easing and before the wrist aims.
// Move the actual FK hand, never an invisible replacement projectile origin.
export function constrainArmCover(f,arm,side,pole){
 const world=f._game?.world,hand=arm.children[2];
 if(!world||!world.cover?.length&&!world.interiors?.length||hand.userData.gripOccupied)return false;
 arm.getWorldPosition(shoulder);hand.getWorldPosition(handPoint);hand.getWorldScale(scale);
 const sphere=hand.geometry.boundingSphere;
 if(!sphere)return false;
 // The geometry bounds include both the fist and open-palm morph. Center offset
 // belongs in the radius because the socket is not the center of those bounds.
 const radius=(sphere.radius+sphere.center.length())*Math.max(Math.abs(scale.x),Math.abs(scale.y),Math.abs(scale.z))+.04;
 if(!sweepSplitObstacle(world,shoulder,handPoint,radius,contact,false,radius)||contact.t<=0)return false;
 handPoint.lerpVectors(shoulder,handPoint,Math.max(0,contact.t-.005));
 arm.parent.worldToLocal(handPoint);
 reachArm(arm,handPoint,side,1,pole);
 return true;
}
