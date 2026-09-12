// Shared, texture-free facility finish. Units match the lab/transport family.
// Recess shading describes panel joints only; it is not baked sunlight or full AO.
export const FACILITY_FINISH=Object.freeze({
 wall:{color:0xb2a386,roughness:.92,metalness:0,tile:[12,8],joint:.14,shade:.14},
 steel:{color:0x4f5959,roughness:.72,metalness:.3,tile:[10,8],joint:.10,shade:.18},
 floor:{color:0x77776e,roughness:.94,metalness:.03,tile:[6,6],joint:.09,shade:.16},
});
const finishedMaterials=new WeakSet();
export function applyFacilityFinish(material,kind){
 const profile=FACILITY_FINISH[kind];if(!profile||finishedMaterials.has(material))return material;finishedMaterials.add(material);
 material.userData.facilityFinish=kind;material.color.setHex(profile.color);material.roughness=profile.roughness;material.metalness=profile.metalness;
 const previous=material.onBeforeCompile,cache=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vFacilityPosition;\nvarying vec3 vFacilityNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\nvFacilityPosition = mat3(modelMatrix) * transformed;\nvFacilityNormal = normalize(mat3(modelMatrix) * objectNormal);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vFacilityPosition;\nvarying vec3 vFacilityNormal;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   vec3 facilityN=abs(normalize(vFacilityNormal));
   vec2 facilityUV=facilityN.y>.7?vFacilityPosition.xz:facilityN.x>facilityN.z?vFacilityPosition.zy:vFacilityPosition.xy;
   vec2 facilityTile=vec2(${profile.tile[0].toFixed(1)},${profile.tile[1].toFixed(1)});
   vec2 facilityCell=abs(mod(facilityUV+facilityTile*.5,facilityTile)-facilityTile*.5);
   float facilityEdge=min(facilityCell.x,facilityCell.y);
   float facilityAA=max(fwidth(facilityUV.x)+fwidth(facilityUV.y),.025);
   float facilityJoint=1.-smoothstep(${profile.joint.toFixed(2)},${profile.joint.toFixed(2)}+facilityAA,facilityEdge);
   float facilityGrain=sin(facilityUV.x*1.7)*sin(facilityUV.y*2.3)*.015;
   diffuseColor.rgb *= 1.-facilityJoint*${profile.shade.toFixed(2)}+facilityGrain;
  `);
 };
 material.customProgramCacheKey=()=>cache+'|facility-finish-v1-'+kind;material.needsUpdate=true;return material;
}
export function labFinishKind(name){
 if(/stripe|mark|glow|trim/.test(name))return null;
 if(/floor|stair/.test(name))return 'floor';
 if(/door|pedestal|roof_structural|roof_weak/.test(name))return 'steel';
 if(/shell|breach_panel|parapet/.test(name))return 'wall';
 return null;
}
