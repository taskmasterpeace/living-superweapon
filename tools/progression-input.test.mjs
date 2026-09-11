import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {runSlot} from '../src/engine/abilities.js';
import {AI} from '../src/engine/ai.js';
import {Projectiles} from '../src/engine/projectiles.js';
function fixture(){
  const noop=()=>{},messages=[],def={...ROSTER.find(d=>d.id==='kano'),progression:{unlocks:{q:4}},
    abilities:{q:{name:'Level Burst',type:'projectile',cost:8,cd:.6,damage:20,speed:90}}};
  const f=new Fighter(def),game={scene:new THREE.Scene(),time:0,entities:[],isHuman:()=>true,hud:{feed:t=>messages.push(t)},
    audio:{zap:noop,kiRelease:noop},vfx:{borrowLight:()=>new THREE.PointLight(),returnLight:noop},muzzleFlash:noop};
  game.projectiles=new Projectiles(game);f._game=game;f.level=3;f.ki=100;
  return {f,game,messages,close(){for(const p of game.projectiles.list)p._dispose(game);f.dispose();}};
}
test('shared player/replicated slot input refuses a locked launch without ki, cooldown or effects',()=>{
  const x=fixture();try{
    const st=x.f.slots.q;runSlot(x.f,'q',{pressed:true,held:true,released:false,dt:1/60},x.game);
    assert.equal(x.f.ki,100);assert.equal(st.cd,0);assert.equal(x.game.projectiles.list.length,0);
    assert.match(x.messages.join(' '),/level 4/i);
    x.f.level=4;runSlot(x.f,'q',{pressed:true,held:true,released:false,dt:1/60},x.game);
    assert.equal(x.f.slots.q,st);assert.equal(x.f.ki,92);assert.ok(st.cd>0);assert.equal(x.game.projectiles.list.length,1);
  }finally{x.close();}
});
test('AI selection ignores locked attacks and discovers them at the unlock boundary',()=>{
  const x=fixture();try{
    const ai=new AI(x.f);ai.style='beamer';
    assert.equal(ai.pick(30,0,false,null),null);
    x.f.level=4;assert.equal(ai.pick(30,0,false,null),'q');
  }finally{x.close();}
});

test('a later progression lock does not swallow control of an already-paid remote shot',()=>{
 const x=fixture();try{
  const st=x.f.slots.q;st.def={...st.def,remoteDetonate:true};let detonations=0;
  st.remoteShot={caster:x.f,dead:false,detonate(){detonations++;this.dead=true;}};x.f.ki=0;
  runSlot(x.f,'q',{pressed:true,held:true,released:false,dt:1/60},x.game);
  assert.equal(detonations,1);assert.equal(x.f.ki,0);assert.equal(st.remoteShot,null);assert.deepEqual(x.messages,[]);
 }finally{x.close();}
});
