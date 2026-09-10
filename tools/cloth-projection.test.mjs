import test from 'node:test';
import assert from 'node:assert/strict';
import {ContactProjection} from './prototypes/cloth-contact-solver.mjs';

test('coupled projection allows corners to exchange clearance',()=>{
 const q=new ContactProjection();
 q.add([1,0,0,1,0,0,0,0,0],0);
 q.add([-1,0,0,0,0,0,0,0,0],1);
 assert.ok(q.solve());
 assert.ok(Math.abs(q.solution[0]+1)<1e-6&&Math.abs(q.solution[3]-1)<1e-6);
});
test('coupled projection takes the minimum weighted contact correction',()=>{
 const q=new ContactProjection();q.add([.25,0,0,.75,0,0,0,0,0],1);
 assert.ok(q.solve());
 assert.ok(Math.abs(q.solution[0]-.4)<1e-8&&Math.abs(q.solution[3]-1.2)<1e-8);
 for(const i of [1,2,4,5,6,7,8])assert.equal(q.solution[i],0);
});
test('coupled projection rejects contradictory contact planes',()=>{
 const q=new ContactProjection();q.add([1,0,0,0,0,0,0,0,0],1);q.add([-1,0,0,0,0,0,0,0,0],1);
 assert.equal(q.solve(),false);
});
test('projection scratch reuse does not retain old contact impulses',()=>{
 const q=new ContactProjection();q.add([1,0,0,0,0,0,0,0,0],1);assert.ok(q.solve());
 q.clear();q.add([0,1,0,0,0,0,0,0,0],2);assert.ok(q.solve());
 assert.equal(q.solution[0],0);assert.equal(q.solution[1],2);
});
