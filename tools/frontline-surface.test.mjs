import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {applySandstoneSurface,applyGroundSurface} from '../src/engine/frontline-surface.js';

const shader=()=>({uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader});
test('sandstone texture stays in world units after differently sized cover fits and adds depth haze',()=>{
 const material=new THREE.MeshStandardMaterial(),maps={albedo:new THREE.Texture(),normal:new THREE.Texture(),rough:new THREE.Texture()};
 applySandstoneSurface(material,maps);const compiled=shader();material.onBeforeCompile(compiled);
 assert.match(compiled.vertexShader,/modelMatrix \* vec4\( transformed, 1\.0 \)/);
 assert.match(compiled.vertexShader,/USE_INSTANCING/);assert.match(compiled.vertexShader,/modelMatrix \* instanceMatrix/);
 assert.match(compiled.fragmentShader,/vTerrainWorld \/ 18\.0/);
 assert.match(compiled.fragmentShader,/terrainAerialPerspective/);
 assert.equal(compiled.uniforms.uStoneAlbedo.value,maps.albedo);
 assert.equal(material.customProgramCacheKey(),'frontline-sandstone-v3');
 material.transparent=true;material.opacity=.31;
 const cutaway=material.clone(),cutShader=shader();cutaway.onBeforeCompile(cutShader);
 assert.equal(cutaway.customProgramCacheKey(),material.customProgramCacheKey());
 assert.equal(cutaway.transparent,true);assert.equal(cutaway.opacity,.31);
 assert.equal(cutShader.uniforms.uStoneAlbedo.value,maps.albedo);
 cutaway.dispose();
 material.dispose();Object.values(maps).forEach(t=>t.dispose());
});
test('ground surface shades the native displaced vertices without a second floor or geometry mutation',()=>{
 const material=new THREE.MeshStandardMaterial(),maps={albedo:new THREE.Texture(),normal:new THREE.Texture()};
 applyGroundSurface(material,maps);const compiled=shader();material.onBeforeCompile(compiled);
 assert.match(compiled.vertexShader,/transformed, 1\.0/);assert.match(compiled.fragmentShader,/uGravelAlbedo/);
 assert.match(compiled.fragmentShader,/sediment/);assert.match(compiled.fragmentShader,/terrainAerialPerspective/);
 assert.equal(material.customProgramCacheKey(),'frontline-ground-outpost-v4');
 assert.match(compiled.fragmentShader,/vec2 groundP=vTerrainWorld\.xz/,'Paving must follow the native world surface');
 for(const feature of ['outpostApron','outpostRoad','outpostRunway','runwayPaint','helipadPaint'])assert.ok(compiled.fragmentShader.includes(feature),`Missing compiled ${feature}`);
 assert.match(compiled.fragmentShader,/mix\(groundNormal,groundBaseN,outpostPaving\*\.78\)/,'Paving must also affect surface relief');
 material.dispose();Object.values(maps).forEach(t=>t.dispose());
});

test('exposed native bedrock uses the sandstone normal photograph rather than gravel-only relief',()=>{
 const material=new THREE.MeshStandardMaterial(),stone={albedo:new THREE.Texture(),normal:new THREE.Texture()},maps={albedo:new THREE.Texture(),normal:new THREE.Texture(),stone};
 applyGroundSurface(material,maps);const compiled=shader();material.onBeforeCompile(compiled);
 assert.equal(compiled.uniforms.uGroundStoneNormal?.value,stone.normal);
 material.dispose();for(const t of [maps.albedo,maps.normal,stone.albedo,stone.normal])t.dispose();
});

test('ground material receives the authored exposure mask and packed measured physical channels',()=>{
 const material=new THREE.MeshStandardMaterial(),geology=new THREE.Texture(),pbr=new THREE.Texture();
 const stone={albedo:new THREE.Texture(),normal:new THREE.Texture(),rough:new THREE.Texture(),pbr};
 const maps={albedo:new THREE.Texture(),normal:new THREE.Texture(),stone,geology};
 applyGroundSurface(material,maps);const compiled=shader();material.onBeforeCompile(compiled);
 assert.equal(compiled.uniforms.uGroundGeology?.value,geology,'Authored bank exposure is not used');
 assert.equal(compiled.uniforms.uGroundPBR?.value,pbr,'Measured roughness/cavity channels are not used');
 assert.equal(compiled.uniforms.uGroundHalfSpan?.value,1028,'Mask does not align to native world extents');
 material.dispose();for(const t of [maps.albedo,maps.normal,...Object.values(stone),geology])t.dispose();
});
