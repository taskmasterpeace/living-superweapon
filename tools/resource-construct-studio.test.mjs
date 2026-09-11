import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {StudioPreview} from '../src/tool/studio-preview.js';
import {StudioAudio} from '../src/tool/studio-audio.js';
import {Fighter} from '../src/engine/entity.js';
import {runSlot} from '../src/engine/abilities.js';
import {ROSTER} from '../src/data/characters.js';
import {profileFromDef} from '../src/tool/studio-profile.js';

const near=(a,b,why='')=>assert.ok(Math.abs(a-b)<1e-7,`${why}: ${a} != ${b}`);
const wall=(extra={})=>({type:'construct',name:'Resource wall',construct:'wall',cost:10,cd:.5,duration:1,holdTrigger:true,constructLifetime:'damage',constructKiPerDamage:2,...extra});
function fixture(t,{ability=wall(),secondary=null,startingKi=100,audio}={}){
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){},refreshFogBoxes(){}};
 const def=structuredClone(ROSTER.find(d=>d.id==='aurum'));def.abilities={q:ability,...secondary&&{e:secondary}};
 const stage=new StudioCombat(scene,world,audio),f=new Fighter(def);stage.slot='q';stage.secondarySlot=secondary?'e':null;stage.startingKi=startingKi;
 scene.add(f.obj);f._openSky=true;f.invuln=0;stage.reset(f,true,'attack');f.sheet.kiRegenMult=0;stage.target.armor=0;stage.target.resist={};stage.target.powerBuff=1;
 const texture=new THREE.Texture();stage.game.vfx._impactTex=()=>texture;
 t.after(()=>{stage.dispose();f.dispose();texture.dispose();});
 const advance=(from,to)=>{for(let i=Math.round(from*60)+1;i<=Math.round(to*60);i++)stage.step(i/60,1/60);};
 return {stage,f,world,scene,def,advance};
}

test('resource reset honors finite starting ki and selected source controls regen before spawn and after dismissal',t=>{
 const {stage,f,advance}=fixture(t,{startingKi:40});near(f.ki,40);f.sheet.kiRegenMult=1;
 advance(0,.5);near(f.ki,44);assert.equal(stage.game.constructs.length,0);
 advance(.5,6.5);near(f.ki,62,'40 + 8*6.5 - 10 entry - 20 actual hit');
 assert.equal(stage.game.constructs.length,0);assert.equal(stage.resourceEncounter,true);
});
for(const mode of ['damage','upkeep'])test(`native ${mode} stage accepts the actual incoming proxy hit and retains diagnostics after dismissal`,t=>{
 const {stage,f,world,advance}=fixture(t,{ability:wall({constructLifetime:mode,constructKiPerSec:5})});
 advance(0,1);const c=stage.game.constructs[0];assert.equal(c.life,Infinity);advance(1,2.4);assert.equal(c.dead,false,'Legacy hold release must not dismiss resource');
 advance(2.4,3);assert.equal(c.hitCount,1);near(c.damageReceived,10);assert.equal(stage.contacts,0,'Construct contacts are not humanoid HP contacts');
 if(mode==='damage'){near(f.ki,70);near(c.kiSpent,20);}else{near(f.ki,90-5*(3-.6+1/60));near(c.kiSpent,5*(3-.6+1/60));}
 stage.step(3,0);const ki=f.ki;stage.step(3,0);near(f.ki,ki);
 advance(3,8);assert.equal(c.dead,true);assert.equal(c.reason,'dismissed');assert.equal(world.cover.length,0);assert.equal(c.obj.parent,null);
 const stats=stage.resourceStats();assert.equal(stats.constructs[0].hits,1);near(stats.constructs[0].damage,10);assert.equal(stats.constructs[0].live,false);
});
test('resource secondary enables one shared regen tick; removing selection restores timed-only no-regen behavior',t=>{
 const {stage,f}=fixture(t,{ability:wall({constructLifetime:'timed',duration:9}),secondary:wall()});
 f.sheet.kiRegenMult=1;f.ki=40;stage.step(.1,.1);near(f.ki,40.8);assert.equal(stage.resourceEncounter,true);
 stage.secondarySlot=null;stage.step(.2,.1);near(f.ki,40.8);assert.equal(stage.resourceEncounter,false);
});
test('resource grouped final upkeep tick is proportional and retires both slots once',t=>{
 const {stage,f,world,advance}=fixture(t,{ability:wall({constructLifetime:'upkeep',constructKiPerSec:10}),secondary:wall({constructLifetime:'upkeep',constructKiPerSec:30})});
 advance(0,1);const [a,b]=stage.game.constructs;assert.equal(stage.game.constructs.length,2);const before=[a.kiSpent,b.kiSpent];f.ki=.2;
 stage.game.constructs.reverse();stage.step(1.1,.1);near(a.kiSpent-before[0],.05);near(b.kiSpent-before[1],.15);
 assert.equal(f.ki,0);assert.equal(a.dead,true);assert.equal(b.dead,true);assert.equal(world.cover.length,0);assert.equal(stage.drained,true);
});
test('resource incoming contact exhausts a ready tank before its native fire turn',t=>{
 const {stage,f,advance}=fixture(t,{ability:wall({construct:'tank',holdTrigger:false,damage:18,range:90})});stage.distance=60;
 advance(0,1);const c=stage.game.constructs[0];assert.ok(c);c.fireCd=0;f.ki=5;
 const place=stage.place.bind(stage);stage.place=time=>{place(time);stage.game.aimPoint.copy(c.pos);};
 const b=c._cover;stage.game.projectiles.spawnProjectile(stage.target,{pos:new THREE.Vector3(b.x-b.hx-1,4,b.z),vel:new THREE.Vector3(100,0,0),ballistic:true,bullet:true,damage:10,radius:.1,ground:false});
 stage.step(1+1/60,1/60);assert.equal(c.dead,true);assert.equal(stage.game.projectiles.list.filter(p=>!p.dead&&p.caster===f).length,0,'No same-frame ghost cannon shell');
});
test('resource tank movement designations survive stage placement and its new shell waits until next projectile tick',t=>{
 const {stage,advance}=fixture(t,{ability:wall({construct:'tank',holdTrigger:false,range:90})});stage.distance=60;
 advance(0,1);const c=stage.game.constructs[0],start=c.pos.clone();advance(1,2);assert.ok(c.pos.distanceTo(start)>1,'Ground designation must move native hull');
 advance(2,3.5);assert.equal(c.state,'holding');
 const shots=stage.game.projectiles.list.filter(p=>p.caster===stage.fighter&&!p.dead);
 assert.ok(stage.contacts>0||shots.length>0,'Real cannon must reach a genuine opponent during inspection');
 assert.equal(c.hitCount,1,'The incoming fixture must contact the moving tank, not only a static wall');
});
test('ordinary shared regen preserves charge, cap, sheet, mood, wound and infinite arithmetic',t=>{
 const {f}=fixture(t);f.sheet.kiRegenMult=1;f.ki=20;
 assert.equal(typeof f.regenerateKi,'function');f.regenerateKi(.5);near(f.ki,24);
 f.slots.q.charging=true;f.regenerateKi(.5);near(f.ki,25.5);f.slots.q.charging=false;f.slots.q.sustainT=1;f.regenerateKi(.5);near(f.ki,27);
 f.slots.q.sustainT=0;f.regenerateKi(.5);near(f.ki,31);f.ki=f.maxKi-.1;f.regenerateKi(.5);near(f.ki,f.maxKi);
 f.ki=20;f.sheet.kiRegenMult=0;f.regenerateKi(1);near(f.ki,20);
 f.sheet.kiRegenMult=2;f._psyche={fx:()=>1.5};f._wounds={torso:2};f.regenerateKi(.5);near(f.ki,30.32);
 f.energyInfinite=true;f.ki=0;f.regenerateKi(0);near(f.ki,f.maxKi);
});
for(const [state,regen] of [['hitstop',true],['ko',false],['frozen',false]])test(`resource stage ${state} respects native ordinary regen gate`,t=>{
 const {stage,f}=fixture(t);f.sheet.kiRegenMult=1;f.ki=20;
 if(state==='ko')f.state='ko';else if(state==='frozen')f.frozenT=1;else f.hitstop=1;
 stage.step(.1,.1);near(f.ki,regen?20.8:20);
});

// Actual StudioPreview seek/step path, with only the WebGL renderer and camera
// controls replaced. The ninety positive-dt pose-settle calls remain real.
function previewFixture(t,ability=wall()){
 const x=fixture(t,{ability,startingKi:40}),p=Object.create(StudioPreview.prototype);
 Object.assign(p,{def:x.def,profile:profileFromDef(x.def),fighter:x.f,scene:x.scene,camera:x.world.camera,combat:x.stage,state:'attack',view:'orbit',time:0,
  sound:new StudioAudio(),travelDelta:new THREE.Vector3(),floor:new THREE.Object3D(),grid:new THREE.Object3D(),renderer:{render(){}},onFrame(){},
  controls:{target:new THREE.Vector3(0,12,0),update(){}},chase:{sun:new THREE.DirectionalLight(),sunOff:new THREE.Vector3(),snapChase(){}},_meleeZoom:1});
 x.world.camera.position.set(20,18,27);t.after(()=>{p.fighter.dispose();p.sound.dispose();});return {...x,p};
}
test('real seek zero settles pose without advancing starting energy, cooldown or resource lifecycle',t=>{
 const {p,stage}=previewFixture(t);p.seek(0);near(p.fighter.ki,40);assert.equal(stage.game.constructs.length,0);assert.equal(stage.game.projectiles.list.length,0);
 p.seek(0);near(p.fighter.ki,40);assert.equal(stage.warningTimes.drained,-Infinity);assert.equal(p.sound.scrubbing,false);
});
test('real playback and backward seek retain identical resource totals with no final-sample debit',t=>{
 const {p,stage}=previewFixture(t);p.seek(0);for(let i=1;i<=180;i++){p.time=i/60;p.step(1/60,false,false);}
 const stats=stage.resourceStats();p.seek(3);assert.deepEqual(stage.resourceStats(),stats);p.step(0);assert.deepEqual(stage.resourceStats(),stats);
 p.seek(1);assert.equal(stage.resourceStats().constructs[0].hits,0);p.seek(3);assert.deepEqual(stage.resourceStats(),stats);
});
for(const duration of [1,60])test(`resource duration ${duration} never becomes a Studio runtime lifetime`,t=>{
 const {p,stage}=previewFixture(t,wall({duration}));assert.equal(p.duration,8);p.seek(1);assert.equal(stage.game.constructs[0].life,Infinity);
});
test('timed-only duration and no-regen stay compatible while mixed resource duration is explicitly bounded',t=>{
 const {p,stage}=previewFixture(t,wall({constructLifetime:'timed',duration:60}));assert.equal(p.duration,61);stage.startingKi=20;p.seek(0);near(p.fighter.ki,p.fighter.maxKi);
 stage.secondarySlot='e';p.fighter.slots.e={def:wall(),cd:0};assert.equal(p.duration,8);
});
test('starting ki is validated encounter state, never a saved source/profile override',t=>{
 const {p,stage}=previewFixture(t),before=structuredClone(p.profile);p.seek(0);
 assert.equal(p.setCombat({startingKi:27}),true);near(p.fighter.ki,27);assert.deepEqual(p.profile,before);
 for(const startingKi of [-1,NaN,Infinity,p.fighter.maxKi+1])assert.equal(p.setCombat({startingKi}),false);
 near(p.fighter.ki,27);assert.equal(p.setCombat({startingKi:null}),true);near(p.fighter.ki,p.fighter.maxKi);
 stage.startingKi=0;p.def.energyInfinite=true;p.profile=profileFromDef(p.def);p.seek(0);assert.equal(p.fighter.energyInfinite,true);near(p.fighter.ki,p.fighter.maxKi);
});
for(const resourceFirst of [true,false])test(`native charged ${resourceFirst?'secondary':'primary'} is included before one regen tick, including its release`,t=>{
 const charge={type:'charge',name:'Charge fixture',cost:6,kiPerSec:12,maxCharge:2.2,color:'#ffdd66'},x=fixture(t,{ability:resourceFirst?wall():charge,secondary:resourceFirst?charge:wall()}),{stage,f}=x;
 f.sheet.kiRegenMult=1;const key=resourceFirst?'e':'q',seen=[],regen=f.regenerateKi.bind(f);
 f.regenerateKi=(dt,...args)=>{const before=f.ki,charging=f.slots[key].charging;regen(dt,...args);seen.push({before,after:f.ki,dt,charging});};
 stage.step(.6,1/60);assert.equal(seen.length,1);assert.equal(seen[0].charging,true);near(seen[0].after-seen[0].before,.05);
 stage.step(2.4,1/60);assert.equal(seen.length,2);assert.equal(seen[1].charging,false);near(seen[1].after-seen[1].before,8/60);
});
test('real seek suppresses historical drained sound and resets native warning debounce for the next live run',async t=>{
 const {p,stage}=previewFixture(t,wall({constructLifetime:'upkeep',constructKiPerSec:100})),calls=[];
 await p.sound.dispose();p.sound=new StudioAudio({backend:{ok:true,init(){},zap:f=>calls.push(f)},prepare:async()=>{}});stage.game.audio=p.sound.audio;
 await p.sound.enable();p.playing=true;p.seek(2);assert.equal(stage.drained,true);assert.deepEqual(calls,[]);
 p.seek(0);for(let i=1;i<=120;i++){p.time=i/60;p.step(1/60,false,false);}assert.deepEqual(calls,[140,90]);
 p.seek(2);assert.deepEqual(calls,[140,90]);p.seek(0);for(let i=1;i<=120;i++){p.time=i/60;p.step(1/60,false,false);}assert.deepEqual(calls,[140,90,140,90]);
});
test('a fresh cannon projectile is not advanced in its construct-spawn simulation tick',t=>{
 const {stage,advance}=fixture(t,{ability:wall({construct:'tank',holdTrigger:false,range:90})});stage.distance=60;
 const spawn=stage.game.projectiles.spawnProjectile.bind(stage.game.projectiles),fresh=[];
 stage.game.projectiles.spawnProjectile=(caster,opts)=>{const p=spawn(caster,opts);if(caster===stage.fighter)fresh.push({p,pos:p.pos.clone()});return p;};
 let found=false;for(let i=1;i<=270;i++){fresh.length=0;stage.step(i/60,1/60);if(fresh.length){assert.deepEqual(fresh[0].p.pos,fresh[0].pos);found=true;break;}}
 assert.equal(found,true);
});
test('reset, selected source replacement and disposal clear old protection, telemetry and future shots',t=>{
 const {p,stage,world}=previewFixture(t,wall({construct:'tank',holdTrigger:false}));p.seek(2);const old=stage.game.constructs[0];assert.ok(old);p.seek(0);
 assert.equal(old.dead,true);assert.equal(old.obj.parent,null);assert.equal(world.cover.length,0);assert.equal(stage.resourceStats().constructs[0].hits,0);
 p.def.abilities.q={type:'projectile',name:'Replacement',damage:8,cost:1,cd:.2};p.profile=profileFromDef(p.def);p.seek(0);assert.equal(stage.resourceEncounter,false);assert.equal(stage.resourceObjects.size,0);
 assert.equal(stage.game.projectiles.list.length,0);stage.dispose();assert.equal(world.cover.length,0);
});
test('resource seek endpoint clears real slow missed cannon ordnance using accepted target controls, retaining diagnostics',t=>{
 const {p,stage,world}=previewFixture(t,wall({construct:'tank',holdTrigger:false,speed:20,range:160,interval:1.2}));
 p.seek(0);assert.equal(p.setCombat({distance:60,motion:'orbit-left',targetSpeed:70,startingKi:100}),true);
 p.seek(7.9);const before=stage.resourceStats();assert.ok(stage.game.projectiles.list.some(shot=>!shot.dead),'Fixture must leave real traveling ordnance before transport cleanup');
 p.seek(8);assert.equal(stage.game.projectiles.list.length,0,'No transient shell remains at the explicit eight-second inspection endpoint');
 assert.equal(stage.game.constructs.length,0);assert.equal(world.cover.length,0);assert.equal(stage.game.vfx.fx.length,0);assert.equal(stage.game.particles.n,0);
 const after=stage.resourceStats();assert.equal(after.constructs[0].hits,before.constructs[0].hits);near(after.constructs[0].kiSpent,before.constructs[0].kiSpent);assert.equal(after.constructs[0].live,false);
 const state=stage.resourceStats();p.step(0);assert.deepEqual(stage.resourceStats(),state);
});
test('timed-only seek eight does not run resource inspection cleanup',t=>{
 const {p,stage,world}=previewFixture(t,wall({constructLifetime:'timed',duration:60,holdTrigger:false,cd:20}));
 p.seek(8);assert.equal(p.duration,61);assert.equal(stage.resourceEncounter,false);assert.equal(stage.game.constructs.length,1);
 assert.equal(stage.game.constructs[0].dead,false);assert.equal(world.cover.length,1);
});
