import * as T from 'three';

// Only flight/ranged presentation uses this adapter. Authored combat retains
// its complete source skeleton, including wrists and fingers.
export function createModularFlightAdapter(actor,fighter){
 const bones=[];actor.traverse(o=>{if(o.isBone)bones.push(o);});
 const byName=n=>actor.getObjectByName(T.PropertyBinding.sanitizeNodeName(n));
 const bind=new Map(bones.map(b=>[b,{p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}]));
 actor.updateMatrixWorld(true);
 const worldBind=new Map(bones.map(b=>[b,b.matrixWorld.clone()]));
 const p=fighter.parts,entries=[];
 const add=(name,driver,position,axis=null)=>{
  const bone=byName(name);if(!bone)return;
  const restQ=new T.Quaternion();worldBind.get(bone).decompose(new T.Vector3(),restQ,new T.Vector3());
  // Bone +Y is the authored longitudinal axis. Native limb meshes use -Y.
  const align=axis?new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0).applyQuaternion(restQ),axis):new T.Quaternion();
  entries.push({bone,driver,position,cal:align.multiply(restQ)});
 };
 const wp=o=>o.getWorldPosition(new T.Vector3());
 add('DEF-hips',p.pelvis,()=>wp(p.pelvis));
 add('DEF-spine.001',p.torso,()=>wp(p.pelvis).lerp(wp(p.torso),.4));
 add('DEF-spine.002',p.torso,()=>wp(p.pelvis).lerp(wp(p.torso),.75));
 add('DEF-spine.003',p.torso,()=>wp(p.torso));
 add('DEF-neck',p.head,()=>p.head.localToWorld(new T.Vector3(0,-.55,0)));
 add('DEF-head',p.head,()=>p.head.localToWorld(new T.Vector3(0,-.32,0)));
 for(const [side,arm,leg] of [['L',p.armR,p.legR],['R',p.armL,p.legL]]){
  const fore=arm.children[1],hand=arm.children[2],down=new T.Vector3(0,-1,0);
  add('DEF-upper_arm.'+side,arm.children[0],()=>wp(arm),down);
  add('DEF-forearm.'+side,fore,()=>fore.localToWorld(new T.Vector3(0,arm.userData.foreLength/2,0)),down);
  add('DEF-hand.'+side,hand,()=>wp(hand),down);
  add('DEF-thigh.'+side,leg.userData.thigh,()=>wp(leg),down);
  add('DEF-shin.'+side,leg.userData.shin,()=>wp(leg.userData.knee),down);
  add('DEF-foot.'+side,leg.userData.boot,()=>wp(leg.userData.boot));
 }
 entries.sort((a,b)=>{const depth=o=>{let n=0;while(o.parent){n++;o=o.parent;}return n;};return depth(a.bone)-depth(b.bone);});
 const matrix=new T.Matrix4(),inverse=new T.Matrix4(),q=new T.Quaternion(),scale=new T.Vector3();
 return {
  reset(){for(const [b,v] of bind){b.position.copy(v.p);b.quaternion.copy(v.q);b.scale.copy(v.s);}},
  update({preserveArms=false}={}){
   fighter.obj.updateMatrixWorld(true);actor.updateMatrixWorld(true);actor.getWorldScale(scale);
   for(const e of entries){
    if(preserveArms&&/upper_arm|forearm|hand/.test(e.bone.name))continue;
    e.driver.getWorldQuaternion(q);q.multiply(e.cal);
    e.bone.parent.updateWorldMatrix(true,false);
    const parentQ=e.bone.parent.getWorldQuaternion(new T.Quaternion()).invert();
    e.bone.quaternion.copy(parentQ.multiply(q));
    // Preserve authored joint lengths. Copying native joint positions tears
    // modular pieces apart when the two bodies have different proportions.
    if(e.bone===byName('DEF-hips'))e.bone.position.copy(e.bone.parent.worldToLocal(e.position()));
    e.bone.updateMatrixWorld(true);
   }
   actor.updateMatrixWorld(true);
  }
 };
}
