import {COMBAT_BODY_STUDIES,THROW_BODY_STUDIES} from './character-combat-studies.js';
import {GRAB_BODY_STUDIES} from './character-grab-studies.js';
import {PICKUP_BODY_STUDIES} from './character-pickup-studies.js';
import * as T from 'three';
// Full-body authored key poses. These are review candidates, not mocap.
// Root translation remains simulation-owned. Angles are local additive radians.
const flail=(phase)=>({
 'DEF-spine003':[.2,0,Math.sin(phase)*.16], 'DEF-neck':[-.25,Math.sin(phase)*.16,0],
 'DEF-upper_armL':[-1.7+Math.sin(phase)*.65,0,-.55], 'DEF-upper_armR':[-1.7-Math.sin(phase)*.65,0,.55],
 'DEF-forearmL':[-.65-Math.cos(phase)*.45,0,0], 'DEF-forearmR':[-.65+Math.cos(phase)*.45,0,0],
 'DEF-thighL':[-.35+Math.sin(phase)*.45,0,-.12], 'DEF-thighR':[-.35-Math.sin(phase)*.45,0,.12],
 'DEF-shinL':[.65+Math.cos(phase)*.35,0,0], 'DEF-shinR':[.65-Math.cos(phase)*.35,0,0]
});
const curled={
 'DEF-hips':[-1.1,0,.12], 'DEF-spine003':[.4,0,0], 'DEF-neck':[.3,0,0],
 'DEF-upper_armL':[-1.5,0,-.4], 'DEF-upper_armR':[-1.1,0,.5],
 'DEF-forearmL':[-1.2,0,0], 'DEF-forearmR':[-.9,0,0],
 'DEF-thighL':[-1.3,0,-.12], 'DEF-thighR':[-.9,0,.15],
 'DEF-shinL':[1.5,0,0], 'DEF-shinR':[1.15,0,0]
};
export const FULL_BODY_STUDIES={
 ...COMBAT_BODY_STUDIES,...THROW_BODY_STUDIES,...GRAB_BODY_STUDIES,...PICKUP_BODY_STUDIES,
 'Flailing fall':{duration:1.4,loop:true,poses:[0,1,2,3,4].map(i=>({time:i/4,joints:flail(i*Math.PI/2)}))},
 'Curled backward fall':{duration:1.5,loop:false,poses:[{time:0,joints:{}},{time:.2,joints:curled},{time:.65,joints:{...curled,'DEF-upper_armL':[-1.7,0,-.6],'DEF-shinR':[1.5,0,0]}},{time:1,joints:curled}]},
 'Disoriented ground stun':{duration:2,loop:true,poses:[0,1,2,3,4].map(i=>({time:i/4,joints:{'DEF-spine003':[.12,Math.sin(i*Math.PI/2)*.12,Math.sin(i*Math.PI/2)*.15],'DEF-neck':[.35,Math.sin(i*Math.PI/2)*.2,0],'DEF-upper_armL':[-.3,0,-.25],'DEF-upper_armR':[-.5,0,.35],'DEF-forearmL':[-.5,0,0],'DEF-forearmR':[-.8,0,0]}}))}
};
export function fullBodyStudy(name,base){
 const d=FULL_BODY_STUDIES[name];if(!d)throw Error('Unknown full-body study '+name);
 const keys=d.poses.map(key=>{const pose=structuredClone(base);for(const [bone,angles]of Object.entries(key.joints)){
  if(!pose[bone])throw Error('Missing full-body study bone '+bone);
  pose[bone]=new T.Quaternion().fromArray(pose[bone]).multiply(new T.Quaternion().setFromEuler(new T.Euler(...angles))).normalize().toArray();
 }return {time:key.time*d.duration,pose};});
 return {...(d.visualReview?{visualReview:{...d.visualReview}}:{}),contactStyle:d.contactStyle||'carry',name,duration:d.duration,loop:d.loop,hand:d.hand||'right',base:'Idle_Loop',source:'Power World full-body authored study; visual review pending',status:'candidate',markers:d.markers||{contact:0,release:0,controlReturn:d.duration},keys};
}
