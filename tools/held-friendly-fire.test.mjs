import test from 'node:test';
import assert from 'node:assert/strict';
import {earliestOrdinaryContact} from '../src/engine/attack-interception.js';
const body=(team,z)=>({team,alive:true,radius:1,pos:{x:0,y:0,z},def:{}});
test('a teammate held by an enemy intercepts a shot before the holder; release restores friendly exclusion',()=>{
 const shooter=body(0,-20),held=body(0,5),holder=body(1,15);
 holder.grabbing=held;held.grabbedBy=holder;
 const game={entities:[holder,held],world:{cover:[],interiors:[]},isFoe:(a,b)=>b.alive&&a!==b&&a.team!==b.team};
 const p={caster:shooter,pos:{x:0,y:5,z:-10},radius:.1,life:10};
 const end={x:0,y:5,z:25};
 assert.equal(earliestOrdinaryContact(p,end,.1,game).target,held);
 holder.grabbing=null;held.grabbedBy=null;
 assert.equal(earliestOrdinaryContact(p,end,.1,game).target,holder);
 holder.grabbing=held;held.grabbedBy=holder;holder.alive=false;
 assert.equal(earliestOrdinaryContact(p,end,.1,game),null);
});
