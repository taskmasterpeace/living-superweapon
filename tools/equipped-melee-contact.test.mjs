import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Game} from '../src/engine/game.js';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {TYPES} from '../src/engine/abilities.js';
import {snapshotWeaponSurface} from '../src/engine/melee-weapon-contact.js';
import {resolveAbilityMeleeContact} from '../src/engine/ability-melee-contact.js';
import {bladeById,armoryList} from '../src/data/armory.js';
import {unmountHeldWeapon} from '../src/engine/weapon-emission.js';

for(const kind of ['bat','claws'])for(const state of ['hit','miss','startup','recovery','hidden','detached','stunned'])test(`equipped ${kind} slot: ${state}`,()=>{
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='merc'))),b=new Fighter(structuredClone(ROSTER.find(d=>d.id==='kano')));
 let hits=0,cones=0;
 const g={entities:[f,b],isHuman:()=>false,isFoe:(a,b)=>a!==b,world:{cover:[],interiors:[],shake(){},punch(){}},audio:{zap(){},impact(){},boom(){}},vfx:{impact(){},impactStar(){}},trail(){},slowmo(){},coneFoe(){cones++;return b;}};
 try{
  for(const x of [f,b]){x._openSky=true;x.invuln=0;x._animate(1);}
  f.aim.set(0,0,1);f.aim3.copy(f.aim);
  Game.prototype.equipFrom.call(g,f,{id:'weapon-test',mesh:kind,ab:{type:'melee',gear:true,cost:4,cd:.6,damage:18,reach:15}},{primary:true});
  const offhandWeapons=f.parts.armL.children[2].children.filter(o=>o.userData.weaponKind);
  assert.ok(offhandWeapons.length,'MERC has native off-hand equipment');
  if(kind==='bat')assert.ok(offhandWeapons.every(o=>!o.visible),'two-handed mount must stow off-hand equipment');
  const st=f.slots.lmb,energy=f.ki;
  TYPES.melee(f,st.def,st,g,{pressed:true,dt:1/60});
  assert.equal(st,f.slots._gear);assert.ok(st.weaponContact);
  const cd=st.cd,paid=f.ki;assert.ok(paid<energy);assert.ok(cd>0);
  f.advanceActionPose(state==='startup'?.01:state==='recovery'?.25:.1);f._animate(1/60);f.obj.updateMatrixWorld(true);
  const tip=snapshotWeaponSurface(f._gearMesh).points.at(-1);
  b.pos.add(tip.clone().sub(b.parts.torso.getWorldPosition(new T.Vector3())));
  if(state==='miss')b.pos.x+=100;
  b.obj.updateMatrixWorld(true);b.takeDamage=()=>{hits++;};
  if(state==='hidden')f._gearMesh.visible=false;
  if(state==='detached')f._gearMesh.removeFromParent();
  if(state==='stunned'){f.stunT=.5;f.advanceActionPose(0);}
  for(let i=0;i<2;i++){TYPES.melee(f,st.def,st,g,{dt:1/60});resolveAbilityMeleeContact(f,g);}
  assert.equal(hits,state==='hit'?1:0,'physical contact only, once per swing');
  assert.equal(cones,0,'never fall back to the old cone');
  assert.equal(f.ki,paid,'contact must not pay twice');
  TYPES.melee(f,st.def,st,g,{pressed:true,dt:0});assert.equal(f.ki,paid,'cooldown rejects another press');
  if(state==='detached')f.parts.armR.children[2].add(f._gearMesh);
  const saved=f._heldMount.hidden.map(([o,visible])=>[o,visible]);unmountHeldWeapon(f,g);
  for(const [o,visible]of saved)assert.equal(o.visible,visible,'unmount restores exact previous visibility');
 }finally{f.dispose();b.dispose();}
});

test('bat catalog and pickup retain the same model identity',()=>{
 const row=bladeById('bat');assert.ok(row);assert.ok(armoryList().some(r=>r.id==='bat'));
 assert.equal(Game.prototype._gearKind(row.ab),row.mesh);
});
