import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveConstructPolicy,debitConstructKi,retireOwnedConstructs,settleConstructUpkeep} from '../src/engine/construct-policy.js';
import * as THREE from 'three';
import {Construct} from '../src/engine/summons.js';
import {Fighter} from '../src/engine/entity.js';
import {Game} from '../src/engine/game.js';
import {MeleeSystem} from '../src/engine/melee.js';
import {runSlot,cancelHeldAttacks} from '../src/engine/abilities.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {ROSTER} from '../src/data/characters.js';

test('resource policies are exclusive and old definitions stay timed',()=>{
 assert.deepEqual(resolveConstructPolicy({construct:'wall',duration:9}),{mode:'timed',kiPerSec:0,kiPerDamage:0});
 assert.deepEqual(resolveConstructPolicy({construct:'wall',constructLifetime:'damage',constructKiPerSec:20,constructKiPerDamage:2}),{mode:'damage',kiPerSec:0,kiPerDamage:2});
 assert.deepEqual(resolveConstructPolicy({construct:'tank',constructLifetime:'upkeep'}),{mode:'upkeep',kiPerSec:12,kiPerDamage:0});
 assert.deepEqual(resolveConstructPolicy({construct:'fist'}),{mode:'timed',kiPerSec:0,kiPerDamage:0});
});
test('policy rejects unsupported modes, resource forms and malformed rates',()=>{
 for(const construct of [null,'',false,0,'unknown'])assert.throws(()=>resolveConstructPolicy({construct}),/form/);
 for(const construct of ['fist','hammer','turret'])assert.throws(()=>resolveConstructPolicy({construct,constructLifetime:'upkeep'}),/wall|tank/);
 for(const constructLifetime of ['both','forever',null])assert.throws(()=>resolveConstructPolicy({construct:'wall',constructLifetime}),/lifetime/);
 for(const constructKiPerSec of [0,-1,101,NaN,Infinity,'12'])assert.throws(()=>resolveConstructPolicy({construct:'wall',constructKiPerSec}),/constructKiPerSec/);
 for(const constructKiPerDamage of [0,-1,11,NaN,Infinity,'1'])assert.throws(()=>resolveConstructPolicy({construct:'wall',constructKiPerDamage}),/constructKiPerDamage/);
});
test('construct debit exhausts exactly without overdrawing or refunding',()=>{
 const owner={ki:3,energyInfinite:false};
 assert.deepEqual(debitConstructKi(owner,5),{spent:3,exhausted:true});assert.equal(owner.ki,0);
 assert.deepEqual(debitConstructKi(owner,5),{spent:0,exhausted:true});
 for(const amount of [-1,NaN,Infinity])assert.throws(()=>debitConstructKi(owner,amount),RangeError);
 owner.energyInfinite=true;assert.deepEqual(debitConstructKi(owner,100),{spent:0,exhausted:false});
 owner.energyInfinite=false;owner.ki=NaN;assert.throws(()=>debitConstructKi(owner,1),RangeError);
});
function fixture(ki=20){
 const owner={ki,alive:true,energyInfinite:false},other={ki:100,alive:true},g={entities:[],constructs:[],warnings:[]};
 g.entities.push(owner,other);g.onDrained=o=>g.warnings.push(o);
 const add=(mode,rate=5,who=owner)=>{
  const c={owner:who,dead:false,kiSpent:0,policy:resolveConstructPolicy({construct:'wall',constructLifetime:mode,constructKiPerSec:rate}),
   _dispose(game,reason){assert.equal(game,g);if(this.dead)return;this.dead=true;this.disposeCount=(this.disposeCount||0)+1;this.reason=reason;}};
  g.constructs.push(c);return c;
 };
 return {g,owner,other,add};
}
for(const hz of [30,60,120])test(`upkeep only debits simulation time at ${hz} Hz`,()=>{
 const {g,owner,add}=fixture(),upkeep=add('upkeep'),damage=add('damage'),timed=add('timed');
 settleConstructUpkeep(g,0);assert.equal(owner.ki,20);
 for(let i=0;i<2*hz;i++)settleConstructUpkeep(g,1/hz);
 assert.ok(Math.abs(owner.ki-10)<1e-9);assert.ok(Math.abs(upkeep.kiSpent-10)<1e-9);
 assert.equal(damage.kiSpent,0);assert.equal(timed.kiSpent,0);assert.deepEqual(g.warnings,[]);
});
for(const hz of [30,60,120])test(`upkeep exhausts on the final budget tick, not a free extra frame at ${hz} Hz`,()=>{
 const {g,owner,add}=fixture(),c=add('upkeep');
 for(let i=0;i<4*hz;i++)settleConstructUpkeep(g,1/hz);
 assert.equal(owner.ki,0);assert.equal(c.dead,true);assert.equal(g.warnings.length,1);
 assert.ok(Math.abs(c.kiSpent-20)<1e-9);
});
for(const reverse of [false,true])test(`shared final upkeep tick retires all resource siblings, reverse=${reverse}`,()=>{
 const {g,owner,other,add}=fixture(6),a=add('upkeep',3),b=add('upkeep',4),d=add('damage'),t=add('timed'),unrelated=add('damage',5,other);
 if(reverse)g.constructs.reverse();settleConstructUpkeep(g,1);
 assert.equal(owner.ki,0);assert.ok(a.dead&&b.dead&&d.dead);assert.ok(!t.dead&&!unrelated.dead);
 assert.equal(a.reason,'energy-depleted');assert.equal(g.warnings.length,1);
 assert.ok(Math.abs(a.kiSpent+b.kiSpent-6)<1e-9);assert.ok(Math.abs(a.kiSpent-18/7)<1e-9);
 settleConstructUpkeep(g,1);assert.equal(g.warnings.length,1);assert.equal(a.disposeCount,1);
});
test('KO keeps legacy timed constructs; removal retires all owned modes',()=>{
 const {g,owner,add}=fixture(),a=add('upkeep'),b=add('damage'),t=add('timed');
 owner.alive=false;settleConstructUpkeep(g,1);assert.ok(a.dead&&b.dead);assert.equal(t.dead,false);assert.equal(owner.ki,20);
 g.entities.splice(g.entities.indexOf(owner),1);settleConstructUpkeep(g,1);assert.ok(t.dead);assert.equal(t.reason,'owner-removed');
 assert.deepEqual(g.warnings,[]);assert.equal(retireOwnedConstructs(g,owner,'again'),0);
});
test('infinite cores pay nothing but still retire on owner KO',()=>{
 const {g,owner,add}=fixture(0),c=add('upkeep');owner.energyInfinite=true;
 settleConstructUpkeep(g,100);assert.equal(owner.ki,0);assert.equal(c.kiSpent,0);assert.equal(c.dead,false);
 owner.alive=false;settleConstructUpkeep(g,1);assert.equal(c.dead,true);assert.deepEqual(g.warnings,[]);
});
test('already-exhausted finite owner cannot retain a damage-backed construct',()=>{
 const {g,add}=fixture(0),c=add('damage');settleConstructUpkeep(g,1/60);
 assert.equal(c.dead,true);assert.equal(g.warnings.length,1);settleConstructUpkeep(g,1/60);assert.equal(g.warnings.length,1);
});
test('explicit owner retirement does not mutate an iterated list or touch other owners',()=>{
 const {g,owner,other,add}=fixture(),a=add('upkeep'),t=add('timed'),u=add('damage',5,other);
 const before=[...g.constructs];assert.equal(retireOwnedConstructs(g,owner,'owner-ko',true),1);
 assert.equal(a.dead,true);assert.equal(t.dead,false);assert.equal(u.dead,false);assert.deepEqual(g.constructs,before);
 assert.equal(retireOwnedConstructs(g,owner,'disposed'),1);assert.equal(t.dead,true);assert.equal(t.disposeCount,1);
});

// Native boundaries: only renderer/audio/world presentation is the minimal Studio
// world. Construct, Fighter, runSlot, Game.spawnConstruct and Game.update are real.
function native(t){
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],coverAll:[],ARENA:240,heightAt:()=>0,shake(){},punch(){},refreshFogBoxes(){this.fogUpdates=(this.fogUpdates||0)+1;}};
 const stage=new StudioCombat(scene,world),g=stage.game,f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='aurum')));
 scene.add(f.obj);g.entities=[f];g.player=f;f._game=g;f.isPlayer=true;f.level=10;f.ki=100;f.invuln=0;f.sheet.kiRegenMult=0;
 g.aimPoint.set(0,0,30);g.warnings=[];g.denials=[];g.explosions=[];
 g.onDrained=o=>g.warnings.push(o);g.onNoKi=(o,key)=>g.denials.push(key);
 g.areaDamage=(...args)=>g.explosions.push(args);
 const def=(mode='timed',extra={})=>({type:'construct',construct:'wall',duration:9,cost:12,cd:7,holdTrigger:true,color:'#5fd66a',constructLifetime:mode,...extra});
 const slot=(key,mode,extra={})=>(f.slots[key]={def:def(mode,extra),cd:0,active:null});
 const spawn=(mode='timed',extra={})=>g.spawnConstruct(f,def(mode,extra));
 const input=(key='q',edge='pressed')=>runSlot(f,key,{pressed:false,held:false,released:false,[edge]:true,dt:1/60},g);
 t.after(()=>{stage.dispose();f.dispose();});
 return {g,f,world,stage,def,slot,spawn,input};
}
test('native timed wall retains its timer, payment and owner-KO survival',t=>{
 const {g,f,world,slot,input}=native(t),s=slot('q','timed');input();const c=s.active;
 assert.ok(c instanceof Construct);assert.equal(f.ki,88);assert.ok(s.cd>0);
 c.update(1,g);assert.equal(c.life,8);assert.equal(f.ki,88);
 f._ko();assert.equal(c.dead,false);assert.equal(world.cover.length,1);assert.equal(s.active,null);
});
test('native upkeep wall outlives source duration and charges only grouped simulation time',t=>{
 const {g,f,spawn}=native(t),c=spawn('upkeep',{constructKiPerSec:5});f.ki=100;
 for(let i=0;i<11;i++){settleConstructUpkeep(g,1);assert.equal(c.update(1,g),true);}
 assert.equal(c.life,Infinity);assert.equal(f.ki,45);assert.equal(c.kiSpent,55);
});
test('native damage wall idles indefinitely without recurring debit',t=>{
 const {g,f,spawn}=native(t),c=spawn('damage',{constructKiPerSec:100});f.ki=20;
 settleConstructUpkeep(g,20);assert.equal(c.update(20,g),true);assert.equal(f.ki,20);assert.equal(c.kiSpent,0);
});
test('native upkeep accounts for a post-entry pool without changing entry cost',t=>{
 const {g,f,slot,input}=native(t),s=slot('q','upkeep',{constructKiPerSec:5});input();assert.equal(f.ki,88);
 f.ki=20;settleConstructUpkeep(g,2);assert.equal(f.ki,10);assert.equal(s.active.kiSpent,10);
});
for(const reverse of [false,true])test(`native shared final tick clears cover and all resource siblings, reverse=${reverse}`,t=>{
 const {g,f,world,spawn}=native(t),a=spawn('upkeep',{constructKiPerSec:3}),b=spawn('upkeep',{constructKiPerSec:4}),d=spawn('damage'),legacy=spawn();
 f.ki=6;if(reverse)g.constructs.reverse();const before=[...g.constructs];settleConstructUpkeep(g,1);
 assert.equal(f.ki,0);assert.ok(a.dead&&b.dead&&d.dead);assert.equal(legacy.dead,false);assert.equal(world.cover.length,1);
 assert.equal(a.obj.parent,null);assert.equal(a.surfaceFx.disposed,true);assert.equal(a.reason,'energy-depleted');assert.equal(g.warnings.length,1);
 assert.ok(Math.abs(a.kiSpent-18/7)<1e-9);assert.ok(Math.abs(b.kiSpent-24/7)<1e-9);assert.deepEqual(g.constructs,before);
 assert.equal(a.update(1,g),false);settleConstructUpkeep(g,1);assert.equal(g.warnings.length,1);
});
test('native KO retires resource cover immediately while dispose retires every owned mode',t=>{
 const {g,f,world,spawn}=native(t),a=spawn('upkeep'),b=spawn('damage'),legacy=spawn();
 f._ko();assert.ok(a.dead&&b.dead);assert.equal(a.reason,'owner-ko');assert.equal(legacy.dead,false);assert.equal(world.cover.length,1);
 f.dispose();assert.equal(legacy.dead,true);assert.equal(legacy.reason,'owner-removed');assert.equal(world.cover.length,0);
 assert.ok(world.fogUpdates>=6);assert.equal(g.warnings.length,0);
});
test('native membership removal retires all constructs without owner disposal',t=>{
 const {g,f,world,spawn}=native(t),a=spawn('upkeep'),legacy=spawn();g.entities=[];
 settleConstructUpkeep(g,1/60);assert.ok(a.dead&&legacy.dead);assert.equal(world.cover.length,0);assert.equal(f.ki,100);
});
test('native disposal is idempotent and releases geometry, cover and held victims once',t=>{
 const {g,f,world,spawn}=native(t),c=spawn();const counts=new Map();
 c.obj.traverse(o=>{for(const r of [o.geometry,...(Array.isArray(o.material)?o.material:[o.material])].filter(Boolean))if(!counts.has(r)){counts.set(r,0);r.addEventListener('dispose',()=>counts.set(r,counts.get(r)+1));}});
 c._victim={grabbedBy:f,state:'hit'};c._dispose(g,'dismissed');c._dispose(g,'again');
 assert.equal(c.reason,'dismissed');assert.equal(c._victim.grabbedBy,null);assert.equal(c._victim.state,'idle');assert.equal(world.cover.length,0);
 assert.ok([...counts.values()].every(n=>n===1));assert.equal(c.update(1,g),false);
});
for(const cd of [0,5])test(`native resource second press dismisses without affordability, fee or cooldown reset (cd=${cd})`,t=>{
 const {g,f,world,slot,input}=native(t),s=slot('q','upkeep');input();const c=s.active;f.ki=1;s.cd=cd;
 input();assert.equal(c.dead,true);assert.equal(c.reason,'dismissed');assert.ok(s.active===null);assert.equal(world.cover.length,0);
 assert.equal(f.ki,1);assert.equal(s.cd,cd);assert.deepEqual(g.denials,[]);assert.deepEqual(g.explosions,[]);
});
test('native resource release and focus-loss cancellation are not dismissal gestures',t=>{
 const {g,f,slot,input}=native(t),s=slot('q','damage');input();const c=s.active;
 input('q','released');cancelHeldAttacks(f);assert.equal(c.dead,false);assert.ok(s.active===c);assert.equal(g.explosions.length,0);
 input('q','held');assert.equal(g.constructs.length,1);
});
test('native legacy timed hold-release still detonates through its original action path',t=>{
 const {g,slot,input}=native(t),s=slot('q','timed');input();const c=s.active;input('q','released');
 assert.equal(c.life,0);assert.equal(g.explosions.length,1);assert.equal(c.update(1/60,g),false);
});
test('native slot registration prevents duplicate spawn and rebinds a lost active reference',t=>{
 const {g,f,slot,input}=native(t),s=slot('q','damage');input();const c=s.active;
 assert.equal(c.slotKey,'q');assert.ok(c.slotState===s);assert.ok(g.spawnConstruct(f,s.def,s)===c);assert.equal(g.constructs.length,1);
 s.active=null;f.ki=1;s.cd=3;input();assert.equal(c.dead,true);assert.equal(g.constructs.length,1);assert.equal(f.ki,1);assert.deepEqual(g.denials,[]);
});
test('native replaced slot state retires old ownership before spawning its replacement',t=>{
 const {g,f,slot,input}=native(t),old=slot('q','damage');input();const c=old.active;
 const replacement=slot('q','upkeep');input();const next=replacement.active;
 assert.ok(c.dead);assert.equal(c.reason,'slot-replaced');assert.ok(next instanceof Construct);assert.ok(next!==c);
 assert.equal(g.constructs.filter(x=>!x.dead&&x.slotKey==='q').length,1);assert.equal(f.ki,76);
 c._dispose(g);assert.ok(replacement.active===next);
});
test('native replacement definitions cannot silently reuse resource mode on a timed recast',t=>{
 const {g,slot,input,def}=native(t),s=slot('q','damage');input();const c=s.active;s.def=def('timed');s.cd=0;input();
 assert.equal(c.dead,true);assert.equal(c.reason,'slot-replaced');assert.ok(s.active!==c);assert.equal(s.active.life,9);
 assert.equal(s.active.policy.mode,'timed');assert.equal(g.constructs.filter(x=>!x.dead).length,1);
});
for(const blocked of ['hitstop','staggerT','stunT','frozenT','grabbedBy','dead','locked'])test(`native dismissal preserves actor and unlock gate: ${blocked}`,t=>{
 const {f,slot,input}=native(t),s=slot('q','damage');input();const c=s.active;f.ki=1;s.cd=0;
 if(blocked==='dead')f.state='ko';else if(blocked==='locked'){f.level=1;f.def.progression={unlocks:{q:10}};}else f[blocked]=blocked==='grabbedBy'?{}:1;
 input();assert.equal(c.dead,false);assert.ok(s.active===c);assert.equal(f.ki,1);
 if(blocked==='grabbedBy')f.grabbedBy=null;
});
test('native infinite resource owner survives zero pool but not KO',t=>{
 const {g,f,spawn}=native(t),c=spawn('upkeep');f.energyInfinite=true;f.ki=0;
 settleConstructUpkeep(g,100);assert.equal(c.update(100,g),true);assert.equal(c.kiSpent,0);assert.deepEqual(g.warnings,[]);
 f._ko();assert.equal(c.dead,true);assert.deepEqual(g.warnings,[]);
});
test('native zero-time presentation neither debits nor advances construct state',t=>{
 const {g,f,spawn}=native(t),c=spawn('upkeep');const pos=c.pos.clone();settleConstructUpkeep(g,0);c.update(0,g);
 assert.equal(f.ki,100);assert.equal(c.stateT,0);assert.equal(c.life,Infinity);assert.deepEqual(c.pos,pos);
});
test('native Game settles once after Fighter regen and before projectiles',t=>{
 const {g,f,spawn}=native(t),c=spawn('upkeep',{constructKiPerSec:10});f.ki=1;f.sheet.kiRegenMult=1;f._medChecked=true;
 Object.assign(g,{running:true,pad:{update(){}},audio:{...g.audio,sweep(){}},humans:[],minions:[],controlPlayer(){},controlBot(){},isHuman:()=>true,updateAudioListener(){},resolveBodies(){},updateItems(){},updatePortals(){},melee:new MeleeSystem(g)});
 const stop=new Error('stop at projectile boundary');g.projectiles.update=()=>{throw stop;};
 assert.throws(()=>Game.prototype.update.call(g,.05),e=>e===stop);
 assert.ok(Math.abs(f.ki-.9)<1e-9,`native 8/s regen then 10/s upkeep should leave .9, got ${f.ki}`);assert.equal(c.kiSpent,.5);
});
test('native raw invalid resource form fails before entry payment or scene allocation',t=>{
 const {g,f,slot,input}=native(t),s=slot('q','upkeep',{construct:'fist'}),before=g.scene.children.length;
 assert.throws(()=>input(),/wall|tank/);assert.equal(f.ki,100);assert.equal(s.cd,0);assert.equal(g.scene.children.length,before);assert.equal(g.constructs.length,0);
});
test('native old disposal cannot clear a newer object in the same slot state',t=>{
 const {g,slot,input,spawn}=native(t),s=slot('q','damage');input();const c=s.active,next=spawn('damage');s.active=next;
 c._dispose(g,'slot-replaced');assert.ok(s.active===next);assert.equal(next.dead,false);
});
test('native direct resource construction cleans its collider even without list registration',t=>{
 const {g,f,world,def}=native(t),c=new Construct(g,f,def('damage'));f.ki=0;
 t.after(()=>c._dispose(g));assert.equal(c.update(1/60,g),false);
 assert.equal(c.dead,true);assert.equal(world.cover.length,0);assert.equal(c.obj.parent,null);assert.equal(g.warnings.length,1);
});
test('native update cannot fire a retired turret or a removed owner turret',t=>{
 const {g,f,spawn}=native(t),c=spawn('timed',{construct:'turret'});c._dispose(g,'dismissed');
 assert.equal(c.update(.5,g),false);
 const d=spawn('timed',{construct:'turret'});f._remove=true;assert.equal(d.update(.5,g),false);assert.equal(d.reason,'owner-removed');
 assert.equal(g.projectiles.list.length,0);
});
