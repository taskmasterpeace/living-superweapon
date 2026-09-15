import test from 'node:test';import assert from 'node:assert/strict';import {HighwallNavigation} from '../src/engine/highwall-navigation.js';import {highwallLayout} from '../src/data/highwall.js';
class FullScan extends HighwallNavigation{_boxes(shape){return this.solids.filter(s=>(s.bottom??0)<=shape.height&&(s.top??Infinity)>0);}}
test('spatial broadphase matches full scan across seeded endpoints, radii, roof heights and exact edges',()=>{
 const l=highwallLayout(),a=new HighwallNavigation({bounds:l.bounds,solids:l.pieces}),b=new FullScan({bounds:l.bounds,solids:l.pieces});let seed=19;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let i=0;i<3000;i++){const p={x:random()*648-324,z:random()*600-300},q={x:random()*648-324,z:random()*600-300},shape={radius:[0,2.2,3,12][i%4],height:[10,22,26,60][i%4]};assert.equal(a.isClear(p,shape),b.isClear(p,shape));assert.equal(a.segmentClear(p,q,shape),b.segmentClear(p,q,shape));}
 for(const o of l.pieces)for(const radius of[0,2.2,12]){const p={x:o.x+o.hx+radius,z:o.z};assert.equal(a.isClear(p,{radius}),b.isClear(p,{radius}));}
 a.replace([],2);assert.equal(a.isClear({x:-286,z:-220}),true);
});
test('indexed and full scan produce identical deterministic routes',()=>{
 const l=highwallLayout(),args={bounds:l.bounds,solids:l.pieces},a=new HighwallNavigation(args),b=new FullScan(args);
 for(const end of [{x:-169,z:140},{x:-151,z:0},{x:230,z:-215}])assert.deepEqual(a.route(l.blue[0],end,{radius:3,height:12}),b.route(l.blue[0],end,{radius:3,height:12}));
});
