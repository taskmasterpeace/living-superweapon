import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {energyShellMaterial} from '../src/engine/energy-burst-material.js';
import {VFX} from '../src/engine/vfx.js';

test('energy shell retains normal material color/opacity animation with edge-weighted alpha',()=>{
  const material=energyShellMaterial('#ffb735',.8);
  try{
    assert.equal(material.transparent,true);assert.equal(material.depthWrite,false);
    assert.equal(material.blending,THREE.AdditiveBlending);
    assert.equal(material.color.getHexString(),'ffb735');assert.equal(material.opacity,.8);
    const shader={vertexShader:THREE.ShaderLib.basic.vertexShader,fragmentShader:THREE.ShaderLib.basic.fragmentShader};
    material.onBeforeCompile(shader);
    assert.match(shader.vertexShader,/vEnergyNormal\s*=\s*normalize\(normalMatrix\s*\*\s*normal\)/);
    assert.match(shader.fragmentShader,/diffuseColor\.a\s*\*=.*energyRim/);
    assert.ok(shader.fragmentShader.indexOf('diffuseColor.a *=')<shader.fragmentShader.indexOf('#include <opaque_fragment>'));
    assert.equal(material.customProgramCacheKey(),'lsw-energy-shell-v1');
    material.opacity=.2;material.color.set('#8fdcff');assert.equal(material.opacity,.2);
  }finally{material.dispose();}
});

test('an authored zero-radius remote energy burst does not fall back to a 12-unit visual explosion',()=>{
  const scene=new THREE.Scene(),vfx=new VFX({scene,shake(){}},{burst(){}});
  try{
    const children=scene.children.length;
    vfx.explode(new THREE.Vector3(0,80,0),{radius:0,energyShell:true});
    assert.equal(vfx.fx.length,0);assert.equal(scene.children.length,children);assert.equal(vfx.lightPool.length,14);
  }finally{
    for(const fx of vfx.fx)fx.dispose();
    scene.remove(...vfx._lights);vfx._sphere.dispose();vfx._ring.dispose();vfx._decalGeo.dispose();
  }
});
