import test from 'node:test';
import assert from 'node:assert/strict';
import {highwallLayout,HIGHWALL_HEIGHT} from '../src/data/highwall.js';
import {HighwallNavigation} from '../src/engine/highwall-navigation.js';
import {routeHighwallIntent} from '../src/engine/highwall-routing.js';
import {buildHighwallGeometry} from '../src/engine/highwall-geometry.js';
const make=l=>new HighwallNavigation({bounds:l.bounds,solids:l.pieces,revision:l.revision});
test('authored Highwall placements share real 30-foot walls and clear spawn points',()=>{
 const l=highwallLayout(),nav=make(l);assert.ok(Math.abs(HIGHWALL_HEIGHT*.19-9.144)<.00001);
 for(const p of [...l.blue,...l.red,l.objective])assert.ok(nav.isClear(p),JSON.stringify(p));
 const route=nav.route(l.blue[0],l.red[0]);assert.ok(route);assert.ok(route.points.length>2);
 for(let i=1;i<route.points.length;i++)assert.ok(nav.segmentClear(route.points[i-1],route.points[i]));
});
test('tank has a connected route across the armored lane with full clearance',()=>{
 const l=highwallLayout(),nav=make(l);const route=nav.route(l.tank,{x:66,z:-250},{radius:12,height:18});assert.ok(route);
 for(let i=1;i<route.points.length;i++)assert.ok(nav.segmentClear(route.points[i-1],route.points[i],{radius:12,height:18}));
});
test('changing authored gate removes matching collision and navigation on rebuild',()=>{
 const closed=highwallLayout(),open=highwallLayout({gateClosed:false,revision:2});const nav=make(closed),p={x:-169,z:80};
 assert.equal(nav.isClear(p),false);nav.replace(open.pieces,open.revision);assert.equal(nav.isClear(p),true);assert.equal(nav.revision,2);
 const group=buildHighwallGeometry(open,{labels:false});assert.ok(group.children.length<20);group.userData.dispose();
});
test('ground intent follows an authored order around corners without hidden target knowledge',()=>{
 const l=highwallLayout(),nav=make(l),f={pos:{...l.blue[0],y:0},ai:{},radius:3};let travelled=0;
 for(let i=0;i<2000;i++){
  const it=routeHighwallIntent(nav,f,{move:{x:0,z:0}},.05,l.objective);
  const next={x:f.pos.x+it.move.x*.9,z:f.pos.z+it.move.z*.9};
  assert.ok(nav.segmentClear(f.pos,next,{radius:3.5,height:11}));
  travelled+=Math.hypot(next.x-f.pos.x,next.z-f.pos.z);Object.assign(f.pos,next);
  if(Math.hypot(f.pos.x-l.objective.x,f.pos.z-l.objective.z)<3)break;
 }
 assert.ok(travelled>100);assert.ok(Math.hypot(f.pos.x-l.objective.x,f.pos.z-l.objective.z)<3);
});
