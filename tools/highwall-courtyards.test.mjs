import test from 'node:test';import assert from 'node:assert/strict';
import {highwallLayout} from '../src/data/highwall.js';import {HighwallNavigation} from '../src/engine/highwall-navigation.js';
test('courtyards and actual squad spawns are clear and connected through real geometry',()=>{
 const l=highwallLayout(),n=new HighwallNavigation({bounds:l.bounds,solids:l.pieces}),shape={radius:3,height:10};
 assert.equal(l.courtyards.length,6);assert.equal(l.spawnAreas.length,6);
 for(const p of [...l.blue,...l.red,...l.spawnAreas])assert.ok(n.isClear(p,shape),JSON.stringify(p));
 for(const p of l.spawnAreas)assert.ok(n.route(l.blue[0],p,shape),'No route to '+p.id);
});
import {zombieSpawns} from '../src/data/highwall-scenarios.js';
test('all supported infected spawn counts clear the courtyard walls',()=>{const l=highwallLayout(),n=new HighwallNavigation({bounds:l.bounds,solids:l.pieces});for(const p of zombieSpawns(64))assert.ok(n.isClear(p,{radius:3,height:10}),JSON.stringify(p));});
