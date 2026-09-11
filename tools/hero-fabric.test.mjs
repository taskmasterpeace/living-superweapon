import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {prepareHeroSurfaces} from '../src/engine/hero-materials.js';

const sol=()=>new Fighter(structuredClone(ROSTER.find(d=>d.id==='sol')));
test('SOL fabric keeps every color and uses shared relief without changing cape geometry',async()=>{
 const a=sol(),b=sol();
 try{
  const suit=a.parts.mats.suit,cape=a.parts.cape.material;
  assert.ok(suit.bumpMap,'fitted suit needs restrained fabric relief');
  assert.equal(suit.bumpMap,cape.bumpMap);assert.equal(suit.bumpMap,b.parts.mats.suit.bumpMap);
  assert.equal(suit.map,null);assert.equal(cape.map,null);assert.equal(suit.color.getHexString(),'ef652e');
  assert.equal(a.parts.mats.suit2.color.getHexString(),'0a27ff');assert.equal(cape.color.getHexString(),'dd4309');
  assert.ok(suit.bumpScale>0&&suit.bumpScale<=.004);assert.ok(cape.bumpScale>0&&cape.bumpScale<=.006);
  assert.equal(suit.bumpMap.colorSpace,THREE.NoColorSpace);assert.equal(suit.bumpMap.minFilter,THREE.LinearMipmapLinearFilter);
  assert.ok(suit.bumpMap.repeat.x<=2&&suit.bumpMap.repeat.y<=2,'avoid a dense high-frequency tiled pattern');
  assert.equal(a.parts.cape.geometry.attributes.position.count,13*17);
  await prepareHeroSurfaces([a.obj,b.obj]);
  let disposed=0;suit.bumpMap.addEventListener('dispose',()=>disposed++);a.dispose();
  assert.equal(disposed,0,'one fighter must not dispose another fighter fabric');await prepareHeroSurfaces([b.obj]);
 }finally{b.dispose();}
});
test('weighted fabric relief is masked off exposed skin and boots while palette/rim stay live',()=>{
 const f=sol();try{
  const mat=f.parts.skin.materials.body,shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  mat.onBeforeCompile(shader);
  assert.ok(mat.bumpMap);assert.match(shader.fragmentShader,/normal=normalize\(mix\(fieldClothNormal,normal,1\.0-max\(max\(head,hand\),boot\)\)\)/);
  assert.equal(shader.uniforms.skinSuit.value,f.parts.mats.suit.color);assert.equal(shader.uniforms.uRimK,f.parts.mats.suit._rimU.uRimK);
 }finally{f.dispose();}
});
test('saved procedural standard clothing retains its existing material',()=>{
 const def=structuredClone(ROSTER.find(d=>d.id==='sol'));def.model={body:'procedural',surface:'standard'};
 const f=new Fighter(def);try{assert.equal(f.parts.mats.suit.bumpMap,null);assert.equal(f.parts.cape.material.bumpMap,null);}finally{f.dispose();}
});
