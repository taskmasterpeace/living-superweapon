import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {StudioCombat,supportsAttackRehearsal} from '../src/tool/studio-combat.js';
import {StudioPreview} from '../src/tool/studio-preview.js';
import {StudioAudio} from '../src/tool/studio-audio.js';
import {Fighter} from '../src/engine/entity.js';
import {buildDef,freshPicks} from '../src/data/creator.js';
import {profileFromDef} from '../src/tool/studio-profile.js';
import {attackIdentity,setAttackOverride} from '../src/data/attack-tuning.js';
import {applyProfile,DraftHistory} from '../src/tool/studio-profile.js';

const near=(a,b,why='')=>assert.ok(Math.abs(a-b)<1e-7,`${why}: ${a} != ${b}`);
function sameSemantic(a,b,path='state'){
 if(typeof a==='number'&&typeof b==='number'){assert.ok(Math.abs(a-b)<1e-6,`${path}: ${a} != ${b}`);return;}
 if(a&&typeof a==='object'){assert.deepEqual(Object.keys(a),Object.keys(b),path);for(const key of Object.keys(a))sameSemantic(a[key],b[key],`${path}.${key}`);return;}
 assert.equal(a,b,path);
}
function fixture(t,{forms=['cannon','shield'],reverse=false,settings={}}={}){
 const picks=freshPicks();picks.name='Nanite Studio';picks.flightTier=3;
 forms.forEach((form,i)=>picks.slots[i?'q':'lmb']=`nanite-${form}`);
 const def=buildDef(picks,'cx_nanite_studio');
 for(const ab of Object.values(def.abilities))if(ab.naniteForm)Object.assign(ab,settings);
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){},crater(){}};
 const sound=new StudioAudio(),stage=new StudioCombat(scene,world,sound.audio),f=new Fighter(def);
 Object.assign(stage,{slot:reverse&&forms.length>1?'q':'lmb',secondarySlot:forms.length>1?(reverse?'lmb':'q'):null,pattern:'nanite'});
 scene.add(f.obj);f._openSky=true;f.invuln=0;stage.reset(f,true,'attack');
 const texture=new THREE.Texture();stage.game.vfx._impactTex=()=>texture;
 const p=Object.create(StudioPreview.prototype);
 Object.assign(p,{def,profile:profileFromDef(def),fighter:f,scene,camera:world.camera,combat:stage,state:'attack',view:'orbit',time:0,
  sound,travelDelta:new THREE.Vector3(),floor:new THREE.Object3D(),grid:new THREE.Object3D(),renderer:{render(){}},onFrame(){},
  controls:{target:new THREE.Vector3(0,12,0),update(){}},chase:{sun:new THREE.DirectionalLight(),sunOff:new THREE.Vector3(),snapChase(){}},_meleeZoom:1});
 world.camera.position.set(20,18,27);
 const advance=(from,to)=>{for(let i=Math.round(from*60)+1;i<=Math.round(to*60);i++){p.time=i/60;p.step(1/60,false,false);}};
 t.after(()=>{stage.dispose();p.fighter.dispose();f.dispose();sound.dispose();texture.dispose();});
 return {p,stage,f,def,world,advance};
}
const cells=f=>[...(f._nanites?.modules.values()||[])].map(m=>({slot:m.slot,assemblyT:m.assemblyT,deployed:m.deployed,unlocked:m.unlocked,
 cells:m.cells.map(c=>({hp:c.hp,quietT:c.quietT,reformT:c.reformT,broken:c.broken}))}));

test('genuine shield alone is selectable without admitting a malformed shield source',t=>{
 const {p,def}=fixture(t,{forms:['shield']});assert.equal(supportsAttackRehearsal(def.abilities.lmb),true);
 assert.equal(supportsAttackRehearsal({type:'naniteShield',name:'Fake shield'}),false);
 assert.equal(p.setCombat({slot:'lmb',pattern:'nanite'}),true);assert.equal(p.duration,8);
});
test('effective arm conflict rejects before actor disposal, draft replacement or clock mutation',t=>{
 const {p,def}=fixture(t),profile=structuredClone(p.profile),source=def.abilities.lmb;
 profile.attacks.lmb={source:structuredClone(source),identity:attackIdentity(source),values:{naniteAttachment:'left-forearm'}};
 const old={f:p.fighter,def:p.def,profile:p.profile,time:p.time};let disposed=0;p.fighter.obj.addEventListener('removed',()=>disposed++);
 assert.throws(()=>p.setProfile(def,profile),/forearm/i);assert.equal(disposed,0);assert.equal(p.fighter,old.f);
 assert.equal(p.profile,old.profile);assert.equal(p.def,old.def);assert.equal(p.time,old.time);
});
test('real seek zero keeps all ninety settle frames simulation-free then assembles exactly once',t=>{
 const {p,advance}=fixture(t);p.seek(0);assert.ok(cells(p.fighter).every(m=>m.assemblyT===0&&!m.unlocked));
 const before=cells(p.fighter),ki=p.fighter.ki;for(let i=0;i<4;i++)p.step(0,false,false);assert.deepEqual(cells(p.fighter),before);near(p.fighter.ki,ki);
 advance(0,.65);assert.ok(cells(p.fighter).every(m=>m.assemblyT===.65&&m.unlocked));
});
for(const reverse of [false,true])test(`native nanite pattern pays, guards, takes actual incoming contact and repairs (reverse ${reverse})`,t=>{
 const {p,stage,advance}=fixture(t,{reverse});p.seek(0);advance(0,1);
 assert.equal(p.fighter.slots.lmb.charging,true);assert.ok(p.fighter.ki<p.fighter.maxKi,'paid native charge');
 advance(1,2.3);assert.equal(p.fighter.guarding,true);assert.ok(p.fighter._guardUpT>.2,'native guard age');
 advance(2.3,2.8);const stats=stage.naniteStats();assert.equal(stats.emitted,1);assert.ok(stats.contacts>0,'native projectile must arrive');
 assert.ok(stats.modules.some(m=>m.absorbed>0));assert.ok(cells(p.fighter).some(m=>m.cells.some(c=>c.hp<12)));
 assert.ok(stats.events.some(e=>e.time>2.4),'arrival is not the emission timestamp');
 advance(2.8,5.5);assert.ok(cells(p.fighter).every(m=>m.cells.every(c=>c.hp===12)));assert.equal(p.fighter.guarding,false);
 assert.ok(stage.naniteStats().launches>=2,'fresh paid post-repair shot');
 advance(5.5,6.1);assert.equal(p.fighter._nanites.modules.get('q').deployed,false);
 advance(6.1,6.4);assert.equal(p.fighter._nanites.modules.get('q').deployed,true);
});
test('quarter-speed transport uses fixed native steps and rate is transient',t=>{
 const {p}=fixture(t);p.seek(0);assert.equal(p.setPlaybackRate(.25),true);p.playing=true;
 for(let i=0;i<156;i++)p.advancePlayback(1/60);near(p.time,.65);assert.ok(cells(p.fighter).every(m=>m.assemblyT===.65));
 p.playing=false;const before=cells(p.fighter);p.advancePlayback(1);assert.deepEqual(cells(p.fighter),before);
 assert.equal(p.setPlaybackRate(.5),false);assert.equal(p.playbackRate,.25);assert.ok(!Object.hasOwn(p.profile,'playbackRate'));
});
for(const at of [.65,1.5,2.45,2.8,4.1,5.2,6.1,6.8,8])test(`canonical native forward state matches silent seek at ${at}s`,t=>{
 const {p,stage,advance}=fixture(t);p.seek(0);advance(0,at);
 const snapshot=()=>({cells:cells(p.fighter),ki:p.fighter.ki,hp:p.fighter.hp,guard:p.fighter.guardMeter,stats:stage.naniteStats(),shots:stage.game.projectiles.list.map(s=>({pos:s.pos.toArray(),dead:s.dead}))});
 const before=snapshot();p.seek(at);sameSemantic(snapshot(),before);const zero=snapshot();p.step(0,false,false);assert.deepEqual(snapshot(),zero);
});
test('native incoming source is hostile, owner has finite HP and real KO stops choreography',t=>{
 const {p,stage,advance}=fixture(t);p.seek(0);assert.equal(stage.incoming.isDummy,false);assert.ok(stage.incoming.maxHp<1000);assert.ok(p.fighter.maxHp<1000);
 assert.equal(stage.game.isFoe(stage.incoming,p.fighter),true);assert.equal(stage.game.isFoe(stage.target,p.fighter),false);
 advance(0,2.3);p.fighter.hp=1;p.fighter.ki=0;advance(2.3,2.8);assert.equal(p.fighter.alive,false);assert.equal(stage.naniteStats().alive,false);
 const launches=stage.naniteStats().launches;advance(2.8,5.5);assert.equal(p.fighter.alive,false);assert.equal(stage.naniteStats().launches,launches);assert.equal(p.fighter.slots.lmb.charging,false);
});
test('partial native hitstop freezes a repair frame then resumes once',t=>{
 const {p,advance}=fixture(t);p.seek(0);advance(0,2.8);const damaged=[...p.fighter._nanites.modules.values()].flatMap(m=>m.cells).find(c=>c.hp<12);assert.ok(damaged);
 p.fighter.hitstop=.001;const before=damaged.reformT+damaged.quietT;advance(2.8,2.8+1/60);near(damaged.reformT+damaged.quietT,before);
 advance(2.8+1/60,2.8+2/60);near(damaged.reformT+damaged.quietT,before+1/60);
});
for(const form of ['cannon','shield'])test(`${form} alone has a real native contact sample and does not activate an unselected slot`,t=>{
 const {p,stage,advance}=fixture(t,{forms:[form]});p.seek(0);advance(0,2.3);const preContactKi=p.fighter.ki;advance(2.3,3);
 const stats=stage.naniteStats();assert.equal(stats.emitted,1);assert.ok(stats.contacts>0);assert.equal(stats.modules.length,1);
 if(form==='cannon'){assert.equal(stats.modules[0].absorbed,0);assert.equal(stats.bodyDamage,0,'funded open-sky guard protects health');assert.ok(stats.ki<preContactKi-10,`native impact bills energy beyond earlier cannon cost: ${preContactKi} → ${stats.ki}`);}else assert.equal(stats.launches,0);
});
test('native punch sample uses actual melee windup and first physical winner',t=>{
 const {p,stage,advance}=fixture(t,{forms:['shield']});stage.naniteSample='punch';p.seek(0);advance(0,2.37);
 assert.ok(stage.incoming.meleeCharge>0);advance(2.37,3);assert.equal(stage.testEmitted,1);assert.ok(stage.naniteStats().contacts>0);
 assert.ok(stage.naniteStats().events.some(e=>e.kind==='punch'));assert.equal(stage.testShots.length,0);
});
test('long authored assembly denies fixed press without payment or a late surprise charge',t=>{
 const {p,stage,advance}=fixture(t,{forms:['cannon'],settings:{naniteAssemblyTime:2}});p.seek(0);advance(0,1.8);
 assert.equal(p.fighter.slots.lmb.charging,false);assert.equal(stage.naniteStats().launches,0);near(p.fighter.ki,p.fighter.maxKi);
 advance(1.8,2.3);assert.equal(p.fighter.slots.lmb.charging,false);assert.equal(stage.naniteStats().launches,0);
});
test('exact endpoint clears slow ordnance once but retains measured totals and cells',t=>{
 const {p,stage,advance}=fixture(t);p.seek(0);advance(0,7.9);const state=cells(p.fighter),stats=stage.naniteStats();
 const s=stage.game.projectiles.spawnProjectile(stage.incoming,{pos:new THREE.Vector3(100,80,100),vel:new THREE.Vector3(1,0,0),damage:1,life:30,radius:.1,ground:false});
 advance(7.9,8);assert.equal(s.dead,true);assert.equal(stage.game.projectiles.list.length,0);assert.deepEqual(cells(p.fighter),state);
 assert.equal(stage.naniteStats().bodyDamage,stats.bodyDamage);assert.equal(p.fighter.guarding,false);p.step(0,false,false);assert.equal(stage.game.projectiles.list.length,0);
});
test('pose-only model rewind rebuilds nanite lifetime without buying settle time',t=>{
 const {p,advance}=fixture(t);p.setState('hover');advance(0,1);assert.equal(cells(p.fighter)[0].assemblyT,.65);
 p.seek(0);assert.ok(cells(p.fighter).every(m=>m.assemblyT===0));
});
test('incompatible contact selection rejects atomically and source removal normalizes the pattern',t=>{
 const {p,stage,def}=fixture(t);p.seek(0);const before=p.fighter,slot=stage.slot;
 assert.equal(p.setCombat({slot:'shift',pattern:'nanite'}),false);assert.equal(p.fighter,before);assert.equal(stage.slot,slot);
 const changed=structuredClone(def);changed.abilities.lmb={type:'projectile',name:'Normal',damage:8,speed:60};delete changed.abilities.q;
 p.setProfile(changed,profileFromDef(changed));assert.equal(stage.pattern,'target');assert.equal(p.fighter._nanites,null);
});
test('atomic forearm swap validates both sparse sources together and round-trips through Undo',t=>{
 const {p,def}=fixture(t),history=new DraftHistory(p.profile),before=history.value;
 const swapped=p.swappedNaniteProfile(before);assert.deepEqual(history.value,before,'candidate does not mutate draft');
 const effective=applyProfile(def,swapped);assert.equal(effective.abilities.lmb.naniteAttachment,'left-forearm');assert.equal(effective.abilities.q.naniteAttachment,'right-forearm');
 history.push(swapped);history.undo();assert.deepEqual(history.value,before);history.redo();p.setProfile(def,history.value);
 assert.equal(p.fighter.parts.nanites.get('lmb').arm,p.fighter.parts.armR);assert.equal(p.fighter.parts.nanites.get('q').arm,p.fighter.parts.armL);
 const restored=p.swappedNaniteProfile(history.value);assert.deepEqual(restored.attacks,{});
});
test('actual damaged cell telemetry distinguishes quiet delay from active reform',t=>{
 const {p,stage,advance}=fixture(t,{forms:['shield']});p.seek(0);advance(0,2.5);
 assert.equal(stage.naniteStats().modules[0].phase,'quiet');const c=cells(p.fighter)[0].cells.find(c=>c.broken);assert.ok(c.quietT<.4);near(c.reformT,0);
 advance(2.5,3.1);assert.equal(stage.naniteStats().modules[0].phase,'reforming');assert.ok(cells(p.fighter)[0].cells.some(c=>c.reformT>0));
 advance(3.1,4.1);assert.equal(stage.naniteStats().modules[0].phase,'ready');
});
test('positive nanite step invokes native launch prepass once; zero step invokes none',t=>{
 const {p,stage}=fixture(t);p.seek(0);let calls=0;const resolve=stage.game.projectiles.resolveLaunches.bind(stage.game.projectiles);
 stage.game.projectiles.resolveLaunches=(...args)=>{calls++;return resolve(...args);};p.time=1/60;p.step(1/60,false,false);assert.equal(calls,1);
 p.step(0,false,false);assert.equal(calls,1);
});
test('native pattern starts each actor at the same source phase, not constructor random idle time',t=>{
 const {p,stage,advance}=fixture(t);p.seek(0);for(const actor of stage.game.entities)near(actor.animT,0);
 advance(0,.5);for(const actor of stage.game.entities)near(actor.animT,.5);
});
test('close punch sample leaves retained distant motion controls inactive',t=>{
 const {p,stage,advance}=fixture(t,{forms:['shield']});Object.assign(stage,{naniteSample:'punch',shooterMotion:'ground-left',motion:'orbit-left'});p.seek(0);
 const owner=p.fighter.pos.clone(),target=stage.target.pos.clone();advance(0,2.3);near(p.fighter.pos.distanceTo(owner),0);near(stage.target.pos.distanceTo(target),0);
 advance(2.3,3);assert.ok(stage.naniteStats().events.some(e=>e.kind==='punch'));
});
for(const body of ['procedural','superhero-male','superhero-female'])test(`moving ${body} native intent path retains paid fire and genuine incoming receiver`,t=>{
 const {p,stage,advance}=fixture(t);p.profile.model.body=body;Object.assign(stage,{shooterMotion:'ground-left',motion:'orbit-left',targetSpeed:10});p.seek(0);
 const start=p.fighter.pos.clone(),targetStart=stage.target.pos.clone();advance(0,5.5);const stats=stage.naniteStats();
 assert.ok(p.fighter.pos.distanceTo(start)>2);assert.ok(stage.target.pos.distanceTo(targetStart)>2);assert.ok(stats.launches>0);assert.ok(stats.contacts>0);
 assert.ok(stats.modules.some(m=>m.absorbed>0));assert.ok(stats.modules.filter(m=>m.muzzleError!==null).every(m=>m.muzzleError<1e-7));
 assert.equal(p.fighter.maxHp,p.def.hp,'finite source HP retained');
});

function ragdollPose(f){
 f.obj.updateMatrixWorld(true);
 const nodes=[...f.ragdoll.pivots,...f.ragdoll.driven];
 f.obj.traverse(node=>{if(node.isBone)nodes.push(node);});
 return nodes.map(node=>node.matrixWorld.toArray());
}
const ragdollClock=f=>({koT:f.koT,animT:f.animT,points:Object.fromEntries(Object.entries(f.ragdoll.P).map(([key,p])=>[key,{pos:p.pos.toArray(),prev:p.prev.toArray()}])),cells:cells(f)});
test('living source remains a stable normal-pose zero-step control after native incoming contact',t=>{
 const {p,advance}=fixture(t);p.seek(0);advance(0,3);const f=p.fighter;assert.equal(f.alive,true);assert.equal(f.ragdoll,undefined);
 const pose=()=>{f.obj.updateMatrixWorld(true);return [f.parts.body,f.parts.torso,f.parts.head,f.parts.armL,f.parts.armR].map(m=>m.matrixWorld.toArray());};
 const before=pose();p.step(0,false,false);sameSemantic(pose(),before,'living control matrices');
});

// Replacing the native ragdoll presentation with the living _animate carrier
// corrupts driven world matrices even if clocks and cell telemetry stay equal.
for(const body of ['procedural','superhero-male','superhero-female'])test(`KO ${body} zero-step and view inspection preserve the native ragdoll pose`,t=>{
 const {p,advance}=fixture(t);p.profile.model.body=body;p.seek(0);advance(0,2.3);p.fighter.hp=1;p.fighter.ki=0;advance(2.3,2.8);
 const f=p.fighter;assert.equal(f.alive,false);assert.ok(f.ragdoll);
 const before=ragdollPose(f),clock=ragdollClock(f);
 for(const inspect of [()=>p.step(0,false,false),()=>p.setView('front'),()=>p.setView('side'),()=>p.setView('rear'),()=>p.setView('orbit')]){
  inspect();sameSemantic(ragdollPose(f),before,'native ragdoll matrices');assert.deepEqual(ragdollClock(f),clock);
 }
 advance(2.8,8);const endpoint=ragdollPose(f),endClock=ragdollClock(f);p.step(0,false,false);
 sameSemantic(ragdollPose(f),endpoint,'ended native ragdoll matrices');assert.deepEqual(ragdollClock(f),endClock);
});
for(const body of ['procedural','superhero-male','superhero-female'])test(`KO ${body} seek endpoint matches its own authoritative native ragdoll without simulation`,t=>{
 const {p}=fixture(t);p.profile.model.body=body;p.def={...p.def,hp:1,ki:1};p.seek(2.8);
 const f=p.fighter;assert.equal(f.alive,false);assert.ok(f.ragdoll);
 const shown=ragdollPose(f),clock=ragdollClock(f);
 // Same physical points, no step: the native apply operation is the oracle,
 // not a second random KO trajectory or a hand-authored limb restoration.
 f.ragdoll.apply(f);f._sync();sameSemantic(shown,ragdollPose(f),'seek native ragdoll matrices');
 assert.deepEqual(ragdollClock(f),clock);
});
test('native first cannon blast can retire incoming actor before its scheduled sample without deleting older ordnance',t=>{
 const {p,stage,advance}=fixture(t);
 p.profile.attacks=setAttackOverride(p.profile.attacks,p.def,'lmb',{dmgMin:500,dmgMax:600,maxBlast:100});
 assert.equal(p.setCombat({distance:12,motion:'static',shooterMotion:'hover'}),true);p.seek(0);advance(0,1.4);
 const earlier=stage.game.projectiles.spawnProjectile(stage.incoming,{pos:new THREE.Vector3(100,80,100),vel:new THREE.Vector3(1,0,0),damage:1,radius:.1,life:30,ballistic:true,ground:false});
 advance(1.4,2);assert.equal(stage.incoming.alive,false,'Actual outgoing cannon blast must KO the genuine incoming source');
 assert.equal(stage.testEmitted,0);const hp=p.fighter.hp;advance(2,2.8);
 assert.equal(stage.testEmitted,0,'A dead caster must not emit the scheduled 2.4-second sample');
 assert.equal(stage.naniteStats().incomingStatus,'unavailable-ko');assert.equal(stage.naniteStats().contacts,0);near(p.fighter.hp,hp);
 const incomingPose=ragdollPose(stage.incoming),clock=ragdollClock(stage.incoming);p.setView('side');
 sameSemantic(ragdollPose(stage.incoming),incomingPose,'incoming native ragdoll matrices');assert.deepEqual(ragdollClock(stage.incoming),clock);
 assert.equal(earlier.dead,false);assert.ok(stage.game.projectiles.list.includes(earlier),'Existing pre-KO ordnance keeps its native lifetime');
});
