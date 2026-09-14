import test from 'node:test';
import assert from 'node:assert/strict';
import {createNaniteState,advanceNanites,damageNanite,retireNanites} from '../src/engine/nanite-state.js';
import {updateNaniteAudio} from '../src/engine/nanite-audio.js';
test('nanite sound follows formation, break and repair once per transition',()=>{
 const events=[],f={pos:{x:0,y:0,z:0},_game:{audio:{soundLibrary:{play:id=>events.push(id)}}},_nanites:createNaniteState({q:{type:'naniteShield',naniteForm:'shield',naniteAttachment:'left-forearm'}})};
 updateNaniteAudio(f);assert.deepEqual(events,[]);
 advanceNanites(f._nanites,1,new Set(['q']));updateNaniteAudio(f);updateNaniteAudio(f);assert.deepEqual(events,['nanite-form']);
 const m=f._nanites.modules.get('q');damageNanite(f._nanites,{slot:'q',epoch:m.epoch,cell:0,point:{x:0,y:0,z:0},normal:{x:0,y:0,z:1}},999,true);
 updateNaniteAudio(f);updateNaniteAudio(f);assert.deepEqual(events,['nanite-form','nanite-break']);
 advanceNanites(f._nanites,100,new Set(['q']));updateNaniteAudio(f);assert.deepEqual(events,['nanite-form','nanite-break','nanite-reform']);
 retireNanites(f._nanites);updateNaniteAudio(f);assert.equal(events.length,3);assert.equal(f._naniteAudio.size,0);
});
