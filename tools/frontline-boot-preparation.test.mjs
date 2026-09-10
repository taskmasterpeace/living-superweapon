import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Execute the actual boot frame body with deterministic systems, not a copied
// readiness predicate. Loading must service menu/input without world clocks.
const source=readFileSync(new URL('../src/boot.js',import.meta.url),'utf8');
const frame=source.slice(source.indexOf('  function frame(now) {'),source.indexOf('\n  requestAnimationFrame(frame);'));
for(const preparing of [true,false])test(`boot ${preparing?'preparation':'live play'} gates auxiliary simulation`,()=>{
 const calls=[],record=name=>()=>calls.push(name);
 const game={_frontlinePreparing:preparing?{}:null,running:true,update:record('game'),pad:{connected:false,active:false},reportError:e=>{throw e;}};
 const context={last:0,started:true,game,hud:{_hintPad:false,update:record('hud')},padSystem:record('pad'),uinav:{update:record('menu')},
  soundscape:{update:record('soundscape')},tutorial:{update:record('tutorial')},netplay:{update:record('netplay')},input:{endFrame:record('input')},requestAnimationFrame:record('raf')};
 vm.runInNewContext(frame+'\nframe(16);',context);
 for(const key of ['soundscape','tutorial','netplay'])assert.equal(calls.includes(key),!preparing,key);
 for(const key of ['game','hud','pad','menu','input','raf'])assert.ok(calls.includes(key),key);
});
