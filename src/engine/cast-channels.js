import {volleyPattern,palmCastSide} from './hand-emission.js';
import {firearmEmitter} from './weapon-emission.js';

// Semantic hand claims shared by input and presentation. Existing abilities keep
// their authored hand; a conflict never silently swaps a weapon or a firing style.
export function castHandMask(f,def){
 if(def.naniteForm==='cannon')return def.naniteAttachment==='left-forearm'?2:1;
 if(def.faceOrigin||def.chest)return 0;
 if(def.type==='volley'){
  const pattern=volleyPattern(def);return pattern==='left'?1:pattern==='right'?2:3;
 }
 if(def.type==='rifle')return firearmEmitter(f,def,{includeStowed:true}).side<0?1:2;
 if(def.type==='beam'||def.type==='charge')return usesCombinedHands(f,def)?3:palmCastSide(def)<0?1:2;
 return def.type==='projectile'?2:0;
}

function poseRank(f,s,key){
 const live=s.def.type==='beam'&&s.active?.sustaining&&!s.active.dead;
 const charging=(s.def.type==='beam'||s.def.type==='charge')&&s.charging;
 const recent=(s._poseUntil??-1)>=f.animT||(f._rangedPose?.slot===key&&f._rangedPose.until>=f.animT);
 return live?3:charging?2:recent?1:0;
}

export function conflictingHandSlot(f,slot){
 const wanted=castHandMask(f,slot.def);if(!wanted)return null;
 for(const [key,s]of Object.entries(f.slots))
  if(s!==slot&&poseRank(f,s,key)&&(wanted&castHandMask(f,s.def)))return s;
 return null;
}

// Disjoint emitters can articulate at the same time. Input rejects overlapping
// hand claims before payment, rather than making a paid invisible attack wait.
export function rangedPoseChannels(f){
 const out=f._rangedChannels ||= {head:null,torso:null,hands:null,dominant:null,arms:[null,null]};
 out.arms ||= [null,null];out.arms[0]=out.arms[1]=null;
 out.head=out.torso=out.hands=out.dominant=null;
 const ranks={head:0,torso:0,hands:0},armRanks=[0,0];
 for(const [key,s]of Object.entries(f.slots)){
  const rank=poseRank(f,s,key);if(!rank)continue;
  const channel=s.def.faceOrigin?'head':s.def.chest?'torso':'hands';
  if(rank>ranks[channel]){out[channel]=s;ranks[channel]=rank;}
  const mask=castHandMask(f,s.def);
  for(let i=0;i<2;i++)if((mask&(1<<i))&&rank>armRanks[i]){out.arms[i]=s;armRanks[i]=rank;}
 }
 // Hands own arms even while eyes are sustaining; optic focus uses a temple
 // hand only when no hand-origin power needs it. The head has its own target.
 out.dominant=out.hands||out.torso||out.head;
 return out;
}

export function usesCombinedHands(f,def){
 if(def.naniteForm==='cannon')return false;
 return !def.faceOrigin&&!def.chest&&(def.castStyle==='two-hand'||
  ((!def.castStyle||def.castStyle==='auto')&&!['left','right'].includes(def.castHand)&&def.charge&&f.parts?.rig?.flightStyle==='martial'));
}

export function castingMoveScale(f){
 let scale=1;
 for(const s of Object.values(f.slots))if(s.def.type==='beam'&&(s.charging||s.active?.sustaining)||s.def.type==='charge'&&s.charging){
  const value=s.def.castMoveScale;
  if(Number.isFinite(value))scale=Math.min(scale,Math.max(0,value));
 }
 return scale;
}
