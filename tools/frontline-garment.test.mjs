import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {profileFromDef,validateProfile,applyProfile} from '../src/tool/studio-profile.js';
import {updateHeroSkin} from '../src/engine/hero-skin.js';

const base=()=>structuredClone(ROSTER.find(d=>d.id==='vega'));
const make=(model={})=>new Fighter({...base(),model:{surface:'field',body:'superhero-male',costume:'plated',...model}});
const shaderFor=mat=>{const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};mat.onBeforeCompile(shader);return shader;};

test('tailored garment uses the matching source UVs without repeating the pattern or changing its live palette',()=>{
 const f=make();try{
  const mat=f.parts.skin.materials.body;
  assert.equal(mat.map?.name,'garment-neutral-albedo');assert.equal(mat.normalMap?.name,'garment-normal');assert.equal(mat.roughnessMap?.name,'garment-roughness');
  for(const texture of [mat.map,mat.normalMap,mat.roughnessMap]){assert.deepEqual(texture.repeat.toArray(),[1,1]);assert.equal(texture.flipY,false);assert.equal(texture.colorSpace,THREE.NoColorSpace);}
  assert.equal(mat.metalness,0);assert.equal(mat.roughness,1,'Absolute roughness map must not be multiplied by the old .88 scalar');
  assert.equal(mat.bumpMap,null,'Do not apply the old weave height and new tailored normal to the same pattern UVs');
  assert.equal(f.parts.mats.suit.color.getHexString(),'b01a2b');assert.equal(f.parts.mats.armor.color.getHexString(),'d3d9bc');
  f.parts.mats.suit.color.set('#764323');f.parts.mats.suit2.color.set('#204855');
  assert.equal(mat.heroPalette.skinSuit.value.getHexString(),'764323');assert.equal(mat.heroPalette.skinLegs.value.getHexString(),'204855');
 }finally{f.dispose();}
});

test('garment and armor material additions preserve palette, rim, cutaway and emission callback chains',()=>{
 const f=make();try{
  const p=f.parts,body=shaderFor(p.skin.materials.body),armor=shaderFor(p.mats.armor);
  assert.equal(body.uniforms.skinSuit,p.skin.materials.body.heroPalette.skinSuit);assert.equal(body.uniforms.uRimK,p.mats.suit._rimU.uRimK);
  assert.equal(armor.uniforms.uRimK,p.mats.armor._rimU.uRimK);
  for(const sh of [body,armor])assert.equal(sh.uniforms.uCloseAmount,p.foreground.uniforms.uCloseAmount);
  // These assertions exercise the assembled shader, not a source-file string:
  // a missing region guard would put cloth normals on the face and white calves.
  assert.ok(/fieldClothNormal/.test(body.fragmentShader),'Source shader must preserve the pre-detail normal for exposed regions');assert.ok(/normal\s*=\s*normalize\(mix\(fieldClothNormal/.test(body.fragmentShader),'Source shader must mask cloth normals');
  assert.equal(armor.vertexShader.split('attribute vec3 fieldWear;').length-1,1);assert.match(armor.fragmentShader,/vFieldWear/);
  for(const sh of [body,armor])assert.equal(sh.fragmentShader.split('if(pattern<coverage)discard;').length-1,1);
  p.mats.suit.emissive.set('#ff3300');p.mats.suit.emissiveIntensity=.6;updateHeroSkin(p);
  assert.deepEqual(body.uniforms.skinEmissionSuit.value.toArray(),p.mats.suit.emissive.clone().multiplyScalar(.6).toArray());
 }finally{f.dispose();}
});

test('paint masks use exact existing geometry and one native armor material with neutral defaults on unmasked meshes',()=>{
 const f=make();try{
  const armor=f.parts.mats.armor,masked=[];
  f.obj.traverse(o=>{if(o.isMesh&&o.geometry.name.startsWith('field-')){
   assert.ok(!Array.isArray(o.material));assert.equal(o.material.isMaterial,true);
   if(o.material===armor){masked.push(o);const a=o.geometry.getAttribute('fieldWear');assert.ok(a,`${o.name} lost wear mask`);assert.equal(a.itemSize,3);assert.equal(a.count,o.geometry.getAttribute('position').count);for(let i=0;i<a.count;i++)for(const v of [a.getX(i),a.getY(i),a.getZ(i)])assert.ok(Number.isFinite(v)&&v>=0&&v<=1);}
  }});
  assert.equal(masked.length,11,'Harness plus paired shoulders, forearms, knees, boots and greaves must reuse the same armor');
  assert.deepEqual(armor.defaultAttributeValues.fieldWear,[1,0,0]);
  const belt=f.obj.getObjectByName('costume-belt');assert.equal(belt.material,armor);assert.equal(belt.geometry.getAttribute('fieldWear'),undefined);
  assert.equal(armor.vertexColors,false,'Wear data must not overwrite the Studio palette through generic RGB vertex colours');
 }finally{f.dispose();}
});

test('tailored source-specific maps never leak into standard, procedural or other source UV layouts',()=>{
 for(const model of [{surface:'standard'},{body:'procedural'},{body:'superhero-female'}]){
  const f=make(model);try{
   const mat=f.parts.skin?.materials.body??f.parts.mats.suit;
   assert.notEqual(mat.map?.name,'garment-neutral-albedo');assert.equal(mat.normalMap,null);assert.equal(mat.roughnessMap,null);
   if(model.surface==='standard'){assert.equal(mat.map,null);assert.equal(f.parts.mats.armor.defaultAttributeValues?.fieldWear,undefined);}
   else assert.deepEqual(f.parts.mats.armor.defaultAttributeValues?.fieldWear,[1,0,0]);
  }finally{f.dispose();}
 }
});

test('Studio round-trip retains source garment selection and user palette overrides',()=>{
 const def=base(),profile=profileFromDef(def);profile.colors.primary='#805b33';profile.colors.secondary='#b4a98e';
 const round=validateProfile(JSON.parse(JSON.stringify(profile))),f=new Fighter(applyProfile(def,round));
 try{
  assert.equal(f.parts.skin.materials.body.normalMap?.name,'garment-normal');assert.equal(f.parts.mats.armor.color.getHexString(),'b4a98e');
  assert.equal(f.parts.skin.materials.body.heroPalette.skinSuit.value,f.parts.mats.suit.color);
  assert.equal(f.parts.legL.userData.boot.material,f.parts.mats.armor);
 }finally{f.dispose();}
});

test('new garment surfaces remain owned and retire once after native movement',()=>{
 const f=make(),materials=new Set(),geometries=new Set();f.obj.traverse(o=>{if(o.material)materials.add(o.material);if(o.geometry)geometries.add(o.geometry);});
 let disposedMaterials=0,disposedGeometries=0;for(const m of materials)m.addEventListener('dispose',()=>disposedMaterials++);for(const g of geometries)g.addEventListener('dispose',()=>disposedGeometries++);
 try{
  f._openSky=true;f.flying=true;f.pos.y=150;f.vel.set(12,0,60);f.aim.set(0,0,1);f.aim3.copy(f.aim);
  for(let i=0;i<120;i++)f._animate(1/60);
  for(const mesh of f.parts.skin.meshes){assert.ok(mesh.skeleton.boneMatrices.every(Number.isFinite));assert.equal(mesh.material.isMaterial,true);}
  const body=f.parts.skin.materials.body;assert.equal(body.normalMap?.name,'garment-normal');
 }finally{f.dispose();f.dispose();}
 assert.equal(disposedMaterials,materials.size);assert.equal(disposedGeometries,geometries.size);
});
