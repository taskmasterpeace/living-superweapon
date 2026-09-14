import {MathUtils,Vector3} from 'three';
import {carriedPropPosition} from './thrown-prop-contact.js';
const overhead=new Vector3();
export function beginPropPickup(f,c,source){
 const effort=c.ratio>=4?'easy':c.ratio>=1.6?'effort':'struggle';
 c.pickup={age:0,duration:{easy:.55,effort:.85,struggle:1.2}[effort],effort,start:source.clone()};
 c.mesh.position.copy(source);
}
export function updatePropPickup(f,c,dt){
 const p=c.pickup;if(!p)return false;
 if(!f.alive||f.grabbedBy||f.stunT>0||f.staggerT>0||f.sleepT>0||f.frozenT>0)return 'interrupted';
 if(f.hitstop>0)return true;
 p.age=Math.min(p.duration,p.age+Math.max(0,dt));
 const phase=MathUtils.clamp(p.age/p.duration,0,1),lift=MathUtils.smoothstep(phase,.3,1);
 carriedPropPosition(f,c,overhead);c.mesh.position.lerpVectors(p.start,overhead,lift);
 if(phase===1)c.pickup=null;
 return true;
}
