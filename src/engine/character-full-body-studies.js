import {COMBAT_BODY_STUDIES,THROW_BODY_STUDIES} from './character-combat-studies.js';
import {GRAB_BODY_STUDIES} from './character-grab-studies.js';
import {PICKUP_BODY_STUDIES} from './character-pickup-studies.js';
import * as T from 'three';
// Full-body authored key poses. These are review candidates, not mocap.
// Root translation remains simulation-owned. Angles are local additive radians.
// Verified on the modular GLB: positive local arm X reaches toward +Z.
// Use bounded anterior shoulder arcs and flexed elbows, not reversed elbows.
const flail=(phase)=>({
 'DEF-spine003':[.2,0,Math.sin(phase)*.16], 'DEF-neck':[-.25,Math.sin(phase)*.16,0],
 'DEF-upper_armL':[.65+Math.sin(phase)*.35,0,-.55], 'DEF-upper_armR':[.65-Math.sin(phase)*.35,0,.55],
 'DEF-forearmL':[.65+Math.cos(phase)*.3,0,0], 'DEF-forearmR':[.65-Math.cos(phase)*.3,0,0],
 'DEF-thighL':[-.35+Math.sin(phase)*.45,0,-.12], 'DEF-thighR':[-.35-Math.sin(phase)*.45,0,.12],
 'DEF-shinL':[.65+Math.cos(phase)*.35,0,0], 'DEF-shinR':[.65-Math.cos(phase)*.35,0,0]
});
const curled={
 'DEF-hips':[-1.1,0,.12], 'DEF-spine003':[.4,0,0], 'DEF-neck':[.3,0,0],
 'DEF-upper_armL':[.7,0,-.4], 'DEF-upper_armR':[.55,0,.5],
 'DEF-forearmL':[1.2,0,0], 'DEF-forearmR':[.9,0,0],
 'DEF-thighL':[-1.3,0,-.12], 'DEF-thighR':[-.9,0,.15],
 'DEF-shinL':[1.5,0,0], 'DEF-shinR':[1.15,0,0]
};
export const FULL_BODY_STUDIES={
 ...COMBAT_BODY_STUDIES,...THROW_BODY_STUDIES,...GRAB_BODY_STUDIES,...PICKUP_BODY_STUDIES,
 'Grappling hook deploy and hang':{duration:2,loop:false,hand:'right',markers:{contact:.3,release:1.55,controlReturn:2},poses:[
  {time:0,joints:{}},
  // Brief loaded elbow, followed by deployment and an overhead catch.
  {time:.07,joints:{'DEF-spine003':[.06,-.1,0],'DEF-upper_armR':[.4,0,.15],'DEF-forearmR':[.95,0,0],'DEF-upper_armL':[.15,0,-.2]}},
  {time:.15,joints:{'DEF-spine003':[0,.12,0],'DEF-upper_armR':[1.5,0,.15],'DEF-forearmR':[.25,0,0],'DEF-neck':[-.15,0,0]}},
  {time:.3,joints:{'DEF-spine003':[-.1,0,0],'DEF-upper_armR':[2.6,0,.12],'DEF-forearmR':[.2,0,0],'DEF-upper_armL':[.35,0,-.35],'DEF-forearmL':[.35,0,0],'DEF-thighL':[-.3,0,-.08],'DEF-shinL':[.65,0,0],'DEF-thighR':[.1,0,.08],'DEF-shinR':[.15,0,0]}},
  // Pull takes the load, then free limbs counter-swing while the right hand stays raised.
  {time:.43,joints:{'DEF-spine003':[-.04,-.08,-.06],'DEF-upper_armR':[2.3,0,.1],'DEF-forearmR':[.55,0,0],'DEF-upper_armL':[.85,0,-.45],'DEF-forearmL':[.7,0,0],'DEF-thighL':[-.1,0,-.1],'DEF-shinL':[.25,0,0],'DEF-thighR':[-.5,0,.1],'DEF-shinR':[.9,0,0],'DEF-neck':[-.12,.1,0]}},
  {time:.56,joints:{'DEF-spine003':[-.13,.06,.06],'DEF-upper_armR':[2.6,0,.12],'DEF-forearmR':[.2,0,0],'DEF-upper_armL':[.35,0,-.5],'DEF-forearmL':[.45,0,0],'DEF-thighL':[-.65,0,-.1],'DEF-shinL':[.9,0,0],'DEF-thighR':[.08,0,.1],'DEF-shinR':[.2,0,0]}},
  {time:.7,joints:{'DEF-spine003':[-.08,-.04,-.03],'DEF-upper_armR':[2.5,0,.1],'DEF-forearmR':[.3,0,0],'DEF-upper_armL':[.6,0,-.3],'DEF-forearmL':[.65,0,0],'DEF-thighR':[-.3,0,.08],'DEF-shinR':[.65,0,0],'DEF-thighL':[-.12,0,-.08],'DEF-shinL':[.35,0,0]}},
  {time:.78,joints:{'DEF-upper_armR':[2.2,0,.15],'DEF-forearmR':[.45,0,0],'DEF-upper_armL':[.45,0,-.25],'DEF-forearmL':[.4,0,0],'DEF-thighR':[-.3,0,0],'DEF-shinR':[.5,0,0]}},
  {time:1,joints:{}}
 ]},
 'Flailing fall':{duration:1.4,loop:true,poses:[0,1,2,3,4].map(i=>({time:i/4,joints:flail(i*Math.PI/2)}))},
 'Curled backward fall':{duration:1.5,loop:false,poses:[{time:0,joints:{}},{time:.2,joints:curled},{time:.65,joints:{...curled,'DEF-upper_armL':[.85,0,-.6],'DEF-shinR':[1.5,0,0]}},{time:1,joints:curled}]},
 'Disoriented ground stun':{duration:2,loop:true,poses:[0,1,2,3,4].map(i=>({time:i/4,joints:{'DEF-spine003':[.12,Math.sin(i*Math.PI/2)*.12,Math.sin(i*Math.PI/2)*.15],'DEF-neck':[.35,Math.sin(i*Math.PI/2)*.2,0],'DEF-upper_armL':[.3,0,-.25],'DEF-upper_armR':[.5,0,.35],'DEF-forearmL':[.5,0,0],'DEF-forearmR':[.8,0,0]}}))}
};
export function fullBodyStudy(name,base){
 const d=FULL_BODY_STUDIES[name];if(!d)throw Error('Unknown full-body study '+name);
 const keys=d.poses.map(key=>{const pose=structuredClone(base);for(const [bone,angles]of Object.entries(key.joints)){
  if(!pose[bone])throw Error('Missing full-body study bone '+bone);
  pose[bone]=new T.Quaternion().fromArray(pose[bone]).multiply(new T.Quaternion().setFromEuler(new T.Euler(...angles))).normalize().toArray();
 }return {time:key.time*d.duration,pose};});
 return {...(d.visualReview?{visualReview:{...d.visualReview}}:{}),contactStyle:d.contactStyle||'carry',name,duration:d.duration,loop:d.loop,hand:d.hand||'right',base:'Idle_Loop',source:'Power World full-body authored study; visual review pending',status:'candidate',markers:d.markers||{contact:0,release:0,controlReturn:d.duration},keys};
}
