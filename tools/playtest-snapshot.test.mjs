import test from 'node:test';import assert from 'node:assert/strict';import {snapshotBrowser} from './playtest/snapshot.mjs';
test('snapshot is bounded, serializable and does not invoke game callbacks',()=>{const old=globalThis.PW;try{let invoked=0;const actor={id:1,def:{id:'sol'},pos:{x:0,y:0,z:0},vel:{x:1,y:2,z:3},hp:99};const cover=Array.from({length:100},(_,i)=>({x:i,z:0,hx:1,hz:1,top:4}));globalThis.PW={game:{player:actor,entities:Array(80).fill(actor),world:{cover},_focus:{id:'panel',onUse(){invoked++;}},ms:{threatLab:{meleeTrial:{target:actor,records:Array(100).fill({amount:4,callback(){invoked++;}})}}}}};const s=snapshotBrowser();assert.equal(s.colliders.length,32);assert.equal(s.drill.records.length,20);assert.equal(invoked,0);assert.equal(s.player.hp,99);s.player.pos[0]=900;assert.equal(actor.pos.x,0);assert.doesNotThrow(()=>JSON.stringify(s));assert.equal(s.colliders[0].snapshotIndex,0);}finally{globalThis.PW=old;}});
test('missing runtime is reported without pretending a game snapshot exists',()=>{const old=globalThis.PW;try{delete globalThis.PW;assert.equal(snapshotBrowser().available,false);}finally{globalThis.PW=old;}});

test('failure bundle preserves original error when browser capture is unavailable',async()=>{
 const {saveSnapshot}=await import('./playtest/diagnostics.mjs');const {mkdtemp,readFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const path=await import('node:path');const dir=await mkdtemp(path.join(tmpdir(),'pw-diagnostics-'));
 try{const page={evaluate:async()=>{throw new Error('page closed');},screenshot:async()=>{throw new Error('no renderer');}};await saveSnapshot(page,dir,{error:new Error('Expected melee contact'),errors:[]});const data=JSON.parse(await readFile(path.join(dir,'failure.json'),'utf8'));assert.equal(data.error.message,'Expected melee contact');assert.equal(data.observationError,'page closed');assert.equal(data.screenshotError,'no renderer');}finally{await rm(dir,{recursive:true,force:true});}
});
test('context distinguishes managed objects from focus and reports real cooldowns without claiming eligibility',()=>{
 const old=globalThis.PW;try{
 const f={alive:true,pos:{x:0,y:0,z:0},slots:{lmb:{def:{name:'Heat Ray',type:'beam',cost:4,kiPerSec:16},cd:.25}},items:[{kind:'beacon',charges:0,cd:8,state:'cooldown'}]};
 globalThis.PW={game:{running:true,player:f,_focus:{id:'reset',verb:'RESET PRACTICE',enabled(){throw Error('Do not call');}}}};
 let c=snapshotBrowser().inputContext;assert.equal(c.interaction.mode,'focused-interaction');assert.equal(c.powers[0].cooldown,.25);assert.equal(c.gadgets[0].charges,0);
 f.grabbing={id:9};c=snapshotBrowser().inputContext;assert.equal(c.interaction.mode,'manage-person');assert.equal(c.interaction.target,9);
 delete f.grabbing;f._carry={kind:'rock'};assert.equal(snapshotBrowser().inputContext.interaction.mode,'manage-prop');
 delete f._carry;delete PW.game._focus;assert.equal(snapshotBrowser().inputContext.interaction.eligibility.startsWith('unresolved'),true);
 PW.game.combatOverlayOpen=true;assert.equal(snapshotBrowser().inputContext.reason,'overlay');
 }finally{globalThis.PW=old;}
});
