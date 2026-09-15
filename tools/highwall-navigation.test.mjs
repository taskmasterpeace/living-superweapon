import test from 'node:test';import assert from 'node:assert/strict';
import {HighwallNavigation} from '../src/engine/highwall-navigation.js';
const bounds={minX:0,maxX:120,minZ:0,maxZ:120};
test('routes around L corner with validated smoothed segments',()=>{
 const nav=new HighwallNavigation({bounds,solids:[{x:60,z:45,hx:6,hz:35,top:20},{x:78,z:80,hx:24,hz:6,top:20}]});
 const start={x:30,z:30},end={x:90,z:60};assert.equal(nav.segmentClear(start,end),false);
 const route=nav.route(start,end);assert.ok(route?.points.length>2);for(let i=1;i<route.points.length;i++)assert.ok(nav.segmentClear(route.points[i-1],route.points[i]));
});
test('narrow opening allows small actor but rejects large radius',()=>{
 const nav=new HighwallNavigation({bounds,cellSize:2,solids:[{x:60,z:25,hx:4,hz:25,top:20},{x:60,z:85,hx:4,hz:35,top:20}]});
 // Leave 10u opening from z50 to60.
 nav.replace([{x:60,z:25,hx:4,hz:25,top:20},{x:60,z:90,hx:4,hz:30,top:20}],1);
 assert.ok(nav.route({x:20,z:55},{x:100,z:55},{radius:3,height:10}));
 assert.equal(nav.route({x:20,z:55},{x:100,z:55},{radius:6,height:10}),null);
});
test('replace invalidates cached path and returned paths cannot mutate cache',()=>{
 const nav=new HighwallNavigation({bounds});const a={x:20,z:60},b={x:100,z:60};
 const route=nav.route(a,b);route.points[0].x=-99;assert.equal(nav.route(a,b).points[0].x,20);
 nav.replace([{x:60,z:60,hx:4,hz:60,top:20}],2);assert.equal(nav.route(a,b),null);
 nav.replace([],3);assert.equal(nav.route(a,b).revision,3);
});
test('roof clears short actors but blocks taller actors',()=>{
 const nav=new HighwallNavigation({bounds,solids:[{x:60,z:60,hx:60,hz:60,bottom:12,top:20}]});
 assert.ok(nav.route({x:20,z:60},{x:100,z:60},{radius:3,height:10}));assert.equal(nav.route({x:20,z:60},{x:100,z:60},{radius:3,height:14}),null);
});
