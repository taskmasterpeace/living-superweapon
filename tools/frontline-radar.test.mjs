import test from 'node:test';
import assert from 'node:assert/strict';
import {HUD} from '../src/engine/hud.js';

test('PowerWorld radar does not draw the retained city harbor or district labels',()=>{
 const output=[],ctx=new Proxy({fillText:(...args)=>output.push(['text',...args]),fillRect:(...args)=>output.push(['rect',...args])},{get(target,key){return target[key]??(()=>{});}});
 const hud={_radarCtx:ctx,el:{radar:{style:{display:'block'}}}},game={modeId:'powerworld',world:{ARENA:900,waterX:10,plan:{flagship:true},cover:[]},entities:[]};
 HUD.prototype.updateRadar.call(hud,game);
 assert.deepEqual(output.filter(o=>o[0]==='text'),[]);assert.equal(output.filter(o=>o[0]==='rect').length,1,'Only the radar backdrop, not stale harbor');
 hud._radarLast=0;game.modeId='freeroam';output.length=0;HUD.prototype.updateRadar.call(hud,game);
 assert.equal(output.filter(o=>o[0]==='text').length,4);assert.equal(output.filter(o=>o[0]==='rect').length,2);
});
