import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {World} from '../src/engine/world.js';
import {PowerWorldStage} from '../src/engine/powerworld.js';
import {applyFrontlineSky,restoreFrontlineSky} from '../src/engine/frontline-terrain.js';

function fixture(){
 const w=Object.create(World.prototype),palette={};
 for(const k of ['work','work2','sunDay','sunGold','sunNight','hemiDay','hemiNight','gndDay','gndNight','topDay','topNight','horDay','horNight','glowTint'])palette[k]=new THREE.Color(k.includes('Night')?'#334455':'#ffe0b0');
 Object.assign(w,{dayT:.2,dayFixed:.2,skyWorld:'powerworld',_dnc:palette,scene:new THREE.Scene(),sun:new THREE.DirectionalLight(),hemi:new THREE.HemisphereLight(),amb:new THREE.AmbientLight('#6a7890'),rim:new THREE.DirectionalLight('#8fb8ff'),skyMat:{uniforms:Object.fromEntries(['uTop','uHor','uGlow'].map(k=>[k,{value:new THREE.Color()}]))}});
 return {w,stage:new PowerWorldStage({world:w})};
}
function snapshot(w){return ['sun','hemi','amb','rim'].map(k=>[w[k].intensity,w[k].color.getHex()]);}
test('day, sunset and night change native lighting with a readable night floor',()=>{
 const {w,stage}=fixture();
 stage.setDaylight('day');w.updateDayNight(0);const day=snapshot(w);
 assert.equal(w.sun.intensity,2.7);
 stage.setDaylight('sunset');w.updateDayNight(0);const sunset=snapshot(w);
 stage.setDaylight('night');w.updateDayNight(0);const night=snapshot(w);
 assert.ok(day[0][0]>sunset[0][0]&&sunset[0][0]>night[0][0]);
 assert.ok(night[0][0]>=.3&&night[1][0]>=.4&&night[3][0]>=.6);
 assert.notEqual(sunset[0][1],day[0][1]);
 stage.setDaylight('day');w.updateDayNight(0);assert.deepEqual(snapshot(w),day);
});
test('fixed sunset never compounds ambient/rim warmth or brightness',()=>{
 const {w,stage}=fixture();stage.setDaylight('sunset');w.updateDayNight(0);const expected=snapshot(w);
 for(let i=0;i<600;i++)w.updateDayNight(1/60);
 assert.deepEqual(snapshot(w),expected);assert.equal(w.dayT,.6);
});
test('invalid saved preset falls back to bright day without affecting another world',()=>{
 const {w,stage}=fixture();stage.setDaylight('__proto__');w.updateDayNight(0);
 assert.equal(w.dayFixed,.2);assert.equal(w.sun.intensity,2.7);
 w.skyWorld=null;w.updateDayNight(0);assert.notEqual(w.hemi.intensity,.68);
});
test('late HDR loading honors selected night and restores the previous sky/environment',()=>{
 const {w,stage}=fixture(),original=new THREE.ShaderMaterial({uniforms:{uSpace:{value:0}},fragmentShader:'void main(){vec3 c=vec3(1.0);gl_FragColor = vec4(c, 1.0);}'});
 w.skyMesh=new THREE.Mesh(new THREE.SphereGeometry(),original);w.scene.environmentIntensity=.7;
 stage.setDaylight('night');const texture=new THREE.Texture();applyFrontlineSky(stage,texture);
 assert.equal(w.skyMesh.material.uniforms.uFrontlineDayMix.value,0);
 assert.equal(w.scene.environmentIntensity,.035);
 stage.setDaylight('day');assert.equal(w.skyMesh.material.uniforms.uFrontlineDayMix.value,1);assert.equal(w.scene.environmentIntensity,.22);
 restoreFrontlineSky(stage);assert.equal(w.skyMesh.material,original);assert.equal(w.scene.environmentIntensity,.7);
 for(const m of stage._mats)m.dispose();texture.dispose();original.dispose();w.skyMesh.geometry.dispose();
});
