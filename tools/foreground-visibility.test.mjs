import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {profileFromDef,validateProfile,applyProfile} from '../src/tool/studio-profile.js';
import {installForegroundVisibility,updateForegroundVisibility,clearForegroundVisibility} from '../src/engine/foreground-visibility.js';
function fixture(body='procedural'){
 const a=new Fighter({...ROSTER.find(d=>d.id==='sol'),model:{body}}),b=new Fighter(ROSTER.find(d=>d.id==='kano'));
 for(const [i,f] of [a,b].entries()){f.pos.set(0,80,i*5);f.flying=true;f.gait='airborne';f._openSky=true;f._vis=1;f._animate(1);f.obj.updateMatrixWorld(true);}
 const camera=new THREE.PerspectiveCamera(73.74,16/9,.6,1000);camera.position.set(0,103,-18);camera.lookAt(0,85,4);camera.updateMatrixWorld(true);
 return {a,b,w:{camera},dispose(){a.dispose();b.dispose();}};
}
test('local view ownership does not leak cutaway into hidden, dead, distant or unlocked targets',()=>{
 const {a,b,w,dispose}=fixture();try{
  updateForegroundVisibility(w,a,b,1);assert.ok(a.parts.foreground.uniforms.uCloseAmount.value>.5);
  for(const state of ['hidden','dead','distant','unlocked']){
   b._vis=1;b.state='idle';b.pos.z=5;b.obj.visible=true;updateForegroundVisibility(w,a,b,1);
   if(state==='hidden')b._vis=0;if(state==='dead')b.state='ko';if(state==='distant')b.pos.z=100;
   updateForegroundVisibility(w,a,state==='unlocked'?null:b,1);
   assert.equal(a.parts.foreground.uniforms.uCloseAmount.value,0,state);
  }
 }finally{dispose();}
});
test('handoff clears the previous material state and zero-time updates do not advance the fade',()=>{
 const {a,b,w,dispose}=fixture();try{
  updateForegroundVisibility(w,a,b,0);assert.equal(a.parts.foreground.uniforms.uCloseAmount.value,0);
  updateForegroundVisibility(w,a,b,.05);const partial=a.parts.foreground.uniforms.uCloseAmount.value;
  assert.ok(partial>0&&partial<.9);updateForegroundVisibility(w,a,b,0);assert.equal(a.parts.foreground.uniforms.uCloseAmount.value,partial);
  updateForegroundVisibility(w,b,a,1);assert.equal(a.parts.foreground.uniforms.uCloseAmount.value,0);
  clearForegroundVisibility(w);assert.equal(b.parts.foreground.uniforms.uCloseAmount.value,0);
 }finally{dispose();}
});
test('source bodies, held weapons and form replacement keep stable material ownership',()=>{
 for(const body of ['procedural','superhero-male','superhero-female']){
  const {a,b,w,dispose}=fixture(body);try{
   const state=a.parts.foreground;assert.ok(state.materials.size>0);
   const versions=[...state.materials].map(m=>m.version),position=a.pos.clone(),rotation=a.obj.quaternion.clone();
   installForegroundVisibility(a.parts);assert.equal(a.parts.foreground,state);
   for(let i=0;i<120;i++)updateForegroundVisibility(w,a,b,1/60);
   assert.deepEqual([...state.materials].map(m=>m.version),versions,'view changes must not recompile materials');
   assert.ok(a.pos.equals(position));assert.ok(a.obj.quaternion.equals(rotation));
   a.applyForm({model:{body:body==='procedural'?'superhero-male':'procedural'}});
   updateForegroundVisibility(w,a,b,1);assert.equal(state.uniforms.uCloseAmount.value,0);assert.notEqual(a.parts.foreground,state);
  }finally{dispose();}
 }
 const f=new Fighter(ROSTER.find(d=>d.id==='sarge'));try{
  const grip=f.parts.armR.children[2];let installed=0;grip.traverse(o=>{if(o.isMesh&&!o.material.transparent){assert.ok(f.parts.foreground.materials.has(o.material));installed++;}});assert.ok(installed>0);
 }finally{f.dispose();}
});
test('cutaway preference defaults, disables and validates without invalidating old profiles',()=>{
 const def=ROSTER.find(d=>d.id==='sol'),p=profileFromDef(def);assert.equal(p.camera.cutaway,.9);
 p.camera.cutaway=0;assert.equal(applyProfile(def,validateProfile(p)).model.camera.cutaway,0);
 delete p.camera.cutaway;assert.doesNotThrow(()=>validateProfile(p));assert.equal(p.camera.cutaway,undefined,'legacy input must not mutate');
 for(const v of [-.1,1.1,NaN,'1']){p.camera.cutaway=v;assert.throws(()=>validateProfile(p));}
});

test('coverage timing agrees at 30, 60 and 120 Hz and every rig retains its own shader uniforms',()=>{
 const values=[];
 for(const hz of [30,60,120]){
  const {a,b,w,dispose}=fixture();try{
   for(let i=0;i<hz/10;i++)updateForegroundVisibility(w,a,b,1/hz);
   values.push(a.parts.foreground.uniforms.uCloseAmount.value);
   assert.notEqual(a.parts.foreground.uniforms,b.parts.foreground.uniforms);
   assert.equal(b.parts.foreground.uniforms.uCloseAmount.value,0);
  }finally{dispose();}
 }
 assert.ok(Math.max(...values)-Math.min(...values)<1e-12);
});

test('material hooks preserve source palettes and install the cutaway exactly once without changing depth or shadow materials',()=>{
 for(const body of ['procedural','superhero-male','superhero-female']){
  const {a,dispose}=fixture(body);try{
   for(const mat of a.parts.foreground.materials){
    const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
    mat.onBeforeCompile(shader);
    assert.equal(shader.uniforms.uCloseAmount,a.parts.foreground.uniforms.uCloseAmount);
    assert.equal(shader.vertexShader.split('varying vec4 vCloseClip;').length-1,1);
    assert.equal(shader.fragmentShader.split('if(pattern<coverage)discard;').length-1,1);
    assert.equal(mat.transparent,false);assert.equal(mat.depthWrite,true);
    if(mat.heroPalette){assert.equal(shader.uniforms.skinSuit,mat.heroPalette.skinSuit);assert.ok(shader.fragmentShader.includes('heroBind'));}
   }
   a.parts.body.traverse(o=>{if(o.isMesh){assert.equal(o.customDepthMaterial,undefined);assert.equal(o.customDistanceMaterial,undefined);}});
  }finally{dispose();}
 }
});
