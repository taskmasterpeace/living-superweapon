import test from 'node:test';
import assert from 'node:assert/strict';
import {Fighter} from '../src/engine/entity.js';
import {zombieDefinition} from '../src/data/zombie-encounter.js';
const shot=(f,zone)=>f.takeDamage(9,{ballistic:true,weapon:'rifle',zone});
test('healthy left claw chambers outside its own ribs after right arm loss',async()=>{
 const T=await import('three');const {beginAbilityMeleePose,animateAbilityMeleePose}=await import('../src/engine/ability-melee-pose.js');
 const f=new Fighter(zombieDefinition());f._openSky=true;f._animate(0);
 f._zombieLimbs={armR:{disabled:true}};
 const slot={def:{contact:'fist'},t:.24,hit:new Set()};beginAbilityMeleePose(f,slot);f._abilityMeleePose.elapsed=.03;
 animateAbilityMeleePose(f);f.obj.updateMatrixWorld(true);
 const hand=f.parts.armL.children[2].getWorldPosition(new T.Vector3());f.parts.body.worldToLocal(hand);
 assert.ok(hand.x<f.parts.armL.position.x-.2,'left claw chamber crossed inside shoulder');
 f.dispose();
});
test('common zombie rifle headshot is lethal, torso requires two hits',()=>{
 const head=new Fighter(zombieDefinition());head.invuln=3;shot(head,'head');assert.equal(head.state,'ko');head.dispose();
 const body=new Fighter(zombieDefinition());shot(body,'torso');assert.equal(body.hp,50);shot(body,'torso');assert.equal(body.state,'ko');body.dispose();
});
test('rifle limbs never remove HP; arm disables after four and leg cripples after two',()=>{
 const f=new Fighter(zombieDefinition());for(let i=0;i<4;i++)shot(f,'armL');assert.equal(f.hp,f.maxHp);assert.equal(f._zombieLimbs.armL.disabled,true);assert.ok(f.staggerT>0);
 for(let i=0;i<2;i++)shot(f,'legR');assert.equal(f.hp,f.maxHp);assert.equal(f._zombieLimbs.legR.disabled,true);f.dispose();
});
test('sprinter has lower HP and dies to one rifle torso hit',()=>{
 const f=new Fighter(zombieDefinition(0,{sprinter:true}));assert.equal(f.maxHp,50);shot(f,'torso');assert.equal(f.state,'ko');f.dispose();
});

test('bullet contacts follow actual head and leg proxies rather than a height guess',async()=>{
 const {anatomicalBulletContact}=await import('../src/engine/anatomical-bullet-contact.js');const T=await import('three');const f=new Fighter(zombieDefinition());f._animate(0);f.obj.updateMatrixWorld(true);
 for(const [zone,mesh]of [['head',f.parts.head],['legL',f.parts.legL.userData.shin]]){const c=mesh.getWorldPosition(new T.Vector3()),a=c.clone().add(new T.Vector3(0,0,-20)),b=c.clone().add(new T.Vector3(0,0,20));assert.equal(anatomicalBulletContact(f,a,b,.01)?.zone,zone);}
 f.dispose();
});

test('ordinary projectile sweep reports anatomical zone and respects intervening cover',async()=>{
 const {earliestOrdinaryContact}=await import('../src/engine/attack-interception.js');const T=await import('three');const f=new Fighter(zombieDefinition());f._animate(0);f.obj.updateMatrixWorld(true);const c=f.parts.head.getWorldPosition(new T.Vector3());
 const p={pos:c.clone().add(new T.Vector3(0,0,-20)),radius:.01,ballistic:true,caster:{},life:5},end=c.clone().add(new T.Vector3(0,0,20));
 const game={world:{cover:[],interiors:[]},entities:[f],isFoe:()=>true};const hit=earliestOrdinaryContact(p,end,1,game);assert.equal(hit.kind,'foe');assert.equal(hit.zone,'head');
 game.world.cover.push({x:c.x,z:c.z-10,h:30,top:30,hx:3,hz:1,r:3,solid:true});assert.notEqual(earliestOrdinaryContact(p,end,1,game)?.kind,'foe');f.dispose();
});
test('disabled arms stop claw damage and disabled legs retain a permanent slowdown',async()=>{
 const {applyAbilityMeleeHit}=await import('../src/engine/ability-melee-hit.js');const {zombieLegSpeed}=await import('../src/engine/zombie-locational-damage.js');const f=new Fighter(zombieDefinition());
 for(const zone of ['armL','armR','legL'])for(let i=0;i<4;i++)shot(f,zone);
 f.staggerT=0;let hits=0;applyAbilityMeleeHit(f,{},{hit:new Set()},{},{id:'target',takeDamage(){hits++;}});assert.equal(hits,0);assert.equal(zombieLegSpeed(f),.35);assert.equal(f.hp,100);f.dispose();
});

test('one disabled arm prevents two-handed grabs but preserves healthy-arm combat',async()=>{
 const {MeleeSystem}=await import('../src/engine/melee.js');const f=new Fighter(zombieDefinition()),m=new MeleeSystem({});
 f.hitstop=0;f.staggerT=0;f.stunT=0;f.strikeCd=0;assert.ok(m.canBeginGrab(f));
 for(let i=0;i<4;i++)shot(f,'armL');f.staggerT=0;f.hitstop=0;f.state='idle';
 assert.ok(m.canAct(f),'healthy arm remains usable');assert.equal(m.canBeginGrab(f),false,'two-handed grab needs both arms');f.dispose();
});
