import * as THREE from 'three';

// Preserve achromatic energy. Neutral HSL has hue zero; forcing saturation
// turned authored white into red. Keep the old saturated palette unchanged.
const energySaturation=s=>Math.min(1,s/.15)*Math.max(.8,s);

// One soft source envelope, not a stack of opaque spheres. Shared shader key
// lets loading prepare this exact material before the first in-game emission.
export function createBeamSourceMaterial(color){
 const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false});
 material.color.lerp(new THREE.Color('#ffffff'),.65).multiplyScalar(2.5);
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 sourceNormal,sourceView;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
sourceNormal=normalize(normalMatrix*normal);sourceView=-(modelViewMatrix*vec4(position,1.0)).xyz;`);
  shader.fragmentShader='varying vec3 sourceNormal,sourceView;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float density=max(0.0,dot(normalize(sourceNormal),normalize(sourceView)));
diffuseColor.a*=density*density;`);
 };
 material.customProgramCacheKey=()=> 'beam-source-v1';return material;
}

// Shared by the live hose and graphics preparation. Hold preparation materials
// for the stage lifetime so Three retains their compiled program references.
export function createBeamMaterials(color,color2,readable=false,hasDetail=false){
 const material=(tint,opacity,side=THREE.FrontSide)=>new THREE.MeshBasicMaterial({color:tint,opacity,side,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
 const core=material(color2,.8,THREE.DoubleSide),glow=material(color,.42,THREE.DoubleSide),tip=material(color2,.85),detail=hasDetail?material(color2,.9):null;
 let time=null;
 if(readable){
  for(const m of [core,glow,tip,detail])if(m){m.blending=THREE.NormalBlending;m.side=THREE.FrontSide;}
  core.color.lerp(glow.color,.8);time=shadeBeamSurface(core,color);
  const hue={};glow.color.getHSL(hue);glow.color.setHSL(hue.h,energySaturation(hue.s),Math.min(.12,hue.l));
  shadeBeamSheath(glow);tip.color.set(color);if(detail)detail.color.set(color);
 }
 return{core,glow,tip,detail,time};
}

// A translucent energy envelope is not an opaque pipe: a rear camera looks
// through its open mouth. Draw both faces with soft radial density, in one pass.
export function shadeBeamSheath(material) {
  material.side=THREE.DoubleSide;
  material.forceSinglePass=true;
  material.onBeforeCompile=shader=>{
    shader.vertexShader=`attribute float beamArc;
varying vec3 vSheathNormal,vSheathView;varying float vSheathArc;
${shader.vertexShader}`.replace('#include <begin_vertex>',`#include <begin_vertex>
vSheathNormal=normalize(normalMatrix*normal);
vSheathView=-(modelViewMatrix*vec4(position,1.0)).xyz;
vSheathArc=beamArc;`);
    shader.fragmentShader=`varying vec3 vSheathNormal,vSheathView;varying float vSheathArc;
${shader.fragmentShader}`.replace('#include <color_fragment>',`#include <color_fragment>
float facing=abs(dot(normalize(vSheathNormal),normalize(vSheathView)));
diffuseColor.a*=.48*facing*facing*smoothstep(0.0,4.0,vSheathArc);`);
  };
  material.customProgramCacheKey=()=> 'beam-sheath-v1';
}

// Same tube/draw call: optical density falls off toward the silhouette, while
// the center carries radiance. A dark, fully opaque circumference reads as pipe.
// The material keeps MeshBasic's clipping, depth, fog and compositor integration.
export function shadeBeamSurface(material,color) {
  const hue={};new THREE.Color(color).getHSL(hue);
  const body=new THREE.Color().setHSL(hue.h,energySaturation(hue.s),.4);
  const edge=body.clone().multiplyScalar(.55);
  const heat=new THREE.Color(color).lerp(new THREE.Color('#ffffff'),.88).multiplyScalar(2.5);
  const time={value:0};
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{beamBody:{value:body},beamEdge:{value:edge},beamHeat:{value:heat},beamTime:time});
    shader.vertexShader=`attribute float beamArc;attribute vec3 beamTangent;
varying vec3 vBeamNormal,vBeamAxis,vBeamFieldNormal;varying vec3 vBeamView;varying float vBeamArc;
${shader.vertexShader}`.replace('#include <begin_vertex>',`#include <begin_vertex>
vBeamNormal=normalize(normalMatrix*normal);
// World-oriented field: orbiting the camera must not rotate the energy lanes.
vBeamFieldNormal=inverseTransformDirection(vBeamNormal,viewMatrix);
vBeamAxis=normalize(normalMatrix*beamTangent);
vBeamView=-(modelViewMatrix*vec4(position,1.0)).xyz;
vBeamArc=beamArc;`);
    shader.fragmentShader=`uniform vec3 beamBody,beamEdge,beamHeat;uniform float beamTime;
varying vec3 vBeamNormal,vBeamAxis,vBeamFieldNormal;varying vec3 vBeamView;varying float vBeamArc;
${shader.fragmentShader}`.replace('#include <color_fragment>',`#include <color_fragment>
vec3 view=vBeamView/max(.001,length(vBeamView)),axis=vBeamAxis/max(.001,length(vBeamAxis));
vec3 normal=vBeamNormal/max(.001,length(vBeamNormal));
// Project the eye into this ring's plane. Raw N.V fades the whole beam when
// looking along it; this measures the cross-section silhouette at any angle.
vec3 across=view-axis*dot(view,axis);
float facing=clamp(abs(dot(normal,across))/max(.001,length(across)),0.0,1.0);
float pulse=pow(.5+.5*sin(vBeamArc*.28-beamTime*26.0),6.0);
// Uneven advancing strands break the uniform rings without another shell or
// a ring-angle seam. Arc is traveled distance, so bends retain their flow.
vec3 field=vBeamFieldNormal/max(.001,length(vBeamFieldNormal));
float filament=pow(.5+.5*sin(dot(field,vec3(4.7,6.1,3.3))+vBeamArc*.24-beamTime*29.0),12.0);
// Keep a narrow hot core visible from the chase camera as well as the side.
// Cross-section facing, unlike raw N.V, does not extinguish axial radiance.
// Normal blending and the camera opacity gate bound receiver occlusion.
float center=pow(facing,8.0);
float sideView=smoothstep(.2,.75,length(across));
float hot=center*(.72+.28*pulse)+(1.0-center)*max(pulse*.12,filament)*mix(.12,.4,sideView);
diffuseColor.a*=smoothstep(.05,.75,facing);
vec3 streamBody=beamBody*mix(.85,1.0,sideView);
diffuseColor.rgb=mix(beamEdge,streamBody,smoothstep(.08,.55,facing));
diffuseColor.rgb=mix(diffuseColor.rgb,beamHeat,hot);
// Density belongs to the continuous stream, not the moving surface strands.
// Strand-driven alpha made the rear core vanish between two bright ribbons.
// Preserve a soft silhouette and continuously luminous spine; only the color
// pattern travels. The existing camera fade still bounds occlusion.
diffuseColor.a=min(1.0,diffuseColor.a*(1.0+1.2*(1.0-sideView)*smoothstep(.35,.85,facing)));
`);
  };
  material.customProgramCacheKey=()=> 'beam-surface-v6';
  return time;
}
