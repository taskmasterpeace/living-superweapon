import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Game} from '../src/engine/game.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {setAttackOverride,applyAttackOverrides} from '../src/data/attack-tuning.js';
import {createBeamMaterials} from '../src/engine/beam-surface.js';

function defender(){const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='sol')));f.invuln=0;f.armor=0;f.resist={};f.hp=f.maxHp=10000;f.guarding=true;f.faceDir(0,-1);f.pos.set(0,0,30);return f;}
// A fixed .012 per call used to break guard four times faster at120Hz than30Hz.
for(const hz of [30,60,120])test(`one second of frontal beam guard at ${hz}Hz conserves time-based meter and chip`,()=>{
 const f=defender(),src={pos:new THREE.Vector3(0,0,0)};
 try{for(let i=0;i<hz;i++)f.takeDamage(60/hz,{src,dot:true,hitstop:0,beamDelta:1/hz,beamGuardChip:.22,beamGuardDrain:.28});
 assert.ok(Math.abs(f.guardMeter-.72)<1e-8,`meter ${f.guardMeter}`);
 assert.ok(Math.abs(f.hp-9986.8)<1e-6,`HP ${f.hp}`);
 assert.equal(f.staggerT,0);assert.equal(f.vel.length(),0,'beam pressure must be applied once by reached stream, not again inside guard');
 }finally{f.dispose();}
});
test('rear beam cannot claim frontal guard reduction',()=>{const f=defender();try{f.faceDir(0,1);f.takeDamage(60,{src:{pos:new THREE.Vector3()},dot:true,beamDelta:1,beamGuardChip:.22,beamGuardDrain:.28});assert.equal(f.hp,9940);assert.equal(f.guardMeter,1);}finally{f.dispose();}});
test('Studio authored beam pressure and guard costs reach real spawned stream',()=>{
 const d=structuredClone(ROSTER.find(d=>d.id==='kano'));
 const tuned=applyAttackOverrides(d,setAttackOverride({},d,'lmb',{pushForce:0,guardChip:.1,guardDrain:.12,tipSpeed:900,build:'ray',temper:'steady',sourceGlow:1.4,sourceScale:.8,impactGlow:1.7}));
 const scene=new THREE.Scene(),world={scene,cover:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),f=new Fighter(tuned);
 try{const b=Game.prototype.spawnBeamFor.call(combat.game,f,tuned.abilities.lmb);assert.equal(b.pushForce,0);assert.equal(b.guardChip,.1);assert.equal(b.guardDrain,.12);assert.equal(b.tipSpeed,900);assert.equal(b.build.coreR,.42);assert.equal(b.temper.n,0);assert.equal(b.sourceGlow,1.4);assert.equal(b.sourceScale,.8);assert.equal(b.impactGlow,1.7);assert.throws(()=>setAttackOverride({},d,'lmb',{guardChip:1.1}));}finally{combat.dispose();f.dispose();}
});
test('neutral white beams keep neutral core and sheath rather than becoming red',()=>{
 const m=createBeamMaterials('#ffffff','#ffffff',true);try{const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'};m.core.onBeforeCompile(shader);for(const c of [m.glow.color,shader.uniforms.beamBody.value,shader.uniforms.beamEdge.value])assert.ok(Math.abs(c.r-c.g)<1e-8&&Math.abs(c.g-c.b)<1e-8,'white input produced chromatic beam');}finally{for(const v of [m.core,m.glow,m.tip])v.dispose();}
});
test('roster beams reach their authored full range promptly but remain traveling streams',()=>{
 const scene=new THREE.Scene(),world={scene,cover:[],ARENA:240,heightAt:()=>-100,shake(){},punch(){}},combat=new StudioCombat(scene,world);
 const caster={team:1,alive:true,energyInfinite:true,ki:100,powerBuff:1,def:{},pos:new THREE.Vector3(0,50,0),aim3:new THREE.Vector3(0,0,1),spendKi:()=>true,muzzle:o=>o.set(0,50,0)};
 try{for(const d of ROSTER)for(const a of Object.values(d.abilities))if(a.type==='beam'){
  const b=combat.game.projectiles.spawnBeam(caster,a),deadline=a.faceOrigin?.16:.34;
  b.update(.001,combat.game);assert.ok(b.tip.position.z<a.maxLen*.1,'beam became instant');
  for(let t=.001;t<deadline;t+=.001)b.update(.001,combat.game);
  assert.ok(b.tip.position.z>=a.maxLen*.95,`${d.id}/${a.name} only reached ${b.tip.position.z}/${a.maxLen} by ${deadline}s`);b._dispose(combat.game);
 }}finally{combat.dispose();}
});
