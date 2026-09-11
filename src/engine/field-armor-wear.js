import * as THREE from 'three';
import bank from '../data/field-armor-wear-bank.json' with {type:'json'};

// Immutable source-mask bytes are decoded once; every native geometry owns its
// own BufferAttribute. No new material object, group or skeleton is introduced.
const decoded=new Map();
export function attachFieldArmorWear(geometry,id){
 const piece=bank.pieces[id];if(!piece)return;
 if(piece.vertexCount!==geometry.attributes.position.count)throw Error(`Field wear vertex contract changed: ${id}`);
 let bytes=decoded.get(id);
 if(!bytes){const raw=atob(piece.data);bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));decoded.set(id,bytes);}
 geometry.setAttribute('fieldWear',new THREE.Uint8BufferAttribute(bytes,3,true));
}

// Install after figure's rim hook, before foreground visibility wraps it. Shared
// armor also draws unmasked belts/insignia: a neutral generic attribute is vital.
export function applyFieldArmorWear(material){
 if(material._fieldWearInstalled)return;
 material._fieldWearInstalled=true;
 material.defaultAttributeValues={...material.defaultAttributeValues,fieldWear:[1,0,0]};
 const compile=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.customProgramCacheKey=()=>`${key}|field-paint-wear-v1`;
 material.onBeforeCompile=(shader,renderer)=>{
  compile.call(material,shader,renderer);
  shader.vertexShader='attribute vec3 fieldWear; varying vec3 vFieldWear;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFieldWear=fieldWear;');
  shader.fragmentShader='varying vec3 vFieldWear;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=vFieldWear.r;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+.22*vFieldWear.g,.04,1.0);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=clamp(metalnessFactor+.65*vFieldWear.b,0.0,1.0);');
 };
}
