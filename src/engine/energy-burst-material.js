import * as THREE from 'three';

// Keep the blast perimeter and light without hiding the opponent behind a disk.
// Basic material retains the production color/opacity/tone-map lifecycle.
export function energyShellMaterial(color,opacity=.8){
  const material=new THREE.MeshBasicMaterial({color,opacity,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  material.customProgramCacheKey=()=> 'lsw-energy-shell-v1';
  material.onBeforeCompile=shader=>{
    const declarations='\nvarying vec3 vEnergyNormal;\nvarying vec3 vEnergyEye;\n';
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>'+declarations)
      .replace('#include <project_vertex>',`#include <project_vertex>
        vEnergyNormal = normalize(normalMatrix * normal);
        vEnergyEye = -mvPosition.xyz;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>'+declarations)
      .replace('#include <opaque_fragment>',`
        float energyRim = pow(1.0 - abs(dot(normalize(vEnergyNormal),normalize(vEnergyEye))),2.4);
        diffuseColor.a *= .035 + .965 * energyRim;
        #include <opaque_fragment>`);
  };
  return material;
}
