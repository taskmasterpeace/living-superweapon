import test from 'node:test';
import assert from 'node:assert/strict';
import * as catalog from '../src/tool/studio-catalog.js';

for(const state of ['ready','fallback'])test(`paused catalog settles to ${state} without a frame`,async()=>{
 let finish;const fighter={_authoredMotionStatus:{reload:{state:'loading'}},_authoredMotionReady:new Promise(resolve=>finish=resolve)};
 const note={textContent:''},retry={hidden:true},host={querySelector:id=>id==='#catalog-runtime'?note:retry};
 const settled=catalog.watchCatalogRuntime(fighter,host,()=>fighter);
 assert.match(note.textContent,/loading/);
 fighter._authoredMotionStatus.reload={state,message:'Load failed'};finish();await settled;
 assert.match(note.textContent,new RegExp(state));assert.equal(retry.hidden,state!=='fallback');
});

test('a stale fighter completion cannot change the current catalog status',async()=>{
 let finish;const old={_authoredMotionStatus:{reload:{state:'loading'}},_authoredMotionReady:new Promise(resolve=>finish=resolve)};
 let current=old;const note={textContent:''},retry={hidden:true},host={querySelector:id=>id==='#catalog-runtime'?note:retry};
 const settled=catalog.watchCatalogRuntime(old,host,()=>current);
 current={_authoredMotionStatus:{reload:{state:'ready'}}};catalog.updateCatalogRuntime(current,host);
 old._authoredMotionStatus.reload={state:'fallback',message:'Old failure'};finish();await settled;
 assert.match(note.textContent,/ready/);assert.equal(retry.hidden,true);
});

test('a superseded load on the same fighter waits for its own completion',async()=>{
 let finish,finishNew;const fighter={_authoredMotionStatus:{reload:{state:'loading'}},_authoredMotionReady:new Promise(resolve=>finish=resolve)};
 const note={textContent:''},retry={hidden:true},host={querySelector:id=>id==='#catalog-runtime'?note:retry};
 const old=catalog.watchCatalogRuntime(fighter,host,()=>fighter);
 fighter._authoredMotionReady=new Promise(resolve=>finishNew=resolve);
 const current=catalog.watchCatalogRuntime(fighter,host,()=>fighter);
 fighter._authoredMotionStatus.reload={state:'ready'};finish();await old;
 assert.match(note.textContent,/loading/);
 finishNew();await current;assert.match(note.textContent,/ready/);
});
