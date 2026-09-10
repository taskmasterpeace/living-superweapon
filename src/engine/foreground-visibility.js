import * as THREE from 'three';
import {CAMERA_DEFAULTS} from '../data/flight-tuning.js';

// One stable shader variant per existing body material. A local view cuts only
// foreground fragments over the opponent's core, not the whole hero or walls.
const head=new THREE.Vector3(),hip=new THREE.Vector3(),viewHead=new THREE.Vector3(),viewHip=new THREE.Vector3();
export function installForegroundVisibility(parts) {
 if(parts.foreground)return parts.foreground;
 const uniforms={uCloseAmount:{value:0},uCloseShape:{value:new THREE.Vector4()},uCloseRadius:{value:0},uCloseDepth:{value:0},uCloseAspect:{value:1}};
 const materials=new Set();parts.body.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))if(m&&!m.transparent)materials.add(m);});
 const state=parts.foreground={uniforms,materials};
 for(const mat of materials){
  const compile=mat.onBeforeCompile,key=mat.customProgramCacheKey();
  mat.customProgramCacheKey=()=>`${key}|foreground-core-v1`;
  mat.onBeforeCompile=(shader,renderer)=>{
   compile.call(mat,shader,renderer);
   // The source suit delegates to its procedural suit's rim hook. Both share
   // this rig's uniforms; do not inject a second varying or discard block.
   if(shader.uniforms.uCloseAmount)return;
   Object.assign(shader.uniforms,uniforms);
   shader.vertexShader='varying vec4 vCloseClip; varying float vCloseDepth;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvCloseClip=gl_Position; vCloseDepth=-mvPosition.z;');
   shader.fragmentShader='uniform float uCloseAmount,uCloseRadius,uCloseDepth,uCloseAspect; uniform vec4 uCloseShape; varying vec4 vCloseClip; varying float vCloseDepth;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
    if(uCloseAmount>0.001 && vCloseDepth<uCloseDepth && vCloseClip.w>0.0){
     vec2 p=vCloseClip.xy/vCloseClip.w; p.x*=uCloseAspect;
     vec2 a=uCloseShape.xy,b=uCloseShape.zw,ab=b-a;
     float t=clamp(dot(p-a,ab)/max(dot(ab,ab),0.000001),0.0,1.0);
     float d=length(p-a-ab*t);
     float coverage=uCloseAmount*(1.0-smoothstep(uCloseRadius*0.72,uCloseRadius,d));
     float pattern=fract(52.9829189*fract(dot(floor(gl_FragCoord.xy),vec2(0.06711056,0.00583715))));
     if(pattern<coverage)discard;
    }
    #include <opaque_fragment>`);
  };
 }
 return state;
}
export function clearForegroundVisibility(world) {
 if(world._foregroundParts)world._foregroundParts.foreground.uniforms.uCloseAmount.value=0;
 world._foregroundParts=null;
}
export function updateForegroundVisibility(world, subject, target, dt) {
 const parts=subject?.parts,state=parts?.foreground,c=world.camera;
 if(world._foregroundParts!==parts)clearForegroundVisibility(world);
 if(!state)return;
 world._foregroundParts=parts;
 const u=state.uniforms,amount=subject.def?.model?.camera?.cutaway??CAMERA_DEFAULTS.cutaway;
 const gap=target?subject.pos.distanceTo(target.pos):Infinity;
 if(!subject._openSky||!subject.alive||!target?.alive||!target.obj.visible||(target._vis??1)<.4||gap>=24||amount<=0){u.uCloseAmount.value=0;return;}
 c.updateMatrixWorld(true);target.obj.updateMatrixWorld(true);
 target.parts.head.getWorldPosition(head);target.parts.pelvis.getWorldPosition(hip);
 viewHead.copy(head).applyMatrix4(c.matrixWorldInverse);viewHip.copy(hip).applyMatrix4(c.matrixWorldInverse);
 const depth=Math.min(-viewHead.z,-viewHip.z);
 if(depth<=c.near){u.uCloseAmount.value=0;return;}
 const scale=target.parts.rig.pivotHeight/4.6,radius=2.65*scale;
 head.project(c);hip.project(c);
 u.uCloseShape.value.set(head.x*c.aspect,head.y,hip.x*c.aspect,hip.y);
 u.uCloseAspect.value=c.aspect;
 u.uCloseRadius.value=radius/(depth*Math.tan(c.fov*Math.PI/360));
 u.uCloseDepth.value=depth-radius*.2;
 const proximity=1-THREE.MathUtils.smoothstep(gap,14,24),goal=THREE.MathUtils.clamp(amount,0,1)*proximity;
 u.uCloseAmount.value=THREE.MathUtils.lerp(u.uCloseAmount.value,goal,1-Math.exp(-18*Math.max(0,dt)));
}
