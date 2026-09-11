import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AI} from '../src/engine/ai.js';

function fixture(type='projectile'){
  const st={def:{type,remoteDetonate:true,cost:10},cd:1};
  const bot={def:{abilities:{lmb:st.def}},slots:{lmb:st},team:1,alive:true,hp:100,maxHp:100,ki:0,maxKi:100,
    facing:0,pos:new THREE.Vector3(),aim:new THREE.Vector3(0,0,1)};
  const target={alive:true,team:2,pos:new THREE.Vector3(0,0,60),vel:new THREE.Vector3()};
  const shot={caster:bot,dead:false,detonate(){},pos:new THREE.Vector3(0,5,56),blast:12};
  if(type==='beam'){shot.path=new Float32Array([0,5,3,0,5,56]);shot.pn=2;shot.detonateRadius=12;st.active=shot;}
  else st.remoteShot=shot;
  const ai=new AI(bot);ai._errT=10;ai.gcd=100;ai._aimA=0;
  const game={player:target,entities:[bot,target],canSee:()=>true,isFoe:(a,b)=>a.team!==b.team};
  // Establish acquisition through the real intent path, including target
  // identity; setting _lastSeen alone no longer means this target was acquired.
  for(let i=0;i<60;i++)ai.intent(1/60,game);
  return {ai,bot,target,shot,st,game,step:()=>ai.intent(1/60,game)};
}

for(const type of ['projectile','charge','beam'])test(`${type}: acquired visible target near real tip produces a second-press intent at zero ki`,()=>{
  const f=fixture(type);f.ai.action={key:'lmb',t:1};
  assert.equal(f.step().slots.lmb.pressed,true);assert.equal(f.ai.action,null);
});

test('remote decisions respect sight, acquisition, altitude, ownership and live shot state',()=>{
  const variants=[
    f=>{f.game.canSee=()=>false;},f=>{f.ai._acq=1;},
    f=>{f.shot.pos.y=90;},f=>{f.shot.caster={team:2};},
    f=>{f.shot.dead=true;},f=>{f.shot.pos.z=10;},
  ];
  for(const change of variants){const f=fixture();change(f);assert.equal(f.step().slots.lmb.pressed,false);}
});

test('AI does not reselect a live remote shot as if launching another attack',()=>{
  const f=fixture();f.st.cd=0;f.bot.ki=100;f.ai.byType={projectile:['lmb']};
  assert.equal(f.ai.pick(60,0,false,f.target),null);
});

test('detonating LMB does not orphan an unrelated RMB charge action',()=>{
  const f=fixture();f.bot.slots.rmb={def:{type:'beam',charge:true},cd:0,charging:true,chargeT:.4};
  f.ai.action={key:'rmb',t:1};
  const intent=f.step();
  assert.equal(intent.slots.lmb.pressed,true);
  assert.equal(intent.slots.rmb.held,true);assert.equal(f.ai.action?.key,'rmb');
  assert.ok(f.ai.action.t<1,'the unrelated charge action must still advance');
});
