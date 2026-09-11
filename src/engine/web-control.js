import * as THREE from 'three';
import {clamp} from '../core/util.js';

const DEFAULTS=Object.freeze({duration:1.2,moveMult:.45,immunity:1});

function config(payload={}){
 return {
  duration:Number.isFinite(payload.duration)?clamp(payload.duration,.1,8):DEFAULTS.duration,
  moveMult:Number.isFinite(payload.moveMult)?clamp(payload.moveMult,.1,1):DEFAULTS.moveMult,
  immunity:Number.isFinite(payload.immunity)?clamp(payload.immunity,0,8):DEFAULTS.immunity,
 };
}

function frontalGuard(target,source){
 if(!target.guarding||target.staggerT>0||!source?.pos)return false;
 const dx=source.pos.x-target.pos.x,dz=source.pos.z-target.pos.z,d=Math.hypot(dx,dz)||1;
 return target.def.guardType==='barrier'||dx/d*target.aim.x+dz/d*target.aim.z>-.15;
}

export function canApplyWebControl(target,source){
 return !!target?.alive&&target.state!=='ko'&&!!source?.alive&&!source._formDisposed&&!(source.staggerT>0)&&!(source.stunT>0)&&!(source.frozenT>0)&&!source.grabbedBy&&!target.phase&&target.invuln<=0&&!(target._webControlImmune>0)&&!target._webControl&&!frontalGuard(target,source);
}

function webWrap(target){
 const wrap=new THREE.Group(),material=new THREE.MeshBasicMaterial({color:'#eaffff',transparent:true,opacity:.82,depthWrite:false});
 for(const [y,r,tilt] of [[2.3,2.15,.13],[4.2,2.45,-.18],[6.1,2.15,.22]]){
  const band=new THREE.Mesh(new THREE.TorusGeometry(r,.105,5,18),material);band.position.y=y;band.rotation.set(Math.PI/2,tilt,tilt*.6);wrap.add(band);
 }
 const cross=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,6.2,5),material);cross.position.y=4.2;cross.rotation.z=.32;wrap.add(cross);
 wrap.userData.webControlWrap=true;target.obj.add(wrap);return wrap;
}

function disposeWrap(wrap){
 if(!wrap||wrap.userData.webControlDisposed)return;
 wrap.userData.webControlDisposed=true;wrap.removeFromParent();const materials=new Set();
 wrap.traverse(node=>{node.geometry?.dispose();if(node.material)for(const material of [].concat(node.material))materials.add(material);});
 for(const material of materials)material.dispose();
}

export function applyWebControl(target,source,payload){
 if(!canApplyWebControl(target,source))return false;
 const value=config(payload),strength=Math.max(1,target.strength??5),recovery=Math.max(.25,target.sheet?.ccRecover||1);
 const duration=value.duration/((1+Math.max(0,strength-5)*.08)*recovery);
 const state={target,source,t:duration,duration,moveMult:value.moveMult,immunity:value.immunity,wrap:webWrap(target)};
 target._webControl=state;(source._webControls||(source._webControls=new Set())).add(state);return true;
}

export function clearWebControl(target,{immunity=true}={}){
 const state=target?._webControl;if(!state)return false;
 target._webControl=null;state.source?._webControls?.delete(state);disposeWrap(state.wrap);
 if(immunity)target._webControlImmune=Math.max(target._webControlImmune||0,state.immunity);
 return true;
}

export function clearWebControlsFromSource(source){
 if(source)source._webControlEpoch=(source._webControlEpoch||0)+1;
 for(const state of [...(source?._webControls||[])])clearWebControl(state.target);
 source?._webControls?.clear();
}

export function updateWebControl(target,dt){
 if(target._webControlImmune>0)target._webControlImmune=Math.max(0,target._webControlImmune-dt);
 const state=target._webControl;if(!state)return;
 const source=state.source,interrupted=!source?.alive||source.state==='ko'||source._formDisposed||source.staggerT>0||source.stunT>0||source.frozenT>0||source.grabbedBy;
 if(!target.alive||target.state==='ko'||interrupted){clearWebControl(target);return;}
 state.t-=dt;
 if(state.wrap)state.wrap.scale.setScalar(.98+Math.sin((state.duration-state.t)*16)*.025);
 if(state.t<=0)clearWebControl(target);
}

export function webControlMoveMultiplier(target){
 return target?._webControl?.moveMult??1;
}
