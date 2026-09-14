import * as T from 'three';
import {metersToUnits} from '../core/world-units.js';

// Original articulated reference study. Local geometry is in metres, +Z forward.
// Independent hock pivots: never retarget humanoid shin tracks onto this rig.
export function createThermavariActor(){
 const root=new T.Group(),actor=new T.Group();root.add(actor);actor.name='Thermavari';
 const materials={armor:new T.MeshStandardMaterial({color:'#242b2a',roughness:.7}),edge:new T.MeshStandardMaterial({color:'#444b43',roughness:.8}),joint:new T.MeshStandardMaterial({color:'#111916'}),glow:new T.MeshStandardMaterial({color:'#ff6520',emissive:'#ff3900',emissiveIntensity:1.4}),claw:new T.MeshStandardMaterial({color:'#777968',metalness:.3,roughness:.5})};
 const meshes=[];
 const pivot=(parent,name,x,y,z)=>{const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;};
 const box=(parent,name,size,pos,mat='armor',rotation=[0,0,0])=>{const m=new T.Mesh(new T.BoxGeometry(...size),materials[mat]);m.name=name;m.position.set(...pos);m.rotation.set(...rotation);parent.add(m);meshes.push(m);return m;};
 const link=(parent,name,a,b,width,depth,mat='armor')=>{const v=new T.Vector3(...b).sub(new T.Vector3(...a));const m=box(parent,name,[width,v.length(),depth],new T.Vector3(...a).addScaledVector(v,.5).toArray(),mat);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;};
 const hips=pivot(actor,'therma-pelvis',0,1.08,0);
 box(hips,'pelvis-armor',[.36,.22,.27],[0,0,0]);
 const torso=pivot(hips,'therma-spine',0,.15,0);
 box(torso,'chest-armor',[.52,.46,.3],[0,.22,0]);
 box(torso,'abdomen',[.29,.18,.23],[0,-.04,0],'joint');
 const core=new T.Mesh(new T.CylinderGeometry(.092,.092,.038,8),materials.glow);core.name='thermal-core';core.rotation.x=Math.PI/2;core.position.set(0,.24,.172);torso.add(core);meshes.push(core);
 for(const side of [-1,1]){
  box(torso,'chest-ridge-'+side,[.23,.11,.1],[side*.17,.38,.15],'edge',[0,0,side*-.3]);
  box(torso,'back-blade-'+side,[.12,.49,.06],[side*.3,.05,-.21],'armor',[.25,0,side*.3]);
 }
 for(let i=0;i<5;i++)box(torso,'spine-cell-'+i,[.065,.06,.035],[0,.05+i*.085,-.18],'glow');
 const head=pivot(torso,'therma-head',0,.54,0);
 const helmet=new T.Mesh(new T.CylinderGeometry(.13,.15,.29,6),materials.armor);
 helmet.name='helmet';helmet.position.y=.09;helmet.rotation.y=Math.PI/6;head.add(helmet);meshes.push(helmet);
 box(head,'jaw-mask',[.18,.13,.21],[0,-.075,.04],'edge',[.12,0,0]);
 box(head,'visor',[.23,.045,.025],[0,.12,.133],'glow');
 for(const side of [-1,1])box(head,'brow-'+side,[.125,.045,.045],[side*.06,.165,.13],'edge',[0,0,side*.2]);
 for(const side of [-1,1])box(head,'sensor-horn-'+side,[.045,.24,.055],[side*.095,.3,-.02],'edge',[0,0,-side*.1]);
 for(const side of [-1,1]){
  const tag=side<0?'L':'R',hip=pivot(hips,'therma-hip'+tag,side*.19,-.04,0);
  link(hip,'thigh'+tag,[0,0,0],[side*.045,-.38,.13],.19,.2);
  const knee=pivot(hip,'therma-knee'+tag,side*.045,-.38,.13);
  box(knee,'knee-cap'+tag,[.18,.15,.15],[0,0,.015],'edge');
  link(knee,'shin'+tag,[0,0,0],[0,-.29,-.24],.105,.12);
  const hock=pivot(knee,'therma-hock'+tag,0,-.29,-.24);
  box(hock,'hock-joint'+tag,[.11,.11,.11],[0,0,0],'joint');
  link(hock,'metatarsal'+tag,[0,0,0],[0,-.27,.2],.09,.1,'edge');
  const foot=pivot(hock,'therma-foot'+tag,0,-.27,.2);
  box(foot,'foot'+tag,[.19,.09,.25],[0,-.045,.045]);
  for(const toe of [-1,0,1]){
   const talon=new T.Mesh(new T.ConeGeometry(.027,.15,4),materials.claw);
   talon.name='toe'+tag+toe;talon.position.set(toe*.065,-.06,.19);talon.rotation.x=Math.PI/2;foot.add(talon);meshes.push(talon);
  }
  const shoulder=pivot(torso,'therma-shoulder'+tag,side*.35,.38,0);
  box(shoulder,'pauldron'+tag,[.25,.15,.27],[side*.035,0,0],'edge',[0,0,side*.2]);
  link(shoulder,'upper-arm'+tag,[0,-.04,0],[side*.045,-.33,0],.12,.13);
  const elbow=pivot(shoulder,'therma-elbow'+tag,side*.045,-.33,0);
  link(elbow,'forearm'+tag,[0,0,0],[0,-.32,.05],.13,.15);
  box(elbow,'wrist-cell'+tag,[.03,.16,.03],[side*.075,-.19,.04],'glow');
  const hand=pivot(elbow,'therma-hand'+tag,0,-.35,.05);
  box(hand,'palm'+tag,[.12,.13,.075],[0,-.045,0]);
  for(const finger of [-1,0,1])box(hand,'claw'+tag+finger,[.023,.13,.025],[finger*.04,-.15,.045],'claw',[-.3,0,0]);
  pivot(hand,'socket-weapon'+tag,0,-.08,.055);
 }
 actor.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(actor),sourceHeight=bounds.max.y-bounds.min.y;
 const scale=metersToUnits(2.286)/sourceHeight;actor.scale.setScalar(scale);actor.position.y=-bounds.min.y*scale;
 const rests=new Map();actor.traverse(o=>{if(o.name.startsWith('therma-'))rests.set(o,o.quaternion.clone());});
 const clips=new Map();
 for(const [name,duration,loop]of [['Idle',3,true],['Walk',1.3,true],['Stalk',1.8,true],['Attack',.8,false],['Idle_HitReact1',.5,false]]){
  const tracks=[];
  for(const [node,rest]of rests){const times=[],values=[];
   for(let i=0;i<=32;i++){
    const u=i/32,phase=u*Math.PI*2,side=node.name.endsWith('L')?-1:1;let x=0,y=0,z=0;
    if(name==='Idle'){if(node===head)y=Math.sin(phase)*.09;}
    if(name==='Walk'||name==='Stalk'){
     const s=Math.sin(phase+(side<0?Math.PI:0)),amp=name==='Stalk'?.16:.28;
     if(node.name.startsWith('therma-hip'))x=s*amp;
     if(node.name.startsWith('therma-knee'))x=Math.max(0,-s)*.3;
     if(node.name.startsWith('therma-hock'))x=-Math.max(0,-s)*.25;
     if(node.name.startsWith('therma-shoulder'))x=-s*amp*.6;
     if(name==='Stalk'&&node===torso)x=.18;
    }
    if(name==='Attack'){
     const hit=Math.sin(Math.PI*u)**2;
     if(node.name==='therma-shoulderR')x=-1.4*hit;
     if(node.name==='therma-elbowR')x=-.4*hit;
     if(node===torso)y=-.25*hit;
    }
    if(name==='Idle_HitReact1'){const hit=Math.sin(Math.PI*u);if(node===torso)x=-.2*hit;if(node===head)x=.25*hit;}
    times.push(u*duration);values.push(...rest.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(x,y,z))).toArray());
   }
   tracks.push(new T.QuaternionKeyframeTrack(node.name+'.quaternion',times,values));
  }
  const clip=new T.AnimationClip(name,duration,tracks);clip.userData={status:'candidate',loop,source:'Power World original Thermavari blockout',family:'thermavari'};
  if(name==='Walk')clip.userData.visualReview={rejected:true,note:'Support foot floats at quarter-cycle side view; requires digitigrade foot planting before gameplay assignment.'};
  clips.set(name,clip);
 }
 const mixer=new T.AnimationMixer(actor);let action;
 const api={root,actor,meshes,mixer,clips,sourceHeight,scale,
  play(name){const clip=clips.get(name);if(!clip)throw Error('Missing Thermavari clip: '+name);mixer.stopAllAction();action=mixer.clipAction(clip).reset();action.setLoop(clip.userData.loop?T.LoopRepeat:T.LoopOnce,clip.userData.loop?Infinity:1);action.clampWhenFinished=true;action.play();return clip;},
  update(dt){mixer.update(dt);root.updateMatrixWorld(true);},
  sample(name,phase){this.play(name);mixer.setTime(clips.get(name).duration*T.MathUtils.clamp(phase,0,1));root.updateMatrixWorld(true);},
  dispose(){mixer.stopAllAction();mixer.uncacheRoot(actor);root.removeFromParent();for(const m of meshes)m.geometry.dispose();for(const m of Object.values(materials))m.dispose();}
 };api.play('Idle');return api;
}
