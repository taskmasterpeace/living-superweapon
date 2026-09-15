import test from 'node:test';
import assert from 'node:assert/strict';
import {Fighter} from '../src/engine/entity.js';
import {Game} from '../src/engine/game.js';
import {ROSTER} from '../src/data/characters.js';

function fixture(kind='scout'){
 const noop=()=>{},f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='sarge')));
 const cover={x:0,z:0,hx:8,hz:10,bottom:0,top:20,hp:120,maxHp:120,
  ...(kind==='scout'?{frontlineVehicle:true}:kind==='aircraft'?{frontlineAircraft:true}:{})};
 const game={world:{ARENA:900,heightAt:()=>0,cover:[cover],interiors:[],setBlockCracks:noop},
  audio:{},particles:{spawn:noop,burst:noop},damageBlock:Game.prototype.damageBlock,
  _ventHazard:noop,shatterBlock(c){c.hp=0;},onSlam:noop,onHit:noop};
 f._game=game;f._openSky=true;f.pos.set(0,0,-10-f.radius+.1);
 return {f,cover,game,hit(flags={}){Object.assign(f,flags);f.vel.set(0,0,45);f._physics(1/60,game);},close(){f.dispose();}};
}

for(const kind of ['scout','aircraft'])test(`ordinary ground contact cannot damage parked ${kind} or add impact hitstop`,()=>{
 const t=fixture(kind);try{
  t.hit();assert.equal(t.cover.hp,120);assert.equal(t.f.hitstop,0);
  assert.ok(t.f.pos.z<=-10-t.f.radius,'Hull must still stop the walker');
 }finally{t.close();}
});

for(const flags of [{launchT:1},{burstT:1},{sprintT:1},{_slideT:1},{flying:true}])test(`powered or launched impact retains vehicle damage: ${Object.keys(flags)[0]}`,()=>{
 const t=fixture();try{
  if(flags.flying)t.f.pos.y=5;
  const launcher={name:'launcher'};if(flags.launchT)t.f.lastHitBy=launcher;
  t.hit(flags);assert.ok(t.cover.hp<120);assert.ok(t.f.hitstop>0);
  assert.equal(t.cover._breaker,flags.launchT?launcher:t.f,'Launcher keeps impact ownership');
 }finally{t.close();}
});

test('ordinary destructible cover keeps its existing collision-damage behavior',()=>{
 const t=fixture('wall');try{t.hit();assert.ok(t.cover.hp<120);}finally{t.close();}
});

test('fast grazing along a parked hull cannot turn tangential speed into damage',()=>{
 const t=fixture();try{t.f.flying=true;t.f.pos.y=5;t.f.vel.set(180,0,.1);t.f._physics(1/6000,t.game);assert.equal(t.cover.hp,120);}finally{t.close();}
});
test('moving hull uses relative speed rather than world speed',()=>{
 const t=fixture();try{t.f.pos.y=5;t.cover._impactBody={vx:0,vz:44};t.hit({flying:true});assert.equal(t.cover.hp,120);}finally{t.close();}
});
test('the same hull contact cannot debit HP twice in one simulation instant',()=>{
 const t=fixture();try{t.game.time=1;t.f.flying=true;t.f._wallContact(t.game,t.cover,60,'z');const hp=t.cover.hp;t.f._wallContact(t.game,t.cover,60,'z');assert.equal(t.cover.hp,hp);}finally{t.close();}
});

test('launched grazing along a static wall cannot turn tangential speed into crash injury',()=>{
 const t=fixture('wall');try{t.f.launchT=1;t.f.lastHitT=0;t.f.vel.set(180,0,.1);const hp=t.f.hp;t.f._physics(1/6000,t.game);assert.equal(t.f.hp,hp);assert.equal(t.cover.hp,120);}finally{t.close();}
});
