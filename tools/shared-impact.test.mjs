import test from 'node:test';
import assert from 'node:assert/strict';
import {Fighter} from '../src/engine/entity.js';
import {Game} from '../src/engine/game.js';
import {ROSTER} from '../src/data/characters.js';

function fixture({aDef={},bDef={},friendly=false}={}){
 const def=ROSTER.find(d=>d.id==='kano');
 const a=new Fighter({...structuredClone(def),weightLb:180,...aDef}),b=new Fighter({...structuredClone(def),weightLb:180,...bDef});
 for(const f of [a,b]){f._openSky=true;f.flying=true;f.gait='airborne';f.pos.y=80;}
 a.pos.x=-20;b.pos.x=0;a.aim.set(1,0,0);b.aim.set(-1,0,0);
 const g={entities:[a,b],time:0,isFoe:()=>!friendly,world:{cover:[],interiors:[]}};
 return {a,b,g,hit(av=100,bv=0){a.pos.x=-20;b.pos.x=0;Game.prototype.beginBodyContactFrame.call(g);a.pos.x=10;b.pos.x=5;a.vel.set(av,0,0);b.vel.set(bv,0,0);Game.prototype.resolveBodies.call(g);},close(){a._abilityMeleePose=null;b._abilityMeleePose=null;a.dispose();b.dispose();}};
}
test('ordinary flight contact transfers momentum and damages both without an attack',()=>{
 const t=fixture();try{t.hit();assert.ok(t.b.vel.x>0);assert.ok(t.a.hp<t.a.maxHp);assert.ok(t.b.hp<t.b.maxHp);assert.equal(t.a.grabbing,null);assert.equal(t.b.grabbedBy,null);}finally{t.close();}
});
test('head-on closing speed causes more impact than following at the same approach speed',()=>{
 const head=fixture(),follow=fixture();try{head.hit(100,-60);follow.hit(100,60);assert.ok(head.b.maxHp-head.b.hp>follow.b.maxHp-follow.b.hp);}finally{head.close();follow.close();}
});
test('equal world speed in formation causes no impact damage',()=>{
 const t=fixture();try{t.hit(100,100);assert.equal(t.a.hp,t.a.maxHp);assert.equal(t.b.hp,t.b.maxHp);}finally{t.close();}
});
test('authored body weight controls displacement while strength alone does not',()=>{
 const light=fixture(),heavy=fixture({bDef:{weightLb:720}}),strong=fixture({bDef:{strength:10}});
 try{light.hit();heavy.hit();strong.hit();assert.ok(heavy.b.vel.x<light.b.vel.x);assert.equal(strong.b.vel.x,light.b.vel.x);}finally{light.close();heavy.close();strong.close();}
});
test('resilience reduces received injury independently of momentum',()=>{
 const fragile=fixture({bDef:{resilience:1}}),tough=fixture({bDef:{resilience:10}});
 try{fragile.hit();tough.hit();assert.ok(tough.b.maxHp-tough.b.hp<fragile.b.maxHp-fragile.b.hp);assert.equal(tough.b.vel.x,fragile.b.vel.x);}finally{fragile.close();tough.close();}
});
test('a frontal brace resists displacement; turning away loses that support',()=>{
 const front=fixture(),rear=fixture();try{front.b.guarding=rear.b.guarding=true;rear.b.aim.set(1,0,0);front.hit();rear.hit();assert.ok(front.b.vel.x<rear.b.vel.x);assert.ok(front.b.ki<front.b.maxKi);}finally{front.close();rear.close();}
});
for(const kind of ['punch','ability','throw','launch','ally'])test(`${kind} contact keeps its existing owner without incidental collision damage`,()=>{
 const t=fixture({friendly:kind==='ally'});try{
 if(kind==='punch')t.a.mstate='active';if(kind==='ability')t.a._abilityMeleePose={physicalContact:true};
 if(kind==='throw'){t.a._thrownT=1;t.a._thrownBy=t.b;}if(kind==='launch')t.a.launchT=1;
 t.hit();assert.equal(t.a.hp,t.a.maxHp);assert.equal(t.b.hp,t.b.maxHp);
 }finally{t.close();}
});
test('repeated pressure within contact cooldown cannot charge damage again',()=>{
 const t=fixture();try{t.hit();const hp=t.b.hp;t.g.time=.1;t.hit();assert.equal(t.b.hp,hp);t.g.time=1;t.hit();assert.ok(t.b.hp<hp);}finally{t.close();}
});

test('perpendicular guard is not a frontal brace',()=>{
 const side=fixture(),front=fixture();try{side.b.guarding=front.b.guarding=true;side.b.aim.set(0,0,1);side.hit();front.hit();assert.ok(side.b.vel.x>front.b.vel.x);}finally{side.close();front.close();}
});
test('explicit impact drive changes airborne support without changing body mass',()=>{
 const weak=fixture({bDef:{impactDrive:0}}),powered=fixture({bDef:{impactDrive:10}});try{weak.b.guarding=powered.b.guarding=true;weak.hit();powered.hit();assert.ok(powered.b.vel.x<weak.b.vel.x);}finally{weak.close();powered.close();}
});
