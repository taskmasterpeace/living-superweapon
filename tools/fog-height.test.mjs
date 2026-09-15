import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {FogMixin} from '../src/engine/fog.js';
test('fog retains elevated openings and refreshes moved geometry independently of the camera',()=>{
 const w=Object.assign({scene:new T.Scene(),cover:[{x:0,z:0,hx:10,hz:10,bottom:22,top:26}],interiors:[],ARENA:300},FogMixin);
 w._buildFogOfWar();w.refreshFogBoxes();const index=(192*384+192)*4;
 assert.equal(w._occHeights[index],22);assert.equal(w._occHeights[index+1],26);
 w.updateFog(1,2,0,1,'#fff',null,65);assert.equal(w.fogMat.uniforms.uEyeY.value,65);
 w.cover[0].bottom=50;w.cover[0].top=54;w.refreshFogBoxes();assert.equal(w._occHeights[index],50);assert.equal(w._occHeights[index+1],54);
 w.cover=[];w.refreshFogBoxes();assert.equal(w._occData[index/4],0);
 w._occTex.dispose();w._occHeightTex.dispose();w.fog.geometry.dispose();w.fogMat.dispose();
});
