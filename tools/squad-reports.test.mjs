import test from 'node:test';
import assert from 'node:assert/strict';
import {updateSquadReport} from '../src/engine/squad-reports.js';
import {operationSound} from '../src/engine/operation-audio.js';
function fixture(){const calls=[],g={time:0,player:{team:0},audio:{sample(id){calls.push(id);return true;}},hud:{feed(){}}},ai={bot:{alive:true,team:0,_squadLeader:g.player,def:{id:'sarge',name:'SARGE'}},belief:null,_mem:0};return {g,ai,calls};}
test('reports earned sight, flight and remembered search without reading hidden live state',()=>{
 const {g,ai}=fixture(),foe={id:'foe',flying:false};
 assert.equal(updateSquadReport(ai,g,foe,false),null);
 assert.equal(updateSquadReport(ai,g,foe,true).event,'spotted');
 assert.equal(updateSquadReport(ai,g,foe,true),null);
 foe.flying=true;g.time=3;assert.equal(updateSquadReport(ai,g,foe,true).event,'airborne');
 const unseen={get flying(){throw Error('hidden flight read');},get id(){throw Error('hidden id read');}};
 ai.belief={};ai._mem=3;g.time=6;assert.equal(updateSquadReport(ai,g,unseen,false).event,'search');
 g.time=9;assert.equal(updateSquadReport(ai,g,foe,true).event,'reacquired');
 ai._mem=0;g.time=12;assert.equal(updateSquadReport(ai,g,unseen,false).event,'lost');
});
test('enemy observers never emit friendly squad reports',()=>{const {g,ai,calls}=fixture();ai.bot.team=1;assert.equal(updateSquadReport(ai,g,{id:'x'},true),null);assert.equal(calls.length,0);});
test('radio shares a gap across different cue IDs and never queues stale reports',()=>{const {g,calls}=fixture();operationSound(g,'op.squad.ready');g.time=.3;operationSound(g,'op.pursuit.spotted');assert.equal(calls.length,1);g.time=2;operationSound(g,'op.pursuit.spotted');assert.equal(calls.length,2);});
