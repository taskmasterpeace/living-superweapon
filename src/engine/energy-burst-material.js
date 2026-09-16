import * as THREE from 'three';

// THE CHARGE ORB CORE (Refs #42 iter 9) — the family's gathering energy, NOT a white balloon.
// The old MeshStandard core (emissive + bloom) blew out to a flat white sphere and swallowed the
// element. This keeps the family GLOW as the body and lets only churning hot cells reach the CORE
// color — so a fire orb reads as a churning ember ball, an ice orb as a faceted cold sphere, etc.
// `time` is driven each frame by chargeOrb; `hot` in [0,1] is charge level (brighter as it fills).
export function chargeOrbCore(glowColor, coreColor, time, kind='plasma'){
  const material=new THREE.MeshBasicMaterial({color:glowColor,transparent:true,opacity:.95,depthWrite:false,blending:THREE.NormalBlending});
  material.onBeforeCompile=shader=>{
    shader.uniforms.orbTime=time;shader.uniforms.orbHot={value:0};material.userData.orbHot=shader.uniforms.orbHot;
    shader.uniforms.orbCore={value:new THREE.Color(coreColor)};
    // 'crystal' snaps cells hard (ice/facets); 'plasma' churns smoothly; 'rune' bands slowly
    // (magic); 'fluid' swirls with a settling drip (water/toxic — a gathering ball of liquid).
    const churn=kind==='crystal'?'floor(n*4.0)/4.0':kind==='rune'?'sin(n*6.28+orbTime*1.5)*.5+.5':kind==='fluid'?'.5+.5*sin(n*6.28+vOrbP.y*4.0-orbTime*3.5)':'n';
    shader.vertexShader='varying vec3 vOrbN,vOrbP;'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
vOrbN=normalize(normal);vOrbP=position;`);
    shader.fragmentShader=`uniform float orbTime,orbHot;uniform vec3 orbCore;varying vec3 vOrbN,vOrbP;
float orbNoise(vec3 p){return .5+.5*sin(p.x*3.1+orbTime*3.0)*sin(p.y*3.7-orbTime*2.1)*sin(p.z*2.9+orbTime*2.6);}
`+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float n=orbNoise(vOrbP*2.2);float churn=${churn};
float hot=smoothstep(.45,.9,churn)*(.4+.6*orbHot);
diffuseColor.rgb=mix(diffuseColor.rgb,orbCore,hot);
diffuseColor.rgb*=(.7+.5*orbHot);`);
  };
  material.customProgramCacheKey=()=> 'lsw-charge-orb-'+kind;
  return material;
}

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
