import test from 'node:test';import assert from 'node:assert/strict';
import {MeshStandardMaterial} from 'three';
import {applyFacilityFinish,labFinishKind} from '../src/engine/facility-finish.js';
test('shared finish preserves prior shader hook and does not add textures or repeated wrappers',()=>{
 const m=new MeshStandardMaterial();let calls=0;m.onBeforeCompile=()=>calls++;
 applyFacilityFinish(m,'wall');const hook=m.onBeforeCompile;applyFacilityFinish(m,'wall');assert.equal(m.onBeforeCompile,hook);
 const shader={vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <map_fragment>'};m.onBeforeCompile(shader);assert.equal(calls,1);assert.match(shader.fragmentShader,/fwidth/);assert.equal(m.map,null);assert.match(m.customProgramCacheKey(),/facility-finish-v1-wall/);m.dispose();
});
test('lab semantic safety markings retain their authored material',()=>{
 assert.equal(labFinishKind('breakable_breach_panel_stripe_mat'),null);assert.equal(labFinishKind('case_glow_mat'),null);assert.equal(labFinishKind('shell_l0_mat'),'wall');assert.equal(labFinishKind('floor_l0_mat'),'floor');assert.equal(labFinishKind('breakable_front_door_leaf_mat'),'steel');
});
