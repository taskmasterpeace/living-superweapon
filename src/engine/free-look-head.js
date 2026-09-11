import * as THREE from 'three';

const clamp=THREE.MathUtils.clamp;
const turn=new THREE.Quaternion();
const angles=new THREE.Euler(0,0,0,'YXZ');

export function restoreFreeLookHead(f){
 const state=f._freeLookHead;
 if(!state?.applied||state.rig!==f.parts?.rig)return;
 f.parts.head.quaternion.copy(state.head);
 f.parts.cowl.quaternion.copy(state.cowl);
 state.applied=false;
}

export function animateFreeLookHead(f){
 const p=f.parts,look=f._game?.world?._freeLook;
 if(!p?.head||!p.cowl||!look||f._game?.player!==f)return;
 const unavailable=f.state==='ko'||f.staggerT>0||f.stunT>0||f.frozenT>0||f.sleepT>0||f.downedT>0;
 const opticBusy=f._combatAim?.source==='face'&&f._combatAim.weight>.02;
 if(unavailable||opticBusy||Math.abs(look.yaw)+Math.abs(look.pitch)<1e-5)return;
 let state=f._freeLookHead;
 if(!state||state.rig!==p.rig)state=f._freeLookHead={rig:p.rig,head:new THREE.Quaternion(),cowl:new THREE.Quaternion(),applied:false};
 state.head.copy(p.head.quaternion);state.cowl.copy(p.cowl.quaternion);state.applied=true;
 const yaw=clamp(look.yaw*.72,-1.08,1.08);
 const pitch=clamp(-look.pitch*.65,-.58,.58);
 turn.setFromEuler(angles.set(pitch,yaw,0));
 p.head.quaternion.multiply(turn);
 p.cowl.quaternion.copy(p.head.quaternion);
}
