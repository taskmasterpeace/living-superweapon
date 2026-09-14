import * as T from 'three';
export const DEC52_MOTIONS={idle:{duration:3,loop:true},walk:{duration:1.2,loop:true},run:{duration:.65,loop:true},bite:{duration:.65,loop:false},jump:{duration:1.1,loop:false},sniff:{duration:2,loop:true},flight:{duration:2,loop:true}};
const smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
/** Named-pivot library shared by the workshop and future runtime actors.
 * In-place locomotion. Jump is articulation only; physics owns displacement.
 * No scene traversal, materials or geometry allocations during playback.
 */
export function buildDec52Clips(actor,family){
 if(!['rat','hound','mech','cloud'].includes(family))throw Error('Unknown Dec-52 family');
 const nodes=[];actor.traverse(o=>{if(!o.isMesh&&/^nanite-(head|jaw|tail|hip|knee|shoulder|elbow)/.test(o.name))nodes.push(o);});
 const clips=[];
 for(const [id,meta]of Object.entries(DEC52_MOTIONS)){
  if(family==='cloud'||(family==='mech'&&['bite','sniff'].includes(id)))continue;
  const tracks=[];
  for(const node of nodes){const times=[],values=[];
   for(let i=0;i<=32;i++){
    const u=i/32,t=u*Math.PI*2,n=node.name,left=n.includes('--1'),front=n.endsWith('-true'),quad=family!=='mech';let x=0,y=0,z=0;
    if(id==='walk'||id==='run'){
     // Diagonal pairs, not the old same-phase front and rear legs.
     const phase=t+(left?Math.PI:0)+(quad&&front?Math.PI:0),s=Math.sin(phase),amp=id==='run'?.5:.28;
     if(n.includes('hip'))x=s*amp;
     if(n.includes('knee'))x=Math.max(0,-s)*(id==='run'?.8:.45);
     if(n.includes('shoulder'))x=-s*amp*.65;
     if(n==='nanite-head')x=Math.sin(t*2)*.035;
     if(n==='nanite-tail')y=Math.sin(t)*.18;
    }else if(id==='idle'){
     if(n==='nanite-head')y=Math.sin(t)*.08;
     if(n==='nanite-tail')y=Math.sin(t)*.12;
    }else if(id==='bite'){
     const anticipation=smooth(u/.3),snap=smooth((u-.3)/.15),recover=smooth((u-.55)/.45);
     if(n==='nanite-jaw')x=(anticipation-snap*.9)*(1-recover)*.7;
     if(n==='nanite-head')x=(-.15*anticipation+.38*snap)*(1-recover);
     if(n.includes('hip'))x=(front?-.18:.15)*Math.sin(Math.PI*u);
    }else if(id==='jump'){
     const load=smooth(u/.2)*(1-smooth((u-.2)/.16)),tuck=smooth((u-.36)/.2)*(1-smooth((u-.7)/.15)),land=smooth((u-.82)/.08)*(1-smooth((u-.9)/.1));
     if(n.includes('hip'))x=(front?-.35:.3)*(load+land)-.15*tuck;
     if(n.includes('knee'))x=.5*(load+land)+.8*tuck;
     if(n==='nanite-head')x=-.12*tuck;
     if(n.includes('shoulder'))x=-.8*tuck;
    }else if(id==='sniff'){
     if(n==='nanite-head'){x=.18+.06*Math.sin(t*3);y=.25*Math.sin(t);}
     if(n==='nanite-tail')y=Math.sin(t)*.2;
    }else if(id==='flight'){
     if(n.includes('hip'))x=.15;
     if(n.includes('knee'))x=.3;
     if(n.includes('shoulder'))z=left?-.2:.2;
     if(n==='nanite-head')y=Math.sin(t)*.06;
    }
    const q=node.quaternion.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(x,y,z)));times.push(u*meta.duration);values.push(...q.toArray());
   }
   tracks.push(new T.QuaternionKeyframeTrack(node.name+'.quaternion',times,values));
  }
  const clip=new T.AnimationClip('Dec-52 '+family+' / '+id,meta.duration,tracks);clip.userData={family,action:id,loop:meta.loop,status:'candidate',source:'Power World named-pivot authoring',inPlace:true,contact:id==='bite'?.3*meta.duration:null};clips.push(clip);
 }return clips;
}
export function createDec52Animator(actor,family){
 const clips=buildDec52Clips(actor,family),mixer=new T.AnimationMixer(actor);let active=null,mode='scrub',fading=[];
 const find=id=>clips.find(c=>c.userData.action===id);
 return {clips,pose(id,time){const clip=find(id);if(!clip)return false;
  if(active!==clip||mode!=='scrub'){mixer.stopAllAction();fading=[];const action=mixer.clipAction(clip);action.reset().setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();active=clip;mode='scrub';}
  mixer.setTime(T.MathUtils.clamp(time,0,clip.duration));actor.updateMatrixWorld(true);return true;
 },advance(id,dt,{restart=false,blend=.12}={}){
  if(!Number.isFinite(dt)||dt<0||!Number.isFinite(blend)||blend<0)throw Error('Invalid Dec-52 playback time');
  const clip=find(id);if(!clip)return null;
  if(active!==clip||mode!=='play'||restart){
   const old=active&&mode==='play'?mixer.clipAction(active):null;
   const time=mode==='scrub'&&active===clip&&!restart?mixer.clipAction(clip).time:0;
   if(mode!=='play'){mixer.stopAllAction();fading=[];}
   const action=mixer.clipAction(clip);action.reset().setLoop(clip.userData.loop?T.LoopRepeat:T.LoopOnce,clip.userData.loop?Infinity:1);action.clampWhenFinished=true;action.time=time;action.play();
   fading=fading.filter(f=>f.action!==action);
   if(old&&old!==action){if(blend){old.crossFadeTo(action,blend,false);fading.push({action:old,left:blend});}else old.stop();}
   active=clip;mode='play';
  }
  mixer.update(dt);for(const f of fading){f.left-=dt;if(f.left<=0)f.action.stop();}fading=fading.filter(f=>f.left>0);actor.updateMatrixWorld(true);
  const action=mixer.clipAction(clip);return {action:id,time:action.time,phase:action.time/clip.duration,finished:!clip.userData.loop&&action.time>=clip.duration};
 },dispose(){mixer.stopAllAction();fading=[];mixer.uncacheRoot(actor);}};
}
