import * as THREE from 'three';
import {OUTPOST_SURFACE_COMMON,OUTPOST_SURFACE_COLOR} from './frontline-outpost-surface.js';

// These materials shade the native meshes (including crater-deformed vertices).
// World projection gives a large mesa and a small rock the same texel scale.
const common=`
 varying vec3 vTerrainWorld;
 varying vec3 vTerrainNormal;
 float terrainHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float terrainNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(terrainHash(i),terrainHash(i+vec2(1,0)),f.x),mix(terrainHash(i+vec2(0,1)),terrainHash(i+vec2(1,1)),f.x),f.y);}
 float terrainFbm(vec2 p){return terrainNoise(p)*.57+terrainNoise(p*2.03+9.2)*.28+terrainNoise(p*4.11-7.1)*.15;}
 vec3 terrainAerialPerspective(vec3 lit){
  float distanceToEye=length(vTerrainWorld-cameraPosition);
  float density=exp(-max(vTerrainWorld.y,0.0)/1700.0);
  float haze=(1.0-exp(-max(distanceToEye-180.0,0.0)*.00020))*density;
  vec3 air=mix(vec3(.64,.46,.29),vec3(.47,.49,.52),smoothstep(2400.0,8500.0,distanceToEye));
  float lowDust=(1.0-exp(-distanceToEye*.0007))*exp(-max(vTerrainWorld.y,0.0)/210.0)*.20;
  return mix(mix(lit,air,clamp(haze,0.0,.70)),vec3(.68,.49,.30),lowDust);
 }
`;
function project(shader){
 shader.vertexShader='varying vec3 vTerrainWorld;\nvarying vec3 vTerrainNormal;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
 vTerrainWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
 #ifdef USE_INSTANCING
  vTerrainWorld = ( modelMatrix * instanceMatrix * vec4( transformed, 1.0 ) ).xyz;
 #endif
 vTerrainNormal = inverseTransformDirection( transformedNormal, viewMatrix );`);
 shader.fragmentShader=common+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`#include <opaque_fragment>
 gl_FragColor.rgb=terrainAerialPerspective(gl_FragColor.rgb);`);
}

export function applySandstoneSurface(material,maps){
 material.map=null;material.normalMap=null;material.roughnessMap=null;material.roughness=1;material.color.set('#ffffff');material.flatShading=false;
 material.onBeforeCompile=shader=>{
  project(shader);Object.assign(shader.uniforms,{uStoneAlbedo:{value:maps.albedo},uStoneNormal:{value:maps.normal},uStoneRough:{value:maps.rough}});
  shader.fragmentShader=`uniform sampler2D uStoneAlbedo;uniform sampler2D uStoneNormal;uniform sampler2D uStoneRough;\n`+GROUND_NORMAL_GLSL+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
   vec3 stoneP=vTerrainWorld / 18.0;
   vec3 stoneN=normalize(vTerrainNormal);
   vec3 stoneW=pow(abs(stoneN),vec3(4.0));stoneW/=max(dot(stoneW,vec3(1.0)),.0001);
   vec3 stoneSigns=mix(vec3(-1.0),vec3(1.0),step(vec3(0.0),stoneN));
   vec2 stoneUVX=vec2(-stoneSigns.x*stoneP.z,stoneP.y);
   vec2 stoneUVY=vec2(stoneP.x,-stoneSigns.y*stoneP.z);
   vec2 stoneUVZ=vec2(stoneSigns.z*stoneP.x,stoneP.y);
   vec3 stoneAlbedo=texture2D(uStoneAlbedo,stoneUVX).rgb*stoneW.x+texture2D(uStoneAlbedo,stoneUVY).rgb*stoneW.y+texture2D(uStoneAlbedo,stoneUVZ).rgb*stoneW.z;
   float stoneMineral=terrainFbm(vTerrainWorld.xz*.018+vTerrainWorld.y*.012);
   float stoneLayer=.5+.5*sin(vTerrainWorld.y*.31+terrainNoise(vTerrainWorld.xz*.028)*1.1);
   vec3 sedimentColor=mix(vec3(1.22,1.12,.94),vec3(1.55,1.32,1.02),stoneMineral);
   diffuseColor.rgb*=stoneAlbedo*sedimentColor*(.90+.10*stoneLayer);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=clamp(texture2D(uStoneRough,stoneUVX).r*stoneW.x+texture2D(uStoneRough,stoneUVY).r*stoneW.y+texture2D(uStoneRough,stoneUVZ).r*stoneW.z,.74,1.0);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 tx=texture2D(uStoneNormal,stoneUVX).xyz*2.0-1.0;
   vec3 ty=texture2D(uStoneNormal,stoneUVY).xyz*2.0-1.0;
   vec3 tz=texture2D(uStoneNormal,stoneUVZ).xyz*2.0-1.0;
   tx.xy*=.75;ty.xy*=.75;tz.xy*=.75;
   normal=normalize(mat3(viewMatrix)*groundSignedNormals(stoneN,tx,ty,tz,stoneW));
  `);
 };
 material.customProgramCacheKey=()=> 'frontline-sandstone-v3';
 // Native cover cutaway clones materials. THREE.Material.copy does not retain
 // shader callbacks, so carry the surface contract into that reversible clone.
 material.clone=function(){const copy=new THREE.MeshStandardMaterial().copy(this);applySandstoneSurface(copy,maps);return copy;};
 material.needsUpdate=true;return material;
}

// Each projected tangent frame is right-handed on both signs of its axis.
// Rotate its complete decoded normal into the actual surface frame; a neutral
// map therefore preserves the geometric normal on axes AND diagonal banks.
export const GROUND_NORMAL_GLSL=`
 vec3 groundReorient(vec3 sampled,vec3 axisN,vec3 tangent,vec3 bitangent,vec3 baseN){
  vec3 mapped=tangent*sampled.x+bitangent*sampled.y+axisN*sampled.z;
  vec3 turn=cross(axisN,baseN);
  return mapped+cross(turn,mapped)+cross(turn,cross(turn,mapped))/(1.0+dot(axisN,baseN));
 }
 vec3 groundSignedNormals(vec3 baseN,vec3 nx,vec3 ny,vec3 nz,vec3 weights){
  vec3 signs=mix(vec3(-1.0),vec3(1.0),step(vec3(0.0),baseN));
  vec3 x=groundReorient(normalize(nx),vec3(signs.x,0,0),vec3(0,0,-signs.x),vec3(0,1,0),baseN);
  vec3 y=groundReorient(normalize(ny),vec3(0,signs.y,0),vec3(1,0,0),vec3(0,0,-signs.y),baseN);
  vec3 z=groundReorient(normalize(nz),vec3(0,0,signs.z),vec3(signs.z,0,0),vec3(0,1,0),baseN);
  return normalize(x*weights.x+y*weights.y+z*weights.z);
 }
`;

export function applyGroundSurface(material,maps){
 material.onBeforeCompile=shader=>{
  project(shader);const stone=maps.stone||maps;Object.assign(shader.uniforms,{uGravelAlbedo:{value:maps.albedo},uGravelNormal:{value:maps.normal},uGroundStone:{value:stone.albedo},uGroundStoneNormal:{value:stone.normal},uGroundGeology:{value:maps.geology},uGroundPBR:{value:stone.pbr},uGroundHalfSpan:{value:1028},uGroundMaterialEnabled:{value:!!maps.geology&&!!stone.pbr}});
  shader.fragmentShader='uniform sampler2D uGravelAlbedo;uniform sampler2D uGravelNormal;uniform sampler2D uGroundStone;uniform sampler2D uGroundStoneNormal;uniform sampler2D uGroundGeology;uniform sampler2D uGroundPBR;uniform float uGroundHalfSpan;uniform bool uGroundMaterialEnabled;\n'+GROUND_NORMAL_GLSL+OUTPOST_SURFACE_COMMON+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   vec2 groundP=vTerrainWorld.xz;
   float sediment=terrainFbm(groundP*.008);
   float gravelPatch=smoothstep(.28,.68,sediment);
   vec2 gravelUV=groundP/32.0;
   vec3 gravelA=texture2D(uGravelAlbedo,gravelUV).rgb;
   vec3 gravelB=texture2D(uGravelAlbedo,mat2(.8,-.6,.6,.8)*gravelUV+vec2(.37,.19)).rgb;
   vec3 gravel=mix(gravelA,gravelB,smoothstep(.27,.72,terrainFbm(groundP*.016+38.0)));
   vec3 sand=diffuseColor.rgb*vec3(.90,.79,.65);
   diffuseColor.rgb=mix(sand,gravel*vec3(1.27,1.12,.94),gravelPatch*.83);
   diffuseColor.rgb*=.85+.25*terrainFbm(groundP*.0025);
   vec3 groundBaseN=normalize(vTerrainNormal);
   vec3 groundStoneW=pow(abs(groundBaseN),vec3(4.0));groundStoneW/=max(dot(groundStoneW,vec3(1.0)),.0001);
   vec3 groundStoneP=vTerrainWorld/48.0;
   vec3 groundSigns=mix(vec3(-1.0),vec3(1.0),step(vec3(0.0),groundBaseN));
   vec2 stoneUVX=vec2(-groundSigns.x*groundStoneP.z,groundStoneP.y);
   vec2 stoneUVY=vec2(groundStoneP.x,-groundSigns.y*groundStoneP.z);
   vec2 stoneUVZ=vec2(groundSigns.z*groundStoneP.x,groundStoneP.y);
   vec3 exposedStone=texture2D(uGroundStone,stoneUVX).rgb*groundStoneW.x+texture2D(uGroundStone,stoneUVY).rgb*groundStoneW.y+texture2D(uGroundStone,stoneUVZ).rgb*groundStoneW.z;
   float exposedSlope=smoothstep(.025,.20,1.0-abs(groundBaseN.y));
   vec3 geology=vec3(exposedSlope,1.0,1.0-exposedSlope);
   vec3 groundPacked=vec3(.83,1.0,.5);
   if(uGroundMaterialEnabled){
    vec2 geologyUV=((groundP+uGroundHalfSpan)/(2.0*uGroundHalfSpan)*256.0+.5)/257.0;
    geology=texture2D(uGroundGeology,geologyUV).rgb;
    groundPacked=texture2D(uGroundPBR,stoneUVX).rgb*groundStoneW.x+texture2D(uGroundPBR,stoneUVY).rgb*groundStoneW.y+texture2D(uGroundPBR,stoneUVZ).rgb*groundStoneW.z;
   }
   float sedimentRetention=smoothstep(.18,.68,geology.b-(groundPacked.b-.5)*.65);
   float exposedRock=max(exposedSlope,geology.r*(1.0-sedimentRetention*.18));
   diffuseColor.rgb=mix(diffuseColor.rgb,exposedStone*vec3(1.15,1.01,.85),exposedRock);
   float distantSand=smoothstep(650.0,2300.0,length(groundP-cameraPosition.xz));
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.43,.29,.17)*(.80+.32*sediment),distantSand*.40);
   ${OUTPOST_SURFACE_COLOR}
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=mix(roughnessFactor,clamp(groundPacked.r,.60,1.0),exposedRock);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 gravelNormal=texture2D(uGravelNormal,groundP/32.0).xyz*2.0-1.0;
   vec3 rockNX=texture2D(uGroundStoneNormal,stoneUVX).xyz*2.0-1.0;
   vec3 rockNY=texture2D(uGroundStoneNormal,stoneUVY).xyz*2.0-1.0;
   vec3 rockNZ=texture2D(uGroundStoneNormal,stoneUVZ).xyz*2.0-1.0;
   vec3 rockNormal=groundSignedNormals(groundBaseN,rockNX,rockNY,rockNZ,groundStoneW);
   vec3 gravelN=normalize(vec3(gravelNormal.xy*(.20+.20*gravelPatch),gravelNormal.z));
   float groundYSign=groundBaseN.y<0.0?-1.0:1.0;
   vec3 gravelWorld=groundReorient(gravelN,vec3(0,groundYSign,0),vec3(1,0,0),vec3(0,0,-groundYSign),groundBaseN);
   vec3 groundNormal=normalize(mix(gravelWorld,rockNormal,exposedRock));
   groundNormal=normalize(mix(groundNormal,groundBaseN,outpostPaving*.78));
   normal=normalize(mat3(viewMatrix)*groundNormal);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',`#include <aomap_fragment>
   reflectedLight.indirectDiffuse*=mix(1.0,groundPacked.g*geology.g,exposedRock);`);
 };
 material.customProgramCacheKey=()=> 'frontline-ground-outpost-v4';
 material.needsUpdate=true;return material;
}
