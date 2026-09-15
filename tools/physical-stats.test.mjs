import {bodyWeight,LB_PER_TON,Fighter} from '../src/engine/entity.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {ROSTER} from '../src/data/characters.js';
import {deriveAttrs} from '../src/data/ranks.js';
import {resolvePhysicalStats} from '../src/data/physical-stats.js';
test('sheet Might agrees with actor strength for every stock character',()=>{
 for(const d of ROSTER)assert.equal(deriveAttrs(d).mgt,resolvePhysicalStats(d).strength,d.id);
});
test('explicit physical attribute edits affect strength and health without mutating source',()=>{
 const d={hp:100,strength:3,attrs:{mgt:8,vig:7}},r=resolvePhysicalStats(d);
 assert.equal(r.strength,8);assert.equal(r.hp,133);assert.equal(d.hp,100);
});

test('stock HP and strength balance is preserved',()=>{
 for(const d of ROSTER){const r=resolvePhysicalStats(d);assert.equal(r.hp,d.hp,d.id);assert.equal(r.strength,d.strength??5,d.id);}
});

test('production Fighter receives the same explicit physical stats as its sheet',()=>{
 const f=new Fighter({...ROSTER[0],attrs:{mgt:4,vig:8}});
 try{assert.equal(f.strength,4);assert.equal(f.maxHp,142);assert.equal(f.sheet.attrs.mgt,4);assert.equal(f.sheet.attrs.vig,8);}finally{f.dispose();}
});

test('authored weight in pounds is the actual lifting weight',()=>{
 assert.equal(bodyWeight({weightLb:245})*LB_PER_TON,245);
 assert.ok(bodyWeight({weightLb:-1,strength:3,hp:100})>0);
});

test('strength and health edits never silently change the same body weight',()=>{
 assert.equal(bodyWeight({strength:1,hp:80}),bodyWeight({strength:10,hp:500}));
 assert.equal(bodyWeight({...ROSTER.find(d=>d.id==='rage'),strength:1,hp:80})*LB_PER_TON,458);
});
test('environment mass is shared by actual pickup and collision, including growth',async()=>{
 const {impactMass}=await import('../src/engine/shared-impact.js');
 const f={def:{weightLb:180,environment:{massKg:100}},sizeScale:2};
 assert.ok(Math.abs(bodyWeight(f)*LB_PER_TON-impactMass(f))<1e-8);
 assert.ok(Math.abs(bodyWeight(f)*LB_PER_TON-800/0.45359237)<1e-8);
});
