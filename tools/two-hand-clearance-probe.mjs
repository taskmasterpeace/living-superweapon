import * as THREE from 'three';
import {registerHooks} from 'node:module';
import assert from 'node:assert/strict';
import {trunkProbe} from './helpers/trunk-probe.mjs';

// Read-only A/B diagnostic: the legacy variant changes the loaded source in
// this process only. It does not edit or select a different checkout revision.
const legacy=process.argv.includes('--legacy-shoulder');
if(legacy)registerHooks({load(url,context,next){
 const result=next(url,context);
 if(url.endsWith('/src/engine/directional-pose.js')){
  const source=Buffer.from(result.source).toString();assert.ok(source.includes('if(enabled&&!guardFacing){'));
  return {...result,source:source.replace('if(enabled&&!guardFacing){','if(false&&enabled&&!guardFacing){')};
 }
 return result;
}});
const {Fighter}=await import('../src/engine/entity.js'),{ROSTER}=await import('../src/data/characters.js');
const rows=[];
for(const scale of [.65,1,1.5])for(const side of [-1,1]){
 const def=structuredClone(ROSTER.find(d=>d.id==='kano'));def.frame={...def.frame,scale};
 const f=new Fighter(def);Object.assign(f,{animT:0,_openSky:true,gait:'grounded',flying:false,hasAimWorld:true});
 f.facing=0;f.aim.set(0,0,1);f.aim3.set(0,0,1);f.aimWorld.set(0,7*scale,100);f.vel.set(14*scale*side,0,0);
 const slot=Object.values(f.slots).find(s=>s.def.type==='beam');slot.active={sustaining:true,power:1,emissionAge:1};f.castPose=1;
 const inside=trunkProbe(f.parts.torso),point=new THREE.Vector3(),result={scale,side,forearm:0,elbow:0,fist:0,hidden:0,first:null};
 try{
  for(let frame=0;frame<150;frame++){
   f.animT+=1/60;f._animate(1/60);f.obj.updateMatrixWorld(true);if(frame<60)continue;
   const inverse=f.parts.torso.matrixWorld.clone().invert();
   for(const arm of [f.parts.armL,f.parts.armR]){
    const surface=f.parts.rig.limbSurfaces.find(s=>s.upper===arm.children[0]),pos=surface.mesh.geometry.attributes.position;
    for(let row=0;row<surface.rows.length;row++){
     const record=surface.rows[row],kind=record.driver===arm.children[1]?'forearm':record.t!==undefined?'elbow':null;if(!kind)continue;
     for(let j=0;j<surface.segments;j++){
      point.fromBufferAttribute(pos,row*surface.segments+j).applyMatrix4(surface.mesh.matrixWorld);
      if(inside(point,inverse)){result[kind]++;result.first??={frame,side:arm===f.parts.armR?1:-1,kind,row,j,
       vertex:point.clone().applyMatrix4(inverse).toArray(),elbow:new THREE.Vector3(0,-arm.userData.upperLength,0).applyMatrix4(arm.matrixWorld).applyMatrix4(inverse).toArray(),bend:-arm.children[1].rotation.x};}
     }
    }
    for(const [mesh,kind]of [[arm.children[2],'fist'],[arm.children[1],'hidden']]){
     for(let i=0;i<mesh.geometry.attributes.position.count;i++){
      mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);
      if(inside(point,inverse))result[kind]++;
     }
    }
   }
  }
  rows.push(result);
 }finally{f.dispose();}
}
console.log(JSON.stringify({legacy,scope:'Mock sustained state for the existing directional regression; actual rendered limb vertices, not live beam integration',rows},null,2));
