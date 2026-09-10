import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ROSTER} from '../src/data/characters.js';
import {POWERS} from '../src/data/creator.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {Fighter} from '../src/engine/entity.js';
import {setAttackOverride,applyAttackOverrides} from '../src/data/attack-tuning.js';

function fixture(){
 const scene=new THREE.Scene(),world={scene,cover:[],ARENA:1000,heightAt:()=>-100,shake(){},punch(){}},combat=new StudioCombat(scene,world);
 const caster={team:1,alive:true,energyInfinite:true,ki:100,powerBuff:1,def:{},pos:new THREE.Vector3(0,50,0),aim3:new THREE.Vector3(0,0,1),spendKi:()=>true,muzzle:o=>o.set(0,50,0)};
 return {combat,caster};
}
for(const id of ['sol','vanguard'])test(`${id} optical energy has finite travel but clears its range within50ms`,()=>{
 const {combat,caster}=fixture(),def=ROSTER.find(d=>d.id===id).abilities.lmb;
 try{
  const b=combat.game.projectiles.spawnBeam(caster,def);b.update(.001,combat.game);
  assert.ok(b._arcLen()>0&&b._arcLen()<10,'optics must travel, not become an instant aim ray');
  for(let i=1;i<50;i++)b.update(.001,combat.game);
  assert.ok(b._arcLen()>def.maxLen*.95,`optical ray only traveled ${b._arcLen()}u by50ms`);
  for(let i=0;i<120;i++){const a=i/120*3;caster.aim3.set(Math.sin(a),0,Math.cos(a));b.update(1/120,combat.game);}
  const chord=new THREE.Vector3().fromArray(b.path,(b.pn-1)*3).sub(b.muzzle);
  assert.ok(chord.angleTo(b.dir)<.16,'thin ray retains a long hose-like tail during a continuous turn');
 }finally{combat.dispose();}
});
test('new ORIGIN beam kits inherit prompt full-range travel, not obsolete slow templates',()=>{
 const {combat,caster}=fixture();
 try{for(const power of POWERS.filter(p=>p.ab.type==='beam')){
  const b=combat.game.projectiles.spawnBeam(caster,power.ab),deadline=power.ab.faceOrigin?.05:.35;
  b.update(.001,combat.game);assert.ok(b._arcLen()<power.ab.maxLen*.1);
  for(let t=.001;t<deadline;t+=.001)b.update(.001,combat.game);
  assert.ok(b._arcLen()>power.ab.maxLen*.95,`${power.id} reached ${b._arcLen()}u/${power.ab.maxLen}u by${deadline}s`);b._dispose(combat.game);
 }}finally{combat.dispose();}
});
test('Studio can retain a fast optical configuration across a serialized override',()=>{
 const def=structuredClone(ROSTER.find(d=>d.id==='sol'));
 const attacks=setAttackOverride({},def,'lmb',{tipSpeed:4000});
 const roundtrip=applyAttackOverrides(def,JSON.parse(JSON.stringify(attacks)));
 assert.equal(roundtrip.abilities.lmb.tipSpeed,4000);assert.equal(def.abilities.lmb.tipSpeed,ROSTER.find(d=>d.id==='sol').abilities.lmb.tipSpeed);
});

test('fast optics cannot damage a body early or pass its receiving surface',()=>{
 const {combat,caster}=fixture(),g=combat.game,victim=new Fighter(structuredClone(ROSTER.find(d=>d.id==='kano')));
 const texture=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);g.vfx._itex=texture;
 victim.pos.set(0,44.8,100);victim.team=2;victim.invuln=0;victim._game=g;g.entities=[victim];
 try{const b=g.projectiles.spawnBeam(caster,ROSTER.find(d=>d.id==='sol').abilities.lmb),hp=victim.hp;
  for(let i=0;i<20;i++)b.update(.001,g);
  assert.equal(victim.hp,hp,'body was damaged before the 100u trip');
  for(let i=0;i<20;i++)b.update(.001,g);
  assert.ok(victim.hp<hp,'fast stream skipped the body');assert.equal(b._bodyContact.fighter,victim);assert.ok(b.tip.position.z<100,'impact passed through receiver');
 }finally{combat.dispose();victim.dispose();texture.dispose();}
});
