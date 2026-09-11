import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';

function fixture(t,openSky=true){
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='vega')));
 Object.assign(f,{_openSky:openSky,invuln:0,armor:0,resist:{},flying:true,
   _physics(){},_animate(){},_sync(){}});
 const src={def:{},pos:new Vector3(0,0,10)};
 const hit=(amount,opts={})=>f.takeDamage(amount,{src,ballistic:true,...opts});
 t.after(()=>f.dispose());return{f,hit};
}

test('ordinary repeated ballistic chip keeps an open-sky fighter visible without changing combat',t=>{
 const {f,hit}=fixture(t);
 for(let i=0;i<8;i++){
  if(i)f.update(.24,null);const before=f.hp,dealt=hit(4);
  assert.ok(Math.abs(dealt-2.64)<1e-10);assert.ok(Math.abs(before-f.hp-2.64)<1e-10);
  assert.equal(f.hitFlash,.22,'small bullets must not re-arm a full-body white flash');
  assert.equal(f.hitstop,.04);assert.equal(f.stunT,0);assert.equal(f.flying,true);
 }
 assert.ok(Math.abs(f._burst-21.12)<1e-8);
});

for(const kind of ['heavy ballistic','nonballistic','melee','city'])test(`${kind} retains its full discrete hit flash`,t=>{
 const {f,hit}=fixture(t,kind!=='city');
 if(kind==='heavy ballistic')hit(14);else if(kind==='nonballistic')hit(4,{ballistic:false});else if(kind==='melee')hit(4,{ballistic:false,strike:true});else hit(4);
 assert.equal(f.hitFlash,1);
});

test('small ballistic flash classification uses post-mitigation damage',t=>{
 const {f,hit}=fixture(t);f.armor=100;const dealt=hit(14);assert.ok(dealt<7.2);assert.equal(f.hitFlash,.22);
});

test('a small bullet never dims a still-active heavy impact',t=>{
 const {f,hit}=fixture(t);hit(14);hit(4);assert.equal(f.hitFlash,1);
});

test('guard and fully stopped ballistic feedback remain on their existing paths',t=>{
 const guarded=fixture(t);guarded.f.guarding=true;guarded.f.faceDir(0,1);guarded.hit(4);assert.equal(guarded.f.hitFlash,0);assert.ok(guarded.f._blocked>0);assert.equal(guarded.f._burst,0);
 const absorbed=fixture(t);assert.equal(absorbed.hit(.4),0);assert.equal(absorbed.f.hitFlash,.35);assert.equal(absorbed.f._burst,0);
});
