import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Game} from '../src/engine/game.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {MeleeSystem} from '../src/engine/melee.js';
import {fistContact} from '../src/engine/melee-pose.js';
import {STRIKES} from '../src/data/martial.js';
import {runSlot} from '../src/engine/abilities.js';
import {advanceNanites} from '../src/engine/nanite-state.js';
import {presentNanites,snapshotNaniteCells,snapshotNaniteContactFrame,naniteContact} from '../src/engine/nanite-forearms.js';
import {damageAdmission,withNaniteDamageAdmission} from '../src/engine/damage-admission.js';
import {naniteEnvelopeClear} from '../src/engine/nanite-pose.js';
import {OBB} from 'three/addons/math/OBB.js';
import {POWERS,buildDef,freshPicks} from '../src/data/creator.js';
import {attackIdentity} from '../src/data/attack-tuning.js';

const SHIELD={type:'naniteShield',name:'Private contact shield',naniteForm:'shield',naniteAttachment:'left-forearm',cost:0,cd:.2};
const CANNON={type:'charge',name:'Private contact cannon',naniteForm:'cannon',naniteAttachment:'left-forearm',cost:6,cd:1.2,kiPerSec:12,maxCharge:1.8,minR:.55,maxR:1.8,dmgMin:20,dmgMax:64,maxBlast:18,speedMin:65,speedMax:105,color:'#ffd97a'};
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-7,`${message}: ${a} vs ${b}`);
// Scripted native geometry/contact fixture, not AI or input/locomotion evidence.
// Shared state clock only assembles/repairs; ALL damage comes from real attacks.
function fixture({reverse=false,back=false,untagged=false,width=1,scale,bulk=1,body,attachment='left-forearm',form='shield',dual=false,definition}={}){
 const def=structuredClone(definition||ROSTER.find(d=>d.id==='sol'));if(!definition){Object.assign(def,{id:'private-contact-shield',strength:3,armor:0,guardType:'block',guardStrong:false});def.abilities=untagged?{}:{q:{...(form==='cannon'?CANNON:SHIELD),naniteWidth:width}};}
 if(scale)def.frame={...def.frame,scale,bulk};
 if(body)def.model={...def.model,body,costume:'martial'};
 if(!untagged&&!definition)def.abilities.q.naniteAttachment=attachment;
 if(dual)def.abilities.e={...CANNON,naniteAttachment:'right-forearm'};
 const b=new Fighter(def,{team:2}),attackDef=structuredClone(def);attackDef.id='private-contact-attacker';attackDef.abilities={};const a=new Fighter(attackDef,{team:1});
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const stage=new StudioCombat(scene,world),g=stage.game,events={hits:[],xp:0,flashes:[],metal:[],blocked:0};g.entities=reverse?[b,a]:[a,b];g.player=a;g.isHuman=f=>f===a;g.bigHit={amount:0};g.combo=0;g._p1MaxCombo=0;
 g.grantXp=(_f,n)=>events.xp+=n;g.trail=()=>{};g.heroYell=()=>{};g.melee=new MeleeSystem(g);
 g.onHit=(target,amount,opts,blocked,outcome)=>{events.hits.push({target,amount,opts,blocked,outcome});Game.prototype.onHit.call(g,target,amount,opts,blocked,outcome);};
 g.onBlockedStrike=(...args)=>{events.blocked++;Game.prototype.onBlockedStrike.apply(g,args);};
 g.coneFoe=Game.prototype.coneFoe.bind(g);
 const flash=g.vfx.flash.bind(g.vfx);g.vfx.flash=(p,...args)=>{events.flashes.push(p.clone());return flash(p,...args);};
 const contact=g.vfx.contact.bind(g.vfx);g.vfx.contact=(p,n,...args)=>{events.metal.push({point:p.clone(),normal:n.clone()});return contact(p,n,...args);};
 // Canvas rasterization is unavailable in Node. Preserve native contact meshes,
 // particles and pooled lights, substituting only the impact sprite's pixels.
 const impactTexture=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);impactTexture.needsUpdate=true;g.vfx._impactTex=()=>impactTexture;
 for(const f of [a,b]){scene.add(f.obj);f._game=g;f._openSky=true;f.animT=0;f.level=10;f.invuln=0;f.armor=0;f._shieldHp=0;f.resist={};f.strength=3;f.hp=f.maxHp=1000;f.powerBuff=1;f.ki=10;f.hitstop=0;f.stats={dmg:0,big:0,taken:0};f._altTag=()=>{};}
 a.pos.set(0,0,30);b.facing=back?Math.PI:0;b.aim.set(0,0,back?-1:1);b.aim3.copy(b.aim);b.guarding=form==='shield';b.poseGuard=form==='shield'?1:0;b._guardUpT=1;
 advanceNanites(b._nanites,.65,new Set(Object.keys(b.slots)));for(let i=0;i<60;i++){a._animate(1/60);b._animate(1/60);}presentNanites(b);b.obj.updateMatrixWorld(true);
 return {a,b,g,world,events,stage,close(){stage.dispose();a.dispose();b.dispose();impactTexture.dispose();}};
}
function panel(x,cell=2,offset=0){
 const token=snapshotNaniteCells(x.b).find(c=>c.slot==='q'&&c.cell===cell);assert.ok(token,'fixture requires an assembled live cell');
 return {cell,point:new THREE.Vector3(offset,0,.5).applyMatrix4(token.matrix),normal:new THREE.Vector3(0,0,1).transformDirection(token.matrix),matrix:token.matrix};
}
const hp=(x,cell=2)=>x.b._nanites.modules.get('q').cells[cell].hp;
function fire(x,p,damage=5,extra={}){
 const normal=extra.normal||p.normal,origin=p.point.clone().addScaledVector(normal,8);x.a.pos.copy(origin).add(new THREE.Vector3(0,-5.2,0));x.a.obj.updateMatrixWorld(true);
 const shot=x.g.projectiles.spawnProjectile(x.a,{pos:origin,vel:normal.clone().multiplyScalar(-80),radius:.04,damage,ballistic:true,ground:false,life:2,color:'#ffd97a',...extra});
 if(extra.contactOnly)x.g.projectiles._projectileContacts(extra.dt??.25,x.g,[shot],[]);else x.g.projectiles.update(extra.dt??.25,x.g);return shot;
}
function physicalEntry(f,origin,direction){
 let best=Infinity;
 for(const key of ['torso','head','pelvis']){const part=f.parts[key];part.geometry.computeBoundingBox();const inverse=part.matrixWorld.clone().invert(),localOrigin=origin.clone().applyMatrix4(inverse),localEnd=origin.clone().add(direction).applyMatrix4(inverse),ray=new THREE.Ray(localOrigin,localEnd.sub(localOrigin).normalize()),hit=ray.intersectBox(part.geometry.boundingBox,new THREE.Vector3());if(hit)best=Math.min(best,hit.applyMatrix4(part.matrixWorld).distanceTo(origin));}
 return best;
}
for(const reverse of [false,true])test(`native ballistic reaches visible panel after generous cylinder but before torso (${reverse?'reversed':'normal'} entities)`,()=>{
 const x=fixture({reverse});try{const p=panel(x),origin=p.point.clone().addScaledVector(p.normal,8),dir=p.normal.clone().negate();
  const cylinderFront=Math.sqrt((x.b.radius+1.5+.04)**2-p.point.x**2);assert.ok(cylinderFront>p.point.z,'fixture cylinder must precede panel');assert.ok(physicalEntry(x.b,origin,dir)>8,'physical torso must be behind panel');
  fire(x,p);near(hp(x),7,'actual panel integrity');near(x.b.hp,1000,'fully absorbed body hp');assert.equal(x.events.hits.length,1);near(x.events.hits[0].amount,0,'callback reports HP only');assert.equal(x.events.hits[0].blocked,true);
 }finally{x.close();}
});
test('native outboard panel is hittable even when the ordinary fighter cylinder misses',()=>{
 const x=fixture({width:1.2,scale:1.5});try{const p=[panel(x,0,-.45),panel(x,0,.45)].sort((a,b)=>Math.abs(b.point.x)-Math.abs(a.point.x))[0];assert.ok(Math.abs(p.point.x)>x.b.radius+1.5+.04,`fixture must miss generous body cylinder: panel x=${p.point.x}, radius=${x.b.radius+1.5+.04}`);fire(x,p);near(hp(x,0),7,'outboard physical contact');near(x.b.hp,1000,'outboard protection');}finally{x.close();}
});
test('plain non-priority non-ballistic projectile also consumes actual panel contact',()=>{
 const x=fixture();try{fire(x,panel(x),5,{ballistic:false,blast:.01});near(hp(x),7,'plain native projectile cell debit');}finally{x.close();}
});
test('native simple guided child reaches its actual cell instead of the endpoint body fallback',()=>{
 const x=fixture();try{fire(x,panel(x),5,{ballistic:false,guidedSplit:true,homing:0,blast:.01});near(hp(x),7,'guided native child local contact');near(x.b.hp,1000,'guided full soak');assert.equal(x.events.hits.length,1);}finally{x.close();}
});
for(const guidedSplit of [false,true])for(const family of ['stick','armDelay','boomerang'])test(`${guidedSplit?'guided ':''}${family} keeps its native special route without direct nanite billing`,()=>{
 const x=fixture();try{const extra={ballistic:false,blast:.01,dt:.1,guidedSplit,[family]:family==='stick'?{fuse:2}:family==='armDelay'?2:true},shot=fire(x,panel(x),5,extra);near(hp(x),12,'special family does not enter local direct-cell slice');
  if(family==='stick'){assert.ok(shot._stuckTo===x.b);assert.equal(x.events.hits.length,0);assert.equal(shot.dead,false);}
  else if(family==='armDelay'){assert.equal(shot._armed,true);assert.equal(x.events.hits.length,0);assert.equal(shot.dead,false);}
  else{assert.equal(shot._return,true);assert.equal(x.events.hits.length,1);assert.equal(shot.dead,false);}
 }finally{x.close();}
});
test('native full soak bypasses armor and shieldpack but keeps one guard consequence and HP-only credit',()=>{
 const x=fixture();try{x.b.armor=20;x.b._shieldHp=20;fire(x,panel(x));near(hp(x),7,'local debit');near(x.b.armor,20,'armor retained');near(x.b._shieldHp,20,'shieldpack retained');near(x.b.guardMeter,.78,'native guard meter');near(x.b.hitstop,.03,'native guard hitstop');near(x.b.hp,1000,'HP retained');assert.equal(x.events.hits.length,1);near(x.events.hits[0].amount,0,'HP callback');near(x.events.xp,0,'no body damage XP');near(x.g.combo,0,'no damage combo');near(x.a.stats.dmg,0,'no HP stats');}finally{x.close();}
});
test('native residual applies only the unabsorbed amount to ordinary guard',()=>{
 const x=fixture();try{fire(x,panel(x),20);near(hp(x),0,'cell exhausted');near(1000-x.b.hp,3.36,'12 integrity then 8 * .42 HP');assert.equal(x.events.hits.length,1);}finally{x.close();}
});
test('a native full panel contact owns one actual metal-surface cue, not a fake body ripple',()=>{
 const x=fixture();try{const p=panel(x);fire(x,p);assert.equal(x.events.metal.length,1,'one real metal impact');near(x.events.metal[0].point.distanceTo(p.point),0,'cue touches visible face, not projectile center or body');assert.ok(x.events.metal[0].normal.dot(p.normal)>.999);near(x.b.hp,1000,'cue never fabricates HP');assert.ok(x.b.parts.guardArc.material.hits.every(h=>h.w<0));}finally{x.close();}
});
for(const city of [false,true])test(`native ${city?'city':'open-sky'} full panel block has no duplicate body-center flash`,()=>{
 const x=fixture();try{const p=panel(x);x.b._openSky=!city;fire(x,p);assert.equal(x.events.metal.length,1);assert.equal(x.events.flashes.length,0,'actual module owns contact instead of a second body flash');}finally{x.close();}
});
for(const city of [false,true])test(`native ${city?'city':'open-sky'} residual shield absorption retains real body consequences without duplicate bubble or ripple`,()=>{
 const x=fixture();try{x.b._openSky=!city;fire(x,panel(x),30);near(hp(x),0,'local cell breaks');near(1000-x.b.hp,7.56,'native residual body HP remains');near(x.b.guardMeter,.78,'native guard consequence remains');assert.equal(x.events.hits.length,1);assert.equal(x.events.hits[0].amount,7.56);near(x.events.xp,0,'native blocked hit still grants no XP');assert.equal(x.b.lastHitBy,x.a,'residual kill credit remains');assert.ok(x.b.hitstop>0);assert.ok(x.b.vel.length()>0,'native impact response remains');assert.equal(x.events.metal.length,1,'actual metal contact remains');assert.equal(x.events.flashes.length,0,'actual absorbed panel hit does not create a second generic body bubble');assert.ok(x.b.parts.guardArc.material.hits.every(h=>h.w<0),'no fake shield-sphere ripple');
 }finally{x.close();}
});
test('untagged city projectile guard keeps its original body-center flash',()=>{
 const x=fixture({untagged:true});try{x.b._openSky=false;fire(x,{point:new THREE.Vector3(0,6,1),normal:new THREE.Vector3(0,0,1)});assert.equal(x.events.flashes.length,1);assert.equal(x.events.metal.length,0);near(1000-x.b.hp,2.1,'ordinary guard unchanged');}finally{x.close();}
});
test('caller-supplied absorbed result cannot suppress native untagged guard feedback',()=>{
 const x=fixture({untagged:true});try{x.b._openSky=false;x.a.pos.set(0,0,10);const opts={src:x.a,ballistic:true,naniteResult:{absorbed:100}};x.b.takeDamage(5,opts);assert.equal(opts.naniteResult,undefined,'receiver discards caller result');assert.equal(x.events.flashes.length,1);assert.ok(x.b.parts.guardArc.material.hits.some(h=>h.w>=0));near(1000-x.b.hp,2.1,'original native guard amount');}finally{x.close();}
});
for(const form of ['shield','cannon'])test(`actual ${form} with zero absorption keeps its ordinary body-hit flash`,()=>{
 const x=fixture({form});try{const p=form==='cannon'?chargedCannon(x):panel(x);x.b._openSky=false;x.b.guarding=false;fire(x,p);assert.equal(x.events.hits[0].opts.naniteResult.absorbed,0);assert.equal(x.events.flashes.length,1);assert.equal(x.events.metal.length,1);assert.ok(x.b.hitFlash>0);near(1000-x.b.hp,5,'nonarmor original body damage');}finally{x.close();}
});
for(const guidedSplit of [false,true])for(const hz of [30,60,120])test(`${guidedSplit?'guided':'ballistic'} generous cylinder deferral never applies a future hit at ${hz} Hz`,()=>{
 const x=fixture();try{const p=panel(x),origin=p.point.clone().addScaledVector(p.normal,8);x.a.pos.copy(origin).add(new THREE.Vector3(0,-5.2,0));const shot=x.g.projectiles.spawnProjectile(x.a,{pos:origin,vel:p.normal.clone().multiplyScalar(-20),radius:.04,damage:5,ballistic:!guidedSplit,guidedSplit,blast:.01,ground:false,life:2});
  let arrived=false;for(let i=0;i<hz;i++){const before=shot.pos.clone();x.g.projectiles.update(1/hz,x.g);if(hp(x)<12){assert.ok(before.distanceTo(p.point)<=20/hz+.041,'only reached finite sphere can contact');arrived=true;break;}near(x.b.hp,1000,'no premature cylinder HP');assert.equal(x.events.hits.length,0);}
  assert.ok(arrived);assert.equal(x.events.hits.length,1);near(hp(x),7,'exactly one contact');
 }finally{x.close();}
});
for(const reason of ['cover','expiry'])test(`guided deferral preserves native ${reason} before actual panel arrival`,()=>{
 const x=fixture();try{const p=panel(x),at=p.point.clone().addScaledVector(p.normal,3);if(reason==='cover')x.world.cover.push({x:at.x,z:at.z,hx:8,hz:.01,bottom:0,top:20,projectileShape:'box'});
  const shot=fire(x,p,5,{ballistic:false,guidedSplit:true,blast:.01,life:reason==='expiry'?.025:2});assert.equal(shot.dead,true);near(hp(x),12,'unreached panel untouched');near(x.b.hp,1000,'unreached body untouched');assert.equal(x.events.hits.length,0);
 }finally{x.close();}
});
test('native detonated split children use local contacts without inherited direct or splash metadata',()=>{
 const x=fixture();try{const p=panel(x),origin=p.point.clone().addScaledVector(p.normal,8);x.a.pos.copy(origin).add(new THREE.Vector3(0,-5.2,0));const parent=x.g.projectiles.spawnProjectile(x.a,{pos:origin,vel:p.normal.clone().multiplyScalar(-80),radius:.04,damage:10,blast:.01,splitCount:2,splitSpread:0,splitSpeed:80,splitHoming:0});parent.detonate(x.g);
  const children=x.g.projectiles.list.filter(s=>s!==parent);assert.equal(children.length,2);assert.ok(children.every(s=>s._guidedSplit&&s.collisionPriority===-1));x.g.projectiles.update(.25,x.g);near(hp(x),2,'two real children debit once each');near(x.b.hp,1000,'both actual panels absorb');assert.equal(x.events.hits.length,2);assert.ok(children.every(s=>s.dead));
 }finally{x.close();}
});
for(const eligible of [true,false])test(`native deflection precedence for ${eligible?'eligible':'ki-charging ineligible'} actual shield`,()=>{
 const x=fixture();try{x.b.def.guardType='deflect';x.b.chargingKi=!eligible;const shot=fire(x,panel(x));if(eligible){assert.notEqual(shot._defl,true);near(hp(x),7,'shield absorbs actual contact');assert.equal(shot.dead,true);}else{assert.equal(shot._defl,true);near(hp(x),12,'native reflection preempts local damage');const hit=x.events.hits.filter(e=>e.target===x.b);assert.equal(hit.length,1);assert.equal(hit[0].amount,0);assert.equal(hit[0].outcome?.deflected,true);}near(x.b.hp,1000,'reflection or full shield prevents HP');}finally{x.close();}
});
test('real projectile breaks one panel, subsequent hole passes damage, exact repair protects again',()=>{
 const x=fixture();try{const p=panel(x);fire(x,p,12);near(hp(x),0,'first real shot breaks cell');assert.equal(snapshotNaniteCells(x.b).some(c=>c.cell===2),false);fire(x,p,5);near(1000-x.b.hp,2.1,'hole uses native body guard');
  advanceNanites(x.b._nanites,1.15,new Set(['q']));presentNanites(x.b);near(hp(x),12,'shared exact repair clock');const body=x.b.hp;fire(x,p,5);near(x.b.hp,body,'restored cell protects');near(hp(x),7,'repaired local debit');
 }finally{x.close();}
});
test('a real panel behind the physical torso cannot add protection to a rear hit',()=>{
 const x=fixture({back:true});try{const p=panel(x),normal=new THREE.Vector3(0,0,1),origin=p.point.clone().addScaledVector(normal,8);assert.ok(physicalEntry(x.b,origin,normal.clone().negate())<8,'physical torso must precede panel');fire(x,p,5,{normal});near(hp(x),12,'body winner does not debit behind-body metal');near(1000-x.b.hp,5,'rear hit retains normal damage');}finally{x.close();}
});
test('earlier real thin cover wins before a physical panel with no local or HP debit',()=>{
 const x=fixture();try{const p=panel(x),c=p.point.clone().addScaledVector(p.normal,3);x.world.cover.push({x:c.x,z:c.z,hx:8,hz:.01,bottom:0,top:20,projectileShape:'box'});fire(x,p);near(hp(x),12,'cover prevents local debit');near(x.b.hp,1000,'cover prevents body debit');assert.equal(x.events.hits.length,0);}finally{x.close();}
});
for(const immune of ['invuln','phase','resist'])test(`native ${immune} rejection cannot damage nanite integrity`,()=>{
 const x=fixture();try{if(immune==='resist')x.b.resist.ballistic=0;else x.b[immune]=immune==='invuln'?1:true;fire(x,panel(x));near(hp(x),12,'immune metal');near(x.b.hp,1000,'immune body');}finally{x.close();}
});
for(const immune of ['invuln','phase','resist','plate'])test(`native deflection survives ${immune} rejection at an otherwise eligible actual panel`,()=>{
 const x=fixture();try{x.b.def.guardType='deflect';if(immune==='resist')x.b.resist.ballistic=0;else if(immune==='plate')x.b.def.armor=20;else x.b[immune]=immune==='invuln'?1:true;
  const shot=fire(x,panel(x));assert.equal(shot._defl,true,'native reflection remains authoritative when no positive damage reaches absorption');near(hp(x),12,'no local debit');near(x.b.hp,1000,'no body debit');const hit=x.events.hits.filter(e=>e.target===x.b);assert.equal(hit.length,1,'reflection emits one presentation-only outcome');assert.equal(hit[0].outcome?.deflected,true);
 }finally{x.close();}
});
test('rejected native panel absorption reflects without consuming crit or waking and emits one resolved outcome',()=>{
 const x=fixture();try{x.b.def.guardType='deflect';x.b.resist.ballistic=0;x.b.sleepT=2;x.a._moodCrit=1;x.a._psyche={fx:(_key,fallback)=>fallback};
  const shot=fire(x,panel(x),5,{dt:.1});assert.equal(shot._defl,true);near(x.a._moodCrit,1,'reflection did not consume attacker one-shot');near(x.b.sleepT,2,'reflection did not wake');const hit=x.events.hits.filter(e=>e.target===x.b);assert.equal(hit.length,1);assert.equal(hit[0].amount,0);assert.equal(hit[0].outcome?.deflected,true);
 }finally{x.close();}
});
test('a rejected panel without native reflection still evaluates canonical admission only once',()=>{
 const x=fixture();try{let reads=0;x.a._psyche={fx:(_key,fallback)=>{reads++;return fallback;}};x.b.resist.ballistic=0;fire(x,panel(x));assert.equal(reads,1,'same synchronous rejection is not recalculated');near(hp(x),12,'rejection does not debit');}finally{x.close();}
});
test('accepted native panel admission computes mood, size, corrosion, strength and resistance once',()=>{
 const x=fixture();try{let reads=0,wakes=0;const wake=x.b.wake.bind(x.b);x.b.wake=(...args)=>{wakes++;return wake(...args);};x.b.sleepT=2;x.b.def.guardType='deflect';x.a._psyche={fx:()=>{reads++;return 1.2;}};x.a._moodCrit=1;x.a._sizeMight=1.3;x.b._moodVulnT=1;x.b._moodVuln=1.1;x.b.def.armor=4;x.b._corrode=1;x.b._corrodeAmt=2;x.b.strength=7;x.b.resist.ballistic=.5;
  fire(x,panel(x));near(12-hp(x),(5*1.2*1.5*1.1*1.3-2)*.66*.5,'canonical accepted amount before native pools');assert.equal(reads,1,'one mood evaluation, not preview plus damage');assert.equal(wakes,1);near(x.a._moodCrit,0,'one-shot consumed once');near(x.b.sleepT,0,'native wake retained');near(x.b.hp,1000,'full absorption');assert.equal(x.events.hits.length,1);
 }finally{x.close();}
});
for(const dtype of ['magic','acid'])test(`accepted native panel keeps ${dtype} side effects exactly once`,()=>{
 const x=fixture();try{x.b.def.guardType='deflect';x.b.ki=50;x.a.ki=10;const shot=fire(x,panel(x),5,{ballistic:false,dtype,blast:.01});assert.notEqual(shot._defl,true);near(hp(x),7,'one accepted amount');near(x.b.hp,1000,'fully absorbed');assert.equal(x.events.hits.length,1);
  if(dtype==='magic'){near(x.b.ki,46,'native siphon once before panel');near(x.a.ki,12.4,'native credit once');}else{near(x.b._corrode,5,'native acid duration');near(x.b._corrodeAmt,3,'native acid amount');}
 }finally{x.close();}
});
for(const rejection of ['plate','downed','resist'])test(`untagged native ${rejection} keeps original early return and side effects`,()=>{
 const x=fixture({untagged:true});try{let wakes=0;const wake=x.b.wake.bind(x.b);x.b.wake=(...args)=>{wakes++;return wake(...args);};x.b.sleepT=2;x.a._moodCrit=1;x.a._psyche={fx:(_key,fallback)=>fallback};if(rejection==='plate')x.b.def.armor=20;else if(rejection==='resist')x.b.resist.ballistic=0;else x.b.downedT=2;
  fire(x,{point:new THREE.Vector3(0,6,1),normal:new THREE.Vector3(0,0,1)});near(x.a._moodCrit,0,'native non-reflected crit is consumed even on rejection');assert.equal(wakes,rejection==='downed'?0:1);near(x.b.hp,1000,'original rejection');assert.equal(x.events.hits.length,rejection==='plate'?1:0);
 }finally{x.close();}
});
for(const exit of ['accepted','unused','throw'])test(`private admission is retired after synchronous ${exit} exit`,()=>{
 const x=fixture();try{const p=panel(x),out={};assert.ok(naniteContact(x.b,p.point.clone().addScaledVector(p.normal,2),p.point.clone().addScaledVector(p.normal,-2),.04,out));const opts={src:x.a,ballistic:true,naniteContact:out.naniteContact};x.a.pos.copy(p.point).addScaledVector(p.normal,8);let reads=0;x.a._psyche={fx:(_key,fallback)=>{reads++;return fallback;}};
  const invoke=()=>withNaniteDamageAdmission(x.b,5,opts,accepts=>{assert.equal(accepts,true);if(exit==='throw')throw new Error('fixture interruption');if(exit==='accepted')x.b.takeDamage(5,opts);});
  if(exit==='throw')assert.throws(invoke,/fixture interruption/);else invoke();assert.equal(reads,1);x.b.resist.ballistic=.25;near(damageAdmission(x.b,5,opts).amount,1.25,'subsequent frame uses fresh state');assert.equal(reads,2,'no unconsumed cross-frame entry');
 }finally{x.close();}
});
for(const rejection of ['invuln','downed','plate'])test(`native ${rejection} does not evaluate factors beyond its early-return boundary`,()=>{
 const x=fixture({untagged:true});try{if(rejection==='invuln'){x.b.invuln=1;x.a._psyche={fx:()=>{throw new Error('later mood');}};}else if(rejection==='downed'){x.b.downedT=2;Object.defineProperty(x.b.def,'armor',{get(){throw new Error('later plate');},configurable:true});}else{x.b.def.armor=20;Object.defineProperty(x.b,'resist',{get(){throw new Error('later resistance');},configurable:true});}
  assert.doesNotThrow(()=>fire(x,{point:new THREE.Vector3(0,6,1),normal:new THREE.Vector3(0,0,1)}));near(x.b.hp,1000,'unchanged early rejection');
 }finally{x.close();}
});
test('real direct plus splash impact debits cell once and keeps separate native HP callbacks',()=>{
 const x=fixture();try{fire(x,panel(x),5,{ballistic:false,collisionPriority:1,blast:6});near(hp(x),7,'only direct contact bills the cell');assert.ok(x.events.hits.length>=2,'real splash still runs its native damage path');near(x.events.hits[0].amount,0,'direct full soak HP');near(1000-x.b.hp,x.events.hits.reduce((sum,e)=>sum+e.amount,0),'actual HP callback conservation');}finally{x.close();}
});
test('a consumed real contact cannot be reused by a later DoT after same-epoch repair',()=>{
 const x=fixture();try{fire(x,panel(x),5);const prior=x.events.hits[0].opts,epoch=x.b._nanites.modules.get('q').epoch;advanceNanites(x.b._nanites,1.15,new Set(['q']));presentNanites(x.b);x.b.takeDamage(5,{...prior,dot:true});assert.equal(x.b._nanites.modules.get('q').epoch,epoch);near(hp(x),12,'old token cannot damage repaired metal');near(1000-x.b.hp,2.5,'unprotected ordinary DoT keeps native guard damage');}finally{x.close();}
});
for(const change of ['source','retract','form'])test(`a queued real cell token rejects ${change} before native damage consumption`,()=>{
 const x=fixture();try{const p=panel(x),out={};assert.ok(naniteContact(x.b,p.point.clone().addScaledVector(p.normal,2),p.point.clone().addScaledVector(p.normal,-2),.04,out));x.a.pos.copy(p.point).addScaledVector(p.normal,8);
  if(change==='source')x.b.slots.q.def={type:'shield',cost:0};else if(change==='retract')x.b._nanites.modules.get('q').deployed=false;else x.b.applyForm({name:'Token invalidation',frame:{scale:1.05}});
  x.b.takeDamage(5,{src:x.a,ballistic:true,naniteContact:out.naniteContact});near(hp(x),12,'old event has no local authority');near(1000-x.b.hp,2.1,'ordinary guard still receives the original amount');
 }finally{x.close();}
});
test('plain copied metadata is not a physical cell capability',()=>{
 const x=fixture();try{const p=panel(x),out={};assert.ok(naniteContact(x.b,p.point.clone().addScaledVector(p.normal,2),p.point.clone().addScaledVector(p.normal,-2),.04,out));x.a.pos.copy(p.point).addScaledVector(p.normal,8);x.b.takeDamage(5,{src:x.a,ballistic:true,naniteContact:{...out.naniteContact}});near(hp(x),12,'spreading a token loses query authority');near(1000-x.b.hp,2.1,'no forged absorption');}finally{x.close();}
});
for(const type of ['edge','corner-miss','unreached'])test(`literal finite sphere cell geometry: ${type}`,()=>{
 const x=fixture({scale:1.5,width:1.2});try{const p=panel(x,0),r=.2,scale=new THREE.Vector3().setFromMatrixScale(p.matrix),local=new THREE.Vector3(-.5, .5,.5);
  if(type==='edge'){local.x-=r*.75/scale.x;local.y=0;}
  if(type==='corner-miss'){local.x-=r*.8/scale.x;local.y+=r*.8/scale.y;}
  const surface=local.applyMatrix4(p.matrix),from=surface.clone().addScaledVector(p.normal,2),to=surface.clone().addScaledVector(p.normal,type==='unreached'?r+.05:-2),out={};
  const found=naniteContact(x.b,from,to,r,out);assert.equal(found,type==='edge','finite rounded sphere envelope, not expanded-box corners');
  if(found){assert.equal(out.naniteContact.cell,0);assert.ok(out.t>=0&&out.t<=1);const localHit=out.naniteContact.point.clone().applyMatrix4(p.matrix.clone().invert());assert.ok(Math.abs(localHit.x+.5)<1e-6,'feedback stays on actual edge');near(out.naniteContact.normal.length(),1,'normalized real surface normal');}
 }finally{x.close();}
});

function hose(x,p){
 const direction=p.normal.clone().negate(),origin=p.point.clone().addScaledVector(p.normal,10);x.a.aim3.copy(direction);x.a.aim.copy(direction).setY(0).normalize();x.a.facing=Math.atan2(direction.x,direction.z);x.a.energyInfinite=true;x.a._animate(1/60);
 x.a.pos.add(origin.clone().sub(x.a.muzzle(new THREE.Vector3())));x.a.obj.updateMatrixWorld(true);
 const beam=x.g.projectiles.spawnBeam(x.a,{radius:.04,tipSpeed:20,dps:6,maxLen:60,kiPerSec:.01,steer:0,color:'#ffd97a'});near(beam.muzzle.distanceTo(origin),0,'native hose muzzle alignment');return beam;
}
for(const hz of [30,60,120])test(`traveled native hose never prehits and conserves real cell DPS at ${hz} Hz`,()=>{
 const x=fixture();try{const p=panel(x);hose(x,p);for(let i=0;i<hz/5;i++)x.g.projectiles.update(1/hz,x.g);near(hp(x),12,'short traveled tip cannot hit');assert.equal(x.events.hits.length,0);
  for(let i=0;i<hz&&hp(x)===12;i++)x.g.projectiles.update(1/hz,x.g);assert.ok(hp(x)<12,'actually arrived native hose must debit its panel');const before=hp(x);for(let i=0;i<10;i++)x.g.projectiles.update(1/hz,x.g);near(before-hp(x),6*10/hz,'DPS billed once per actual contact step');near(x.b.hp,1000,'panel full-soak HP');
 }finally{x.close();}
});
for(const change of ['break','retract','form'])test(`held native hose ${change} releases stale panel cap and requires new travel`,()=>{
 const x=fixture();try{const p=panel(x),beam=hose(x,p);for(let i=0;i<60&&hp(x)===12;i++)x.g.projectiles.update(1/60,x.g);assert.ok(hp(x)<12);const old=beam._bodyContact.naniteContact;assert.ok(old,'real retained metadata');
  // Native Game order: incoming ordinary contacts precede the remaining hose
  // update. Use that real manager phase without advancing the hose a second time.
  if(change==='break')fire(x,p,12,{contactOnly:true});else if(change==='retract')x.b._nanites.modules.get('q').deployed=false;else x.b.applyForm({name:'Same-epoch contact rebind',frame:{scale:1.05}});
  const body=x.b.hp,epoch=x.b._nanites.modules.get('q').epoch;near(epoch,old.epoch,'fixture invalidation preserves epoch');beam.end();const cap=new THREE.Vector3().fromArray(beam.path,(beam.pn-1)*3);x.g.projectiles.update(1/120,x.g);
  assert.notEqual(beam._bodyContact.naniteContact,old,'old view/cell token cannot survive fallback');
  if(change!=='form'){assert.ok(new THREE.Vector3().fromArray(beam.path,(beam.pn-1)*3).distanceTo(cap)>0,'released packet must resume travel');near(x.b.hp,body,'no body teleport at former panel');}
 }finally{x.close();}
});
test('native hose obeys actual cover before panel and keeps pierceFighters outside local billing',()=>{
 for(const covered of [true,false]){const x=fixture();try{const p=panel(x),beam=hose(x,p);if(covered){const at=p.point.clone().addScaledVector(p.normal,3);x.world.cover.push({x:at.x,z:at.z,hx:8,hz:.01,bottom:0,top:20,projectileShape:'box'});}else beam.pierceFighters=true;
  for(let i=0;i<70;i++)x.g.projectiles.update(1/60,x.g);near(hp(x),12,'cover/pierce does not invent local hit');if(covered){near(x.b.hp,1000,'cover blocks body');assert.equal(x.events.hits.length,0);}else assert.ok(x.b.hp<1000,'native piercing body lane remains active');
 }finally{x.close();}}
});
test('native full-soak hose bills every contact but keeps metal presentation bounded',()=>{
 const x=fixture();try{const beam=hose(x,panel(x));beam.dps=1;for(let i=0;i<80;i++)x.g.projectiles.update(1/120,x.g);const bodyHits=x.events.hits.filter(e=>e.target===x.b);assert.ok(bodyHits.length>10);near(12-hp(x),bodyHits.length/120,'all incoming ticks billed');assert.ok(x.events.metal.length<=2,'not one full metal burst per frame');assert.ok(x.events.metal.length>0);near(x.b.hp,1000,'no fake HP for feedback');}finally{x.close();}
});
function activeFist(x,p,kind='jab'){
 const {a,b,g}=x;a.aim.set(0,0,-1);a.aim3.copy(a.aim);a.facing=Math.PI;a.hasAimWorld=true;a.aimWorld.copy(p.point);a.pos.copy(p.point).add(new THREE.Vector3(0,-5,3));a.obj.updateMatrixWorld(true);
 if(kind==='jab')g.melee.strike(a);else{g.melee.chargeStart(a);g.melee.chargeUpdate(a,kind==='crush'?.65:.3);g.melee.chargeRelease(a);}
 for(let i=0;i<90&&a.mstate==='startup';i++){g.melee.update(a,1/120);a.animT+=1/120;a._animate(1/120);}assert.equal(a.mstate,'active','native authored startup must finish');
 const arm=a._meleeMotion.side===1?a.parts.armR:a.parts.armL,fist=arm.children[2].getWorldPosition(new THREE.Vector3());a.pos.add(p.point.clone().sub(fist));a.obj.updateMatrixWorld(true);arm.children[2].getWorldPosition(fist);near(fist.distanceTo(p.point),0,'actual fist at visible cell');assert.ok(a.pos.distanceTo(b.pos)<STRIKES[a.mId].reach,'fixture stays within authored native reach');return fist;
}
const resolveFists=x=>{for(const f of x.g.entities)x.g.melee.resolveContact(f);x.g.melee.endContactFrame();};
for(const reverse of [false,true])test(`actual active native fist hits outboard panel and rejects attacker once (${reverse?'reversed':'normal'} order)`,()=>{
 const x=fixture({reverse});try{const {a,b,g}=x,p=panel(x,0),fist=activeFist(x,p);
  for(const key of ['torso','head','pelvis'])assert.equal(fistContact(fist,fist,b.parts[key],.42,new THREE.Vector3()),Infinity,'fixture must not substitute a body hit');
  g.melee.beginContactFrame();for(const f of g.entities)g.melee.resolveContact(f);g.melee.endContactFrame();assert.ok(hp(x,0)<12,'actual active fist must damage the contacted panel');near(b.hp,1000,'native fist absorbed');assert.equal(g.melee._contactFrame,null);assert.equal(a.strikeHit.size,1);assert.equal(x.events.blocked,1);near(b.guardMeter,.86,'native strike guard debit');assert.ok(a.hitstop>=.1);assert.ok(a.strikeCd>=.55);assert.ok(a.staggerT>=.45);assert.equal(x.events.hits.length,1);near(x.events.hits[0].amount,0,'blocked strike callback is HP only');
 }finally{x.close();}
});
for(const guarded of [true,false])test(`native ${guarded?'blocked straight':'unguarded heavy'} reaches the winning physical cell`,()=>{
 const x=fixture();try{const p=panel(x,0);activeFist(x,p,'straight');x.b.guarding=guarded;x.g.melee.beginContactFrame();resolveFists(x);assert.ok(hp(x,0)<12,'real heavy branch must pass its selected cell');assert.equal(x.events.hits.length,1);if(guarded)assert.equal(x.events.blocked,1);else assert.ok(x.b.hp<1000,'ineligible panel is not passive armor');}finally{x.close();}
});
test('native haymaker keeps guard crush bypass instead of gaining panel absorption',()=>{
 const x=fixture();try{const p=panel(x,0);activeFist(x,p,'crush');assert.equal(x.a.mHay,true);x.g.melee.beginContactFrame();resolveFists(x);near(hp(x,0),12,'crush bypass has no local guard armor');assert.equal(x.b.guarding,false);near(x.b.guardMeter,.45,'native crush meter');assert.ok(x.b.hp<1000);assert.equal(x.events.blocked,0);}finally{x.close();}
});
for(const reverse of [false,true])test(`native moving defender cell sweep catches an endpoint miss (${reverse?'reversed':'normal'} order)`,()=>{
 const x=fixture({reverse});try{const p=panel(x,0),fist=activeFist(x,p);x.b.pos.x-=3.5;x.b.obj.updateMatrixWorld(true);x.g.melee.beginContactFrame();x.b.pos.x+=7;x.b.obj.updateMatrixWorld(true);const query={};assert.equal(naniteContact(x.b,fist,fist,.42,query),false,'final cells must miss the fist');resolveFists(x);assert.ok(x.b._nanites.modules.get('q').cells.some(c=>c.hp<12),'moving physical cell must be swept');assert.equal(x.a.strikeHit.size,1);assert.equal(x.events.hits.length,1);}finally{x.close();}
});
for(const change of ['blink-before-frame','form-during-frame'])test(`native ${change} does not invent historical plate contact`,()=>{
 const x=fixture();try{const p=panel(x,0),fist=activeFist(x,p);x.b.pos.x-=3.5;x.b.obj.updateMatrixWorld(true);if(change==='blink-before-frame'){x.b.pos.x+=7;x.b.obj.updateMatrixWorld(true);}x.g.melee.beginContactFrame();if(change==='form-during-frame'){x.b.applyForm({name:'Melee epoch-preserving rebind',frame:{scale:1.05}});x.b.pos.x+=7;x.b.obj.updateMatrixWorld(true);}assert.equal(naniteContact(x.b,fist,fist,.42,{}),false);resolveFists(x);assert.ok(x.b._nanites.modules.get('q').cells.every(c=>c.hp===12),'unrelated frame/view has no sweep');assert.equal(x.events.hits.length,0);
 }finally{x.close();}
});
// The earlier half-dt sample was a different nonlinear pose integration, not
// an observed within-frame path. Pin its actual defect: raw aim at dt0 used to
// spin the source shield3rad, then counter-rotate as the body caught up.
const shieldTransform=x=>{const matrix=panel(x,0).matrix;return {matrix,position:new THREE.Vector3().setFromMatrixPosition(matrix),rotation:new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(matrix))};};
for(const hz of [30,60,120,1000000])test(`source shield aim edge respects pose time and full orientation budget at ${hz} Hz`,t=>{
 const x=fixture();try{x.b.faceDir(Math.sin(-1.5),Math.cos(-1.5));x.b.aim3.copy(x.b.aim);for(let i=0;i<60;i++)x.b._animate(1/60);let before=shieldTransform(x);x.b.faceDir(Math.sin(1.5),Math.cos(1.5));x.b.aim3.copy(x.b.aim);
  for(let i=0;i<3;i++){x.b._animate(0);const zero=shieldTransform(x);near(zero.position.distanceTo(before.position),0,'aim command alone cannot translate metal');assert.ok(zero.rotation.angleTo(before.rotation)<1e-7,'aim command alone cannot rotate metal');}
  let maxAngle=0,maxPosition=0;for(let i=0;i<(hz>120?1:hz);i++){x.b._animate(1/hz);const next=shieldTransform(x),angle=next.rotation.angleTo(before.rotation),distance=next.position.distanceTo(before.position);maxAngle=Math.max(maxAngle,angle);maxPosition=Math.max(maxPosition,distance);assert.ok(angle<=8/hz+1e-7,`full panel turn${angle} exceeds native8rad/s budget`);assert.ok(distance<=180/hz+1e-7,'no finite center teleport at tiny dt');assert.ok(naniteEnvelopeClear(x.b,x.b.parts.nanites.get('q')),`actual panel clear at frame${i}`);before=next;}
  t.diagnostic(JSON.stringify({hz,maxAngle,maxPosition}));
 }finally{x.close();}
});
for(const pole of [1,-1])test(`source shield full cell has no zero-time or unbounded roll at ${pole>0?'upper':'lower'} aim pole`,()=>{
 const x=fixture();try{const aim=degrees=>x.b.aim3.set(0,pole*Math.sin(degrees*Math.PI/180),Math.cos(degrees*Math.PI/180));aim(89);for(let i=0;i<90;i++)x.b._animate(1/60);const before=shieldTransform(x);aim(91);x.b._animate(0);const zero=shieldTransform(x);near(zero.position.distanceTo(before.position),0,'pole command cannot translate panel at dt0');assert.ok(zero.rotation.angleTo(before.rotation)<1e-7,'normal similarity cannot hide a full-cell roll flip');x.b._animate(1/60);const after=shieldTransform(x);assert.ok(after.rotation.angleTo(before.rotation)<=8/60+1e-7,'full basis is bounded, not only normal');}finally{x.close();}
});
for(const body of ['procedural','superhero-male','superhero-female'])for(const [scale,bulk]of [[.65,.65],[.65,1.65],[1.5,.65],[1.5,1.65]])for(const attachment of ['left-forearm','right-forearm'])test(`turning shield retains fitted ${body} ${scale}/${bulk} ${attachment} and fixed-length bones`,()=>{
 const x=fixture({body,scale,bulk,attachment});try{const b=x.b,v=b.parts.nanites.get('q'),arm=v.arm,fore=arm.children[1],fist=arm.children[2],u=arm.userData.upperLength,w=arm.userData.foreLength;
  b.faceDir(Math.sin(-1.5),Math.cos(-1.5));b.aim3.copy(b.aim);for(let i=0;i<60;i++)b._animate(1/60);assert.ok(naniteEnvelopeClear(b,v),'settled broad body fit');b.faceDir(Math.sin(1.5),Math.cos(1.5));b.aim3.copy(b.aim);
  for(let i=0;i<60;i++){b._animate(1/60);const overlaps=[];for(const cell of snapshotNaniteCells(b))for(const volume of b.parts.naniteBodyVolumes){if(new OBB().fromBox3(new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5))).applyMatrix4(cell.matrix).intersectsOBB(new OBB().fromBox3(volume.box).applyMatrix4(volume.driver.matrixWorld)))overlaps.push(`${cell.cell}:${volume.driver.name||Object.keys(b.parts).find(k=>b.parts[k]===volume.driver)}`);}assert.ok(naniteEnvelopeClear(b,v),`actual body clearance frame ${i}: ${overlaps}`);const elbow=new THREE.Vector3(0,-u,0).applyMatrix4(arm.matrixWorld),foreTop=new THREE.Vector3(0,w/fore.scale.y/2,0).applyMatrix4(fore.matrixWorld),foreEnd=new THREE.Vector3(0,-w/fore.scale.y/2,0).applyMatrix4(fore.matrixWorld);assert.ok(elbow.distanceTo(foreTop)<.002*scale,'forearm stays joined to upper arm');assert.ok(foreEnd.distanceTo(fist.getWorldPosition(new THREE.Vector3()))<.002*scale,'hand stays joined to forearm');near(elbow.distanceTo(arm.getWorldPosition(new THREE.Vector3())),u,'upper bone length');near(foreTop.distanceTo(foreEnd),w,'forearm bone length');}
 }finally{x.close();}
});
for(const hz of [30,60,120])for(const reverse of [false,true])test(`native begin/update/end shield turn selects one reached cell at ${hz} Hz (${reverse?'reversed':'normal'} order)`,()=>{
 const x=fixture({reverse});try{const {a,b,g}=x;b.faceDir(Math.sin(-1.5),Math.cos(-1.5));b.aim3.copy(b.aim);for(let i=0;i<60;i++)b._animate(1/60);const p=panel(x,0),fist=activeFist(x,p),oldFrame=snapshotNaniteContactFrame(b);
  // Literal beginning/end native frame, not a separately integrated half-pose.
  a.pos.addScaledVector(p.normal,2);a.obj.updateMatrixWorld(true);const from=fist.clone().addScaledVector(p.normal,2);g.melee.beginContactFrame();b.faceDir(Math.sin(1.5),Math.cos(1.5));b.aim3.copy(b.aim);b._animate(1/hz);const current=panel(x,0);a.pos.add(current.point.clone().sub(from));a.obj.updateMatrixWorld(true);const to=(a._meleeMotion.side===1?a.parts.armR:a.parts.armL).children[2].getWorldPosition(new THREE.Vector3()),query={};assert.ok(naniteContact(b,from,to,.42,query,oldFrame),'recorded finite endpoint sweep reaches shield');assert.ok(query.t>=0&&query.t<=1);const winning=query.naniteContact.cell;resolveFists(x);assert.ok(hp(x,winning)<12,'native receiver bills selected first cell');assert.equal(g.melee._contactFrame,null);assert.equal(a.strikeHit.size,1);assert.equal(x.events.hits.length,1);assert.equal(x.events.hits[0].opts.naniteContact.cell,winning);
 }finally{x.close();}
});
for(const hz of [30,60,120])for(const reverse of [false,true])for(const mode of ['hole','near-miss'])test(`native turning shield ${mode} remains empty at ${hz} Hz (${reverse?'reversed':'normal'} order)`,()=>{
 const x=fixture({reverse,scale:1.5,width:1.2});try{const {a,b,g}=x;b.faceDir(Math.sin(-1.5),Math.cos(-1.5));b.aim3.copy(b.aim);for(let i=0;i<60;i++)b._animate(1/60);const cell=0,v=b.parts.nanites.get('q');
  const measure=()=>{b.obj.updateMatrixWorld(true);const matrix=v.root.matrixWorld.clone().multiply(v.layout[cell].matrix);return {point:new THREE.Vector3(mode==='near-miss'?-1.1:0,0,.5).applyMatrix4(matrix),normal:new THREE.Vector3(0,0,1).transformDirection(matrix)};};
  if(mode==='hole'){fire(x,panel(x,cell),12);assert.equal(hp(x,cell),0,'hole comes from real native projectile');}const beforeIntegrity=b._nanites.modules.get('q').cells.map(c=>c.hp);x.events.hits.length=0;const p=measure(),fist=activeFist(x,p);a.pos.addScaledVector(p.normal,2);a.obj.updateMatrixWorld(true);const from=fist.clone().addScaledVector(p.normal,2);g.melee.beginContactFrame();b.faceDir(Math.sin(1.5),Math.cos(1.5));b.aim3.copy(b.aim);b._animate(1/hz);const end=measure();a.pos.add(end.point.clone().sub(from));a.obj.updateMatrixWorld(true);resolveFists(x);assert.deepEqual(b._nanites.modules.get('q').cells.map(c=>c.hp),beforeIntegrity,'no invented moving panel winner');assert.equal(x.events.hits.length,0,'outboard gap/near miss cannot become body damage');assert.equal(a.strikeHit.size,0);
 }finally{x.close();}
});
test('source shield continuity state releases on guard exit, retraction, form, KO and respawn without owning the opposite arm',()=>{
 const x=fixture(),control=fixture({untagged:true});try{const b=x.b,c=control.b;for(const f of [b,c]){f.faceDir(Math.sin(1.5),Math.cos(1.5));f.aim3.copy(f.aim);f._animate(1/60);}const own=b.parts.nanites.get('q').arm,other=own===b.parts.armL?'armR':'armL';for(let i=0;i<3;i++)assert.ok(b.parts[other].children[i].quaternion.angleTo(c.parts[other].children[i].quaternion)<1e-7,'opposite guard arm remains native');assert.ok(b.parts[other].quaternion.angleTo(c.parts[other].quaternion)<1e-7);
  const initial=b._nanitePose.shields.get('q');b.guarding=false;b._animate(1/60);assert.equal(b._nanitePose.shields.size,0);b.guarding=true;b._animate(1/60);assert.notEqual(b._nanitePose.shields.get('q'),initial);
  b._nanites.modules.get('q').deployed=false;b._animate(1/60);assert.equal(b._nanitePose.shields.size,0);b._nanites.modules.get('q').deployed=true;b._animate(1/60);const old=b._nanitePose.shields.get('q');b.applyForm({name:'Continuity rebind',frame:{scale:1.05}});b._animate(1/60);assert.notEqual(b._nanitePose.shields.get('q')?.view,old.view);
  b._ko();assert.equal(snapshotNaniteCells(b).length,0);b._updateKO(10,x.g);advanceNanites(b._nanites,.65,new Set(['q']));b.guarding=true;b._animate(1/60);assert.ok(b._nanitePose.shields.get('q').epoch!==old.epoch,'new life must not reuse held orientation');
 }finally{x.close();control.close();}
});
test('moving shield feedback uses the winning endpoint-interpolated cell frame, not the final normal',()=>{
 const x=fixture();try{const b=x.b;b.faceDir(Math.sin(-1.5),Math.cos(-1.5));b.aim3.copy(b.aim);for(let i=0;i<60;i++)b._animate(1/60);const old=snapshotNaniteContactFrame(b),p=panel(x,0),from=p.point.clone().addScaledVector(p.normal,2);b.faceDir(Math.sin(1.5),Math.cos(1.5));b.aim3.copy(b.aim);b._animate(1/30);const next=panel(x,0),out={};assert.ok(naniteContact(b,from,next.point,.42,out,old));assert.equal(out.naniteContact.cell,0);
  const position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(),position2=new THREE.Vector3(),rotation2=new THREE.Quaternion(),scale2=new THREE.Vector3();p.matrix.decompose(position,rotation,scale);next.matrix.decompose(position2,rotation2,scale2);const at=new THREE.Matrix4().compose(position.lerp(position2,out.t),rotation.slerp(rotation2,out.t),scale.lerp(scale2,out.t));near(out.naniteContact.point.distanceTo(new THREE.Vector3(0,0,.5).applyMatrix4(at)),0,'surface point belongs to selected time');assert.ok(out.naniteContact.normal.angleTo(new THREE.Vector3(0,0,1).transformDirection(at))<1e-7,'normal belongs to selected time');
 }finally{x.close();}
});
test('actual thin cover before the active fist panel prevents new cell contact',()=>{
 const x=fixture();try{const p=panel(x,0);activeFist(x,p);x.a.pos.addScaledVector(p.normal,2);x.a.obj.updateMatrixWorld(true);x.g.melee.beginContactFrame();x.a.pos.addScaledVector(p.normal,-2);x.a.obj.updateMatrixWorld(true);const at=p.point.clone().addScaledVector(p.normal,1);x.world.cover.push({x:at.x,z:at.z,hx:8,hz:.01,bottom:0,top:20,projectileShape:'box'});resolveFists(x);near(hp(x,0),12,'cover wins before metal');assert.equal(x.events.hits.length,0);assert.equal(x.a.strikeHit.size,0);
 }finally{x.close();}
});
for(const reverse of [false,true])test(`an earlier real other body clears the later panel winner (${reverse?'reversed':'normal'} order)`,()=>{
 const x=fixture({reverse});let third;try{const p=panel(x,0),fist=activeFist(x,p);const def=structuredClone(x.a.def);third=new Fighter(def,{team:2});third._game=x.g;third._openSky=true;third.invuln=0;third.hp=third.maxHp=1000;third.stats={dmg:0,big:0,taken:0};x.g.scene.add(third.obj);third._animate(1/60);third.pos.add(fist.clone().addScaledVector(p.normal,2).sub(third.parts.torso.getWorldPosition(new THREE.Vector3())));third.obj.updateMatrixWorld(true);x.g.entities.splice(reverse?0:x.g.entities.length,0,third);
  x.a.pos.addScaledVector(p.normal,2);x.a.obj.updateMatrixWorld(true);x.g.melee.beginContactFrame();x.a.pos.addScaledVector(p.normal,-2);x.a.obj.updateMatrixWorld(true);resolveFists(x);assert.ok(third.hp<1000,'earlier physical body receives native hit');near(hp(x,0),12,'later panel is not copied onto winner');assert.equal(x.a.strikeHit.size,1);assert.equal(x.events.hits.length,1);assert.ok(x.events.hits[0].target===third);assert.equal(x.events.hits[0].opts.naniteContact,null);
 }finally{x.close();third?.dispose();}
});
test('native grab defeats raised shield and clinch throw carries no cell metadata',()=>{
 const x=fixture();try{x.a.pos.set(0,0,5);x.a.faceDir(0,-1);x.a.aim3.copy(x.a.aim);x.g.melee.grab(x.a);for(let i=0;i<30&&x.a.grabState==='startup';i++)x.g.melee.update(x.a,1/120);assert.ok(x.a.grabbing===x.b,'native grab reaches guarding target');assert.equal(x.b.guarding,false);x.g.melee.grab(x.a);assert.ok(x.b.hp<1000,'native aimed throw damages owner');assert.ok(x.b._nanites.modules.get('q').cells.every(c=>c.hp===12),'grab bypass does not damage armor cells');assert.ok(x.events.hits.every(e=>!e.opts.naniteContact));
 }finally{x.close();}
});
function chargedCannon(x){
 const {b,g}=x;b.ki=b.maxKi=100;for(let i=0;i<30;i++){runSlot(b,'q',{held:true,pressed:i===0,released:false,dt:1/60},g);b.animT+=1/60;b._animate(1/60);}assert.equal(b.slots.q.charging,true,'real cannon charge must be active');
 const c=snapshotNaniteCells(b)[0],point=new THREE.Vector3(0,-.5,0).applyMatrix4(c.matrix),normal=new THREE.Vector3(0,-1,0).transformDirection(c.matrix);return {point,normal,cell:0,matrix:c.matrix};
}
test('real cannon cell takes integrity damage without absorbing any accepted owner damage',()=>{
 const x=fixture({form:'cannon'});try{const p=chargedCannon(x);fire(x,p,5);near(hp(x,0),7,'cannon local debit');near(1000-x.b.hp,5,'cannon is not armor');assert.equal(x.events.hits.length,1);}finally{x.close();}
});
test('native deflection still wins over a real cannon-cell contact with no copied owner damage',()=>{
 const x=fixture({form:'cannon'});try{const p=chargedCannon(x);x.b.guarding=true;x.b.def.guardType='deflect';const shot=fire(x,p,5);assert.equal(shot._defl,true);near(hp(x,0),12,'cannon cannot overrule native reflection');near(x.b.hp,1000,'no copied reflected damage');const hit=x.events.hits.filter(e=>e.target===x.b);assert.equal(hit.length,1);assert.equal(hit[0].outcome?.deflected,true);}finally{x.close();}
});
for(const state of ['lowered','chargingKi'])test(`real ${state} shield loses local integrity without passive absorption`,()=>{
 const x=fixture();try{const p=panel(x);if(state==='lowered')x.b.guarding=false;else x.b.chargingKi=true;fire(x,p);near(hp(x),7,'struck ineligible metal');near(1000-x.b.hp,5,'original accepted amount reaches owner');assert.equal(x.events.hits.length,1);}finally{x.close();}
});
test('real final-melee cannon break permanently retires pending energy before launch',()=>{
 const x=fixture({form:'cannon'});try{const p=chargedCannon(x);runSlot(x.b,'q',{held:false,pressed:false,released:true,dt:1/60},x.g);x.b._animate(1/60);const shot=x.g.projectiles.list.at(-1);assert.ok(shot&&!shot._launchResolved);x.a.powerBuff=3;activeFist(x,p);x.g.melee.beginContactFrame();resolveFists(x);assert.ok(x.b._nanites.modules.get('q').cells.some(c=>c.broken),'native fist must break cannon');assert.equal(shot.dead,true,'final melee precedes native launch prepass');x.g.projectiles.resolveLaunches(x.g);assert.equal(shot._launchResolved,false);advanceNanites(x.b._nanites,1.15,new Set(['q']));presentNanites(x.b);shot.resolveLaunch(x.g);assert.equal(shot.dead,true);}finally{x.close();}
});
test('incoming native projectile break after launch cannot erase already traveling cannon energy',()=>{
 const x=fixture({form:'cannon'});try{const p=chargedCannon(x);runSlot(x.b,'q',{held:false,pressed:false,released:true,dt:1/60},x.g);x.b._animate(1/60);const outgoing=x.g.projectiles.list.at(-1);x.g.projectiles.resolveLaunches(x.g);assert.equal(outgoing._launchResolved,true);const origin=outgoing.pos.clone();fire(x,p,12,{contactOnly:true,dt:.11});assert.ok(x.b._nanites.modules.get('q').cells.some(c=>c.broken));assert.equal(outgoing.dead,false,'committed energy is independent of its later broken emitter');near(outgoing.pos.distanceTo(origin),0,'incoming contact phase did not move unrelated energy');}finally{x.close();}
});
test('real cannon break cancels only its own charged module and does not revive after repair',()=>{
 const x=fixture({form:'cannon',dual:true});try{chargedCannon(x);runSlot(x.b,'e',{held:true,pressed:true,released:false,dt:1/60},x.g);x.b._animate(1/60);assert.equal(x.b.slots.e.charging,true);const cell=snapshotNaniteCells(x.b).find(c=>c.slot==='q'&&c.cell===0),p={point:new THREE.Vector3(0,-.5,0).applyMatrix4(cell.matrix),normal:new THREE.Vector3(0,-1,0).transformDirection(cell.matrix)};fire(x,p,12);
  assert.equal(x.b.slots.q.charging,false);assert.equal(x.b.slots.q.orb,null);assert.equal(x.b.slots.e.charging,true);assert.ok(x.b.slots.e.orb);assert.ok(x.b._nanites.modules.get('e').cells.every(c=>c.hp===12));advanceNanites(x.b._nanites,1.15,new Set(['q','e']));presentNanites(x.b);assert.equal(x.b.slots.q.charging,false,'repair requires fresh input');assert.equal(x.b.slots.e.charging,true);
 }finally{x.close();}
});
test('published ORIGIN dual modules protect with real shield cells and keep native guarded cannon masking',()=>{
 const shield=POWERS.find(p=>p.id==='nanite-shield'),cannon=POWERS.find(p=>p.id==='nanite-cannon');assert.ok(shield,'shield publication waits for native protection gate');assert.equal(shield.cost,20);assert.equal(shield.cat,'buff');assert.equal(shield.ab.type,'naniteShield');assert.equal(cannon.cost,28);
 const picks=freshPicks();picks.name='Native dual gate';picks.slots.lmb=cannon.id;picks.slots.q=shield.id;const definition=buildDef(picks,'cx_nanite_dual_gate'),x=fixture({definition});try{const {b,g}=x;assert.equal(attackIdentity(b.slots.q.def),attackIdentity(definition.abilities.q));assert.equal(b._nanites.modules.size,2);assert.equal(b.parts.nanites.get('q').arm,b.parts.armR);assert.equal(b.parts.nanites.get('lmb').arm,b.parts.armL);const p=panel(x);fire(x,p,4);near(hp(x),8,'catalog shield absorbs actual native projectile');near(b.hp,1000,'catalog full soak');assert.ok(b._nanites.modules.get('lmb').cells.every(c=>c.hp===12));
  g.fwd=new THREE.Vector3(0,0,1);g.right=new THREE.Vector3(1,0,0);g.pad={lx:0,ly:0,rx:0,ry:0,aiming:false,down:k=>['guard','lmb','q'].includes(k),pressed:k=>['lmb','q'].includes(k),released:()=>false};const energy=b.ki;Game.prototype.controlPad.call(g,b,1/60);assert.equal(b.guarding,true);assert.equal(b.slots.lmb.charging,false,'genuine dual source does not create new guard-fire permission');assert.equal(b._nanites.modules.get('q').deployed,true,'guarded toggle is masked');near(b.ki,energy,'masked native input does not pay');assert.equal(g.projectiles.list.filter(p=>p.caster===b&&!p.dead).length,0);
  g.melee.guard(b,false);b.hitstop=0;b.slots.lmb.cd=0;b.ki=b.maxKi=100;for(let i=0;i<30;i++){runSlot(b,'lmb',{held:true,pressed:i===0,released:false,dt:1/60},g);b.animT+=1/60;b._animate(1/60);}assert.equal(b.slots.lmb.charging,true);runSlot(b,'lmb',{held:false,released:true,dt:1/60},g);b._animate(1/60);g.projectiles.resolveLaunches(g);assert.ok(g.projectiles.list.some(p=>p.caster===b&&p._launchResolved&&!p.dead),'opposite genuine cannon still launches after lowering Guard');
 }finally{x.close();}
});
