import * as THREE from 'three';

// Preserve achromatic energy. Neutral HSL has hue zero; forcing saturation
// turned authored white into red. Keep the old saturated palette unchanged.
const energySaturation=s=>Math.min(1,s/.15)*Math.max(.8,s);

// One soft source envelope, not a stack of opaque spheres. Shared shader key
// lets loading prepare this exact material before the first in-game emission.
export function createBeamSourceMaterial(color,family='energy'){
 const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false});
 material.color.lerp(new THREE.Color('#ffffff'),family==='fire'?.12:.65).multiplyScalar(family==='fire'?1.25:1.6);
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
export function beamVisualFamily(options={}){
 // Heat vision is an authored OPTICAL RAY — its own treatment, not a tube's (iter 6:
 // SOL's hairline was the makeover's founding complaint and generic was never going to fix it).
 if(options.faceOrigin)return 'ray';
 const fam=options.fxFam;   // the powerfx family, threaded from spawnBeamFor (Refs #42 iter 5)
 if(fam==='fire'||options.material==='fire'||options.dtype==='fire')return 'fire';
 if(fam==='ice'||options.dtype==='cold')return 'ice';
 if(fam==='water'||fam==='toxic')return 'fluid';
 if(fam==='electric')return 'shock';
 if(fam==='magicViolet'||fam==='magicGreen')return 'magic';
 if(fam==='alien')return 'alien';
 if(fam==='energyRed'||fam==='energyBlue'||fam==='energySun')return 'ki';
 return 'energy';
}

export function createBeamMaterials(color,color2,readable=false,hasDetail=false,family='energy'){
 const material=(tint,opacity,side=THREE.FrontSide)=>new THREE.MeshBasicMaterial({color:tint,opacity,side,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
 const core=material(color2,.8,THREE.DoubleSide),glow=material(color,.42,THREE.DoubleSide),tip=material(color2,.85),detail=hasDetail?material(color2,.9):null;
 let time=null;
 if(readable){
  for(const m of [core,glow,tip,detail])if(m){m.blending=THREE.NormalBlending;m.side=THREE.FrontSide;}
  core.color.lerp(glow.color,.8);time=shadeBeamSurface(core,color);
  const hue={};glow.color.getHSL(hue);glow.color.setHSL(hue.h,energySaturation(hue.s),Math.min(.12,hue.l));
  shadeBeamSheath(glow);tip.color.set(color);if(detail)detail.color.set(color);
 }
 // ELEMENT CORES run in BOTH paths (Refs #42 iter 4) — the city's additive beams and PowerWorld's
 // readable ones share one element identity; the family branch lands LAST so it owns the program.
 if(family==='fire'){
  // Robert's lava spec, verbatim: an octagon tube "that's black and orange underneath, like lava —
  // and then fire above that." The CORE is the crust (dark rock, scrolling molten cracks); the
  // SHEATH carries the tongues. The 8-radial tube already gives the octagonal silhouette.
  time={value:0};
  shadeLavaCore(core,time);
  core.blending=THREE.NormalBlending;core.side=THREE.DoubleSide;core.opacity=1;
  shadeFireSurface(glow,time,false);
  tip.color.set('#ffbf45');if(detail)detail.color.set('#ffc34a').multiplyScalar(1.2);
 } else if(family==='ice'){
  time={value:0};
  shadeIceCore(core,time);
  core.blending=THREE.NormalBlending;core.side=THREE.DoubleSide;core.opacity=1;
  tip.color.set('#eaffff');if(detail)detail.color.set('#d8f2ff');
 } else if(family==='shock'){
  time={value:0};shadeShockCore(core,time);core.side=THREE.DoubleSide;
 } else if(family==='ki'){
  // the WASH fix (iter 6): the core body carries the SATURATED family hue (the sheath color),
  // and the traveling pulses push that same hue to white through brightness — never pale base.
  time={value:0};core.color.set(color);shadeKiCore(core,time);core.side=THREE.DoubleSide;
 } else if(family==='magic'){
  time={value:0};shadeSigilCore(core,time);core.side=THREE.DoubleSide;
 } else if(family==='ray'){
  time={value:0};shadeRayCore(core,time);core.side=THREE.DoubleSide;
  glow.opacity*= .45;   // a ray is nearly all core — the halo stays a whisper
 } else if(family==='fluid'){
  time={value:0};shadeFluidCore(core,time);core.side=THREE.DoubleSide;
 } else if(family==='alien'){
  time={value:0};shadeAlienCore(core,time);core.side=THREE.DoubleSide;
 }
 return{core,glow,tip,detail,time};
}

// THE UNEARTHLY BEAM (alien): the ki stream, but the hue SHIFTS along the shaft (orange↔green) and
// segmented pod-bands crawl it — energy that does not obey the palette, reading as not-of-this-world.
function shadeAlienCore(material,time){
 material.forceSinglePass=true;
 material.onBeforeCompile=shader=>{
  shader.uniforms.alienTime=time;
  shader.vertexShader='attribute float beamArc;varying float alienArc;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
alienArc=beamArc;`);
  shader.fragmentShader='uniform float alienTime;varying float alienArc;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float shift=.5+.5*sin(alienArc*.4-alienTime*6.0);
vec3 other=vec3(.28,1.0,.55);                       // the green the family trail carries
diffuseColor.rgb=mix(diffuseColor.rgb,other*.7+diffuseColor.rgb*.3,shift*.7);
float pod=pow(.5+.5*sin(alienArc*.7-alienTime*11.0),4.0);   // segmented pods crawling
diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*2.0+vec3(.3),pod*.6);
diffuseColor.a*=(.4+.7*max(pod,.4))*smoothstep(0.0,1.2,alienArc);`);
 };
 material.customProgramCacheKey=()=> 'beam-alien-v1';
}

// THE TORRENT (water/toxic): a pressurised jet, not a beam — turbulent surging bands that flow
// down the arc, brightest along the spine, with a churning translucent skin. Color-agnostic.
function shadeFluidCore(material,time){
 material.forceSinglePass=true;material.side=THREE.DoubleSide;
 material.onBeforeCompile=shader=>{
  shader.uniforms.fluidTime=time;
  shader.vertexShader='attribute float beamArc;varying float fluidArc;varying vec3 fluidField,fluidNormal,fluidEye;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
fluidArc=beamArc;fluidField=normal;fluidNormal=normalize(normalMatrix*normal);fluidEye=-(modelViewMatrix*vec4(position,1.0)).xyz;`);
  shader.fragmentShader='uniform float fluidTime;varying float fluidArc;varying vec3 fluidField,fluidNormal,fluidEye;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec3 fld=normalize(fluidField);
float flow=fluidArc*.4-fluidTime*16.0;
float surge=.5+.5*sin(flow+sin(flow*.5+dot(fld,vec3(3.1,5.7,2.3))));
float turb=.5+.5*sin(flow*1.7-dot(fld,vec3(6.2,2.1,4.4)));
float facing=abs(dot(normalize(fluidNormal),normalize(fluidEye)));
float band=smoothstep(.35,.85,surge*.65+turb*.35);
diffuseColor.rgb=mix(diffuseColor.rgb*.7,diffuseColor.rgb*1.5+vec3(.3),band);
diffuseColor.a*=(.4+.6*band)*(.4+.6*facing)*smoothstep(0.0,1.2,fluidArc);`);
 };
 material.customProgramCacheKey=()=> 'beam-fluid-v1';
}

// THE RAY (faceOrigin — heat vision, optic blasts): not a hose. A white-hot filament with the
// authored color at its edge, constant optical intensity, a faint high-frequency shimmer.
function shadeRayCore(material,time){
 material.forceSinglePass=true;
 material.onBeforeCompile=shader=>{
  shader.uniforms.rayTime=time;
  shader.vertexShader='attribute float beamArc;varying float rayArc;varying vec3 rayNormal,rayEye;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
rayArc=beamArc;rayNormal=normalize(normalMatrix*normal);rayEye=-(modelViewMatrix*vec4(position,1.0)).xyz;`);
  shader.fragmentShader='uniform float rayTime;varying float rayArc;varying vec3 rayNormal,rayEye;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float facing=abs(dot(normalize(rayNormal),normalize(rayEye)));
float core=pow(facing,2.2);                 // wider hot core (was pow 3 — read thin AND dim)
float shimmer=.9+.1*sin(rayArc*3.1+rayTime*47.0);
float edge=smoothstep(.0,.5,1.0-facing);    // the authored color survives as a heat-shimmer rim
diffuseColor.rgb=mix(diffuseColor.rgb*(1.0+edge*.6),vec3(2.4,2.25,2.0),core)*shimmer;
diffuseColor.a*=(.45+1.0*core)*smoothstep(0.0,.6,rayArc);`);
 };
 material.customProgramCacheKey=()=> 'beam-ray-v1';
}

// THE COMB (electric) — hairline bolt lanes crawling the tube, jumping on a ~22Hz hash clock:
// stepped displacement reads as ARCING; smooth drift reads as hair (the mined comb law).
// Color-agnostic: modulates whatever the material's authored color is — the shader owns structure.
function shadeShockCore(material,time){
 material.forceSinglePass=true;
 material.onBeforeCompile=shader=>{
  shader.uniforms.shockTime=time;
  shader.vertexShader='attribute float beamArc;varying float shockArc;varying vec3 shockField;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
shockArc=beamArc;shockField=normal;`);
  shader.fragmentShader='uniform float shockTime;varying float shockArc;varying vec3 shockField;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec3 fld=normalize(shockField);
float ang=atan(fld.y,fld.x)/6.28318+.5;
float tick=floor(shockTime*22.0);
float lanes=0.0;
for(int i=0;i<3;i++){
 float fi=float(i);
 float off=fract(sin(tick*12.9898+fi*78.233)*43758.5453)*2.0-1.0;
 float cell=fract(ang*3.0+fi*.333+off*.22+shockArc*.055);
 lanes=max(lanes,pow(1.0-smoothstep(0.0,.15,abs(cell-.5)*2.0),2.0));
}
float flick=.7+.3*fract(sin(tick*3.7)*13.51);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.0),lanes*.85);
diffuseColor.a*=(.16+lanes*1.25)*flick*smoothstep(0.0,1.2,shockArc);`);
 };
 material.customProgramCacheKey=()=> 'beam-shock-v1';
}

// THE STREAM (ki) — traveling energy packets racing muzzle→tip: the single cheapest
// "stream, not laser" read, riding the traveled arc so bends carry their pulses.
function shadeKiCore(material,time){
 material.forceSinglePass=true;
 material.onBeforeCompile=shader=>{
  shader.uniforms.kiTime=time;
  shader.vertexShader='attribute float beamArc;varying float kiArc;varying vec3 kiField;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
kiArc=beamArc;kiField=normal;`);
  shader.fragmentShader='uniform float kiTime;varying float kiArc;varying vec3 kiField;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float pulse=pow(.5+.5*sin(kiArc*.35-kiTime*34.0),7.0);
float pulse2=pow(.5+.5*sin(kiArc*.13-kiTime*21.0+2.1),9.0);
// ENERGY HELIX (iter 24): ki COURSES — two counter-wound bright ribbons spiral down the shaft so
// the tube reads as a LIVING energy stream, not the smooth laser it was (the plainest beam surface
// on the grade). Angular coord from the normal, the SAME seam magic's woven bands use; but ki is
// FAST and smooth where magic is slow deliberate dashes, which keeps the two surfaces distinct.
vec3 kf=normalize(kiField);
float ang=atan(kf.y,kf.x)*0.159155+0.5;
float helix=pow(.5+.5*sin((ang+kiArc*.16)*6.28318-kiTime*10.0),3.0);
float helix2=pow(.5+.5*sin((ang-kiArc*.11)*6.28318+kiTime*7.0+1.7),4.0);
float weave=max(helix,helix2*.8);
float hot=max(max(pulse,pulse2*.7),weave*.7);
// saturated body; the pulses AND the coursing ribbons push the SAME hue toward white (never pale)
diffuseColor.rgb=mix(diffuseColor.rgb*.8,diffuseColor.rgb*2.4+vec3(.25),hot);
diffuseColor.a*=(.55+.6*max(hot,weave*.45))*smoothstep(0.0,1.2,kiArc);`);
 };
 material.customProgramCacheKey=()=> 'beam-ki-v2';
}

// THE INSCRIPTION (magic) — rune dashes drifting slowly down the shaft with a deeper band
// pulse underneath: deliberate, written, wrong-physics. Violet and green share the program;
// the hue is the material's own (the purple fence stays in powerfx's validator).
function shadeSigilCore(material,time){
 material.forceSinglePass=true;
 material.onBeforeCompile=shader=>{
  shader.uniforms.magicTime=time;
  shader.vertexShader='attribute float beamArc;varying float magicArc;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
magicArc=beamArc;`);
  shader.vertexShader=shader.vertexShader.replace('varying float magicArc;','varying float magicArc;varying vec3 magicField;').replace('magicArc=beamArc;','magicArc=beamArc;magicField=normal;');
  shader.fragmentShader='uniform float magicTime;varying float magicArc;varying vec3 magicField;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec3 fld=normalize(magicField);
float ring=atan(fld.y,fld.x)/6.28318+.5;
// counter-rotating runic bands (depth, iter 13): two drift the OTHER way, so the shaft reads as
// a woven inscription with parallax, not one flat dashed line.
float dashA=smoothstep(.13,0.0,abs(fract(magicArc*.55+ring*2.0+magicTime*.6)-.5)-.17);
float dashB=smoothstep(.09,0.0,abs(fract(magicArc*.31-ring*3.0-magicTime*.4)-.5)-.12);
float spine=pow(.5+.5*sin(magicArc*.9-magicTime*9.0),5.0);         // bright inner pulse travelling
float glyph=max(dashA,dashB*.7);
diffuseColor.rgb=mix(diffuseColor.rgb*.75,diffuseColor.rgb*1.8+vec3(.35),glyph*.8+spine*.5);
diffuseColor.a*=(.3+.85*max(glyph,spine*.7))*smoothstep(0.0,1.2,magicArc);`);
 };
 material.customProgramCacheKey=()=> 'beam-sigil-v1';
}

// THE LAVA CRUST — dark rock quantized into the octagon's facets, molten cracks scrolling along
// the traveled arc (never world space: the pattern must RIDE the beam — anisotropy law, mined
// from AvatarCastingAbilitiesThreeJS (MIT), docs/beam-makeover/AVATAR_CASTING_TECHNIQUES.md).
function shadeLavaCore(material,time){
 material.forceSinglePass=true;
 material.onBeforeCompile=shader=>{
  shader.uniforms.lavaTime=time;
  shader.vertexShader='attribute float beamArc;varying float lavaArc;varying vec3 lavaField;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
lavaArc=beamArc;lavaField=normal;`);
  shader.fragmentShader='uniform float lavaTime;varying float lavaArc;varying vec3 lavaField;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec3 fld=normalize(lavaField);
float flow=lavaArc*0.22-lavaTime*5.5;
float n1=sin(dot(fld,vec3(3.7,5.1,2.3))+flow);
float n2=sin(dot(fld,vec3(7.3,2.9,6.1))*1.6+flow*2.13);
float crust=.5+.5*(n1*.62+n2*.38);
float crack=smoothstep(.5,.82,1.0-abs(crust*2.0-1.0));
float facet=.88+.12*fract(sin(dot(floor(fld*2.6),vec3(12.9898,78.233,37.719)))*43758.5453);
vec3 rock=vec3(.045,.028,.018)*facet;
vec3 lava=mix(vec3(.62,.06,.004),vec3(1.35,.34,.02),crack);
lava=mix(lava,vec3(1.6,1.12,.45),pow(crack,3.0)*.75);
diffuseColor.rgb=mix(rock,lava,crack);
diffuseColor.a=smoothstep(0.0,1.4,lavaArc);`);
 };
 material.customProgramCacheKey=()=> 'beam-lava-v1';
}

// THE CRYSTAL CORE — ice is RIGID: the plate structure never scrolls (arc-only), only the seams
// glint. Seams push over the bloom threshold so an ice beam glows COLD, not hot.
function shadeIceCore(material,time){
 material.forceSinglePass=true;
 material.onBeforeCompile=shader=>{
  shader.uniforms.iceTime=time;
  shader.vertexShader='attribute float beamArc;varying float iceArc;varying vec3 iceField;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
iceArc=beamArc;iceField=normal;`);
  shader.fragmentShader='uniform float iceTime;varying float iceArc;varying vec3 iceField;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec3 fld=normalize(iceField);
float band=iceArc*0.3;
float c1=sin(dot(fld,vec3(4.1,2.3,5.7))+band);
float c2=sin(dot(fld,vec3(2.9,6.7,3.1))*1.9+band*1.61);
float plate=.5+.5*(c1*.6+c2*.4);
float pid=fract(sin(dot(floor(fld*3.1)+floor(band),vec3(12.9898,78.233,37.719)))*43758.5453);
float seam=smoothstep(.72,.88,plate);
vec3 deepIce=vec3(.06,.16,.26),pale=vec3(.55,.82,.95);
diffuseColor.rgb=mix(deepIce,pale*(.8+.2*pid),plate*.85);
diffuseColor.rgb+=vec3(.85,1.0,1.15)*seam*1.4;
float sparkle=pow(max(0.0,sin(iceArc*17.0+pid*6.3+iceTime*8.0)),8.0);
diffuseColor.rgb+=vec3(1.0)*sparkle*.8;
diffuseColor.a=smoothstep(0.0,1.4,iceArc)*.96;`);
 };
 material.customProgramCacheKey=()=> 'beam-ice-v1';
}

// Flame has broken, advecting tongues and a soot envelope. This shades the
// existing traveled tube only: no new emission, hit radius or contact source.
function shadeFireSurface(material,time,smoke=false){
 material.side=THREE.DoubleSide;material.forceSinglePass=true;
 material.onBeforeCompile=shader=>{
  shader.uniforms.flameTime=time;
  shader.vertexShader='attribute float beamArc;varying float flameArc;varying vec3 flameNormal,flameEye,flameField;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
flameArc=beamArc;flameNormal=normalize(normalMatrix*normal);
flameField=normal;flameEye=-(modelViewMatrix*vec4(position,1.0)).xyz;`);
  shader.fragmentShader='uniform float flameTime;varying float flameArc;varying vec3 flameNormal,flameEye,flameField;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec3 field=normalize(flameField);
float flow=flameArc*.19-flameTime*11.0;
float curl=sin(dot(field,vec3(4.1,6.3,2.7))+flow*.41);
float tongues=.5+.5*sin(flow+dot(field,vec3(4.3,2.9,3.2))+curl*2.7);
float breakup=.5+.5*sin(flow*.61-dot(field,vec3(2.2,7.8,3.1)));
float facing=abs(dot(normalize(flameNormal),normalize(flameEye)));
float density=smoothstep(.14,.78,tongues*.72+breakup*.28);
${smoke?`diffuseColor.rgb=vec3(.09,.065,.045);
diffuseColor.a*=.3*(1.0-density)*smoothstep(3.0,15.0,flameArc)*smoothstep(.02,.7,facing);`:`
vec3 ember=vec3(.64,.025,.002),orange=vec3(1.2,.17,.008),yellow=vec3(1.5,.8,.12);
diffuseColor.rgb=mix(ember,orange,density);
diffuseColor.rgb=mix(diffuseColor.rgb,yellow,pow(density,4.0)*.8);
diffuseColor.a*=smoothstep(.12,.54,tongues)*(.28+.72*breakup);
diffuseColor.a*=smoothstep(.03,.55,facing)+.2;
`}
diffuseColor.a*=smoothstep(0.0,1.4,flameArc);`);
 };
 material.customProgramCacheKey=()=>smoke?'beam-fire-soot-v1':'beam-fire-tongues-v1';
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
  const heat=new THREE.Color(color).lerp(new THREE.Color('#ffffff'),.88).multiplyScalar(1.6);
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
