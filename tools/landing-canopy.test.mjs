import test from 'node:test';import assert from 'node:assert/strict';import{ThreatDeployment}from'../src/engine/threat-deployment.js';
function fixture(tree){return{g:{world:{ARENA:500,cover:[],treeSpots:[tree],heightAt:()=>0}}};}
test('landing search clears living crown beyond the trunk position',()=>{const tree={x:50,z:0,scale:1},f=fixture(tree),p=ThreatDeployment.prototype.clearPad.call(f,0,0,45);assert(p);assert(Math.hypot(p.x-tree.x,p.z-tree.z)>=56);});
for(const flag of ['dead','carried'])test(`removed ${flag} tree does not reserve an invisible crown`,()=>{const f=fixture({x:0,z:0,scale:1,[flag]:true});const p=ThreatDeployment.prototype.clearPad.call(f,0,0,45);assert.equal(p.x,0);assert.equal(p.z,0);});
