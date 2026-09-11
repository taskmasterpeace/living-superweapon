import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Construct} from '../src/engine/summons.js';
import {Fighter} from '../src/engine/entity.js';
import {Game} from '../src/engine/game.js';
import {World} from '../src/engine/world.js';
import {MeleeSystem} from '../src/engine/melee.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {ROSTER} from '../src/data/characters.js';
import {coverBoxEntry,sweepSplitObstacle} from '../src/engine/projectile-contact.js';

const vec=(x=0,y=7,z=0)=>new THREE.Vector3(x,y,z);
const near=(a,b,why='')=>assert.ok(Math.abs(a-b)<1e-7,`${why}: ${a} != ${b}`);
function fixture(t){
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],coverAll:[],interiors:[],ARENA:240,
  heightAt:()=>0,shake(){},punch(){},refreshFogBoxes(){},setBlockCracks(){},crater(){this.craters=(this.craters||0)+1;},hitInteriorWall:World.prototype.hitInteriorWall};
 const stage=new StudioCombat(scene,world),g=stage.game;
 // Only Canvas2D texture generation needs a browser; native contact geometry,
 // particles, damage and disposal remain live in this headless fixture.
 const impactTexture=new THREE.Texture();g.vfx._impactTex=()=>impactTexture;t.after(()=>impactTexture.dispose());
 Object.assign(g,{worldImpact:Game.prototype.worldImpact,damageBlock:Game.prototype.damageBlock,shatterBlock:Game.prototype.shatterBlock,
  _ventHazard:Game.prototype._ventHazard,cityStats:{craters:0,blocks:0},onDrained(){this.drained=(this.drained||0)+1;}});
 const fighter=(team,x=80,z=80)=>{
  const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='sol')));f._game=g;f.team=team;f.invuln=0;f.armor=0;f.resist={};f.ki=100;f.energyInfinite=false;
  f.pos.set(x,0,z);f.obj.position.copy(f.pos);f.aim.set(0,0,1);f.aim3.set(0,0,1);f.sheet.kiRegenMult=0;f.sheet.blastMult=1;f.hp=f.maxHp=1000;g.entities.push(f);scene.add(f.obj);return f;
 };
 const owner=fighter(2),src=fighter(1,-80,-80);owner.isPlayer=true;g.player=owner;
 const wall=(x=0,z=20,extra={},o=owner)=>{
  o.isPlayer=true;o.pos.set(x,0,z-100);g.aimPoint.set(x,0,z);const c=new Construct(g,o,{type:'construct',construct:'wall',constructLifetime:'damage',constructKiPerDamage:2,...extra});g.constructs.push(c);return c;
 };
 const shot=(extra={})=>g.projectiles.spawnProjectile(src,{pos:vec(0,7,0),vel:vec(0,0,100),radius:.1,damage:10,blast:10,blastScaled:true,ground:false,...extra});
 const tick=(dt=1/60)=>{g.time+=dt;g.projectiles.update(dt,g);};
 t.after(()=>{stage.dispose();for(const f of g.entities)f.dispose();});
 return {g,world,owner,src,fighter,wall,shot,tick};
}

test('resource wall box follows the actual rotated solid, without changing legacy wall shape',t=>{
 const {wall,owner}=fixture(t);owner.pos.set(0,0,-80);const c=wall(),b=c._cover;
 assert.equal(b.projectileShape,'box');near(b.hx,11);near(b.hz,1.5);assert.equal(b.bottom,0);assert.equal(b.top,14);assert.equal(b.hp,undefined);
 assert.equal(typeof b.onConstructHit,'function');const legacy=wall(40,20,{constructLifetime:'timed'});assert.equal(legacy._cover.projectileShape,undefined);assert.equal(legacy._cover.onConstructHit,undefined);
});
for(const power of [1,2])for(const ballistic of [true,false])test(`native ${ballistic?'ballistic':'explosive'} contact uses exactly its own damage lane at power ${power}`,t=>{
 const {owner,src,wall,shot,tick}=fixture(t);src.powerBuff=power;const c=wall();const p=shot({ballistic,bullet:true});
 for(let i=0;i<30&&!p.dead;i++)tick();
 assert.equal(p.dead,true);const spent=(ballistic?20:16)*power;
 near(owner.ki,100-spent);near(c.kiSpent,spent);assert.equal(c.hitCount,1);near(c.damageReceived,spent/2);
});
test('native remote payload spends nothing before detonation then bills centered splash only once',t=>{
 const {g,owner,wall,shot}=fixture(t),c=wall(),p=shot({pos:vec(0,7,20),vel:vec(0,0,0)});
 assert.equal(owner.ki,100);p.detonate(g);p.detonate(g);near(owner.ki,84);assert.equal(c.hitCount,1);assert.equal(p.dead,true);
});
test('native armed contact waits for the real fuse explosion',t=>{
 const {owner,wall,shot,tick}=fixture(t),c=wall(),p=shot({charged:true,armDelay:.3});
 for(let i=0;i<30&&!p._armed;i++)tick();assert.equal(p._armed,true);assert.equal(owner.ki,100);tick(.1);assert.equal(owner.ki,100);
 for(let i=0;i<30&&!p.dead;i++)tick();assert.ok(owner.ki<100);assert.equal(c.hitCount,1);
});
test('native splash uses each closest 3D box once and keeps real city effects separate',t=>{
 const {g,world,owner,fighter,wall}=fixture(t);owner.pos.set(0,0,-80);const c=wall(0,20),other=fighter(2),d=wall(0,27,{},other);
 const city={x:4,z:20,r:2,hx:2,hz:2,h:14,top:14,hp:100,maxHp:100,district:'none'};world.cover.push(city);
 g.areaDamage(g.entities[1],vec(0,6,20),10,10,1.3);
 near(owner.ki,80);near(other.ki,86.6);assert.equal(c.hitCount,1);assert.equal(d.hitCount,1);near(city.hp,78.72727272727273);assert.equal(world.craters,1);assert.equal(g.cityStats.blocks,0);
});
test('native direct cover callback saturates a shared pool and skips already-retired receivers',t=>{
 const {g,owner,src,wall}=fixture(t),a=wall(),b=wall(30);owner.ki=15;
 g.damageBlock(a._cover,5,vec(0,7,20),src);near(owner.ki,5);g.damageBlock(b._cover,5,vec(30,7,20),src);
 assert.equal(owner.ki,0);assert.equal(a.dead,true);assert.equal(b.dead,true);near(a.kiSpent,10);near(b.kiSpent,5);assert.equal(g.drained,1);
 g.damageBlock(a._cover,5,vec(),src);assert.equal(g.drained,1);assert.equal(g.world.cover.length,0);
});
for(const hz of [30,60,120])test(`native traveled beam charges only reached sustained steps (${hz} Hz)`,t=>{
 const {g,owner,src,wall,tick}=fixture(t);owner.pos.set(0,0,-80);const c=wall();src.pos.set(0,7,0);src.muzzle=out=>out.copy(src.pos);src.ki=1e6;
 const beam=g.projectiles.spawnBeam(src,{radius:.1,tipSpeed:60,maxLen:100,dps:20,kiPerSec:0});
 tick(1/hz);assert.equal(owner.ki,100,'no hitscan before arrival');
 for(let i=0;i<hz&&!beam.blocked;i++)tick(1/hz);
 assert.equal(beam.blocked,true);const start=owner.ki,count=c.hitCount;
 beam.clipForContacts(g);assert.equal(owner.ki,start,'prepass has no damage');
 for(let i=0;i<3;i++)tick(1/12);near(owner.ki,start-10);assert.equal(c.hitCount,count+3);
 beam.end();const end=owner.ki;for(let i=0;i<20;i++)tick(1/hz);assert.equal(owner.ki,end);
});
test('opted-in finite bottom clips underside/top/inside and misses below without changing legacy boxes',()=>{
 const b={x:0,z:0,hx:2,hz:2,bottom:10,top:14,h:14,projectileShape:'box'},out={};
 assert.equal(coverBoxEntry(vec(-4,9,0),vec(4,9,0),b),Infinity);
 near(coverBoxEntry(vec(0,8,0),vec(0,12,0),b,.4,.4),.4);
 near(coverBoxEntry(vec(0,16,0),vec(0,12,0),b,.4,.4),.4);
 assert.equal(coverBoxEntry(vec(0,11,0),vec(0,12,0),b),0);
 assert.equal(sweepSplitObstacle({cover:[b]},vec(-4,9,0),vec(4,9,0),.42,out,false,.42),false);
 const old={...b};delete old.bottom;assert.ok(Number.isFinite(coverBoxEntry(vec(-4,9,0),vec(4,9,0),old)));
});
test('real active fist contact debits once and advances recovery without a humanoid target',t=>{
 const {g,owner,src,wall}=fixture(t);src.pos.set(0,0,0);src.def.strength=5;src.sheet.jabMult=1;src._animate(0);src.obj.updateMatrixWorld(true);
 const fist=src.parts.armR.children[2].getWorldPosition(vec()),c=wall(fist.x,fist.z+.5);owner.pos.set(fist.x,0,-80);
 src.mId='jab';src.mKind='light';src.mstate='active';src.mT=.001;src.strikeHit=new Set();src.strikeIdx=0;
 src._meleeMotion={side:1,previous:fist.clone().add(vec(0,0,-2)),current:vec(),impact:vec(),dt:1/30};
 const melee=new MeleeSystem(g);melee.resolveContact(src);near(owner.ki,84);assert.equal(c.hitCount,1);assert.ok(src.strikeHit.has(c));assert.equal(src.mstate,'recover');assert.ok(src.hitstop>0);
 melee.resolveContact(src);near(owner.ki,84);
});

for(const mode of ['upkeep','damage','timed'])test(`native tank ${mode} is a real finite receiver with exclusive billing`,t=>{
 const {g,owner,src}=fixture(t);owner.pos.set(0,0,0);owner.aim.set(0,0,1);g.aimPoint.set(0,0,16);
 const c=g.spawnConstruct(owner,{construct:'tank',constructLifetime:mode,constructKiPerDamage:2});
 const result=g.damageBlock(c._cover,10,vec(0,6,9),src);
 assert.deepEqual(result,{accepted:true,amount:10,kiSpent:mode==='damage'?20:0,destroyed:false});near(owner.ki,mode==='damage'?80:100);assert.equal(c.hitCount,1);assert.equal(c._cover.hp,undefined);
});
for(const team of ['hostile','friendly','self','unknown'])for(const lane of ['projectile','beam','melee','splash'])test(`${team} ${lane} has explicit accepted amount and team billing`,t=>{
 const {g,owner,src,wall}=fixture(t),c=wall();g.friendlyFire=true;
 if(team==='friendly')src.team=owner.team;
 const source=team==='self'?owner:team==='unknown'?null:src;
 const result=c.receiveHit(10,{src:source,pos:vec(0,7,18.5),lane});
 const amount=team==='hostile'?10:team==='friendly'&&lane==='splash'?5:0;
 near(owner.ki,100-amount*2);assert.equal(result.accepted,amount>0);near(result.amount,amount);near(c.damageReceived,amount);assert.equal(c.hitCount,amount>0?1:0);
});
test('friendlyFire off, infinite core and invalid amounts cannot debit the owner',t=>{
 const {g,owner,src,wall}=fixture(t),c=wall();src.team=owner.team;g.areaDamage(src,vec(0,7,20),10,10);assert.equal(owner.ki,100);assert.equal(c.hitCount,0);
 src.team=1;owner.energyInfinite=true;owner.ki=0;assert.equal(c.receiveHit(100,{src,pos:vec()}).kiSpent,0);assert.equal(c.dead,false);
 for(const amount of [-1,0,NaN,Infinity])assert.equal(c.receiveHit(amount,{src,pos:vec()}).accepted,false);assert.equal(c.hitCount,1);
});
test('unknown-source native splash is non-billable while normal world effects remain safe',t=>{
 const {g,owner,wall}=fixture(t),c=wall();g.areaDamage(null,vec(0,7,20),10,10);assert.equal(owner.ki,100);assert.equal(c.hitCount,0);
});
test('synchronous splash retirement cannot skip the next unrelated receiver or double-charge a sibling',t=>{
 const {g,owner,src,fighter,wall}=fixture(t),a=wall(),b=wall(),other=fighter(2),c=wall(0,20,{},other);owner.ki=15;
 g.areaDamage(src,vec(0,7,20),10,10);assert.equal(owner.ki,0);assert.equal(a.dead,true);assert.equal(b.dead,true);assert.equal(a.hitCount,1);assert.equal(b.hitCount,0);assert.equal(g.drained,1);
 near(other.ki,80);assert.equal(c.hitCount,1);assert.deepEqual(g.world.cover,[c._cover]);
});
test('explicit city destruction entry cannot shatter or score a construct proxy',t=>{
 const {g,src,wall}=fixture(t),c=wall();g.shatterBlock(c._cover,src);assert.equal(g.cityStats.blocks,0);assert.equal(c.dead,false);assert.equal(g.world.cover.includes(c._cover),true);
});
for(const hz of [30,60,120])for(const ballistic of [false,true])test(`guided early native update preserves one ${ballistic?'direct':'splash'} route (${hz} Hz)`,t=>{
 const {g,owner,wall,shot}=fixture(t),c=wall(),p=shot({pos:vec(0,7,18),vel:vec(0,0,2000),guidedSplit:true,ballistic});
 p.update(1/hz,g);assert.equal(p.dead,true);near(owner.ki,ballistic?80:84.096);assert.equal(c.hitCount,1);near(p.pos.z,18.4);
});
for(const hz of [30,60,120])test(`actual split-parent detonation children each reach one real splash (${hz} Hz)`,t=>{
 const {g,owner,wall,shot,tick}=fixture(t),c=wall(),p=shot({pos:vec(0,7,0),radius:.1,blast:10,splitCount:2,splitSpread:0,splitHoming:0,splitSpeed:2000});
 p.detonate(g);assert.equal(owner.ki,100);const children=g.projectiles.list.filter(s=>s!==p);assert.equal(children.length,2);
 for(let i=0;i<3&&children.some(s=>!s.dead);i++)tick(1/hz);assert.ok(children.every(s=>s.dead));assert.equal(c.hitCount,2);assert.ok(owner.ki<100);assert.ok(children.every(s=>s.pos.z<=18.5));
 // Parent has no in-range box: only the two children's measured native payloads.
 // Each child is 5 damage, radius .1/cuberoot(2), blast 10/sqrt(2).
 near(c.kiSpent,16*(1-.6*(.1/Math.cbrt(2))/(10/Math.sqrt(2))));
});
for(const direction of ['under','top','side','inside'])test(`native finite-box ricochet ${direction} reflects and separates on the actual contact face`,t=>{
 const {g,owner,wall,shot,tick}=fixture(t),c=wall();Object.assign(c._cover,{bottom:10,top:14,h:14});
 const poses={under:[vec(0,8,20),vec(0,100,0)],top:[vec(0,16,20),vec(0,-100,0)],side:[vec(0,12,16),vec(0,0,100)],inside:[vec(0,10.1,20),vec(0,100,0)]};
 const [pos,vel]=poses[direction],p=shot({pos,vel,ballistic:true,bounces:2});tick(.04);
 near(owner.ki,80);assert.equal(c.hitCount,1);assert.equal(p.bounces,1);
 if(direction==='under'||direction==='inside'){assert.ok(p.vel.y<0);assert.ok(p.pos.y<10);}
 else if(direction==='top'){assert.ok(p.vel.y>0);assert.ok(p.pos.y>14);}
 else{assert.ok(p.vel.z<0);assert.ok(p.pos.z<18.4);}
 assert.equal(p.dead,false);g.projectiles.update(0,g);assert.equal(c.hitCount,1);
});
test('native ricochet can legitimately hit the same construct again on a later frame',t=>{
 const {owner,wall,shot,tick}=fixture(t),c=wall(),p=shot({pos:vec(0,7,18),ballistic:true,bounces:3});tick(.02);near(owner.ki,80);
 p.vel.z=100;tick(.02);near(owner.ki,60);assert.equal(c.hitCount,2);
});

function makeBeam(f,extra={}){
 f.src.pos.set(0,7,0);f.src.muzzle=out=>out.copy(f.src.pos);f.src.ki=1e6;
 return f.g.projectiles.spawnBeam(f.src,{radius:.1,tipSpeed:2000,maxLen:150,dps:20,kiPerSec:.1,...extra});
}
for(const blocker of ['city','interior','fighter','construct'])test(`nearer native ${blocker} protects the farther beam receiver`,t=>{
 const f=fixture(t),far=f.wall(),beam=makeBeam(f);let close;
 if(blocker==='city')f.world.cover.unshift({x:0,z:8,hx:8,hz:.1,r:.1,h:20,hp:1000,maxHp:1000});
 if(blocker==='interior')f.world.interiors.push({x:0,z:8,hx:20,hz:2,top:20,walls:[{x:0,z:8,hx:8,hz:.1}]});
 if(blocker==='fighter'){close=f.fighter(2,0,8);close.pos.y=1.8;close._animate(0);close.obj.updateMatrixWorld(true);}
 if(blocker==='construct')close=f.wall(0,8);
 for(let i=0;i<3;i++)f.tick(1/60);assert.equal(far.hitCount,0);assert.ok(beam.tip.position.z<12);
 if(blocker==='construct')assert.equal(close.hitCount,3);if(blocker==='fighter')assert.ok(close.hp<1000);
});
for(const radius of [.05,1,4])test(`beam radius ${radius} keeps stable clipped receiver accounting across Float32 endpoint storage`,t=>{
 const f=fixture(t),c=f.wall(),beam=makeBeam(f,{radius});
 f.tick(1/30);const before=f.owner.ki,count=c.hitCount;
 for(let i=0;i<30;i++)f.tick(1/120);near(f.owner.ki,before-10);assert.equal(c.hitCount,count+30);assert.ok(beam.tip.position.z<=18.5-radius+1e-4);
});
test('beam feedback is bounded while every native sustained frame is still billed',t=>{
 const f=fixture(t),c=f.wall();makeBeam(f);f.tick(1/30);const before=f.owner.ki,count=c.hitCount;let visualCalls=0;const contact=f.g.vfx.contact.bind(f.g.vfx);
 f.g.vfx.contact=(...args)=>{visualCalls++;return contact(...args);};
 for(let i=0;i<60;i++)f.tick(1/120);assert.equal(c.hitCount,count+60);near(f.owner.ki,before-20);assert.ok(visualCalls<=7,`${visualCalls} full contact effects in .5s`);
});
test('native friendly ballistic and beam obstruction remains solid with zero debit',t=>{
 const f=fixture(t),c=f.wall();f.src.team=f.owner.team;const p=f.shot({ballistic:true});for(let i=0;i<30&&!p.dead;i++)f.tick();
 assert.equal(p.dead,true);assert.equal(f.owner.ki,100);assert.equal(c.hitCount,0);
 const beam=makeBeam(f);for(let i=0;i<3;i++)f.tick();assert.equal(beam.blocked,true);assert.equal(f.owner.ki,100);assert.equal(c.hitCount,0);
});
test('pure clipping prepass and zero-time native beam update never charge a resource receiver',t=>{
 const f=fixture(t),c=f.wall(),beam=makeBeam(f);beam.resolveLaunch();beam.path.set([0,7,0,0,7,50]);beam.pn=2;
 beam.clipForContacts(f.g);assert.equal(c.hitCount,0);assert.equal(f.owner.ki,100);
 f.tick(0);assert.equal(c.hitCount,0);
});
test('an inserted resource wall clips a previously emitted curved hose in source order',t=>{
 const f=fixture(t),beam=makeBeam(f);beam.resolveLaunch();beam.path.set([0,7,0,30,7,0,30,7,40,0,7,40,0,7,5]);beam.pvel.fill(0);beam.pn=5;
 const late=f.wall(0,10),first=f.wall(30,30);f.tick(.001);
 assert.equal(first.hitCount,1,JSON.stringify({tip:beam.tip.position.toArray(),path:Array.from(beam.path.slice(0,beam.pn*3)),blocked:beam.blocked,ki:f.owner.ki,late:late.hitCount}));assert.equal(late.hitCount,0);assert.ok(beam.tip.position.x>20);near(f.owner.ki,99.96);
});
test('a real clash before a farther resource wall cannot bill that wall',t=>{
 const f=fixture(t),a=makeBeam(f,{tipSpeed:60}),bSrc=f.fighter(2,0,40);bSrc.pos.y=7;bSrc.muzzle=out=>out.copy(bSrc.pos);bSrc.aim3.set(0,0,-1);bSrc.ki=1e6;
 const b=f.g.projectiles.spawnBeam(bSrc,{radius:.1,tipSpeed:60,maxLen:100,dps:20,kiPerSec:.1});
 // Real emitted streams, then native manager clash. The farther wall is beyond
 // both the first beam's clash endpoint and the opposing caster.
 for(let i=0;i<35;i++)f.tick(1/60);assert.equal(a.clashing,true);const far=f.wall(0,70);
 for(let i=0;i<10;i++)f.tick(1/60);assert.equal(far.hitCount,0);assert.equal(a.clashing,true);assert.equal(b.clashing,true);
});

function activeSwing(f,{heavy=false}={}){
 f.pos.set(0,0,0);f.def.strength=5;f.sheet.jabMult=1;f._animate(0);f.obj.updateMatrixWorld(true);
 const at=f.parts.armR.children[2].getWorldPosition(vec());
 f.mId=heavy?'power':'jab';f.mKind=heavy?'heavy':'light';f.mHay=heavy;f.mP=.5;f.mstate='active';f.mT=.001;f.strikeHit=new Set();f.strikeIdx=0;
 f._meleeMotion={side:1,previous:at.clone().add(vec(0,0,-3)),current:vec(),impact:vec(),dt:1/30};return at;
}
for(const heavy of [false,true])for(const friendly of [false,true])test(`real ${heavy?'heavy':'light'} fist ${friendly?'friendly':'hostile'} object contact consumes one swing with exact damage`,t=>{
 const f=fixture(t),at=activeSwing(f.src,{heavy}),c=f.wall(at.x,at.z+.5);if(friendly)f.src.team=f.owner.team;
 const m=new MeleeSystem(f.g);m.resolveContact(f.src);m.resolveContact(f.src);
 const damage=heavy?27:8;near(f.owner.ki,friendly?100:100-2*damage);assert.equal(c.hitCount,friendly?0:1);assert.ok(f.src.strikeHit.has(c));assert.equal(f.src.mstate,'recover');assert.ok(f.src.hitstop>0);
});
for(const miss of ['outside','above','below','city','interior','interrupt','form'])test(`native swept fist ${miss} cannot create a farther construct hit`,t=>{
 const f=fixture(t),at=activeSwing(f.src),c=f.wall(at.x,at.z+.5),m=new MeleeSystem(f.g);
 if(miss==='outside'){f.src._meleeMotion.previous.x-=12;f.src.pos.x-=12;}
 if(miss==='above'){f.src._meleeMotion.previous.y+=20;f.src.pos.y+=20;}
 if(miss==='below'){Object.assign(c._cover,{bottom:20,top:34,h:34});c.obj.position.y+=20;}
 if(miss==='city')f.world.cover.unshift({x:at.x,z:at.z-2.5,hx:20,hz:.1,r:.1,h:20,projectileShape:'box'});
 if(miss==='interior')f.world.interiors.push({x:at.x,z:at.z-2.5,hx:20,hz:1,top:20,walls:[{x:at.x,z:at.z-2.5,hx:20,hz:.1}]});
 if(miss==='interrupt')f.src.stunT=.1;
 if(miss==='form'){c._dispose(f.g);const replacement=f.wall(at.x,at.z+4);m.beginContactFrame();f.src.applyForm({frame:{scale:1.2}});f.src.pos.z+=8;assert.equal(replacement.hitCount,0);}
 f.src.obj.updateMatrixWorld(true);m.resolveContact(f.src);m.endContactFrame();assert.equal(f.owner.ki,100);assert.equal(c.hitCount,0);
});

for(const first of ['construct','fighter'])for(const reverse of [false,true])test(`native fist selects ${first} before the other receiver, entity order reversed=${reverse}`,t=>{
 const f=fixture(t),at=activeSwing(f.src),c=f.wall(at.x,at.z-.2),victim=f.fighter(2,0,0),melee=new MeleeSystem(f.g);
 victim.obj.updateMatrixWorld(true);const center=victim.parts.torso.getWorldPosition(vec());
 victim.pos.add(at.clone().add(vec(0,0,first==='fighter'?-3.5:1.5)).sub(center));victim.obj.updateMatrixWorld(true);
 f.src._meleeMotion.previous.z=at.z-6;if(reverse)f.g.entities.reverse();
 melee.resolveContact(f.src);
 assert.equal(c.hitCount,first==='construct'?1:0);assert.equal(victim.hp<1000,first==='fighter');assert.equal(f.src.mstate,'recover');
 if(first==='construct')assert.ok(f.src.strikeHit.has(c));else assert.ok(f.src.strikeHit.has(victim.id));
});
test('a large wall surface inside authored reach can be struck while its center is outside reach',t=>{
 const f=fixture(t),at=activeSwing(f.src),c=f.wall(at.x+10.5,at.z+.5);
 assert.ok(c.pos.distanceTo(f.src.pos)>11);new MeleeSystem(f.g).resolveContact(f.src);
 assert.equal(c.hitCount,1);near(f.owner.ki,84);assert.ok(f.src._meleeMotion.impact.distanceTo(f.src.pos)<11);
});
test('repeated native active frames consume only one fist opportunity, without early recovery',t=>{
 const f=fixture(t),at=activeSwing(f.src),c=f.wall(at.x,at.z+.5);f.src.mT=.2;f.src._meleeMotion.dt=.001;
 const m=new MeleeSystem(f.g);for(let i=0;i<4;i++)m.resolveContact(f.src);assert.equal(c.hitCount,1);assert.equal(f.src.mstate,'active');near(f.owner.ki,84);
});
test('native melee snapshots discard a teleport before the contact frame instead of sweeping its history',t=>{
 const f=fixture(t),at=activeSwing(f.src),c=f.wall(at.x,at.z+4),m=new MeleeSystem(f.g);f.src.pos.z+=8;f.src.obj.updateMatrixWorld(true);
 m.beginContactFrame();m.resolveContact(f.src);m.endContactFrame();assert.equal(c.hitCount,0);assert.equal(f.owner.ki,100);assert.equal(f.src.mstate,'recover');
});
test('a participating armed payload neutralized before fuse causes no construct explosion debit',t=>{
 const f=fixture(t),c=f.wall(),p=f.shot({pos:vec(0,7,18),collisionPriority:1,armDelay:.5});
 for(let i=0;i<5&&!p._armed;i++)f.tick();assert.equal(p._armed,true);assert.equal(f.owner.ki,100);
 const opposing=f.fighter(2,-80,80);f.g.projectiles.spawnProjectile(opposing,{pos:p.pos.clone().add(vec(0,0,-3)),vel:vec(0,0,100),radius:.1,damage:10,collisionPriority:2,ground:false});
 for(let i=0;i<10&&!p.dead;i++)f.tick();assert.equal(p.dead,true);assert.equal(c.hitCount,0);assert.equal(f.owner.ki,100);
});
test('a guided explosive retains the native immediate-impact branch instead of inventing delayed arming',t=>{
 // The guided route historically impacts immediately; this fixture documents
 // that it stays an impact rather than silently changing its native branch.
 const f=fixture(t),c=f.wall(),p=f.shot({pos:vec(0,7,18),guidedSplit:true,armDelay:.5});
 p.update(1/60,f.g);assert.equal(p.dead,true);assert.equal(p._armed,false);assert.equal(c.hitCount,1);near(f.owner.ki,84.096);
});
test('ballistic native boomerang contact bills once but preserves its returning branch',t=>{
 const f=fixture(t),c=f.wall(),p=f.shot({pos:vec(0,7,18),ballistic:true,boomerang:true});f.tick(.01);
 assert.equal(p.dead,false);assert.equal(p._return,true);assert.equal(c.hitCount,1);near(f.owner.ki,80);
});
test('a resource wall depleted by the first native shot cannot bill a second same-step shot',t=>{
 const f=fixture(t),c=f.wall();f.owner.ki=15;const a=f.shot({pos:vec(0,7,18),ballistic:true}),b=f.shot({pos:vec(0,7,17.9),ballistic:true});
 f.tick(.02);assert.equal(a.dead,true);assert.equal(c.dead,true);assert.equal(c.hitCount,1);near(c.kiSpent,15);assert.equal(f.owner.ki,0);assert.equal(f.g.drained,1);assert.equal(b.dead,false);assert.ok(b.pos.z>18.5);
});
test('ballistic contact reports the actual pre-bounce point, not its separated position',t=>{
 const f=fixture(t);f.wall();const p=f.shot({pos:vec(0,7,18),ballistic:true,bounces:2}),points=[],native=f.g.vfx.contact.bind(f.g.vfx);
 f.g.vfx.contact=(pos,...rest)=>{points.push(pos.clone());return native(pos,...rest);};f.tick(.02);
 assert.equal(points.length,1);near(points[0].z,18.4);assert.ok(p.pos.z<18.1);
});
test('finite elevated proxy misses native low shots and splash below its bottom',t=>{
 const f=fixture(t),c=f.wall();Object.assign(c._cover,{bottom:20,top:34,h:34});c.obj.position.y+=20;
 const p=f.shot({ballistic:true});for(let i=0;i<20;i++)f.tick();assert.equal(p.dead,false);assert.equal(c.hitCount,0);
 f.g.areaDamage(f.src,vec(0,7,20),10,10);assert.equal(c.hitCount,0);assert.equal(f.owner.ki,100);
});
test('unmarked city box preserves its downward-unbounded contact and existing positive-Y bounce normal',t=>{
 const f=fixture(t);f.world.cover.push({x:0,z:20,hx:11,hz:1.5,h:14,top:14,projectileShape:'box'});
 const p=f.shot({pos:vec(0,8,20),vel:vec(0,100,0),ballistic:true,bounces:2});f.tick(.001);
 assert.equal(p.bounces,1);assert.ok(p.vel.z>0||p.vel.y>0);assert.equal(f.owner.ki,100);
});
test('native pose-pending beam has no construct damage before its emission gate opens',t=>{
 const f=fixture(t),c=f.wall();f.src._openSky=true;const beam=makeBeam(f,{poseLaunch:true});
 assert.equal(beam.pendingLaunch,true);beam.clipForContacts(f.g);f.tick(0);
 assert.equal(beam.pendingLaunch,true);assert.equal(c.hitCount,0);assert.equal(f.owner.ki,100);
});
